// Scenes. Each pushes a builder; boot.js runs them in order. Every beat is pinned to a spoken word.

// ---------------------------------------------------------------- background lenses
BUILDERS.push(() => {
  const T = CUES.total;
  BG.dims.push([0, 1], [L('l06') - 0.6, 1], [L('l06') + 0.4, 1.25], [L('l08'), 1], [L('l11') - 0.4, 1], [L('l11') + 1.2, 0.45], [L('l28') - 1, 0.45], [L('l28'), 1], [T, 1]);
  // lens 1: top-left, drifting; lens 2: bottom-right
  BG.lenses.push([
    [0, 260, 240, 170, 70, 0], [at('l05', 'nobody') - 0.2, 260, 240, 170, 70, 0], [at('l05', 'nobody') + 0.8, 300, 250, 220, 88, 1],
    [L('l06'), 250, 190, 230, 92, 1], [L('l08') - 0.6, 250, 190, 230, 92, 1], [L('l08') + 0.4, 200, 130, 150, 60, 1], [L('l11') - 0.6, 200, 130, 150, 60, 1], [L('l11'), 300, 230, 230, 92, 1], [L('l28'), 190, 150, 170, 68, 1], [L('l31') - 0.5, 190, 150, 170, 68, 1], [T, 230, 180, 210, 84, 1],
  ]);
  BG.lenses.push([
    [0, 1640, 830, 180, 72, 0], [at('l05', 'not') - 0.2, 1640, 830, 180, 72, 0], [at('l05', 'not') + 0.8, 1610, 820, 240, 96, 1],
    [L('l06'), 1680, 920, 240, 96, 1], [L('l08') - 0.6, 1680, 920, 240, 96, 1], [L('l08') + 0.4, 1720, 940, 170, 68, 1], [L('l11') - 0.6, 1720, 940, 170, 68, 1], [L('l11'), 1620, 830, 240, 96, 1], [L('l28'), 1740, 970, 170, 68, 1], [L('l31') - 0.5, 1740, 970, 170, 68, 1], [T, 1700, 940, 210, 84, 1],
  ]);
  BG.bursts.push({ t: at('l06', 'sublee') - 0.02, x: 960, y: 470, dur: 1.6 }, { t: L('l31') - 0.02, x: 960, y: 420, dur: 1.4 });
  BG.start(T);
});

// ---------------------------------------------------------------- 1. cold open
BUILDERS.push(() => {
  const ids = ['#o-date', '#o-count', '#o-sub', '#o-largest', '#o-src', '#o-safe', '#o-chat', '#o-what', '#o-noteven'];
  ids.forEach((s) => gsap.set(s, { opacity: 0 }));
  riseIn($('#o-date'), at('l01', 'february'), 0.05);
  sfx(at('l01', 'february'), 'typing', -19, -0.2);
  show($('#o-count'), at('l01', 'ransomware') - 0.2, { from: { y: 40, scale: 0.96 } });
  const el = $('#o-count');
  const p = { _v: 0, get v() { return this._v; }, set v(x) { this._v = x; el.textContent = `${Math.round(x)} million`; } };
  p.v = 0;
  tl.to(p, { v: 190, duration: at('l01', 'ninety') - at('l01', 'attack') + 0.4, ease: 'power2.out' }, at('l01', 'attack'));
  sfx(at('l01', 'ninety') + 0.3, 'impact', -11, 0);
  show($('#o-sub'), at('l01', 'medical'));
  ['#o-date', '#o-count', '#o-sub'].forEach((s) => hide(s, L('l02') - 0.35));
  riseIn($('#o-largest'), L('l02'), 0.06);
  sfx(L('l02'), 'whoosh', -15, 0);
  gsap.set('#o-largest', { top: 360 });
  show($('#o-src'), at('l02', 'breach'));
  ['#o-largest', '#o-src'].forEach((s) => hide(s, L('l03') - 0.35));
  riseIn($('#o-safe'), L('l03'), 0.07);
  hide('#o-safe', L('l04') - 0.3);
  // the chat: your question flows to a company, then to everyone behind it
  const chat = $('#o-chat');
  gsap.set(chat, { opacity: 1 });
  const [bubble, arrow] = [chat.querySelector('.bubble'), chat.querySelector('.arrow')];
  const cos = [...chat.querySelectorAll('.co')];
  gsap.set([bubble, arrow, ...cos], { opacity: 0 });
  show(bubble, at('l04', 'ask'), { from: { y: 40, scale: 0.97 } });
  sfx(at('l04', 'ask'), 'pop', -15, -0.3);
  show(arrow, at('l04', 'handing'), { from: { x: -40, y: 0 } });
  sfx(at('l04', 'handing'), 'whoosh', -16, 0.2);
  show(cos[0], at('l04', 'data'), { from: { x: 60, y: 0 } });
  sfx(at('l04', 'data'), 'pop', -15, 0.4);
  cos.slice(1).forEach((c, i) => { const t = at('l04', 'more') + i * 0.28; show(c, t, { from: { x: 60, y: 0 } }); sfx(t, 'tick', -14, 0.4); });
  hide(chat, L('l05') - 0.4);
  riseIn($('#o-what'), L('l05'), 0.07);
  gsap.set('#o-what', { top: 360 });
  show($('#o-noteven'), at('l05', 'not'));
  sfx(at('l05', 'nobody'), 'sparkle', -17, 0);
  gsap.set('#o-noteven', { top: 560 });
  ['#o-what', '#o-noteven'].forEach((s) => hide(s, L('l06') - 0.55));
  sfx(at('l06', 'sublee') - 0.05, 'riser', -15, 0); // placed by peak (its end) → on the name
});

