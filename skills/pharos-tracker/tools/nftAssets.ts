import { getProvider, callContract, getLogsBatched } from '../services/rpc.js';
import { ERC20, TRANSFER_EVENT_TOPIC } from '../utils/constants.js';

interface NFTBalance {
  contract: string;
  name: string;
  symbol: string;
  balance: number;
}

const ERC721_BALANCE_OF = (addr: string) =>
  `0x70a08231${addr.replace('0x', '').toLowerCase().padStart(64, '0')}`;

const ERC721_NAME = '0x06fdde03';
const ERC721_SYMBOL = '0x95d89b41';
const ERC721_SUPPORTS_INTERFACE = '0x01ffc9a7';

// ERC-721 interface ID
const ERC721_INTERFACE_ID = '0x80ac58cd';

export async function getNFTBalances(address: string): Promise<NFTBalance[]> {
  const provider = getProvider();
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = currentBlock - 50000;

  // Scan Transfer events to this address to find NFT contracts
  const transferTopic = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
  const paddedAddr = `0x000000000000000000000000${address.replace('0x', '').toLowerCase()}`;

  const logs = await getLogsBatched(fromBlock, currentBlock, undefined, [
    transferTopic,
    null,
    null,
    paddedAddr,
  ]);

  const contractMap = new Map<string, number>();

  for (const log of logs) {
    const contract = log.address!.toLowerCase();
    contractMap.set(contract, (contractMap.get(contract) || 0) + 1);
  }

  const nfts: NFTBalance[] = [];

  for (const [contract, txCount] of contractMap) {
    try {
      // Check supportsInterface for ERC-721
      const supportsData = ERC721_SUPPORTS_INTERFACE + ERC721_INTERFACE_ID.slice(2);
      const supportsResult = await callContract(contract, supportsData);

      if (supportsResult === '0x0000000000000000000000000000000000000000000000000000000000000001') {
        const name = await callContract(contract, ERC721_NAME).catch(() => null);
        const symbol = await callContract(contract, ERC721_SYMBOL).catch(() => null);
        const balanceRaw = await callContract(contract, ERC721_BALANCE_OF(address)).catch(() => null);

        const balance = balanceRaw ? Number(BigInt(balanceRaw)) : txCount;

        nfts.push({
          contract,
          name: name ? decodeString(name) : 'Unknown NFT',
          symbol: symbol ? decodeString(symbol) : 'NFT',
          balance,
        });
      }
    } catch {
      // Not an NFT contract
    }
  }

  return nfts;
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
