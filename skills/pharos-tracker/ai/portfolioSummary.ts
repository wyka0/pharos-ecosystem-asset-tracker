import { getProvider, callContract } from '../services/rpc.js';
import { TOKEN_REGISTRY, ERC20, PROS_USD_PRICE } from '../utils/constants.js';
import { formatUnits, formatUSD } from '../utils/format.js';

interface PortfolioEntry {
  type: 'native' | 'token';
  symbol: string;
  name: string;
  balance: string;
  usdValue: number;
  protocol?: string;
}

export async function summarize(address: string): Promise<string> {
  const provider = getProvider();
  const [nativeBal, ...tokenRaw] = await Promise.all([
    provider.getBalance(address),
    ...Object.entries(TOKEN_REGISTRY).map(async ([addr, meta]) => {
      const raw = await callContract(addr, ERC20.balanceOf(address));
      const bal = raw && raw !== '0x' ? BigInt(raw) : 0n;
      return { addr, meta, bal };
    }),
  ]);

  const entries: PortfolioEntry[] = [];

  // Native PROS
  const nativeFormatted = Number(nativeBal) / 1e18;
  entries.push({
    type: 'native',
    symbol: 'PROS',
    name: 'Native PROS',
    balance: nativeFormatted.toFixed(6),
    usdValue: nativeFormatted * PROS_USD_PRICE,
  });

  // Tokens
  for (const t of tokenRaw) {
    if (t.bal > 0n) {
      const formatted = formatUnits(t.bal, t.meta.decimals);
      entries.push({
        type: 'token',
        symbol: t.meta.symbol,
        name: t.meta.name,
        balance: formatted,
        usdValue: 0, // No price oracle available
        protocol: t.meta.protocol,
      });
    }
  }

  const totalValue = entries.reduce((sum, e) => sum + e.usdValue, 0);

  const lines: string[] = [
    'Portfolio Summary:',
    `  Total Value: ${formatUSD(totalValue)}`,
    `  PROS: ${entries.find(e => e.symbol === 'PROS')?.balance} (${formatUSD(nativeFormatted * PROS_USD_PRICE)})`,
  ];

  const tokens = entries.filter(e => e.type === 'token');
  if (tokens.length > 0) {
    lines.push(`  Tokens: ${tokens.length} found`);
    for (const t of tokens) {
      lines.push(`    ${t.symbol}: ${t.balance} [${t.protocol}]`);
    }
  } else {
    lines.push('  Tokens: none');
  }

  const protocols = [...new Set(tokens.map(t => t.protocol).filter(Boolean))];
  if (protocols.length > 0) {
    lines.push(`  Protocols: ${protocols.join(', ')}`);
  }

  return lines.join('\n');
}
