import { ethers, formatUnits } from 'ethers';
import { getProvider, callContract, getLogsBatched } from '../services/rpc.js';
import { ERC20, TOKEN_REGISTRY, getProsPrice } from '../utils/constants.js';
import { formatUnits as localFormatUnits } from '../utils/format.js';

const MULTICALL3_ADDRESS = "0xcA11bde05977b3631167028862bE2a173976CA11";
const MULTICALL3_ABI = [
  "function aggregate(tuple(address target, bytes callData)[] calls) external view returns (uint256 blockNumber, bytes[] returnData)"
];

async function batchTokenBalances(tokenAddresses: string[], wallet: string, provider: any) {
  const multicall = new ethers.Contract(MULTICALL3_ADDRESS, MULTICALL3_ABI, provider);
  const erc20Interface = new ethers.Interface([
    "function balanceOf(address) view returns (uint256)"
  ]);
  const calls = tokenAddresses.map(addr => ({
    target: addr,
    callData: erc20Interface.encodeFunctionData("balanceOf", [wallet])
  }));
  const result: any = await (multicall as any).aggregate.staticCall(calls);
  const returnData: string[] = result.returnData;
  return tokenAddresses.map((addr, i) => {
    const balance = erc20Interface.decodeFunctionResult("balanceOf", returnData[i])[0];
    return { address: addr, balance };
  });
}

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
  const prosPrice = await getProsPrice();
  const usdValue = parseFloat(formatted) * prosPrice;
  return { balance, formatted, usdValue };
}

export async function getTokenBalances(
  address: string,
  discover: boolean = false
): Promise<TokenBalance[]> {
  const results: TokenBalance[] = [];
  const provider = getProvider();
  const tokenAddrs = Object.keys(TOKEN_REGISTRY);

  let batched: Array<{ address: string; balance: bigint }> = [];
  try {
    batched = await batchTokenBalances(tokenAddrs, address, provider);
  } catch (err) {
    console.warn(`[TokenAssets] Multicall3 batch failed, falling back to sequential: ${(err as Error).message}`);
    for (const tokenAddr of tokenAddrs) {
      const raw = await callContract(tokenAddr, ERC20.balanceOf(address));
      batched.push({ address: tokenAddr, balance: raw && raw !== '0x' ? BigInt(raw) : 0n });
    }
  }

  for (const { address: tokenAddr, balance } of batched) {
    if (balance > 0n) {
      const meta = TOKEN_REGISTRY[tokenAddr];
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

  if (discover) {
    const discovered = await discoverTokens(address);
    results.push(...discovered);
  }

  return results;
}

async function discoverTokens(address: string): Promise<TokenBalance[]> {
  const provider = getProvider();
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = currentBlock - 9999;

  const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const paddedAddr = `0x000000000000000000000000${address.replace('0x', '').toLowerCase()}`;

  // ERC-20 Transfer(address,address,uint256) has 3 indexed topics: [sig, from, to]
  // Use getLogsBatched to stay under the RPC hard cap of 1,000 blocks per request
  const logs = await getLogsBatched(fromBlock, currentBlock, undefined, [transferTopic, null, paddedAddr]);
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
    } catch (err) {
      console.warn(`[TokenAssets] Discovery probe failed for ${tokenAddr}: ${(err as Error).message}`);
    }
  }

  return discovered;
}

function decodeString(hex: string): string {
  if (!hex || hex === '0x') return '';
  try {
    const raw = hex.startsWith('0x') ? hex.slice(2) : hex;
    const offsetBN = BigInt('0x' + raw.slice(0, 64));
    const lenBN = BigInt('0x' + raw.slice(64, 128));
    if (offsetBN > BigInt(Number.MAX_SAFE_INTEGER) || lenBN > BigInt(Number.MAX_SAFE_INTEGER)) {
      return "0x" + raw.slice(128, 128 + 64);
    }
    const offset = Number(offsetBN) * 2;
    const len = Number(lenBN) * 2;
    const strHex = raw.slice(64 + offset, 64 + offset + len);
    return Buffer.from(strHex, 'hex').toString('utf-8').replace(/\0+$/, '');
  } catch {
    return '';
  }
}
