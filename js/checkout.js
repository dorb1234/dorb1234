/* Bloomy — cart drawer & checkout (order is sent as a WhatsApp request) */
(() => {
  'use strict';
  const D = window.BLOOMY, Cart = window.BloomyCart;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const drawer = $('#drawer');
  let step = 0, lastFocus = null;

  const o = {
    fulfil: 'pickup', point: null, label: '', fee: null, routed: false, regional: false,
    date: '', name: '', phone: '', notes: '', addr: '',
    greet: '', sign: '', who: 'love', cstyle: 'blush', pay: 'לתאם עם העסק'
  };
  try { const s = JSON.parse(localStorage.getItem('bloomy-order') || 'null'); if (s) { ['greet', 'sign', 'who', 'cstyle', 'name', 'phone', 'notes'].forEach(k => { if (typeof s[k] === 'string') o[k] = s[k]; }); } } catch (e) {}
  const persist = () => { try { localStorage.setItem('bloomy-order', JSON.stringify({ greet: o.greet, sign: o.sign, who: o.who, cstyle: o.cstyle, name: o.name, phone: o.phone, notes: o.notes })); } catch (e) {} };

  /* ---------- open / close ---------- */
  function openCart(at = 0) {
    lastFocus = document.activeElement;
    drawer.hidden = false; drawer.classList.remove('closing');
    document.body.style.overflow = 'hidden';
    go(at);
    setTimeout(() => $('.drawer-panel .close').focus(), 60);
  }
  function closeCart() {
    drawer.classList.add('closing');
    setTimeout(() => { drawer.hidden = true; drawer.classList.remove('closing'); document.body.style.overflow = ''; lastFocus?.focus?.(); }, 380);
  }
  window.openCart = openCart;
  $('#cart-open').addEventListener('click', () => openCart(0));
  $$('[data-open-cart]').forEach(b => b.addEventListener('click', () => openCart(Cart.count() ? 1 : 0)));
  drawer.addEventListener('click', e => { if (e.target.closest('[data-close-drawer]')) closeCart(); });
  document.addEventListener('keydown', e => {
    if (drawer.hidden) return;
    if (e.key === 'Escape') closeCart();
    if (e.key === 'Tab') { // focus trap
      const f = $$('button:not([disabled]),a[href],input,select,textarea,summary', drawer.querySelector('.drawer-panel')).filter(x => x.offsetParent);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f.at(-1).focus(); }
      else if (!e.shiftKey && document.activeElement === f.at(-1)) { e.preventDefault(); f[0].focus(); }
    }
  });

  /* ---------- steps ---------- */
  function go(n) {
    step = Math.max(0, Math.min(3, n));
    $$('.step-pane').forEach(p => p.hidden = +p.dataset.pane !== step);
    $$('#steps li').forEach(li => { const i = +li.dataset.step; li.classList.toggle('on', i === step); li.classList.toggle('done', i < step); });
    $('#prev-step').hidden = step === 0;
    $('#next-step').hidden = step === 3;
    $('#send-wa').hidden = step !== 3;
    $('#copy-order').hidden = step !== 3;
    $('#next-step span').textContent = ['לקבלת הזר', 'לברכה', 'לסיכום', ''][step];
    $('#next-step').disabled = step === 0 && !Cart.count();
    feedback('');
    if (step === 3) refreshMsg();
    $('.drawer-body').scrollTop = 0;
    if (step === 1 && o.fulfil === 'delivery' && $('#map-box').open) initMap();
  }
  $('#steps').addEventListener('click', e => { const li = e.target.closest('li'); if (!li) return; const t = +li.dataset.step; if (t <= step || validate(step, t)) go(t); });
  $('#next-step').addEventListener('click', () => { if (validate(step, step + 1)) go(step + 1); });
  $('#prev-step').addEventListener('click', () => go(step - 1));

  function feedback(t, el) {
    $('#feedback').textContent = t;
    if (el) { el.classList.remove('invalid'); void el.offsetWidth; el.classList.add('invalid'); el.focus(); setTimeout(() => el.classList.remove('invalid'), 1200); }
  }
  function check(s) {
    if (s === 0 && !Cart.count()) return ['הסל ריק — הוסיפו זר כדי להמשיך.'];
    if (s === 1) {
      if (o.fulfil === 'delivery') {
        if (!o.point && !o.addr.trim()) return ['הזינו כתובת או בחרו עיר למשלוח.', '#addr'];
        if (!o.name.trim()) return ['מה השם של המקבל/ת?', '#r-name'];
        const d = o.phone.replace(/\D/g, '');
        if (d.length < 9 || d.length > 15) return ['בדקו את מספר הטלפון של המקבל/ת.', '#r-phone'];
      }
      if (!o.date) return ['בחרו תאריך מבוקש להזמנה.', '#o-date'];
      if (o.date < today()) return ['בחרו תאריך מהיום והלאה.', '#o-date'];
    }
    return null;
  }
  function validate(from, to) {
    for (let s = from; s < to; s++) {
      const err = check(s);
      if (err) { if (step !== s) go(s); feedback(err[0], err[1] && $(err[1])); return false; }
    }
    return true;
  }

  /* ---------- cart list ---------- */
  function itemThumb(i) {
    if (i.type === 'product') return `<img src="${i.img}" alt="">`;
    const B = window.BloomyBuilder, pos = [[8, 8], [38, 6], [20, 34], [42, 40]];
    return `<div class="ci-mini">${(i.thumbs || []).map((id, k) => { const f = B.byId[id]; return f?.img ? `<img src="assets/flowers/${f.img}.webp" style="left:${pos[k][0]}%;top:${pos[k][1]}%;${f.filter ? 'filter:' + f.filter : ''}" alt="">` : ''; }).join('')}</div>`;
  }
  function renderCart() {
    const items = Cart.items();
    $('#cart-empty').hidden = !!items.length;
    $('#cart-items').innerHTML = items.map(i => `
      <div class="ci" data-key="${i.key}">
        <div class="ci-img">${itemThumb(i)}</div>
        <div><strong>${i.name}</strong><small>${i.detail || ''}</small></div>
        <div class="ci-side"><span class="ci-price">${money(i.price * i.qty)}</span>
          <div class="stepper"><button type="button" data-q="-1" aria-label="הפחתה">−</button><output>${i.qty}</output><button type="button" data-q="1" aria-label="הוספה">+</button></div>
          <button type="button" class="ci-remove" data-rm>הסרה</button></div>
      </div>`).join('');
    if (step === 0) $('#next-step').disabled = !items.length;
    totals();
  }
  $('#cart-items').addEventListener('click', e => {
    const row = e.target.closest('[data-key]'); if (!row) return;
    const key = row.dataset.key, it = Cart.items().find(x => x.key === key);
    if (e.target.closest('[data-q]')) Cart.setQty(key, it.qty + +e.target.closest('[data-q]').dataset.q);
    if (e.target.closest('[data-rm]')) { const undo = Cart.remove(key); toast(`״${it.name}״ הוסר`, { label: 'ביטול', run: undo }); }
  });
  Cart.subscribe(renderCart);

  /* ---------- totals ---------- */
  function totals() {
    const sub = Cart.subtotal(), pickup = o.fulfil === 'pickup';
    $('#t-items').textContent = money(sub);
    $('#t-ship-label').textContent = pickup ? 'איסוף עצמי' : 'משלוח משוער';
    $('#t-ship').textContent = pickup ? 'ללא תשלום' : o.fee == null ? (o.point ? 'מחשבים…' : 'לפי כתובת') : 'כ־' + money(o.fee);
    $('#t-total').textContent = (pickup ? money(sub) : o.fee == null ? money(sub) + ' + משלוח' : 'כ־' + money(sub + o.fee));
  }

  /* ---------- fulfilment ---------- */
  $$('[name=fulfil]').forEach(r => r.addEventListener('change', () => {
    o.fulfil = r.value; $('#delivery-fields').hidden = o.fulfil !== 'delivery'; totals();
  }));
  $('#city-chips').innerHTML = D.cities.filter(c => c.name !== 'כפר מסריק').map(c => `<button type="button" class="chip" data-city="${c.name}">${c.name}</button>`).join('');
  $('#city-chips').addEventListener('click', e => {
    const b = e.target.closest('[data-city]'); if (!b) return;
    const c = D.cities.find(x => x.name === b.dataset.city);
    $$('#city-chips .chip').forEach(x => x.classList.toggle('on', x === b));
    $('#addr').value = c.name; o.addr = c.name;
    choose({ lat: c.lat, lon: c.lon }, c.name, true, ++epoch);
  });

  const airKm = (a, b) => { const r = x => x * Math.PI / 180, x = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2; return 6371 * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x)); };
  const jget = async url => { const r = await fetch(url, { signal: AbortSignal.timeout(12000) }); if (!r.ok) throw Error('svc'); return r.json(); };
  const inArea = p => p.lat > 32.64 && p.lat < 33.16 && p.lon > 34.88 && p.lon < 35.27;
  let epoch = 0;
  const status = (t, err) => { const s = $('#addr-status'); s.textContent = t; s.classList.toggle('err', !!err); };

  async function choose(point, label, regional, ep, source = 'address') {
    if (ep !== epoch) return;
    o.point = { ...point, source }; o.label = label; o.regional = regional; o.fee = null; totals();
    status('מחשבים הערכת משלוח…'); syncPin();
    let km, routed = false;
    try {
      const d = await jget(`https://router.project-osrm.org/route/v1/driving/${D.origin.lon},${D.origin.lat};${point.lon},${point.lat}?overview=false`);
      const dist = d.routes?.[0]?.distance; if (d.code !== 'Ok' || !Number.isFinite(dist)) throw Error('route');
      km = dist / 1000; routed = true;
    } catch (e) { km = airKm(D.origin, point) * 1.35; }
    if (ep !== epoch) return;
    o.fee = Math.round(km * D.shippingPerKm); o.routed = routed;
    status(`${regional ? 'הערכה אזורית לפי מרכז היישוב' : 'הכתובת שנבחרה'}: ${label}${routed ? '' : ' · הערכה גסה לפי המיקום'} — כ־${money(o.fee)}. המחיר הסופי יאושר בהזמנה.`);
    totals();
  }
  $('#addr-form').addEventListener('submit', async e => {
    e.preventDefault();
    const q = $('#addr').value.trim(); if (q.length < 2) { feedback('הזינו עיר ורחוב.', $('#addr')); return; }
    const ep = ++epoch; o.point = null; o.fee = null; totals();
    status('מחפשים את הכתובת…'); $('#addr-go').disabled = true;
    try {
      let res = [];
      try {
        const p = new URLSearchParams({ q: q + ', ישראל', format: 'jsonv2', countrycodes: 'il', limit: '3', 'accept-language': 'he' });
        res = (await jget('https://nominatim.openstreetmap.org/search?' + p)).filter(r => inArea({ lat: +r.lat, lon: +r.lon }));
      } catch (err) {}
      if (ep !== epoch) return;
      if (res.length) await choose({ lat: +res[0].lat, lon: +res[0].lon }, res[0].display_name.split(',').slice(0, 3).join(','), ['city', 'town', 'village', 'administrative'].includes(res[0].type), ep);
      else {
        const c = D.cities.find(c => [c.name, ...(c.alt || [])].some(n => q.includes(n)));
        if (c) await choose({ lat: c.lat, lon: c.lon }, c.name, true, ep);
        else status('לא זיהינו את הכתובת באזור המשלוחים. נסו עיר ורחוב, או דברו איתנו בוואטסאפ.', true);
      }
    } finally { if (ep === epoch) $('#addr-go').disabled = false; }
  });

  /* ---------- map (Leaflet, loaded on demand) ---------- */
  let map = null, pin = null, leafletP = null;
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    if (leafletP) return leafletP;
    leafletP = new Promise((res, rej) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.append(css);
      const s = document.createElement('script'); s.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; s.onload = res; s.onerror = rej; document.head.append(s);
    });
    return leafletP;
  }
  async function initMap() {
    try { await loadLeaflet(); } catch (e) { status('המפה לא נטענה. אפשר להזין כתובת.', true); return; }
    if (map) { map.invalidateSize(); return; }
    map = L.map('map', { scrollWheelZoom: false, minZoom: 10, maxBounds: [[32.64, 34.88], [33.16, 35.27]] }).setView([32.89, 35.098], 11);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    map.on('click', e => pick(e.latlng));
    syncPin();
  }
  function pick(ll) {
    const p = { lat: ll.lat, lon: ll.lng };
    if (!inArea(p)) { status('הנקודה מחוץ לאזור המשלוחים.', true); return; }
    o.addr = o.addr || 'נקודה שנבחרה במפה';
    choose(p, 'נקודה שנבחרה במפה', false, ++epoch, 'map');
  }
  function syncPin() {
    if (!map || !o.point) return;
    if (pin) pin.setLatLng([o.point.lat, o.point.lon]);
    else { pin = L.marker([o.point.lat, o.point.lon], { draggable: true }).addTo(map); pin.on('dragend', () => pick(pin.getLatLng())); }
    map.setView([o.point.lat, o.point.lon], Math.max(map.getZoom(), 13));
  }
  $('#map-box').addEventListener('toggle', () => { if ($('#map-box').open) requestAnimationFrame(initMap); });

  /* ---------- fields ---------- */
  const bind = (sel, key, after) => { const el = $(sel); el.value = o[key]; el.addEventListener('input', () => { o[key] = el.value; persist(); after?.(); }); };
  bind('#r-name', 'name'); bind('#r-phone', 'phone'); bind('#r-notes', 'notes');
  $('#addr').addEventListener('input', e => { o.addr = e.target.value; epoch++; o.point = null; o.fee = null; status(''); $$('#city-chips .chip').forEach(x => x.classList.remove('on')); totals(); });

  function today(offset = 0) {
    const d = new Date(Date.now() + offset * 864e5);
    const p = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jerusalem', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d);
    const v = Object.fromEntries(p.map(x => [x.type, x.value])); return `${v.year}-${v.month}-${v.day}`;
  }
  const dateIn = $('#o-date'); dateIn.min = today();
  const dayName = iso => new Intl.DateTimeFormat('he-IL', { weekday: 'long', day: 'numeric', month: 'numeric', timeZone: 'UTC' }).format(new Date(iso + 'T12:00:00Z'));
  $('#date-chips').innerHTML = [0, 1, 2].map(i => { const iso = today(i); return `<button type="button" class="chip" data-date="${iso}">${['היום', 'מחר', 'מחרתיים'][i]} <b>${dayName(iso).replace(/^יום /, '')}</b></button>`; }).join('');
  const setDate = v => { o.date = v; dateIn.value = v; $$('#date-chips .chip').forEach(c => c.classList.toggle('on', c.dataset.date === v)); };
  $('#date-chips').addEventListener('click', e => { const b = e.target.closest('[data-date]'); if (b) setDate(b.dataset.date); });
  dateIn.addEventListener('input', () => setDate(dateIn.value));

  /* ---------- greeting ---------- */
  $('#g-who').innerHTML = D.recipients.map(r => `<option value="${r.id}">${r.icon} ${r.label}</option>`).join('');
  $('#g-who').value = o.who;
  function ideas() { $('#g-ideas').innerHTML = (D.greetings[o.who] || []).map(g => `<button type="button" class="chip" data-g>${g}</button>`).join(''); }
  $('#g-who').addEventListener('change', e => { o.who = e.target.value; persist(); ideas(); });
  $('#g-ideas').addEventListener('click', e => { const b = e.target.closest('[data-g]'); if (!b) return; o.greet = b.textContent; $('#g-text').value = o.greet; persist(); card(); });
  bind('#g-text', 'greet', card); bind('#g-sign', 'sign', card);
  $$('[name=cstyle]').forEach(r => { r.checked = r.value === o.cstyle; r.addEventListener('change', () => { o.cstyle = r.value; persist(); card(); }); });
  function card() {
    $('#cp-text').textContent = o.greet.trim() || 'כמה מילים קטנות. הרבה כוונה.';
    $('#cp-sign').textContent = o.sign.trim();
    $('#g-count').textContent = o.greet.length;
    $('.cp-inner').className = 'cp-inner ' + o.cstyle;
  }
  ideas(); card();

  /* ---------- payment ---------- */
  $('#pay').addEventListener('change', e => { o.pay = e.target.value; $('#bit').hidden = o.pay !== 'bit'; refreshMsg(); });
  $('#bit-copy').addEventListener('click', async () => { try { await navigator.clipboard.writeText(D.bitNumber); toast('המספר הועתק ✓'); } catch (e) { toast('המספר: ' + D.phoneDisplay); } });

  /* ---------- message ---------- */
  const unitTxt = (f, n) => f.unit === 'ענף' ? (n === 1 ? 'ענף אחד' : n + ' ענפים') : (n === 1 ? 'גבעול אחד' : n + ' גבעולים');
  const fmt = iso => iso.split('-').reverse().join('/');
  const styleName = { blush: 'ורוד', forest: 'ירוק יער', cream: 'שמנת', sun: 'צהוב שמש' };
  function message() {
    const L = ['היי Bloomy 🌸 אשמח לתאם הזמנה:', ''];
    Cart.items().forEach((i, k) => {
      L.push(`${k + 1}. ${i.name}${i.qty > 1 ? ` × ${i.qty}` : ''} — ${i.price * i.qty} ₪`);
      if (i.type === 'custom' && i.wrap) L.push(`   • עטיפה: ${i.wrap}`);
      if (i.type === 'custom') Object.entries(i.counts).forEach(([id, n]) => { const f = BloomyBuilder.byId[id]; L.push(`   • ${f.name}: ${unitTxt(f, n)}`); });
    });
    L.push('', 'תאריך מבוקש: ' + (o.date ? `${fmt(o.date)} (${dayName(o.date)})` : 'טרם נבחר'));
    if (o.fulfil === 'pickup') L.push('קבלת הזר: איסוף עצמי מכפר מסריק (ללא תשלום)');
    else {
      L.push('קבלת הזר: משלוח', 'שם המקבל/ת: ' + (o.name.trim() || '—'), 'טלפון המקבל/ת: ' + (o.phone.trim() || '—'), 'כתובת: ' + (o.addr.trim() || o.label || '—'));
      if (o.point) L.push('מיקום במפה: https://www.google.com/maps?q=' + o.point.lat.toFixed(6) + ',' + o.point.lon.toFixed(6));
      if (o.notes.trim()) L.push('פרטי הגעה: ' + o.notes.trim());
      L.push('דמי משלוח משוערים: ' + (o.fee == null ? 'בתיאום' : o.fee + ' ₪'));
    }
    const sub = Cart.subtotal();
    L.push('', 'סה״כ משוער: ' + (o.fulfil === 'pickup' ? sub + ' ₪' : o.fee == null ? sub + ' ₪ + משלוח' : (sub + o.fee) + ' ₪'));
    L.push('אמצעי תשלום מועדף: ' + o.pay + ' (בכפוף לאישור העסק). טרם בוצע תשלום.');
    L.push('', o.greet.trim() ? `ברכה לכרטיס (${styleName[o.cstyle]}):\n${o.greet.trim()}${o.sign.trim() ? '\n— ' + o.sign.trim() : ''}` : 'ברכה לכרטיס: ללא ברכה');
    L.push('', 'אשמח לאישור זמינות ולמחיר סופי 🙏');
    return L.join('\n');
  }
  function refreshMsg() {
    const m = message();
    $('#msg').textContent = m;
    $('#send-wa').href = `https://wa.me/${D.whatsapp}?text=${encodeURIComponent(m)}`;
  }
  $('#send-wa').addEventListener('click', e => {
    if (!validate(0, 3)) { e.preventDefault(); return; }
    refreshMsg();
    toast('ממשיכים לוואטסאפ — שלחו שם את ההודעה ✓');
  });
  $('#copy-order').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(message()); toast('פרטי ההזמנה הועתקו ✓'); }
    catch (e) { $('.msg-preview').open = true; toast('סמנו והעתיקו את ההודעה מהתצוגה'); }
  });
  totals();
})();
