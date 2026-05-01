import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const { image_url } = await req.json();

    if (!image_url) {
      return Response.json({ error: 'image_url required' }, { status: 400 });
    }

    // Use AI vision to moderate the image
    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Analyze this image for content moderation. This is for a resale marketplace app where users post items they're selling (sneakers, electronics, collectibles, clothing, etc.).

Check if the image contains:
1. Inappropriate content (nudity, violence, hate symbols, offensive material)
2. Non-product content (selfies, random photos, unrelated content)
3. Misleading or deceptive imagery

The image should be: a real product photo suitable for resale listings.

Respond with whether the image is APPROVED or REJECTED, and a brief reason.`,
      file_urls: [image_url],
      response_json_schema: {
        type: 'object',
        properties: {
          status: { 
            type: 'string',
            enum: ['APPROVED', 'REJECTED']
          },
          reason: { type: 'string' },
          confidence: { type: 'number' }
        }
      }
    });

    // Only flag if high confidence rejection
    const isApproved = result.status === 'APPROVED' || result.confidence < 0.7;

    return Response.json({ 
      approved: isApproved,
      status: result.status,
      reason: result.reason,
      confidence: result.confidence
    });

  } catch (error) {
    console.error('Image moderation error:', error);
    // Default to approved on error to avoid false positives
    return Response.json({ 
      approved: true,
      status: 'APPROVED',
      reason: 'Moderation check failed, defaulting to approved',
      error: error.message
    });
  }
});