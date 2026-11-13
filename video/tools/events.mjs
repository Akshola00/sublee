// Read the sound cues the composition pushed onto window.SFX → events.json
import { chromium } from 'playwright';
import { writeFileSync } from 'node:fs';
const b = await chromium.launch({ channel: 'chrome' });
const p = await b.newPage();
await p.addInitScript(() => { window.__timelines = window.__timelines || {}; });
await p.goto('http://localhost:8765/index.html');
await p.waitForFunction(() => window.__ready === true);
const ev = await p.evaluate(() => window.SFX);
writeFileSync(new URL('../events.json', import.meta.url), JSON.stringify(ev, null, 1));
console.log(`${ev.length} events`);
await b.close();
