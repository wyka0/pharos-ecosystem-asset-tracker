import { getProvider, callContract } from '../services/rpc.js';
import { TRANSFER_EVENT_TOPIC, getProsPrice } from '../utils/constants.js';
import { formatUnits } from 'ethers';

interface WalletBalance {
  address: string;
  balance: bigint;
  formatted: string;
  usdValue: number;
}

export async function walletBalance(address: string): Promise<WalletBalance> {
  const provider = getProvider();
  const balance = await provider.getBalance(address);
  const prosPrice = await getProsPrice();
  const numeric = parseFloat(formatUnits(balance, 18));
  const formatted = `${numeric.toFixed(6)} PROS`;
  const usdValue = numeric * prosPrice;

  return {
    address,
    balance,
    formatted,
    usdValue,
  };
}

// CLI entry point
if (process.argv[1]?.includes('walletBalance')) {
  const addr = process.argv.find(a => a.startsWith('0x'));
  if (!addr) {
    console.error('Usage: npx tsx walletBalance.ts --address 0x...');
    process.exit(1);
  }

  walletBalance(addr).then(w => {
    console.log('=============================================');
    console.log('  PHAROS WALLET BALANCE');
    console.log(`  PROS: ${w.formatted}`);
    console.log(`  USD:  $${w.usdValue.toFixed(2)}`);
    console.log('=============================================');
  });
}
