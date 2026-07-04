import { getProvider, getLogsBatched } from '../services/rpc.js';
import { TOKEN_REGISTRY } from '../utils/constants.js';
import { formatUnits } from 'ethers';

const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Native (PROS) transfers have no event log, so we must walk blocks with
// getBlockWithTransactions(). Iterating the full 10k-block window this way
// would be thousands of RPC round-trips, so we scan a practical recent
// window for native value transfers. Tune as needed.
const NATIVE_SCAN_BLOCKS = 100;

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

  // Get incoming + outgoing ERC-20 Transfer logs
  // ERC-20 Transfer(address,address,uint256) has 3 indexed topics: [sig, from, to]
  const [inLogs, outLogs] = await Promise.all([
    getLogsBatched(fromBlock, currentBlock, undefined, [TRANSFER_TOPIC, null, padded]),
    getLogsBatched(fromBlock, currentBlock, undefined, [TRANSFER_TOPIC, padded, null]),
  ]);

  // Deduplicate by tx hash
  const seen = new Set<string>();
  const results: TxSummary[] = [];

  // Cache block timestamps so we only fetch each block once
  const blockTimestampCache = new Map<number, Date>();
  async function getBlockTimestamp(blockNumber: number): Promise<Date | undefined> {
    if (blockTimestampCache.has(blockNumber)) return blockTimestampCache.get(blockNumber);
    const block = await provider.getBlock(blockNumber);
    const ts = block?.timestamp ? new Date(block.timestamp * 1000) : undefined;
    if (ts) blockTimestampCache.set(blockNumber, ts);
    return ts;
  }

  // ERC-20 transfers (from event logs)
  for (const log of [...inLogs, ...outLogs]) {
    if (!log.transactionHash || seen.has(log.transactionHash)) continue;
    seen.add(log.transactionHash);
    const from = `0x${log.topics![1].slice(26)}`;
    const to = `0x${log.topics![2].slice(26)}`;

    // Look up correct decimals from the token registry; default to 18
    const tokenMeta = TOKEN_REGISTRY[log.address.toLowerCase()];
    const decimals = tokenMeta?.decimals ?? 18;
    const raw = BigInt(log.data || '0x0');
    const value = formatUnits(raw, decimals);

    const timestamp = await getBlockTimestamp(log.blockNumber!);

    results.push({
      hash: log.transactionHash,
      from,
      to,
      value,
      blockNumber: log.blockNumber!,
      timestamp,
    });

    if (results.length >= limit) break;
  }

  // Native PROS transfers — no event log, so walk recent blocks tx-by-tx
  const addrLower = address.toLowerCase();
  const nativeFromBlock = Math.max(0, currentBlock - NATIVE_SCAN_BLOCKS);

  for (let blockNum = currentBlock; blockNum >= nativeFromBlock && results.length < limit; blockNum--) {
    // ethers v6: getBlock(tag, includeTransactions) — true returns tx objects
    const block = await provider.getBlock(blockNum, true);
    if (!block || !block.transactions) continue;

    // When includeTransactions=true, transactions are TransactionResponse objects
    // (ethers v6 types this version as string[]; cast accordingly)
    const txs = block.transactions as unknown as Array<{ from: string; to: string; value: bigint; hash: string }>;
    for (const tx of txs) {
      const txFrom = (tx.from || '').toLowerCase();
      const txTo = (tx.to || '').toLowerCase();
      const txValue = BigInt(tx.value ?? 0n);

      if ((txFrom === addrLower || txTo === addrLower) && txValue > 0n) {
        if (seen.has(tx.hash)) continue;
        seen.add(tx.hash);

        const timestamp = await getBlockTimestamp(blockNum);

        results.push({
          hash: tx.hash,
          from: tx.from,
          to: tx.to,
          value: formatUnits(txValue, 18),
          blockNumber: blockNum,
          timestamp,
        });

        if (results.length >= limit) break;
      }
    }
  }

  return results;
}
