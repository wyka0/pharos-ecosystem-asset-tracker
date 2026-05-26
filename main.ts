import chalk from 'chalk';
import { walletBalance } from './skills/pharos-tracker/tools/walletBalance.js';
import { getTokenBalances } from './skills/pharos-tracker/tools/tokenAssets.js';
import { getEcosystemStats } from './skills/pharos-tracker/tools/ecosystemStats.js';
import { summarize } from './skills/pharos-tracker/ai/portfolioSummary.js';
import { detectWhales, analyzeWhale, classifyWhale } from './skills/pharos-tracker/ai/whaleDetection.js';
import { scanSuspiciousActivity } from './skills/pharos-tracker/ai/suspiciousActivity.js';
import { scorePortfolio } from './skills/pharos-tracker/ai/portfolioScore.js';
import { rankWalletInEcosystem } from './skills/pharos-tracker/ai/ecosystemRank.js';
import { generateInvestmentInsights } from './skills/pharos-tracker/ai/investmentInsights.js';
import { calculateDAOScore } from './skills/pharos-tracker/ai/daoScore.js';
import { calculateRealFiExposure } from './skills/pharos-tracker/ai/realfiExposure.js';

const DIVIDER = chalk.dim('─'.repeat(58));
const DIVIDER_THICK = chalk.cyan('═'.repeat(58));

function header(title: string): void {
  console.log(`\n${DIVIDER_THICK}`);
  console.log(chalk.bold.cyan(`  ${title}`));
  console.log(`${DIVIDER_THICK}`);
}

function section(label: string, content: string): void {
  const icon: Record<string, string> = {
    'PROS': '🪙', 'Tokens': '🪪', 'Network': '🌐', 'Whales': '🐋',
    'Security': '🛡️', 'Score': '📊', 'Rank': '🏆', 'Insights': '💡',
    'DAO': '🗳️', 'RealFi': '🏦', 'Summary': '📋',
  };
  const emoji = icon[label] || '•';
  console.log(`\n  ${emoji} ${chalk.bold.white(label)}`);
  for (const line of content.split('\n')) {
    console.log(`    ${line}`);
  }
}

function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  return fn().catch(() => fallback);
}

const argAddr = process.argv.find(a => a.startsWith('0x'));
const addr = argAddr || '0x7a0c09d89052eb39a942a1320673a946f4a2dfce';
const addr2 = '0x3e5fdbcbdeaeb5faffaba18332f39bc751af415d';

