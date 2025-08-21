export const VERSION = "2.0.53";
export const BUILD_DATE = new Date().toISOString();
export const BUILD_ENV = process.env.NODE_ENV || "development";

export const FEATURES = {
  REAL_TIME_COMMENTS: true,
  SOCIAL_ENGAGEMENT: true,
  WALLET_INTEGRATION: true,
  CLUB_SYSTEM: true,
  SETTLEMENT_SYSTEM: true,
  ANALYTICS: true,
};

export const API_VERSIONS = {
  PREDICTIONS: "v2",
  SOCIAL: "v2",
  WALLET: "v2",
  CLUBS: "v2",
};

export const isDevelopment = BUILD_ENV === "development";
export const isProduction = BUILD_ENV === "production";
export const isStaging = BUILD_ENV === "staging";

export const versionInfo = {
  version: VERSION,
  buildDate: BUILD_DATE,
  environment: BUILD_ENV,
  features: FEATURES,
  apiVersions: API_VERSIONS,
};
