/* Bloomy — motion & atmosphere */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  window.BloomyFX = { reduced, fine };

  /* ---------- Toast ---------- */
  let toastTimer;
  window.toast = (text, action) => {
    const t = $('#toast');
    t.replaceChildren(document.createTextNode(text));
    if (action) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = action.label;
      b.addEventListener('click', () => { action.run(); t.classList.remove('show'); });
      t.append(b);
    }
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3600);
  };

  /* ---------- Loader ---------- */
  const finishLoad = () => {
    $('#loader')?.classList.add('done');
    document.documentElement.classList.add('is-ready');
    document.body.classList.add('is-ready');
  };
  if (reduced) finishLoad();
  else window.addEventListener('load', () => setTimeout(finishLoad, 650));
  setTimeout(finishLoad, 3500); // safety net

  /* ---------- Theme ---------- */
  $('#theme-toggle').addEventListener('click', () => {
    const root = document.documentElement;
    const cur = root.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const next = cur === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    try { localStorage.setItem('bloomy-theme', next); } catch (e) {}
  });

  /* ---------- Mobile menu ---------- */
  const menuBtn = $('#menu-btn'), menu = $('#mobile-menu');
  menuBtn.addEventListener('click', () => {
    const open = menu.hidden;
    menu.hidden = !open;
    menuBtn.setAttribute('aria-expanded', String(open));
  });
  menu.addEventListener('click', e => { if (e.target.closest('a')) { menu.hidden = true; menuBtn.setAttribute('aria-expanded', 'false'); } });

  /* ---------- Scroll: progress, header, nav active ---------- */
  const header = $('#header'), progress = $('#progress');
  let lastY = scrollY, ticking = false;
  const navLinks = $$('.nav a');
  const sections = navLinks.map(a => $(a.getAttribute('href'))).filter(Boolean);
  function onScroll() {
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    progress.style.scale = `${max > 0 ? y / max : 0} 1`;
    header.classList.toggle('scrolled', y > 30);
    header.classList.toggle('hide', y > 500 && y > lastY + 4 && menu.hidden);
    if (y < lastY - 4) header.classList.remove('hide');
    lastY = y;
    let cur = null;
    for (const s of sections) if (s.getBoundingClientRect().top < innerHeight * .4) cur = s;
    navLinks.forEach(a => a.classList.toggle('active', cur && a.getAttribute('href') === '#' + cur.id));
    hscroll();
    ticking = false;
  }
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });

  /* ---------- Reveal ---------- */
  const io = new IntersectionObserver(entries => entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
  }), { threshold: .12, rootMargin: '0px 0px -40px 0px' });
  window.observeReveal = root => $$('.reveal:not(.in)', root || document).forEach(el => io.observe(el));
  observeReveal();

  /* ---------- Word rotator ---------- */
  const rot = $('#rotator');
  if (rot && !reduced) {
    const words = $$('span', rot); let i = 0;
    setInterval(() => {
      const prev = words[i]; i = (i + 1) % words.length;
      prev.classList.remove('is-on'); prev.classList.add('is-out');
      words[i].classList.remove('is-out'); words[i].classList.add('is-on');
      setTimeout(() => prev.classList.remove('is-out'), 900);
    }, 2600);
  }

  /* ---------- Custom cursor + magnetic + tilt ---------- */
  if (fine && !reduced) {
    const cur = $('#cursor');
    let cx = innerWidth / 2, cy = innerHeight / 2, tx = cx, ty = cy;
    addEventListener('pointermove', e => { tx = e.clientX; ty = e.clientY; cur.classList.add('on'); }, { passive: true });
    document.addEventListener('pointerleave', () => cur.classList.remove('on'));
    (function loop() {
      cx += (tx - cx) * .2; cy += (ty - cy) * .2;
      cur.style.transform = `translate(${cx}px,${cy}px)`;
      requestAnimationFrame(loop);
    })();
    document.addEventListener('pointerover', e => {
      cur.classList.toggle('big', !!e.target.closest('a,button,.card-media,label,select,summary,input[type=range]'));
    });

    document.addEventListener('pointermove', e => {
      const m = e.target.closest('.magnetic');
      $$('.magnetic.pull').forEach(el => { if (el !== m) { el.classList.remove('pull'); el.style.transform = ''; } });
      if (!m) return;
      const r = m.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      m.classList.add('pull');
      m.style.transform = `translate(${dx * .22}px,${dy * .3}px)`;
    }, { passive: true });

    document.addEventListener('pointermove', e => {
      const t = e.target.closest('.tilt, .card');
      $$('.tilting').forEach(el => { if (el !== t) { el.classList.remove('tilting'); el.style.transform = ''; } });
      if (!t || t.classList.contains('hv-main')) return;
      const r = t.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
      t.classList.add('tilting');
      t.style.transform = `perspective(900px) rotateY(${px * 8}deg) rotateX(${-py * 8}deg) translateY(-6px)`;
    }, { passive: true });

    /* Hero parallax */
    const hv = $('#hero-visual');
    if (hv) {
      const layers = $$('[data-depth]', hv);
      hv.closest('.hero').addEventListener('pointermove', e => {
        const r = hv.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - .5, py = (e.clientY - r.top) / r.height - .5;
        layers.forEach(l => { const d = +l.dataset.depth; l.style.transform = `translate(${px * d * -18}px,${py * d * -18}px)`; });
      });
    }
  }

  /* ---------- Falling petals (canvas) ---------- */
  const cvs = $('#petals');
  if (cvs && !reduced) {
    const ctx = cvs.getContext('2d');
    const colors = ['#f2c6d2', '#ee9fb6', '#f7d9e1', '#e4a4b8', '#fff1f4', '#f3c47a'];
    let W, H, dpr, petals = [], mouse = { x: -999, y: -999 }, running = true;
    function size() {
      dpr = Math.min(devicePixelRatio || 1, 2);
      W = cvs.clientWidth; H = cvs.clientHeight;
      cvs.width = W * dpr; cvs.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    const count = () => Math.round(Math.min(46, Math.max(16, W / 34)));
    const make = top => ({
      x: Math.random() * W, y: top ? -20 - Math.random() * H : Math.random() * H,
      s: 6 + Math.random() * 10, vy: .35 + Math.random() * .8, vx: -.3 + Math.random() * .6,
      a: Math.random() * Math.PI * 2, va: (Math.random() - .5) * .03, sw: Math.random() * 100,
      c: colors[(Math.random() * colors.length) | 0], o: .45 + Math.random() * .45
    });
    function drawPetal(p) {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.a);
      ctx.scale(1, Math.abs(Math.cos(p.sw * .03)) * .7 + .3);
      ctx.globalAlpha = p.o; ctx.fillStyle = p.c;
      ctx.beginPath(); ctx.moveTo(0, -p.s);
      ctx.bezierCurveTo(p.s * .9, -p.s * .6, p.s * .7, p.s * .7, 0, p.s);
      ctx.bezierCurveTo(-p.s * .7, p.s * .7, -p.s * .9, -p.s * .6, 0, -p.s);
      ctx.fill(); ctx.restore();
    }
    function tick() {
      if (!running) return;
      ctx.clearRect(0, 0, W, H);
      for (const p of petals) {
        p.sw += 1; p.y += p.vy; p.x += p.vx + Math.sin(p.sw * .02) * .5; p.a += p.va;
        const dx = p.x - mouse.x, dy = p.y - mouse.y, d2 = dx * dx + dy * dy;
        if (d2 < 12000) { const f = (12000 - d2) / 12000; p.x += dx * .06 * f; p.y += dy * .06 * f; p.va += .002 * f; }
        if (p.y > H + 20 || p.x < -40 || p.x > W + 40) Object.assign(p, make(true), { y: -20 });
        drawPetal(p);
      }
      requestAnimationFrame(tick);
    }
    size(); petals = Array.from({ length: count() }, () => make(false));
    addEventListener('resize', () => { size(); const n = count(); while (petals.length < n) petals.push(make(true)); petals.length = n; });
    cvs.parentElement.addEventListener('pointermove', e => { const r = cvs.getBoundingClientRect(); mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top; });
    cvs.parentElement.addEventListener('pointerleave', () => { mouse.x = mouse.y = -999; });
    new IntersectionObserver(([e]) => { const was = running; running = e.isIntersecting; if (running && !was) tick(); }).observe(cvs);
    tick();
  }

  /* ---------- Horizontal gallery ---------- */
  const hs = $('#gallery'), track = $('#hscroll-track');
  const mobile = () => matchMedia('(max-width:640px)').matches;
  let maxShift = 0;
  function sizeH() {
    if (!hs || !track) return;
    if (mobile() || reduced) { hs.style.removeProperty('--hs-h'); track.style.transform = ''; maxShift = 0; return; }
    track.style.transform = '';
    // RTL: the track starts at its right edge and overflows to the left.
    const start = track.getBoundingClientRect().right;
    maxShift = Math.max(0, track.scrollWidth - start + 60);
    hs.style.setProperty('--hs-h', `${innerHeight + maxShift}px`);
  }
  function hscroll() {
    if (!hs || !track || !maxShift) return;
    const r = hs.getBoundingClientRect(), total = hs.offsetHeight - innerHeight;
    const p = Math.min(1, Math.max(0, -r.top / (total || 1)));
    track.style.transform = `translateX(${p * maxShift}px)`;
  }
  window.BloomyFX.sizeH = () => { sizeH(); hscroll(); };
  addEventListener('resize', window.BloomyFX.sizeH);

  /* ---------- FAQ ---------- */
  const fl = $('#faq-list');
  BLOOMY.faq.forEach(([q, a], i) => {
    const d = document.createElement('details');
    d.className = 'faq-item reveal';
    d.style.transitionDelay = i * 60 + 'ms';
    d.innerHTML = '<summary><span></span><i aria-hidden="true">+</i></summary><p></p>';
    d.querySelector('summary span').textContent = q;
    d.querySelector('p').textContent = a;
    fl.append(d);
  });
  fl.addEventListener('toggle', e => { if (e.target.open) $$('.faq-item[open]', fl).forEach(x => { if (x !== e.target) x.open = false; }); }, true);
  observeReveal(fl);

  $('#year').textContent = new Date().getFullYear();
})();
