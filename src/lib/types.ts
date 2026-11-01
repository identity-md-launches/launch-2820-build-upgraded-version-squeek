import type { Address, Hash } from 'viem';
export interface SiteConfig {
  chainId: 11155111;
  apiUrl: string;
  rpcUrl: string;
  votingAddress: Address | null;
  votingDeploymentBlock: string | null;
  expectedCore: Address | null;
}
export interface CoreEvent {
  eventName: string; contractKind: string; contractAddress: string;
  blockNumber: string; transactionHash: Hash; arguments: { name: string; value: string }[];
}
export interface CoreFeed {
  schemaVersion: 1; installationId: string; status: 'available';
  chain: { target: 'sepolia'; chainId: '11155111'; safeThroughBlock: string };
  identities: { core: Address };
  configuration: { genesisTimestamp: string; roundDuration: string };
  core: { settledThroughRound: string; paused: boolean };
  source?: { blockTimestamp: string; transactionHash: Hash };
  events: CoreEvent[];
}
export interface Settlement { roundId: string; work: string; branch: number; transactionHash: Hash; blockNumber: string }
