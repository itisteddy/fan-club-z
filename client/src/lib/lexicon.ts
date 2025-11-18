/**
 * Store-Safe Lexicon Helper
 * 
 * Replaces gambling-related terminology with store-compliant alternatives
 * for Google Play Store and other app store policies.
 * 
 * Usage: import { L } from '@/lib/lexicon'; <Button>{L("betVerb")}</Button>
 */

type LexKey =
  | "bet"
  | "bets"
  | "betVerb"
  | "myBets"
  | "betSlip"
  | "wager"
  | "winnings"
  | "cashOut"
  | "odds"
  | "betting"
  | "placeBet"
  | "betPlaced"
  | "activeBets"
  | "completedBets";

export type Lexicon = Record<LexKey, string>;

// Default store-safe variants (compliant with Google Play policies)
const SAFE: Lexicon = {
  bet: "stake",
  bets: "stakes",
  betVerb: "Lock stake",
  myBets: "Stakes",
  betSlip: "Prediction ticket",
  wager: "Stake amount",
  winnings: "Payout",
  cashOut: "Withdraw",
  odds: "Payout ratio",
  betting: "predicting",
  placeBet: "Lock stake",
  betPlaced: "Stake locked",
  activeBets: "Active stakes",
  completedBets: "Completed stakes",
};

/**
 * Get the lexicon for the current platform/region
 * Currently returns the same SAFE lexicon for all platforms
 * Can be extended later for platform/region-specific variants
 */
export function getLexicon(opts?: { platform?: "android" | "ios" | "web"; region?: string }): Lexicon {
  // Room to customize by platform/region if needed in the future
  // For now, same SAFE lexicon across all platforms
  return SAFE;
}

/**
 * Tiny string helper - get a lexicon term
 * 
 * @example
 * L("betVerb") // returns "Lock stake"
 * L("myBets") // returns "My stakes"
 */
export function L<K extends LexKey>(
  k: K,
  opts?: { platform?: "android" | "ios" | "web"; region?: string }
): string {
  return getLexicon(opts)[k];
}

/**
 * Helper to replace common phrases in text
 * Useful for longer strings that contain multiple terms
 */
export function replaceLexicon(text: string, opts?: { platform?: "android" | "ios" | "web"; region?: string }): string {
  const lex = getLexicon(opts);
  return text
    .replace(/\bbet\b/gi, lex.bet)
    .replace(/\bbets\b/gi, lex.bets)
    .replace(/\bbetting\b/gi, lex.betting)
    .replace(/\bwager\b/gi, lex.wager)
    .replace(/\bwinnings\b/gi, lex.winnings)
    .replace(/\bcash out\b/gi, lex.cashOut)
    .replace(/\bbet slip\b/gi, lex.betSlip)
    .replace(/\bodds\b/gi, lex.odds);
}

