import { AuthTokens } from '@fanclubz/shared';
export declare class AuthUtils {
    static hashPassword(password: string): Promise<string>;
    static comparePassword(password: string, hashedPassword: string): Promise<boolean>;
    static generateTokens(payload: {
        userId: string;
        email: string;
    }): AuthTokens;
    static verifyToken(token: string): {
        userId: string;
        email: string;
    };
    static generateRandomToken(length?: number): string;
    static generateOTP(length?: number): string;
    static generateSecureId(): string;
}
export default AuthUtils;
