import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { session_id } = await req.json();

    if (!session_id) {
      return Response.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Verify with Stripe
    const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
    if (!STRIPE_SECRET_KEY) {
      return Response.json({ error: 'Stripe not configured' }, { status: 500 });
    }

    const stripeResponse = await fetch(
      `https://api.stripe.com/v1/checkout/sessions/${session_id}`,
      {
        headers: {
          'Authorization': `Bearer ${STRIPE_SECRET_KEY}`,
        },
      }
    );

    if (!stripeResponse.ok) {
      return Response.json({ error: 'Invalid session' }, { status: 400 });
    }

    const session = await stripeResponse.json();

    // Check if payment was successful
    if (session.payment_status !== 'paid') {
      return Response.json({ error: 'Payment not completed' }, { status: 400 });
    }

    // Determine plan type from metadata or price
    const isLifetime = session.metadata?.plan === 'lifetime';
    const updateData = {
      is_pro: true,
      stripe_customer_id: session.customer,
    };

    // Set expiration for monthly plan (30 days from now)
    if (!isLifetime) {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);
      updateData.pro_expires_at = expiresAt.toISOString();
    }

    // Update user to Pro
    await base44.auth.updateMe(updateData);

    return Response.json({
      success: true,
      is_pro: true,
      plan: isLifetime ? 'lifetime' : 'monthly',
    });
  } catch (error) {
    console.error('Stripe verification error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});