import { getProvider, getLogsBatched, getLogs } from '../services/rpc.js';
import { TRANSFER_EVENT_TOPIC, TOKEN_REGISTRY, ERC20 } from '../utils/constants.js';

const WHALE_THRESHOLD_USD = 10000;

interface WhaleTransfer {
  token: string;
  symbol: string;
  from: string;
  to: string;
  value: bigint;
  formatted: string;
  usdEstimate: number;
  txHash: string;
  blockNumber: number;
}

interface WhaleProfile {
  address: string;
  label: string;
  totalIncomingUSD: number;
  totalOutgoingUSD: number;
  topTokens: { symbol: string; volume: number }[];
  recentTransfers: WhaleTransfer[];
  activityScore: number;
}

export async function detectWhales(
  fromBlock: number,
  toBlock: number,
  minUsd: number = WHALE_THRESHOLD_USD
): Promise<WhaleTransfer[]> {
  const provider = getProvider();
  const whales: WhaleTransfer[] = [];

  for (const [addr, meta] of Object.entries(TOKEN_REGISTRY)) {
    const logs = await getLogs(fromBlock, toBlock, addr, [
      TRANSFER_EVENT_TOPIC,
    ]);

    for (const log of logs) {
      const value = BigInt(log.data!);
      const formatted = Number(value) / 10 ** meta.decimals;

      if (formatted >= minUsd) {
        whales.push({
          token: addr,
          symbol: meta.symbol,
          from: `0x${log.topics![1].slice(26)}`,
          to: `0x${log.topics![2].slice(26)}`,
          value,
          formatted: formatted.toFixed(4),
          usdEstimate: meta.symbol === 'USDC' ? formatted : 0,
          txHash: log.transactionHash!,
          blockNumber: log.blockNumber!,
        });
      }
    }
  }

  return whales;
}

export async function analyzeWhale(address: string): Promise<WhaleProfile> {
  const blocksToScan = 10000;
  const provider = getProvider();
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = currentBlock - blocksToScan;

  const incoming: WhaleTransfer[] = [];
  const outgoing: WhaleTransfer[] = [];
  const tokenVolume: Record<string, number> = {};

  for (const [addr, meta] of Object.entries(TOKEN_REGISTRY)) {
    const logs = await getLogsBatched(fromBlock, currentBlock, addr, [
      TRANSFER_EVENT_TOPIC,
    ]);

    for (const log of logs) {
      const from = `0x${log.topics![1].slice(26)}`;
      const to = `0x${log.topics![2].slice(26)}`;
      const value = BigInt(log.data!);
      const formatted = Number(value) / 10 ** meta.decimals;
      const usdEstimate = meta.symbol === 'USDC' ? formatted : formatted * 0.614;

      const transfer: WhaleTransfer = {
        token: addr,
        symbol: meta.symbol,
        from,
        to,
        value,
        formatted: formatted.toFixed(4),
        usdEstimate,
        txHash: log.transactionHash!,
        blockNumber: log.blockNumber!,
      };

      if (to.toLowerCase() === address.toLowerCase()) {
        incoming.push(transfer);
        tokenVolume[meta.symbol] = (tokenVolume[meta.symbol] || 0) + usdEstimate;
      }
      if (from.toLowerCase() === address.toLowerCase()) {
        outgoing.push(transfer);
      }
    }
  }

  const totalIncomingUSD = incoming.reduce((s, t) => s + t.usdEstimate, 0);
  const totalOutgoingUSD = outgoing.reduce((s, t) => s + t.usdEstimate, 0);

  const topTokens = Object.entries(tokenVolume)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([symbol, volume]) => ({ symbol, volume }));

  const activityScore = Math.min(100, Math.round((incoming.length + outgoing.length) * 2));

  return {
    address,
    label: totalIncomingUSD > 100000 ? 'Whale' : totalIncomingUSD > 10000 ? 'Dolphin' : 'Fish',
    totalIncomingUSD,
    totalOutgoingUSD,
    topTokens,
    recentTransfers: [...incoming.slice(0, 5), ...outgoing.slice(0, 5)].slice(0, 10),
    activityScore,
  };
}

export function classifyWhale(usdVolume: number): string {
  if (usdVolume > 1000000) return 'Mega Whale';
  if (usdVolume > 100000) return 'Whale';
  if (usdVolume > 10000) return 'Dolphin';
  if (usdVolume > 1000) return 'Fish';
  return 'Minnow';
}
