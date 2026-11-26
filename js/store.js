/* Bloomy — catalog, favorites, finder, gallery and cart state */
(() => {
  'use strict';
  const D = window.BLOOMY;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const money = n => `${Math.round(n).toLocaleString('he-IL')} ₪`;
  const photo = img => `assets/photos/${img}.webp`;
  window.money = money;

  const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
  const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  /* ================= CART ================= */
  const listeners = new Set();
  let cart = load('bloomy-cart', []).filter(i => i && i.key && i.qty > 0);
  const emit = () => { save('bloomy-cart', cart); listeners.forEach(f => f(cart)); };
  const Cart = window.BloomyCart = {
    items: () => cart,
    subscribe: f => { listeners.add(f); f(cart); },
    count: () => cart.reduce((a, i) => a + i.qty, 0),
    subtotal: () => cart.reduce((a, i) => a + i.price * i.qty, 0),
    add(item) {
      const ex = cart.find(i => i.key === item.key);
      if (ex) ex.qty = Math.min(9, ex.qty + 1); else cart.push({ ...item, qty: 1 });
      emit();
    },
    setQty(key, q) {
      const i = cart.find(x => x.key === key); if (!i) return;
      i.qty = Math.max(0, Math.min(9, q));
      if (!i.qty) cart = cart.filter(x => x !== i);
      emit();
    },
    remove(key) { const old = cart.slice(); cart = cart.filter(x => x.key !== key); emit(); return () => { cart = old; emit(); }; },
    clear() { cart = []; emit(); }
  };
  Cart.subscribe(() => {
    const n = Cart.count(), b = $('#cart-count');
    b.hidden = !n; b.textContent = n;
    b.classList.remove('pop'); void b.offsetWidth; b.classList.add('pop');
  });

  function flyTo(fromEl, src) {
    if (window.BloomyFX.reduced || !fromEl) return;
    const target = $('#cart-open').getBoundingClientRect(), r = fromEl.getBoundingClientRect();
    const img = document.createElement('img');
    img.src = src; img.className = 'fly'; img.alt = '';
    img.style.left = r.left + r.width / 2 - 35 + 'px'; img.style.top = r.top + r.height / 2 - 35 + 'px';
    document.body.append(img);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      img.style.left = target.left + target.width / 2 - 18 + 'px';
      img.style.top = target.top + target.height / 2 - 18 + 'px';
      img.style.width = img.style.height = '36px'; img.style.opacity = '.4';
    }));
    setTimeout(() => img.remove(), 950);
  }
  window.flyTo = flyTo;

  function addProduct(p, fromEl) {
    Cart.add({ key: 'p' + p.id, type: 'product', id: p.id, name: p.name, price: p.price, img: photo(p.img), detail: p.short });
    flyTo(fromEl, photo(p.img));
    toast(`״${p.name}״ נוסף לסל 🌸`, { label: 'לסל', run: () => window.openCart?.() });
  }

  /* ================= FAVORITES ================= */
  let favs = new Set(load('bloomy-favs', []));
  const syncFavs = () => {
    save('bloomy-favs', [...favs]);
    const b = $('#fav-count'); b.hidden = !favs.size; b.textContent = favs.size;
    $$('[data-fav]').forEach(h => h.setAttribute('aria-pressed', String(favs.has(+h.dataset.fav))));
    if (state.filter === 'fav') render();
  };
  function toggleFav(id, btn) {
    favs.has(id) ? favs.delete(id) : favs.add(id);
    if (btn && favs.has(id)) { btn.classList.remove('burst'); void btn.offsetWidth; btn.classList.add('burst'); }
    syncFavs();
  }

  /* ================= GRID ================= */
  const heartSVG = '<svg viewBox="0 0 24 24"><path d="M12 20.5s-7.5-4.6-9.3-9.4C1.4 7.6 3.6 4 7.2 4c2 0 3.6 1.1 4.8 2.8C13.2 5.1 14.8 4 16.8 4c3.6 0 5.8 3.6 4.5 7.1-1.8 4.8-9.3 9.4-9.3 9.4Z"/></svg>';
  const state = { filter: 'all', q: '', sort: 'featured' };
  const grid = $('#grid');

  function cardHTML(p, i) {
    return `<article class="card" style="--i:${i}" data-id="${p.id}">
      ${p.badge ? `<span class="tag">${p.badge}</span>` : ''}
      <button type="button" class="icon-btn heart" data-fav="${p.id}" aria-pressed="${favs.has(p.id)}" aria-label="מועדפים: ${p.name}">${heartSVG}</button>
      <button type="button" class="card-media" data-qv="${p.id}" aria-label="מבט מקרוב על ${p.name}">
        <img src="${photo(p.img)}" alt="${p.short}" loading="lazy" width="600" height="800"><span class="peek">מבט מקרוב</span>
      </button>
      <div class="card-body">
        <div class="card-row"><h3>${p.name}</h3><span class="price">${money(p.price)}</span></div>
        <p>${p.short}</p>
        <button type="button" class="add-btn" data-add="${p.id}"><span>זה הזר שלי</span><b aria-hidden="true">+</b></button>
      </div>
    </article>`;
  }
  function visible() {
    const q = state.q.trim();
    let list = D.products.filter(p => {
      if (state.filter === 'under100' && p.price > 100) return false;
      if (state.filter === 'fav' && !favs.has(p.id)) return false;
      if (['pink', 'white', 'yellow'].includes(state.filter) && p.tone !== state.filter) return false;
      if (q && !(p.name + ' ' + p.short + ' ' + p.tags.join(' ')).includes(q)) return false;
      return true;
    });
    if (state.sort === 'low') list = list.slice().sort((a, b) => a.price - b.price);
    if (state.sort === 'high') list = list.slice().sort((a, b) => b.price - a.price);
    return list;
  }
  function render() {
    const list = visible();
    grid.innerHTML = list.map(cardHTML).join('');
    $('#empty').hidden = !!list.length;
    if (state.filter === 'fav' && !favs.size) $('#empty').innerHTML = 'עוד אין מועדפים. לחצו על ♡ בזר שאהבתם.';
    else $('#empty').innerHTML = 'לא מצאנו זר בשילוב הזה. נסו סינון אחר — או <a href="#builder">הרכיבו זר אישי</a>.';
  }
  function setFilter(f) {
    state.filter = f;
    $$('#filters .chip').forEach(c => c.classList.toggle('on', c.dataset.filter === f));
    render();
  }
  $('#filters').addEventListener('click', e => { const c = e.target.closest('[data-filter]'); if (c) setFilter(c.dataset.filter); });
  let st; $('#search').addEventListener('input', e => { clearTimeout(st); st = setTimeout(() => { state.q = e.target.value; render(); }, 120); });
  $('#sort').addEventListener('change', e => { state.sort = e.target.value; render(); });
  $$('[data-jump-filter]').forEach(a => a.addEventListener('click', () => setFilter(a.dataset.jumpFilter)));

  document.addEventListener('click', e => {
    const fav = e.target.closest('[data-fav]');
    if (fav) { toggleFav(+fav.dataset.fav, fav); return; }
    const add = e.target.closest('[data-add]');
    if (add) {
      const p = D.products.find(x => x.id === +add.dataset.add);
      addProduct(p, add.closest('.card')?.querySelector('img') || add);
      add.classList.add('added'); add.querySelector('span').textContent = 'נוסף לסל ✓';
      setTimeout(() => { add.classList.remove('added'); add.querySelector('span').textContent = 'זה הזר שלי'; }, 1800);
      return;
    }
    const qv = e.target.closest('[data-qv]');
    if (qv) openQV(+qv.dataset.qv);
  });

  /* ================= QUICK VIEW ================= */
  const dlg = $('#qv'); let qvId = null;
  function openQV(id) {
    const p = D.products.find(x => x.id === id); if (!p) return;
    qvId = id;
    $('#qv-img').src = photo(p.img); $('#qv-img').alt = p.short;
    $('#qv-title').textContent = p.name; $('#qv-price').textContent = money(p.price);
    $('#qv-long').textContent = p.long;
    $('#qv-tags').innerHTML = p.tags.map(t => `<li>${t}</li>`).join('');
    const h = $('#qv-fav'); h.dataset.fav = id; h.setAttribute('aria-pressed', String(favs.has(id)));
    if (!dlg.open) dlg.showModal();
  }
  window.openQV = openQV;
  const step = d => { const ids = D.products.map(p => p.id); openQV(ids[(ids.indexOf(qvId) + d + ids.length) % ids.length]); };
  $('#qv-next').addEventListener('click', () => step(1));
  $('#qv-prev').addEventListener('click', () => step(-1));
  dlg.addEventListener('keydown', e => { if (e.key === 'ArrowLeft') step(1); if (e.key === 'ArrowRight') step(-1); });
  $('#qv-add').addEventListener('click', e => { addProduct(D.products.find(p => p.id === qvId), $('#qv-img')); dlg.close(); });
  // zoom on hover
  const qimg = $('#qv-img');
  qimg.addEventListener('pointermove', e => { if (!window.BloomyFX.fine) return; const r = qimg.getBoundingClientRect(); qimg.style.transformOrigin = `${(e.clientX - r.left) / r.width * 100}% ${(e.clientY - r.top) / r.height * 100}%`; qimg.style.transform = 'scale(1.6)'; });
  qimg.addEventListener('pointerleave', () => { qimg.style.transform = ''; });
  $$('dialog').forEach(d => {
    d.addEventListener('click', e => { if (e.target === d || e.target.closest('[data-close]')) d.close(); });
  });

  /* ================= FAVORITES DIALOG ================= */
  $('#fav-open').addEventListener('click', () => {
    const list = $('#fav-list');
    const items = D.products.filter(p => favs.has(p.id));
    list.innerHTML = items.length ? items.map(p => `<button type="button" class="fr-item" data-qv="${p.id}"><img src="${photo(p.img)}" alt=""><span><strong>${p.name}</strong><small>${money(p.price)}</small></span></button>`).join('')
      : '<p class="fr-none">עוד אין מועדפים. לחצו על ♡ בזר שאהבתם ✿</p>';
    $('#favs').showModal();
  });
  $('#fav-list').addEventListener('click', e => { if (e.target.closest('[data-qv]')) $('#favs').close(); });

  /* ================= 3D RING GALLERY ================= */
  {
    const order = [4, 3, 5, 1, 2, 7, 6, 8], ring = $('#ring'), stage = $('#ring-stage');
    ring.innerHTML = order.map((id, i) => {
      const p = D.products.find(x => x.id === id);
      return `<button type="button" class="ring-item" data-qv="${p.id}" style="--i:${i}"><img src="${photo(p.img)}" alt="צילום אמיתי: ${p.short}" loading="lazy" draggable="false"><span class="ri-cap"><b>${p.name}</b><small>${money(p.price)}</small></span></button>`;
    }).join('');
    const n = order.length, step = 360 / n;
    let angle = 0, vel = 0, drag = null, moved = 0, on = false, last = performance.now();
    const reduced = window.BloomyFX.reduced;
    function layout() {
      const w = stage.clientWidth, item = Math.min(260, Math.max(150, w * .2));
      const r = Math.round((item / 2) / Math.tan(Math.PI / n) * 1.12);
      stage.style.setProperty('--item', item + 'px'); stage.style.setProperty('--r', r + 'px');
    }
    layout(); addEventListener('resize', layout);
    stage.addEventListener('pointerdown', e => { drag = e.clientX; moved = 0; vel = 0; stage.classList.add('grab'); });
    addEventListener('pointermove', e => { if (drag === null) return; const d = e.clientX - drag; drag = e.clientX; moved += Math.abs(d); vel = d * .25; angle += d * .25; });
    addEventListener('pointerup', () => { drag = null; stage.classList.remove('grab'); });
    stage.addEventListener('click', e => { if (moved > 6) { e.stopPropagation(); e.preventDefault(); } }, true);
    function tick(now) {
      if (!on) return;
      const dt = Math.min(50, now - last); last = now;
      if (drag === null) { vel *= .95; angle += vel + (reduced ? 0 : dt * .008); }
      ring.style.transform = `translateZ(calc(var(--r) * -1)) rotateY(${angle.toFixed(2)}deg)`;
      // brighten the item facing the viewer
      const front = ((Math.round(-angle / step) % n) + n) % n;
      ring.querySelectorAll('.ring-item').forEach((el, i) => el.classList.toggle('front', i === front));
      requestAnimationFrame(tick);
    }
    new IntersectionObserver(([e]) => { const was = on; on = e.isIntersecting; if (on && !was) { last = performance.now(); requestAnimationFrame(tick); } }).observe(stage);
  }

  render(); syncFavs();
})();
