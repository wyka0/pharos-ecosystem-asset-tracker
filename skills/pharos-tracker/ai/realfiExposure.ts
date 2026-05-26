import { getProvider } from '../services/rpc.js';
import { TOKEN_REGISTRY, ERC20 } from '../utils/constants.js';
import { callContract } from '../services/rpc.js';

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
  WPROS: 'Wrapped Native',
  LINK: 'Oracle Token',
  WETH: 'Wrapped Native (cross-chain)',
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
      return { addr, symbol: meta.symbol, balance: Number(bal) / 10 ** meta.decimals, protocol: meta.protocol };
    }),
  ]);

  const nativePROS = Number(nativeBal) / 1e18;
  const stablecoins: { symbol: string; balance: number; valueUSD: number }[] = [];
  const realWorldAssets: { symbol: string; balance: number; protocol: string; category: string }[] = [];

  let totalRealFiUSD = 0;
  let totalPortfolioUSD = nativePROS * 0.614; // PROS at ~$0.614

  for (const token of tokenData) {
    if (token.balance <= 0) continue;

    if (token.symbol === 'USDC') {
      stablecoins.push({ symbol: 'USDC', balance: token.balance, valueUSD: token.balance });
      totalRealFiUSD += token.balance;
    }

    const category = REALFI_CATEGORIES[token.symbol] || 'Other Token';
    const tokenUSD = token.symbol === 'USDC' ? token.balance : token.symbol === 'WETH' ? token.balance * 1800 : token.balance * 0.614;
    totalPortfolioUSD += tokenUSD;

    if (token.symbol === 'LINK') {
      stablecoins.push({ symbol: token.symbol, balance: token.balance, valueUSD: token.balance * 14 });
      totalRealFiUSD += token.balance * 14;
    }

    if (REALFI_PROTOCOLS.includes(token.protocol)) {
      if (!stablecoins.some(s => s.symbol === token.symbol)) {
        realWorldAssets.push({
          symbol: token.symbol,
          balance: token.balance,
          protocol: token.protocol,
          category,
        });
      }
    }
  }

  // Add WPROS as RealFi if held (wrapped variant)
  const wpros = tokenData.find(t => t.symbol === 'WPROS');
  if (wpros && wpros.balance > 0) {
    realWorldAssets.push({
      symbol: 'WPROS',
      balance: wpros.balance,
      protocol: 'Bridge',
      category: 'Wrapped Native (cross-chain)',
    });
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
