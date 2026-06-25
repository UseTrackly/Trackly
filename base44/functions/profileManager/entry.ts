import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Profile manager — runs entirely as service role for all DB writes.
 *
 * Auth strategy:
 *   1. Bearer token in Authorization header (standard web flow)
 *   2. `token` field in the JSON body (iOS native fallback)
 *
 * Key fix: we parse the body first, then create a NEW Request that carries
 * only headers (no body). createClientFromRequest reads auth from the header,
 * never the body — so there is no double-read / consumed-stream issue.
 */
Deno.serve(async (req) => {
  let body;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { action, token: bodyToken } = body;

  // ── Resolve token ───────────────────────────────────────────────────────────
  const existingAuth = req.headers.get('Authorization');
  const effectiveToken = bodyToken || (existingAuth?.startsWith('Bearer ') ? existingAuth.slice(7) : null);

  if (!effectiveToken) {
    console.error('[profileManager] No token. existingAuth:', existingAuth ? 'present' : 'MISSING', 'bodyToken:', bodyToken ? 'present' : 'MISSING');
    return Response.json({ error: 'Not authenticated — no token provided' }, { status: 401 });
  }

  // ── Build a header-only Request so createClientFromRequest works without
  //    re-reading a consumed body stream ────────────────────────────────────
  const headersOnly = new Headers(req.headers);
  headersOnly.set('Authorization', `Bearer ${effectiveToken}`);
  // GET method = no body required; SDK only reads the Authorization header
  const authReq = new Request(req.url, { method: 'GET', headers: headersOnly });

  const base44 = createClientFromRequest(authReq);

  // ── Authenticate ────────────────────────────────────────────────────────────
  let user;
  try {
    user = await base44.auth.me();
  } catch (e) {
    console.error('[profileManager] auth.me() threw:', e?.message);
    return Response.json({ error: 'Auth failed: ' + (e?.message ?? 'unknown') }, { status: 401 });
  }

  if (!user?.email) {
    console.error('[profileManager] auth.me() returned no user/email:', JSON.stringify(user));
    return Response.json({ error: 'Not authenticated' }, { status: 401 });
  }

  console.log('[profileManager] Authenticated as:', user.email, '| action:', action);

  // ── Service role client for all DB operations ───────────────────────────────
  const svc = base44.asServiceRole;

  try {
    // ── GET ─────────────────────────────────────────────────────────────────
    if (action === 'get') {
      const all = await svc.entities.UserProfile.list('-created_date', 500);
      const records = all.filter(r => r.user_email === user.email);
      console.log('[profileManager] GET found', records.length, 'records (from', all.length, 'total)');
      return Response.json({ profile: records[0] ?? null });
    }

    // ── GET PROFILE FOR VIEWER (with profit visibility enforcement) ─────────
    if (action === 'getForViewer') {
      const { viewer_email, target_email } = body;
      if (!viewer_email || !target_email) {
        return Response.json({ error: 'viewer_email and target_email required' }, { status: 400 });
      }

      const all = await svc.entities.UserProfile.list('-created_date', 500);
      const targetProfile = all.find(r => r.user_email === target_email);
      
      if (!targetProfile) {
        return Response.json({ error: 'Profile not found' }, { status: 404 });
      }

      // Enforce profit visibility server-side
      const isOwner = viewer_email === target_email;
      const isPrivate = targetProfile.profit_visibility === 'private';
      
      // Return profile with profit hidden if private and not owner
      const safeProfile = isOwner || !isPrivate 
        ? targetProfile 
        : { ...targetProfile, profit_hidden: true };

      return Response.json({ profile: safeProfile, profit_hidden: isPrivate && !isOwner });
    }

    // ── GET PROFILE BY USERNAME OR EMAIL ─────────────────────────────────────
    if (action === 'getByParam') {
      const { viewer_email, lookup_param } = body;
      if (!viewer_email || !lookup_param) {
        return Response.json({ error: 'viewer_email and lookup_param required' }, { status: 400 });
      }

      const all = await svc.entities.UserProfile.list('-created_date', 500);
      // First try to find by username (case-insensitive)
      let targetProfile = all.find(r => r.username && r.username.toLowerCase() === lookup_param.toLowerCase());
      
      // If not found by username, try by email
      if (!targetProfile) {
        targetProfile = all.find(r => r.user_email === lookup_param);
      }
      
      if (!targetProfile) {
        return Response.json({ error: 'Profile not found' }, { status: 404 });
      }

      // Enforce profit visibility server-side
      const isOwner = viewer_email === targetProfile.user_email;
      const isPrivate = targetProfile.profit_visibility === 'private';
      
      // Return profile with profit hidden if private and not owner
      const safeProfile = isOwner || !isPrivate 
        ? targetProfile 
        : { ...targetProfile, profit_hidden: true };

      console.log('[profileManager] getByParam:', { 
        lookup_param, 
        found_email: targetProfile.user_email, 
        found_username: targetProfile.username 
      });

      return Response.json({ profile: safeProfile, profit_hidden: isPrivate && !isOwner });
    }

    // ── SAVE ────────────────────────────────────────────────────────────────
    if (action === 'save') {
      const { data } = body;
      if (!data || typeof data !== 'object') {
        return Response.json({ error: 'data object required' }, { status: 400 });
      }

      // ── Server-side content moderation (mirrors lib/profanityFilter.js) ─────
      const MOD_BLOCKED = [
        'nigger','nigga','niglet','nignog','spic','spick','wetback','chink','gook','kike','kyke',
        'towelhead','raghead','beaner','jigaboo','sambo','wop','dago','kraut','polack','slope',
        'zipperhead','sandnigger','porchmonkey','junglebunny','spearchucker','pickaninny','gypsy','pikey',
        'faggot','fag','fagg','faggit','fudgepacker','tranny','trannie','shemale','queerbash',
        'whore','slut','skank','cunt','bitch','twat','pussy','bimbo','cumdumpster','sloot',
        'killall','genocide','ethniccleansing','racewar','whitepower','whitepride','nazi','neonazi',
        'hitler','heilhitler','racetraitor',
        'rape','molest','pedophile','paedophile','pedobear','childporn','loli','shota',
        'bestiality','beastiality','zoophilia','necrophilia','incest','childsex','jailbait',
        'motherfucker','cocksucker','asshole','arsehole','dickhead','shitstain','bullshit','horseshit',
        'dipshit','dumbshit','shithead','fuckface','fuckhead','fucktard','fuckwad','fuckboy','jackass',
        'dumbass','fatass','dumbfuck','fuck','shit',
      ];
      const WHOLE_WORD_ONLY = new Set(['coon','nip','spic','fag','dyke']);
      const NORM_MAP = {'@':'a','4':'a','8':'b','(':'c','¢':'c','3':'e','€':'e','!':'i','1':'i','|':'i','0':'o','$':'s','5':'s','7':'t','+':'t','2':'z','vv':'w'};
      function normStr(t) {
        if (!t || typeof t !== 'string') return '';
        let r = t.toLowerCase();
        for (const [f, t2] of Object.entries(NORM_MAP)) r = r.replaceAll(f, t2);
        return r.replace(/[^a-z]/g, '');
      }
      function buildRepetitionRegex(word) {
        const norm = word.replace(/[^a-z]/g, '');
        if (!norm) return null;
        const pattern = norm.split('').map(c => `${c}{1,8}`).join('');
        return new RegExp(pattern);
      }
      const substringRegexes = MOD_BLOCKED
        .filter(w => !WHOLE_WORD_ONLY.has(w))
        .map(w => ({ word: w, regex: buildRepetitionRegex(w) }))
        .filter(item => item.regex !== null);
      const wholeWordRegexes = [...WHOLE_WORD_ONLY].map(w => ({
        word: w, regex: new RegExp(`\\b${w}\\b`, 'i'),
      }));

      // Check all text fields (display_name, username, bio, location)
      const textFields = [data.display_name, data.username, data.bio, data.location].filter(v => v && typeof v === 'string');
      for (const raw of textFields) {
        const n = normStr(raw);
        for (const { regex } of substringRegexes) {
          if (regex && regex.test(n)) {
            return Response.json({ error: 'Please remove inappropriate language before continuing.' }, { status: 400 });
          }
        }
        for (const { regex } of wholeWordRegexes) {
          if (regex && regex.test(raw)) {
            return Response.json({ error: 'Please remove inappropriate language before continuing.' }, { status: 400 });
          }
        }
      }

      // ── Validate social_links against domain allowlist ──────────────────────
      if (data.social_links) {
        const ALLOWED_DOMAINS = ['instagram.com','tiktok.com','youtube.com','youtu.be','x.com','twitter.com','discord.gg','discord.com','ebay.com','whatnot.com','facebook.com','mercari.com','stockx.com'];
        for (const [key, val] of Object.entries(data.social_links)) {
          if (!val || typeof val !== 'string') continue;
          if (val.includes('://') || val.includes('.com')) {
            try {
              const u = new URL(val.startsWith('http') ? val : `https://${val}`);
              const host = u.hostname.toLowerCase().replace(/^www\./, '');
              const isAllowed = ALLOWED_DOMAINS.some(d => host === d || host.endsWith('.' + d));
              if (!isAllowed) {
                return Response.json({ error: 'Only links from approved platforms are allowed.' }, { status: 400 });
              }
            } catch {
              return Response.json({ error: `Invalid URL in ${key} link.` }, { status: 400 });
            }
          }
        }
        // Strip "website" key if present (field removed for security)
        if (data.social_links.website) delete data.social_links.website;
      }

      const ALLOWED_PROFILE_FIELDS = ['display_name', 'username', 'bio', 'location', 'blocked_users', 'banner_url', 'song_name', 'song_preview_url', 'song_artwork_url', 'song_artist', 'profit_visibility', 'social_links'];
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([k]) => ALLOWED_PROFILE_FIELDS.includes(k))
      );

      const allSave = await svc.entities.UserProfile.list('-created_date', 500);
      const existing = allSave.find(r => r.user_email === user.email) ?? null;

      let profile;
      if (existing) {
        console.log('[profileManager] SAVE updating id:', existing.id, 'with:', JSON.stringify(cleanData));
        profile = await svc.entities.UserProfile.update(existing.id, cleanData);
      } else {
        console.log('[profileManager] SAVE creating profile for:', user.email, 'with:', JSON.stringify(cleanData));
        profile = await svc.entities.UserProfile.create({ user_email: user.email, ...cleanData });
      }

      console.log('[profileManager] SAVE result:', JSON.stringify(profile));
      return Response.json({ profile });
    }

    // ── SET AVATAR ──────────────────────────────────────────────────────────
    if (action === 'setAvatar') {
      const { file_url } = body;
      if (!file_url) {
        return Response.json({ error: 'file_url required' }, { status: 400 });
      }

      // Validate URL is a proper https URL
      let parsedUrl;
      try { parsedUrl = new URL(file_url); } catch {
        return Response.json({ error: 'Invalid avatar URL' }, { status: 400 });
      }
      if (parsedUrl.protocol !== 'https:') {
        return Response.json({ error: 'Avatar URL must use HTTPS' }, { status: 400 });
      }

      const allAvatar = await svc.entities.UserProfile.list('-created_date', 500);
      const existing = allAvatar.find(r => r.user_email === user.email) ?? null;

      let profile;
      if (existing) {
        console.log('[profileManager] setAvatar updating id:', existing.id);
        profile = await svc.entities.UserProfile.update(existing.id, { avatar_url: file_url });
      } else {
        console.log('[profileManager] setAvatar creating profile for:', user.email);
        profile = await svc.entities.UserProfile.create({ user_email: user.email, avatar_url: file_url });
      }

      // Sync avatar to User record so profile_picture is available everywhere
      try {
        await base44.auth.updateMe({ profile_picture: file_url });
        console.log('[profileManager] setAvatar synced profile_picture to User record');
      } catch (e) {
        console.error('[profileManager] setAvatar auth.updateMe failed (non-fatal):', e?.message);
      }

      console.log('[profileManager] setAvatar result:', JSON.stringify(profile));
      return Response.json({ profile });
    }

    // ── FOLLOW / UNFOLLOW ────────────────────────────────────────────────────
    if (action === 'follow' || action === 'unfollow') {
      const { target_email } = body;
      console.log('[profileManager] Follow action received:', { action, user_email: user.email, target_email, body });
      if (!target_email || target_email === user.email) {
        return Response.json({ error: 'Invalid target_email' }, { status: 400 });
      }

      const all = await svc.entities.UserProfile.list('-created_date', 1000);
      console.log('[profileManager] Loaded profiles:', all.length);

      // Current user's profile
      let myProfile = all.find(r => r.user_email === user.email) ?? null;
      // Target profile
      let targetProfile = all.find(r => r.user_email === target_email) ?? null;

      console.log('[profileManager] Profile lookup:', { 
        myProfileFound: !!myProfile, 
        targetProfileFound: !!targetProfile,
        myProfileId: myProfile?.id,
        targetProfileId: targetProfile?.id
      });

      if (!targetProfile) {
        return Response.json({ error: 'Target profile not found' }, { status: 404 });
      }

      const myFollowing = Array.isArray(myProfile?.following) ? [...myProfile.following] : [];
      const targetFollowers = Array.isArray(targetProfile?.followers) ? [...targetProfile.followers] : [];

      console.log('[profileManager] Before action:', {
        myFollowing,
        targetFollowers,
        action
      });

      if (action === 'follow') {
        if (!myFollowing.includes(target_email)) myFollowing.push(target_email);
        if (!targetFollowers.includes(user.email)) targetFollowers.push(user.email);
      } else {
        const myIdx = myFollowing.indexOf(target_email);
        if (myIdx > -1) myFollowing.splice(myIdx, 1);
        const tIdx = targetFollowers.indexOf(user.email);
        if (tIdx > -1) targetFollowers.splice(tIdx, 1);
      }

      console.log('[profileManager] After action:', {
        myFollowing,
        targetFollowers
      });

      // Update my profile
      if (myProfile) {
        const updatedMy = await svc.entities.UserProfile.update(myProfile.id, { following: myFollowing });
        console.log('[profileManager] Updated my profile:', { id: myProfile.id, following: myFollowing });
      } else {
        myProfile = await svc.entities.UserProfile.create({ user_email: user.email, following: myFollowing });
        console.log('[profileManager] Created my profile:', { user_email: user.email, following: myFollowing });
      }

      // Update target profile
      const updatedTarget = await svc.entities.UserProfile.update(targetProfile.id, { followers: targetFollowers });
      console.log('[profileManager] Updated target profile:', { id: targetProfile.id, followers: targetFollowers });

      console.log(`[profileManager] ${action} completed: ${user.email} -> ${target_email}`);
      return Response.json({ target_profile: updatedTarget });
    }

    return Response.json({ error: 'Unknown action: ' + action }, { status: 400 });

  } catch (error) {
    console.error('[profileManager] DB error during action', action, ':', error?.message ?? error);
    return Response.json({ error: error?.message ?? 'Server error' }, { status: 500 });
  }
});