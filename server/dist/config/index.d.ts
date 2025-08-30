export declare const config: {
    readonly server: {
        readonly port: number;
        readonly nodeEnv: string;
    };
    readonly frontend: {
        readonly url: string;
    };
    readonly api: {
        readonly url: string;
        readonly version: "v2";
    };
    readonly supabase: {
        readonly url: string;
        readonly anonKey: string;
        readonly serviceRoleKey: string;
    };
    readonly jwt: {
        readonly secret: string;
        readonly expiresIn: string;
        readonly refreshExpiresIn: string;
    };
    readonly redis: {
        readonly url: string;
        readonly host: string;
        readonly port: number;
        readonly password: string;
    };
    readonly rateLimit: {
        readonly windowMs: number;
        readonly max: number;
        readonly standardHeaders: true;
        readonly legacyHeaders: false;
    };
    readonly upload: {
        readonly maxFileSize: number;
        readonly allowedTypes: string[];
        readonly s3Bucket: string;
    };
    readonly payment: {
        readonly demoMode: boolean;
        readonly demoSuccessRate: number;
        readonly demoProcessingDelay: number;
        readonly stripe: {
            readonly secretKey: string;
            readonly publishableKey: string;
            readonly webhookSecret: string;
        };
        readonly paystack: {
            readonly secretKey: string;
            readonly publicKey: string;
        };
    };
    readonly kyc: {
        readonly enabled: boolean;
        readonly providerApiKey: string;
        readonly basicLimit: number;
        readonly enhancedLimit: number;
    };
    readonly features: {
        readonly socialFeatures: boolean;
        readonly clubs: boolean;
        readonly realTime: boolean;
        readonly pushNotifications: boolean;
        readonly analytics: boolean;
        readonly blockchain: boolean;
    };
    readonly email: {
        readonly provider: string;
        readonly smtp: {
            readonly host: string;
            readonly port: number;
            readonly secure: boolean;
            readonly auth: {
                readonly user: string;
                readonly pass: string;
            };
        };
        readonly sendgrid: {
            readonly apiKey: string;
        };
        readonly from: {
            readonly name: string;
            readonly email: string;
        };
    };
    readonly blockchain: {
        readonly enabled: boolean;
        readonly network: string;
        readonly rpcUrl: string;
        readonly privateKey: string;
        readonly escrowContractAddress: string;
    };
    readonly analytics: {
        readonly enabled: boolean;
        readonly googleAnalyticsId: string;
        readonly mixpanelToken: string;
        readonly apiKey: string;
    };
    readonly logging: {
        readonly level: string;
        readonly enableConsole: boolean;
        readonly enableFile: boolean;
        readonly enableJson: boolean;
        readonly maxFiles: string;
        readonly maxSize: string;
    };
    readonly security: {
        readonly bcryptRounds: number;
        readonly sessionSecret: string;
        readonly corsOrigins: string[];
        readonly trustProxy: boolean;
    };
    readonly cache: {
        readonly ttl: number;
        readonly maxSize: number;
    };
    readonly database: {
        readonly maxConnections: number;
        readonly connectionTimeout: number;
    };
    readonly websocket: {
        readonly enabled: boolean;
        readonly port: number;
        readonly origins: string[];
    };
};
export default config;
//# sourceMappingURL=index.d.ts.map