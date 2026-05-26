export function decodeString(hex: string): string {
  if (!hex || hex === '0x') return '';
  try {
    const raw = hex.startsWith('0x') ? hex.slice(2) : hex;
    const offset = Number(BigInt('0x' + raw.slice(0, 64))) * 2;
    const len = Number(BigInt('0x' + raw.slice(64, 128))) * 2;
    const strHex = raw.slice(64 + offset, 64 + offset + len);
    return Buffer.from(strHex, 'hex').toString('utf-8').replace(/\0+$/, '');
  } catch {
    return '';
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err as Error;
      if (i < maxRetries - 1) await sleep(delay * (i + 1));
    }
  }
  throw lastError;
}

export function isValidPharosAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address);
}
