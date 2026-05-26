import { Alchemy, Network } from 'alchemy-sdk';

const ALCHEMY_API_KEY = process.env.ALCHEMY_API_KEY;

export function getAlchemyClient(): Alchemy | null {
  if (!ALCHEMY_API_KEY) return null;
  return new Alchemy({
    apiKey: ALCHEMY_API_KEY,
    network: Network.PHAROS_MAINNET, // Requires Alchemy Pharos support
  });
}

export async function getTokenBalancesAlchemy(
  address: string
): Promise<{ contract: string; balance: string; name?: string; symbol?: string }[]> {
  const alchemy = getAlchemyClient();
  if (!alchemy) return [];

  try {
    const balances = await alchemy.core.getTokenBalances(address);
    const result: { contract: string; balance: string; name?: string; symbol?: string }[] = [];

    for (const token of balances.tokenBalances) {
      const meta = await alchemy.core.getTokenMetadata(token.contractAddress);
      result.push({
        contract: token.contractAddress,
        balance: token.tokenBalance ?? '0',
        name: meta?.name,
        symbol: meta?.symbol,
      });
    }

    return result;
  } catch {
    return [];
  }
}
