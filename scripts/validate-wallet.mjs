import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { localChain } from '../tests/helpers/local-chain.mjs';
import { serve } from './static-server.mjs';

// Test-only EIP-6963 provider + ephemeral EVM. Never used by the shipped app.
const output = 'test/scratch/wallet-validation';
fs.mkdirSync(output, { recursive: true });
const chain = await localChain();
const { server, url } = await serve();
const browser = await chromium.launch({ headless: true });
const results = [];
let reviewPage;
const check = async (name, fn) => {
  try { await fn(); results.push({ name, passed: true }); console.log(`PASS ${name}`); }
  catch (error) { results.push({ name, passed: false, detail: error.message }); console.log(`FAIL ${name}: ${error.message.slice(0, 600)}`); if (reviewPage) { await reviewPage.screenshot({ path: `${output}/failure.png`, fullPage: true }); console.log((await reviewPage.locator('dialog').allTextContents()).join(' ').slice(0, 1200)); console.log('Wallet request methods:', methods.join(', ')); } throw error; }
};
let rejectConnect = true, rejectVote = true, knownChain = false;
const methods = [];
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  reviewPage = page;
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.exposeFunction('validationRpc', async (request) => {
    methods.push(request.method);
    if (request.method === 'eth_requestAccounts') {
      if (rejectConnect) { rejectConnect = false; return { error: { code: 4001, message: 'User rejected request.' } }; }
      return { result: chain.accounts };
    }
    if (request.method === 'wallet_switchEthereumChain') {
      if (!knownChain) return { error: { code: 4902, message: 'Unrecognized chain.' } };
      return { result: null };
    }
    if (request.method === 'wallet_addEthereumChain') { knownChain = true; return { result: null }; }
    if (request.method === 'eth_sendTransaction') {
      if (rejectVote) { rejectVote = false; return { error: { code: 4001, message: 'User rejected request.' } }; }
      const tx = request.params[0];
      if (!tx.gas) tx.gas = await chain.rpcRequest({ method: 'eth_estimateGas', params: [tx] });
    }
    try {
      const result = await chain.rpcRequest(request);
      if (request.method === 'eth_sendTransaction') setTimeout(async () => { await chain.provider.request({ method: 'evm_mine', params: [] }); await chain.provider.request({ method: 'evm_mine', params: [] }); }, 300);
      return { result };
    } catch (e) { return { error: { code: e.code ?? -32000, message: e.message, data: e.data } }; }
  });
  await page.addInitScript(() => {
    let walletChain = '0x1';
    let active = null;
    const listeners = {};
    const emit = (name, value) => (listeners[name] ?? []).forEach((f) => f(value));
    const provider = {
      on: (event, handler) => { (listeners[event] ??= []).push(handler); },
      removeListener: (event, handler) => { listeners[event] = (listeners[event] ?? []).filter((f) => f !== handler); },
      request: async (request) => {
        if (request.method === 'eth_chainId') return walletChain;
        if (request.method === 'eth_accounts' && !localStorage.getItem('validation-wallet-authorized')) return [];
        const response = await window.validationRpc(request);
        if (response.error) throw Object.assign(new Error(response.error.message), response.error);
        if (request.method === 'eth_requestAccounts') { localStorage.setItem('validation-wallet-authorized', 'true'); active = response.result; }
        if (request.method === 'eth_accounts') return active ?? response.result;
        if (request.method === 'wallet_switchEthereumChain' || request.method === 'wallet_addEthereumChain') { walletChain = request.params[0].chainId; emit('chainChanged', walletChain); }
        return response.result;
      },
    };
    window.ethereum = provider;
    window.validationChangeAccount = (address) => { active = [address]; emit('accountsChanged', active); };
    const announce = () => window.dispatchEvent(new CustomEvent('eip6963:announceProvider', { detail: { info: { uuid: '1f2f1a0b-1111-4444-8888-123456789abc', name: 'Validation wallet', icon: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"%3E%3Crect width="32" height="32" fill="%233d653f"/%3E%3C/svg%3E', rdns: 'test.squeektales.wallet' }, provider } }));
    window.addEventListener('eip6963:requestProvider', announce);
    announce();
  });
  const genesis = await chain.publicClient.readContract({ address: chain.address, abi: chain.voting.abi, functionName: 'genesisTimestamp' });
  const block = await chain.publicClient.getBlockNumber();
  const config = JSON.parse(fs.readFileSync('public/config.json'));
  const feed = JSON.parse(fs.readFileSync('tests/fixtures/core.json'));
  feed.configuration.genesisTimestamp = genesis.toString();
  feed.identities.core = chain.coreAddress; feed.core.settledThroughRound = '0'; feed.events = []; delete feed.source;
  feed.chain.safeThroughBlock = block.toString();
  await page.route('**/config.json', (r) => r.fulfill({ json: { ...config, votingAddress: chain.address, votingDeploymentBlock: block.toString(), expectedCore: chain.coreAddress } }));
  await page.route(config.apiUrl, (r) => r.fulfill({ json: feed }));
  const rpcRoute = async (route) => {
    const input = route.request().postDataJSON();
    const handle = async (q) => {
      try { return { jsonrpc: '2.0', id: q.id, result: await chain.rpcRequest({ method: q.method, params: q.params ?? [] }) }; }
      catch (e) { return { jsonrpc: '2.0', id: q.id, error: { code: e.code ?? -32000, message: e.message, data: e.data } }; }
    };
    await route.fulfill({ json: Array.isArray(input) ? await Promise.all(input.map(handle)) : await handle(input) });
  };
  await page.route(config.rpcUrl, rpcRoute);
  await page.route('https://rpc.sepolia.org', rpcRoute);
  await check('EIP-6963 discovery names the wallet and hides generic injected', async () => {
    await page.goto(url);
    await page.getByRole('button', { name: /^Connect(?: wallet)?$/ }).click();
    await page.getByRole('button', { name: 'Validation wallet', exact: true }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Browser wallet', exact: true }).count(), 0);
  });
  await check('connection rejection is recoverable', async () => {
    await page.getByRole('button', { name: 'Validation wallet', exact: true }).click();
    await page.getByText('The wallet request was declined.', { exact: false }).waitFor();
    await page.getByRole('button', { name: 'Validation wallet', exact: true }).click();
    await page.locator('.wallet-control').filter({ hasText: 'Switch to Sepolia' }).waitFor();
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
  });
  await check('wrong-network voting is disabled; unknown chain adds Sepolia and changes network', async () => {
    await page.locator('input[name="branch"]').first().check();
    assert.ok(await page.getByRole('button', { name: 'Vote on Sepolia', exact: true }).isDisabled());
    await page.locator('.wallet-control').click();
    await page.getByRole('dialog').getByRole('button', { name: 'Switch to Sepolia' }).click();
    await page.getByRole('dialog').getByText('Switch to Ethereum Sepolia to vote.', { exact: false }).waitFor({ state: 'hidden' });
    await page.getByRole('button', { name: 'Close dialog' }).click();
    await page.getByRole('button', { name: 'Vote on Sepolia', exact: true }).waitFor();
    assert.ok(methods.includes('wallet_addEthereumChain'));
  });
  await check('transaction rejection returns an inline error without recording a vote', async () => {
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].find((b) => b.textContent === 'Vote on Sepolia')?.disabled);
    await page.getByRole('button', { name: 'Vote on Sepolia', exact: true }).click();
    await page.getByText('The wallet request was declined.', { exact: false }).waitFor();
    assert.equal(await chain.publicClient.readContract({ address: chain.address, abi: chain.voting.abi, functionName: 'totalVotes' }), 0n);
  });
  await check('real local EVM transaction reaches confirmed UI and cannot be duplicated', async () => {
    await page.getByRole('button', { name: 'Vote on Sepolia', exact: true }).click();
    await page.getByText('Vote confirmed on Sepolia', { exact: true }).waitFor({ timeout: 25000 });
    assert.ok(await page.getByRole('button', { name: 'Vote recorded', exact: true }).isDisabled());
    assert.equal(await chain.publicClient.readContract({ address: chain.address, abi: chain.voting.abi, functionName: 'totalVotes' }), 1n);
    assert.ok(await page.locator('.transaction a').getAttribute('href').then((h) => /^https:\/\/sepolia.etherscan.io\/tx\/0x[\da-f]{64}$/i.test(h)));
    await page.screenshot({ path: `${output}/confirmed-local-test.png`, fullPage: true });
  });
  await check('account changes clear duplicate-vote state and leaderboard reads actual contract state', async () => {
    await page.evaluate((address) => window.validationChangeAccount(address), chain.accounts[1]);
    await page.getByRole('button', { name: 'Vote on Sepolia', exact: true }).waitFor();
    await page.locator('input[name="branch"]').last().check();
    await page.waitForFunction(() => ![...document.querySelectorAll('button')].find((b) => b.textContent === 'Vote on Sepolia')?.disabled);
    await page.getByRole('button', { name: 'Vote on Sepolia', exact: true }).click();
    await page.getByText('Waiting for two confirmations', { exact: true }).waitFor();
    await page.getByText('Vote confirmed on Sepolia', { exact: true }).waitFor({ timeout: 25000 });
    await page.waitForFunction(() => document.querySelectorAll('.leader-list li').length === 2);
    assert.equal(await chain.publicClient.readContract({ address: chain.address, abi: chain.voting.abi, functionName: 'totalVotes' }), 2n);
    assert.equal(errors.length, 0, errors.join('\n'));
  });
  await check('transaction hash and confirmed status survive a reload', async () => {
    await page.reload();
    await page.getByText('Vote confirmed on Sepolia', { exact: true }).waitFor({ timeout: 25000 });
    assert.ok(await page.locator('.transaction a').getAttribute('href'));
  });
  await context.close();
} catch { process.exitCode = 1; }
finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
  await chain.provider.disconnect();
  fs.writeFileSync(`${output}/results.json`, JSON.stringify({ testedAt: new Date().toISOString(), scope: 'Ephemeral local EVM with chain ID 11155111, synthetic API/config and test-only injected wallet. No Ethereum Sepolia deployment or signing was performed.', results }, null, 2));
}
