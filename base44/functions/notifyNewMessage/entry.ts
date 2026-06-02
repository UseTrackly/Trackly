import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'create') {
      return Response.json({ success: true, message: 'Not a create event' });
    }

    // Check if recipient has blocked the sender
    const profiles = await base44.asServiceRole.entities.UserProfile.filter({
      user_email: data.recipient_email
    }, '-created_date', 1);

    const recipientProfile = profiles?.[0];
    const blockedUsers = recipientProfile?.blocked_users || [];
    if (blockedUsers.includes(data.sender_email)) {
      return Response.json({ success: true, message: 'Sender is blocked by recipient' });
    }

    // Notify the recipient
    await base44.asServiceRole.entities.Notification.create({
      user_email: data.recipient_email,
      type: 'new_message',
      title: '💬 New Message',
      message: `${data.sender_name} sent you a message`,
      link: `/community`,
      metadata: {
        message_id: data.id,
        sender: data.sender_email,
        sender_name: data.sender_name,
        flip_id: data.community_flip_id
      }
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Notify new message error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});