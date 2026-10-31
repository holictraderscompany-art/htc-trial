// T23-A isolated prototype: synthetic text only; not connected to any application
// route or platform. These heuristics are not approved policy or a safety verdict.
// No identity lookup, storage, logging, transport or enforcement is performed.
export const MODERATION_LIMITS = Object.freeze({ maxMessageLength: 2048, maxRecentMessages: 8 });
export const MODERATION_REASON_CODES = Object.freeze([
  'INVALID_INPUT', 'EMPTY_INPUT', 'INPUT_TOO_LARGE', 'INVALID_CONTEXT', 'CONTEXT_TOO_LARGE',
  'OBFUSCATED_TEXT', 'REPEATED_MESSAGE', 'SUSPICIOUS_LINK', 'MALFORMED_LINK',
  'CREDENTIAL_SOLICITATION', 'FINANCIAL_CLAIM', 'FINANCIAL_CONTEXT',
  'STAFF_IDENTITY_CLAIM', 'ABUSE_INDICATOR', 'UNTRUSTED_INSTRUCTION',
  'CONTEXT_REVIEW', 'NO_LISTED_INDICATOR',
]);

function result(recommendedAction, reasonCodes) {
  return {
    recommendedAction, reasonCodes, requiresHumanReview: recommendedAction !== 'allow',
    prototype: true, enforcementAuthorized: false, policyStatus: 'PROPOSED',
  };
}

const normalize = text => text.normalize('NFKC').toLowerCase().replace(/\s+/gu, ' ').trim();

// recentMessages is caller-supplied synthetic context, never retained or attributed
// to a member. Limits are computational bounds, not approved sanction thresholds.
// "allow" means no listed indicator matched; it does not certify content as safe.
export function evaluateCommunityMessage(text, recentMessages = []) {
  try {
    if (typeof text !== 'string') return result('human_review', ['INVALID_INPUT']);
    if (text.length > MODERATION_LIMITS.maxMessageLength) return result('human_review', ['INPUT_TOO_LARGE']);
    const normalized = normalize(text);
    if (!normalized) return result('human_review', ['EMPTY_INPUT']);
    if (normalized.length > MODERATION_LIMITS.maxMessageLength) return result('human_review', ['INPUT_TOO_LARGE']);
    if (!Array.isArray(recentMessages)) return result('human_review', ['INVALID_CONTEXT']);
    const length = Object.getOwnPropertyDescriptor(recentMessages, 'length')?.value;
    if (!Number.isInteger(length) || length < 0) return result('human_review', ['INVALID_CONTEXT']);
    if (length > MODERATION_LIMITS.maxRecentMessages) return result('human_review', ['CONTEXT_TOO_LARGE']);
    const history = [];
    for (let i = 0; i < length; i++) {
      const entry = Object.getOwnPropertyDescriptor(recentMessages, String(i));
      if (!entry || !Object.hasOwn(entry, 'value') || typeof entry.value !== 'string')
        return result('human_review', ['INVALID_CONTEXT']);
      if (entry.value.length > MODERATION_LIMITS.maxMessageLength)
        return result('human_review', ['CONTEXT_TOO_LARGE']);
      const value = normalize(entry.value);
      if (value.length > MODERATION_LIMITS.maxMessageLength) return result('human_review', ['CONTEXT_TOO_LARGE']);
      history.push(value);
    }

    const reasons = new Set();
    let needsContext = false;
    if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/u.test(text)) {
      reasons.add('OBFUSCATED_TEXT'); needsContext = true;
    }
    if (normalized.length >= 24 && history.filter(value => value === normalized).length >= 2)
      reasons.add('REPEATED_MESSAGE');
    if (/\b(?:javascript|data):/u.test(normalized)) reasons.add('SUSPICIOUS_LINK');
    for (const match of normalized.matchAll(/\bhttps?:\/\/[^\s<>]+/gu)) {
      try {
        const url = new URL(match[0]); // Parsing only; never resolves or fetches a URL.
        if (url.protocol === 'http:' || url.username || url.password || url.hostname.includes('xn--'))
          reasons.add('SUSPICIOUS_LINK');
      } catch { reasons.add('MALFORMED_LINK'); needsContext = true; }
    }
    if (/\b(?:send|share|give|enter|kirim|berikan|masukkan|bagikan)\b.{0,60}\b(?:otp|password|kata\s+sandi|seed\s+phrase|private\s+key|pin)\b/u.test(normalized))
      reasons.add('CREDENTIAL_SOLICITATION');
    if (/\b(?:guaranteed?\s+(?:profits?|returns?)|risk[- ]free|pasti\s+(?:untung|profit|cuan)|dijamin\s+(?:untung|profit|cuan)|tanpa\s+risiko)\b/u.test(normalized)) {
      reasons.add('FINANCIAL_CLAIM'); needsContext = true;
    }
    if (/\b(?:investments?|investing|investasi|trading|trades?|saham|forex|crypto|kripto|profits?|returns?|cuan|beli|jual|buy|sell)\b/u.test(normalized)) {
      reasons.add('FINANCIAL_CONTEXT'); needsContext = true;
    }
    if (/\b(?:(?:i\s+am|i'm|saya(?:\s+adalah)?)\s+(?:(?:the|an?)\s+)?(?:official\s+)?(?:htc\s+)?(?:founder|admin|moderator|staff|staf|pendiri)|(?:admin|moderator|staf|staff)\s+(?:resmi\s+)?htc)\b/u.test(normalized)) {
      reasons.add('STAFF_IDENTITY_CLAIM'); needsContext = true;
    }
    if (/\b(?:idiot|stupid|bodoh|tolol|goblok|i will hurt you|saya akan menyakitimu)\b/u.test(normalized)) {
      reasons.add('ABUSE_INDICATOR'); needsContext = true;
    }
    if (/\b(?:ignore (?:all |previous )?instructions|abaikan (?:semua )?aturan)\b/u.test(normalized)) {
      reasons.add('UNTRUSTED_INSTRUCTION'); needsContext = true;
    }
    // A warning, quote or report can contain the very wording it warns against.
    // Keep the indicator but defer interpretation instead of labelling it abuse.
    // URL host/path words are not evidence of a quoted educational context.
    const prose = normalized.replace(/\bhttps?:\/\/[^\s<>]+/gu, ' ');
    if (reasons.size && /\b(?:do not|don't|never|jangan|waspada|beware|contoh|example|reported|melaporkan)\b/u.test(prose)) {
      reasons.add('CONTEXT_REVIEW'); needsContext = true;
    }
    if (!reasons.size) return result('allow', ['NO_LISTED_INDICATOR']);
    return result(needsContext ? 'human_review' : 'flag',
      MODERATION_REASON_CODES.filter(code => reasons.has(code)));
  } catch {
    // Malformed context (including hostile proxies) must not echo error/input data.
    return result('human_review', ['INVALID_INPUT']);
  }
}
