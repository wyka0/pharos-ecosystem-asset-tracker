import { getProvider } from '../services/rpc.js';

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
  const results: TxSummary[] = [];
  let scanned = 0;

  for (let i = currentBlock; i > 0 && results.length < limit && scanned < 1000; i--, scanned++) {
    try {
      const block = await provider.getBlock(i, true);
      if (!block?.transactions) continue;

      for (const tx of block.transactions) {
        const txObj = tx as any;
        if (
          txObj.from?.toLowerCase() === address.toLowerCase() ||
          txObj.to?.toLowerCase() === address.toLowerCase()
        ) {
          results.push({
            hash: txObj.hash!,
            from: txObj.from!,
            to: txObj.to ?? '0x0000000000000000000000000000000000000000',
            value: (Number(txObj.value) / 1e18).toFixed(6),
            blockNumber: block.number,
            timestamp: block.timestamp ? new Date(block.timestamp * 1000) : undefined,
          });

          if (results.length >= limit) break;
        }
      }
    } catch {
      continue;
    }
  }

  return results;
}
