import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Validate shared secret so only Supabase can trigger this webhook.
    // Set SUPABASE_WEBHOOK_SECRET in your environment variables and configure
    // the same value in your Supabase Auth webhook headers.
    const webhookSecret = Deno.env.get('SUPABASE_WEBHOOK_SECRET');
    if (webhookSecret) {
      const providedSecret = req.headers.get('x-webhook-secret') || req.headers.get('authorization')?.replace('Bearer ', '');
      if (providedSecret !== webhookSecret) {
        return Response.json({ error: 'Unauthorized webhook' }, { status: 401 });
      }
    } else {
      // If secret not configured yet, log a warning but do not hard-block
      // (allows existing deploys to keep working while secret is being set).
      console.warn('[syncSupabaseUser] SUPABASE_WEBHOOK_SECRET not set — webhook is unprotected!');
    }

    // Parse webhook payload from Supabase
    const payload = await req.json();
    
    // Supabase auth webhook sends: type, record (user object)
    const { type, record } = payload;
    
    if (!record || !record.email) {
      return Response.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Only process user creation events
    if (type === 'INSERT') {
      const email = record.email;
      const fullName = record.raw_user_meta_data?.full_name || 
                       record.user_metadata?.full_name || 
                       email.split('@')[0];

      // Invite user to Base44 app
      await base44.asServiceRole.users.inviteUser(email, 'user');

      return Response.json({ 
        success: true, 
        message: `User ${email} invited to Trackly`,
        user: { email, fullName }
      });
    }

    return Response.json({ 
      success: true, 
      message: 'Event type not processed',
      type 
    });

  } catch (error) {
    console.error('Supabase sync error:', error);
    return Response.json({ 
      error: error.message,
      details: 'Failed to sync user from Supabase'
    }, { status: 500 });
  }
});