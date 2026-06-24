import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { text, fields } = await req.json();

    // Accept either a single text string or an object of fields to check
    const textsToCheck = fields
      ? Object.values(fields).filter(v => v && typeof v === 'string')
      : [text];

    if (textsToCheck.length === 0) {
      return Response.json({ approved: true, flaggedWords: [] });
    }

    // ── Blocked word list (mirrors lib/profanityFilter.js) ──────────────────
    const BLOCKED_WORDS = [
      'nigger','nigga','niglet','spic','wetback','chink','gook','kike','kyke',
      'towelhead','raghead','spear chucker','porch monkey','jungle bunny',
      'sand nigger','beaner','coon','jigaboo','sambo','wop','dago','kraut',
      'mick','paddy','polack','hun','nip','zip','slope',
      'faggot','fag','fagg','faggit','dyke','tranny','trannie','shemale',
      'whore','slut','skank','cunt','bitch','twat','pussy','bimbo',
      'cumdumpster','sloot',
      'kill all','genocide','ethnic cleansing','racial war','race war',
      'white power','white pride','nazi','neo-nazi','neo nazi','hitler',
      'heil hitler','race traitor',
      'rape','molest','pedophile','paedophile','pedobear','child porn',
      'loli','shota','bestiality','beastiality','zoophilia','necrophilia',
      'incest','child sex',
      'motherfucker','mother fucker','cocksucker','cock sucker','asshole',
      'arsehole','dickhead','shitstain','bullshit','horseshit','dipshit',
      'dumbshit','shithead','fuckface','fuckhead','fucktard','fuckwad',
      'fuckboy','jackass','dumbass','lazyass','fatass','dumbfuck',
    ];

    const NORMALIZE_MAP = {
      '@':'a','4':'a','8':'b','(':'c','¢':'c','3':'e','€':'e',
      '!':'i','1':'i','|':'i','0':'o','$':'s','5':'s','7':'t','+':'t','2':'z',
    };

    function normalizeText(t) {
      let r = t.toLowerCase();
      for (const [f, t2] of Object.entries(NORMALIZE_MAP)) {
        r = r.replaceAll(f, t2);
      }
      r = r.replace(/[\.*_\-=~`'^]/g, '');
      return r;
    }

    const flagged = [];

    for (const rawText of textsToCheck) {
      const normalized = normalizeText(rawText);
      const words = normalized.split(/[^a-z0-9]+/).filter(w => w.length >= 2);

      for (const blocked of BLOCKED_WORDS) {
        const blockedNorm = normalizeText(blocked);
        if (words.includes(blockedNorm) || (blocked.includes(' ') && normalized.includes(blockedNorm))) {
          if (!flagged.includes(blocked)) flagged.push(blocked);
        }
      }

      for (const slur of ['nigger','faggot','kike','spic','chink']) {
        if (normalized.includes(slur) && !flagged.includes(slur)) flagged.push(slur);
      }
    }

    return Response.json({
      approved: flagged.length === 0,
      flaggedWords: [...new Set(flagged)],
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});