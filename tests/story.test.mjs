import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCore, settlementsFromEvents, branchFromWork, currentRound, roundCountdown, sceneFor, SCENES } from '../src/lib/story.mjs';

const captured = JSON.parse(fs.readFileSync(new URL('./fixtures/core.json', import.meta.url)));
const clone = () => structuredClone(captured);

test('accepts captured official Sepolia schema and computes actual certified zero-work branches', () => {
  const feed = parseCore(clone());
  const records = settlementsFromEvents(feed);
  assert.ok(records.length > 0);
  const latest = records.find((r) => r.roundId === feed.core.settledThroughRound);
  assert.ok(latest);
  assert.equal(latest.work, '0');
  assert.equal(latest.branch, 0);
});

test('unavailable, unknown schema, wrong network, and malformed fields are rejected', () => {
  for (const mutate of [
    (f) => { f.schemaVersion = 2; },
    (f) => { f.status = 'unavailable'; f.reason = 'indexer_unavailable'; },
    (f) => { f.chain.chainId = '1'; },
    (f) => { f.configuration.roundDuration = '300'; },
    (f) => { f.core.settledThroughRound = '-1'; },
    (f) => { delete f.configuration; },
    (f) => { f.identities.core = 'not-an-address'; },
  ]) { const feed = clone(); mutate(feed); assert.throws(() => parseCore(feed)); }
});

test('a partial batch never turns a missing active-round event into zero work', () => {
  const feed = clone();
  const latest = feed.events.find((e) => e.eventName === 'BatchSettled');
  latest.arguments.find((a) => a.name === 'activeRoundCount').value = '1';
  feed.events = [latest];
  assert.equal(settlementsFromEvents(feed).length, 0);
});

test('complete active batch uses exact work parity and deduplicates round records', () => {
  const feed = clone();
  const batch = feed.events.find((e) => e.eventName === 'BatchSettled');
  const round = batch.arguments.find((a) => a.name === 'settledThroughRound').value;
  batch.arguments.find((a) => a.name === 'activeRoundCount').value = '1';
  const active = { ...batch, eventName: 'RoundRecorded', arguments: [{ name: 'roundId', value: round }, { name: 'work', value: '9999999999999999999999999999999999999' }] };
  feed.events = [batch, active];
  assert.equal(settlementsFromEvents(feed)[0].branch, 1);
  batch.arguments.find((a) => a.name === 'activeRoundCount').value = '2';
  feed.events.push(active);
  assert.equal(settlementsFromEvents(feed).length, 0);
});

test('ignores unsafe blocks, unrelated contracts and rounds beyond the certified frontier', () => {
  for (const mutate of [
    (e, f) => { e.blockNumber = (BigInt(f.chain.safeThroughBlock) + 1n).toString(); },
    (e) => { e.contractAddress = `0x${'2'.repeat(40)}`; },
    (e, f) => { e.arguments.find((a) => a.name === 'settledThroughRound').value = (BigInt(f.core.settledThroughRound) + 1n).toString(); },
  ]) { const feed = clone(); feed.events = [feed.events.find((e) => e.eventName === 'BatchSettled')]; mutate(feed.events[0], feed); assert.equal(settlementsFromEvents(feed).length, 0); }
});

test('round clock respects the exact genesis and ten-minute boundary without settling itself', () => {
  assert.equal(currentRound('1000', '600', 999000), 0n);
  assert.equal(currentRound('1000', '600', 1000000), 1n);
  assert.equal(currentRound('1000', '600', 1599000), 1n);
  assert.equal(currentRound('1000', '600', 1600000), 2n);
  assert.equal(roundCountdown('1000', '600', 1599000), 1);
  assert.equal(roundCountdown('1000', '600', 1600000), 600);
});

test('six story locations cover both paths without numerical precision loss', () => {
  assert.equal(sceneFor(1).title, SCENES[0].title);
  assert.equal(sceneFor(7).title, SCENES[0].title);
  for (const s of SCENES) { assert.equal(s.choices.length, 2); assert.ok(s.choices.every((c) => c.outcome.length > 40)); }
  assert.equal(branchFromWork('18446744073709551615'), 1);
  assert.equal(branchFromWork('18446744073709551614'), 0);
});
