import chalk from 'chalk';
import { walletBalance } from './skills/pharos-tracker/tools/walletBalance.js';
import { getTokenBalances } from './skills/pharos-tracker/tools/tokenAssets.js';
import { getEcosystemStats } from './skills/pharos-tracker/tools/ecosystemStats.js';
import { summarize } from './skills/pharos-tracker/ai/portfolioSummary.js';
import { detectWhales } from './skills/pharos-tracker/ai/whaleDetection.js';
import { scanSuspiciousActivity } from './skills/pharos-tracker/ai/suspiciousActivity.js';
import { scorePortfolio } from './skills/pharos-tracker/ai/portfolioScore.js';
import { rankWalletInEcosystem } from './skills/pharos-tracker/ai/ecosystemRank.js';
import { generateInvestmentInsights } from './skills/pharos-tracker/ai/investmentInsights.js';
import { calculateDAOScore } from './skills/pharos-tracker/ai/daoScore.js';
import { calculateRealFiExposure } from './skills/pharos-tracker/ai/realfiExposure.js';

const DIVIDER = chalk.dim('\u2500'.repeat(58));
const DIVIDER_THICK = chalk.cyan('\u2550'.repeat(58));

function header(title: string): void {
  console.log(`\n${DIVIDER_THICK}`);
  console.log(chalk.bold.cyan(`  ${title}`));
  console.log(`${DIVIDER_THICK}`);
}

