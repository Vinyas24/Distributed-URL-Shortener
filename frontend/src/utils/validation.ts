const RESERVED_WORDS = new Set([
  'api',
  'actuator',
  'swagger',
  'swagger-ui',
  'v3',
  'health',
  'metrics',
  'urls',
  'admin',
  'favicon.ico',
  'robots.txt',
  'login',
  'dashboard',
  'links',
  'stats',
  'design',
  'expired',
  '404',
]);

const LOCALHOST_REGEX = /^(https?:\/\/)?(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|::1|\[::1\])/i;
const CUSTOM_CODE_REGEX = /^[A-Za-z0-9_-]{3,15}$/;

export type FormValidationErrors = Record<string, string>;

export function validateUrlShortenForm(
  originalUrl: string,
  customCode?: string,
  expiresAt?: string
): { isValid: boolean; errors: FormValidationErrors } {
  const errors: FormValidationErrors = {};

  // 1. Original URL validation
  const trimmedUrl = originalUrl.trim();
  if (!trimmedUrl) {
    errors.originalUrl = 'Destination URL is required';
  } else if (trimmedUrl.length > 2048) {
    errors.originalUrl = 'Destination URL cannot exceed 2,048 characters';
  } else if (!/^https?:\/\//i.test(trimmedUrl)) {
    errors.originalUrl = 'Destination URL must begin with http:// or https://';
  } else if (LOCALHOST_REGEX.test(trimmedUrl)) {
    errors.originalUrl = 'Localhost and private IP addresses are prohibited (SSRF prevention)';
  } else {
    try {
      new URL(trimmedUrl);
    } catch {
      errors.originalUrl = 'Destination URL is malformed';
    }
  }

  // 2. Custom Code validation (optional)
  if (customCode && customCode.trim().length > 0) {
    const trimmedCode = customCode.trim();
    if (!CUSTOM_CODE_REGEX.test(trimmedCode)) {
      errors.customCode = 'Custom code must be 3-15 characters of [A-Za-z0-9_-]';
    } else if (RESERVED_WORDS.has(trimmedCode.toLowerCase())) {
      errors.customCode = `"${trimmedCode}" is a reserved system path and cannot be used`;
    }
  }

  // 3. Expiration validation (optional)
  if (expiresAt && expiresAt.trim().length > 0) {
    const expDate = new Date(expiresAt);
    if (isNaN(expDate.getTime())) {
      errors.expiresAt = 'Invalid expiration date format';
    } else if (expDate.getTime() <= Date.now()) {
      errors.expiresAt = 'Expiration date must be in the future';
    }
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}
