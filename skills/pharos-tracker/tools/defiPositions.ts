import { getProvider, callContract } from '../services/rpc.js';

interface DeFiPosition {
  protocol: string;
  type: 'lending' | 'liquidity' | 'vault' | 'staking';
  asset: string;
  balance: bigint;
  formatted: string;
}

// Known Pharos protocol addresses (from faroo-xyz/faroo-contracts, docs.aquaflux.pro/developers/contracts.md)
const PROTOCOLS = [
  {
    name: 'Faroo Liquid Staking',
    type: 'staking' as const,
    address: '0x6b0a44c64190279f7034b77c13a566e914fe5ec4',
    asset: 'stPROS',
    decimals: 18,
  },
  {
    name: 'Faroo Yield Vault 001',
    type: 'vault' as const,
    address: '0x36F3d19DDA7ED1428E3014Ae6f2A75D70393B7e6',
    asset: 'PROS',
    decimals: 18,
  },
  {
    name: 'AquaFlux pALPHA Pool (AqToken)',
    type: 'lending' as const,
    address: '0xe150a72352a189dce0d671c08f721b458104a2af',
    asset: 'AqALPHA',
    decimals: 18,
  },
  {
    name: 'AquaFlux pALPHA P-Token',
    type: 'vault' as const,
    address: '0x34fd642fa9fdc6ce4013d4f3cde575c6dac904f9',
    asset: 'P-ALPHA',
    decimals: 18,
  },
  {
    name: 'AquaFlux pALPHA S-Token',
    type: 'staking' as const,
    address: '0xBf5761dc90A87976300D3DDCe40B9cBa66b66041',
    asset: 'S-ALPHA',
    decimals: 18,
  },
];

export async function getDeFiPositions(address: string): Promise<DeFiPosition[]> {
  const results: DeFiPosition[] = [];

  for (const protocol of PROTOCOLS) {
    try {
      const code = await getProvider().getCode(protocol.address);
      if (code === '0x') continue; // Not deployed on mainnet

      const data = `0x70a08231${address.replace('0x', '').toLowerCase().padStart(64, '0')}`;
      const raw = await callContract(protocol.address, data);

      if (raw && raw !== '0x') {
        const balance = BigInt(raw);
        if (balance > 0n) {
          results.push({
            protocol: protocol.name,
            type: protocol.type,
            asset: protocol.asset,
            balance,
            formatted: `${(Number(balance) / 10 ** protocol.decimals).toFixed(4)}`,
          });
        }
      }
    } catch {
      // Contract not reachable or not standard
    }
  }

  return results;
}
