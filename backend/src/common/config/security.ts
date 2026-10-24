import { randomBytes } from 'crypto';

let developmentSecret: string;
export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (secret && secret !== 'your-super-secret-jwt-key-change-in-production' && secret.length >= 32) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Set JWT_SECRET to a unique secret of at least 32 characters in production');
  }
  // One unpredictable secret per process; restarting invalidates local demo tokens.
  return developmentSecret ||= randomBytes(48).toString('hex');
}

export function allowedOrigins(): string[] {
  return process.env.CORS_ORIGIN
    ? process.env.CORS_ORIGIN.split(',').map(value => value.trim()).filter(Boolean)
    : process.env.NODE_ENV === 'production' ? []
    : ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:5175', 'http://localhost:5176'];
}

export function checkOrigin(origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) {
  callback(null, !origin || allowedOrigins().includes(origin));
}
