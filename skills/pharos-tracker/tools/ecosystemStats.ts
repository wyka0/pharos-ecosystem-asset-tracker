import { getProvider } from '../services/rpc.js';

interface EcosystemStats {
  blockNumber: number;
  gasPrice: string;
  tps: number;
  totalTransactions: number;
  validatorCount: number;
}

export async function getEcosystemStats(): Promise<EcosystemStats> {
  const provider = getProvider();
  const [blockNumber, feeData, block] = await Promise.all([
    provider.getBlockNumber(),
    provider.getFeeData(),
    provider.getBlock('latest'),
  ]);

  const gasPrice = feeData.gasPrice
    ? `${(Number(feeData.gasPrice) / 1e9).toFixed(0)} Gwei`
    : '10 Gwei';

  // Estimate TPS from last block
  const txCount = block?.transactions.length ?? 0;
  const tps = Math.round(txCount / 0.8); // ~800ms block time

  return {
    blockNumber,
    gasPrice,
    tps,
    totalTransactions: blockNumber * txCount, // approximate
    validatorCount: 31, // from explorer
  };
}
