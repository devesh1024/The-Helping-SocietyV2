import { Request, Response, NextFunction } from 'express';
import { sanitizeString } from '../utils/sanitize';

/**
 * Keys that should be excluded from sanitization because they represent
 * email addresses, URLs, phone numbers, registration numbers, or pagination
 * parameters. The middleware will preserve the original value for these keys.
 */
const WHITELIST_KEYS = new Set([
  'email',
  'phoneNumber',
  'registrationNumber',
  'page',
  'limit',
  'skip',
  'perPage',
  'extraAnswers', // hackathon submissions: raw JSON string, sanitized field-by-field post-parse instead
  // add more if needed
]);

/**
 * Recursively sanitizes string values in an object, skipping whitelisted keys.
 */
function sanitizeRecursive(obj: any): any {
  if (Array.isArray(obj)) {
    return obj.map(sanitizeRecursive);
  }
  if (obj && typeof obj === 'object') {
    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string' && !WHITELIST_KEYS.has(key)) {
        result[key] = sanitizeString(value);
      } else {
        result[key] = sanitizeRecursive(value);
      }
    }
    return result;
  }
  return obj;
}

/**
 * Express middleware that sanitizes req.body and req.query strings while preserving whitelisted fields.
 * It does **not** touch req.params, as those are validated by Zod schemas elsewhere.
 */
export const sanitizeMiddleware = (req: Request, _res: Response, next: NextFunction) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeRecursive(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeRecursive(req.query);
  }
  next();
};
