// Cipher field: a wall of hex. Inside the logo's lens (where two circles meet) it reads as letters.
// Drawn only from the timeline clock, so any seeked frame gives the same pixels.
const BG = {
  lenses: [],   // keyframes per lens: [[t, x, y, r, d, a], ...]
  bursts: [],   // {t, x, y, dur}
  dims: [],     // [t, level] keyframes for overall brightness
};
(function () {
  const cv = document.getElementById('bg'), g = cv.getContext('2d');
  const W = 1920, H = 1080, CW = 15, CH = 30, COLS = Math.ceil(W / CW), ROWS = Math.ceil(H / CH);
  const HEX = '0123456789abcdef';
  const TEXT = 'tired for three months ferritin nine haemoglobin ten point nine mother had thyroid disease iron tablets since june short of breath on stairs no known allergies worried about the result ';
  const lerp = (a, b, k) => a + (b - a) * k;
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  function kf(list, t) {
    if (!list.length) return null;
    if (t <= list[0][0]) return list[0].slice(1);
    for (let i = 1; i < list.length; i++) {
      if (t <= list[i][0]) {
        const a = list[i - 1], b = list[i], k = ease((t - a[0]) / (b[0] - a[0]));
        return a.slice(1).map((v, j) => lerp(v, b[j + 1], k));
      }
    }
    return list[list.length - 1].slice(1);
  }
  function draw(t) {
    g.fillStyle = '#070b0b';
    g.fillRect(0, 0, W, H);
    const dim = (kf(BG.dims, t) || [1])[0];
    if (dim <= 0.001) return;
    const lenses = BG.lenses.map((l) => kf(l, t)).filter((l) => l && l[4] > 0.01);
    g.font = '500 19px "JetBrains Mono"';
    g.textBaseline = 'middle';
    const tick = Math.floor(t * 3);
    const buckets = new Map();
    const put = (style, ch, x, y) => { let b = buckets.get(style); if (!b) buckets.set(style, (b = [])); b.push(ch, x, y); };
    for (let r = 0; r < ROWS; r++) {
      const y = r * CH + 18;
      for (let c = 0; c < COLS; c++) {
        const x = c * CW + 4;
        // quiet centre, detail at the edges
        const ex = (x - W / 2) / (W * 0.46), ey = (y - H / 2) / (H * 0.42);
        const edge = Math.min(1, (ex * ex + ey * ey) * 0.9);
        let inLens = 0;
        for (const [lx, ly, lr, ld, la] of lenses) {
          const dx1 = x - (lx - ld), dx2 = x - (lx + ld), dy = y - ly;
          if (dx1 * dx1 + dy * dy < lr * lr && dx2 * dx2 + dy * dy < lr * lr) { inLens = la; break; }
        }
        let burst = 0;
        for (const b of BG.bursts) {
          const k = (t - b.t) / b.dur;
          if (k < 0 || k > 1) continue;
          const d = Math.hypot(x - b.x, y - b.y), rad = k * 1400;
          burst = Math.max(burst, Math.max(0, 1 - Math.abs(d - rad) / 90) * (1 - k));
        }
        const h = hash(c, r, Math.floor(tick / 2 + hash(c, r) * 9));
        if (inLens > 0) {
          const ch = TEXT[(r * 37 + c) % TEXT.length];
          put(`rgba(111,227,193,${(0.75 * inLens * dim).toFixed(2)})`, ch, x, y);
          continue;
        }
        const a = (0.035 + 0.24 * edge * (0.35 + 0.65 * h) + 0.7 * burst) * dim;
        if (a < 0.02) continue;
        const q = Math.round(a * 20) / 20;
        put(burst > 0.15 ? `rgba(111,227,193,${q})` : `rgba(111,130,124,${q})`, HEX[Math.floor(h * 16)], x, y);
      }
    }
    for (const [style, arr] of buckets) {
      g.fillStyle = style;
      for (let i = 0; i < arr.length; i += 3) g.fillText(arr[i], arr[i + 1], arr[i + 2]);
    }
    // lens outlines (the logo's two circles)
    g.lineWidth = 2;
    for (const [lx, ly, lr, ld, la] of lenses) {
      g.strokeStyle = `rgba(233,242,239,${(0.22 * la * dim).toFixed(2)})`;
      for (const k of [-1, 1]) { g.beginPath(); g.arc(lx + k * ld, ly, lr, 0, Math.PI * 2); g.stroke(); }
    }
  }
  const clock = { _t: -1, get t() { return this._t; }, set t(v) { this._t = v; draw(v); } };
  BG.start = (total) => {
    clock.t = 0;
    tl.to(clock, { t: total, duration: total, ease: 'none' }, 0);
  };
})();
