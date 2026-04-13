export function encodeKey(plain: string): string {
  if (typeof btoa === 'undefined') return plain;
  try {
    return btoa(unescape(encodeURIComponent(plain)));
  } catch {
    return plain;
  }
}

export function decodeKey(encoded: string): string {
  if (typeof atob === 'undefined') return encoded;
  try {
    return decodeURIComponent(escape(atob(encoded)));
  } catch {
    return encoded;
  }
}
