export const SCENES = [
  {
    title: 'The lantern in the woods', place: 'Bramblewood',
    intro: 'A little light flickers between the trees. Pip tightens his scarf. Somewhere beyond the ferns, a new adventure is waiting.',
    choices: [
      { title: 'Follow the little light', description: 'A winding trail into the lantern woods.', icon: 'lantern', outcome: 'Pip follows the glow to a clearing. A family of fireflies is lighting the way home. He offers them a sunflower seed, and a tiny friendship begins.' },
      { title: 'Take the river path', description: 'See what lies beyond the stepping stones.', icon: 'river', outcome: 'Pip pads down to the river. A leaf boat bobs beside the bank, carrying a map no bigger than his paw. He carefully tucks it into his satchel.' },
    ],
  },
  {
    title: 'A very small crossing', place: 'Pebblebrook',
    intro: 'The brook hums a sleepy tune. On the far bank, a curious wooden sign points toward something called the Moonseed Market.',
    choices: [
      { title: 'Cross the mossy bridge', description: 'There is just enough room for small paws.', icon: 'lantern', outcome: 'The bridge creaks softly under Pip’s paws. Halfway across, a sleepy beetle asks for directions. They decide that getting lost together sounds quite nice.' },
      { title: 'Sail a little leaf boat', description: 'Let the gentle current be your guide.', icon: 'river', outcome: 'Pip climbs aboard an oak leaf. The stream carries him past silver pebbles to a tiny dock. A new friend is waiting there with warm berry tea.' },
    ],
  },
  {
    title: 'The moonseed market', place: 'Clover Hollow',
    intro: 'Under a canopy of clover, the night market is waking up. Pip has one sunflower seed and a pocket full of curiosity.',
    choices: [
      { title: 'Visit the lantern stall', description: 'Trade a seed for a pocket of starlight.', icon: 'lantern', outcome: 'The shopkeeper gives Pip a lantern with a star inside. “For the way home,” she whispers. Pip promises to bring it back with a story.' },
      { title: 'Follow the berry scent', description: 'A warm pie is cooling by the river.', icon: 'river', outcome: 'Pip finds a baker with flour on her whiskers. He trades his seed for a crumb of pie, then stays to help fold the tiniest pastry in the world.' },
    ],
  },
  {
    title: 'A letter beneath the stars', place: 'Starlight Hill',
    intro: 'A folded letter rests on a mushroom. It is addressed to “a hamster with a kind heart.” Pip looks around, then carefully opens it.',
    choices: [
      { title: 'Find the star garden', description: 'Follow a trail of glowing petals.', icon: 'lantern', outcome: 'The petals lead Pip to a garden of moonflowers. In the middle sits a hedgehog who has been waiting for someone to share the stars with.' },
      { title: 'Find the river postbox', description: 'Deliver a little kindness downstream.', icon: 'river', outcome: 'Pip slides a reply into a blue postbox. A kingfisher collects it with a grateful nod. Somewhere downstream, a lonely mouse will have a very good morning.' },
    ],
  },
  {
    title: 'The great sunflower search', place: 'Honeymeadow',
    intro: 'The tallest sunflower in the meadow has lost its golden seed. Pip is small enough to look in all the places everyone else forgets.',
    choices: [
      { title: 'Search the firefly grove', description: 'Ask the little lights for a little help.', icon: 'lantern', outcome: 'The fireflies gather around a hollow log. Inside, Pip finds the seed keeping a baby snail warm. The sunflower is happy to wait until morning.' },
      { title: 'Search the water’s edge', description: 'Look among the reeds and ripples.', icon: 'river', outcome: 'A friendly frog spots something golden in the reeds. Pip fishes out the seed with a twig. They celebrate with the smallest, happiest splash.' },
    ],
  },
  {
    title: 'The long, lovely way home', place: 'Willowbend',
    intro: 'Pip’s satchel is a little heavier, and his heart is a little fuller. The lights of his burrow twinkle in the distance. There is still time for one more detour.',
    choices: [
      { title: 'Walk beneath the lanterns', description: 'One last stroll through the sleepy woods.', icon: 'lantern', outcome: 'Every lantern on the trail holds a familiar face. Pip’s new friends walk him home, each carrying a little light. His burrow has never felt so big.' },
      { title: 'Watch the river sunrise', description: 'A quiet moment before the next adventure.', icon: 'river', outcome: 'Pip sits on a smooth stone as the first sunbeam touches the water. He draws a tiny map in his notebook. Tomorrow is another page waiting to happen.' },
    ],
  },
];

export function sceneFor(round) {
  const n = BigInt(round);
  return SCENES[Number((n > 0n ? n - 1n : 0n) % BigInt(SCENES.length))];
}

