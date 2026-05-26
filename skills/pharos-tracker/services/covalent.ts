const COVALENT_API_KEY = process.env.COVALENT_API_KEY;

interface CovalentBalance {
  contract_address: string;
  contract_name: string;
  contract_ticker_symbol: string;
  balance: string;
  quote: number;
  quote_rate: number;
}

export async function getPortfolioCovalent(
  address: string
): Promise<CovalentBalance[] | null> {
  if (!COVALENT_API_KEY) return null;

  const url = `https://api.covalenthq.com/v1/1672/address/${address}/balances_v2/?key=${COVALENT_API_KEY}`;

  try {
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) return null;
    return data.data?.items ?? null;
  } catch {
    return null;
  }
}
