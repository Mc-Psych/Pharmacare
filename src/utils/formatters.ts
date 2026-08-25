/**
 * Safe numeric & currency formatting utilities to prevent 'Cannot read properties of undefined (reading toFixed)'
 */

export function safeNumber(value: any, fallback = 0): number {
  if (value === null || value === undefined) {
    return fallback;
  }
  const n = Number(value);
  if (isNaN(n) || !isFinite(n)) {
    return fallback;
  }
  return n;
}

export function safeFixed(value: any, digits = 2): string {
  const num = safeNumber(value, 0);
  return num.toFixed(digits);
}

export function formatCurrency(value: any, symbol = 'GH₵', digits = 2): string {
  return `${symbol}${safeFixed(value, digits)}`;
}
