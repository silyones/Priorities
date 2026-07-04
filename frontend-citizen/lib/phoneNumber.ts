/** Strip formatting; empty string if nothing left. */
export function normalizePhoneInput(value: string): string {
  return value.replace(/[\s\-()]/g, "").trim();
}

/**
 * Optional field: blank is valid.
 * Accepts 10 digits, or optional +91 / 91 country prefix.
 * Returns normalized 10-digit string, or null if blank.
 */
export function parsePhoneNumber(value: string): string | null {
  let normalized = normalizePhoneInput(value);
  if (!normalized) return null;

  if (normalized.startsWith("+91")) {
    normalized = normalized.slice(3);
  } else if (normalized.startsWith("91") && normalized.length === 12) {
    normalized = normalized.slice(2);
  }

  if (/^\d{10}$/.test(normalized)) {
    return normalized;
  }

  return null;
}

export function isValidPhoneNumber(value: string): boolean {
  if (!normalizePhoneInput(value)) return true;
  return parsePhoneNumber(value) !== null;
}
