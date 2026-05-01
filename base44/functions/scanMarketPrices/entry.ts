import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all active market alerts
    const alerts = await base44.asServiceRole.entities.MarketAlert.filter({ is_active: true });
    
    if (alerts.length === 0) {
      return Response.json({ message: 'No active alerts to scan' });
    }

    const updates = [];

    for (const alert of alerts) {
      try {
        // Use AI with web search to find current market prices
        const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Search recent sales data for "${alert.item_name}" in the ${alert.category} category. Find the lowest current asking price on eBay, StockX, GOAT, Mercari, or similar platforms. Return ONLY the numeric price and platform name.`,
          add_context_from_internet: true,
          model: 'gemini_3_flash',
          response_json_schema: {
            type: 'object',
            properties: {
              current_price: { type: 'number' },
              platform: { type: 'string' },
              found: { type: 'boolean' }
            }
          }
        });

        if (result.found && result.current_price) {
          // Update alert with new price
          await base44.asServiceRole.entities.MarketAlert.update(alert.id, {
            current_market_price: result.current_price,
            platform: result.platform,
            last_scanned: new Date().toISOString()
          });

          // Send notification and email if price dropped below target
          if (result.current_price <= alert.target_price) {
            await base44.asServiceRole.functions.invoke('notifyPriceAlert', {
              alert: {
                ...alert,
                current_market_price: result.current_price
              }
            });

            await base44.asServiceRole.integrations.Core.SendEmail({
              to: alert.user_email,
              subject: `🔔 Price Alert: ${alert.item_name}`,
              body: `Great news! ${alert.item_name} is now listed at $${result.current_price} on ${result.platform}, which is at or below your target price of $${alert.target_price}.\n\nCheck it out now before it's gone!`
            });
          }

          updates.push({
            item: alert.item_name,
            price: result.current_price,
            platform: result.platform
          });
        }
      } catch (err) {
        console.error(`Failed to scan ${alert.item_name}:`, err);
      }
    }

    return Response.json({ 
      success: true,
      scanned: alerts.length,
      updated: updates.length,
      updates
    });

  } catch (error) {
    console.error('Market scan error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});