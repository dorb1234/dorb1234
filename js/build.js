/* Bloomy — bouquet studio page (build.html) */
(() => {
  'use strict';
  const D = window.BLOOMY;
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const money = n => `${Math.round(n).toLocaleString('he-IL')} ₪`;
  const byId = Object.fromEntries(D.flowers.map(f => [f.id, f]));
  const blank = () => Object.fromEntries(D.flowers.map(f => [f.id, 0]));
  const wrapNames = { kraft: 'נייר קראפט', blush: 'ורוד עדין', white: 'לבן', clear: 'שקוף' };
  const load = (k, d) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  let counts = blank();
  const saved = load('bloomy-builder', null);
  if (saved) for (const k in saved) if (k in counts) counts[k] = Math.max(0, Math.min(60, saved[k] | 0));
  let wrap = 'kraft'; try { const w = localStorage.getItem('bloomy-wrap'); if (wrapNames[w]) wrap = w; } catch (e) {}
  let seed = 7, step = 0;
  const history = [];

  const quote = c => Object.entries(c).reduce((a, [id, n]) => a + (byId[id]?.rate || 0) * n, 0);
  const stems = c => Object.values(c).reduce((a, b) => a + b, 0);
  const unitTxt = (f, n) => f.unit === 'ענף' ? (n === 1 ? 'ענף אחד' : n + ' ענפים') : (n === 1 ? 'גבעול אחד' : n + ' גבעולים');

  /* ---------- toast ---------- */
  let tt;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2600); }

  /* ---------- flower images ---------- */
  const leaf = '<svg viewBox="0 0 60 60" aria-hidden="true"><path d="M30 58 C10 40 8 18 30 2 C52 18 50 40 30 58Z" fill="#5f8a4d"/><path d="M30 56 L30 6" stroke="#3f6b33" stroke-width="2" fill="none"/></svg>';
  const pic = f => f.leaf ? leaf : `<img src="assets/flowers/${f.img}.webp" alt="" loading="lazy" draggable="false"${f.filter ? ` style="filter:${f.filter}"` : ''}>`;

  /* ---------- tray ---------- */
  const groups = [...new Set(D.flowers.map(f => f.group))];
  let tab = groups[0];
  $('#ftabs').innerHTML = groups.map(g => `<button type="button" class="chip small${g === tab ? ' on' : ''}" role="tab" aria-selected="${g === tab}" data-tab="${g}">${g}</button>`).join('');
  $('#tray').innerHTML = D.flowers.map(f => `
    <div class="b-flower" data-f="${f.id}" data-group="${f.group}">
      <button type="button" class="b-add" data-step="1" aria-label="הוספת ${f.name}">${pic(f)}<span class="b-count" aria-hidden="true">0</span></button>
      <strong>${f.name}</strong>
      <div class="b-step"><button type="button" data-step="-1" aria-label="הפחתת ${f.name}">−</button><output>0</output><button type="button" data-step="1" aria-label="הוספת ${f.name}">+</button></div>
    </div>`).join('');
  function showTab(g) {
    tab = g;
    $$('#ftabs .chip').forEach(c => { c.classList.toggle('on', c.dataset.tab === g); c.setAttribute('aria-selected', String(c.dataset.tab === g)); });
    $$('.b-flower').forEach(el => { el.hidden = el.dataset.group !== g; });
    $('#tray').scrollTop = 0; $('#tray').scrollLeft = 0;
  }
  $('#ftabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); });
  showTab(tab);

  $('#tray').addEventListener('click', e => {
    const b = e.target.closest('[data-step]'); if (!b) return;
    const id = b.closest('[data-f]').dataset.f, d = +b.dataset.step;
    if (d > 0 && stems(counts) >= D.maxStems) { toast(`עד ${D.maxStems} גבעולים בזר`); return; }
    const n = Math.max(0, Math.min(60, counts[id] + d)); if (n === counts[id]) return;
    remember(); counts[id] = n; update();
  });

  /* ---------- quick starts ---------- */
  $('#presets').innerHTML = Object.entries(D.presets).map(([k, p]) => `<button type="button" class="chip small" data-preset="${k}">${p.label}</button>`).join('') +
    '<button type="button" class="chip small surprise" id="b-surprise">✧ תפתיעו אותי</button>';
  $('#presets').addEventListener('click', e => {
    if (e.target.closest('#b-surprise')) { surprise(); return; }
    const b = e.target.closest('[data-preset]'); if (!b) return;
    remember(); counts = { ...blank(), ...D.presets[b.dataset.preset].counts }; seed++; update();
  });
  function surprise() {
    const keys = Object.keys(D.palettes), pal = D.palettes[keys[(Math.random() * keys.length) | 0]];
    const c = blank();
    pal.filter(id => !byId[id].filler).sort(() => Math.random() - .5).slice(0, 2 + (Math.random() * 2 | 0))
      .forEach((id, i) => { c[id] = (i ? 2 : 4) + (Math.random() * 3 | 0); });
    if (pal.includes('gypsophila')) c.gypsophila = 2 + (Math.random() * 2 | 0);
    if (pal.includes('greenery')) c.greenery = 2;
    remember(); counts = c; seed++; update();
  }

  /* ---------- tools ---------- */
  function remember() { history.push({ ...counts }); if (history.length > 40) history.shift(); }
  $('#b-undo').addEventListener('click', () => { if (history.length) { counts = history.pop(); update(); } });
  $('#b-shuffle').addEventListener('click', () => { seed++; draw(); });
  $('#b-clear').addEventListener('click', () => { if (!stems(counts)) return; remember(); counts = blank(); update(); toast('הזר נוקה · אפשר לבטל עם ↶'); });

  /* ---------- wrap ---------- */
  $$('[name=wrap]').forEach(r => {
    r.checked = r.value === wrap;
    r.addEventListener('change', () => { wrap = r.value; try { localStorage.setItem('bloomy-wrap', wrap); } catch (e) {} draw(); summary(); });
  });

  /* ---------- steps ---------- */
  const nextLabels = ['לבחירת עטיפה', 'לסיום', 'הוספה לסל'];
  function go(n) {
    if (n > 0 && quote(counts) < D.customMinimum) { note(true); toast(`הוסיפו עוד פרחים ב־${D.customMinimum - quote(counts)} ₪ כדי להמשיך`); n = 0; }
    step = n;
    $$('.b-pane').forEach(p => { p.hidden = +p.dataset.pane !== n; });
    $$('.b-steps [data-go]').forEach(b => { const on = +b.dataset.go === n; b.classList.toggle('on', on); b.classList.toggle('done', +b.dataset.go < n); b.setAttribute('aria-selected', String(on)); });
    $('#b-prev').hidden = n === 0;
    $('#b-next span').textContent = nextLabels[n];
    $('#b-next i').textContent = n === 2 ? '+' : '←';
    if (n === 2) summary();
  }
  $('.b-steps').addEventListener('click', e => { const b = e.target.closest('[data-go]'); if (b) go(+b.dataset.go); });
  $('#b-prev').addEventListener('click', () => go(step - 1));
  $('#b-next').addEventListener('click', () => { if (step < 2) go(step + 1); else addToCart(); });

  /* ---------- summary & cart ---------- */
  function summary() {
    const rows = D.flowers.filter(f => counts[f.id]).map(f => `<li><span class="b-sum-pic">${pic(f)}</span><span>${f.name}</span><b>${unitTxt(f, counts[f.id])}</b></li>`);
    rows.push(`<li><span class="b-sum-pic"><i class="wk ${wrap}"></i></span><span>עטיפה</span><b>${wrapNames[wrap]}</b></li>`);
    rows.push(`<li class="total"><span></span><span>מחיר הזר</span><b>${money(quote(counts))}</b></li>`);
    $('#summary').innerHTML = rows.join('');
    const lines = ['היי Bloomy 🌸 יש לי שאלה על זר בבנייה עצמית:', ...D.flowers.filter(f => counts[f.id]).map(f => `${f.name}: ${unitTxt(f, counts[f.id])}`), `עטיפה: ${wrapNames[wrap]}`, `מחיר משוער: ${quote(counts)} ₪`];
    $('#b-ask').href = `https://wa.me/${D.whatsapp}?text=${encodeURIComponent(lines.join('\n'))}`;
  }
  function addToCart() {
    const total = quote(counts); if (total < D.customMinimum) { go(0); return; }
    const c = Object.fromEntries(Object.entries(counts).filter(([, v]) => v));
    const key = 'c' + Object.entries(c).map(([k, v]) => k + v).join('') + wrap;
    const detail = `עטיפה: ${wrapNames[wrap]} · ` + D.flowers.filter(f => c[f.id]).map(f => `${f.name} × ${c[f.id]}`).join(', ');
    const cart = load('bloomy-cart', []).filter(i => i && i.key);
    const ex = cart.find(i => i.key === key);
    if (ex) ex.qty = Math.min(9, ex.qty + 1);
    else cart.push({ key, type: 'custom', name: 'זר בבנייה עצמית', price: total, counts: c, wrap: wrapNames[wrap], detail, thumbs: Object.keys(c).filter(k => !byId[k].leaf).slice(0, 4), qty: 1 });
    save('bloomy-cart', cart);
    location.href = 'index.html#cart';
  }
  function cartBadge() {
    const n = load('bloomy-cart', []).reduce((a, i) => a + (i?.qty || 0), 0), b = $('#cart-count');
    b.hidden = !n; b.textContent = n;
  }

  /* ---------- drawing ---------- */
  function draw() {
    const list = [];
    for (const f of D.flowers) for (let i = 0; i < counts[f.id]; i++) list.push({ key: f.id + '#' + i, id: f.id });
    $('#stage-empty').hidden = !!list.length;
    if (window.Studio3D) { window.Studio3D.set(list, seed, wrap); return; }
    // no WebGL: a simple picture collage of the chosen flowers
    const fb = $('#b-fallback'); fb.hidden = false;
    fb.innerHTML = list.slice(0, 40).map((x, i) => `<span style="--i:${i}">${pic(byId[x.id])}</span>`).join('');
  }
  function note(warn) {
    const total = quote(counts), el = $('#b-note');
    el.textContent = !stems(counts) ? 'מינימום 50 ₪ לזר' : total >= D.customMinimum ? '✓ הגעתם למינימום' : `עוד ${D.customMinimum - total} ₪ למינימום`;
    el.classList.toggle('ok', total >= D.customMinimum);
    el.classList.toggle('warn', !!warn && total < D.customMinimum);
  }
  function update() {
    save('bloomy-builder', counts);
    const total = quote(counts), n = stems(counts);
    const pe = $('#b-price'), before = pe.textContent; pe.textContent = money(total);
    if (before !== pe.textContent) { pe.classList.remove('bump'); void pe.offsetWidth; pe.classList.add('bump'); }
    $('#b-stems').textContent = n === 1 ? 'גבעול אחד' : `${n} גבעולים`;
    $('#b-undo').disabled = !history.length;
    $$('.b-flower').forEach(el => {
      const q = counts[el.dataset.f];
      el.classList.toggle('has', q > 0);
      el.querySelector('output').textContent = q;
      el.querySelector('.b-count').textContent = q;
    });
    $$('#ftabs .chip').forEach(c => { const k = D.flowers.filter(f => f.group === c.dataset.tab).reduce((a, f) => a + counts[f.id], 0); c.dataset.n = k || ''; });
    note();
    draw();
    if (step === 2) summary();
  }

  cartBadge();
  update();
  go(0);
})();
