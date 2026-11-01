import { useEffect, useState } from 'react';
import { ArrowRight, ArrowUpRight, BookOpen, CheckCircle2, ChevronLeft, ChevronRight, CircleHelp, Clock3, ExternalLink, Heart, Leaf, Radio, RefreshCw, RotateCcw, Sprout, Trophy, Users, Waves } from 'lucide-react';
import { useConnection } from 'wagmi';
import { WalletControl } from './components/Wallet';
import { Modal } from './components/Modal';
import { VotePanel } from './components/VotePanel';
import { Setup } from './components/Setup';
import { useCore, useVoting } from './lib/hooks';
import { clockText, currentRound, roundCountdown, sceneFor } from './lib/story.mjs';
import { explorerAddress, explorerTx, shortAddress } from './lib/chain';
import type { Settlement, SiteConfig } from './lib/types';

interface PreviewSave { chapter: number; lastChoice: number | null }
function loadPreview(): PreviewSave {
  try {
    const raw = JSON.parse(localStorage.getItem('squeek-tales:preview') ?? 'null');
    if (raw && Number.isSafeInteger(raw.chapter) && raw.chapter >= 1 && raw.chapter < 100000 && (raw.lastChoice === null || raw.lastChoice === 0 || raw.lastChoice === 1)) return raw;
  } catch { /* Preview remains playable without browser storage. */ }
  return { chapter: 1, lastChoice: null };
}

