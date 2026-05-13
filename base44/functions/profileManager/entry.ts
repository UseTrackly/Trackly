import { createClient, createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Profile manager — runs entirely as service role for all DB writes.
 *
 * Auth strategy (in priority order):
 *   1. Bearer token in Authorization header (standard web flow)
 *   2. `token` field in the JSON body (iOS native fallback — explicit token injection)
 *
 * The user is identified via base44.auth.me() using whichever token is valid.
 * All UserProfile reads/writes use asServiceRole to bypass RLS entirely.
 *
 * Actions:
 *   { action: 'get', token? }
 *   { action: 'save', data: { display_name, username, bio, location }, token? }
 *   { action: 'setAvatar', file_url: string, token? }
 */
Deno.serve(async (req) => {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, token: bodyToken } = body;

  // ── Build an auth-injected request ─────────────────────────────────────────
  // Priority: explicit body token > Authorization header already present
  const existingAuth = req.headers.get('Authorization');
  const effectiveToken = bodyToken || (existingAuth?.startsWith('Bearer ') ? existingAuth.slice(7) : null);

  if (!effectiveToken) {
    console.error('[profileManager] No token available. existingAuth:', existingAuth ? 'present' : 'MISSING', 'bodyToken:', bodyToken ? 'present' : 'MISSING');
    return Response.json({ error: 'Not authenticated — no token provided' }, { status: 401 });
  }

  // Inject the token into a fresh Request so createClientFromRequest picks it up
  const injectedHeaders = new Headers(req.headers);
  injectedHeaders.set('Authorization', `Bearer ${effectiveToken}`);
  const injectedReq = new Request(req.url, {
    method: req.method,
    headers: injectedHeaders,
    body: JSON.stringify(body),
  });

  const base44 = createClientFromRequest(injectedReq);

  // ── Authenticate ────────────────────────────────────────────────────────────
  let user;
  try {
    user = await base44.auth.me();
  } catch (e) {
    console.error('[profileManager] auth.me() threw:', e?.message);
    return Response.json({ error: 'Auth failed: ' + (e?.message ?? 'unknown') }, { status: 401 });
  }

  if (!user?.email) {
    console.error('[profileManager] auth.me() returned no user/email. user:', JSON.stringify(user));
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

      // Strip nulls/undefined so we don't overwrite existing fields with null
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([_, v]) => v !== null && v !== undefined && v !== '')
      );

      const records = await svc.entities.UserProfile.filter({ user_email: user.email });
      const existing = records[0] ?? null;

      let profile;
      if (existing) {
        console.log('[profileManager] SAVE updating existing id:', existing.id, 'with:', JSON.stringify(cleanData));
        profile = await svc.entities.UserProfile.update(existing.id, cleanData);
      } else {
        console.log('[profileManager] SAVE creating new profile for:', user.email, 'with:', JSON.stringify(cleanData));
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

      const records = await svc.entities.UserProfile.filter({ user_email: user.email });
      const existing = records[0] ?? null;

      let profile;
      if (existing) {
        console.log('[profileManager] setAvatar updating existing id:', existing.id);
        profile = await svc.entities.UserProfile.update(existing.id, { avatar_url: file_url });
      } else {
        console.log('[profileManager] setAvatar creating new profile for:', user.email);
        profile = await svc.entities.UserProfile.create({ user_email: user.email, avatar_url: file_url });
      }

      // Sync to the User record so profile_picture is available app-wide
      try {
        await base44.auth.updateMe({ profile_picture: file_url });
        console.log('[profileManager] setAvatar synced profile_picture to User record');
      } catch (e) {
        // Non-fatal: the UserProfile was already saved above
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