import { createClientFromRequest } from 'npm:@base44/sdk@0.8.23';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { reason } = await req.json();

    if (!user.stripe_customer_id) {
      return Response.json({ error: 'No active subscription found' }, { status: 400 });
    }

    const stripe = (await import('npm:stripe@17.5.0')).default(Deno.env.get('STRIPE_SECRET_KEY'));

    // Get active subscriptions for this customer
    const subscriptions = await stripe.subscriptions.list({
      customer: user.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      return Response.json({ error: 'No active subscription found' }, { status: 400 });
    }

    const subscriptionId = subscriptions.data[0].id;

    // Cancel at period end so they keep access until billing period ends
    await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: true,
      metadata: { cancellation_reason: reason || 'Not provided' },
    });

    // Update user record to reflect pending cancellation
    await base44.auth.updateMe({ pro_cancel_scheduled: true });

    return Response.json({ success: true });
  } catch (error) {
    console.error('Cancel subscription error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});