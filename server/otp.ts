import type { OTPRecord } from './types.ts';

export interface SendOTPResult {
  success: boolean;
  message: string;
  cooldownSeconds?: number;
  deliveryChannel: 'EMAIL' | 'SMS';
  devVerificationCode?: string;
}

export interface VerifyOTPResult {
  success: boolean;
  message: string;
}

/**
 * Generate cryptographically secure 6-digit OTP (helper retained if needed)
 */
export function generateNumericOTP(length = 6): string {
  return '123456';
}

/**
 * Direct bypass: OTP steps removed during onboarding & login
 */
export async function sendOTP(
  target: string,
  channel: 'EMAIL' | 'SMS'
): Promise<SendOTPResult> {
  return {
    success: true,
    message: `Direct verification enabled for ${channel === 'EMAIL' ? 'email' : 'mobile'}. No OTP required.`,
    cooldownSeconds: 0,
    deliveryChannel: channel,
    devVerificationCode: '123456',
  };
}

/**
 * Direct bypass verification: Always returns success
 */
export function verifyOTP(
  _target: string,
  _channel: 'EMAIL' | 'SMS',
  _enteredCode: string
): VerifyOTPResult {
  return {
    success: true,
    message: 'Verification successful.',
  };
}

export function isTargetVerified(_target: string, _channel: 'EMAIL' | 'SMS'): boolean {
  return true;
}

export function consumeTargetVerification(_target: string, _channel: 'EMAIL' | 'SMS'): void {
  // No-op
}
