import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
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