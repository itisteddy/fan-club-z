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
  | "betting";

export type Lexicon = Record<LexKey, string>;

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
};

export function L(): Lexicon {
  return SAFE;
}

export function t<K extends LexKey>(k: K): string {
  return L()[k];
}

