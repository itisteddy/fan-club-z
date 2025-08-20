import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import config from '../config';
import { AuthTokens } from '@fanclubz/shared';

export class AuthUtils {
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  static async comparePassword(password: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(password, hashedPassword);
  }

  static generateTokens(payload: { userId: string; email: string }): AuthTokens {
    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn,
      issuer: 'fanclubz-api',
      audience: 'fanclubz-client',
    });

    const refreshToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn,
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

  static verifyToken(token: string): { userId: string; email: string } {
    try {
      const decoded = jwt.verify(token, config.jwt.secret, {
        issuer: 'fanclubz-api',
        audience: 'fanclubz-client',
      }) as any;

      return {
        userId: decoded.userId,
        email: decoded.email,
      };
    } catch (error) {
      throw new Error('Invalid token');
    }
  }

  static generateRandomToken(length: number = 32): string {
    return crypto.randomBytes(length).toString('hex');
  }

  static generateOTP(length: number = 6): string {
    const digits = '0123456789';
    let otp = '';
    
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    
    return otp;
  }

  static generateSecureId(): string {
    return crypto.randomUUID();
  }
}

export default AuthUtils;
