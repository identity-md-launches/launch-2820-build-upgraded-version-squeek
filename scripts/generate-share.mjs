import fs from 'node:fs';
import { chromium } from 'playwright';

const forest = fs.readFileSync('public/forest.svg', 'utf8').replace(/<svg[^>]+>/, '<svg x="515" y="110" width="640" height="460" viewBox="80 0 800 580" preserveAspectRatio="xMidYMid slice">');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630"><defs><clipPath id="sceneClip"><rect x="515" y="70" width="640" height="500" rx="30"/></clipPath></defs><rect width="1200" height="630" fill="#f8f7f1"/><g clip-path="url(#sceneClip)">${forest}</g><g font-family="sans-serif" fill="#303e30"><text x="55" y="112" font-size="28" font-weight="700">Squeek Tales.</text><text x="55" y="254" font-size="62" font-weight="700" letter-spacing="-2">Little paws.</text><text x="55" y="327" font-size="62" font-weight="700" letter-spacing="-2" fill="#3d653f">Big adventures.</text><text x="57" y="390" font-size="23">A living story, one Squeekchain</text><text x="57" y="424" font-size="23">round at a time.</text><rect x="55" y="480" width="260" height="60" rx="12" fill="#3d653f"/><text x="85" y="518" font-size="22" fill="#fffefa">Follow the adventure →</text></g></svg>`;
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.setContent(`<style>body{margin:0}</style>${svg}`);
  await page.screenshot({ path: 'public/share.png' });
  console.log('Created public/share.png (1200 × 630).');
} finally { await browser.close(); }
