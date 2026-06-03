import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { email, code } = await req.json();

    // Users can only send a verification email to their own address.
    if (email && email !== user.email) {
      return Response.json({ error: 'Forbidden: can only verify your own email' }, { status: 403 });
    }

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
      },
      body: JSON.stringify({
        from: 'Trackly <hello@trackly.to>',
        to: email,
        subject: 'Verify your Trackly account',
        html: `
          <div style="font-family: Inter, system-ui, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px; background: #0a0a0a;">
            <div style="text-align: center; margin-bottom: 40px;">
              <img src="https://media.base44.com/images/public/69bfd92e3db7d48eec6c8062/c29d404d0_logo_no_bg_final.png" alt="Trackly" style="height: 32px; margin-bottom: 8px;" />
              <p style="color: #737373; font-size: 12px; margin: 0;">Built for serious resellers</p>
            </div>
            <div style="background: #1a1a1a; border: 1px solid #262626; border-radius: 16px; padding: 32px; text-align: center;">
              <h2 style="color: #fafafa; font-size: 20px; font-weight: 600; margin-bottom: 12px;">Verify Your Email</h2>
              <p style="color: #a3a3a3; font-size: 14px; margin-bottom: 24px;">Enter this code in Trackly to verify your account:</p>
              <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(16, 185, 129, 0.05)); border: 2px solid rgba(16, 185, 129, 0.3); border-radius: 12px; padding: 24px; font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #10b981; margin-bottom: 16px;">
                ${code}
              </div>
              <p style="color: #737373; font-size: 12px;">This code expires in 10 minutes.</p>
            </div>
            <div style="text-align: center; margin-top: 32px;">
              <p style="color: #525252; font-size: 11px; margin: 0;">© 2026 Trackly. All rights reserved.</p>
            </div>
          </div>
        `,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return Response.json({ error: data }, { status: response.status });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});