import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cert_number, grading_company } = await req.json();
    if (!cert_number) return Response.json({ error: 'cert_number required' }, { status: 400 });

    const company = (grading_company || 'PSA').toUpperCase();
    let imageUrl = null;
    let cardName = null;

    if (company === 'PSA') {
      // PSA public cert lookup page embeds card image — use AI to extract it
      const psaUrl = `https://www.psacard.com/cert/${cert_number}`;
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Visit the PSA certification lookup page for cert number ${cert_number} at ${psaUrl}.
Extract the following information:
1. The direct URL of the card image shown on that page (usually a .jpg or .png hosted on psacard.com or similar CDN)
2. The full card name/description

Return a JSON object with keys: image_url (string or null), card_name (string or null).
If you cannot find the image or the cert is invalid, return nulls.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            image_url: { type: 'string' },
            card_name: { type: 'string' }
          }
        }
      });

      imageUrl = result?.image_url || null;
      cardName = result?.card_name || null;
    } else if (company === 'BGS' || company === 'CGC') {
      // For BGS/CGC, use AI with internet search to find the cert
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Look up graded card cert number ${cert_number} from ${company} grading company.
Find the card's image and name from the official ${company} website or any reliable source.
Return a JSON object with keys: image_url (string or null), card_name (string or null).`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            image_url: { type: 'string' },
            card_name: { type: 'string' }
          }
        }
      });

      imageUrl = result?.image_url || null;
      cardName = result?.card_name || null;
    } else {
      // For other companies, try a generic search
      const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Look up graded card with cert/serial number ${cert_number} from ${company} grading company.
Try to find an image of this specific graded card from any reliable source.
Return a JSON object with keys: image_url (string or null), card_name (string or null).`,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            image_url: { type: 'string' },
            card_name: { type: 'string' }
          }
        }
      });

      imageUrl = result?.image_url || null;
      cardName = result?.card_name || null;
    }

    return Response.json({ image_url: imageUrl, card_name: cardName });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});