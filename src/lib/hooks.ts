import { useQuery } from '@tanstack/react-query';
import { usePublicClient } from 'wagmi';
import { getAddress, type Address, type Abi } from 'viem';
import { branchFromWork, parseCore, settlementsFromEvents } from './story.mjs';
import { votingAbi } from './chain';
import type { CoreFeed, SiteConfig, Settlement } from './types';
import coreAbi from './core-abi.json';

export function useCore(config: SiteConfig) {
  const client = usePublicClient();
  return useQuery({
    queryKey: ['core', config.apiUrl],
    queryFn: async () => {
      const r = await fetch(config.apiUrl, { cache: 'no-cache', signal: AbortSignal.timeout(12000) });
      if (!r.ok) throw new Error(`Squeekchain returned HTTP ${r.status}. Retry the feed or play a local preview.`);
      const feed = parseCore(await r.json()) as CoreFeed;
      if (config.expectedCore && feed.identities.core.toLowerCase() !== config.expectedCore.toLowerCase()) throw new Error('Squeekchain changed its core deployment. Live voting is paused until config.json is updated.');
      let settlements = settlementsFromEvents(feed) as Settlement[];
      const frontier = BigInt(feed.core.settledThroughRound);
      // A clipped event window is not proof of zero work. Read a certified page instead.
      if (frontier > 0n && !settlements.some((s) => s.roundId === frontier.toString()) && client && feed.source) {
        try {
          const before = frontier > 12n ? frontier - 12n : 0n;
          const page = await client.readContract({ address: feed.identities.core, abi: coreAbi as Abi, functionName: 'roundPage', args: [before, frontier, 16n], blockNumber: BigInt(feed.chain.safeThroughBlock) }) as { certifiedThroughRound: bigint; rounds: { roundId: bigint; dataHash: string }[] };
          // Checkpoints contain cumulative work; difference between adjacent positions gives round work.
          const full = page as unknown as { certifiedThroughRound: bigint; start: { cumulativeWork: bigint }; rounds: { roundId: bigint; cumulativeWork: bigint }[] };
          if (full.certifiedThroughRound === frontier) {
            let previousWork = full.start.cumulativeWork;
            const work = new Map<string, string>();
            for (const record of full.rounds) { work.set(record.roundId.toString(), (record.cumulativeWork - previousWork).toString()); previousWork = record.cumulativeWork; }
            settlements = [];
            for (let id = frontier; id > before; id--) {
              const units = work.get(id.toString()) ?? '0';
              settlements.push({ roundId: id.toString(), work: units, branch: branchFromWork(units), transactionHash: feed.source.transactionHash, blockNumber: feed.chain.safeThroughBlock });
            }
          }
        } catch { /* Keep only the settlements proven by complete events. */ }
      }
      return { feed, settlements, fetchedAt: Date.now() };
    },
    refetchInterval: 15000,
    retry: 1,
    staleTime: 10000,
  });
}

export function useVoting(config: SiteConfig, feed: CoreFeed | undefined, round: bigint, account?: Address) {
  const client = usePublicClient();
  return useQuery({
    queryKey: ['voting', config.votingAddress, feed?.identities.core, round.toString(), account],
    enabled: Boolean(config.votingAddress && feed && client && round > 0n),
    queryFn: async () => {
      if (!client || !config.votingAddress || !feed) throw new Error('Voting is not configured.');
      const address = getAddress(config.votingAddress);
      const code = await client.getCode({ address });
      if (!code || code === '0x') throw new Error('No voting contract exists at the configured Sepolia address.');
      const read = { address, abi: votingAbi };
      const [core, genesis, duration, onchainRound, first, second, voterCount, totalVotes] = await Promise.all([
        client.readContract({ ...read, functionName: 'core' }),
        client.readContract({ ...read, functionName: 'genesisTimestamp' }),
        client.readContract({ ...read, functionName: 'roundDuration' }),
        client.readContract({ ...read, functionName: 'currentRound' }),
        client.readContract({ ...read, functionName: 'choiceVotes', args: [round, 0] }),
        client.readContract({ ...read, functionName: 'choiceVotes', args: [round, 1] }),
        client.readContract({ ...read, functionName: 'voterCount' }),
        client.readContract({ ...read, functionName: 'totalVotes' }),
      ]);
      if (core.toLowerCase() !== feed.identities.core.toLowerCase() || genesis.toString() !== feed.configuration.genesisTimestamp || duration !== 600n) throw new Error('The voting contract does not match the official Squeekchain deployment.');
      if (onchainRound !== round) throw new Error('Your round clock differs from Sepolia. Check the device clock and refresh.');
      const mine = account ? await client.readContract({ ...read, functionName: 'votes', args: [round, account] }) : null;
      const leaders: { address: Address; count: bigint }[] = [];
      const visible = voterCount > 500n ? 500n : voterCount;
      for (let offset = 0n; offset < visible; offset += 100n) {
        const [accounts, counts] = await client.readContract({ ...read, functionName: 'voterPage', args: [offset, visible - offset < 100n ? visible - offset : 100n] });
        accounts.forEach((a, i) => leaders.push({ address: getAddress(a), count: counts[i] }));
      }
      leaders.sort((a, b) => a.count === b.count ? a.address.localeCompare(b.address) : a.count > b.count ? -1 : 1);
      return { counts: [first, second], voterCount, totalVotes, mine, leaders: leaders.slice(0, 5), limited: voterCount > 500n };
    },
    refetchInterval: 20000,
    retry: 1,
    staleTime: 10000,
  });
}
