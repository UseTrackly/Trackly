import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { flip_id } = await req.json();

    if (!flip_id) {
      return Response.json({ error: 'flip_id required' }, { status: 400 });
    }

    // Get flip details
    const flip = await base44.entities.CommunityFlip.get(flip_id);

    if (!flip) {
      return Response.json({ error: 'Flip not found' }, { status: 404 });
    }

    // Use AI to analyze the flip opportunity
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this resale opportunity and provide specific advice on how to maximize profit:

Item: ${flip.item_name}
Category: ${flip.category}
Current Price: $${flip.price}
Condition: ${flip.condition || 'Unknown'}
Location: ${flip.location || 'Unknown'}
Description: ${flip.description || 'No description'}

Research current market trends for this item and provide:
1. Best selling platform (eBay, StockX, GOAT, Mercari, etc.) and why
2. Optimal selling price based on recent sales data
3. Best time to sell (seasonality, market trends)
4. Packaging and shipping recommendations
5. Marketing tips to attract buyers
6. Estimated profit margin after fees

Be specific and actionable.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          best_platform: { type: 'string' },
          optimal_price: { type: 'number' },
          timing_advice: { type: 'string' },
          shipping_tips: { type: 'string' },
          marketing_tips: { type: 'string' },
          estimated_profit: { type: 'number' },
          profit_margin: { type: 'string' },
          summary: { type: 'string' }
        }
      }
    });

    return Response.json({ 
      success: true,
      analysis
    });

  } catch (error) {
    console.error('Flip analysis error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});