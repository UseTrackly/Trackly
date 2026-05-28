import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cert_number, grading_company } = await req.json();
    if (!cert_number) return Response.json({ error: 'cert_number required' }, { status: 400 });

    const company = (grading_company || 'PSA').toUpperCase();

    const prompt = company === 'PSA'
      ? `Visit https://www.psacard.com/cert/${cert_number} and extract: 1) the direct image URL of the card (.jpg/.png), 2) the full card name. Return JSON: { image_url: string|null, card_name: string|null }`
      : `Look up graded card cert ${cert_number} from ${company}. Find an image URL and card name from the official site or reliable source. Return JSON: { image_url: string|null, card_name: string|null }`;

    // Race the LLM call against a 15-second timeout
    const result = await Promise.race([
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: 'object',
          properties: {
            image_url: { type: 'string' },
            card_name: { type: 'string' }
          }
        }
      }),
      new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000))
    ]);

    return Response.json({
      image_url: result?.image_url || null,
      card_name: result?.card_name || null,
    });
  } catch (error) {
    // Return not-found gracefully so UI shows "no image" instead of an error
    return Response.json({ image_url: null, card_name: null });
  }
});