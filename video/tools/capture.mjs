// Drive the real app (dev server, NEAR testnet) and save each state as a full-page screenshot
// plus the boxes the camera and cursor will visit. Output: assets/shots/*.png + shots.json
// Usage: node tools/capture.mjs [baseUrl]
import { chromium } from 'playwright';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { homedir } from 'node:os';

const BASE = process.argv[2] ?? 'http://localhost:3000';
const OUT = new URL('../assets/shots/', import.meta.url).pathname;
mkdirSync(OUT, { recursive: true });
const PATIENT = 'patient.sublee.testnet';
const cred = JSON.parse(readFileSync(`${homedir()}/.near-credentials/testnet/${PATIENT}.json`, 'utf8'));
const shots = {};

const browser = await chromium.launch({ channel: 'chrome' });
const ctxOpts = { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: 'dark', reducedMotion: 'no-preference' };

async function boxes(page, sel) {
  const out = {};
  for (const [name, s] of Object.entries(sel)) {
    const loc = typeof s === 'string' ? page.locator(s).first() : s.first();
    const b = await loc.boundingBox().catch(() => null);
    const sy = await page.evaluate(() => window.scrollY);
    if (b) out[name] = { x: Math.round(b.x), y: Math.round(b.y + sy), w: Math.round(b.width), h: Math.round(b.height) };
    else console.warn(`  no box for ${name}`);
  }
  return out;
}

async function shot(page, name, sel = {}, { full = true } = {}) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(250);
  const b = await boxes(page, sel);
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage: full });
  shots[name] = { url: page.url().replace(BASE, '') || '/', height: full ? height : 900, boxes: b };
  console.log(`✓ ${name}  ${Object.keys(b).join(', ')}`);
}

// --- Signed out: home + sign-in dialog -------------------------------------------------
{
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  await page.goto(BASE, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(9000); // the hero card types, then really encrypts
  await page.screenshot({ path: `${OUT}home-hero.png` });
  shots['home-hero'] = { url: '/', height: 900, boxes: await boxes(page, { card: '.casecard', headline: 'h1', cta: 'text=Find a specialist' }) };
  console.log('✓ home-hero');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${OUT}signin.png` });
  shots['signin'] = { url: '/', height: 900, boxes: await boxes(page, { dialog: 'dialog.signin', email: 'text=Continue with email', wallet: 'text=Use a NEAR wallet' }) };
  console.log('✓ signin');
  await page.getByText('Continue with email').click();
  await page.waitForSelector('input[type=email]');
  await page.locator('input[type=email]').fill('you@example.com');
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}signin-email.png` });
  shots['signin-email'] = { url: '/', height: 900, boxes: await boxes(page, { dialog: 'dialog.signin', send: 'text=Send me a code' }) };
  console.log('✓ signin-email');
  await ctx.close();
}

// --- Signed in as the test patient (dev wallet): pay → case → verify → refund → example ---
{
  const ctx = await browser.newContext(ctxOpts);
  await ctx.addInitScript((w) => { window.__SUBLEE_DEV_WALLET = w; }, { accountId: PATIENT, privateKey: cred.private_key });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/specialist/1`, { waitUntil: 'networkidle' });
  await page.waitForSelector('text=One consult');
  await page.waitForTimeout(800);
  await shot(page, 'specialist', { near: page.locator('.pay-opt', { hasText: 'Pay from your wallet' }), usdc: page.locator('.pay-opt', { hasText: 'Stablecoin' }), credit: 'text=Card credit', title: 'h1', stepper: '.stepper' });

  await page.locator('.pay-opt', { hasText: 'Pay from your wallet' }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}paying.png` });
  shots['paying'] = { url: '/specialist/1', height: 900, boxes: await boxes(page, { near: page.locator('.pay-opt', { hasText: 'Pay from your wallet' }) }) };
  await page.waitForSelector('text=Try a sample case', { timeout: 60000 });
  await page.waitForTimeout(500);
  await shot(page, 'case-empty', { chip: page.locator('.chip', { hasText: 'Paid' }), sample: page.locator('button.chip').first(), samples: 'text=Try a sample case' });

  await page.locator('button.chip').first().click();
  await page.waitForTimeout(500);
  await shot(page, 'case-filled', { concern: 'textarea', send: 'text=Encrypt and send', chip: page.locator('.chip', { hasText: 'Paid' }) });

  await page.getByRole('button', { name: 'Encrypt and send' }).click();
  await page.waitForTimeout(700);
  await shot(page, 'verifying', { progress: '.thinking' }, { full: false });
  await page.waitForSelector('ul.trust', { timeout: 60000 });
  await page.waitForTimeout(300);
  await shot(page, 'checks', { trust: 'ul.trust', progress: '.thinking' });
  // Wait for the checks list, then the outcome (no credits today → refund).
  await page.waitForSelector('text=Show an example answer instead', { timeout: 120000 });
  await page.waitForTimeout(800);
  await shot(page, 'refunded', { notice: '.notice', example: 'text=Show an example answer instead', trust: 'ul.trust' });

  await page.getByText('Show an example answer instead').click();
  await page.waitForTimeout(1200);
  await shot(page, 'example', { banner: '.notice-warn, .notice-amber, .notice', summary: '.opinion, [class*=opinion]' });

  await page.goto(`${BASE}/create`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  await shot(page, 'create', { title: 'h1', mint: 'text=Seal and mint' });
  await ctx.close();
}

await browser.close();
writeFileSync(new URL('../shots.json', import.meta.url), JSON.stringify(shots, null, 1));
console.log('wrote shots.json');
