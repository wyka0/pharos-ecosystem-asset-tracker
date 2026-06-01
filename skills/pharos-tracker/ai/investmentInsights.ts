import { getProvider } from '../services/rpc.js';
import { TOKEN_REGISTRY, ERC20 } from '../utils/constants.js';
import { callContract } from '../services/rpc.js';
import { scorePortfolio } from './portfolioScore.js';
import { formatUnits } from 'ethers';

interface Insight {
  type: 'buy' | 'sell' | 'hold' | 'diversify' | 'defi_opportunity' | 'risk_warning';
  asset?: string;
  title: string;
  description: string;
  rationale: string;
  confidence: 'low' | 'medium' | 'high';
}

interface InvestmentInsightReport {
  address: string;
  timestamp: number;
  insights: Insight[];
  summary: string;
}

export async function generateInvestmentInsights(
  address: string
): Promise<InvestmentInsightReport> {
  const provider = getProvider();
  const portfolioScore = await scorePortfolio(address);
  const insights: Insight[] = [];

  const [nativeBal, ...tokenData] = await Promise.all([
    provider.getBalance(address),
    ...Object.entries(TOKEN_REGISTRY).map(async ([addr, meta]) => {
      const raw = await callContract(addr, ERC20.balanceOf(address));
      const bal = raw && raw !== '0x' ? BigInt(raw) : 0n;
      return { addr, symbol: meta.symbol, balance: parseFloat(formatUnits(bal, meta.decimals)), protocol: meta.protocol };
    }),
  ]);

  const nativePROS = parseFloat(formatUnits(nativeBal, 18));
  const usdcBal = tokenData.find((t: { symbol: string; balance: number }) => t.symbol === 'USDC')?.balance || 0;
  const linkBal = tokenData.find((t: { symbol: string; balance: number }) => t.symbol === 'LINK')?.balance || 0;
  const wethBal = tokenData.find((t: { symbol: string; balance: number }) => t.symbol === 'WETH')?.balance || 0;
  const wprosBal = tokenData.find((t: { symbol: string; balance: number }) => t.symbol === 'WPROS')?.balance || 0;

  // 1. PROS diversification signal
  if (nativePROS > 100 && nativePROS / (nativePROS + usdcBal + wethBal) > 0.7) {
    insights.push({
      type: 'diversify',
      title: 'Overconcentrated in PROS',
      description: `${nativePROS.toFixed(2)} PROS dominates your portfolio`,
      rationale: 'Consider converting some PROS to USDC or WETH to reduce volatility exposure',
      confidence: 'high',
    });
  }

  // 2. USDC opportunity
  if (usdcBal > 100) {
    insights.push({
      type: 'defi_opportunity',
      title: 'Idle USDC can earn yield',
      description: `${usdcBal.toFixed(2)} USDC sitting idle`,
      rationale: 'Deploy USDC into Pharos lending or DEX liquidity pools to earn passive yield',
      confidence: 'high',
    });
  }

  // 3. Gas reserve check
  if (nativePROS < 0.5) {
    insights.push({
      type: 'risk_warning',
      title: 'Low PROS for gas',
      description: `Only ${nativePROS.toFixed(4)} PROS available`,
      rationale: 'PROS is needed for transaction fees; consider acquiring at least 1 PROS for active trading',
      confidence: 'medium',
    });
  }

  // 4. WETH/LINK opportunities
  if (wethBal >= 0.1) {
    insights.push({
      type: 'defi_opportunity',
      asset: 'WETH',
      title: 'WETH can be deployed',
      description: `${wethBal.toFixed(4)} WETH available`,
      rationale: 'Supply WETH to lending or provide as LP on Pharos DEX for yield',
      confidence: 'medium',
    });
  }

  if (linkBal >= 1) {
    insights.push({
      type: 'hold',
      asset: 'LINK',
      title: 'LINK with staking potential',
      description: `${linkBal.toFixed(2)} LINK held`,
      rationale: 'LINK can be staked on Pharos for additional yield through Chainlink staking',
      confidence: 'medium',
    });
  }

  // 5. Portfolio grade-based advice
  if (portfolioScore.grade === 'D' || portfolioScore.grade === 'F') {
    insights.push({
      type: 'risk_warning',
      title: 'Portfolio needs attention',
      description: `Portfolio grade: ${portfolioScore.grade}`,
      rationale: 'High risk concentration or inactivity detected. Review strengths/weaknesses above.',
      confidence: 'high',
    });
  }

  // Default insight if nothing specific
  if (insights.length === 0) {
    insights.push({
      type: 'hold',
      title: 'Portfolio looks balanced',
      description: 'No major changes recommended',
      rationale: 'Your portfolio shows healthy diversification with adequate gas reserves',
      confidence: 'medium',
    });
  }

  const summary = insights.length <= 1
    ? insights[0]?.title || 'No actionable insights'
    : `${insights.length} insights: ${insights.slice(0, 3).map(i => i.title).join(', ')}`;

  return {
    address,
    timestamp: Date.now(),
    insights,
    summary,
  };
}
