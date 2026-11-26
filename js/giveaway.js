/* Bloomy — giveaway landing page: countdown + spinning 3D rose */
(() => {
  'use strict';
  const G = window.BLOOMY.giveaway, $ = s => document.querySelector(s);
  const end = new Date(G.ends).getTime();
  const pad = n => String(n).padStart(2, '0');

  /* ---------- rules ---------- */
  $('#g-ends').textContent = `ההשתתפות נסגרת ב${G.endsLabel}`;
  $('#g-rules-list').innerHTML = [
    'זוכה אחד או אחת יקבלו את הזר שבנו בסטודיו.',
    `זר עד ${G.maxStems} גבעולים. הפרחים בכפוף לעונה ולזמינות.`,
    `ההשתתפות פתוחה עד ${G.endsLabel}.`,
    'משתתפים בשליחת הזר בוואטסאפ ל־Bloomy, דרך כפתור השליחה בסטודיו.',
    'הזוכה יוכרזו בעמוד האינסטגרם של Bloomy.'
  ].map(r => `<li>${r}</li>`).join('');
  try { if (localStorage.getItem('bloomy-ga-entered')) $('#g-entered').hidden = false; } catch (e) {}

  /* ---------- countdown ---------- */
  const els = { d: $('#cd-d'), h: $('#cd-h'), m: $('#cd-m'), s: $('#cd-s') };
  const set = (el, v) => { if (el.textContent !== v) { el.textContent = v; el.classList.remove('tick'); void el.offsetWidth; el.classList.add('tick'); } };
  function tick() {
    const left = end - Date.now();
    if (left <= 0) {
      ['d', 'h', 'm', 's'].forEach(k => set(els[k], k === 'd' ? '0' : '00'));
      document.body.classList.add('closed');
      $('#g-ends').textContent = 'ההשתתפות נסגרה. תודה לכל מי שבנו זר! הזוכה יוכרזו באינסטגרם.';
      const cta = $('#g-cta'); cta.removeAttribute('href'); cta.setAttribute('aria-disabled', 'true'); cta.querySelector('span').textContent = 'ההגרלה נסגרה';
      return;
    }
    const s = Math.floor(left / 1000);
    set(els.d, String(Math.floor(s / 86400)));
    set(els.h, pad(Math.floor(s / 3600) % 24));
    set(els.m, pad(Math.floor(s / 60) % 60));
    set(els.s, pad(s % 60));
    if (s < 86400) document.body.classList.add('last-day');
    setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
  }
  tick();

  /* ---------- falling petals (CSS) ---------- */
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const box = $('.g-petals'), colors = ['#ffc6d6', '#f7a3bd', '#ffe1cf', '#fff', '#f2b544'];
    for (let i = 0; i < 18; i++) {
      const p = document.createElement('i');
      p.style.cssText = `left:${Math.random() * 100}%;--d:${8 + Math.random() * 8}s;--delay:${-Math.random() * 16}s;--x:${(Math.random() - .5) * 120}px;--s:${.6 + Math.random() * .8};background:${colors[i % colors.length]}`;
      box.append(p);
    }
  }

  /* ---------- 3D rose ---------- */
  const canvas = $('#rose3d');
  if (!window.THREE || !window.Flora3D || !canvas) { $('#g-rose').classList.add('no3d'); return; }
  const T = THREE, F = Flora3D;
  let r;
  try { r = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { $('#g-rose').classList.add('no3d'); return; }
  r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  r.outputEncoding = T.sRGBEncoding; r.toneMapping = T.ACESFilmicToneMapping; r.toneMappingExposure = .9;
  const scene = new T.Scene();
  try { scene.environment = F.studioEnv(r); } catch (e) {}
  scene.add(new T.HemisphereLight(0xfff5f7, 0xc9a99a, .3));
  const key = new T.DirectionalLight(0xffffff, .95); key.position.set(3, 6, 7); scene.add(key);
  const cam = new T.PerspectiveCamera(30, 1, .1, 50); cam.position.set(0, .4, 4.6); cam.lookAt(0, 0, 0);
  const group = new T.Group(); scene.add(group);
  const rose = new T.Mesh(F.geometry('rose-red'), F.material); rose.rotation.x = -.2; group.add(rose);
  const size = () => { const w = canvas.clientWidth, h = canvas.clientHeight; if (!w) return; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  new ResizeObserver(size).observe(canvas); size();
  let on = true, t0 = performance.now();
  new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) requestAnimationFrame(loop); }).observe(canvas);
  function loop(now) {
    if (!on) return;
    const t = (now - t0) / 1000;
    group.rotation.y = Math.sin(t * .7) * .55;
    group.rotation.x = Math.sin(t * .5) * .12;
    group.position.y = Math.sin(t * 1.2) * .06;
    const pop = Math.min(1, t / 1.2); rose.scale.setScalar(1 - Math.pow(1 - pop, 3));
    r.render(scene, cam);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
