// Small text helpers shared by the stand-in embedder and the stand-in model. Lab fixture: please leave it alone.
export const STOP = new Set(['a', 'an', 'the', 'and', 'or', 'of', 'to', 'in', 'on', 'at', 'is', 'are', 'was', 'with', 'for', 'do', 'does', 'it', 'by', 'as', 'be', 'this', 'that', 'what', 'whats', 'which', 'who', 'how', 'my', 'me', 'i', 'you', 'your', 'can', 'there', 'any', 'if', 'about', 'tell', 'please', 'up', 'not']);

/** A very light stemmer: plurals and a few endings. "lines" and "line" meet; "ss" words are left alone. */
export function stem(word) {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 3 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

/** Lowercase words with digits kept ("4.99" becomes "4" and "99"), punctuation dropped, stop words removed, light stemming. */
export function tokens(text, { keepStop = false } = {}) {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(w => w.length > 0 && (keepStop || !STOP.has(w)))
    .map(stem);
}

export function fnv1a(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
