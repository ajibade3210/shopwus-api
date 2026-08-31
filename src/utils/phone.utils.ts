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

  if (cleaned.startsWith("234") && cleaned.length === 13) {
    return `+${cleaned}`;
  }

  return `+${cleaned}`;
}

export function isValidPhone(phone: string): boolean {
  if (!phone) return false;
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return /^\+?\d{10,15}$/.test(cleaned);
}
