import { getProvider } from '../services/rpc.js';
import { TOKEN_REGISTRY, ERC20 } from '../utils/constants.js';
import { callContract } from '../services/rpc.js';

interface EcosystemRankEntry {
  address: string;
  totalPROS: number;
  tokenCount: number;
  hasDeFi: boolean;
  estimatedValueScore: number;
  rank?: number;
}

interface EcosystemRankingResult {
  wallets: EcosystemRankEntry[];
  currentRank: number | null;
  totalScanned: number;
  topPercentile: number;
}

export async function rankWalletInEcosystem(
  wallets: string[],
  targetAddress: string
): Promise<EcosystemRankingResult> {
  const provider = getProvider();
  const entries: EcosystemRankEntry[] = [];

  for (const addr of wallets) {
    const [nativeBal, ...tokenBals] = await Promise.all([
      provider.getBalance(addr),
      ...Object.entries(TOKEN_REGISTRY).map(async ([tokenAddr, meta]) => {
        try {
          const raw = await callContract(tokenAddr, ERC20.balanceOf(addr));
          return raw && raw !== '0x' ? { symbol: meta.symbol, val: Number(BigInt(raw)) / 10 ** meta.decimals } : { symbol: meta.symbol, val: 0 };
        } catch {
          return { symbol: meta.symbol, val: 0 };
        }
      }),
    ]);

    const nativePROS = Number(nativeBal) / 1e18;
    const nonZeroTokens = tokenBals.filter(t => t.val > 0);
    const usdcHolding = tokenBals.find(t => t.symbol === 'USDC')?.val || 0;
    const hasDeFi = nonZeroTokens.some(t => t.symbol !== 'USDC');

    const valueScore = Math.round(nativePROS * 100 + usdcHolding * 60);

    entries.push({
      address: addr,
      totalPROS: Math.round(nativePROS * 10000) / 10000,
      tokenCount: nonZeroTokens.length,
      hasDeFi,
      estimatedValueScore: valueScore,
    });
  }

  entries.sort((a, b) => b.estimatedValueScore - a.estimatedValueScore);
  entries.forEach((e, i) => { e.rank = i + 1; });

  const currentEntry = entries.find(e => e.address.toLowerCase() === targetAddress.toLowerCase());
  const currentRank = currentEntry?.rank ?? null;

  return {
    wallets: entries,
    currentRank,
    totalScanned: wallets.length,
    topPercentile: currentRank ? Math.round((1 - currentRank / wallets.length) * 100) : 0,
  };
}
