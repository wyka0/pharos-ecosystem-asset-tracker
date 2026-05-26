# Architecture

## Overview

The Pharos Ecosystem Asset Tracker is a modular, skill-based system designed to query on-chain data from the Pharos Network (chain 1672) and present it as structured, AI-enriched portfolio reports.

## Layers

### 1. Tools Layer (`tools/`)

Each tool encapsulates a single responsibility:

| Tool | Responsibility |
|------|---------------|
| `walletBalance.ts` | Native PROS balance (eth_getBalance) |
| `tokenAssets.ts` | ERC-20 token balances + on-chain discovery |
| `nftAssets.ts` | ERC-721 NFT detection via Transfer event scanning |
| `defiPositions.ts` | Protocol-specific balance queries (PUSD, LST, sPUSD) |
| `txHistory.ts` | Recent transaction lookup (reverse block scan) |
| `ecosystemStats.ts` | Network health (block number, gas price, TPS) |

### 2. Services Layer (`services/`)

Abstracts data source access:

- **`rpc.ts`** — Primary data source. Uses ethers.js JsonRpcProvider to call `rpc.pharos.xyz`. No API key required.
- **`pharosApi.ts`** — Pharosscan Blockscout API (ABI lookup, token metadata). Optional enhancement.
- **`alchemy.ts`** — Alchemy SDK integration for multi-chain enrichment. Requires API key.
- **`covalent.ts`** — Covalent API for historical balances and pricing. Requires API key.

### 3. AI Layer (`ai/`)

Transforms raw on-chain data into actionable insights:

- **`portfolioSummary.ts`** — Aggregates balances into a readable summary
- **`walletInsights.ts`** — Analyzes incoming/outgoing patterns, top counterparties
- **`riskEngine.ts`** — Evaluates concentration risk, honeypot flags, gas sufficiency

### 4. Utils Layer (`utils/`)

- **`constants.ts`** — Token registry, ERC-20 selectors, chain config
- **`format.ts`** — Number/address/timestamp formatting
- **`helpers.ts`** — Shared utilities (ABI decoding, chunking)

## Data Flow

```
User Request
    │
    ▼
CLI / Agent
    │
    ├──► walletBalance ──► rpc.ts ──► eth_getBalance ──► PROS balance
    │
    ├──► tokenAssets  ──► rpc.ts ──► eth_call (balanceOf) ──► ERC-20 balances
    │                       │
    │                       └──► eth_getLogs (Transfer events) ──► token discovery
    │
    ├──► nftAssets    ──► rpc.ts ──► eth_getLogs + supportsInterface ──► NFT list
    │
    ├──► defiPositions─► rpc.ts ──► eth_call (protocol balanceOf) ──► DeFi positions
    │
    ├──► txHistory    ──► rpc.ts ──► eth_getBlockByNumber (reverse scan) ──► tx list
    │
    └──► ecosystemStats─► rpc.ts ──► eth_blockNumber + eth_gasPrice ──► network stats
```

## RPC Call Cost

| Operation | RPC Calls | Typical Latency |
|-----------|-----------|-----------------|
| Native balance | 1 | ~200ms |
| Token balances (4 known) | 4 | ~800ms |
| Token discovery (1000 blocks) | 1-50 | ~2-5s |
| NFT scan (50000 blocks) | 1-100 | ~5-15s |
| Ecosystem stats | 3 | ~500ms |
