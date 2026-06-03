import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // This function is only called internally by scanMarketPrices (service role).
    // On direct external calls, require admin to prevent notification spam to arbitrary users.
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      // Allow service-role internal invocations (no user token present)
      const authHeader = req.headers.get('Authorization') || '';
      if (authHeader && !authHeader.includes('service')) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { alert } = await req.json();

    if (!alert || !alert.user_email) {
      return Response.json({ error: 'Invalid alert data' }, { status: 400 });
    }

    // Create notification
    await base44.asServiceRole.entities.Notification.create({
      user_email: alert.user_email,
      type: 'price_alert',
      title: '🎯 Price Alert Triggered!',
      message: `${alert.item_name} is now at $${alert.current_market_price} (target: $${alert.target_price})`,
      link: '/community?tab=alerts',
      metadata: {
        alert_id: alert.id,
        item_name: alert.item_name,
        current_price: alert.current_market_price
      }
    });

    return Response.json({ success: true });

  } catch (error) {
    console.error('Notify price alert error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});