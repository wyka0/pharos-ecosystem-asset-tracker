export { walletBalance } from './tools/walletBalance.js';
export { getTokenBalances, getNativeBalance } from './tools/tokenAssets.js';
export { getNFTBalances } from './tools/nftAssets.js';
export { getDeFiPositions } from './tools/defiPositions.js';
export { getTxHistory } from './tools/txHistory.js';
export { getEcosystemStats } from './tools/ecosystemStats.js';

export { detectWhales, detectWhalesInBlockRange, analyzeWhale, classifyWhale } from './ai/whaleDetection.js';
export { scanSuspiciousActivity } from './ai/suspiciousActivity.js';
export { scorePortfolio } from './ai/portfolioScore.js';
export { rankWalletInEcosystem } from './ai/ecosystemRank.js';
export { generateInvestmentInsights } from './ai/investmentInsights.js';
export { calculateDAOScore } from './ai/daoScore.js';
export { calculateRealFiExposure } from './ai/realfiExposure.js';

export { summarize } from './ai/portfolioSummary.js';
export { analyzeWallet } from './ai/walletInsights.js';
export { assessRisk } from './ai/riskEngine.js';