export default function App({ config }: { config: SiteConfig }) {
  const core = useCore(config);
  const feed = core.data?.feed;
  const settlements = core.data?.settlements ?? [];
  const account = useConnection();
  const [now, setNow] = useState(Date.now());
  const [help, setHelp] = useState(false);
  const [mode, setMode] = useState<'live' | 'preview'>('live');
  const [tab, setTab] = useState<'story' | 'chapters'>('story');
  const [previewSave, setPreviewSave] = useState(loadPreview);
  const [selectedChapter, setSelectedChapter] = useState<Settlement | null>(null);
  useEffect(() => { const interval = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(interval); }, []);
  useEffect(() => { try { localStorage.setItem('squeek-tales:preview', JSON.stringify(previewSave)); } catch { /* State remains available in memory. */ } }, [previewSave]);
  const round = feed ? currentRound(feed.configuration.genesisTimestamp, feed.configuration.roundDuration, now) : 0n;
  const remaining = feed ? roundCountdown(feed.configuration.genesisTimestamp, feed.configuration.roundDuration, now) : 0;
  const voting = useVoting(config, feed, round, account.address);
  const latest = settlements.find((s) => s.roundId === feed?.core.settledThroughRound);
  const local = mode === 'preview';
  const chapter = local ? previewSave.chapter : feed?.core.settledThroughRound ?? '0';
  const scene = sceneFor(chapter);
  const latestPreviewScene = sceneFor(previewSave.chapter - 1 || 1);
  const sourceAge = feed?.source ? now / 1000 - Number(feed.source.blockTimestamp) : null;
  const isFresh = Boolean(feed && (feed.core.settledThroughRound === '0' || sourceAge !== null && sourceAge >= -120 && sourceAge < 1800) && core.data && now - core.data.fetchedAt < 60000);
  const feedHealthy = Boolean(feed && isFresh && !core.isError);
  const storyText = local ? previewSave.lastChoice !== null ? latestPreviewScene.choices[previewSave.lastChoice].outcome : scene.intro : latest ? scene.choices[latest.branch].outcome : feed?.core.settledThroughRound === '0' ? 'Pip has packed his satchel. His first chapter begins when the first Squeekchain round settles. You can explore a local preview while you wait.' : scene.intro;
  const advance = (choice: number) => setPreviewSave((p) => ({ chapter: p.chapter + 1, lastChoice: choice }));

  return <>
    <a className="skip-link" href="#story">Skip to the story</a>
    <header className="site-header"><div className="header-inner">
      <a href="#" className="brand" aria-label="Squeek Tales home"><img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width="43" height="43" /><span>Squeek<span className="brand-light">Tales</span><span className="brand-dot">.</span></span></a>
      <nav className="desktop-nav" aria-label="Main navigation"><a href="#story" className="nav-active">Storybook</a><a href="#leaderboard">Leaderboard</a><button onClick={() => setHelp(true)}>How to play<CircleHelp size={15} /></button></nav>
      <div className="header-actions"><span className="network-label"><span className="status-dot" />Sepolia</span><WalletControl /></div>
    </div></header>

    <main className="page-shell" id="story">
      <section className="intro" aria-labelledby="page-heading"><div><h1 id="page-heading">Little paws. <span>Big adventures.</span></h1><p>A living story, one Squeekchain round at a time.</p></div><div className="intro-note"><Sprout size={22} strokeWidth={1.5} /><span>A little curiosity goes a long way.<br /><span className="muted">Come see where the story takes us.</span></span></div></section>

      <div className="story-toolbar"><div className="story-tabs" role="group" aria-label="Story view"><button className={tab === 'story' ? 'active' : ''} aria-pressed={tab === 'story'} onClick={() => setTab('story')}><BookOpen size={17} />The story</button><button className={tab === 'chapters' ? 'active' : ''} aria-pressed={tab === 'chapters'} onClick={() => setTab('chapters')}>Past chapters</button></div><button className="mode-control" onClick={() => { setMode(local ? 'live' : 'preview'); setTab('story'); }}><span className={local ? 'preview-dot' : 'status-dot'} />{local ? 'Return to live story' : 'Play a local preview'}<ArrowUpRight size={15} /></button></div>

      {local && <div className="preview-banner" role="status"><span><Leaf size={17} /><strong>Local story preview</strong><span>Choices are saved only in this browser.</span></span><button className="text-button" onClick={() => setPreviewSave({ chapter: 1, lastChoice: null })}><RotateCcw size={14} />Start again</button></div>}
      {core.isError && !local && <div className="feed-banner" role="status"><span>{core.error.message}</span><button className="text-button" disabled={core.isFetching} onClick={() => void core.refetch()}><RefreshCw size={15} />{core.isFetching ? 'Retrying…' : 'Retry feed'}</button></div>}
      {feed && !isFresh && !core.isError && !local && <div className="feed-banner" role="status"><span>The latest settlement is delayed. Showing the last verified chapter; live voting is paused.</span><button className="text-button" onClick={() => void core.refetch()}>Refresh feed</button></div>}

      {tab === 'story' ? <div className="adventure-grid">
        <article className="story-stage" aria-labelledby="chapter-heading">
          <div className="chapter-meta"><span><BookOpen size={15} />{local ? `Preview chapter ${chapter}` : feed ? BigInt(chapter) === 0n ? 'The adventure begins soon' : `Chapter ${chapter}` : 'Meet Pip, your little explorer'}</span><span className="location"><span className="tiny-leaf"><Leaf size={13} /></span>{scene.place}</span></div>
          <div className="scene-frame"><img className="forest-art" src={`${import.meta.env.BASE_URL}forest.svg`} width="960" height="580" alt="Pip, a golden hamster with a green scarf and a lantern, explores a peaceful woodland beside a river." /><span className="scene-caption"><span className="status-dot" />{local ? 'A little make-believe' : latest ? 'A chapter from the chain' : 'Our story is growing'}</span></div>
          <div className="chapter-body"><div className="chapter-title"><h2 id="chapter-heading">{BigInt(chapter) === 0n ? 'The lantern in the woods' : scene.title}</h2><span className="chapter-decoration" aria-hidden="true"><Leaf size={23} strokeWidth={1.5} /></span></div><p>{storyText}</p>
            <div className="chapter-footer"><span className="small muted">{local ? <><Heart size={14} />A story you can make your own</> : latest ? <><CheckCircle2 size={14} />Settled round {latest.roundId} · {latest.work} work units</> : <><Clock3 size={14} />{core.isPending ? 'Reading the official round feed…' : 'Waiting for a verified chapter result'}</>}</span>{latest && !local && <a className="text-link small" href={explorerTx(latest.transactionHash)} target="_blank" rel="noreferrer">View on-chain<ExternalLink size={13} /></a>}</div>
          </div>
        </article>
        <aside className="adventure-sidebar"><VotePanel config={config} feed={feed} round={round} previewRound={previewSave.chapter} localMode={local} onPreviewAdvance={advance} voting={voting} feedHealthy={feedHealthy} />
          <section className="round-panel" aria-labelledby="round-heading"><div className="round-title"><h3 id="round-heading"><Radio size={17} />{local ? 'Meanwhile, on Squeekchain' : 'The wheel keeps turning'}</h3><span className="status-label">{core.isPending ? 'Connecting' : feedHealthy ? feed?.core.paused ? 'Paused' : 'Live feed' : 'Feed delayed'}</span></div><div className="round-numbers"><div><span className="small muted">Current round</span><strong>{feed ? round.toString() : '—'}</strong></div><div><span className="small muted">Next round in</span><strong className="countdown" aria-label={feed ? `${Math.floor(remaining / 60)} minutes ${remaining % 60} seconds until the next round` : 'Round clock unavailable'}>{feed ? clockText(remaining) : '—:—'}</strong></div></div><div className="round-progress" role="progressbar" aria-label="Time elapsed in current round" aria-valuemin={0} aria-valuemax={600} aria-valuenow={feed ? 600 - Math.min(remaining, 600) : 0}><span style={{ width: `${feed ? (600 - Math.min(remaining, 600)) / 6 : 0}%` }} /></div><p className="small muted">{feed ? `Settled through round ${feed.core.settledThroughRound}. A chapter advances only after settlement.` : 'Ten-minute rounds. Chapters wait for an official settlement.'}</p></section>
        </aside>
      </div> : <section className="history-section" aria-labelledby="history-heading"><div className="history-heading"><div><h2 id="history-heading">Every round leaves a little tale.</h2><p className="muted">Recent chapters verified from official Squeekchain settlements.</p></div><button className="secondary" onClick={() => setTab('story')}><ChevronLeft size={16} />Back to the story</button></div>{settlements.length ? <div className="history-list">{settlements.map((s) => <button className="history-row" key={s.roundId} onClick={() => setSelectedChapter(s)}><span className="chapter-number">{s.roundId}</span><span><strong>{sceneFor(s.roundId).title}</strong><span className="small muted">{sceneFor(s.roundId).choices[s.branch].title} · {s.work} work units</span></span><ChevronRight size={20} /></button>)}</div> : <div className="empty-state"><BookOpen size={36} strokeWidth={1.5} /><h3>{core.isPending ? 'Opening the storybook…' : 'The first pages are still to come'}</h3><p>Verified settlements will appear here. Try the local story preview while you wait.</p><button className="secondary" onClick={() => { setMode('preview'); setTab('story'); }}>Play a local preview<ArrowRight size={16} /></button></div>}</section>}

      <div className="lower-grid"><section className="how-it-works" aria-labelledby="how-heading"><h2 id="how-heading">A small choice. A shared story.</h2><p className="section-description">Pip’s adventure follows the rhythm of a real hamster-powered chain.</p><div className="steps"><div><span className="step-icon"><BookOpen size={21} /></span><h3>Read a little</h3><p>Find out where the latest settled round has taken Pip.</p></div><div><span className="step-icon"><Leaf size={21} /></span><h3>Pick a path</h3><p>Preview a branch, or record a preference on Sepolia once voting opens.</p></div><div><span className="step-icon"><Clock3 size={21} /></span><h3>Watch it unfold</h3><p>Settled work chooses the path. Every ten-minute round brings a new page.</p></div></div><button className="text-button" onClick={() => setHelp(true)}>A few things to know<ArrowRight size={15} /></button></section>
      <section className="leaderboard" id="leaderboard" aria-labelledby="leaderboard-heading"><div className="section-title"><h2 id="leaderboard-heading"><Trophy size={21} />The story shapers</h2><span className="small muted">Sepolia voters</span></div>{!config.votingAddress ? <div className="leaderboard-empty"><span className="empty-illustration"><Sprout size={34} strokeWidth={1.5} /></span><h3>A little room for the first explorers.</h3><p>The leaderboard will grow from real contract votes after deployment.</p><a href="#setup" className="text-link small">See voting setup<ArrowRight size={14} /></a></div> : voting.isError ? <div className="leaderboard-empty"><p>Voter records could not load from Sepolia.</p><button className="text-button" onClick={() => void voting.refetch()}>Retry voter records</button></div> : voting.isPending ? <div className="leaderboard-empty"><p>Reading voter records from Sepolia…</p></div> : voting.data?.leaders.length ? <><ol className="leader-list">{voting.data.leaders.map((v, i) => <li key={v.address}><span className="rank">{i + 1}</span><a href={explorerAddress(v.address)} title={v.address} target="_blank" rel="noreferrer">{shortAddress(v.address)}<ExternalLink size={12} /></a><span>{v.count.toString()} {v.count === 1n ? 'vote' : 'votes'}</span></li>)}</ol><p className="small muted">{voting.data.totalVotes.toString()} votes · {voting.data.voterCount.toString()} wallets{voting.data.limited ? ' · Ranked among the first 500 registered voters' : ''}</p></> : <div className="leaderboard-empty"><Users size={30} /><h3>The first page is yours.</h3><p>No votes are recorded yet. Vote in the current round to join the story.</p></div>}</section></div>

      <div className="source-note"><CheckCircle2 size={16} /><p>{feed ? <>Reading the official <a href={config.apiUrl} target="_blank" rel="noreferrer">Squeekchain API</a> at safe block {feed.chain.safeThroughBlock}. </> : <>Live data comes from the official <a href={config.apiUrl} target="_blank" rel="noreferrer">Squeekchain API</a>. </>}The story maps even settled work to the light path and odd work to the river. Votes record player preferences; they do not change the wheel result.</p><button className="icon-button" aria-label="Refresh official round feed" disabled={core.isFetching} onClick={() => void core.refetch()}><RefreshCw size={16} className={core.isFetching ? 'spin' : ''} /></button></div>
      <Setup feed={feedHealthy ? feed : undefined} config={config} />
    </main>
    <footer className="site-footer"><div><a href="#" className="footer-brand"><img src={`${import.meta.env.BASE_URL}favicon.svg`} width="26" height="26" alt="" />Squeek Tales</a><span>Made for little moments of wonder.</span></div><div><a href="https://docs.squeekchain.com/developers/api/" target="_blank" rel="noreferrer">Squeekchain docs<ArrowUpRight size={13} /></a><span>Ethereum Sepolia testnet</span></div></footer>

    {help && <Modal title="A little guide to the adventure" onClose={() => setHelp(false)}><ol className="help-list"><li><strong>Follow Pip.</strong> The latest settled Squeekchain round is the current story chapter. The world repeats through six places, with a new outcome every round.</li><li><strong>Choose a path.</strong> Read both options and preview either one. Local preview mode is playable without a wallet and keeps progress in this browser.</li><li><strong>Record a preference.</strong> After deployment, connect a wallet, switch to Ethereum Sepolia, and send one vote per round. Votes need test ETH only for network fees.</li><li><strong>Let the wheel decide.</strong> Even settled work chooses the light path; odd work chooses the river path. This is the game’s rule, not an official Squeekchain voting mechanism. A timer ending is not a settlement.</li></ol><p className="notice small">Current limitation: {config.votingAddress ? 'Voting is configured; every transaction still needs your wallet approval.' : 'The contract is compiled but not deployed. Voting is disabled until a real Sepolia deployment is configured.'}</p><button className="primary full" onClick={() => setHelp(false)}>Back to Pip<ArrowRight size={17} /></button></Modal>}
    {selectedChapter && <Modal title={`Chapter ${selectedChapter.roundId}: ${sceneFor(selectedChapter.roundId).title}`} onClose={() => setSelectedChapter(null)}><div className="preview-art"><img src={`${import.meta.env.BASE_URL}favicon.svg`} width="72" height="72" alt="Pip the hamster" /></div><p className="preview-story">{sceneFor(selectedChapter.roundId).choices[selectedChapter.branch].outcome}</p><p className="small muted">Official settled work: {selectedChapter.work} · {selectedChapter.branch === 0 ? 'Light path' : 'River path'}</p><a className="secondary full" href={explorerTx(selectedChapter.transactionHash)} target="_blank" rel="noreferrer">View the settlement<ExternalLink size={16} /></a></Modal>}
  </>;
}
