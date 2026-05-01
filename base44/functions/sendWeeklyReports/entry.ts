import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';
import { subDays, format } from 'npm:date-fns@3.6.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    // Admin only
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get all users
    const users = await base44.asServiceRole.entities.User.list('created_date', 500);
    
    if (!users.length) {
      return Response.json({ success: true, sent: 0, message: 'No users to send reports to' });
    }

    const sevenDaysAgo = subDays(new Date(), 7);
    let sentCount = 0;

    // Send reports to each user
    for (const userData of users) {
      try {
        // Get user's flips from past 7 days
        const flips = await base44.asServiceRole.entities.Flip.filter(
          { created_by: userData.email },
          '-created_date',
          100
        );

        const weekFlips = flips.filter(f => {
          const flipDate = new Date(f.date_sold || f.created_date);
          return flipDate > sevenDaysAgo;
        });

        if (weekFlips.length === 0) {
          continue; // Skip if no flips this week
        }

        // Calculate metrics
        const totalProfit = weekFlips.reduce((sum, f) => sum + (f.net_profit || 0), 0);
        const totalRevenue = weekFlips.reduce((sum, f) => sum + (f.sale_price || 0), 0);
        const avgROI = weekFlips.reduce((sum, f) => sum + (f.roi || 0), 0) / weekFlips.length;
        
        const sorted = [...weekFlips].sort((a, b) => (b.net_profit || 0) - (a.net_profit || 0));
        const bestFlip = sorted[0];

        // Build HTML email
        const htmlEmail = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); color: white; padding: 30px; border-radius: 12px; text-align: center; margin-bottom: 20px;">
              <h1 style="margin: 0;">📊 Weekly Profit Report</h1>
              <p style="margin: 10px 0 0 0; opacity: 0.9;">Week of ${format(sevenDaysAgo, 'MMM d')} - ${format(new Date(), 'MMM d, yyyy')}</p>
            </div>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: #111827; margin: 0 0 15px 0; font-size: 18px;">Your Performance</h2>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div style="background: white; padding: 15px; border-radius: 8px;">
                  <div style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">TOTAL PROFIT</div>
                  <div style="color: #16a34a; font-size: 24px; font-weight: bold;">$${totalProfit.toFixed(2)}</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px;">
                  <div style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">FLIPS THIS WEEK</div>
                  <div style="color: #1f2937; font-size: 24px; font-weight: bold;">${weekFlips.length}</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px;">
                  <div style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">AVG ROI</div>
                  <div style="color: #1f2937; font-size: 24px; font-weight: bold;">${avgROI.toFixed(1)}%</div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 8px;">
                  <div style="color: #6b7280; font-size: 12px; margin-bottom: 5px;">TOTAL REVENUE</div>
                  <div style="color: #1f2937; font-size: 24px; font-weight: bold;">$${totalRevenue.toFixed(2)}</div>
                </div>
              </div>
            </div>

            ${bestFlip ? `
              <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <h3 style="color: #15803d; margin: 0 0 10px 0; font-size: 14px;">🏆 Best Flip</h3>
                <div style="color: #1f2937; margin-bottom: 5px; font-weight: 500;">${bestFlip.item_name}</div>
                <div style="color: #16a34a; font-weight: bold;">+$${bestFlip.net_profit.toFixed(2)}</div>
              </div>
            ` : ''}

            <div style="text-align: center; padding-top: 20px; border-top: 1px solid #e5e7eb;">
              <p style="color: #6b7280; font-size: 12px; margin: 10px 0;">
                Keep tracking your flips to maximize profits!
              </p>
              <a href="https://trackly.to" style="display: inline-block; background: #16a34a; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold; margin-top: 10px;">
                View Full Dashboard
              </a>
            </div>
          </div>
        `;

        // Send email
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: userData.email,
          subject: `📊 Your Weekly Profit Report - ${format(new Date(), 'MMM d, yyyy')}`,
          body: htmlEmail,
          from_name: 'Trackly'
        });

        sentCount++;
      } catch (error) {
        console.error(`Failed to send report to ${userData.email}:`, error);
        // Continue to next user
      }
    }

    return Response.json({ 
      success: true, 
      sent: sentCount, 
      message: `Sent ${sentCount} weekly profit reports` 
    });
  } catch (error) {
    console.error('Weekly reports error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});