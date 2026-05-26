import { PHAROSSCAN_API_URL } from '../utils/constants.js';

interface ContractQueryResult {
  status: string;
  message: string;
  result?: any;
}

export async function getContractABI(address: string): Promise<string | null> {
  const url = `${PHAROSSCAN_API_URL}?module=contract&action=getabi&address=${address}`;
  try {
    const res = await fetch(url);
    const data = await res.json() as ContractQueryResult;
    if (data.status === '1') return data.result;
    return null;
  } catch {
    return null;
  }
}

export async function getTokenMetadata(address: string): Promise<{
  name: string;
  symbol: string;
  decimals: number;
} | null> {
  try {
    // Fallback: fetch Pharosscan token page and scrape basic info
    const url = `https://pharosscan.xyz/address/${address}`;
    const res = await fetch(url);
    const html = await res.text();

    // Basic regex extraction — prefers RPC call over scraping
    const nameMatch = html.match(/token-name[^>]*>([^<]+)/);
    const symbolMatch = html.match(/token-symbol[^>]*>([^<]+)/);

    if (nameMatch && symbolMatch) {
      return {
        name: nameMatch[1].trim(),
        symbol: symbolMatch[1].trim(),
        decimals: 18, // default; RPC preferred for accuracy
      };
    }
    return null;
  } catch {
    return null;
  }
}
