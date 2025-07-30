import { Request } from 'express';
import type { DatabaseUser } from '../../../shared/src/types';

export interface AuthenticatedRequest extends Request {
  user?: DatabaseUser;
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  iat: number;
  exp: number;
}

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: 'Bearer';
}

export interface LoginResponse {
  user: DatabaseUser;
  tokens: AuthTokens;
}

export interface RefreshTokenResponse {
  tokens: AuthTokens;
}
