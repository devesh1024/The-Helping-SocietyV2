import jwt from 'jsonwebtoken';

export interface IJWTPayload {
  id: string;
  role: string;
  email: string;
  isCoreTeam: boolean;
  sessionVersion?: number;
}

export const signAccessToken = (payload: IJWTPayload): string => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined.');
  }
  return jwt.sign(payload, secret, { expiresIn: '60m' });
};

export const signRefreshToken = (payload: IJWTPayload): string => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is not defined.');
  }
  return jwt.sign(payload, secret, { expiresIn: '30d' });
};

export const verifyAccessToken = (token: string): IJWTPayload => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not defined.');
  }
  return jwt.verify(token, secret) as IJWTPayload;
};

export const verifyRefreshToken = (token: string): IJWTPayload => {
  const secret = process.env.JWT_REFRESH_SECRET;
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET environment variable is not defined.');
  }
  return jwt.verify(token, secret) as IJWTPayload;
};
