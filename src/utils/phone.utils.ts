/**
 * Checks if a string is a valid Nigerian phone number.
 * Supported formats (with optional spaces, hyphens, brackets, leading '+'):
 * - Local 11 digits: 070..., 080..., 081..., 090..., 091...
 * - International 13 digits: 23470..., 23480..., 23481..., 23490..., 23491... / +234...
 * - 10 digits without leading zero: 70..., 80..., 81..., 90..., 91...
 */
export function isValidNigerianPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-()+]/g, "");

  // 11 digits starting with 0 (e.g. 08031234567, 070..., 081..., 090..., 091...)
  if (/^0[789][01]\d{8}$/.test(cleaned) || /^0[7-9]\d{9}$/.test(cleaned)) {
    return true;
  }

  // 13 digits starting with 234 (e.g. 2348031234567)
  if (/^234[789][01]\d{8}$/.test(cleaned) || /^234[7-9]\d{9}$/.test(cleaned)) {
    return true;
  }

  // 10 digits without leading 0 (e.g. 8031234567)
  if (/^[789][01]\d{8}$/.test(cleaned) || /^[7-9]\d{9}$/.test(cleaned)) {
    return true;
  }

  return false;
}

export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-()]/g, "");
  if (isValidNigerianPhone(phone)) return true;
  return /^\+?[1-9]\d{9,14}$/.test(cleaned);
}

export function normalizePhoneNumber(phone: string): string {
  if (!phone) return phone;
  const cleaned = phone.replace(/[\s\-()]/g, "");

  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  // Nigeria local format conversion 080... -> +23480...
  if (cleaned.startsWith("0") && cleaned.length === 11) {
    return `+234${cleaned.slice(1)}`;
  }

  // Nigeria 10-digit without leading 0 -> +23480...
  if (cleaned.length === 10 && /^[7-9]/.test(cleaned)) {
    return `+234${cleaned}`;
  }

  if (cleaned.startsWith("234") && cleaned.length === 13) {
    return `+${cleaned}`;
  }

  return `+${cleaned}`;
}

export function cleanPhoneForWhatsApp(phone: string): string {
  if (!phone) return "";
  const normalized = normalizePhoneNumber(phone);
  return normalized.replace(/\D/g, "");
}

