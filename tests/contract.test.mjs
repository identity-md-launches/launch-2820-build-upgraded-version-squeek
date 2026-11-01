import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeEventLog } from 'viem';
import { localChain } from './helpers/local-chain.mjs';

test('deployed bytecode enforces voting rules, emits real local-chain receipts and exposes voter ranking', async () => {
  const c = await localChain();
  try {
    const contract = { address: c.address, abi: c.voting.abi };
    const read = (functionName, args = []) => c.publicClient.readContract({ ...contract, functionName, args });
    const round = await read('currentRound');
    assert.equal(round, 1n);
    const hash = await c.wallet.writeContract({ ...contract, functionName: 'vote', args: [round, 1], gas: 1000000n });
    const receipt = await c.publicClient.waitForTransactionReceipt({ hash });
    assert.equal(receipt.status, 'success');
    const event = decodeEventLog({ abi: c.voting.abi, ...receipt.logs[0] });
    assert.equal(event.eventName, 'VoteCast');
    assert.equal(event.args.roundId, round);
    assert.equal(event.args.choice, 1);
    assert.equal(event.args.voter.toLowerCase(), c.accounts[0].toLowerCase());
    assert.ok(event.args.timestamp > 0n);
    assert.deepEqual(await read('votes', [round, c.accounts[0]]), [1, event.args.timestamp, true]);
    assert.equal(await read('choiceVotes', [round, 1]), 1n);
    assert.equal(await read('totalVotes'), 1n);
    await assert.rejects(c.publicClient.simulateContract({ ...contract, functionName: 'vote', args: [round, 0], account: c.accounts[0] }), /AlreadyVoted/);
    await assert.rejects(c.publicClient.simulateContract({ ...contract, functionName: 'vote', args: [round, 2], account: c.accounts[1] }), /InvalidChoice/);
    await assert.rejects(c.publicClient.simulateContract({ ...contract, functionName: 'vote', args: [round + 1n, 0], account: c.accounts[1] }), /RoundClosed/);
    const pause = await c.wallet.writeContract({ address: c.coreAddress, abi: c.core.abi, functionName: 'setPaused', args: [true] });
    await c.publicClient.waitForTransactionReceipt({ hash: pause });
    await assert.rejects(c.publicClient.simulateContract({ ...contract, functionName: 'vote', args: [round, 0], account: c.accounts[1] }), /CorePaused/);
    const resume = await c.wallet.writeContract({ address: c.coreAddress, abi: c.core.abi, functionName: 'setPaused', args: [false] });
    await c.publicClient.waitForTransactionReceipt({ hash: resume });
    await c.provider.request({ method: 'evm_increaseTime', params: [600] });
    await c.provider.request({ method: 'evm_mine', params: [] });
    await assert.rejects(c.publicClient.simulateContract({ ...contract, functionName: 'vote', args: [round, 0], account: c.accounts[1] }), /RoundClosed/);
    const next = await c.wallet.writeContract({ ...contract, functionName: 'vote', args: [2n, 0], gas: 1000000n });
    await c.publicClient.waitForTransactionReceipt({ hash: next });
    assert.equal(await read('voterVotes', [c.accounts[0]]), 2n);
    assert.equal(await read('voterCount'), 1n);
    const [accounts, counts] = await read('voterPage', [0n, 100n]);
    assert.equal(accounts[0].toLowerCase(), c.accounts[0].toLowerCase());
    assert.equal(counts[0], 2n);
    await assert.rejects(read('voterPage', [0n, 101n]), /InvalidPage/);
  } finally { await c.provider.disconnect(); }
});
