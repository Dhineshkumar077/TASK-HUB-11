/**
 * TaskHub Contact Info & Privacy Restriction Filter
 * Protects platform escrow integrity by detecting and restricting external contact details:
 * - 10-digit mobile numbers and formatted phone numbers (+91, +1, parentheses, dashes, spaced digits)
 * - Email addresses (including obfuscated formats like [at] and [dot])
 * - External communication platforms (WhatsApp, Telegram, etc.)
 *
 * NOTE: Standard postal / PIN codes (5-digit or 6-digit postal numbers) are explicitly PERMITTED.
 */

export interface PrivacyCheckResult {
  hasViolation: boolean;
  reason?: string;
  matchedText?: string;
}

export function validatePrivacyText(text: string | undefined | null): PrivacyCheckResult {
  if (!text || typeof text !== 'string') {
    return { hasViolation: false };
  }

  const trimmed = text.trim();
  if (!trimmed) {
    return { hasViolation: false };
  }

  // 1. Check for email addresses (standard and obfuscated)
  const emailRegex = /[a-zA-Z0-9._%+-]+(?:\s*@\s*|\s*\[at\]\s*)[a-zA-Z0-9.-]+(?:\s*\.\s*|\s*\[dot\]\s*)[a-zA-Z]{2,}/i;
  const emailMatch = trimmed.match(emailRegex);
  if (emailMatch) {
    return {
      hasViolation: true,
      reason: 'Email addresses are restricted in address and description fields to protect escrow integrity.',
      matchedText: emailMatch[0],
    };
  }

  // 2. Check for external messaging keywords
  const messagingKeywords = [
    /\b(?:whatsapp|whats\s*app|wapp|wa\.me)\b/i,
    /\b(?:telegram|t\.me)\b/i,
    /\b(?:call\s*me\s*(?:at|on)?|phone\s*(?:me)?|ring\s*me)\b/i,
    /\b(?:reach\s*me\s*(?:at|on)?|contact\s*me\s*(?:at|on|via)?)\b/i,
  ];

  for (const kwRegex of messagingKeywords) {
    const match = trimmed.match(kwRegex);
    if (match) {
      return {
        hasViolation: true,
        reason: 'External communication handles or direct calling instructions are restricted.',
        matchedText: match[0],
      };
    }
  }

  // 3. Check for phone numbers
  // We need to allow 5 or 6 digit postal codes (e.g., 600028, 110001, 90210) while catching 10-digit or formatted phone numbers.
  // Phone numbers usually have 7 to 15 digits, frequently grouped (e.g. 98765 43210, +91-9876543210, 123-456-7890).

  // 3a. 10 to 13 consecutive digits
  const longConsecutiveDigits = trimmed.match(/\b\d{7,15}\b/);
  if (longConsecutiveDigits) {
    const digits = longConsecutiveDigits[0];
    // Exclude valid 5-6 digit postal codes
    if (digits.length >= 7) {
      return {
        hasViolation: true,
        reason: 'Phone numbers (7+ contiguous digits) are restricted to safeguard the platform escrow bridge.',
        matchedText: digits,
      };
    }
  }

  // 3b. Phone number formats with spaces, hyphens, parentheses, or +country code
  // e.g. +91 98765 43210, (123) 456-7890, 9876-543-210, 98765-43210, +1-555-123-4567
  const phonePattern = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phoneMatches = trimmed.match(phonePattern);
  if (phoneMatches) {
    for (const match of phoneMatches) {
      const cleanDigits = match.replace(/\D/g, '');
      // Only flag if it contains 10 or more digits (or 7 with explicit punctuation)
      if (cleanDigits.length >= 10 || (cleanDigits.length >= 7 && (match.includes('+') || match.includes('(')))) {
        return {
          hasViolation: true,
          reason: 'Phone numbers are restricted in address and note fields. Only standard address text and postal codes are permitted.',
          matchedText: match,
        };
      }
    }
  }

  // 3c. Catch spaced-out 10-digit numbers like "9 8 7 6 5 4 3 2 1 0" or "98765 43210"
  // Look for any string where stripping non-digits results in a 10+ digit sequence
  // But be careful not to trigger on an address with house #45, street #12, pincode 600028 (45 + 12 + 600028 = 10 digits total across the whole text!).
  // So check clusters within a 25-character window:
  const words = trimmed.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const chunk = words.slice(i, i + 4).join(' ');
    // Exclude if chunk contains words like "pin", "pincode", "zip", "code"
    if (/\b(?:pin|pincode|zip|postal)\b/i.test(chunk)) {
      continue;
    }
    const chunkDigits = chunk.replace(/\D/g, '');
    if (chunkDigits.length >= 10 && chunkDigits.length <= 15) {
      // Check if it's not simply two 5-digit numbers separated by text
      if (/(?:\d[\s.-]?){10,}/.test(chunk)) {
        return {
          hasViolation: true,
          reason: 'Attempted phone number entry detected. Contact information is restricted to protect escrow transactions.',
          matchedText: chunk,
        };
      }
    }
  }

  return { hasViolation: false };
}

/**
 * Masks phone numbers to protect counter-party privacy pre-escrow payment
 * Example: +91 9876543210 -> +91 XXXXX-XXXXX
 */
export function maskPhoneNumber(phone?: string | null): string {
  if (!phone || typeof phone !== 'string') return '+91 XXXXX-XXXXX';
  const trimmed = phone.trim();
  if (trimmed.startsWith('+')) {
    const parts = trimmed.split(' ');
    const code = parts[0] || '+91';
    return `${code} XXXXX-XXXXX`;
  }
  return '+91 XXXXX-XXXXX';
}

/**
 * Masks email addresses to protect counter-party privacy pre-escrow payment
 * Example: user@example.com -> u***@***.com
 */
export function maskEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return 'u***@***.com';
  const parts = email.trim().split('@');
  if (parts.length === 2) {
    const name = parts[0];
    const domain = parts[1];
    const maskedName = name.length > 2 ? `${name[0]}***${name[name.length - 1]}` : 'u***';
    const domainParts = domain.split('.');
    const tld = domainParts.length > 1 ? domainParts[domainParts.length - 1] : 'com';
    return `${maskedName}@***.${tld}`;
  }
  return 'u***@***.com';
}
