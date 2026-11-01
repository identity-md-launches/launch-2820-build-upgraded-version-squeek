import { parseAbi } from 'viem';

// Generated ABI lives in public/contracts/SqueekTalesVoting.json; this typed subset matches its functions.
export const votingAbi = parseAbi([
  'function vote(uint64 roundId, uint8 choice)',
  'function core() view returns (address)',
  'function genesisTimestamp() view returns (uint64)',
  'function roundDuration() view returns (uint64)',
  'function currentRound() view returns (uint64)',
  'function votes(uint64 roundId, address voter) view returns (uint8 choice, uint64 timestamp, bool recorded)',
  'function choiceVotes(uint64 roundId, uint8 choice) view returns (uint256)',
  'function voterCount() view returns (uint256)',
  'function totalVotes() view returns (uint256)',
  'function voterPage(uint256 offset, uint256 limit) view returns (address[] accounts, uint256[] counts)',
  'event VoteCast(uint64 indexed roundId, uint8 indexed choice, address indexed voter, uint64 timestamp)',
  'error InvalidChoice()', 'error RoundClosed()', 'error AlreadyVoted()', 'error CorePaused()',
]);

export const shortAddress = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;
export const explorerTx = (hash: string) => `https://sepolia.etherscan.io/tx/${hash}`;
export const explorerAddress = (address: string) => `https://sepolia.etherscan.io/address/${address}`;

export function friendlyError(error: unknown): string {
  const e = error as { shortMessage?: string; message?: string };
  const message = e.shortMessage ?? e.message ?? 'The request failed.';
  if (/reject|denied/i.test(message)) return 'The wallet request was declined. You can try again when you’re ready.';
  if (/AlreadyVoted/i.test(message)) return 'This wallet has already voted in this round. Come back for the next round.';
  if (/RoundClosed/i.test(message)) return 'That round has closed. Refresh the round and choose again.';
  if (/insufficient funds/i.test(message)) return 'Your wallet needs Sepolia ETH for the network fee. Add test ETH and try again.';
  return `${message.slice(0, 240)} Try again, or check your wallet and connection.`;
}
