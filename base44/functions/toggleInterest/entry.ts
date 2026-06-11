import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { flip_id } = await req.json();
    if (!flip_id) {
      return Response.json({ error: 'flip_id is required' }, { status: 400 });
    }

    // Use service role to read + update (bypasses RLS owner-only restriction)
    const flips = await base44.asServiceRole.entities.CommunityFlip.filter({ id: flip_id }, '-created_date', 1);
    const flip = flips?.[0];
    if (!flip) {
      return Response.json({ error: 'Flip not found' }, { status: 404 });
    }

    const interested = Array.isArray(flip.interested_users) ? flip.interested_users : [];
    const isNowInterested = interested.includes(user.email);
    const updated = isNowInterested
      ? interested.filter(e => e !== user.email)
      : [...interested, user.email];

    await base44.asServiceRole.entities.CommunityFlip.update(flip_id, { interested_users: updated });

    // Notify seller when adding interest (non-blocking)
    if (!isNowInterested) {
      base44.asServiceRole.functions.invoke('notifyNewFlip', {
        flip_id,
        interested_user_email: user.email,
        interested_user_name: user.full_name || 'Someone',
      }).catch(() => {});
    }

    return Response.json({ success: true, interested_users: updated, added: !isNowInterested });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});