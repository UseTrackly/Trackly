import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { categories } = await req.json();
    const userCategories = categories || user.selected_categories || ['sneakers', 'electronics'];

    // Use AI to fetch recent listings from marketplaces
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Find the 10 most recent listings for ${userCategories.join(', ')} on eBay, Whatnot, Mercari, and StockX. Focus on items posted within the last 24 hours that are good resale opportunities. For each listing provide: title, price, platform (ebay/whatnot/mercari/stockx), condition, location if available, and calculate a relevance score (1-100) based on resale potential and category match.`,
      add_context_from_internet: true,
      model: 'gemini_3_flash',
      response_json_schema: {
        type: 'object',
        properties: {
          listings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                title: { type: 'string' },
                price: { type: 'number' },
                platform: { type: 'string' },
                category: { type: 'string' },
                condition: { type: 'string' },
                location: { type: 'string' },
                relevance_score: { type: 'number' },
                external_url: { type: 'string' }
              }
            }
          }
        }
      }
    });

    // Store featured listings in database
    const savedListings = [];
    
    for (const listing of result.listings || []) {
      try {
        const saved = await base44.asServiceRole.entities.FeaturedListing.create({
          title: listing.title,
          price: listing.price,
          platform: listing.platform.toLowerCase(),
          category: listing.category?.toLowerCase() || 'other',
          external_url: listing.external_url || '#',
          condition: listing.condition,
          location: listing.location,
          relevance_score: listing.relevance_score || 50,
          posted_date: new Date().toISOString()
        });
        savedListings.push(saved);
      } catch (err) {
        console.error('Failed to save listing:', err);
      }
    }

    return Response.json({ 
      success: true,
      count: savedListings.length,
      listings: savedListings
    });

  } catch (error) {
    console.error('Featured listings error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});