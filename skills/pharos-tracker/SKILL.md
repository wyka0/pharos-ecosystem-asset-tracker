# Pharos Ecosystem Asset Tracker — SKILL

A composable skill for tracking wallets, tokens, NFTs, DeFi positions, and ecosystem health on the Pharos Network (Pacific Mainnet, chain 1672).

## Triggers

- "check my Pharos wallet"
- "show my Pharos portfolio"
- "what tokens do I hold on Pharos"
- "analyze my Pharos risk"
- "Pharos network stats"
- "scan my Pharos address"
- "detect whales on Pharos"
- "suspicious activity check"
- "score my portfolio"
- "rank my wallet"
- "investment insights"
- "DAO participation score"
- "RealFi exposure"

## Capabilities

### Tools

| Tool | Input | Output |
|------|-------|--------|
| `walletBalance` | address | PROS balance + USD value |
| `tokenAssets` | address, discover? | ERC-20 token list with balances |
| `nftAssets` | address | NFT count + collection list |
| `defiPositions` | address | Staked/LP/lending positions |
| `txHistory` | address, limit? | Recent transactions summary |
| `ecosystemStats` | — | Pharos block height, TPS, gas price, tx count |
| `whaleDetection` | fromBlock, toBlock | Large transfers >$500, whale wallet profiles (Mega Whale → Minnow) |
| `suspiciousActivity` | address | Wash trading, honeypot risk, high-frequency flags (low/critical) |
| `portfolioScore` | address | 4-dimension score (diversification/risk/activity/DeFi), grade A-F |
| `ecosystemRank` | wallets[], target | Ranked wallet list by PROS + USDC value, percentile position |
| `daoScore` | address | Governance vote/delegation tracking, score 0-100, suggestions |
| `realfiExposure` | address | RealFi exposure % (stablecoin/RWA), risk profile (conservative/aggressive) |

### AI Actions

| Action | Description |
|--------|-------------|
| `portfolioSummary` | Natural-language portfolio breakdown |
| `walletInsights` | Spend patterns, top interactions, whale tags |
| `riskEngine` | Concentration risk, wash-trade flags, honeypot risk |
| `investmentInsights` | AI buy/sell/hold/diversify recommendations with confidence levels |

## Data Sources

1. **Pharos RPC** (`rpc.pharos.xyz`) — Primary, no API key needed
2. **Pharosscan** (`pharosscan.xyz`) — Explorer fallback (token metadata)
3. **Alchemy** (optional) — Multi-chain enrichment
4. **Covalent** (optional) — Historical token pricing

## Registry

See `utils/constants.ts` for the verified token registry (USDC, WPROS, LINK, WETH). Community tokens are discovered on-chain via `eth_getLogs` with 1,000-block sliding windows.
