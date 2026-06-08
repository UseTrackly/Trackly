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
      const all = await svc.entities.UserProfile.list('-created_date', 500);
      const records = all.filter(r => r.user_email === user.email);
      console.log('[profileManager] GET found', records.length, 'records (from', all.length, 'total)');
      return Response.json({ profile: records[0] ?? null });
    }

    // ── GET PROFILE FOR VIEWER (with profit visibility enforcement) ─────────
    if (action === 'getForViewer') {
      const { viewer_email, target_email } = body;
      if (!viewer_email || !target_email) {
        return Response.json({ error: 'viewer_email and target_email required' }, { status: 400 });
      }

      const all = await svc.entities.UserProfile.list('-created_date', 500);
      const targetProfile = all.find(r => r.user_email === target_email);
      
      if (!targetProfile) {
        return Response.json({ error: 'Profile not found' }, { status: 404 });
      }

      // Enforce profit visibility server-side
      const isOwner = viewer_email === target_email;
      const isPrivate = targetProfile.profit_visibility === 'private';
      
      // Return profile with profit hidden if private and not owner
      const safeProfile = isOwner || !isPrivate 
        ? targetProfile 
        : { ...targetProfile, profit_hidden: true };

      return Response.json({ profile: safeProfile, profit_hidden: isPrivate && !isOwner });
    }

    // ── GET PROFILE BY USERNAME OR EMAIL ─────────────────────────────────────
    if (action === 'getByParam') {
      const { viewer_email, lookup_param } = body;
      if (!viewer_email || !lookup_param) {
        return Response.json({ error: 'viewer_email and lookup_param required' }, { status: 400 });
      }

      const all = await svc.entities.UserProfile.list('-created_date', 500);
      // First try to find by username (case-insensitive)
      let targetProfile = all.find(r => r.username && r.username.toLowerCase() === lookup_param.toLowerCase());
      
      // If not found by username, try by email
      if (!targetProfile) {
        targetProfile = all.find(r => r.user_email === lookup_param);
      }
      
      if (!targetProfile) {
        return Response.json({ error: 'Profile not found' }, { status: 404 });
      }

      // Enforce profit visibility server-side
      const isOwner = viewer_email === targetProfile.user_email;
      const isPrivate = targetProfile.profit_visibility === 'private';
      
      // Return profile with profit hidden if private and not owner
      const safeProfile = isOwner || !isPrivate 
        ? targetProfile 
        : { ...targetProfile, profit_hidden: true };

      console.log('[profileManager] getByParam:', { 
        lookup_param, 
        found_email: targetProfile.user_email, 
        found_username: targetProfile.username 
      });

      return Response.json({ profile: safeProfile, profit_hidden: isPrivate && !isOwner });
    }

    // ── SAVE ────────────────────────────────────────────────────────────────
    if (action === 'save') {
      const { data } = body;
      if (!data || typeof data !== 'object') {
        return Response.json({ error: 'data object required' }, { status: 400 });
      }

      const ALLOWED_PROFILE_FIELDS = ['display_name', 'username', 'bio', 'location', 'blocked_users', 'banner_url', 'song_name', 'song_preview_url', 'song_artwork_url', 'song_artist', 'profit_visibility'];
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([k]) => ALLOWED_PROFILE_FIELDS.includes(k))
      );

      const allSave = await svc.entities.UserProfile.list('-created_date', 500);
      const existing = allSave.find(r => r.user_email === user.email) ?? null;

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

      // Validate URL is a proper https URL
      let parsedUrl;
      try { parsedUrl = new URL(file_url); } catch {
        return Response.json({ error: 'Invalid avatar URL' }, { status: 400 });
      }
      if (parsedUrl.protocol !== 'https:') {
        return Response.json({ error: 'Avatar URL must use HTTPS' }, { status: 400 });
      }

      const allAvatar = await svc.entities.UserProfile.list('-created_date', 500);
      const existing = allAvatar.find(r => r.user_email === user.email) ?? null;

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

    // ── FOLLOW / UNFOLLOW ────────────────────────────────────────────────────
    if (action === 'follow' || action === 'unfollow') {
      const { target_email } = body;
      if (!target_email || target_email === user.email) {
        return Response.json({ error: 'Invalid target_email' }, { status: 400 });
      }

      const all = await svc.entities.UserProfile.list('-created_date', 1000);

      // Current user's profile
      let myProfile = all.find(r => r.user_email === user.email) ?? null;
      // Target profile
      let targetProfile = all.find(r => r.user_email === target_email) ?? null;

      if (!targetProfile) {
        return Response.json({ error: 'Target profile not found' }, { status: 404 });
      }

      const myFollowing = Array.isArray(myProfile?.following) ? [...myProfile.following] : [];
      const targetFollowers = Array.isArray(targetProfile?.followers) ? [...targetProfile.followers] : [];

      if (action === 'follow') {
        if (!myFollowing.includes(target_email)) myFollowing.push(target_email);
        if (!targetFollowers.includes(user.email)) targetFollowers.push(user.email);
      } else {
        const myIdx = myFollowing.indexOf(target_email);
        if (myIdx > -1) myFollowing.splice(myIdx, 1);
        const tIdx = targetFollowers.indexOf(user.email);
        if (tIdx > -1) targetFollowers.splice(tIdx, 1);
      }

      // Update my profile
      if (myProfile) {
        await svc.entities.UserProfile.update(myProfile.id, { following: myFollowing });
      } else {
        myProfile = await svc.entities.UserProfile.create({ user_email: user.email, following: myFollowing });
      }

      // Update target profile
      const updatedTarget = await svc.entities.UserProfile.update(targetProfile.id, { followers: targetFollowers });

      console.log(`[profileManager] ${action}: ${user.email} -> ${target_email}`);
      return Response.json({ target_profile: updatedTarget });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });

  } catch (error) {
    console.error('[profileManager] DB error during action', action, ':', error?.message ?? error);
    return Response.json({ error: error?.message ?? 'Server error' }, { status: 500 });
  }
});