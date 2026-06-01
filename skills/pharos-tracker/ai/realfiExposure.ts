import { getProvider } from '../services/rpc.js';
import { TOKEN_REGISTRY, ERC20, getProsPrice, getTokenPrice } from '../utils/constants.js';
import { callContract } from '../services/rpc.js';
import { formatUnits } from 'ethers';

interface RealFiExposureBreakdown {
  stablecoins: { symbol: string; balance: number; valueUSD: number }[];
  realWorldAssets: { symbol: string; balance: number; protocol: string; category: string }[];
  totalValueUSD: number;
  exposurePercent: number;
}

interface RealFiExposureResult {
  address: string;
  breakdown: RealFiExposureBreakdown;
  summary: string;
  riskLevel: 'conservative' | 'moderate' | 'aggressive';
  recommendation: string;
}

const REALFI_PROTOCOLS = ['RealFi', 'Stablecoin', 'Bridge'];

const REALFI_CATEGORIES: Record<string, string> = {
  USDC: 'Stablecoin (fiat-backed)',
};

export async function calculateRealFiExposure(
  address: string
): Promise<RealFiExposureResult> {
  const provider = getProvider();

  const [nativeBal, ...tokenData] = await Promise.all([
    provider.getBalance(address),
    ...Object.entries(TOKEN_REGISTRY).map(async ([addr, meta]) => {
      const raw = await callContract(addr, ERC20.balanceOf(address));
      const bal = raw && raw !== '0x' ? BigInt(raw) : 0n;
      return { addr, symbol: meta.symbol, balance: parseFloat(formatUnits(bal, meta.decimals)), protocol: meta.protocol };
    }),
  ]);

  const nativePROS = parseFloat(formatUnits(nativeBal, 18));
  const stablecoins: { symbol: string; balance: number; valueUSD: number }[] = [];
  const realWorldAssets: { symbol: string; balance: number; protocol: string; category: string }[] = [];

  const prosPrice = await getProsPrice();
  let totalRealFiUSD = 0;
  let totalPortfolioUSD = nativePROS * prosPrice;

  for (const token of tokenData) {
    if (token.balance <= 0) continue;

    if (token.symbol === 'USDC') {
      stablecoins.push({ symbol: 'USDC', balance: token.balance, valueUSD: token.balance });
      totalRealFiUSD += token.balance;
    }

    const category = REALFI_CATEGORIES[token.symbol] || 'Other Token';
    const tokenLivePrice = await getTokenPrice(token.symbol);
    const tokenUSD = token.symbol === 'USDC'
      ? token.balance
      : tokenLivePrice !== null
        ? token.balance * tokenLivePrice
        : token.balance * prosPrice;
    totalPortfolioUSD += tokenUSD;

    if (token.symbol === 'USDC') {
      realWorldAssets.push({
        symbol: token.symbol,
        balance: token.balance,
        protocol: token.protocol,
        category,
      });
    }
  }

  // Native PROS is not RealFi — it's the chain's native gas token
  const exposurePercent = totalPortfolioUSD > 0
    ? Math.round((totalRealFiUSD / totalPortfolioUSD) * 100)
    : 0;

  let riskLevel: 'conservative' | 'moderate' | 'aggressive';
  if (exposurePercent > 50) riskLevel = 'conservative';
  else if (exposurePercent > 20) riskLevel = 'moderate';
  else riskLevel = 'aggressive';

  let recommendation: string;
  if (riskLevel === 'conservative') {
    recommendation = 'Heavy RealFi exposure — good for stability, consider diversifying into native PROS for gas and appreciation potential';
  } else if (riskLevel === 'moderate') {
    recommendation = 'Balanced RealFi/native mix — consider increasing stablecoin allocation if seeking lower volatility';
  } else {
    recommendation = 'Low RealFi exposure (mostly PROS) — consider adding USDC or other stable assets for downside protection';
  }

  // Summary
  let summary: string;
  if (totalPortfolioUSD === 0) {
    summary = 'Empty wallet — no RealFi exposure';
  } else {
    const parts: string[] = [];
    if (stablecoins.length > 0) parts.push(`${stablecoins.map(s => `${s.balance.toFixed(2)} ${s.symbol}`).join(', ')}`);
    if (realWorldAssets.length > 0) parts.push(`${realWorldAssets.length} RealFi asset(s)`);
    summary = `${exposurePercent}% RealFi exposure — ${parts.join(' | ') || 'none'}`;
  }

  return {
    address,
    breakdown: { stablecoins, realWorldAssets, totalValueUSD: Math.round(totalRealFiUSD * 100) / 100, exposurePercent },
    summary,
    riskLevel,
    recommendation,
  };
}
