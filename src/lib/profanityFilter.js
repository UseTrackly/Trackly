/**
 * Client-side profanity / hate speech / explicit content filter.
 * Used before saving inventory items, community posts, profile data, and messages.
 *
 * Catches: slurs, hate speech, heavy profanity, sexual terms,
 * and common bypass attempts (symbols, spacing, leetspeak, repeated letters,
 * alternate casing).
 *
 * Returns { isClean: boolean, flaggedWords: string[] }.
 */

// ─── Blocked word list ──────────────────────────────────────────────────────────

const BLOCKED_WORDS = [
  // Racial / ethnic slurs
  'nigger', 'nigga', 'niglet', 'nignog', 'spic', 'spick', 'wetback', 'chink',
  'gook', 'kike', 'kyke', 'towelhead', 'raghead', 'beaner', 'jigaboo',
  'sambo', 'wop', 'dago', 'kraut', 'polack', 'slope', 'zipperhead',
  'sandnigger', 'porchmonkey', 'junglebunny', 'spearchucker', 'pickaninny',
  'gypsy', 'pikey',

  // Short slurs — checked as whole-word only (false-positive risk)
  'coon', 'nip', 'spic',

  // Homophobic / transphobic slurs
  'faggot', 'fag', 'fagg', 'faggit', 'fudgepacker', 'dyke', 'tranny',
  'trannie', 'shemale', 'queerbash',

  // Gender / sexuality slurs
  'whore', 'slut', 'skank', 'cunt', 'bitch', 'twat', 'pussy', 'bimbo',
  'cumdumpster', 'sloot',

  // Hate speech keywords
  'killall', 'genocide', 'ethniccleansing', 'racewar', 'whitepower',
  'whitepride', 'nazi', 'neonazi', 'hitler', 'heilhitler', 'racetraitor',

  // Sexual / explicit terms
  'rape', 'molest', 'pedophile', 'paedophile', 'pedobear', 'childporn',
  'loli', 'shota', 'bestiality', 'beastiality', 'zoophilia', 'necrophilia',
  'incest', 'childsex', 'jailbait',

  // Heavy profanity
  'motherfucker', 'cocksucker', 'asshole', 'arsehole', 'dickhead',
  'shitstain', 'bullshit', 'horseshit', 'dipshit', 'dumbshit', 'shithead',
  'fuckface', 'fuckhead', 'fucktard', 'fuckwad', 'fuckboy', 'jackass',
  'dumbass', 'fatass', 'dumbfuck', 'fuck', 'shit',
];

// Words too short for safe substring matching — only check as whole word
// on the original text (with word boundaries) to avoid false positives
// like "japan", "sniper", "raccoon", "spice".
const WHOLE_WORD_ONLY = new Set(['coon', 'nip', 'spic', 'fag', 'dyke']);

// ─── Normalization ───────────────────────────────────────────────────────────────

const NORMALIZE_MAP = {
  '@': 'a', '4': 'a', '8': 'b', '(': 'c', '¢': 'c',
  '3': 'e', '€': 'e', '!': 'i', '1': 'i', '|': 'i',
  '0': 'o', '$': 's', '5': 's', '7': 't', '+': 't', '2': 'z',
  'vv': 'w',
};

function normalize(text) {
  let r = (text || '').toLowerCase();
  for (const [from, to] of Object.entries(NORMALIZE_MAP)) {
    r = r.replaceAll(from, to);
  }
  // Remove everything that's not a-z (spaces, symbols, punctuation, numbers)
  return r.replace(/[^a-z]/g, '');
}

/**
 * Build a regex that allows each character in the word to repeat 1–3 times.
 * This catches "fuuuuck" → "fuck", "nnigger" → "nigger", etc.
 */
function buildRepetitionRegex(word) {
  const norm = word.replace(/[^a-z]/g, '');
  if (!norm) return null;
  const pattern = norm.split('').map(c => `${c}{1,8}`).join('');
  return new RegExp(pattern);
}

// Pre-build regexes for all substring-matched words
const SUBSTRING_REGEXES = BLOCKED_WORDS
  .filter(w => !WHOLE_WORD_ONLY.has(w))
  .map(w => ({ word: w, regex: buildRepetitionRegex(w) }))
  .filter(item => item.regex !== null);

// Pre-build word-boundary regexes for whole-word-only terms
const WHOLE_WORD_REGEXES = [...WHOLE_WORD_ONLY].map(w => ({
  word: w,
  regex: new RegExp(`\\b${w}\\b`, 'i'),
}));

// ─── Public API ──────────────────────────────────────────────────────────────────

export function containsProfanity(text) {
  if (!text || typeof text !== 'string') return { isClean: true, flaggedWords: [] };

  const normalized = normalize(text);
  if (!normalized) return { isClean: true, flaggedWords: [] };

  const flagged = [];

  // Substring check with repetition tolerance
  for (const { word, regex } of SUBSTRING_REGEXES) {
    if (regex && regex.test(normalized)) {
      flagged.push(word);
    }
  }

  // Whole-word check for short slurs with false-positive risk
  for (const { word, regex } of WHOLE_WORD_REGEXES) {
    if (regex && regex.test(text)) {
      flagged.push(word);
    }
  }

  return {
    isClean: flagged.length === 0,
    flaggedWords: [...new Set(flagged)],
  };
}

export const MODERATION_WARNING = 'Please remove inappropriate language before continuing.';