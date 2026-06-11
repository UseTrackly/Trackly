import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// ── Per-company cert lookup strategies ──────────────────────────────────────
// Each returns: { card_name, grade, year, set_name, card_number, front_image_url, back_image_url }
// or null if not found. Never guesses — only returns data from the actual API/page.

async function lookupPSA(certNumber) {
  // PSA public cert API (no auth required)
  const url = `https://api.psacard.com/publicapi/cert/GetByCertNumber/${encodeURIComponent(certNumber)}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' },
  });
  if (!res.ok) return null;
  const data = await res.json();
  // PSA API wraps in PSACert
  const cert = data?.PSACert || data;
  if (!cert || !cert.SpecNumber) return null;

  // Build card name from available fields
  const parts = [cert.Year, cert.Brand, cert.Series, cert.CardNumber && `#${cert.CardNumber}`, cert.Subject].filter(Boolean);
  const card_name = parts.join(' ') || cert.Subject || cert.SpecNumber || null;

  // PSA image URL pattern (not always available, but try)
  const certNum = String(certNumber).replace(/\D/g, '');
  const front_image_url = cert.ImageFront
    ? `https://d1htnxwo4o0jhw.cloudfront.net/cert/${certNum}/front.jpg`
    : null;
  const back_image_url = cert.ImageBack
    ? `https://d1htnxwo4o0jhw.cloudfront.net/cert/${certNum}/back.jpg`
    : null;

  return {
    card_name,
    grade: cert.CardGrade ? String(cert.CardGrade) : null,
    year: cert.Year ? String(cert.Year) : null,
    set_name: [cert.Brand, cert.Series].filter(Boolean).join(' ') || null,
    card_number: cert.CardNumber ? String(cert.CardNumber) : null,
    front_image_url,
    back_image_url,
  };
}

async function lookupBGS(certNumber) {
  // Beckett / BGS public cert lookup
  const url = `https://www.beckett.com/grading/services/cert_lookup.php?cert=${encodeURIComponent(certNumber)}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || data.error) return null;

  const card_name = [data.year, data.manufacturer, data.set, data.card_number && `#${data.card_number}`, data.player].filter(Boolean).join(' ') || null;
  if (!card_name) return null;

  return {
    card_name,
    grade: data.grade ? String(data.grade) : null,
    year: data.year ? String(data.year) : null,
    set_name: data.set || null,
    card_number: data.card_number ? String(data.card_number) : null,
    front_image_url: data.image_front || null,
    back_image_url: data.image_back || null,
  };
}

async function lookupSGC(certNumber) {
  const url = `https://www.sgccard.com/verify-cert/${encodeURIComponent(certNumber)}`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.cert) return null;

  const cert = data.cert;
  const card_name = [cert.year, cert.brand, cert.set, cert.subject].filter(Boolean).join(' ') || null;
  if (!card_name) return null;

  return {
    card_name,
    grade: cert.grade ? String(cert.grade) : null,
    year: cert.year ? String(cert.year) : null,
    set_name: cert.set || null,
    card_number: cert.card_number ? String(cert.card_number) : null,
    front_image_url: cert.front_image || null,
    back_image_url: cert.back_image || null,
  };
}

async function lookupCGC(certNumber) {
  const url = `https://www.cgccards.com/certlookup/${encodeURIComponent(certNumber)}/`;
  const res = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) return null;
  const data = await res.json();
  if (!data || !data.certNumber) return null;

  const card_name = [data.issueYear, data.publisher, data.series, data.title].filter(Boolean).join(' ') || null;
  if (!card_name) return null;

  return {
    card_name,
    grade: data.grade ? String(data.grade) : null,
    year: data.issueYear ? String(data.issueYear) : null,
    set_name: data.series || null,
    card_number: null,
    front_image_url: data.frontImage || null,
    back_image_url: data.backImage || null,
  };
}

