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

    // ─── Blocked word list (mirrors lib/profanityFilter.js) ──────────────────
    const BLOCKED_WORDS = [
      'nigger','nigga','niglet','nignog','spic','spick','wetback','chink','gook',
      'kike','kyke','towelhead','raghead','beaner','jigaboo','sambo','wop','dago',
      'kraut','polack','slope','zipperhead','sandnigger','porchmonkey','junglebunny',
      'spearchucker','pickaninny','gypsy','pikey',
      'coon','nip','spic',
      'faggot','fag','fagg','faggit','fudgepacker','dyke','tranny','trannie','shemale',
      'queerbash',
      'whore','slut','skank','cunt','bitch','twat','pussy','bimbo','cumdumpster','sloot',
      'killall','genocide','ethniccleansing','racewar','whitepower','whitepride','nazi',
      'neonazi','hitler','heilhitler','racetraitor',
      'rape','molest','pedophile','paedophile','pedobear','childporn','loli','shota',
      'bestiality','beastiality','zoophilia','necrophilia','incest','childsex','jailbait',
      'motherfucker','cocksucker','asshole','arsehole','dickhead','shitstain','bullshit',
      'horseshit','dipshit','dumbshit','shithead','fuckface','fuckhead','fucktard','fuckwad',
      'fuckboy','jackass','dumbass','fatass','dumbfuck','fuck','shit',
    ];

    const WHOLE_WORD_ONLY = new Set(['coon','nip','spic','fag','dyke']);

    const NORMALIZE_MAP = {
      '@':'a','4':'a','8':'b','(':'c','¢':'c','3':'e','€':'e','!':'i','1':'i','|':'i',
      '0':'o','$':'s','5':'s','7':'t','+':'t','2':'z','vv':'w',
    };

    function normalize(t) {
      let r = (t || '').toLowerCase();
      for (const [f, t2] of Object.entries(NORMALIZE_MAP)) {
        r = r.replaceAll(f, t2);
      }
      return r.replace(/[^a-z]/g, '');
    }

    function buildRegex(word) {
      const norm = word.replace(/[^a-z]/g, '');
      if (!norm) return null;
      const pattern = norm.split('').map(c => `${c}{1,8}`).join('');
      return new RegExp(pattern);
    }

    // Pre-build regexes
    const substringRegexes = BLOCKED_WORDS
      .filter(w => !WHOLE_WORD_ONLY.has(w))
      .map(w => ({ word: w, regex: buildRegex(w) }))
      .filter(item => item.regex !== null);

    const wholeWordRegexes = [...WHOLE_WORD_ONLY].map(w => ({
      word: w,
      regex: new RegExp(`\\b${w}\\b`, 'i'),
    }));

    const flagged = [];

    for (const rawText of textsToCheck) {
      const normalized = normalize(rawText);
      if (!normalized) continue;

      for (const { word, regex } of substringRegexes) {
        if (regex && regex.test(normalized)) {
          if (!flagged.includes(word)) flagged.push(word);
        }
      }

      for (const { word, regex } of wholeWordRegexes) {
        if (regex && regex.test(rawText)) {
          if (!flagged.includes(word)) flagged.push(word);
        }
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