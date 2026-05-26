import { getProvider, callContract, getLogsBatched } from '../services/rpc.js';
import { TRANSFER_EVENT_TOPIC } from '../utils/constants.js';

interface WalletInsight {
  totalIncoming: number;
  totalOutgoing: number;
  topCounterparties: { address: string; count: number }[];
  contractInteractions: number;
  firstActivity?: Date;
  lastActivity?: Date;
}

export async function analyzeWallet(address: string): Promise<WalletInsight> {
  const provider = getProvider();
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = currentBlock - 100000;

  // Get incoming transfers
  const paddedAddr = `0x000000000000000000000000${address.replace('0x', '').toLowerCase()}`;
  const incomingLogs = await getLogsBatched(fromBlock, currentBlock, undefined, [
    TRANSFER_EVENT_TOPIC,
    null,
    null,
    paddedAddr,
  ]);

  // Get outgoing transfers
  const outgoingLogs = await getLogsBatched(fromBlock, currentBlock, undefined, [
    TRANSFER_EVENT_TOPIC,
    paddedAddr,
    null,
    null,
  ]);

  // Top counterparties
  const counterPartyMap = new Map<string, number>();
  for (const log of incomingLogs) {
    const from = `0x${log.topics![1].slice(26)}`;
    counterPartyMap.set(from, (counterPartyMap.get(from) || 0) + 1);
  }

  const topCounterparties = [...counterPartyMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([address, count]) => ({ address, count }));

  // Contract interactions
  const contractCalls = outgoingLogs.filter(l => l.topics![1].toLowerCase().includes(address.toLowerCase())).length;

  return {
    totalIncoming: incomingLogs.length,
    totalOutgoing: outgoingLogs.length,
    topCounterparties,
    contractInteractions: contractCalls,
  };
}
