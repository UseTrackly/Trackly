/**
 * Client-side profanity / hate speech / explicit content filter.
 * Used before saving inventory items, community posts, profile data, and messages.
 *
 * Returns { isClean: boolean, flaggedWords: string[] }.
 */

const BLOCKED_WORDS = [
  // Racial slurs
  'nigger', 'nigga', 'niglet', 'spic', 'wetback', 'chink', 'gook', 'kike',
  'kyke', 'towelhead', 'raghead', 'spear chucker', 'porch monkey', 'jungle bunny',
  'sand nigger', 'beaner', 'coon', 'jigaboo', 'sambo', 'wop', 'dago', 'kraut',
  'mick', 'paddy', 'polack', 'hun', 'nip', 'zip', 'gook', 'slope',

  // Homophobic / transphobic slurs
  'faggot', 'fag', 'fagg', 'faggit', 'dyke', 'tranny', 'trannie', 'shemale',
  'he-she', 'it', 'queer bash',

  // Gender / sexuality slurs
  'whore', 'slut', 'skank', 'cunt', 'bitch', 'twat', 'pussy', 'bimbo',
  'cumdumpster', 'sloot',

  // Hate speech keywords
  'kill all', 'genocide', 'ethnic cleansing', 'racial war', 'race war',
  'white power', 'white pride', 'nazi', 'neo-nazi', 'neo nazi', 'hitler',
  'heil hitler', '88 hh', 'hh88', 'race traitor',

  // Explicit sexual terms (heavy)
  'rape', 'molest', 'pedophile', 'paedophile', 'pedobear', 'child porn',
  'cp distribution', 'loli', 'shota', 'bestiality', 'beastiality',
  'zoophilia', 'necrophilia', 'incest', 'child sex',

  // Heavy profanity
  'motherfucker', 'mother fucker', 'cocksucker', 'cock sucker',
  'asshole', 'arsehole', 'dickhead', 'dick weed', 'shitstain',
  'bullshit', 'horseshit', 'dipshit', 'dumbshit', 'shithead',
  'fuckface', 'fuckhead', 'fucktard', 'fuckwad', 'fuckboy',
  'jackass', 'dumbass', 'lazyass', 'fatass', 'dumbfuck',
];

// Common leetspeak / obfuscation substitutions
const NORMALIZE_MAP = {
  '@': 'a', '4': 'a', '8': 'b', '(': 'c', '¢': 'c',
  '3': 'e', '€': 'e', '!': 'i', '1': 'i', '|': 'i',
  '0': 'o', '$': 's', '5': 's', '7': 't', '+': 't',
  'vv': 'w', '2': 'z',
};

function normalizeText(text) {
  let result = text.toLowerCase();
  // Apply character substitutions
  for (const [from, to] of Object.entries(NORMALIZE_MAP)) {
    result = result.replaceAll(from, to);
  }
  // Remove common bypass characters: asterisks, dots, dashes, spaces between letters
  result = result.replace(/[\.*_\-=~`'^]/g, '');
  return result;
}

function getWords(text) {
  // Split on whitespace and common punctuation, keep alphanumeric
  return text.toLowerCase().split(/[^a-z0-9]+/).filter(w => w.length >= 2);
}

export function containsProfanity(text) {
  if (!text || typeof text !== 'string') return { isClean: true, flaggedWords: [] };

  const original = text.toLowerCase();
  const normalized = normalizeText(text);
  const words = getWords(text);
  const normalizedWords = getWords(normalized);

  // Combined word pool to check
  const allWords = [...new Set([...words, ...normalizedWords])];

  const flagged = [];

  for (const blocked of BLOCKED_WORDS) {
    const blockedNorm = normalizeText(blocked);

    // Check as whole-word match
    for (const word of allWords) {
      if (word === blockedNorm) {
        flagged.push(blocked);
        break;
      }
    }

    // Check multi-word phrases as substring in the normalized full text
    if (blocked.includes(' ')) {
      if (normalized.includes(blockedNorm)) {
        flagged.push(blocked);
      }
    }
  }

  // Also check raw substring for short slurs that might be concatenated
  // (e.g., "f*ck" -> "fuck" after normalization)
  const shortSlurs = ['nigger', 'faggot', 'kike', 'spic', 'chink'];
  for (const slur of shortSlurs) {
    if (normalized.includes(slur)) {
      if (!flagged.includes(slur)) flagged.push(slur);
    }
  }

  return {
    isClean: flagged.length === 0,
    flaggedWords: [...new Set(flagged)],
  };
}

export const MODERATION_WARNING = 'Please remove inappropriate language before continuing.';