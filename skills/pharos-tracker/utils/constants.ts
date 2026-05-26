export const PHAROS = {
  chainId: 1672,
  chainIdHex: '0x688',
  name: 'Pharos Pacific Mainnet',
  rpcUrl: process.env.PHAROS_RPC_URL || 'https://rpc.pharos.xyz',
  explorerUrl: 'https://pharosscan.xyz',
  nativeCurrency: {
    name: 'PROS',
    symbol: 'PROS',
    decimals: 18,
  },
} as const;

export const PHAROSSCAN_API_URL =
  'https://api.socialscan.io/pharos-mainnet/v1/explorer/command_api/contract';

export const PROS_USD_PRICE = 0.614; // approximate, update as needed

export const TOKEN_USD_PRICES: Record<string, number> = {
  USDC: 1,
  WETH: 1800,
  LINK: 14,
};

// Verified token registry (from official Pharos docs)
export const TOKEN_REGISTRY: Record<string, { symbol: string; name: string; decimals: number; protocol: string }> = {
  '0xc879c018db60520f4355c26ed1a6d572cdac1815': {
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    protocol: 'Stablecoin',
  },
  '0x52c48d4213107b20bc583832b0d951fb9ca8f0b0': {
    symbol: 'WPROS',
    name: 'Wrapped PROS',
    decimals: 18,
    protocol: 'Wrapped Native',
  },
  '0x51e2a24742db77604b881d6781ee16b5b8fcbe29': {
    symbol: 'LINK',
    name: 'ChainLink Token',
    decimals: 18,
    protocol: 'Oracle',
  },
  '0x1f4b7011ee3d53969bb67f59428a9ec0477856e9': {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    decimals: 18,
    protocol: 'Bridge',
  },
};

export const KNOWN_TOKEN_ADDRESSES = Object.keys(TOKEN_REGISTRY);

// ERC-20 function selectors
export const ERC20 = {
  balanceOf: (addr: string) =>
    `0x70a08231${addr.replace('0x', '').toLowerCase().padStart(64, '0')}`,
  name: '0x06fdde03',
  symbol: '0x95d89b41',
  decimals: '0x313ce567',
  totalSupply: '0x18160ddd',
} as const;

// Transfer event topic
export const TRANSFER_EVENT_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
