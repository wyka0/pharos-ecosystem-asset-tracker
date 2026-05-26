# Pharos Ecosystem Asset Tracker

A skill-based asset tracker for the [Pharos Network](https://pharos.xyz) (Pacific Mainnet, chain 1672) — the RealFi Layer 1 for real-world asset tokenization.

Track native PROS, ERC-20 tokens, NFTs, DeFi positions, and get AI-powered portfolio insights — all from a single CLI command. Each module is designed as an agent-callable skill/tool, making it composable for AI agent runtimes.

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

**Installation**
```bash
git clone https://github.com/wyka0/pharos-ecosystem-asset-tracker
cd pharos-ecosystem-asset-tracker
npm install
```

**Run Demo**
```bash
npm run demo -- 0xWalletAddress
```

## Example Agent Queries

```
Analyze this wallet
Generate a portfolio summary
Detect whale activity
Scan wallet security risks
Analyze DAO participation
Check RealFi exposure
Show ecosystem ranking
Generate AI investment insights
Score this portfolio
Analyze DeFi activity
```

## Repository Structure

```
├── main.ts                    # Demo entry point (all 16 modules)
├── demo.ps1                   # PowerShell demo launcher
├── package.json               # Dependencies and scripts
├── tsconfig.json              # TypeScript config
├── LICENSE                    # MIT license
├── README.md
│
└── skills/pharos-tracker/     # Composable skill directory
    ├── SKILL.md               # Skill capabilities and triggers
    ├── AGENT.md               # Agent behavior instructions
    ├── index.ts               # Module exports
    ├── manifest.json          # Skill metadata
    ├── ai/                    # AI engines (4 modules)
    ├── tools/                 # On-chain tools (12 modules)
    ├── services/              # RPC and API service layer
    ├── prompts/               # Agent prompt templates
    └── utils/                 # Constants, formatters, helpers
```

## Architecture

```
                    ┌─────────────────────┐
                    │     User / CLI       │
                    └──────────┬──────────┘
                               │
              ┌────────────────▼────────────────┐
              │    Agent Runtime (opencode)      │
              └────────────────┬─────────────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        │                      │                      │
  ┌─────▼──────────────────┐  ┌───────▼───────────┐  ┌───────▼───────────┐
  │ On-chain Tools (12)    │  │ Services          │  │ AI Engines (4)    │
  │ walletBalance          │  │ rpc.ts (ethers)   │  │ portfolioSummary  │
  │ tokenAssets            │  │ pharosApi.ts      │  │ walletInsights    │
  │ nftAssets              │  │ alchemy.ts (opt.) │  │ riskEngine        │
  │ defiPositions          │  │ covalent.ts (opt.)│  │ investmentInsights│
  │ txHistory              │  └───────────────────┘  └──────────────────┘
  │ ecosystemStats         │
  │ whaleDetection         │
  │ suspiciousActivity     │
  │ portfolioScore         │
  │ ecosystemRank          │
  │ daoScore               │
  │ realfiExposure         │
  └────────────────────────┘
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
