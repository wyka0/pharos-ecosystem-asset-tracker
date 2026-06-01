import { getProvider, getLogsBatched, callContract } from '../services/rpc.js';
import { TOKEN_REGISTRY, ERC20 } from '../utils/constants.js';
import { formatUnits } from 'ethers';

interface DAOActivity {
  type: 'vote_cast' | 'delegation' | 'proposal_created';
  proposalId?: string;
  token: string;
  txHash: string;
  blockNumber: number;
}

interface DAOParticipationScoreResult {
  address: string;
  score: number;          // 0-100
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  totalActivities: number;
  activities: DAOActivity[];
  governanceTokensHeld: { symbol: string; balance: number }[];
  suggestions: string[];
}

// Common governance event signatures
const VOTE_CAST_TOPIC = '0x8a89d812f6d19f3e2fd2ccbb0aa2faa7cdaa52b5c09f66ceefb6d175b0ba91ca';
const DELEGATION_TOPIC = '0x3134e8a2e6b97e929a7e54011ea5485d7d196dd5f0ba4d4ef95803e8e3fc257f';

export async function calculateDAOScore(address: string): Promise<DAOParticipationScoreResult> {
  const provider = getProvider();
  const currentBlock = await provider.getBlockNumber();
  const fromBlock = Math.max(0, currentBlock - 5000);

  const activities: DAOActivity[] = [];
  const governanceTokensHeld: { symbol: string; balance: number }[] = [];

  // Check governance token holdings
  for (const [tokenAddr, meta] of Object.entries(TOKEN_REGISTRY)) {
    try {
      const raw = await callContract(tokenAddr, ERC20.balanceOf(address));
      const bal = raw && raw !== '0x' ? parseFloat(formatUnits(BigInt(raw).toString(), meta.decimals)) : 0;
      if (bal > 0) {
        governanceTokensHeld.push({ symbol: meta.symbol, balance: bal });
      }
    } catch (err) { console.warn(`[DaoScore] Token balance probe failed: ${(err as Error).message}`); }
  }

  // Scan for VoteCast events (scoped to last 200 blocks to avoid large unfiltered scans)
  const narrowFrom = Math.max(0, currentBlock - 200);
  try {
    const voteLogs = await getLogsBatched(narrowFrom, currentBlock, undefined, [VOTE_CAST_TOPIC]);
    for (const log of voteLogs) {
      const voter = `0x${log.topics![1]?.slice(26)}`;
      if (voter.toLowerCase() === address.toLowerCase()) {
        const proposalId = log.topics![2] || '';
        const decodedProposalId = proposalId ? BigInt(proposalId).toString() : undefined;
        activities.push({
          type: 'vote_cast',
          proposalId: decodedProposalId,
          token: log.address,
          txHash: log.transactionHash!,
          blockNumber: log.blockNumber!,
        });
      }
    }
  } catch (err) { console.warn(`[DaoScore] VoteCast log fetch failed: ${(err as Error).message}`); }

  // Scan for Delegation events
  try {
    const delLogs = await getLogsBatched(narrowFrom, currentBlock, undefined, [DELEGATION_TOPIC]);
    for (const log of delLogs) {
      const delegator = `0x${log.topics![1]?.slice(26)}`;
      if (delegator.toLowerCase() === address.toLowerCase()) {
        activities.push({
          type: 'delegation',
          token: log.address,
          txHash: log.transactionHash!,
          blockNumber: log.blockNumber!,
        });
      }
    }
  } catch (err) { console.warn(`[DaoScore] Delegation log fetch failed: ${(err as Error).message}`); }

  // Compute score
  let score = 0;
  const suggestions: string[] = [];

  if (governanceTokensHeld.length > 0) {
    score += 30;
  } else {
    suggestions.push('Acquire governance tokens (PROS, USDC LP) to participate in DAO voting');
  }

  const votes = activities.filter(a => a.type === 'vote_cast');
  const delegations = activities.filter(a => a.type === 'delegation');

  score += Math.min(40, votes.length * 10);
  score += Math.min(30, delegations.length * 10);

  if (votes.length === 0 && governanceTokensHeld.length > 0) {
    suggestions.push('You hold governance tokens but haven\'t voted yet — cast your first vote');
  }

  if (delegations.length === 0 && governanceTokensHeld.length > 0) {
    suggestions.push('Delegate your voting power to an active participant to earn rewards');
  }

  const grade: 'A' | 'B' | 'C' | 'D' | 'F' =
    score >= 80 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : score >= 20 ? 'D' : 'F';

  return {
    address,
    score: Math.min(100, score),
    grade,
    totalActivities: activities.length,
    activities: activities.reverse().slice(0, 20),
    governanceTokensHeld,
    suggestions,
  };
}

export interface DaoScoreResult {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  breakdown: { hasGovernance: number; votes: number; delegations: number };
  suggestions: string[];
}

export function calculateDaoScore(
  hasGovernance: boolean,
  voteCount: number,
  delegateCount: number
): DaoScoreResult {
  let score = 0;
  const suggestions: string[] = [];

  if (hasGovernance) {
    score += 30;
  } else {
    suggestions.push('Acquire governance tokens to participate in DAO voting');
  }

  score += Math.min(40, voteCount * 10);
  score += Math.min(30, delegateCount * 10);

  if (voteCount === 0 && hasGovernance) {
    suggestions.push('Cast your first vote with your governance tokens');
  }
  if (delegateCount === 0 && hasGovernance) {
    suggestions.push('Delegate your voting power to an active participant');
  }

  const capped = Math.min(100, score);
  const grade: 'A' | 'B' | 'C' | 'D' | 'F' =
    capped >= 80 ? 'A' : capped >= 60 ? 'B' : capped >= 40 ? 'C' : capped >= 20 ? 'D' : 'F';

  return {
    score: capped,
    grade,
    breakdown: { hasGovernance: hasGovernance ? 30 : 0, votes: Math.min(40, voteCount * 10), delegations: Math.min(30, delegateCount * 10) },
    suggestions,
  };
}
