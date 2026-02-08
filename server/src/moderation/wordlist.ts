/**
 * Central moderation lists used by server-side content filtering.
 * Keep these intentionally minimal and deterministic for MVP enforcement.
 */

export const DEFAULT_BANNED_TERMS: string[] = [
  // Profanity baseline
  'fuck',
  'shit',
  'bitch',
  'cunt',
  'asshole',
  'dick',
  'pussy',
  // Sexual content baseline
  'porn',
  'nude',
  'nudes',
  'sex',
  'xxx',
];

export const BLOCKED_URL_DOMAINS: string[] = [
  'pornhub.com',
  'xvideos.com',
  'xnxx.com',
  'redtube.com',
  'youporn.com',
  'xhamster.com',
  'spankbang.com',
  'onlyfans.com',
];
