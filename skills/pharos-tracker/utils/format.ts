export function formatUnits(value: bigint, decimals: number, precision: number = 6): string {
  const divisor = 10n ** BigInt(decimals);
  const integer = value / divisor;
  const fraction = value % divisor;
  const fractionStr = fraction.toString().padStart(decimals, '0').slice(0, precision);
  return `${integer}.${fractionStr}`;
}

export function formatUSD(value: number): string {
  return `$${value.toFixed(2)}`;
}

export function shortenAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTimestamp(ts: number): string {
  return new Date(ts * 1000).toISOString().replace('T', ' ').slice(0, 19);
}

export function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}

export function bigIntMin(a: bigint, b: bigint): bigint {
  return a < b ? a : b;
}
