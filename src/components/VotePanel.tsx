import { useEffect, useState } from 'react';
import { useConnection, usePublicClient, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { decodeEventLog, type Hash } from 'viem';
import { ArrowRight, Check, CheckCircle2, ExternalLink, Flame, LoaderCircle, LockKeyhole, Waves } from 'lucide-react';
import { Modal } from './Modal';
import { sceneFor } from '../lib/story.mjs';
import { explorerTx, friendlyError, votingAbi } from '../lib/chain';
import type { CoreFeed, SiteConfig } from '../lib/types';
import type { useVoting } from '../lib/hooks';

interface PendingVote { hash: Hash; round: string; choice: number; address: string }
function readPending(): PendingVote | null {
  try {
    const value = JSON.parse(localStorage.getItem('squeek-tales:tx') ?? 'null');
    return value && /^0x[\da-fA-F]{64}$/.test(value.hash) && /^\d+$/.test(value.round) && [0, 1].includes(value.choice) && /^0x[\da-fA-F]{40}$/.test(value.address) ? value : null;
  } catch { return null; }
}

export function VotePanel({ config, feed, round, previewRound, localMode, onPreviewAdvance, voting, feedHealthy }: {
  config: SiteConfig; feed?: CoreFeed; round: bigint; previewRound: number; localMode: boolean;
  onPreviewAdvance: (choice: number) => void; voting: ReturnType<typeof useVoting>; feedHealthy: boolean;
}) {
  const account = useConnection();
  const client = usePublicClient();
  const write = useWriteContract();
  const [choice, setChoice] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);
  const [error, setError] = useState('');
  const [simulating, setSimulating] = useState(false);
  const [pending, setPending] = useState<PendingVote | null>(readPending);
  const scene = sceneFor(localMode ? previewRound : round || 1n);
  const receipt = useWaitForTransactionReceipt({
    hash: pending?.hash,
    chainId: 11155111,
    confirmations: 2,
    onReplaced: ({ transaction }) => setPending((p) => p ? { ...p, hash: transaction.hash } : p),
    query: { enabled: Boolean(pending), retry: 2 },
  });
  useEffect(() => { setChoice(null); setError(''); }, [round, localMode, previewRound]);
  useEffect(() => {
    if (pending) { try { localStorage.setItem('squeek-tales:tx', JSON.stringify(pending)); } catch { /* Receipt still works in memory. */ } }
  }, [pending]);
  useEffect(() => { if (receipt.data) void voting.refetch(); }, [receipt.data]); // Refresh confirmed contract state.
  let recorded = false;
  if (receipt.data?.status === 'success' && pending && config.votingAddress) {
    recorded = receipt.data.logs.some((log) => {
      try {
        if (log.address.toLowerCase() !== config.votingAddress?.toLowerCase()) return false;
        const event = decodeEventLog({ abi: votingAbi, data: log.data, topics: log.topics });
        return event.eventName === 'VoteCast' && event.args.roundId.toString() === pending.round && event.args.choice === pending.choice && event.args.voter.toLowerCase() === pending.address.toLowerCase();
      } catch { return false; }
    });
  }
  const busy = simulating || write.isPending || Boolean(pending && !receipt.data && !receipt.error);
  const alreadyVoted = voting.data?.mine?.[2] === true || Boolean(recorded && pending?.round === round.toString() && pending.address.toLowerCase() === account.address?.toLowerCase());
  const eligible = Boolean(config.votingAddress && feed && feedHealthy && !feed.core.paused && voting.data && !voting.isError && account.isConnected && account.chainId === 11155111 && !alreadyVoted && choice !== null && !busy);
  const vote = async () => {
    if (!eligible || !client || !account.address || !config.votingAddress || choice === null) return;
    setError(''); setSimulating(true);
    try {
      const { request } = await client.simulateContract({ address: config.votingAddress, abi: votingAbi, functionName: 'vote', args: [round, choice], account: account.address });
      setSimulating(false);
      const hash = await write.mutateAsync({ ...request, chainId: 11155111 });
      setPending({ hash, round: round.toString(), choice, address: account.address });
    } catch (e) { setError(friendlyError(e)); } finally { setSimulating(false); }
  };
  const reason = !config.votingAddress ? 'On-chain voting opens after the voting contract is deployed.' : !feedHealthy ? 'Live voting is paused until the round feed is verified.' : feed?.core.paused ? 'Squeekchain settlement is paused. Voting will return when it resumes.' : !account.isConnected ? 'Connect your wallet above to vote with Sepolia test ETH.' : account.chainId !== 11155111 ? 'Open your wallet menu above and switch to Sepolia.' : voting.isPending ? 'Verifying the voting contract…' : alreadyVoted ? 'Your vote is recorded. A new choice opens next round.' : 'One vote per wallet. Only the Sepolia network fee applies.';
  return <section className="vote-panel" aria-labelledby="vote-heading">
    <div className="section-top"><span className="icon-label"><Flame size={17} />{localMode ? 'Your own little adventure' : 'Write the next page'}</span><span className="small muted">{localMode ? 'Local preview' : `Round ${round > 0n ? round.toString() : '—'}`}</span></div>
    <h2 id="vote-heading">Where should Pip go?</h2>
    <p className="vote-description">{localMode ? 'Choose a path and see what happens next.' : 'Pick a path for our little explorer.'}</p>
    <fieldset className="choices"><legend className="sr-only">Choose the next story branch</legend>{scene.choices.map((item, i) => <label key={i} className={`choice ${choice === i ? 'selected' : ''}`}>
      <input type="radio" name="branch" value={i} checked={choice === i} onChange={() => setChoice(i)} disabled={busy} />
      <span className={`choice-art choice-art-${i}`} aria-hidden="true">{item.icon === 'lantern' ? <Flame size={26} strokeWidth={1.5} /> : <Waves size={26} strokeWidth={1.5} />}</span>
      <span className="choice-content"><strong>{item.title}</strong><span>{item.description}</span></span><span className="radio-mark" aria-hidden="true">{choice === i && <Check size={12} strokeWidth={3} />}</span>
    </label>)}</fieldset>
    {voting.data && !localMode && <div className="vote-totals"><span>{voting.data.counts[0].toString()} votes for the light</span><span>{voting.data.counts[1].toString()} for the river</span></div>}
    {localMode ? <button className="primary full" disabled={choice === null} onClick={() => { if (choice !== null) onPreviewAdvance(choice); }}>Continue the story<ArrowRight size={18} /></button> : config.votingAddress ? <button className="primary full" disabled={!eligible} onClick={() => void vote()}>{busy ? <LoaderCircle className="spin" size={18} /> : alreadyVoted ? <CheckCircle2 size={18} /> : <LockKeyhole size={17} />}{simulating ? 'Checking your vote…' : write.isPending ? 'Confirm in your wallet…' : busy ? 'Confirming on Sepolia…' : alreadyVoted ? 'Vote recorded' : 'Vote on Sepolia'}{!busy && !alreadyVoted && <ArrowRight size={18} />}</button> : <>
      <button className="primary full" disabled={choice === null} onClick={() => setPreview(true)}>Preview this path<ArrowRight size={18} /></button>
      <button className="unavailable-vote" disabled><LockKeyhole size={14} />On-chain voting not yet deployed</button>
    </>}
    <p className="vote-note small">{localMode ? 'A local story preview. Your choices stay in this browser.' : reason}</p>
    {config.votingAddress && !localMode && <button className="text-button preview-link" disabled={choice === null || busy} onClick={() => setPreview(true)}>Preview this path first<ArrowRight size={15} /></button>}
    {!localMode && !config.votingAddress && <a href="#setup" className="text-link small">Deployment details<ExternalLink size={13} /></a>}
    <div className="transaction-status" aria-live="polite">
      {pending && <div className="transaction"><strong>{receipt.error ? 'Confirmation could not be checked' : receipt.data?.status === 'reverted' ? 'Transaction reverted' : receipt.data && !recorded ? 'Replacement did not record a vote' : recorded ? 'Vote confirmed on Sepolia' : 'Waiting for two confirmations'}</strong><span className="small">Round {pending.round} · {pending.choice === 0 ? 'Light path' : 'River path'}</span><a className="full-value small" href={explorerTx(pending.hash)} target="_blank" rel="noreferrer">{pending.hash}<ExternalLink size={14} /></a>{receipt.error && <button className="text-button" onClick={() => void receipt.refetch()}>Retry confirmation</button>}</div>}
      {(error || voting.isError) && <p className="error-text" role="alert">{error || friendlyError(voting.error)}</p>}
    </div>
    {preview && choice !== null && <Modal title={scene.choices[choice].title} onClose={() => setPreview(false)}><div className="preview-art"><img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="Pip the hamster" width="84" height="84" /></div><p className="preview-story">{scene.choices[choice].outcome}</p><p className="notice small">This is a story preview. The live path is chosen by settled Squeekchain work, not by this preview.</p><button className="primary full" onClick={() => setPreview(false)}>Back to the adventure<ArrowRight size={18} /></button></Modal>}
  </section>;
}
