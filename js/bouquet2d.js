/* Bloomy — photo bouquet: real flower photos placed on a dome with depth,
   wrapped in back and front paper layers. Used by the studio page. */
(() => {
  'use strict';
  const D = window.BLOOMY;
  const $ = s => document.querySelector(s);
  if (!$('#bq3')) return;
  const FX = { reduced: matchMedia('(prefers-reduced-motion: reduce)').matches, fine: matchMedia('(hover: hover) and (pointer: fine)').matches };
  const imgSrc = f => `assets/flowers/${f.img}.webp`;
  let counts = {}, seed = 1, lastAdded = null;
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
  function draw2d() {
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
  addEventListener('resize', () => { const k = ($('#bq3').clientWidth || 400) / 400; if (Math.abs(k - K) > .01) draw2d(); });

  /* drag to turn the bouquet, gentle sway when idle */
  {
    const stage = $('#stage'), scene = $('#bq-scene');
    let ry = -8, rx = 4, tY = -8, tX = 4, dragging = null, on = false;
    const t0 = performance.now(), reduced = FX.reduced;
    stage.addEventListener('pointerdown', e => { if (e.target.closest('button')) return; dragging = { x: e.clientX, y: e.clientY, ry: tY, rx: tX }; stage.classList.add('turning'); });
    addEventListener('pointermove', e => {
      if (dragging) { tY = Math.max(-35, Math.min(35, dragging.ry + (e.clientX - dragging.x) * .3)); tX = Math.max(-6, Math.min(16, dragging.rx - (e.clientY - dragging.y) * .15)); }
    });
    stage.addEventListener('pointermove', e => {
      if (dragging || !FX.fine) return;
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
  window.Bouquet2D = {
    render(c, s, added) { counts = c; seed = s; lastAdded = added || null; draw2d(); },
    wrap(w) { $('#bq3').dataset.wrap = w; }
  };
})();
