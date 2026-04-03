import { TOTP, Secret } from 'otpauth';
import * as QRCode from 'qrcode';
import crypto from 'crypto';

const ISSUER = 'OpenCode Remote';
const TOTP_PERIOD = 30; // seconds
const TOTP_DIGITS = 6;

function createTOTP(secret: string, label: string): TOTP {
  return new TOTP({
    issuer: ISSUER,
    label,
    algorithm: 'SHA1',
    digits: TOTP_DIGITS,
    period: TOTP_PERIOD,
    secret: Secret.fromBase32(secret),
  });
}

/**
 * Generate a new TOTP secret.
 * Returns base32-encoded secret string.
 */
export function generateSecret(): string {
  const secret = new Secret({ size: 20 }); // 160-bit
  return secret.base32;
}

/**
 * Generate backup codes (one-time use recovery codes).
 */
export function generateBackupCodes(count: number = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Format: 8 hex chars, e.g. "a1b2-c3d4"
    const raw = crypto.randomBytes(4).toString('hex');
    codes.push(`${raw.slice(0, 4)}-${raw.slice(4)}`);
  }
  return codes;
}

/**
 * Verify a TOTP code.
 * Allows ±1 period window to handle clock drift.
 */
export function verifyCode(secret: string, code: string, machineId: string): boolean {
  const totp = createTOTP(secret, machineId);
  const delta = totp.validate({ token: code, window: 1 });
  return delta !== null;
}

/**
 * Get the otpauth:// URI for authenticator apps.
 */
export function getOtpauthUri(secret: string, machineId: string): string {
  const totp = createTOTP(secret, machineId);
  return totp.toString();
}

/**
 * Generate a QR code as data URL (base64 PNG) for the otpauth URI.
 */
export async function generateQRCode(secret: string, machineId: string): Promise<string> {
  const uri = getOtpauthUri(secret, machineId);
  return QRCode.toDataURL(uri, {
    width: 256,
    margin: 2,
    color: { dark: '#000000', light: '#ffffff' },
  });
}
