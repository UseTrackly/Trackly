import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    // Only process new flips
    if (event.type !== 'create') {
      return Response.json({ success: true, message: 'Not a create event' });
    }

    // Get all users with this category in their preferences
    const users = await base44.asServiceRole.entities.User.list();
    
    const interestedUsers = users.filter(user => 
      user.selected_categories?.includes(data.category) && 
      user.email !== data.posted_by
    );

    // Create notifications for interested users
    const notifications = interestedUsers.map(user => ({
      user_email: user.email,
      type: 'new_flip',
      title: `New ${data.category} flip posted!`,
      message: `${data.item_name} - $${data.price}`,
      link: '/community',
      metadata: {
        flip_id: data.id,
        category: data.category
      }
    }));

    if (notifications.length > 0) {
      await base44.asServiceRole.entities.Notification.bulkCreate(notifications);
    }

    return Response.json({ 
      success: true, 
      notified: notifications.length 
    });

  } catch (error) {
    console.error('Notify new flip error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});