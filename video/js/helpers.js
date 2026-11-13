// Shared helpers. Everything is placed on one paused GSAP timeline; nothing uses callbacks.
const tl = gsap.timeline({ paused: true });
const BUILDERS = [];
window.SFX = [];
const $ = (s) => document.querySelector(s);

/** Time a word starts in a line (n-th match). Throws when missing, so timing bugs can't hide. */
function at(lid, word, n = 1, edge = 1) {
  const ws = CUES.words[lid];
  if (!ws) throw new Error(`no line ${lid}`);
  let k = 0;
  for (const [w, s, e] of ws) if (w === word && ++k === n) return edge === 1 ? s : e;
  throw new Error(`word "${word}" #${n} not in ${lid}: ${ws.map((w) => w[0]).join(' ')}`);
}
const L = (lid) => CUES.lines[lid][0];
const Lend = (lid) => CUES.lines[lid][1];

function sfx(t, name, gain = 0, pan = 0) {
  if (!Number.isFinite(t)) throw new Error(`bad sfx time for ${name}`);
  window.SFX.push({ t: +t.toFixed(3), name, gain, pan });
}

/** Split text into word spans for word-by-word entrances. */
function splitWords(el) {
  const walk = (node) => {
    for (const c of [...node.childNodes]) {
      if (c.nodeType === 3) {
        const frag = document.createDocumentFragment();
        c.textContent.split(/(\s+)/).forEach((p) => {
          if (!p) return;
          if (/^\s+$/.test(p)) frag.append(p);
          else { const s = document.createElement('span'); s.className = 'w'; s.textContent = p; frag.append(s); }
        });
        c.replaceWith(frag);
      } else if (c.nodeType === 1 && c.tagName !== 'SVG' && !c.classList.contains('w')) walk(c);
    }
  };
  walk(el);
  return [...el.querySelectorAll('.w')];
}

/** Words rise in (40px) one after another starting at t. */
function riseIn(el, t, stagger = 0.06, dur = 0.7) {
  const ws = splitWords(el);
  gsap.set(el, { opacity: 1 });
  gsap.set(ws, { opacity: 0, y: 40 });
  ws.forEach((w, i) => tl.to(w, { opacity: 1, y: 0, duration: dur, ease: 'expo.out' }, t + i * stagger));
  return ws;
}
function show(el, t, vars = {}) {
  gsap.set(el, { opacity: 0, y: 30, ...(vars.from || {}) });
  tl.to(el, { opacity: 1, y: 0, x: 0, scale: 1, duration: 0.7, ease: 'expo.out', ...(vars.to || {}) }, t);
}
function hide(el, t, dur = 0.35) {
  tl.to(el, { opacity: 0, y: -24, duration: dur, ease: 'power3.in' }, t);
}

// ---- Browser, camera, cursor ----------------------------------------------------------
const K = 1560 / 1440;                 // page px → frame px
const VX = 180, VY = 30 + 44;          // viewport origin in frame
const IMGS = {};
let scrollOf = {};                     // current scroll (page px) per shot, for box mapping at build time

function img(name) {
  if (IMGS[name]) return IMGS[name];
  const el = document.createElement('img');
  el.src = `assets/shots/${name}.png`;
  el.id = `shot-${name}`;
  $('#viewport').append(el);
  IMGS[name] = el;
  scrollOf[name] = 0;
  return el;
}
function box(name, key) {
  const b = SHOTS[name]?.boxes?.[key];
  if (!b) throw new Error(`no box ${name}.${key}`);
  return b;
}
/** Box (page coords) → frame coords, given the shot's scroll at that moment. */
function toFrame(b, scroll = 0) {
  return { x: VX + b.x * K, y: VY + (b.y - scroll) * K, w: b.w * K, h: b.h * K };
}

let current = null;
/** Switch the visible screenshot at t (new one rises in). */
function page(name, t, url, { rise = true } = {}) {
  const el = img(name);
  gsap.set(el, { opacity: 0, y: 0 });
  if (current && current !== el) tl.to(current, { opacity: 0, duration: 0.25, ease: 'power2.out' }, t);
  if (rise) { tl.set(el, { y: 34 }, t); tl.to(el, { opacity: 1, y: 0, duration: 0.45, ease: 'expo.out' }, t); }
  else tl.to(el, { opacity: 1, duration: 0.2 }, t);
  if (url) urlTo(url, t);
  current = el;
}
const URLS = [];
function urlTo(text, t) {
  URLS.push([t, text]);
}
function scrollTo(name, y, t, dur = 0.8) {
  tl.to(img(name), { y: -y * K, duration: dur, ease: 'power3.inOut' }, t);
  scrollOf[name] = y;
}

