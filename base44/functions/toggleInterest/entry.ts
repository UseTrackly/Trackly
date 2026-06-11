import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { flip_id } = await req.json();
    if (!flip_id) return Response.json({ error: 'flip_id required' }, { status: 400 });

    // Fetch the flip using service role so we can update regardless of ownership
    const flips = await base44.asServiceRole.entities.CommunityFlip.filter({ id: flip_id });
    const flip = flips?.[0];
    if (!flip) return Response.json({ error: 'Flip not found' }, { status: 404 });

    const interested = flip.interested_users || [];
    const isInterested = interested.includes(user.email);
    const updated = isInterested
      ? interested.filter(e => e !== user.email)
      : [...interested, user.email];

    await base44.asServiceRole.entities.CommunityFlip.update(flip_id, { interested_users: updated });

    // Notify the seller when someone adds interest
    if (!isInterested && flip.posted_by !== user.email) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: flip.posted_by,
        type: 'flip_interest',
        title: 'Someone is interested!',
        message: `${user.full_name || 'A collector'} is interested in your listing: ${flip.item_name}`,
        link: '/community',
        is_read: false,
        metadata: { flip_id, interested_user: user.email },
      });
    }

    return Response.json({ success: true, interested_users: updated, was_interested: isInterested });
  } catch (error) {
    console.error('toggleInterest error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});