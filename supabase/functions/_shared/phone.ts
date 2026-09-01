/**
 * Accepts whatever the sign-in / staff forms hand over -- "80563 29742",
 * "+91 80563 29742", "918056329742", "08056329742" -- and returns strict
 * E.164 (+91XXXXXXXXXX), or null if it does not look like an Indian mobile
 * number. Indian mobiles always start 6-9 after the country code.
 */
export function toE164India(raw: string): string | null {
  const digits = raw.replace(/\D/g, '');
  let ten: string | null = null;
  if (digits.length === 10) ten = digits;
  else if (digits.length === 11 && digits.startsWith('0')) ten = digits.slice(1);
  else if (digits.length === 12 && digits.startsWith('91')) ten = digits.slice(2);
  else if (digits.length === 13 && digits.startsWith('091')) ten = digits.slice(3);
  if (!ten || !/^[6-9]\d{9}$/.test(ten)) return null;
  return `+91${ten}`;
}

export function maskPhone(e164: string): string {
  return e164.slice(0, 6) + '••••••' + e164.slice(-2);
}
