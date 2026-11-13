// Screenshot looks.html for each look → stills/look-{A,B,C}.png
import { chromium } from 'playwright';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage({ viewport: { width: 1920, height: 1080 } });
for (const l of ['A', 'B', 'C']) {
  await p.goto(new URL(`../stills/looks.html?look=${l}`, import.meta.url).href);
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(1200);
  await p.reload(); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  await p.locator('#f').screenshot({ path: new URL(`../stills/look-${l}.png`, import.meta.url).pathname });
}
await b.close();
