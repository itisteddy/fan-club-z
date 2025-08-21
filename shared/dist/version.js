"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.versionInfo = exports.isStaging = exports.isProduction = exports.isDevelopment = exports.API_VERSIONS = exports.FEATURES = exports.BUILD_ENV = exports.BUILD_DATE = exports.VERSION = void 0;
exports.VERSION = "2.0.56";
exports.BUILD_DATE = new Date().toISOString();
exports.BUILD_ENV = process.env.NODE_ENV || "development";
exports.FEATURES = {
    REAL_TIME_COMMENTS: true,
    SOCIAL_ENGAGEMENT: true,
    WALLET_INTEGRATION: true,
    CLUB_SYSTEM: true,
    SETTLEMENT_SYSTEM: true,
    ANALYTICS: true,
};
exports.API_VERSIONS = {
    PREDICTIONS: "v2",
    SOCIAL: "v2",
    WALLET: "v2",
    CLUBS: "v2",
};
exports.isDevelopment = exports.BUILD_ENV === "development";
exports.isProduction = exports.BUILD_ENV === "production";
exports.isStaging = exports.BUILD_ENV === "staging";
exports.versionInfo = {
    version: exports.VERSION,
    buildDate: exports.BUILD_DATE,
    environment: exports.BUILD_ENV,
    features: exports.FEATURES,
    apiVersions: exports.API_VERSIONS,
};
