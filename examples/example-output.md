```bash
$ npm run wallet -- --address 0x7a0c09d89052eb39a942a1320673a946f4a2dfce

=============================================
  PHAROS WALLET BALANCE
  PROS: 1.730582 PROS
  USD:  $1.06
=============================================
```

```bash
$ npm run portfolio -- --address 0x7a0c09d89052eb39a942a1320673a946f4a2dfce --discover

=============================================
  PHAROS ECOSYSTEM ASSET TRACKER
  Chain: Pharos Pacific Mainnet (1672)
=============================================

  [PROS] Native Gas Token
  Balance: 1.730582 PROS
  Value: ~$1.06 USD @ $0.614

  [KNOWN TOKENS]
  ==================================================
  [ ] USDC          Stablecoin                        0
  [ ] WPROS         Wrapped Native                    0
  [ ] LINK          Oracle                            0
  [ ] WETH          Bridge                            0

  [TOKEN DISCOVERY]
  ==================================================
  Scanning last 10000 blocks for incoming transfers...
  No additional tokens detected

  [PORTFOLIO SUMMARY]
  ==================================================
  Total assets tracked: 1
  Estimated value: ~$1.06 USD
  Active protocols: None

=============================================
  RPC: https://rpc.pharos.xyz
  Explorer: https://pharosscan.xyz/address/0x7a0c09d89052eb39a942a1320673a946f4a2dfce
=============================================
```

```bash
$ npm run ecosystem-stats

=============================================
  PHAROS NETWORK STATS
  Block:      8,331,263
  Gas Price:  10 Gwei
  TPS:        ~9
  Validators: 31
=============================================
```
