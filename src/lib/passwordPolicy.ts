export const PASSWORD_MIN_LENGTH = 10;

export const passwordChecks = (password: string) => ({
  length: password.length >= PASSWORD_MIN_LENGTH,
  lowercase: /[a-z]/.test(password),
  uppercase: /[A-Z]/.test(password),
  number: /\d/.test(password),
  symbol: /[^A-Za-z0-9]/.test(password),
});

export const isStrongPassword = (password: string) =>
  Object.values(passwordChecks(password)).every(Boolean);

export const PASSWORD_REQUIREMENTS = [
  ['length', `Pelo menos ${PASSWORD_MIN_LENGTH} caracteres`],
  ['lowercase', 'Uma letra minúscula'],
  ['uppercase', 'Uma letra maiúscula'],
  ['number', 'Um número'],
  ['symbol', 'Um caractere especial'],
] as const;
