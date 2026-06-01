import { getProvider, getLogsBatched, callContract } from '../services/rpc.js';
import { TRANSFER_EVENT_TOPIC, TOKEN_REGISTRY, ERC20 } from '../utils/constants.js';

interface SuspiciousFlag {
  type: 'wash_trade' | 'honeypot_risk' | 'high_frequency' | 'phishing' | 'rug_pull';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  addresses: string[];
  evidence: string;
}

interface SuspiciousActivityReport {
  wallet: string;
  flags: SuspiciousFlag[];
  overallRisk: 'low' | 'medium' | 'high' | 'critical';
  summary: string;
}

export async function scanSuspiciousActivity(
  address: string
): Promise<SuspiciousActivityReport> {
  const provider = getProvider();
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = currentBlock - 1000;
  const flags: SuspiciousFlag[] = [];

  const paddedAddr = `0x000000000000000000000000${address.replace('0x', '').toLowerCase()}`;
  let outgoingTotal = 0;
  let incomingUnknown = 0;
  const recipients = new Map<string, number>();

  // Scan known token contracts for transfers to/from this address
  for (const [tokenAddr, meta] of Object.entries(TOKEN_REGISTRY)) {
    const outLogs = await getLogsBatched(fromBlock, currentBlock, tokenAddr, [
      TRANSFER_EVENT_TOPIC,
      paddedAddr,
    ]);
    outgoingTotal += outLogs.length;

    for (const log of outLogs) {
      const to = `0x${log.topics![2].slice(26)}`;
      recipients.set(to, (recipients.get(to) || 0) + 1);
    }
  }

  // Check for circular transfers among known token recipients
  for (const [recipient, count] of recipients) {
    if (count <= 3) continue;
    let returnCount = 0;
    for (const [tokenAddr] of Object.entries(TOKEN_REGISTRY)) {
      const backAddr = `0x000000000000000000000000${recipient.replace('0x', '').toLowerCase()}`;
      const backLogs = await getLogsBatched(fromBlock, currentBlock, tokenAddr, [
        TRANSFER_EVENT_TOPIC,
        backAddr,
        paddedAddr,
      ]);
      returnCount += backLogs.length;
    }
    if (returnCount > 2) {
      flags.push({
        type: 'wash_trade',
        severity: 'high',
        description: `Circular transfer pattern detected with ${recipient}`,
        addresses: [address, recipient],
        evidence: `${count} outgoing, ${returnCount} return transfers across known tokens`,
      });
    }
  }

  // 2. Honeypot risk: scan unknown token transfers into this address
  // (Limited to last 200 blocks with no address filter to keep scan feasible)
  const narrowFrom = Math.max(0, currentBlock - 200);
  let incomingLogs: any[] = [];
  try {
    incomingLogs = await getLogsBatched(narrowFrom, currentBlock, undefined, [
      TRANSFER_EVENT_TOPIC,
      null,
      null,
      paddedAddr,
    ]);
  } catch (err) {
    console.warn(`[SuspiciousActivity] Failed to fetch incoming logs: ${(err as Error).message}`);
  }

  const receivedTokens = new Map<string, number>();
  for (const log of incomingLogs) {
    const tokenAddr = log.address!.toLowerCase();
    if (TOKEN_REGISTRY[tokenAddr]) continue;
    receivedTokens.set(tokenAddr, (receivedTokens.get(tokenAddr) || 0) + 1);
  }

  for (const [tokenAddr, count] of receivedTokens) {
    let nameRaw: string | null = null;
    let symRaw: string | null = null;
    try {
      nameRaw = await callContract(tokenAddr, ERC20.name);
    } catch (err) {
      console.warn(`[SuspiciousActivity] Token name probe failed for ${tokenAddr}: ${(err as Error).message}`);
    }
    try {
      symRaw = await callContract(tokenAddr, ERC20.symbol);
    } catch (err) {
      console.warn(`[SuspiciousActivity] Token symbol probe failed for ${tokenAddr}: ${(err as Error).message}`);
    }

    const mockTransfer = { from: '0x0000000000000000000000000000000000000000', to: address, value: '0', input: '0x' };
    const honeypot = isLikelyHoneypot(tokenAddr, mockTransfer, address);
    if (!honeypot) continue;

    const symbol = symRaw ? decodeString(symRaw) : '?';
    flags.push({
      type: 'honeypot_risk',
      severity: 'medium',
      description: `Received unknown token ${symbol} (${tokenAddr.slice(0, 10)}...) — ${count} times`,
      addresses: [address, tokenAddr],
      evidence: `Token not in verified registry, ${count} incoming transfers in last 200 blocks`,
    });
  }

  // 3. High-frequency activity
  if (outgoingTotal > 50) {
    flags.push({
      type: 'high_frequency',
      severity: receivedTokens.size > 5 ? 'high' : 'medium',
      description: `High tx frequency: ${outgoingTotal} outgoing transfers in last 1000 blocks`,
      addresses: [address],
      evidence: `${outgoingTotal} outgoing transfers across known tokens`,
    });
  }

  let overallRisk: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (flags.some(f => f.severity === 'critical')) overallRisk = 'critical';
  else if (flags.some(f => f.severity === 'high')) overallRisk = 'high';
  else if (flags.some(f => f.severity === 'medium')) overallRisk = 'medium';

  const summary = flags.length === 0
    ? 'No suspicious activity detected'
    : `${flags.length} flag(s): ${flags.map(f => f.type.replace('_', ' ')).join(', ')}`;

  return { wallet: address, flags, overallRisk, summary };
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

function isLikelyHoneypot(tokenAddress: string, transfer: any, userAddress: string): boolean {
  const isUnknown = !TOKEN_REGISTRY[tokenAddress.toLowerCase()];
  if (!isUnknown) return false;

  const userInitiated = transfer.from?.toLowerCase() === userAddress.toLowerCase();
  if (userInitiated) return false;

  const input = transfer.input || "";
  const isAirdropMint = ["0x40c10f19", "0xa9059cbb", "0x23b872dd"].includes(input.slice(0, 10).toLowerCase());

  const isSingleLarge = parseFloat(transfer.value) > 1000000;

  const isRecent = transfer.blockTimestamp ? (Date.now() - transfer.blockTimestamp < 7 * 24 * 60 * 60 * 1000) : false;

  let score = 0;
  if (isUnknown) score++;
  if (!userInitiated) score++;
  if (isAirdropMint) score++;
  if (isSingleLarge) score++;
  if (isRecent) score++;

  return score >= 3;
}