function section(label: string, content: string): void {
  const icon: Record<string, string> = {
    'PROS': '\u{1FA99}', 'Tokens': '\u{1FAAA}', 'Network': '\u{1F310}', 'Whales': '\u{1F40B}',
    'Security': '\u{1F6E1}\uFE0F', 'Score': '\u{1F4CA}', 'Rank': '\u{1F3C6}', 'Insights': '\u{1F4A1}',
    'DAO': '\u{1F5F3}\uFE0F', 'RealFi': '\u{1F3E6}', 'Summary': '\u{1F4CB}',
  };
  const emoji = icon[label] || '\u2022';
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
const wallets = [addr, '0x3e5fdbcbdeaeb5faffaba18332f39bc751af415d', '0x28bec90849acd0cdfbd9a6db1b3def2c57ee0f2d', '0xe40ea47f1b774be491a69d843cc1a25f43a10911'];

async function main() {
  console.clear();
  console.log(`\n${chalk.bold.cyan('  \u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557')}`);
  console.log(`${chalk.bold.cyan('  \u2551')}  ${chalk.bold.white('PHAROS ECOSYSTEM ASSET TRACKER')}              ${chalk.bold.cyan('\u2551')}`);
  console.log(`${chalk.bold.cyan('  \u2551')}  ${chalk.dim('Pacific Mainnet \u2022 Chain 1672')}                     ${chalk.bold.cyan('\u2551')}`);
  console.log(`${chalk.bold.cyan('  \u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D')}`);
  console.log(chalk.dim(`  Wallet: ${addr}`));

  // Phase 1: Fetch all raw data in parallel
  header('NATIVE BALANCE');
  const [native, tokens, stats] = await Promise.all([
    walletBalance(addr),
    safe(() => getTokenBalances(addr, false), []),
    safe(() => getEcosystemStats(), null),
  ]);

  section('PROS', `${chalk.yellow(native.formatted)}  ${chalk.green(`$${native.usdValue.toFixed(2)}`)}`);

  header('TOKEN HOLDINGS');
  if (tokens.length === 0) {
    section('Tokens', chalk.dim('No known tokens found'));
  } else {
    for (const t of tokens) {
      const proto = t.protocol === 'Stablecoin' ? chalk.green(t.protocol) : chalk.blue(t.protocol);
      section('Tokens', `${chalk.cyan(t.symbol.padEnd(8))} ${chalk.white(t.formatted.padStart(18))}  ${proto}`);
    }
  }

  header('NETWORK HEALTH');
  if (stats) {
    section('Network', [
      `${chalk.white('Block')}        ${chalk.yellow(stats.blockNumber.toLocaleString('en-US'))}`,
      `${chalk.white('Gas Price')}    ${chalk.magenta(stats.gasPrice)}`,
      `${chalk.white('TPS')}          ${chalk.cyan(`~${stats.tps}`)}`,
    ].join('\n'));
  }

  // Phase 2: Run all analytics modules in parallel (they're independent)
  header('WHALE DETECTION');
  const [whales, sec, ps, ranking, insights, dao, realfi, summary] = await Promise.all([
    stats ? safe(() => detectWhales(stats.blockNumber - 1000, stats.blockNumber, 500), []) : Promise.resolve([]),
    safe(() => scanSuspiciousActivity(addr), null),
    safe(() => scorePortfolio(addr), null),
    safe(() => rankWalletInEcosystem(wallets, addr), null),
    safe(() => generateInvestmentInsights(addr), null),
    safe(() => calculateDAOScore(addr), null),
    safe(() => calculateRealFiExposure(addr), null),
    safe(() => summarize(addr), 'Summary unavailable'),
  ]);

  // Phase 3: Render all results
  if (whales.length > 0) {
    section('Whales', `${chalk.yellow(whales.length.toString())} large transfers (>$500) in last 1k blocks\n  Top: ${chalk.cyan(whales[0].symbol)} ${chalk.white(whales[0].formatted)} \u2192 ${chalk.dim(whales[0].to.slice(0, 10))}...`);
  } else {
    section('Whales', chalk.dim('No whale activity detected'));
  }

  header('SECURITY SCAN');
  if (sec) {
    const riskColor = sec.overallRisk === 'low' ? chalk.green : sec.overallRisk === 'medium' ? chalk.yellow : chalk.red;
    section('Security', `${riskColor.bold(sec.overallRisk.toUpperCase())} risk \u2022 ${sec.flags.length} flags \u2022 ${sec.summary}`);
  }

  header('PORTFOLIO SCORE');
  if (ps) {
    const gradeColor: Record<string, typeof chalk.green> = { A: chalk.green, B: chalk.cyan, C: chalk.yellow, D: chalk.red, F: chalk.redBright };
    const gc = gradeColor[ps.grade] || chalk.white;
    section('Score', `${gc.bold(`Grade ${ps.grade}  (${ps.scores.overall}/100)`)}`);
    section('Score', [
      `Diversification  ${bar(ps.scores.diversification)}  ${ps.scores.diversification}/100`,
      `Risk             ${bar(100 - ps.scores.risk)}  ${ps.scores.risk}/100`,
      `Activity         ${bar(ps.scores.activity)}  ${ps.scores.activity}/100`,
      `DeFi             ${bar(ps.scores.defiParticipation)}  ${ps.scores.defiParticipation}/100`,
    ].join('\n'));
    if (ps.strengths.length) section('Score', `\u2713 ${chalk.green(ps.strengths[0])}`);
    if (ps.weaknesses.length) section('Score', `! ${chalk.red(ps.weaknesses[0])}`);
  }

  header('ECOSYSTEM RANKING');
  if (ranking) {
    section('Rank', `#${chalk.yellow(ranking.currentRank?.toString() || '?')} of ${chalk.white(ranking.totalScanned.toString())} wallets (top ${chalk.cyan(`${ranking.topPercentile}%`)})`);
    for (const w of ranking.wallets.slice(0, 4)) {
      const mark = w.rank === ranking.currentRank ? chalk.green('\u25C0 You') : '';
      section('Rank', `${chalk.dim(`#${w.rank}`.padEnd(4))} ${chalk.white(w.totalPROS.toFixed(2).padStart(10))} PROS  ${'\u25CF'.repeat(w.tokenCount)}${chalk.dim(` ${w.tokenCount} tokens`)}  ${mark}`);
    }
  }

  header('AI INVESTMENT INSIGHTS');
  if (insights && insights.insights.length > 0) {
    for (const i of insights.insights) {
      const confColor = i.confidence === 'high' ? chalk.green : i.confidence === 'medium' ? chalk.yellow : chalk.dim;
      const typeIcon: Record<string, string> = { buy: '\u{1F4C8}', sell: '\u{1F4C9}', hold: '\u23F8\uFE0F', diversify: '\u{1F504}', defi_opportunity: '\u26A1', risk_warning: '\u26A0\uFE0F' };
      section('Insights', `${typeIcon[i.type] || '\u2022'} ${confColor(`[${i.confidence}]`)} ${chalk.bold(i.title)}`);
      section('Insights', `  ${i.description}`);
    }
  }

  header('DAO PARTICIPATION');
  if (dao) {
    const daoGrade = dao.grade === 'A' || dao.grade === 'B' ? chalk.green : dao.grade === 'C' ? chalk.yellow : chalk.red;
    section('DAO', `${daoGrade.bold(`Grade ${dao.grade}  (${dao.score}/100)`)}  \u2022  ${dao.totalActivities} activities  \u2022  ${dao.governanceTokensHeld.length} governance tokens`);
    if (dao.suggestions.length) section('DAO', `\u{1F4A1} ${chalk.dim(dao.suggestions[0])}`);
  }

  header('RealFi EXPOSURE');
  if (realfi) {
    const riskStyle = realfi.riskLevel === 'conservative' ? chalk.green : realfi.riskLevel === 'moderate' ? chalk.yellow : chalk.red;
    section('RealFi', `${realfi.summary}`);
    section('RealFi', `Risk Profile: ${riskStyle.bold(realfi.riskLevel.toUpperCase())}`);
    section('RealFi', `\u{1F4A1} ${chalk.dim(realfi.recommendation)}`);
  }

  header('PORTFOLIO SUMMARY');
  for (const line of summary.split('\n')) {
    console.log(`  ${line}`);
  }

  console.log(`\n${DIVIDER_THICK}`);
  console.log(chalk.dim(`  Tracked at block ${stats?.blockNumber?.toLocaleString('en-US') || '?'} \u2022 ${new Date().toLocaleTimeString()}`));
  console.log(`${DIVIDER_THICK}\n`);
}

function bar(score: number, w: number = 15): string {
  const filled = Math.round((score / 100) * w);
  const color = score >= 60 ? chalk.green : score >= 30 ? chalk.yellow : chalk.red;
  return color('\u2588'.repeat(filled) + chalk.dim('\u2591'.repeat(Math.max(0, w - filled))));
}

main().catch(err => {
  console.error(chalk.red(`\n  Fatal: ${err.message || err}`));
  process.exit(1);
});
