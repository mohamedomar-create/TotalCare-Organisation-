const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

/** A 10-character invitation code without look-alike letters (no 0/O, 1/I). */
export function newInviteCode() {
  const bytes = new Uint8Array(10)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => ALPHABET[b % ALPHABET.length]).join('')
}

/** wa.me needs the number in international form without "+": Egyptian 010… becomes 2010… */
export function whatsappNumber(phone: string) {
  const d = phone.replace(/\D/g, '')
  if (!d) return ''
  if (d.startsWith('00')) return d.slice(2)
  if (d.startsWith('0')) return '20' + d.slice(1)
  return d
}
