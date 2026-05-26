import { getProvider } from '../services/rpc.js';
import { TOKEN_REGISTRY, ERC20 } from '../utils/constants.js';
import { callContract } from '../services/rpc.js';

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

  const nativeValue = Number(nativeBal) / 1e18;
  const tokenBalances = tokenData.filter(t => t.balance > 0n);

  // Diversification: number of asset types held
  const assetCount = (nativeValue > 0 ? 1 : 0) + tokenBalances.length;
  const diversification = Math.min(100, assetCount * 25);

  // Risk: concentration check
  const totalValue = nativeValue + tokenBalances.reduce((s, t) => s + Number(t.balance) / 10 ** t.decimals, 0);
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

    if (tokenBalances.some(t => t.protocol === 'Stablecoin')) {
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

  // DeFi participation
  const defiTokens = tokenBalances.filter(t => t.protocol !== 'Stablecoin' && t.protocol !== 'Bridge');
  const defiParticipation = Math.min(100, defiTokens.length * 33);
  if (defiTokens.length > 0) strengths.push('Active in DeFi protocols');

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
  };
}
