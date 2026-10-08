/** Formatting is shared by signup and profile; validation runs before persistence. */
export const formatPersonName = (value: string) => value.replace(/[^\p{L}\p{M}\s'’.-]/gu, '').replace(/\s{2,}/g, ' ').slice(0, 150);
export const normalizeEmailInput = (value: string) => value.replace(/\s/g, '').slice(0, 254);
export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
export function formatPhoneInput(value: string): string {
  let digits = value.replace(/\D/g, '');
  const international = digits.startsWith('55') && digits.length > 11;
  if (international) digits = digits.slice(2);
  digits = digits.slice(0, 11);
  const local = digits.length <= 2 ? digits : `(${digits.slice(0, 2)}) ${digits.slice(2, digits.length > 10 ? 7 : 6)}${digits.length > 6 ? `-${digits.slice(digits.length > 10 ? 7 : 6)}` : ''}`;
  return international ? `+55 ${local}` : local;
}
export const isValidPhone = (value: string) => /^(?:55)?\d{10,11}$/.test(value.replace(/\D/g, ''));
export function formatProfessionalCreci(value: string): string {
  const clean = value.toUpperCase();
  const digits = clean.replace(/\D/g, '').slice(0, 7);
  const suffix = clean.match(/[FJ]/)?.[0];
  return digits + (digits && (suffix || digits.length >= 6) ? `-${suffix || ''}` : '');
}
export const isValidProfessionalCreci = (value: string) => /^\d{4,7}-[FJ]$/.test(value);
