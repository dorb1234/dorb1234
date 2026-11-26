/* Bloomy — custom bouquet studio */
(() => {
  'use strict';
  const D = window.BLOOMY;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const byId = Object.fromEntries(D.flowers.map(f => [f.id, f]));
  const blank = () => Object.fromEntries(D.flowers.map(f => [f.id, 0]));
  let counts = blank();
  try { const s = JSON.parse(localStorage.getItem('bloomy-builder')); if (s) for (const k in s) if (k in counts) counts[k] = Math.max(0, Math.min(60, s[k] | 0)); } catch (e) {}
  const history = [];
  let seed = 7, wrap = 'kraft', lastAdded = null;

  const quote = c => Object.entries(c).reduce((a, [id, n]) => a + (byId[id]?.rate || 0) * n, 0);
  const stems = c => Object.values(c).reduce((a, b) => a + b, 0);
  window.BloomyBuilder = { counts: () => ({ ...counts }), quote, byId };

  const imgSrc = f => f.img ? `assets/flowers/${f.img}.webp` : null;
  const leafSVG = `<svg viewBox="0 0 60 60"><path d="M30 58 C10 40 8 18 30 2 C52 18 50 40 30 58Z" fill="#5f8a4d"/><path d="M30 56 L30 6" stroke="#3f6b33" stroke-width="2" fill="none"/><path d="M30 20 L20 14 M30 30 L18 24 M30 40 L20 36 M30 20 L40 14 M30 30 L42 24 M30 40 L40 36" stroke="#3f6b33" stroke-width="1.2"/></svg>`;
  const thumb = f => f.leaf ? leafSVG : `<img src="${imgSrc(f)}" alt="" loading="lazy" style="${f.filter ? `filter:${f.filter} drop-shadow(0 4px 6px rgba(0,0,0,.15))` : ''}">`;
  window.BloomyBuilder.thumb = thumb;

  /* ---------- palette ---------- */
  const groups = [...new Set(D.flowers.map(f => f.group))];
  $('#flower-list').innerHTML = groups.map(g => {
    const fs = D.flowers.filter(f => f.group === g);
    const rate = [...new Set(fs.map(f => f.rate))].join('/');
    return `<div class="fgroup"><h4>${g} <small>${rate} ₪ ל${fs[0].unit || 'גבעול'}</small></h4><div class="fgrid">${fs.map(f => `
      <div class="fopt" data-f="${f.id}">
        <span class="qty-badge" aria-hidden="true">0</span>
        <button type="button" class="thumb" data-step="1" aria-label="הוספת ${f.name}">${thumb(f)}</button>
        <strong>${f.name}</strong><small>${f.rate} ₪ ל${f.unit || 'גבעול'}</small>
        <div class="stepper"><button type="button" data-step="-1" aria-label="הפחתת ${f.name}">−</button><output aria-live="polite">0</output><button type="button" data-step="1" aria-label="הוספת ${f.name}">+</button></div>
      </div>`).join('')}</div></div>`;
  }).join('');
  $('#presets').innerHTML = Object.entries(D.presets).map(([k, p]) => `<button type="button" class="chip" data-preset="${k}">${p.label}</button>`).join('');

  function remember() { history.push({ ...counts }); if (history.length > 40) history.shift(); }
  function change(id, d) {
    const f = byId[id]; if (!f) return;
    if (d > 0 && stems(counts) >= D.maxStems) { toast(`עד ${D.maxStems} גבעולים להרכב`); return; }
    const n = Math.max(0, Math.min(60, counts[id] + d));
    if (n === counts[id]) return;
    remember(); counts[id] = n; lastAdded = d > 0 ? id : null;
    update();
  }
  $('#flower-list').addEventListener('click', e => {
    const b = e.target.closest('[data-step]'); if (!b) return;
    change(b.closest('[data-f]').dataset.f, +b.dataset.step);
  });
  $('#presets').addEventListener('click', e => {
    const b = e.target.closest('[data-preset]'); if (!b) return;
    remember(); counts = { ...blank(), ...D.presets[b.dataset.preset].counts }; seed++; lastAdded = '*';
    update(); scrollStudio();
  });
  $('#b-undo').addEventListener('click', () => { if (!history.length) return; counts = history.pop(); lastAdded = null; update(); });
  $('#b-clear').addEventListener('click', () => { if (!stems(counts)) return; remember(); counts = blank(); update(); toast('הזר נוקה', { label: 'ביטול', run: () => $('#b-undo').click() }); });
  $('#b-shuffle').addEventListener('click', () => { seed++; lastAdded = '*'; draw(); });
  const wrapNames = { kraft: 'נייר קראפט', blush: 'ורוד עדין', white: 'לבן', clear: 'שקוף' };
  try { const w = localStorage.getItem('bloomy-wrap'); if (wrapNames[w]) wrap = w; } catch (e) {}
  $$('[name=wrap]').forEach(r => {
    r.checked = r.value === wrap;
    r.addEventListener('change', () => { wrap = r.value; $('#bq3').dataset.wrap = wrap; try { localStorage.setItem('bloomy-wrap', wrap); } catch (e) {} });
  });
  $('#bq3').dataset.wrap = wrap;
  window.BloomyBuilder.wrap = () => wrapNames[wrap];

  /* ---------- surprise / budget fit ---------- */
  function fit(c, cap) {
    if (!cap) return c;
    const r = { ...c }; let total = quote(r), guard = 400;
    while (total > cap && guard--) {
      const cand = Object.keys(r).filter(id => r[id] > 0 && total - byId[id].rate >= D.customMinimum)
        .sort((a, b) => (r[b] > 1) - (r[a] > 1) || (byId[b].filler ? 1 : 0) - (byId[a].filler ? 1 : 0) || byId[b].rate - byId[a].rate);
      if (!cand.length) break;
      r[cand[0]]--; total = quote(r);
    }
    return r;
  }
  $('#b-surprise').addEventListener('click', () => {
    const pal = D.palettes[$('#b-palette').value], cap = +$('#b-budget').value;
    const c = blank();
    const stars = pal.filter(id => !byId[id].filler).sort(() => Math.random() - .5).slice(0, 2 + (Math.random() * 2 | 0));
    stars.forEach((id, i) => { c[id] = (i === 0 ? 4 : 2) + (Math.random() * 3 | 0); });
    if (pal.includes('gypsophila')) c.gypsophila = 2 + (Math.random() * 2 | 0);
    if (pal.includes('greenery')) c.greenery = 2;
    let r = fit(c, cap);
    if (quote(r) < D.customMinimum) r = c;
    remember(); counts = r; seed++; lastAdded = '*';
    update(); scrollStudio();
  });
  $('#b-budget').addEventListener('change', e => {
    const cap = +e.target.value; if (!cap || quote(counts) <= cap) return;
    remember(); counts = fit(counts, cap); update();
    toast(`התאמנו את הזר לתקציב של ${cap} ₪`);
  });
  function scrollStudio() { if (matchMedia('(max-width:900px)').matches) $('#stage').scrollIntoView({ behavior: 'smooth', block: 'center' }); }

  /* ---------- bouquet drawing: flowers on a 3D dome, wrapped in two paper layers ---------- */
  function rng(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  const frond = (() => {
    const leaves = [];
    for (let i = 0; i < 7; i++) {
      const y = 108 - i * 14, side = i % 2 ? 1 : -1, len = 26 - i * 1.6, ang = side * (52 - i * 3);
      leaves.push(`<g transform="translate(30 ${y}) rotate(${ang})"><path d="M0 0 C7 ${-len * .35} 6 ${-len * .8} 0 ${-len} C-6 ${-len * .8} -7 ${-len * .35} 0 0Z" fill="#5d8a4c"/><path d="M0 0 C-6 ${-len * .4} -6 ${-len * .8} 0 ${-len}Z" fill="#7aa463"/><path d="M0 -1 L0 ${-len + 2}" stroke="#46703a" stroke-width=".8"/></g>`);
    }
    return `<svg viewBox="0 0 60 120" aria-hidden="true"><path d="M30 120 C29 90 31 50 30 6" stroke="#4d7a3d" stroke-width="2" fill="none"/>${leaves.join('')}<g transform="translate(30 10)"><path d="M0 0 C6 -8 5 -16 0 -20 C-5 -16 -6 -8 0 0Z" fill="#7aa463"/></g></svg>`;
  })();
  const kindScale = f => f.leaf ? 2.1 : f.id === 'gypsophila' ? 1.55 : f.bud ? .95 : f.id === 'sunflower' ? 1.12 : f.id.startsWith('lily-') ? 1.18 : f.id.startsWith('carnation') ? .92 : (f.scale || 1);
  const els = new Map(); // key -> element, reused so flowers glide to their new places
  let K = 1;
  function draw() {
    const heads = $('#bq-heads'), rand = rng(seed * 9973 + 1);
    K = ($('#bq3').clientWidth || 400) / 400;
    $('#bq3').style.setProperty('--k', K + 'px');
    const blooms = [], fills = [], leaves = [];
    for (const f of D.flowers) for (let i = 0; i < counts[f.id]; i++) (f.leaf ? leaves : f.filler ? fills : blooms).push({ f, key: f.id + '#' + i });
    const total = blooms.length + fills.length + leaves.length;
    $('#stage-empty').hidden = !!total;
    $('#bq3').classList.toggle('empty', !total);
    for (let i = blooms.length - 1; i > 0; i--) { const j = (rand() * (i + 1)) | 0; [blooms[i], blooms[j]] = [blooms[j], blooms[i]]; }
    const nb = Math.max(1, blooms.length);
    const R = 84 + 74 * Math.sqrt(Math.min(nb + fills.length * .4, 44) / 44);
    const beta = .55, thMax = 1.18, golden = Math.PI * (3 - Math.sqrt(5)), phi0 = rand() * 6.28;
    const e2 = [0, Math.cos(beta), Math.sin(beta)], ax = [0, -Math.sin(beta), Math.cos(beta)];
    const C = [200, 222, -R * .5];
    const base = 108 - 44 * Math.min(1, Math.max(0, (nb - 5) / 34));
    const pt = (th, ph, r) => {
      const lx = Math.sin(th) * Math.cos(ph), ly = Math.sin(th) * Math.sin(ph), lz = Math.cos(th);
      const n = [lx + ly * e2[0] + lz * ax[0], ly * e2[1] + lz * ax[1], ly * e2[2] + lz * ax[2]];
      return { x: C[0] + r * n[0], y: C[1] + r * n[1], z: C[2] + r * n[2], n };
    };
    const items = [];
    blooms.forEach((b, i) => {
      const c = 1 - (i + .5) / nb * (1 - Math.cos(thMax));
      const p = pt(Math.acos(c) + (rand() - .5) * .08, i * golden + phi0, R * (.97 + rand() * .06));
      items.push({ ...b, ...p, s: base * kindScale(b.f) * (.92 + rand() * .16), spin: rand() * 360, out: b.f.bud });
    });
    fills.forEach(b => {
      const p = pt(thMax * (.35 + rand() * .7), rand() * 6.28, R * 1.02);
      p.z -= 16; items.push({ ...b, ...p, s: base * kindScale(b.f) * (.9 + rand() * .3), spin: rand() * 40 - 20, out: true });
    });
    leaves.forEach((b, i) => {
      const ph = Math.PI + (i + .5) / leaves.length * Math.PI + (rand() - .5) * .3;
      const p = pt(thMax * 1.08, ph, R * 1.06);
      p.z -= 22; items.push({ ...b, ...p, s: base * kindScale(b.f), spin: 0, out: true, leaf: true });
    });
    const zs = items.map(i => i.z), zMin = Math.min(...zs, 0), zMax = Math.max(...zs, 1);
    const seen = new Set();
    for (const it of items) {
      seen.add(it.key);
      let el = els.get(it.key), fresh = false;
      if (!el) {
        el = document.createElement('span'); fresh = true;
        el.className = 'h3' + (it.leaf ? ' leaf' : '') + (it.f.id === 'gypsophila' ? ' gyp' : '');
        el.innerHTML = it.leaf ? frond : `<img src="${imgSrc(it.f)}" alt="" draggable="false">`;
        els.set(it.key, el); heads.append(el);
      }
      const n = it.n, depth = (it.z - zMin) / (zMax - zMin || 1);
      let ry = Math.atan2(n[0], n[2]) * 57.3 * .75, rx = Math.asin(Math.max(-1, Math.min(1, -n[1]))) * 57.3 * .55;
      let spin = it.spin;
      if (it.out) { spin = Math.atan2(it.y - C[1] + 30, it.x - C[0]) * 57.3 + 90; ry *= .4; rx *= .4; }
      const w = it.s * (it.leaf ? .5 : 1), h = it.s * (it.f.bud ? 1.25 : 1);
      el.style.cssText = `left:${(it.x / 4).toFixed(2)}%;top:${(it.y / 4.4).toFixed(2)}%;width:calc(${w.toFixed(1)} * var(--k));height:calc(${h.toFixed(1)} * var(--k));` +
        `transform:translate(-50%,-50%) translateZ(calc(${it.z.toFixed(1)} * var(--k))) rotateY(${ry.toFixed(1)}deg) rotateX(${rx.toFixed(1)}deg) rotateZ(${spin.toFixed(0)}deg);` +
        `--b:${(.72 + .3 * depth).toFixed(2)};--ff:${it.f.filter || 'saturate(1)'}`;
      if (fresh) { el.style.animationDelay = (lastAdded === '*' ? Math.random() * .5 : 0) + 's'; el.classList.add('grow'); }
    }
    for (const [k, el] of els) if (!seen.has(k)) { els.delete(k); el.classList.add('gone'); setTimeout(() => el.parentNode && el.parentNode.removeChild(el), 380); }
    const low = items.filter(i => i.y > 250).map(i => i.z);
    $('#wrap-front').style.transform = `translateZ(calc(${(Math.max(26, ...low) + 8).toFixed(0)} * var(--k)))`;
    $('#wrap-back').style.transform = `translateZ(calc(${(zMin - 30).toFixed(0)} * var(--k)))`;
    const m = Math.max(3, Math.min(16, Math.round(total * .55)));
    let st = '';
    for (let i = 0; i < m; i++) {
      const t = m === 1 ? .5 : i / (m - 1), x0 = 190 + t * 20, x1 = 182 + t * 36 + (rand() - .5) * 6, y1 = 420 + rand() * 14;
      st += `<path d="M${x0.toFixed(1)} 320 L${x1.toFixed(1)} ${y1.toFixed(1)}" stroke="${i % 3 ? '#5c8a45' : '#4b7638'}" stroke-width="4.2"/><ellipse cx="${x1.toFixed(1)}" cy="${y1.toFixed(1)}" rx="2.2" ry="1.2" fill="#a9c98d"/>`;
    }
    $('#bq-stems').innerHTML = total ? st : '';
  }
  addEventListener('resize', () => { const k = ($('#bq3').clientWidth || 400) / 400; if (Math.abs(k - K) > .01) draw(); });

  /* drag to turn the bouquet, gentle sway when idle */
  {
    const stage = $('#stage'), scene = $('#bq-scene');
    let ry = -8, rx = 4, tY = -8, tX = 4, dragging = null, on = false;
    const t0 = performance.now(), reduced = window.BloomyFX && window.BloomyFX.reduced;
    stage.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; dragging = { x: e.clientX, y: e.clientY, ry: tY, rx: tX }; stage.classList.add('turning'); });
    addEventListener('pointermove', e => {
      if (dragging) { tY = Math.max(-35, Math.min(35, dragging.ry + (e.clientX - dragging.x) * .3)); tX = Math.max(-6, Math.min(16, dragging.rx - (e.clientY - dragging.y) * .15)); }
    });
    stage.addEventListener('pointermove', e => {
      if (dragging || !(window.BloomyFX && window.BloomyFX.fine)) return;
      const r = stage.getBoundingClientRect(); tY = ((e.clientX - r.left) / r.width - .5) * 26; tX = 4 - ((e.clientY - r.top) / r.height - .5) * 10;
    });
    const end = () => { dragging = null; stage.classList.remove('turning'); };
    addEventListener('pointerup', end); addEventListener('pointercancel', end);
    stage.addEventListener('pointerleave', () => { if (!dragging) { tY = -8; tX = 4; } });
    function tick(now) {
      if (!on) return;
      const sway = reduced || dragging ? 0 : Math.sin((now - t0) / 2200) * 5;
      ry += (tY + sway - ry) * .08; rx += (tX - rx) * .08;
      scene.style.transform = `rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg)`;
      requestAnimationFrame(tick);
    }
    new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting; if (on && !was) requestAnimationFrame(tick); }).observe(stage);
  }

  /* ---------- update ---------- */
  const describe = c => D.flowers.filter(f => c[f.id]).map(f => `${f.name} × ${c[f.id]}`).join(', ');
  function waText() {
    const lines = ['היי Bloomy 🌸 יש לי שאלה על זר בבנייה עצמית:'];
    D.flowers.filter(f => counts[f.id]).forEach(f => lines.push(`${f.name}: ${counts[f.id] === 1 ? (f.unit === 'ענף' ? 'ענף אחד' : 'גבעול אחד') : counts[f.id] + (f.unit === 'ענף' ? ' ענפים' : ' גבעולים')}`));
    lines.push(`עטיפה: ${wrapNames[wrap]}`);
    lines.push(`מחיר משוער: ${quote(counts)} ₪`);
    return lines.join('\n');
  }
  function update() {
    try { localStorage.setItem('bloomy-builder', JSON.stringify(counts)); } catch (e) {}
    const total = quote(counts), n = stems(counts), ok = total >= D.customMinimum;
    const pe = $('#b-price'); const old = pe.textContent; pe.textContent = money(total);
    if (old !== pe.textContent) { pe.classList.remove('bump'); void pe.offsetWidth; pe.classList.add('bump'); }
    $('#b-stems').textContent = n;
    $('#b-meter').style.width = Math.min(100, total / D.customMinimum * 100) + '%';
    const note = $('#b-meter-note');
    note.textContent = !n ? 'הוסיפו פרחים ב־50 ₪ כדי להגיע למינימום' : ok ? '✓ הגעתם למינימום — אפשר להוסיף לסל' : `עוד ${D.customMinimum - total} ₪ למינימום ההזמנה`;
    note.classList.toggle('ok', ok);
    $('#b-add').disabled = !ok;
    $('#b-undo').disabled = !history.length;
    $('#b-ask').href = `https://wa.me/${D.whatsapp}?text=${encodeURIComponent(waText())}`;
    $$('.fopt').forEach(el => {
      const q = counts[el.dataset.f];
      el.classList.toggle('has', q > 0);
      el.querySelector('output').textContent = q;
      el.querySelector('.qty-badge').textContent = q;
    });
    const cap = +$('#b-budget').value;
    if (cap && total > cap) { note.textContent = `שימו לב: ${money(total)} — מעל התקציב שבחרתם (${cap} ₪)`; note.classList.remove('ok'); }
    draw();
    $('#bbar-price').textContent = money(total);
    $('#bbar-stems').textContent = n === 1 ? 'גבעול אחד' : `${n} גבעולים`;
    $('#bbar-add').disabled = !ok;
    $('#bbar-heads').innerHTML = D.flowers.filter(f => counts[f.id] && f.img).slice(0, 4).map(f => `<img src="${imgSrc(f)}" alt="" style="${f.filter ? 'filter:' + f.filter : ''}">`).join('');
  }

  $('#b-add').addEventListener('click', () => {
    const total = quote(counts); if (total < D.customMinimum) return;
    const c = Object.fromEntries(Object.entries(counts).filter(([, v]) => v));
    const key = 'c' + Object.entries(c).map(([k, v]) => k + v).join('');
    const first = D.flowers.find(f => c[f.id] && !f.filler) || D.flowers.find(f => c[f.id]);
    BloomyCart.add({ key: key + wrap, type: 'custom', name: 'זר בבנייה עצמית', price: total, counts: c, wrap: wrapNames[wrap], detail: `עטיפה: ${wrapNames[wrap]} · ` + describe(c), thumbs: Object.keys(c).filter(k => !byId[k].leaf).slice(0, 4) });
    if (first?.img) flyTo($('#bouquet'), imgSrc(first));
    toast('הזר האישי שלכם נוסף לסל 💐', { label: 'לסל', run: () => window.openCart?.() });
  });

  /* mobile sticky bar: visible while the flower list is on screen but the stage is not */
  const bbar = $('#bbar'); let listIn = false, stageIn = false;
  const sync = () => { const on = listIn && !stageIn; bbar.classList.toggle('show', on); bbar.setAttribute('aria-hidden', String(!on)); };
  new IntersectionObserver(([e]) => { listIn = e.isIntersecting; sync(); }).observe($('#flower-list'));
  new IntersectionObserver(([e]) => { stageIn = e.isIntersecting; sync(); }, { threshold: .35 }).observe($('#stage'));
  $('#bbar-peek').addEventListener('click', () => $('#stage').scrollIntoView({ behavior: 'smooth', block: 'center' }));
  $('#bbar-add').addEventListener('click', () => $('#b-add').click());

  update();
})();