// ---------------------------------------------------------------- 2. title
BUILDERS.push(() => {
  const t = at('l06', 'sublee');
  gsap.set('#t-name', { opacity: 1 });
  gsap.set('#t-mark', { scale: 0, rotation: -40, transformOrigin: '50% 50%' });
  gsap.set('#t-word', { opacity: 0, x: -30 });
  tl.to('#t-mark', { scale: 1, rotation: 0, duration: 0.9, ease: 'back.out(1.2)' }, t - 0.12);
  tl.to('#t-word', { opacity: 1, x: 0, duration: 0.8, ease: 'expo.out' }, t);
  sfx(t, 'impact', -7, 0);
  gsap.set('#t-tag', { opacity: 0 });
  riseIn($('#t-tag'), L('l07'), 0.07);
  tl.to('#t-name', { scale: 1.035, duration: 3, ease: 'none' }, t + 0.8);
  hide('#t-name', L('l08') - 0.45);
  hide('#t-tag', L('l08') - 0.45);
});

// ---------------------------------------------------------------- 3. how it works
BUILDERS.push(() => {
  const hx = (seed, n) => Array.from({ length: n }, (_, i) => '0123456789abcdef'[Math.floor(hash(seed, i) * 16)]).join('');
  $('#h-hex1').textContent = hx(3, 230);
  $('#h-hex2').textContent = hx(9, 230);
  const nodes = ['#n-dev', '#n-srv', '#n-gw', '#n-enc'];
  nodes.forEach((n) => gsap.set(n, { opacity: 0, y: 40 }));
  gsap.set('#h-open', { opacity: 0 });
  gsap.set('#h-packet', { opacity: 0, x: 0, y: -10 });
  const t0 = L('l08');
  tl.to('#n-dev', { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' }, t0 - 0.2);
  sfx(t0 - 0.2, 'pop', -15, -0.5);
  // packet: sealed on the device, then hops along
  const tEnc = at('l08', 'encrypted');
  tl.to('#h-packet', { opacity: 1, duration: 0.3 }, tEnc);
  sfx(tEnc, 'tick', -14, -0.4);
  const hop = (i, t) => {
    tl.to('#h-packet', { x: i * 440, duration: 0.7, ease: 'power3.inOut' }, t);
    tl.to(nodes[i], { opacity: 1, y: 0, duration: 0.7, ease: 'expo.out' }, t + 0.1);
    sfx(t + 0.25, 'whoosh', -17, -0.4 + i * 0.3);
  };
  hop(1, at('l08', 'leaves'));
  hop(2, at('l09', 'opened'));
  hop(3, at('l09', 'enclave'));
  tl.to('#h-packet', { opacity: 0, scale: 0.6, duration: 0.3 }, at('l09', 'enclave') + 0.7);
  tl.to('#h-open', { opacity: 1, duration: 0.6 }, at('l09', 'enclave') + 0.7);
  sfx(at('l09', 'enclave') + 0.7, 'sparkle', -17, 0.5);
  // l10: what the server sees
  gsap.set('#h-cap', { opacity: 0 });
  $('#h-cap').innerHTML = 'Our server only sees <i>scrambled text.</i>';
  riseIn($('#h-cap'), L('l10'), 0.06);
  tl.to('#n-srv .nbox', { borderColor: '#6fe3c1', duration: 0.4 }, at('l10', 'server'));
  tl.to('#n-srv', { scale: 1.06, duration: 0.6, ease: 'expo.out' }, at('l10', 'server'));
  sfx(at('l10', 'server'), 'tick', -14, -0.2);
  ['#h-row', '#h-cap'].forEach((s) => hide(s, L('l11') - 0.7, 0.4));
});

// ---------------------------------------------------------------- chapter cards
function chapter(lid, num, title, tOut) {
  const c = document.createElement('div');
  c.className = 'card';
  c.id = `card-${lid}`;
  c.innerHTML = `<div class="disc"></div><div class="disc b"></div><div class="txt"><div class="num">${num}</div><div class="ttl">${title}</div></div>`;
  $('#cards').append(c);
  const [disc, ring, txt] = c.children;
  const tIn = L(lid) - 0.6;
  gsap.set(c, { opacity: 0 });
  gsap.set([disc, ring], { scale: 0 });
  gsap.set(txt, { opacity: 0, y: 40 });
  tl.set(c, { opacity: 1 }, tIn);
  tl.to(ring, { scale: 1, duration: 0.55, ease: 'power3.inOut' }, tIn);
  tl.to(disc, { scale: 1, duration: 0.6, ease: 'power3.inOut' }, tIn + 0.05);
  tl.to(txt, { opacity: 1, y: 0, duration: 0.6, ease: 'expo.out' }, tIn + 0.4);
  sfx(tIn + 0.3, 'whoosh', -15, 0);
  tl.to(txt, { opacity: 0, y: -30, duration: 0.3, ease: 'power3.in' }, tOut);
  tl.to([disc, ring], { scale: 0, duration: 0.55, ease: 'power3.inOut' }, tOut + 0.1);
  tl.set(c, { opacity: 0 }, tOut + 0.7);
}

// ---------------------------------------------------------------- 4. the app
BUILDERS.push(() => {
  // per-row boxes for the checks list (6 rows in ul.trust)
  for (const s of ['checks', 'refunded']) {
    const tb = SHOTS[s].boxes.trust;
    for (let i = 0; i < 6; i++) SHOTS[s].boxes[`row${i}`] = { x: tb.x, y: tb.y + (tb.h / 6) * i, w: tb.w, h: tb.h / 6 };
  }
  gsap.set('#cursor', { x: 960, y: 700, opacity: 0, transformOrigin: '3px 2px' });
  gsap.set('#cam', { scale: 1, x: 0, y: 0 });
  gsap.set('#browser', { transformOrigin: '50% 50%' });

  // Chapter 1: sign in
  const c1out = Lend('l11') + 0.15;
  chapter('l11', '01', 'Sign in', c1out);
  page('signin', c1out, 'localhost:3000', { rise: false });
  tl.to('#cursor', { opacity: 1, duration: 0.3 }, c1out + 0.4);
  ring('signin', 'wallet', at('l12', 'near'), at('l12', 'email'));
  cursorTo('signin', 'email', at('l12', 'or'));
  click(at('l12', 'email') + 0.1);
  page('signin-email', at('l12', 'email') + 0.3);
  sfx(at('l12', 'email') + 0.5, 'typing', -19, 0.1);
  focus('signin-email', 'dialog', L('l13'), { zmax: 1.45 });
  cursorTo('signin-email', 'send', at('l13', 'creates'));
  callout('+0.3 test NEAR<small>so you can try it, no wallet app needed</small>', 1260, 640, at('l13', 'test', 1), Lend('l13') + 0.6);
  wide(Lend('l13') + 0.2);

  // Chapter 2: pay, and it's held
  const c2out = Lend('l14') + 0.15;
  chapter('l14', '02', 'Pay, and it’s held', c2out);
  page('specialist', c2out, 'localhost:3000/specialist/1', { rise: false });
  push(c2out, 2.2);
  ring('specialist', 'credit', at('l15', 'card'), Lend('l15') + 0.2, { pad: 26 });
  ring('specialist', 'usdc', at('l15', 'usdc'), Lend('l15') + 0.2);
  ring('specialist', 'near', at('l15', 'near'), Lend('l15') + 0.2);
  cursorTo('specialist', 'near', at('l15', 'near') + 0.2, { dx: 0.85 });
  const tPay = Lend('l15') - 0.05;
  click(tPay);
  page('paying', tPay + 0.1, null, { rise: false });
  page('case-empty', L('l16') + 0.5, null);
  sfx(L('l16') + 0.5, 'confirm', -13, 0.2);
  focus('case-empty', 'chip', at('l16', 'escrow'), { zmax: 1.5 });
  ring('case-empty', 'chip', at('l16', 'escrow') + 0.3, Lend('l16') + 0.4);
  callout('Held in escrow on NEAR<small>released only when you get your answer</small>', 1150, 330, at('l16', 'released') - 0.3, Lend('l16') + 0.5);
  wide(Lend('l16') + 0.3);

  // Chapter 3: sealed and checked
  const c3out = Lend('l17') + 0.15;
  chapter('l17', '03', 'Sealed and checked', c3out);
  cursorTo('case-empty', 'sample', L('l18'));
  click(at('l18', 'anything') + 0.1);
  page('case-filled', at('l18', 'anything') + 0.2, null, { rise: false });
  sfx(at('l18', 'anything') + 0.25, 'typing', -19, -0.1);
  const sy = 536;
  scrollTo('case-filled', sy, at('l18', 'browser'));
  cursorTo('case-filled', 'send', at('l18', 'browser') + 0.5, { scroll: sy });
  click(at('l18', 'checks'));
  page('verifying', at('l18', 'checks') + 0.15, null, { rise: false });
  push(at('l18', 'checks') + 0.2, 1.6);
  page('checks', L('l19') - 0.25);
  sfx(L('l19') - 0.25, 'confirm', -13, 0);
  tl.to('#cursor', { opacity: 0, duration: 0.3 }, L('l19'));
  focus('checks', 'trust', L('l19'), { zmax: 1.5 });
  ring('checks', 'row3', at('l19', 'intel'), at('l19', 'nvidia') - 0.1, { pad: 4 });
  ring('checks', 'row4', at('l19', 'nvidia'), at('l19', 'both') - 0.1, { pad: 4 });
  ring('checks', 'row1', at('l19', 'both'), at('l19', 'just') , { pad: 4 });
  ring('checks', 'row2', at('l19', 'challenge'), Lend('l19'), { pad: 4 });
  ring('checks', 'row5', at('l20', 'encrypted'), Lend('l20') + 0.3, { pad: 4 });
  callout('Encrypted to a key that exists<br>only inside the enclave', 1240, 820, at('l20', 'key'), Lend('l20') + 0.4);
  wide(Lend('l20') + 0.2);

  // Chapter 4: the honest ending
  const c4out = Lend('l21') + 0.15;
  chapter('l21', '04', 'The honest ending', c4out);
  page('refunded', c4out, null, { rise: false });
  tl.to('#cursor', { opacity: 1, duration: 0.3 }, c4out + 0.2);
  focus('refunded', 'notice', L('l22'), { zmax: 1.5 });
  ring('refunded', 'notice', at('l22', 'can\'t', 2), Lend('l23') + 0.2);
  callout('Refunded on chain<small>automatically, nothing was read</small>', 1180, 200, at('l23', 'refunds'), Lend('l23') + 0.5);
  sfx(at('l23', 'refunds'), 'confirm', -13, 0.3);
  wide(Lend('l23'));
  cursorTo('refunded', 'example', L('l24'));
  click(at('l24', 'example'));
  page('example', at('l24', 'example') + 0.15);
  SHOTS.example.boxes.warn = { x: 370, y: 848, w: 700, h: 78 }; // the amber banner (measured from the shot)
  focus('example', 'warn', at('l24', 'clearly'), { zmax: 1.45 });
  ring('example', 'warn', at('l24', 'clearly') + 0.2, at('l24', 'never') + 0.6, { pad: 6 });
  callout('Example, written in advance<small>not generated, not signed, not saved</small>', 1120, 240, at('l24', 'never') - 0.4, Lend('l24') + 0.5, 'amber');
  wide(Lend('l24') + 0.1);
  scrollTo('example', 560, Lend('l24') + 0.1, 1.4);
  tl.to('#cursor', { opacity: 0, duration: 0.3 }, Lend('l24'));

  // For experts
  page('create', L('l25') - 0.3, 'localhost:3000/create');
  sfx(L('l25') - 0.3, 'whoosh', -15, 0.3);
  focus('create', 'title', at('l25', 'secret'), { zmax: 1.4 });
  callout('Secret prompt → NFT<small>NEP-171 on NEAR</small>', 1250, 150, at('l25', 'minted'), Lend('l25') + 0.4);
  wide(Lend('l25') + 0.1);
  scrollTo('create', 900, L('l26'), 1.2);
  tl.to('#cursor', { opacity: 1, duration: 0.3 }, L('l26'));
  cursorTo('create', 'mint', at('l26', 'sealed'), { scroll: 900 });
  ring('create', 'mint', at('l26', 'minting'), Lend('l26'), { scroll: 900 });
  callout('Sealed in your browser<small>patients and copycats can’t read it</small>', 1150, 300, at('l26', 'patients'), Lend('l26') + 0.4);
  callout('85% to the owner<small>of every consult · 15% to Sublee</small>', 1150, 470, at('l27', 'eighty'), Lend('l27') + 0.5);
  sfx(at('l27', 'eighty'), 'confirm', -13, 0.2);
  tl.to('#cursor', { opacity: 0, duration: 0.3 }, Lend('l27'));
  // the app shrinks into the lens and the story pulls back
  tl.to('#cam', { scale: 0.5, x: 480, y: 270, opacity: 0, duration: 0.8, ease: 'power3.in' }, Lend('l27') + 0.3);
  sfx(Lend('l27') + 0.5, 'whoosh', -15, 0);
});

// ---------------------------------------------------------------- 5. proof
BUILDERS.push(() => {
  ['#p-net', '#p1', '#p2', '#p3', '#p-hist', '#p-honest'].forEach((s) => gsap.set(s, { opacity: 0 }));
  gsap.set('.proofgrid', { opacity: 1 });
  riseIn($('#p-net'), L('l28') - 0.1, 0.05);
  const cell = (s, t) => { show($(s), t, { from: { y: 50, scale: 0.96 } }); sfx(t, 'pop', -15, 0); };
  cell('#p1', at('l29', 'twenty'));
  cell('#p2', at('l29', 'live'));
  cell('#p3', at('l29', 'payments'));
  tl.to('.proofgrid', { scale: 1.03, duration: 6, ease: 'none' }, at('l29', 'twenty'));
  riseIn($('#p-hist'), L('l30'), 0.05);
  show($('#p-honest'), L('l30') + 0.6);
  ['#p-net', '.proofgrid', '#p-hist', '#p-honest'].forEach((s) => hide(s, L('l31') - 0.6));
});

// ---------------------------------------------------------------- 6. close
BUILDERS.push(() => {
  const t = L('l31');
  ['#c-name', '#c-tag', '#c-meta', '#c-cred'].forEach((s) => gsap.set(s, { opacity: 0 }));
  show($('#c-name'), t - 0.05, { from: { y: 30, scale: 0.94 } });
  sfx(t, 'impact', -9, 0);
  riseIn($('#c-tag'), at('l31', 'a'), 0.07);
  show($('#c-meta'), Lend('l31') + 0.3);
  show($('#c-cred'), Lend('l31') + 0.9);
});