async function main() {
  console.clear();
  console.log(`\n${chalk.bold.cyan('  ╔══════════════════════════════════════════════════════╗')}`);
  console.log(`${chalk.bold.cyan('  ║')}  ${chalk.bold.white('PHAROS ECOSYSTEM ASSET TRACKER')}              ${chalk.bold.cyan('║')}`);
  console.log(`${chalk.bold.cyan('  ║')}  ${chalk.dim('Pacific Mainnet • Chain 1672')}                     ${chalk.bold.cyan('║')}`);
  console.log(`${chalk.bold.cyan('  ╚══════════════════════════════════════════════════════╝')}`);
  console.log(chalk.dim(`  Wallet: ${addr}`));

  // 1. Native PROS Balance
  header('NATIVE BALANCE');
  const native = await walletBalance(addr);
  section('PROS', `${chalk.yellow(native.formatted)}  ${chalk.green(`$${native.usdValue.toFixed(2)}`)}`);

  // 2. Token Holdings
  header('TOKEN HOLDINGS');
  const tokens = await safe(() => getTokenBalances(addr, false), []);
  if (tokens.length === 0) {
    section('Tokens', chalk.dim('No known tokens found'));
  } else {
    for (const t of tokens) {
      const proto = t.protocol === 'Stablecoin' ? chalk.green(t.protocol) : chalk.blue(t.protocol);
      section('Tokens', `${chalk.cyan(t.symbol.padEnd(8))} ${chalk.white(t.formatted.padStart(18))}  ${proto}`);
    }
  }

  // 3. Network Stats
  header('NETWORK HEALTH');
  const stats = await safe(() => getEcosystemStats(), null);
  if (stats) {
    section('Network', [
      `${chalk.white('Block')}        ${chalk.yellow(stats.blockNumber.toLocaleString('en-US'))}`,
      `${chalk.white('Gas Price')}    ${chalk.magenta(stats.gasPrice)}`,
      `${chalk.white('TPS')}          ${chalk.cyan(`~${stats.tps}`)}`,
    ].join('\n'));
  }

  // 4. Whale Detection
  header('WHALE DETECTION');
  if (stats) {
    const whales = await safe(() => detectWhales(stats.blockNumber - 1000, stats.blockNumber, 500), []);
    section('Whales', whales.length > 0
      ? `${chalk.yellow(whales.length.toString())} large transfers (>$500) in last 1k blocks\n` +
        `  Top: ${chalk.cyan(whales[0].symbol)} ${chalk.white(whales[0].formatted)} → ${chalk.dim(whales[0].to.slice(0, 10))}...`
      : chalk.dim('No whale activity detected'));
  }

  const profile = await safe(() => analyzeWhale(addr2), null);
  if (profile) {
    section('Whales', `Wallet ${chalk.dim(addr2.slice(0, 10))}... → ${chalk.bold(classifyWhale(profile.totalIncomingUSD))} (score: ${chalk.yellow(profile.activityScore.toString())})`);
  }

  // 5. Security Scan
  header('SECURITY SCAN');
  const sec = await safe(() => scanSuspiciousActivity(addr), null);
  if (sec) {
    const riskColor = sec.overallRisk === 'low' ? chalk.green : sec.overallRisk === 'medium' ? chalk.yellow : chalk.red;
    section('Security', `${riskColor.bold(sec.overallRisk.toUpperCase())} risk • ${sec.flags.length} flags • ${sec.summary}`);
  }

  // 6. Portfolio Score
  header('PORTFOLIO SCORE');
  const ps = await safe(() => scorePortfolio(addr), null);
  if (ps) {
    const gradeColor: Record<string, chalk.Chalk> = { A: chalk.green, B: chalk.cyan, C: chalk.yellow, D: chalk.red, F: chalk.redBright };
    const gc = gradeColor[ps.grade] || chalk.white;
    section('Score', `${gc.bold(`Grade ${ps.grade}  (${ps.scores.overall}/100)`)}`);
    section('Score', [
      `Diversification  ${bar(ps.scores.diversification)}  ${ps.scores.diversification}/100`,
      `Risk             ${bar(100 - ps.scores.risk)}  ${ps.scores.risk}/100`,
      `Activity         ${bar(ps.scores.activity)}  ${ps.scores.activity}/100`,
      `DeFi             ${bar(ps.scores.defiParticipation)}  ${ps.scores.defiParticipation}/100`,
    ].join('\n'));
    if (ps.strengths.length) section('Score', `✓ ${chalk.green(ps.strengths[0])}`);
    if (ps.weaknesses.length) section('Score', `! ${chalk.red(ps.weaknesses[0])}`);
  }

  // 7. Ecosystem Ranking
  header('ECOSYSTEM RANKING');
  const ranking = await safe(() => rankWalletInEcosystem([addr, addr2, '0x28bec90849acd0cdfbd9a6db1b3def2c57ee0f2d', '0xe40ea47f1b774be491a69d843cc1a25f43a10911'], addr), null);
  if (ranking) {
    section('Rank', `#${chalk.yellow(ranking.currentRank?.toString() || '?')} of ${chalk.white(ranking.totalScanned.toString())} wallets (top ${chalk.cyan(`${ranking.topPercentile}%`)})`);
    for (const w of ranking.wallets.slice(0, 4)) {
      const mark = w.rank === ranking.currentRank ? chalk.green('◄ You') : '';
      section('Rank', `${chalk.dim(`#${w.rank}`.padEnd(4))} ${chalk.white(w.totalPROS.toFixed(2).padStart(10))} PROS  ${'●'.repeat(w.tokenCount)}${chalk.dim(` ${w.tokenCount} tokens`)}  ${mark}`);
    }
  }

  // 8. AI Investment Insights
  header('AI INVESTMENT INSIGHTS');
  const insights = await safe(() => generateInvestmentInsights(addr), null);
  if (insights && insights.insights.length > 0) {
    for (const i of insights.insights) {
      const confColor = i.confidence === 'high' ? chalk.green : i.confidence === 'medium' ? chalk.yellow : chalk.dim;
      const typeIcon: Record<string, string> = { buy: '📈', sell: '📉', hold: '⏸️', diversify: '🔄', defi_opportunity: '⚡', risk_warning: '⚠️' };
      section('Insights', `${typeIcon[i.type] || '•'} ${confColor(`[${i.confidence}]`)} ${chalk.bold(i.title)}`);
      section('Insights', `  ${i.description}`);
    }
  }

  // 9. DAO Score
  header('DAO PARTICIPATION');
  const dao = await safe(() => calculateDAOScore(addr), null);
  if (dao) {
    const daoGrade = dao.grade === 'A' || dao.grade === 'B' ? chalk.green : dao.grade === 'C' ? chalk.yellow : chalk.red;
    section('DAO', `${daoGrade.bold(`Grade ${dao.grade}  (${dao.score}/100)`)}  •  ${dao.totalActivities} activities  •  ${dao.governanceTokensHeld.length} governance tokens`);
    if (dao.suggestions.length) section('DAO', `💡 ${chalk.dim(dao.suggestions[0])}`);
  }

  // 10. RealFi Exposure
  header('RealFi EXPOSURE');
  const realfi = await safe(() => calculateRealFiExposure(addr), null);
  if (realfi) {
    const riskStyle = realfi.riskLevel === 'conservative' ? chalk.green : realfi.riskLevel === 'moderate' ? chalk.yellow : chalk.red;
    section('RealFi', `${realfi.summary}`);
    section('RealFi', `Risk Profile: ${riskStyle.bold(realfi.riskLevel.toUpperCase())}`);
    section('RealFi', `💡 ${chalk.dim(realfi.recommendation)}`);
  }

  // 11. AI Portfolio Summary
  header('PORTFOLIO SUMMARY');
  const summary = await safe(() => summarize(addr), 'Summary unavailable');
  for (const line of summary.split('\n')) {
    console.log(`  ${line}`);
  }

  // Footer
  console.log(`\n${DIVIDER_THICK}`);
  console.log(chalk.dim(`  Tracked at block ${stats?.blockNumber?.toLocaleString('en-US') || '?'} • ${new Date().toLocaleTimeString()}`));
  console.log(`${DIVIDER_THICK}\n`);
}

function bar(score: number, w: number = 15): string {
  const filled = Math.round((score / 100) * w);
  const color = score >= 60 ? chalk.green : score >= 30 ? chalk.yellow : chalk.red;
  return color('█'.repeat(filled) + chalk.dim('░'.repeat(Math.max(0, w - filled))));
}

main().catch(err => {
  console.error(chalk.red(`\n  Fatal: ${err.message || err}`));
  process.exit(1);
});
