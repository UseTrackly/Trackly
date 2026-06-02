import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    if (event.type !== 'create') {
      return Response.json({ success: true, message: 'Not a create event' });
    }

    // Notify the recipient
    await base44.asServiceRole.entities.Notification.create({
      user_email: data.recipient_email,
      type: 'new_message',
      title: '💬 New Message',
      message: `${data.sender_name} sent you a message`,
      link: `/community?inbox=1&flip_id=${data.community_flip_id}`,
      metadata: {
        message_id: data.id,
        sender: data.sender_email,
        flip_id: data.community_flip_id
      }
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Notify new message error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});