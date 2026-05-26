import { ethers } from 'ethers';
import { getProvider, callContract } from '../services/rpc.js';
import { ERC20, TOKEN_REGISTRY } from '../utils/constants.js';
import { formatUnits } from '../utils/format.js';

interface TokenBalance {
  address: string;
  symbol: string;
  name: string;
  decimals: number;
  balance: bigint;
  formatted: string;
  protocol: string;
}

export async function getNativeBalance(address: string): Promise<{
  balance: bigint;
  formatted: string;
  usdValue: number;
}> {
  const provider = getProvider();
  const balance = await provider.getBalance(address);
  const formatted = formatUnits(balance, 18);
  const usdValue = parseFloat(formatted) * 0.614;
  return { balance, formatted, usdValue };
}

export async function getTokenBalances(
  address: string,
  discover: boolean = false
): Promise<TokenBalance[]> {
  const results: TokenBalance[] = [];

  for (const [tokenAddr, meta] of Object.entries(TOKEN_REGISTRY)) {
    const data = ERC20.balanceOf(address);
    const raw = await callContract(tokenAddr, data);

    if (raw && raw !== '0x') {
      const balance = BigInt(raw);
      if (balance > 0n) {
        results.push({
          address: tokenAddr,
          symbol: meta.symbol,
          name: meta.name,
          decimals: meta.decimals,
          balance,
          formatted: formatUnits(balance, meta.decimals),
          protocol: meta.protocol,
        });
      }
    }
  }

  if (discover) {
    const discovered = await discoverTokens(address);
    results.push(...discovered);
  }

  return results;
}

async function discoverTokens(address: string): Promise<TokenBalance[]> {
  const provider = getProvider();
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = currentBlock - 1000;

  const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const paddedAddr = `0x000000000000000000000000${address.replace('0x', '').toLowerCase()}`;

  const filter: ethers.Filter = {
    fromBlock,
    toBlock: currentBlock,
    topics: [transferTopic, null, null, paddedAddr],
  };

  const logs = await provider.getLogs(filter);
  const seen = new Set<string>();
  const discovered: TokenBalance[] = [];

  for (const log of logs) {
    const tokenAddr = log.address.toLowerCase();
    if (TOKEN_REGISTRY[tokenAddr] || seen.has(tokenAddr)) continue;
    seen.add(tokenAddr);

    try {
      const nameRaw = await callContract(tokenAddr, ERC20.name);
      const symRaw = await callContract(tokenAddr, ERC20.symbol);
      const decRaw = await callContract(tokenAddr, ERC20.decimals);
      const balRaw = await callContract(tokenAddr, ERC20.balanceOf(address));

      if (!balRaw || balRaw === '0x') continue;

      const balance = BigInt(balRaw);
      if (balance === 0n) continue;

      const decimals = decRaw ? Number(BigInt(decRaw)) : 18;

      discovered.push({
        address: tokenAddr,
        symbol: symRaw ? decodeString(symRaw) : '?',
        name: nameRaw ? decodeString(nameRaw) : 'Unknown',
        decimals,
        balance,
        formatted: formatUnits(balance, decimals),
        protocol: 'Discovered',
      });
    } catch {
      // Token doesn't support standard ERC-20 interface
    }
  }

  return discovered;
}

function decodeString(hex: string): string {
  try {
    const raw = hex.slice(2);
    const offset = Number(BigInt('0x' + raw.slice(0, 64))) * 2;
    const len = Number(BigInt('0x' + raw.slice(64, 128))) * 2;
    const strHex = raw.slice(offset + 64, offset + 64 + len);
    return Buffer.from(strHex, 'hex').toString('utf-8');
  } catch {
    return '';
  }
}
