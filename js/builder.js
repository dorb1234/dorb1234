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
  let seed = 7, wrap = true, lastAdded = null;

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
  $('#b-wrap').addEventListener('click', () => { wrap = !wrap; $('#bouquet').classList.toggle('nowrap', !wrap); $('#b-wrap').textContent = wrap ? '🎀 עטיפה' : '🎀 בלי עטיפה'; });

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

  /* ---------- bouquet drawing ---------- */
  function rng(s) { return () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; }; }
  function draw() {
    const heads = $('#bq-heads'), rand = rng(seed * 9973 + 1);
    const list = [];
    for (const f of D.flowers) for (let i = 0; i < counts[f.id]; i++) list.push(f);
    $('#stage-empty').hidden = !!list.length;
    if (!list.length) { heads.innerHTML = ''; return; }
    // fillers in the back, big blooms spread through the front
    const fillers = list.filter(f => f.filler), blooms = list.filter(f => !f.filler);
    for (let i = blooms.length - 1; i > 0; i--) { const j = (rand() * (i + 1)) | 0; [blooms[i], blooms[j]] = [blooms[j], blooms[i]]; }
    const n = list.length, golden = Math.PI * (3 - Math.sqrt(5));
    const base = Math.max(17, Math.min(34, 34 - (n - 6) * .45));
    const html = [];
    const place = (f, i, total, layer) => {
      const t = Math.sqrt((i + .5) / total);
      const a = i * golden + rand() * .4;
      const rx = layer ? 44 : 36, ry = layer ? 58 : 50;
      const x = 50 + Math.cos(a) * t * rx;
      let y = 60 + Math.sin(a) * t * ry * .78 - (1 - t) * 8;
      y = Math.min(y, 92);
      const scale = (f.scale || 1) * (f.bud ? .78 : f.id.startsWith('sunflower') ? 1.08 : f.id.startsWith('lily-') ? 1.12 : 1);
      const s = base * scale * (layer ? 1.15 : 1) * (.9 + rand() * .2);
      const r = (rand() - .5) * (f.bud || f.leaf ? 70 : 30) + (f.leaf ? (x - 50) * 1.6 : 0);
      const z = layer ? 1 : 10 + Math.round(100 - y);
      const d = lastAdded === '*' ? (i * .03).toFixed(2) : (lastAdded === f.id ? 0 : -1);
      const style = `--x:${x.toFixed(1)}%;--y:${y.toFixed(1)}%;--s:${s.toFixed(1)}%;--r:${r.toFixed(0)}deg;--z:${z};${d < 0 ? 'animation:none;transform:rotate(var(--r))' : `--d:${d}s`}`;
      const inner = f.leaf ? leafSVG : `<img src="${imgSrc(f)}" alt="" style="${f.filter ? 'filter:' + f.filter : ''}">`;
      html.push(`<span class="head${f.leaf ? ' leaf' : ''}" style="${style}">${inner}</span>`);
    };
    fillers.forEach((f, i) => place(f, i, Math.max(fillers.length, 1), true));
    blooms.forEach((f, i) => place(f, i, blooms.length, false));
    heads.innerHTML = html.join('');
    // newest bloom animates in: mark only one copy of the last-added flower
    if (lastAdded && lastAdded !== '*') {
      const all = $$('.head', heads).filter(h => h.style.getPropertyValue('--d') === '0s');
      all.slice(0, -1).forEach(h => { h.style.animation = 'none'; h.style.transform = 'rotate(var(--r))'; });
    }
  }

  /* ---------- update ---------- */
  const describe = c => D.flowers.filter(f => c[f.id]).map(f => `${f.name} × ${c[f.id]}`).join(', ');
  function waText() {
    const lines = ['היי Bloomy 🌸 יש לי שאלה על זר בבנייה עצמית:'];
    D.flowers.filter(f => counts[f.id]).forEach(f => lines.push(`${f.name}: ${counts[f.id] === 1 ? (f.unit === 'ענף' ? 'ענף אחד' : 'גבעול אחד') : counts[f.id] + (f.unit === 'ענף' ? ' ענפים' : ' גבעולים')}`));
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
    BloomyCart.add({ key, type: 'custom', name: 'זר בבנייה עצמית', price: total, counts: c, detail: describe(c), thumbs: Object.keys(c).filter(k => !byId[k].leaf).slice(0, 4) });
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
