import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const signature = req.headers.get('stripe-signature');
    const WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

    if (!signature || !WEBHOOK_SECRET) {
      return Response.json({ error: 'Missing signature or secret' }, { status: 400 });
    }

    const body = await req.text();

    // Verify webhook signature
    const stripe = (await import('npm:stripe@17.5.0')).default(Deno.env.get('STRIPE_SECRET_KEY'));
    const event = await stripe.webhooks.constructEventAsync(body, signature, WEBHOOK_SECRET);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const customerEmail = session.customer_details?.email;

        if (!customerEmail) break;

        // Find user by email
        const users = await base44.asServiceRole.entities.User.filter({ email: customerEmail });
        if (users.length === 0) break;

        const userId = users[0].id;
        const isLifetime = session.metadata?.plan === 'lifetime';

        const updateData = {
          is_pro: true,
          stripe_customer_id: session.customer,
        };

        if (!isLifetime) {
          const expiresAt = new Date();
          expiresAt.setDate(expiresAt.getDate() + 30);
          updateData.pro_expires_at = expiresAt.toISOString();
        }

        await base44.asServiceRole.entities.User.update(userId, updateData);
        break;
      }

      case 'customer.subscription.deleted':
      case 'customer.subscription.updated': {
        const subscription = event.data.object;
        const customerId = subscription.customer;

        // Find user by Stripe customer ID
        const users = await base44.asServiceRole.entities.User.filter({ 
          stripe_customer_id: customerId 
        });

        if (users.length === 0) break;

        const userId = users[0].id;
        const isActive = subscription.status === 'active';

        if (!isActive) {
          await base44.asServiceRole.entities.User.update(userId, {
            is_pro: false,
            pro_expires_at: null,
          });
        }
        break;
      }
    }

    return Response.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 400 });
  }
});