import { getProvider, getLogsBatched } from '../services/rpc.js';

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

interface TxSummary {
  hash: string;
  from: string;
  to: string;
  value: string;
  blockNumber: number;
  timestamp?: Date;
}

export async function getTxHistory(
  address: string,
  limit: number = 10
): Promise<TxSummary[]> {
  const provider = getProvider();
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = currentBlock - 10000;
  const padded = `0x000000000000000000000000${address.replace('0x', '').toLowerCase()}`;

  // Get incoming + outgoing Transfer logs
  const [inLogs, outLogs] = await Promise.all([
    getLogsBatched(fromBlock, currentBlock, undefined, [TRANSFER_TOPIC, null, null, padded]),
    getLogsBatched(fromBlock, currentBlock, undefined, [TRANSFER_TOPIC, padded, null, null]),
  ]);

  // Deduplicate by tx hash
  const seen = new Set<string>();
  const results: TxSummary[] = [];

  for (const log of [...inLogs, ...outLogs]) {
    if (!log.transactionHash || seen.has(log.transactionHash)) continue;
    seen.add(log.transactionHash);
    const from = `0x${log.topics![1].slice(26)}`;
    const to = `0x${log.topics![2].slice(26)}`;

    results.push({
      hash: log.transactionHash,
      from,
      to,
      value: (Number(BigInt(log.data || '0x0')) / 1e18).toFixed(6),
      blockNumber: log.blockNumber!,
    });

    if (results.length >= limit) break;
  }

  return results;
}
