# API Flow

## RPC Endpoint

**Primary:** `https://rpc.pharos.xyz` (chain 1672)

No authentication required. Rate limits are generous (tested up to ~50 req/s).

## eth_call Format

All ERC-20 queries use `eth_call` with ABI-encoded function selectors:

### balanceOf

```
Request:
{
  "jsonrpc": "2.0",
  "method": "eth_call",
  "params": [{
    "to": "0xc879c018db60520f4355c26ed1a6d572cdac1815",
    "data": "0x70a08231" + "000000000000000000000000" + <wallet_address_without_0x>
  }, "latest"],
  "id": 1
}

Response:
"0x0000000000000000000000000000000000000000000000000000000000000000"
```

### token name / symbol / decimals

```
name:     "0x06fdde03"
symbol:   "0x95d89b41"
decimals: "0x313ce567"
```

## eth_getLogs Format

Used for token discovery and NFT detection.

**Restrictions:**
- Maximum block range: 1,000 blocks
- Maximum topics: 4

```
Request:
{
  "jsonrpc": "2.0",
  "method": "eth_getLogs",
  "params": [{
    "fromBlock": "0x7f1d00",
    "toBlock": "0x7f2021",
    "address": "0xc879c018db60520f4355c26ed1a6d572cdac1815",
    "topics": ["0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"]
  }],
  "id": 1
}
```

## Pharosscan API (Socialscan)

**Endpoint:** `https://api.socialscan.io/pharos-mainnet/v1/explorer/command_api/contract`

Only `contract/getabi` is confirmed working; other modules return parameter errors.

```
GET ?module=contract&action=getabi&address=0xc879c018db60520f4355c26ed1a6d572cdac1815

Response:
{ "status": "0", "message": "Contract source code not verified" }
```

## Error Handling

| Error | Cause | Handling |
|-------|-------|----------|
| `PARAM_VERIFY_ERROR: invalid to length` | Address is not 40 hex chars | Validate before sending |
| `param error; block range too large` | eth_getLogs range > 1000 | Chunk requests |
| RPC timeout | Network congestion | Retry with exponential backoff |
| `0x` result | balanceOf for empty/non-ERC-20 | Treat as zero balance |
