/**
 * Server-Side Privacy & Contact Info Restriction Filter
 * Validates address fields, customer instructions, and notes on backend routes.
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

  // 1. Email check
  const emailRegex = /[a-zA-Z0-9._%+-]+(?:\s*@\s*|\s*\[at\]\s*)[a-zA-Z0-9.-]+(?:\s*\.\s*|\s*\[dot\]\s*)[a-zA-Z]{2,}/i;
  const emailMatch = trimmed.match(emailRegex);
  if (emailMatch) {
    return {
      hasViolation: true,
      reason: 'Email addresses are restricted in address and description fields to protect escrow integrity.',
      matchedText: emailMatch[0],
    };
  }

  // 2. Messaging keywords
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

  // 3. Phone patterns
  const longConsecutiveDigits = trimmed.match(/\b\d{7,15}\b/);
  if (longConsecutiveDigits) {
    const digits = longConsecutiveDigits[0];
    if (digits.length >= 7) {
      return {
        hasViolation: true,
        reason: 'Phone numbers (7+ digits) are restricted to safeguard the platform escrow bridge.',
        matchedText: digits,
      };
    }
  }

  const phonePattern = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;
  const phoneMatches = trimmed.match(phonePattern);
  if (phoneMatches) {
    for (const match of phoneMatches) {
      const cleanDigits = match.replace(/\D/g, '');
      if (cleanDigits.length >= 10 || (cleanDigits.length >= 7 && (match.includes('+') || match.includes('(')))) {
        return {
          hasViolation: true,
          reason: 'Phone numbers are restricted in address and note fields. Only standard address text and postal codes are permitted.',
          matchedText: match,
        };
      }
    }
  }

  // Windowed search for spaced digits
  const words = trimmed.split(/\s+/);
  for (let i = 0; i < words.length; i++) {
    const chunk = words.slice(i, i + 4).join(' ');
    if (/\b(?:pin|pincode|zip|postal)\b/i.test(chunk)) {
      continue;
    }
    const chunkDigits = chunk.replace(/\D/g, '');
    if (chunkDigits.length >= 10 && chunkDigits.length <= 15) {
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
