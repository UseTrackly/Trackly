import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

/**
 * Profile manager backend function.
 * Runs as service role so RLS never blocks reads/writes.
 * The user identity comes from the verified JWT — no client-side trust.
 *
 * Supported actions (passed in request body):
 *   { action: 'get' }
 *   { action: 'save', data: { display_name, username, bio, location } }
 *   { action: 'setAvatar', file_url: string }
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Verify the caller is authenticated — throws if not
    const user = await base44.auth.me();
    if (!user?.email) {
      const authHeader = req.headers.get('Authorization') || req.headers.get('authorization') || 'MISSING';
      console.error('[profileManager] Not authenticated. Auth header present:', authHeader !== 'MISSING', 'header prefix:', authHeader.slice(0, 20));
      return Response.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    // ── GET profile ──────────────────────────────────────────────────────────
    if (action === 'get') {
      const records = await base44.asServiceRole.entities.UserProfile.filter({
        user_email: user.email,
      });
      return Response.json({ profile: records[0] ?? null });
    }

    // ── SAVE profile fields ───────────────────────────────────────────────────
    if (action === 'save') {
      const { data } = body; // { display_name, username, bio, location }
      const records = await base44.asServiceRole.entities.UserProfile.filter({
        user_email: user.email,
      });
      const existing = records[0] ?? null;

      let profile;
      if (existing) {
        profile = await base44.asServiceRole.entities.UserProfile.update(
          existing.id,
          data,
        );
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
        profile = await base44.asServiceRole.entities.UserProfile.update(
          existing.id,
          { avatar_url: file_url },
        );
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