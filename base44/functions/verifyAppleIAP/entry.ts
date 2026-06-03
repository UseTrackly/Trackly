import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const REVENUECAT_API_KEY = Deno.env.get('REVENUECAT_API_KEY') ?? '';

const ENTITLEMENT_ID = 'pro'; // Must match your RevenueCat entitlement name

async function getRevenueCatCustomerInfo(appUserID) {
  const res = await fetch(`https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserID)}`, {
    headers: {
      'Authorization': `Bearer ${REVENUECAT_API_KEY}`,
      'Content-Type': 'application/json',
    },
  });
  return res.json();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { appUserID, plan } = await req.json();

    if (!appUserID) {
      return Response.json({ error: 'Missing appUserID' }, { status: 400 });
    }

    // Security: the appUserID must match the authenticated user's ID.
    // This prevents Account A from claiming Account B's subscription.
    if (appUserID !== user.id && appUserID !== user.email) {
      return Response.json({ error: 'Forbidden: appUserID does not match authenticated user' }, { status: 403 });
    }

    const data = await getRevenueCatCustomerInfo(appUserID);
    const subscriber = data.subscriber;

    if (!subscriber) {
      return Response.json({ error: 'Could not fetch subscriber info' }, { status: 400 });
    }

    const entitlement = subscriber.entitlements?.[ENTITLEMENT_ID];
    const isActive = entitlement && new Date(entitlement.expires_date) > new Date();
    const isLifetime = entitlement && entitlement.expires_date === null;

    if (!isActive && !isLifetime) {
      return Response.json({ error: 'No active entitlement found' }, { status: 400 });
    }

    const proExpiresAt = isLifetime ? null : entitlement.expires_date;

    // Determine plan from product identifier
    const productId = entitlement?.product_identifier ?? plan ?? '';
    let resolvedPlan = plan;
    if (productId.includes('monthly')) resolvedPlan = 'monthly';
    else if (productId.includes('yearly')) resolvedPlan = 'yearly';
    else if (productId.includes('lifetime')) resolvedPlan = 'lifetime';

    await base44.auth.updateMe({
      is_pro: true,
      pro_plan: resolvedPlan,
      pro_expires_at: proExpiresAt,
      pro_cancel_scheduled: false,
      revenuecat_user_id: appUserID,
    });

    return Response.json({ success: true, plan: resolvedPlan });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});