import { getProvider } from '../services/rpc.js';
import { TOKEN_REGISTRY, ERC20, getProsPrice, getTokenPrice } from '../utils/constants.js';
import { callContract } from '../services/rpc.js';
import { getDeFiPositions } from '../tools/defiPositions.js';
import { formatUnits } from 'ethers';

interface PortfolioScoreBreakdown {
  diversification: number;   // 0-100
  risk: number;              // 0-100 (lower = safer)
  activity: number;          // 0-100
  defiParticipation: number; // 0-100
  overall: number;           // 0-100
}

interface PortfolioScoreResult {
  address: string;
  scores: PortfolioScoreBreakdown;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  strengths: string[];
  weaknesses: string[];
  defiPositionsCount: number;
}

export async function scorePortfolio(address: string): Promise<PortfolioScoreResult> {
  const provider = getProvider();
  const [nativeBal, ...tokenData] = await Promise.all([
    provider.getBalance(address),
    ...Object.entries(TOKEN_REGISTRY).map(async ([addr, meta]) => {
      const raw = await callContract(addr, ERC20.balanceOf(address));
      const bal = raw && raw !== '0x' ? BigInt(raw) : 0n;
      return { symbol: meta.symbol, balance: bal, decimals: meta.decimals, protocol: meta.protocol };
    }),
  ]);

  const nativeValue = parseFloat(formatUnits(nativeBal, 18));
  const tokenBalances = tokenData.filter((t: { balance: bigint }) => t.balance > 0n);
  const defiPositions = await getDeFiPositions(address);

  // Diversification: number of asset types held
  const assetCount = (nativeValue > 0 ? 1 : 0) + tokenBalances.length;
  const diversification = Math.min(100, assetCount * 25);

  // Risk: concentration check
  const totalValue = nativeValue + tokenBalances.reduce((s: number, t: { balance: bigint; decimals: number }) => s + parseFloat(formatUnits(t.balance, t.decimals)), 0);
  let riskScore = 0;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (totalValue === 0) {
    riskScore = 100;
    weaknesses.push('Empty wallet — no assets');
  } else {
    if (nativeValue > 0 && nativeValue / totalValue > 0.8) {
      riskScore += 30;
      weaknesses.push('Overconcentrated in native PROS');
    } else {
      strengths.push('Good diversification across asset types');
    }

    if (tokenBalances.some((t: { protocol: string }) => t.protocol === 'Stablecoin')) {
      strengths.push('Stablecoin holdings reduce volatility');
    }

    if (nativeValue < 0.1) {
      riskScore += 20;
      weaknesses.push('Low PROS balance — may not cover gas');
    }
  }

  const risk = Math.min(100, riskScore);

  // Activity score (estimated from token count + native)
  const activity = Math.min(100, assetCount * 20);

  // DeFi participation (based on active positions)
  const defiPosCount = defiPositions.length;
  let defiParticipation = 0;
  if (defiPosCount === 0) {
    defiParticipation = 0;
  } else if (defiPosCount === 1) {
    defiParticipation = 40;
  } else if (defiPosCount === 2) {
    defiParticipation = 70;
  } else {
    defiParticipation = 100;
  }
  if (defiPositions.length > 0) strengths.push(`Active in ${defiPositions.length} DeFi position(s)`);

  // Overall composite
  const overall = Math.max(0, Math.min(100,
    Math.round((diversification * 0.25 + (100 - risk) * 0.35 + activity * 0.2 + defiParticipation * 0.2))
  ));

  const grade: 'A' | 'B' | 'C' | 'D' | 'F' =
    overall >= 80 ? 'A' : overall >= 60 ? 'B' : overall >= 40 ? 'C' : overall >= 20 ? 'D' : 'F';

  return {
    address,
    scores: { diversification, risk, activity, defiParticipation, overall },
    grade,
    strengths: strengths.length > 0 ? strengths : ['Start building your portfolio'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['None identified'],
    defiPositionsCount: defiPositions.length,
  };
}

export interface PortfolioScoreFlat {
  address: string;
  diversification: number;
  risk: number;
  activity: number;
  defiParticipation: number;
  overall: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  strengths: string[];
  weaknesses: string[];
}

export async function calculatePortfolioScore(
  address: string,
  balances: Array<{ symbol: string; balance: bigint; decimals: number; protocol?: string }>
): Promise<PortfolioScoreFlat> {
  const prosPrice = await getProsPrice();

  const valued: { symbol: string; value: number; protocol: string; isNative: boolean }[] = [];
  for (const b of balances) {
    const formatted = parseFloat(formatUnits(b.balance, b.decimals));
    let price: number;
    if (b.symbol === 'PROS' || b.symbol === 'WPROS') {
      price = prosPrice;
    } else {
      const tp = await getTokenPrice(b.symbol);
      price = tp ?? 0;
    }
    valued.push({
      symbol: b.symbol,
      value: formatted * price,
      protocol: b.protocol ?? 'Token',
      isNative: b.symbol === 'PROS',
    });
  }

  const totalValue = valued.reduce((s, v) => s + v.value, 0);
  const assetCount = valued.length;
  const diversification = Math.min(100, assetCount * 25);

  let riskScore = 0;
  const strengths: string[] = [];
  const weaknesses: string[] = [];

  if (totalValue === 0) {
    riskScore = 100;
    weaknesses.push('Empty wallet — no assets');
  } else {
    riskScore = 5;
    const native = valued.find(v => v.isNative);
    if (native && native.value / totalValue > 0.8) {
      riskScore += 30;
      weaknesses.push('Overconcentrated in native PROS');
    } else {
      strengths.push('Good diversification across asset types');
    }

    if (valued.some(v => v.protocol === 'Stablecoin')) {
      strengths.push('Stablecoin holdings reduce volatility');
    }

    const nativeVal = native ? parseFloat(formatUnits(BigInt(native.value === 0 ? 0 : 0), 18)) : 0;
    if (native && native.value < 0.1) {
      riskScore += 20;
      weaknesses.push('Low PROS balance — may not cover gas');
    }
  }

  const risk = Math.min(100, riskScore);
  const activity = Math.min(100, assetCount * 20);
  const defiTokens = valued.filter(v => v.protocol !== 'Stablecoin' && v.protocol !== 'Bridge');
  const defiParticipation = Math.min(100, defiTokens.length * 33);
  if (defiTokens.length > 0) strengths.push('Active in DeFi protocols');

  const overall = Math.max(0, Math.min(100,
    Math.round((diversification * 0.25 + (100 - risk) * 0.35 + activity * 0.2 + defiParticipation * 0.2))
  ));

  const grade: 'A' | 'B' | 'C' | 'D' | 'F' =
    overall >= 80 ? 'A' : overall >= 60 ? 'B' : overall >= 40 ? 'C' : overall >= 20 ? 'D' : 'F';

  return {
    address,
    diversification,
    risk,
    activity,
    defiParticipation,
    overall,
    grade,
    strengths: strengths.length > 0 ? strengths : ['Start building your portfolio'],
    weaknesses: weaknesses.length > 0 ? weaknesses : ['None identified'],
  };
}