export function currentRound(genesis, duration, now = Date.now()) {
  const seconds = BigInt(Math.floor(now / 1000));
  const start = BigInt(genesis);
  return seconds < start ? 0n : (seconds - start) / BigInt(duration) + 1n;
}

export function roundCountdown(genesis, duration, now = Date.now()) {
  const seconds = BigInt(Math.floor(now / 1000));
  const start = BigInt(genesis);
  const remaining = seconds < start ? start - seconds : BigInt(duration) - (seconds - start) % BigInt(duration);
  return Number(remaining);
}

export function branchFromWork(work) { return Number(BigInt(work) % 2n); }

const decimal = (x) => typeof x === 'string' && /^(0|[1-9]\d*)$/.test(x) && x.length < 78;
const address = (x) => typeof x === 'string' && /^0x[\da-fA-F]{40}$/.test(x) && !/^0x0{40}$/.test(x);
const hash = (x) => typeof x === 'string' && /^0x[\da-fA-F]{64}$/.test(x);

export function parseCore(raw) {
  if (!raw || raw.schemaVersion !== 1) throw new Error('The Squeekchain feed format changed. Live voting is paused until the integration is updated.');
  if (raw.status !== 'available') throw new Error(`Squeekchain is unavailable (${String(raw.reason ?? 'unknown reason')}). Retry the feed or play a local preview.`);
  if (raw.chain?.chainId !== '11155111' || raw.chain?.target !== 'sepolia') throw new Error('The feed is not on Ethereum Sepolia. Live voting is paused.');
  if (!address(raw.identities?.core) || !decimal(raw.configuration?.genesisTimestamp) || raw.configuration?.roundDuration !== '600' || !decimal(raw.core?.settledThroughRound) || !decimal(raw.chain?.safeThroughBlock) || typeof raw.core?.paused !== 'boolean' || typeof raw.installationId !== 'string' || !Array.isArray(raw.events)) throw new Error('The Squeekchain response is incomplete. Retry the feed.');
  if (BigInt(raw.configuration.genesisTimestamp) === 0n || BigInt(raw.configuration.genesisTimestamp) > BigInt(Number.MAX_SAFE_INTEGER)) throw new Error('The round clock could not be verified.');
  if (raw.source && (!decimal(raw.source.blockTimestamp) || !hash(raw.source.transactionHash))) throw new Error('The settlement source could not be verified. Retry the feed.');
  return raw;
}

/** Infer zero work only from a complete, certified batch, never from a missing event. */
export function settlementsFromEvents(feed, limit = 12) {
  const results = new Map();
  const safe = BigInt(feed.chain.safeThroughBlock);
  const frontier = BigInt(feed.core.settledThroughRound);
  const valid = feed.events.filter((e) => e.contractKind === 'core' && e.contractAddress?.toLowerCase() === feed.identities.core.toLowerCase() && decimal(e.blockNumber) && BigInt(e.blockNumber) <= safe && hash(e.transactionHash) && Array.isArray(e.arguments));
  for (const batch of valid.filter((e) => e.eventName === 'BatchSettled')) {
    const a = Object.fromEntries(batch.arguments.map((a) => [a.name, a.value]));
    if (![a.settledThroughRound, a.previousSettledThroughRound, a.activeRoundCount].every(decimal)) continue;
    const end = BigInt(a.settledThroughRound), before = BigInt(a.previousSettledThroughRound);
    if (end > frontier || end <= before) continue;
    const active = valid.filter((e) => e.eventName === 'RoundRecorded' && e.transactionHash === batch.transactionHash).map((e) => Object.fromEntries(e.arguments.map((a) => [a.name, a.value])));
    if (BigInt(active.length) !== BigInt(a.activeRoundCount) || active.some((a) => !decimal(a.roundId) || !decimal(a.work) || BigInt(a.roundId) <= before || BigInt(a.roundId) > end)) continue;
    if (new Set(active.map((a) => a.roundId)).size !== active.length) continue;
    const start = end - BigInt(limit) + 1n > before + 1n ? end - BigInt(limit) + 1n : before + 1n;
    for (let id = start; id <= end; id++) {
      const work = active.find((a) => a.roundId === id.toString())?.work ?? '0';
      results.set(id.toString(), { roundId: id.toString(), work, branch: branchFromWork(work), transactionHash: batch.transactionHash, blockNumber: batch.blockNumber });
    }
  }
  return [...results.values()].sort((a, b) => BigInt(a.roundId) > BigInt(b.roundId) ? -1 : 1).slice(0, limit);
}

export function clockText(seconds) {
  return `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
}
