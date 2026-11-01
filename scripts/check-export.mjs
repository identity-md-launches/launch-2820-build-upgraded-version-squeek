import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const required = ['dist/index.html', 'dist/config.json', 'dist/favicon.svg', 'dist/forest.svg', 'dist/share.png', 'dist/contracts/SqueekTalesVoting.json', 'package.json', 'package-lock.json', 'README.md', 'DESIGN.md', 'BUNDLE.md', 'artifacts/validation.md', 'artifacts/SqueekTalesVoting.abi.json', 'artifacts/SqueekTalesVoting.bytecode.txt', 'artifacts/integration.json', 'artifacts/taste.json', 'artifacts/browser-checks.json', 'artifacts/wallet-checks.json', 'artifacts/mobile.png', 'artifacts/desktop.png'];
for (const file of required) assert.ok(fs.statSync(file).size > 0, `${file} is empty`);
const html = fs.readFileSync('dist/index.html', 'utf8');
const assets = [...html.matchAll(/(?:src|href)="([^"]+)"/g)].map((m) => m[1]).filter((v) => !/^(https?:|data:|#)/.test(v));
for (const asset of assets) {
  assert.ok(asset.startsWith('./'), `Non-relative asset: ${asset}`);
  assert.ok(fs.statSync(path.join('dist', asset)).size > 0);
}
for (const attribute of ['<title>', 'name="description"', 'property="og:title"', 'property="og:image"', 'rel="icon"']) assert.ok(html.includes(attribute));
const png = fs.readFileSync('dist/share.png');
assert.equal(png.subarray(1, 4).toString(), 'PNG');
assert.equal(png.readUInt32BE(16), 1200); assert.equal(png.readUInt32BE(20), 630);
const contract = JSON.parse(fs.readFileSync('dist/contracts/SqueekTalesVoting.json'));
assert.ok(Array.isArray(contract.abi) && contract.abi.some((a) => a.name === 'VoteCast'));
assert.match(contract.bytecode, /^0x[\da-f]+$/i);
assert.deepEqual(contract.abi, JSON.parse(fs.readFileSync('artifacts/SqueekTalesVoting.abi.json')));
assert.equal(contract.bytecode, fs.readFileSync('artifacts/SqueekTalesVoting.bytecode.txt', 'utf8').trim());
const config = JSON.parse(fs.readFileSync('dist/config.json'));
assert.deepEqual(config, JSON.parse(fs.readFileSync('public/config.json')));
for (const file of ['artifacts/integration.json', 'artifacts/taste.json', 'artifacts/browser-checks.json', 'artifacts/wallet-checks.json']) JSON.parse(fs.readFileSync(file));
for (const [file, width, height] of [['artifacts/mobile.png', 390, 844], ['artifacts/desktop.png', 1440, null]]) {
  const image = fs.readFileSync(file);
  assert.equal(image.subarray(1, 4).toString(), 'PNG');
  assert.equal(image.readUInt32BE(16), width);
  if (height) assert.equal(image.readUInt32BE(20), height);
}
let bytes = 0, count = 0, distBytes = 0;
function walk(dir = '.') {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['.git', '.github', '.imd', '.playwright-mcp', 'node_modules'].includes(entry.name) || entry.name.startsWith('.env')) continue;
    const file = path.join(dir, entry.name);
    if (file === path.join('test', 'scratch')) continue;
    assert.ok(!entry.isSymbolicLink(), `Unexpected symlink: ${file}`);
    if (entry.isDirectory()) walk(file);
    else if (entry.isFile()) { const size = fs.statSync(file).size; bytes += size; count++; if (file.startsWith(`dist${path.sep}`)) distBytes += size; }
  }
}
walk();
assert.ok(bytes < 8388608, `Bundle is too large: ${bytes}`);
const reportFile = 'artifacts/export-check.json';
const oldSize = fs.existsSync(reportFile) ? fs.statSync(reportFile).size : 0;
const report = { requiredPathsValid: required.length, relativeAssetsValid: assets.length, shareImage: '1200 × 630 PNG', abiAndBytecodeMatch: true, configMatchesSource: true, deliveredFiles: count + (fs.existsSync(reportFile) ? 0 : 1), deliveredBytes: bytes, productionExportBytes: distBytes, budgetBytes: 8388608, excludes: 'Provided inputs, scratch checks, browser scratch outputs, dependency installations, Git metadata' };
const baseline = bytes - oldSize;
for (let i = 0; i < 5; i++) report.deliveredBytes = baseline + Buffer.byteLength(JSON.stringify(report, null, 2) + '\n');
assert.ok(report.deliveredBytes < 8388608, `Bundle is too large: ${report.deliveredBytes}`);
fs.writeFileSync(reportFile, JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2));
