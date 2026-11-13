// Always-on subtitles from the word times: chunks of at most 7 words / 44 characters.
BUILDERS.push(() => {
  const box = document.getElementById('subs');
  box.innerHTML = '';
  let n = 0;
  for (const [lid, ws] of Object.entries(CUES.words)) {
    const chunks = [];
    let cur = [];
    const len = (c) => c.map((w) => w[3]).join(' ').length;
    for (const w of ws) {
      if (cur.length && (cur.length >= 7 || len([...cur, w]) > 44)) { chunks.push(cur); cur = []; }
      cur.push(w);
      const end = /[.?!]$/.test(w[3]) || (/,$/.test(w[3]) && cur.length >= 3);
      if (end) { chunks.push(cur); cur = []; }
    }
    if (cur.length) chunks.push(cur);
    chunks.forEach((c, i) => {
      const el = document.createElement('div');
      el.className = 'subchunk';
      el.id = `sub${n++}`;
      el.textContent = c.map((w) => w[3]).join(' ');
      box.append(el);
      const t1 = c[0][1] - 0.06;
      const next = chunks[i + 1];
      const t2 = next ? next[0][1] - 0.04 : CUES.lines[lid][1] + 0.45;
      gsap.set(el, { opacity: 0 });
      tl.set(el, { opacity: 1 }, t1);
      tl.set(el, { opacity: 0 }, t2);
    });
  }
});
