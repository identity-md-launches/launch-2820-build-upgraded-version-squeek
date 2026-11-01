import fs from 'node:fs';
import { createPublicClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { branchFromWork, parseCore, settlementsFromEvents } from '../src/lib/story.mjs';

const config = JSON.parse(fs.readFileSync('public/config.json', 'utf8'));
const abi = JSON.parse(fs.readFileSync('src/lib/core-abi.json', 'utf8'));
const evidence = { checkedAt: new Date().toISOString(), apiUrl: config.apiUrl, chainId: config.chainId, api: null, rpc: null, deployment: { votingAddress: config.votingAddress, transactionHash: null, status: config.votingAddress ? 'configured, not deployed by this script' : 'not deployed', limitation: config.votingAddress ? null : 'No deployer wallet or signing credential was supplied. The browser-wallet deployment path and compiled artifacts are included.' } };
try {
  const response = await fetch(config.apiUrl, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const feed = parseCore(await response.json());
  const latest = settlementsFromEvents(feed).find((s) => s.roundId === feed.core.settledThroughRound);
  evidence.api = { status: response.status, schemaVersion: feed.schemaVersion, installationId: feed.installationId, coreAddress: feed.identities.core, safeThroughBlock: feed.chain.safeThroughBlock, settledThroughRound: feed.core.settledThroughRound, genesisTimestamp: feed.configuration.genesisTimestamp, roundDuration: feed.configuration.roundDuration, latestComputedSettlement: latest ?? null };
  const client = createPublicClient({ chain: sepolia, transport: http(config.rpcUrl, { timeout: 15000, retryCount: 0 }) });
  try {
    const [chainId, state, configuration, code] = await Promise.all([
      client.getChainId(),
      client.readContract({ address: feed.identities.core, abi, functionName: 'state', blockNumber: BigInt(feed.chain.safeThroughBlock) }),
      client.readContract({ address: feed.identities.core, abi, functionName: 'configuration', blockNumber: BigInt(feed.chain.safeThroughBlock) }),
      client.getCode({ address: feed.identities.core }),
    ]);
    if (chainId !== config.chainId || state.settledThroughRound.toString() !== feed.core.settledThroughRound || configuration.genesisTimestamp.toString() !== feed.configuration.genesisTimestamp || configuration.roundDuration.toString() !== '600' || !code || code === '0x') throw new Error('API and RPC deployment state did not match.');
    evidence.rpc = { url: config.rpcUrl, verified: true, chainId, matchedCore: true, matchedSafeBlockFrontier: true, matchedRoundClock: true, deployedCodePresent: true };
    const frontier = BigInt(feed.core.settledThroughRound);
    if (frontier > 0n) {
      const page = await client.readContract({ address: feed.identities.core, abi, functionName: 'roundPage', args: [frontier - 1n, frontier, 16n], blockNumber: BigInt(feed.chain.safeThroughBlock) });
      const work = page.end.cumulativeWork - page.start.cumulativeWork;
      if (page.certifiedThroughRound !== frontier || latest && latest.work !== work.toString()) throw new Error('RPC round work did not match the API settlement.');
      evidence.rpc.latestRoundPage = { roundId: frontier.toString(), certifiedThroughRound: page.certifiedThroughRound.toString(), computedWork: work.toString(), branch: branchFromWork(work), matchesApi: latest ? true : null };
    }
  } catch (error) { evidence.rpc = { url: config.rpcUrl, verified: false, error: (error.shortMessage ?? error.message).slice(0, 220) }; }
} catch (error) { evidence.api = { verified: false, error: error.message }; }
fs.mkdirSync('artifacts', { recursive: true });
fs.writeFileSync('artifacts/integration.json', JSON.stringify(evidence, null, 2) + '\n');
console.log(JSON.stringify(evidence, null, 2));
