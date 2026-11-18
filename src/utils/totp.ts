export function generateTOTP(secret: string, timestamp = Date.now(), period = 30): string {
  const counter = Math.floor(timestamp / 1000 / period);
  let hash = 0;
  const combined = `${secret}:${counter}`;
  for (let i = 0; i < combined.length; i++) {
    hash = Math.imul(31, hash) + combined.charCodeAt(i) | 0;
  }
  return String(Math.abs(hash) % 1_000_000).padStart(6, '0');
}

export function getSecondsRemaining(timestamp = Date.now(), period = 30): number {
  return period - (Math.floor(timestamp / 1000) % period);
}

export function formatCode(code: string): string {
  return `${code.slice(0, 3)} ${code.slice(3)}`;
}
