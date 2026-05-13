import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Profile manager backend function.
 * Runs as service role so RLS never blocks reads/writes.
 *
 * The caller can pass { token: string } in the request body as a fallback
 * for iOS native where the SDK Authorization header may be stale.
 *
 * Supported actions:
 *   { action: 'get', token? }
 *   { action: 'save', data: { display_name, username, bio, location }, token? }
 *   { action: 'setAvatar', file_url: string, token? }
 */
Deno.serve(async (req) => {
  try {
    // Parse body first so we can extract the optional token
    const body = await req.json();
    const { action, token: bodyToken } = body;

    // If caller passed an explicit token, inject it so auth works on iOS native
    const headers = new Headers(req.headers);
    if (bodyToken) {
      headers.set('Authorization', `Bearer ${bodyToken}`);
    }
    const clientReq = new Request(req.url, {
      method: req.method,
      headers,
      body: JSON.stringify(body),
    });

    const base44 = createClientFromRequest(clientReq);

    // Verify caller is authenticated
    const user = await base44.auth.me();
    if (!user?.email) {
      const authHeader = headers.get('Authorization') || 'MISSING';
      console.error('[profileManager] Not authenticated. Auth header prefix:', authHeader.slice(0, 30));
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // ── GET profile ──────────────────────────────────────────────────────────
    if (action === 'get') {
      const records = await base44.asServiceRole.entities.UserProfile.filter({
        user_email: user.email,
      });
      return Response.json({ profile: records[0] ?? null });
    }

    // ── SAVE profile fields ───────────────────────────────────────────────────
    if (action === 'save') {
      const { data } = body;
      const records = await base44.asServiceRole.entities.UserProfile.filter({
        user_email: user.email,
      });
      const existing = records[0] ?? null;

      let profile;
      if (existing) {
        profile = await base44.asServiceRole.entities.UserProfile.update(existing.id, data);
      } else {
        profile = await base44.asServiceRole.entities.UserProfile.create({
          user_email: user.email,
          ...data,
        });
      }
      return Response.json({ profile });
    }

    // ── SET avatar URL ────────────────────────────────────────────────────────
    if (action === 'setAvatar') {
      const { file_url } = body;
      if (!file_url) {
        return Response.json({ error: 'file_url required' }, { status: 400 });
      }

      const records = await base44.asServiceRole.entities.UserProfile.filter({
        user_email: user.email,
      });
      const existing = records[0] ?? null;

      let profile;
      if (existing) {
        profile = await base44.asServiceRole.entities.UserProfile.update(existing.id, { avatar_url: file_url });
      } else {
        profile = await base44.asServiceRole.entities.UserProfile.create({
          user_email: user.email,
          avatar_url: file_url,
        });
      }

      // Also persist on the User record so profile_picture is available app-wide
      await base44.auth.updateMe({ profile_picture: file_url });

      return Response.json({ profile });
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 });
  } catch (error) {
    console.error('[profileManager] error:', error?.message ?? error);
    return Response.json({ error: error?.message ?? 'Server error' }, { status: 500 });
  }
});