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
  const incomingLogs = await getLogsBatched(narrowFrom, currentBlock, undefined, [
    TRANSFER_EVENT_TOPIC,
    null,
    null,
    paddedAddr,
  ]);

  const receivedTokens = new Map<string, number>();
  for (const log of incomingLogs) {
    const tokenAddr = log.address!.toLowerCase();
    if (TOKEN_REGISTRY[tokenAddr]) continue;
    receivedTokens.set(tokenAddr, (receivedTokens.get(tokenAddr) || 0) + 1);
  }

  for (const [tokenAddr, count] of receivedTokens) {
    try {
      const symRaw = await callContract(tokenAddr, ERC20.symbol);
      const symbol = symRaw ? decodeString(symRaw) : '?';
      flags.push({
        type: 'honeypot_risk',
        severity: 'medium',
        description: `Received unknown token ${symbol} (${tokenAddr.slice(0, 10)}...) — ${count} times`,
        addresses: [address, tokenAddr],
        evidence: `Token not in verified registry, ${count} incoming transfers in last 200 blocks`,
      });
    } catch { /* not a standard token */ }
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
    const offset = Number(BigInt('0x' + raw.slice(0, 64))) * 2;
    const len = Number(BigInt('0x' + raw.slice(64, 128))) * 2;
    const strHex = raw.slice(64 + offset, 64 + offset + len);
    return Buffer.from(strHex, 'hex').toString('utf-8').replace(/\0+$/, '');
  } catch {
    return '';
  }
}
