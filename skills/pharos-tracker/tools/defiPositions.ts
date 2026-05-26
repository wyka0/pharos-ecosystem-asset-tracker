import { getProvider, callContract } from '../services/rpc.js';

interface DeFiPosition {
  protocol: string;
  type: 'lending' | 'liquidity' | 'vault' | 'staking';
  asset: string;
  balance: bigint;
  formatted: string;
}

// Known Pharos protocol addresses (from Pharos-Frontend repo)
const PROTOCOLS = [
  {
    name: 'PUSD Vault',
    type: 'vault' as const,
    address: '0x61edDE0E4B97D878C14F5f5706309d4572550Afa',
  },
  {
    name: 'sPUSD Staking',
    type: 'staking' as const,
    address: '0x5CB5cF00d90c1894E10921845a2A8C07E7d6FF97',
  },
  {
    name: 'LST Restaking',
    type: 'staking' as const,
    address: '0xBB6f0beF915a4baaF6818c11BFeb648041f70959',
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
            asset: 'PUSD',
            balance,
            formatted: `${(Number(balance) / 1e18).toFixed(4)}`,
          });
        }
      }
    } catch {
      // Contract not reachable or not standard
    }
  }

  return results;
}
