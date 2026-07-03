import { ethers, formatUnits } from 'ethers';
import { PHAROS } from '../utils/constants.js';

const RETRIES = 3;
const TIMEOUT_MS = 15000;

const provider = new ethers.JsonRpcProvider(PHAROS.rpcUrl, undefined, {
  staticNetwork: true,
});

(provider as any)._start?.();

export function getProvider(): ethers.JsonRpcProvider {
  return provider;
}

export async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < RETRIES; i++) {
    try {
      const result = await Promise.race([
        fn(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('RPC timeout')), TIMEOUT_MS)
        ),
      ]);
      return result;
    } catch (err) {
      lastError = err;
      if (i < RETRIES - 1) {
        await new Promise(r => setTimeout(r, 500 * (i + 1)));
      }
    }
  }
  throw lastError;
}

export async function getBlockNumber(): Promise<number> {
  return withRetry(() => provider.getBlockNumber());
}

export async function getGasPrice(): Promise<bigint> {
  return withRetry(() => provider.getFeeData().then(f => f.gasPrice ?? 0n));
}

export async function getBalance(address: string): Promise<bigint> {
  return withRetry(() => provider.getBalance(address));
}

export async function getTransactionCount(address: string): Promise<number> {
  return withRetry(() => provider.getTransactionCount(address));
}

export async function getCode(address: string): Promise<string> {
  return withRetry(() => provider.getCode(address));
}

export async function callContract(
  to: string,
  data: string
): Promise<string | null> {
  try {
    return await withRetry(() => provider.call({ to, data }));
  } catch {
    return null;
  }
}

export async function getLogs(
  fromBlock: number,
  toBlock: number | string,
  address?: string,
  topics?: (string | null)[]
): Promise<ethers.Log[]> {
  const filter: ethers.Filter = {
    fromBlock,
    toBlock,
    ...(address && { address }),
    ...(topics && { topics }),
  };
  return withRetry(() => provider.getLogs(filter));
}

const BLOCK_RANGE_LIMIT = 999;

export async function getLogsBatched(
  fromBlock: number,
  toBlock: number,
  address?: string,
  topics?: (string | null)[]
): Promise<ethers.Log[]> {
  const allLogs: ethers.Log[] = [];
  let current = fromBlock;

  while (current <= toBlock) {
    const end = Math.min(current + BLOCK_RANGE_LIMIT - 1, toBlock);
    try {
      const chunk = await getLogs(current, end, address, topics);
      allLogs.push(...chunk);
    } catch (err) {
      console.warn(`[RPC] getLogsBatched chunk ${current}-${end} failed: ${(err as Error).message}`);
      break;
    }
    current = end + 1;
  }

  return allLogs;
}

export async function safeBalance(address: string): Promise<number> {
  try {
    const bal = await getBalance(address);
    return parseFloat(formatUnits(bal, 18));
  } catch {
    return 0;
  }
}

export async function safeContractCall(
  to: string,
  data: string
): Promise<string | null> {
  try {
    return await callContract(to, data);
  } catch {
    return null;
  }
}
