# Pharos Ecosystem Asset Tracker

A skill-based asset tracker for the [Pharos Network](https://pharos.xyz) (Pacific Mainnet, chain 1672) — the RealFi Layer 1 for real-world asset tokenization.

Track native PROS, ERC-20 tokens, NFTs, DeFi positions, and get AI-powered portfolio insights — all from a single CLI command.

## Features

| Module | Description |
|--------|-------------|
| `walletBalance` | Native PROS balance + USD value |
| `tokenAssets` | ERC-20 token holdings (USDC, WPROS, LINK, WETH, + auto-discover) |
| `nftAssets` | NFT collection balance |
| `defiPositions` | DeFi protocol positions (lending, LP, vaults) |
| `txHistory` | Recent transaction summary |
| `ecosystemStats` | Pharos network health stats |
| `whaleDetection` | Detect large transfers >$10K, classify whale wallets |
| `suspiciousActivity` | Wash trading detection, honeypot risk, high-frequency flags |
| `portfolioScore` | 4-dimension portfolio score (diversification/risk/activity/DeFi) |
| `ecosystemRank` | Rank wallets by PROS + USDC value, percentile position |
| `portfolioSummary` | AI-generated portfolio overview |
| `walletInsights` | AI wallet behavior analysis |
| `riskEngine` | AI portfolio risk scoring |
| `investmentInsights` | AI buy/sell/hold/diversify recommendations |
| `daoScore` | Governance participation score — vote/delegation tracking |
| `realfiExposure` | RealFi exposure % (stablecoin, RWA) with risk classification |

## Quick Start

```bash
git clone https://github.com/wyka0/pharos-ecosystem-asset-tracker
cd pharos-ecosystem-asset-tracker
npm install
```

Run demo (all 16 modules):

```bash
npm run demo -- 0x3e5fdbcbdeaeb5faffaba18332f39bc751af415d
```

Track any wallet:

```bash
npm run wallet -- --address 0x...
```

## Example Agent Queries

```
Analyze this wallet 0x7a0c09d89052eb39a942a1320673a946f4a2dfce
Detect risky assets in my portfolio
Show whale activity on Pharos in the last 1000 blocks
Calculate DAO participation score for this wallet
Check RealFi exposure for 0x3e5fdbcbdeaeb5faffaba18332f39bc751af415d
Summarize Pharos portfolio for 0x7a0c09d89052eb39a942a1320673a946f4a2dfce
Score and rank my portfolio in the Pharos ecosystem
What are the investment insights for this address?
Scan for suspicious activity — wash trading or honeypot risks
```

Each query maps to one or more modules above. The AI engines (portfolioSummary, walletInsights, riskEngine, investmentInsights) synthesize multi-tool results into natural-language answers.

## Architecture

```
                    ┌─────────────────────┐
                    │     User / CLI       │
                    └──────────┬──────────┘
                               │
              ┌────────────────▼────────────────┐
              │       Agent (Skills Runtime)      │
              └────────────────┬─────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
  ┌─────▼──────┐    ┌─────────▼─────────┐    ┌───────▼──────┐
  │   Tools    │    │     Services       │    │    AI Engines │
  │ walletBal. │    │  rpc.ts (ethers)    │    │ portfolioSum │
  │ tokenAsset │    │  pharosApi.ts       │    │ walletInsight│
  │ nftAssets  │    │  alchemy.ts (opt.)  │    │ riskEngine   │
  │ defiPos    │    │  covalent.ts (opt.) │    └──────────────┘
  │ txHistory  │    └─────────────────────┘
  │ ecoStats   │
  └────────────┘
```

**Data flow:** Tools → Services (RPC calls) → Raw on-chain data → AI engines (portfolioSummary, walletInsights, riskEngine, investmentInsights, daoScore, whaleDetection, suspiciousActivity, realfiExposure) → Formatted output.

## Pharos Token Registry

| Token | Address | |
|-------|---------|-|
| PROS (native) | — | Gas token |
| USDC | `0xc879c018db60520f4355c26ed1a6d572cdac1815` | Circle-deployed |
| WPROS | `0x52c48d4213107b20bc583832b0d951fb9ca8f0b0` | Wrapped native |
| LINK | `0x51e2A24742Db77604B881d6781Ee16B5b8fcBE29` | Chainlink |
| WETH | `0x1f4b7011Ee3d53969bb67F59428a9ec0477856E9` | Wrapped ETH |

## Development

```bash
npm run build     # Compile TypeScript
npm run dev       # Watch mode
npm run check     # Type-check without emitting
```

## License

MIT