const CAM = { z: 1, x: 0, y: 0 };
/** Frame a box (page coords of a shot) with the camera. */
function focus(name, key, t, { zmax = 1.6, dur = 0.9, pad = 1, scroll } = {}) {
  const f = toFrame(box(name, key), scroll ?? scrollOf[name]);
  let z = Math.min(zmax, (0.92 * 1920) / (f.w * pad), (0.88 * 1080) / (f.h * pad));
  z = Math.max(1, z);
  const cx = f.x + f.w / 2, cy = f.y + f.h / 2;
  let x = 960 - cx * z, y = 540 - cy * z;
  // keep the browser's edges outside the frame once it is bigger than the frame; centre it otherwise
  x = 1560 * z >= 1920 ? Math.min(-180 * z, Math.max(1920 - 1740 * z, x)) : 960 - 960 * z;
  y = 1019 * z >= 1080 ? Math.min(-30 * z, Math.max(1080 - 1049 * z, y)) : 540 - 539.5 * z;
  tl.to('#cam', { scale: z, x, y, duration: dur, ease: 'power3.inOut' }, t);
  Object.assign(CAM, { z, x, y });
}
function wide(t, dur = 0.9) {
  tl.to('#cam', { scale: 1, x: 0, y: 0, duration: dur, ease: 'power3.inOut' }, t);
}
/** Slow push during a hold, so nothing sits still. */
function push(t, dur) {
  tl.to('#browser', { scale: 1.03, duration: dur, ease: 'none' }, t);
  tl.to('#browser', { scale: 1, duration: 0.6, ease: 'power2.inOut' }, t + dur);
}

function cursorTo(name, key, t, { scroll, dx = 0.5, dy = 0.5 } = {}) {
  const f = toFrame(box(name, key), scroll ?? scrollOf[name]);
  tl.to('#cursor', { x: f.x + f.w * dx - 3, y: f.y + f.h * dy - 2, duration: 0.5, ease: 'power3.inOut' }, t);
}
function click(t) {
  tl.to('#cursor', { scale: 0.82, duration: 0.08, ease: 'power2.in' }, t - 0.08);
  tl.to('#cursor', { scale: 1, duration: 0.3, ease: 'back.out(2)' }, t);
  tl.set('#ripple', { opacity: 0.9, scale: 0.3 }, t);
  tl.to('#ripple', { opacity: 0, scale: 1.6, duration: 0.6, ease: 'expo.out' }, t);
  sfx(t, 'click', -10, 0.1);
}

let ringN = 0;
/** Glowing ring around a box from t1 to t2. */
function ring(name, key, t1, t2, { scroll, pad = 8 } = {}) {
  const f = toFrame(box(name, key), scroll ?? scrollOf[name]);
  const r = document.createElement('div');
  r.className = 'ring';
  r.id = `ring${ringN++}`;
  Object.assign(r.style, { left: `${f.x - pad}px`, top: `${f.y - pad}px`, width: `${f.w + pad * 2}px`, height: `${f.h + pad * 2}px` });
  $('#rings').append(r);
  gsap.set(r, { opacity: 0, scale: 1.04 });
  tl.to(r, { opacity: 1, scale: 1, duration: 0.4, ease: 'expo.out' }, t1);
  tl.to(r, { opacity: 0, duration: 0.3, ease: 'power3.in' }, t2);
  sfx(t1, 'tick', -14, 0.15);
  return r;
}

let calloutN = 0;
/** A callout in screen space (above the frame), never over the thing it explains. */
function callout(html, x, y, t1, t2, cls = '') {
  const c = document.createElement('div');
  c.className = `callout ${cls}`;
  c.id = `callout${calloutN++}`;
  c.innerHTML = html;
  Object.assign(c.style, { left: `${x}px`, top: `${y}px` });
  $('#callouts').append(c);
  gsap.set(c, { opacity: 0, x: 70 });
  tl.to(c, { opacity: 1, x: 0, duration: 0.45, ease: 'expo.out' }, t1);
  tl.to(c, { opacity: 0, x: 30, duration: 0.3, ease: 'power3.in' }, t2);
  sfx(t1, 'pop', -15, 0.3);
  return c;
}

/** Deterministic pseudo-random from integers. */
function hash(a, b = 0, c = 0) {
  let h = (a * 374761393 + b * 668265263 + c * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
