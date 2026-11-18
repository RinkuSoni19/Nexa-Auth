function base32ToBytes(secret: string): number[] {
  const normalized = secret
    .toUpperCase()
    .replace(/[\s=-]/g, '')
    .replace(/0/g, 'O')
    .replace(/1/g, 'I');
  let bits = '';
  for (const char of normalized) {
    const value = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char);
    if (value >= 0) bits += value.toString(2).padStart(5, '0');
  }
  const bytes: number[] = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) {
    bytes.push(parseInt(bits.slice(i, i + 8), 2));
  }
  return bytes;
}

function sha1(message: number[]): number[] {
  const bytes = [...message];
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push((bitLength / 2 ** (i * 8)) & 0xff);
  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const w = new Array<number>(80);
    for (let i = 0; i < 16; i++) {
      w[i] = (bytes[offset + i * 4] << 24) | (bytes[offset + i * 4 + 1] << 16)
        | (bytes[offset + i * 4 + 2] << 8) | bytes[offset + i * 4 + 3];
    }
    for (let i = 16; i < 80; i++) {
      w[i] = ((t => (t << 1) | (t >>> 31))(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16]));
    }
    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number, k: number;
      if (i < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (i < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (i < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }
      const temp = (((a << 5) | (a >>> 27)) + f + e + k + w[i]) | 0;
      e = d; d = c; c = ((b << 30) | (b >>> 2)); b = a; a = temp;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
  }
  return [h0,h1,h2,h3,h4].flatMap(value => [
    (value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff,
  ]);
}

const SHA256_K = [
  0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,
  0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,
  0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,
  0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,
  0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,
  0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,
  0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,
  0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2,
];

function sha256(message: number[]): number[] {
  const bytes = [...message];
  const bitLength = bytes.length * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  for (let i = 7; i >= 0; i--) bytes.push((bitLength / 2 ** (i * 8)) & 0xff);
  let h = [0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19];
  const rightRotate = (value: number, bits: number) => (value >>> bits) | (value << (32 - bits));
  for (let offset = 0; offset < bytes.length; offset += 64) {
    const w = new Array<number>(64);
    for (let i = 0; i < 16; i++) {
      w[i] = (bytes[offset + i * 4] << 24) | (bytes[offset + i * 4 + 1] << 16)
        | (bytes[offset + i * 4 + 2] << 8) | bytes[offset + i * 4 + 3];
    }
    for (let i = 16; i < 64; i++) {
      const s0 = rightRotate(w[i - 15], 7) ^ rightRotate(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rightRotate(w[i - 2], 17) ^ rightRotate(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
    }
    let [a,b,c,d,e,f,g,j] = h;
    for (let i = 0; i < 64; i++) {
      const S1 = rightRotate(e, 6) ^ rightRotate(e, 11) ^ rightRotate(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (j + S1 + ch + SHA256_K[i] + w[i]) | 0;
      const S0 = rightRotate(a, 2) ^ rightRotate(a, 13) ^ rightRotate(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) | 0;
      j = g; g = f; f = e; e = (d + temp1) | 0; d = c; c = b; b = a; a = (temp1 + temp2) | 0;
    }
    h = h.map((value, i) => (value + [a,b,c,d,e,f,g,j][i]) | 0);
  }
  return h.flatMap(value => [
    (value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff,
  ]);
}

function hmac(key: number[], message: number[], algorithm: 'SHA1'|'SHA256'): number[] {
  const blockSize = 64;
  let normalizedKey = [...key];
  if (normalizedKey.length > blockSize) {
    normalizedKey = algorithm === 'SHA256' ? sha256(normalizedKey) : sha1(normalizedKey);
  }
  while (normalizedKey.length < blockSize) normalizedKey.push(0);
  const inner = normalizedKey.map(value => value ^ 0x36);
  const outer = normalizedKey.map(value => value ^ 0x5c);
  const hash = algorithm === 'SHA256' ? sha256 : sha1;
  return hash([...outer, ...hash([...inner, ...message])]);
}

export function generateTOTP(
  secret: string,
  timestamp = Date.now(),
  period: 30 | 60 = 30,
  digits: 6 | 8 = 6,
  algorithm: 'SHA1'|'SHA256' = 'SHA1',
): string {
  const key = base32ToBytes(secret);
  if (!key.length) return '------';
  const counter = BigInt(Math.floor(timestamp / 1000 / period));
  const counterBytes = new Array<number>(8);
  let remaining = counter;
  for (let i = 7; i >= 0; i--) {
    counterBytes[i] = Number(remaining & 0xffn);
    remaining >>= 8n;
  }
  const digest = hmac(key, counterBytes, algorithm);
  const offset = digest[digest.length - 1] & 0x0f;
  const binary = ((digest[offset] & 0x7f) << 24)
    | ((digest[offset + 1] & 0xff) << 16)
    | ((digest[offset + 2] & 0xff) << 8)
    | (digest[offset + 3] & 0xff);
  return String(binary % 10 ** digits).padStart(digits, '0');
}

export function getSecondsRemaining(timestamp = Date.now(), period = 30): number {
  return period - (Math.floor(timestamp / 1000) % period);
}

export function formatCode(code: string): string {
  return `${code.slice(0, Math.ceil(code.length / 2))} ${code.slice(Math.ceil(code.length / 2))}`;
}
