"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthUtils = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const crypto_1 = __importDefault(require("crypto"));
const config_1 = __importDefault(require("../config"));
class AuthUtils {
    static async hashPassword(password) {
        const saltRounds = 12;
        return bcryptjs_1.default.hash(password, saltRounds);
    }
    static async comparePassword(password, hashedPassword) {
        return bcryptjs_1.default.compare(password, hashedPassword);
    }
    static generateTokens(payload) {
        const accessToken = jsonwebtoken_1.default.sign(payload, config_1.default.jwt.secret, {
            expiresIn: config_1.default.jwt.expiresIn,
            issuer: 'fanclubz-api',
            audience: 'fanclubz-client',
        });
        const refreshToken = jsonwebtoken_1.default.sign(payload, config_1.default.jwt.secret, {
            expiresIn: config_1.default.jwt.refreshExpiresIn,
            issuer: 'fanclubz-api',
            audience: 'fanclubz-client',
        });
        return {
            access_token: accessToken,
            refresh_token: refreshToken,
            expires_in: 7 * 24 * 60 * 60, // 7 days in seconds
            token_type: 'Bearer',
        };
    }
    static verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, config_1.default.jwt.secret, {
                issuer: 'fanclubz-api',
                audience: 'fanclubz-client',
            });
            return {
                userId: decoded.userId,
                email: decoded.email,
            };
        }
        catch (error) {
            throw new Error('Invalid token');
        }
    }
    static generateRandomToken(length = 32) {
        return crypto_1.default.randomBytes(length).toString('hex');
    }
    static generateOTP(length = 6) {
        const digits = '0123456789';
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += digits[Math.floor(Math.random() * digits.length)];
        }
        return otp;
    }
    static generateSecureId() {
        return crypto_1.default.randomUUID();
    }
}
exports.AuthUtils = AuthUtils;
exports.default = AuthUtils;