// ── LLM fallback for unsupported companies ───────────────────────────────────
async function lookupViaLLM(certNumber, company, base44) {
  const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Look up graded card cert number "${certNumber}" from ${company}. 
Use the official ${company} cert lookup website. 
Return ONLY data you found on the page — do NOT guess or invent.
Return JSON: { card_name, grade, year, set_name, card_number, front_image_url, back_image_url }
All fields are strings or null. front_image_url must be a real direct image URL ending in .jpg or .png from the official site, or null.`,
    add_context_from_internet: true,
    response_json_schema: {
      type: 'object',
      properties: {
        card_name: { type: 'string' },
        grade: { type: 'string' },
        year: { type: 'string' },
        set_name: { type: 'string' },
        card_number: { type: 'string' },
        front_image_url: { type: 'string' },
        back_image_url: { type: 'string' },
      }
    }
  });

  if (!result || !result.card_name) return null;

  // Validate image URLs look real (must be http and end in image extension)
  const isImageUrl = (u) => u && /^https?:\/\/.+\.(jpg|jpeg|png|webp|gif)/i.test(u);

  return {
    card_name: result.card_name || null,
    grade: result.grade || null,
    year: result.year || null,
    set_name: result.set_name || null,
    card_number: result.card_number || null,
    front_image_url: isImageUrl(result.front_image_url) ? result.front_image_url : null,
    back_image_url: isImageUrl(result.back_image_url) ? result.back_image_url : null,
  };
}

// ── Validate an image URL actually loads ─────────────────────────────────────
async function validateImageUrl(url) {
  if (!url) return false;
  try {
    const res = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    const ct = res.headers.get('content-type') || '';
    return res.ok && ct.startsWith('image/');
  } catch {
    return false;
  }
}

// ── Main handler ─────────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { cert_number, grading_company } = await req.json();
    if (!cert_number) return Response.json({ error: 'cert_number required' }, { status: 400 });

    const company = (grading_company || 'PSA').toUpperCase().trim();
    const cert = cert_number.trim();

    // Try company-specific direct API lookup ONLY.
    // NEVER fall back to LLM/search for PSA, BGS, SGC, or CGC — a wrong result
    // is worse than no result. LLM fallback is only used for companies with no
    // known direct API (GMA, HGA, CSG, AGS, other).
    let cardData = null;
    const timeout = (ms) => new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms));

    try {
      if (company === 'PSA') {
        // PSA only: use the official API. If it fails (rate limit, not found, etc.)
        // return not_found — do NOT guess with LLM.
        cardData = await Promise.race([lookupPSA(cert), timeout(10000)]);
      } else if (company === 'BGS' || company === 'BECKETT') {
        cardData = await Promise.race([lookupBGS(cert), timeout(10000)]);
      } else if (company === 'SGC') {
        cardData = await Promise.race([lookupSGC(cert), timeout(10000)]);
      } else if (company === 'CGC') {
        cardData = await Promise.race([lookupCGC(cert), timeout(10000)]);
      } else {
        // GMA, HGA, CSG, AGS, other — no direct API available, use LLM with internet search
        cardData = await Promise.race([lookupViaLLM(cert, company, base44), timeout(20000)]);
      }
    } catch {
      cardData = null;
    }
    // No LLM fallback for PSA/BGS/SGC/CGC — accuracy over availability.

    if (!cardData) {
      return Response.json({ found: false });
    }

    // Validate image URLs — only return URLs that actually serve an image
    const [frontValid, backValid] = await Promise.all([
      validateImageUrl(cardData.front_image_url),
      validateImageUrl(cardData.back_image_url),
    ]);

    return Response.json({
      found: true,
      card_name: cardData.card_name || null,
      grade: cardData.grade || null,
      year: cardData.year || null,
      set_name: cardData.set_name || null,
      card_number: cardData.card_number || null,
      front_image_url: frontValid ? cardData.front_image_url : null,
      back_image_url: backValid ? cardData.back_image_url : null,
    });
  } catch (error) {
    return Response.json({ found: false });
  }
});