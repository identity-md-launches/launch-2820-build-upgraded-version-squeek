import fs from 'node:fs';
import assert from 'node:assert/strict';
import { chromium, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import { serve } from './static-server.mjs';

const output = 'test/scratch/browser-validation';
fs.mkdirSync(output, { recursive: true });
const results = [];
const { server, url } = await serve();
const fixture = JSON.parse(fs.readFileSync('tests/fixtures/core.json', 'utf8'));
const check = async (name, fn) => {
  try { const detail = await fn(); results.push({ name, passed: true, detail }); console.log(`PASS ${name}${detail ? `: ${detail}` : ''}`); }
  catch (error) { results.push({ name, passed: false, detail: error.message }); console.log(`FAIL ${name}: ${error.message.slice(0, 600)}`); }
};

try {
  for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
    let browser;
    try { browser = await engine.launch({ headless: true }); }
    catch (error) { results.push({ name: `${name}: engine launch`, passed: false, limitation: true, detail: error.message.split('\n').filter((l) => /error|shared|library|launch/i.test(l)).slice(0, 2).join(' ').slice(0, 240) }); console.log(`UNAVAILABLE ${name}: browser could not launch.`); continue; }
    try {
      const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await context.newPage();
      const errors = [];
      const missing = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('response', (r) => { if (r.url().startsWith(url) && r.status() >= 400) missing.push(`${r.status()} ${new URL(r.url()).pathname}`); });
      await check(`${name}: live production export and subpath assets`, async () => {
        await page.goto(url);
        await page.getByRole('heading', { name: 'Little paws. Big adventures.' }).waitFor();
        await page.waitForFunction(() => !document.body.textContent.includes('Reading the official round feed…'), { timeout: 25000 });
        await page.screenshot({ path: `${output}/${name}-390-live.png`, fullPage: true });
        assert.equal(errors.length, 0, errors.join('\n'));
        assert.equal(missing.length, 0, missing.join('\n'));
        assert.ok(await page.locator('.forest-art').evaluate((img) => img.complete && img.naturalWidth > 0));
        assert.ok(await page.evaluate(() => document.fonts.check('800 32px Nunito')));
        return 'Relative assets and local fonts loaded; no script errors or missing local files.';
      });
      await check(`${name}: 390px first-screen action`, async () => {
        const box = await page.getByRole('button', { name: 'Preview this path', exact: true }).boundingBox();
        assert.ok(box && box.y + box.height < 844, JSON.stringify(box));
        return `Primary button bottom ${Math.round(box.y + box.height)}px in an 844px viewport.`;
      });
      await check(`${name}: branch preview, keyboard dialog dismissal and focus return`, async () => {
        await page.locator('input[name="branch"]').first().check();
        const button = page.getByRole('button', { name: 'Preview this path', exact: true });
        await button.focus(); await page.keyboard.press('Enter');
        await page.getByRole('dialog').waitFor();
        assert.ok(await page.getByRole('dialog').innerText().then((t) => t.includes('story preview')));
        await page.keyboard.press('Escape');
        assert.equal(await page.getByRole('dialog').count(), 0);
        assert.ok(await button.evaluate((b) => b === document.activeElement));
      });
      await check(`${name}: wallet picker and no-extension failure`, async () => {
        await page.getByRole('button', { name: /^Connect(?: wallet)?$/ }).click();
        await page.getByRole('heading', { name: 'Connect a wallet' }).waitFor();
        await page.getByRole('button', { name: 'Browser wallet' }).click();
        await page.locator('.error-text').waitFor();
        assert.ok(!(await page.locator('.error-text').innerText()).includes('undefined'));
        await page.keyboard.press('Escape');
      });
      await check(`${name}: local preview progresses, persists and resets`, async () => {
        await page.getByRole('button', { name: 'Play a local preview' }).click();
        await page.locator('input[name="branch"]').last().check();
        await page.getByRole('button', { name: 'Continue the story' }).click();
        await page.getByText('Preview chapter 2', { exact: true }).waitFor();
        await page.reload();
        await page.getByRole('button', { name: 'Play a local preview' }).waitFor();
        await page.getByRole('button', { name: 'Play a local preview' }).click();
        await page.getByText('Preview chapter 2', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Start again' }).click();
        await page.getByText('Preview chapter 1', { exact: true }).waitFor();
        await page.getByRole('button', { name: 'Return to live story' }).click();
      });
      await check(`${name}: chapter history and settlement link`, async () => {
        await page.getByRole('button', { name: 'Past chapters' }).click();
        const first = page.locator('.history-row').first();
        if (await first.count()) {
          await first.click();
          assert.ok((await page.getByRole('link', { name: 'View the settlement' }).getAttribute('href')).startsWith('https://sepolia.etherscan.io/tx/'));
          await page.keyboard.press('Escape');
        } else { await page.getByRole('button', { name: 'Play a local preview', exact: true }).last().waitFor(); }
        await page.getByRole('button', { name: 'Back to the story' }).click();
      });
      await check(`${name}: responsive widths and enlarged text`, async () => {
        for (const width of [320, 390, 700, 960, 1440]) {
          await page.setViewportSize({ width, height: 1000 });
          assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `overflow at ${width}px`);
          await page.screenshot({ path: `${output}/${name}-${width}.png`, fullPage: true });
        }
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => { document.documentElement.style.fontSize = '32px'; });
        assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'overflow at 200% text size');
        await page.evaluate(() => { document.documentElement.style.fontSize = ''; });
        return '320, 390, 700, 960, 1440px; 200% CSS text enlargement. Native browser zoom not tested.';
      });
      await check(`${name}: automated accessibility of default page`, async () => {
        const axe = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa']).analyze();
        fs.writeFileSync(`${output}/${name}-axe.json`, JSON.stringify(axe.violations, null, 2));
        assert.equal(axe.violations.length, 0, axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(', ')}`).join('\n'));
        return 'No WCAG A/AA violations reported by axe in this state; not a complete accessibility certification.';
      });
      await check(`${name}: unavailable feed, recovery, and genuinely empty frontier`, async () => {
        await page.route('https://api.squeekchain.com/v1/core', (route) => route.fulfill({ json: { schemaVersion: 1, status: 'unavailable', reason: 'indexer_unavailable' } }));
        await page.reload();
        await page.getByRole('button', { name: 'Retry feed', exact: true }).waitFor({ timeout: 20000 });
        assert.ok((await page.locator('.feed-banner').innerText()).includes('unavailable'));
        assert.ok(await page.getByRole('button', { name: 'Preview this path', exact: true }).isDisabled());
        const empty = structuredClone(fixture); empty.core.settledThroughRound = '0'; empty.events = []; delete empty.source;
        await page.unroute('https://api.squeekchain.com/v1/core');
        await page.route('https://api.squeekchain.com/v1/core', (route) => route.fulfill({ json: empty }));
        await page.getByRole('button', { name: 'Retry feed', exact: true }).click();
        await page.getByText('The adventure begins soon', { exact: true }).waitFor();
        assert.ok((await page.locator('.chapter-body').innerText()).includes('first chapter begins'));
        await page.getByRole('button', { name: 'Past chapters' }).click();
        assert.equal(await page.locator('.history-row').count(), 0);
        await page.getByText('The first pages are still to come').waitFor();
        return 'Synthetic unavailable and empty-frontier responses used only in this test.';
      });
      await context.close();
      await check(`${name}: phone wallet links and marks`, async () => {
        const phone = await browser.newContext({ viewport: { width: 390, height: 844 }, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1' });
        const p = await phone.newPage();
        await p.goto(url);
        await p.getByRole('button', { name: /^Connect(?: wallet)?$/ }).click();
        for (const wallet of ['MetaMask', 'Coinbase Wallet', 'Rabby', 'Phantom']) {
          await p.getByRole('link', { name: `Open in ${wallet}`, exact: true }).waitFor();
        }
        await p.getByRole('button', { name: 'Coinbase Smart Wallet' }).waitFor();
        assert.ok(await p.locator('dialog img').evaluateAll((images) => images.every((img) => img.complete && img.naturalWidth > 0)));
        await p.screenshot({ path: `${output}/${name}-mobile-wallets.png` });
        await phone.close();
        return 'All four app links rendered; external app handoff and passkey signing not performed.';
      });
    } finally { await browser.close(); }
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
  fs.writeFileSync(`${output}/results.json`, JSON.stringify({ testedAt: new Date().toISOString(), results }, null, 2));
}
if (results.some((r) => !r.passed && !r.limitation)) process.exitCode = 1;
