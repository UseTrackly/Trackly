import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Profile manager — runs entirely as service role for all DB writes.
 *
 * Auth strategy:
 *   1. Bearer token in Authorization header (standard web flow)
 *   2. `token` field in the JSON body (iOS native fallback)
 *
 * Key fix: we parse the body first, then create a NEW Request that carries
 * only headers (no body). createClientFromRequest reads auth from the header,
 * never the body — so there is no double-read / consumed-stream issue.
 */
Deno.serve(async (req) => {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, token: bodyToken } = body;

  // ── Resolve token ───────────────────────────────────────────────────────────
  const existingAuth = req.headers.get('Authorization');
  const effectiveToken = bodyToken || (existingAuth?.startsWith('Bearer ') ? existingAuth.slice(7) : null);

  if (!effectiveToken) {
    console.error('[profileManager] No token. existingAuth:', existingAuth ? 'present' : 'MISSING', 'bodyToken:', bodyToken ? 'present' : 'MISSING');
    return Response.json({ error: 'Not authenticated — no token provided' }, { status: 401 });
  }

  // ── Build a header-only Request so createClientFromRequest works without
  //    re-reading a consumed body stream ────────────────────────────────────
  const headersOnly = new Headers(req.headers);
  headersOnly.set('Authorization', `Bearer ${effectiveToken}`);
  // GET method = no body required; SDK only reads the Authorization header
  const authReq = new Request(req.url, { method: 'GET', headers: headersOnly });

  const base44 = createClientFromRequest(authReq);

  // ── Authenticate ────────────────────────────────────────────────────────────
  let user;
  try {
    user = await base44.auth.me();
  } catch (e) {
    console.error('[profileManager] auth.me() threw:', e?.message);
    return Response.json({ error: 'Auth failed: ' + (e?.message ?? 'unknown') }, { status: 401 });
  }

  if (!user?.email) {
    console.error('[profileManager] auth.me() returned no user/email:', JSON.stringify(user));
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  console.log('[profileManager] Authenticated as:', user.email, '| action:', action);

  // ── Service role client for all DB operations ───────────────────────────────
  const svc = base44.asServiceRole;

  try {
    // ── GET ─────────────────────────────────────────────────────────────────
    if (action === 'get') {
      const records = await svc.entities.UserProfile.filter({ user_email: user.email });
      console.log('[profileManager] GET found', records.length, 'records');
      return Response.json({ profile: records[0] ?? null });
    }

    // ── SAVE ────────────────────────────────────────────────────────────────
    if (action === 'save') {
      const { data } = body;
      if (!data || typeof data !== 'object') {
        return Response.json({ error: 'data object required' }, { status: 400 });
      }

      const ALLOWED_PROFILE_FIELDS = ['display_name', 'username', 'bio', 'location', 'blocked_users'];
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([k]) => ALLOWED_PROFILE_FIELDS.includes(k))
      );

      const records = await svc.entities.UserProfile.filter({ user_email: user.email });
      const existing = records[0] ?? null;

      let profile;
      if (existing) {
        console.log('[profileManager] SAVE updating id:', existing.id, 'with:', JSON.stringify(cleanData));
        profile = await svc.entities.UserProfile.update(existing.id, cleanData);
      } else {
        console.log('[profileManager] SAVE creating profile for:', user.email, 'with:', JSON.stringify(cleanData));
        profile = await svc.entities.UserProfile.create({ user_email: user.email, ...cleanData });
      }

      console.log('[profileManager] SAVE result:', JSON.stringify(profile));
      return Response.json({ profile });
    }

    // ── SET AVATAR ──────────────────────────────────────────────────────────
    if (action === 'setAvatar') {
      const { file_url } = body;
      if (!file_url) {
        return Response.json({ error: 'file_url required' }, { status: 400 });
      }

      // Only allow URLs from Base44 CDN — no extension check, host is sufficient
      const ALLOWED_HOSTS = ['media.base44.com', 'storage.base44.com'];
      let urlHost = '';
      try { urlHost = new URL(file_url).hostname; } catch { /* invalid url */ }
      if (!ALLOWED_HOSTS.some(h => urlHost === h || urlHost.endsWith('.' + h))) {
        return Response.json({ error: 'Avatar URL must be hosted on Base44 storage' }, { status: 400 });
      }

      const records = await svc.entities.UserProfile.filter({ user_email: user.email });
      const existing = records[0] ?? null;

      let profile;
      if (existing) {
        console.log('[profileManager] setAvatar updating id:', existing.id);
        profile = await svc.entities.UserProfile.update(existing.id, { avatar_url: file_url });
      } else {
        console.log('[profileManager] setAvatar creating profile for:', user.email);
        profile = await svc.entities.UserProfile.create({ user_email: user.email, avatar_url: file_url });
      }

      // Sync avatar to User record so profile_picture is available everywhere
      try {
        await base44.auth.updateMe({ profile_picture: file_url });
        console.log('[profileManager] setAvatar synced profile_picture to User record');
      } catch (e) {
        console.error('[profileManager] setAvatar auth.updateMe failed (non-fatal):', e?.message);
      }

      console.log('[profileManager] setAvatar result:', JSON.stringify(profile));
      return Response.json({ profile });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });

  } catch (error) {
    console.error('[profileManager] DB error during action', action, ':', error?.message ?? error);
    return Response.json({ error: error?.message ?? 'Server error' }, { status: 500 });
  }
});