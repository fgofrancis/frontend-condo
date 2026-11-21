/** Genera una contraseña aleatoria criptográficamente segura (cumple: ≥12, letras y números). */
export function generatePassword(length = 16): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789-_#$%';
  const buf = new Uint32Array(length);
  crypto.getRandomValues(buf);
  let out = Array.from(buf, n => chars[n % chars.length]).join('');
  if (!/[A-Za-z]/.test(out) || !/\d/.test(out)) out = 'a7' + out.slice(2);
  return out;
}

export const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);

export const PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d).{12,128}$/;
export const CODE_PATTERN = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;