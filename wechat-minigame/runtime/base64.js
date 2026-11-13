// Browser base64 primitives for WeChat's device JS runtime. No Node Buffer dependency.
const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
export function atob(value) {
  let input = String(value).replace(/[\t\n\f\r ]/g, '');
  if (input.length % 4 === 0) input = input.replace(/={1,2}$/, '');
  if (input.length % 4 === 1 || /[^A-Za-z0-9+/]/.test(input)) {
    const error = new Error('Invalid base64 input');
    error.name = 'InvalidCharacterError';
    throw error;
  }
  let bits = 0, count = 0, output = '';
  for (const char of input) {
    bits = (bits << 6) | alphabet.indexOf(char);
    count += 6;
    if (count >= 8) {
      count -= 8;
      output += String.fromCharCode((bits >>> count) & 255);
    }
  }
  return output;
}
export function btoa(value) {
  const input = String(value);let output = '';
  for (let i = 0; i < input.length; i += 3) {
    const a = input.charCodeAt(i), b = input.charCodeAt(i + 1), c = input.charCodeAt(i + 2);
    if (a > 255 || b > 255 || c > 255) {
      const error = new Error('Input contains a non-byte character');
      error.name = 'InvalidCharacterError';
      throw error;
    }
    output += alphabet[a >>> 2] + alphabet[((a & 3) << 4) | (Number.isNaN(b) ? 0 : b >>> 4)];
    output += Number.isNaN(b) ? '=' : alphabet[((b & 15) << 2) | (Number.isNaN(c) ? 0 : c >>> 6)];
    output += Number.isNaN(c) ? '=' : alphabet[c & 63];
  }
  return output;
}
