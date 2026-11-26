/* Bloomy — 3D hero bouquet (Three.js r128, procedural) */
(() => {
  'use strict';
  const host = document.getElementById('hero-3d');
  const canvas = document.getElementById('bloom3d');
  if (!host || !canvas) return;
  const fail = () => host.classList.add('no3d');
  if (!window.THREE) return fail();
  const T = window.THREE;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let renderer;
  try {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) { return fail(); }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .82;

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(30, 1, .1, 100);
  camera.position.set(0, .4, 13.6);
  camera.lookAt(0, -.95, 0);

  scene.add(new T.HemisphereLight(0xfff5f7, 0xc9a99a, .62));
  const key = new T.DirectionalLight(0xffffff, 1.25); key.position.set(3, 6, 7); scene.add(key);
  const rim = new T.DirectionalLight(0xffc2d4, .7); rim.position.set(-5, 2, -4); scene.add(rim);
  const fill = new T.DirectionalLight(0xfff0d8, .35); fill.position.set(-4, -2, 6); scene.add(fill);

  const lin = hex => new T.Color(hex).convertSRGBToLinear();
  const rand = (a, b) => a + Math.random() * (b - a);

  /* ---------- petal geometry ---------- */
  function petalGeo({ len = 1, width = .7, cup = .5, curl = .12, base, mid, tip, edge = .12, segU = 10, segV = 14, pointy = 0 }) {
    const g = new T.PlaneGeometry(1, 1, segU, segV);
    const pos = g.attributes.position, cols = [];
    const cb = lin(base), cm = lin(mid), ct = lin(tip), tmp = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) * 2, v = pos.getY(i) + .5;
      const q = (v - .42) / .58;
      let w = width * Math.sqrt(Math.max(0, 1 - q * q)) * Math.sqrt(Math.min(1, v / .22 + .08));
      if (pointy) w *= 1 - pointy * Math.pow(v, 3);
      const x = u * w / 2, y = v * len;
      const z = cup * u * u * w * .55 * (.35 + v) - curl * v * v * len + .015 * Math.sin(u * 3 + v * 6);
      pos.setXYZ(i, x, y, z);
      if (v < .5) tmp.copy(cb).lerp(cm, v / .5); else tmp.copy(cm).lerp(ct, (v - .5) / .5);
      tmp.lerp(ct, Math.abs(u) * edge);
      cols.push(tmp.r, tmp.g, tmp.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    g.computeVertexNormals();
    return g;
  }
  const petalMat = new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: .58, metalness: 0 });
  const green = new T.MeshStandardMaterial({ color: lin('#5e8a4f'), roughness: .7, side: T.DoubleSide });
  const leafGeo = petalGeo({ len: 1.5, width: .62, cup: .25, curl: -.05, base: '#4c7a40', mid: '#6b9a57', tip: '#86b06b', edge: .05, pointy: .5 });

  const blooming = []; // petals that animate open
  function addPetal(parent, geo, angle, lift, delay) {
    const pivot = new T.Group(); pivot.rotation.z = angle;
    const m = new T.Mesh(geo, petalMat); m.rotation.x = reduced ? lift : 1.5;
    pivot.add(m); parent.add(pivot);
    blooming.push({ m, lift, delay });
  }

  /* rose: cupped layers */
  function rose(c, size = 1, delay = 0) {
    const f = new T.Group();
    const layers = [[4, .3, 1.5], [5, .4, 1.38], [6, .52, 1.2], [7, .64, 1.02], [8, .76, .84], [9, .88, .64], [10, 1, .42]];
    layers.forEach(([n, s, lift], li) => {
      const g = petalGeo({ len: .82 * s * size, width: 1.02 * s * size, cup: 1.15, curl: .1 + li * .03, base: c[0], mid: c[1], tip: c[2], edge: .25 });
      for (let i = 0; i < n; i++) addPetal(f, g, i / n * Math.PI * 2 + li * 2.39, lift + rand(-.06, .06), delay + (5 - li) * .07);
    });
    return f;
  }
  /* gerbera: two rings of slender petals + dark disc */
  function daisy(c, size = 1, delay = 0) {
    const f = new T.Group();
    [[24, 1, .22], [20, .82, .42]].forEach(([n, s, lift], li) => {
      const g = petalGeo({ len: .98 * s * size, width: .24 * size, cup: .55, curl: .05, base: c[0], mid: c[1], tip: c[2], edge: .1, segU: 4 });
      for (let i = 0; i < n; i++) addPetal(f, g, i / n * Math.PI * 2 + li * .13, lift + rand(-.05, .05), delay + li * .1);
    });
    const disc = new T.Mesh(new T.SphereGeometry(.26 * size, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2),
      new T.MeshStandardMaterial({ color: lin(c[3] || '#4a2a1d'), roughness: .9 }));
    disc.rotation.x = Math.PI / 2; disc.scale.set(1, .45, 1); disc.position.z = .02;
    f.add(disc);
    const ring = new T.Mesh(new T.TorusGeometry(.27 * size, .045 * size, 8, 32), new T.MeshStandardMaterial({ color: lin('#d9b23a'), roughness: .8 }));
    ring.position.z = .03; f.add(ring);
    return f;
  }

  /* ---------- bouquet ---------- */
  const bouquet = new T.Group(); scene.add(bouquet);
  const blossoms = new T.Group(); bouquet.add(blossoms);
  const gather = new T.Vector3(0, -2.35, -1.1);
  const pink = ['#c74e74', '#ec8fac', '#ffd8e3'], blush = ['#d98a9a', '#f6c3cc', '#fff0f2'], peach = ['#e58a5c', '#f7b88d', '#ffe6d2'],
    white = ['#d8d1bf', '#f6f1e6', '#ffffff'], wine = ['#6e1530', '#a8264d', '#d0587c'], sun = ['#d98a1c', '#f5c23c', '#ffe98a', '#3b2314'];
  const kinds = [
    [rose, pink, 1.2], [daisy, ['#d4527a', '#f08daa', '#ffc6d6', '#3a1c16'], 1.05], [rose, peach, 1], [rose, white, .95],
    [daisy, sun, .95], [rose, wine, .85], [rose, blush, .95], [daisy, ['#e2e0d6', '#f7f6f1', '#ffffff', '#5a4a1e'], .9],
    [rose, pink, .85], [rose, blush, .85], [daisy, ['#e0703c', '#f59a5f', '#ffd2a8', '#3a1c16'], .9], [rose, white, .8], [rose, peach, .8]
  ];
  const stemPts = [];
  const domeC = new T.Vector3(0, -.9, -1.5), golden = Math.PI * (3 - Math.sqrt(5)), nK = kinds.length;
  kinds.forEach(([fn, col, size], i) => {
    const th = Math.acos(1 - (i + .5) / nK * (1 - Math.cos(1.05)));
    const ph = i * golden + .6;
    // dome axis tilted toward the camera and up
    const local = new T.Vector3(Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th));
    const dir = local.clone().applyAxisAngle(new T.Vector3(1, 0, 0), -.62).normalize();
    const p = domeC.clone().add(dir.clone().multiplyScalar(2.45));
    const f = fn(col, size, .25 + i * .07);
    f.position.copy(p);
    f.lookAt(p.clone().add(dir));
    f.rotateZ(rand(0, Math.PI * 2));
    blossoms.add(f);
    stemPts.push(p.clone().sub(dir.clone().multiplyScalar(.7)));
  });
  // a ring of leaves behind the blooms
  {
    const leafMat = new T.MeshStandardMaterial({ vertexColors: true, roughness: .7, side: T.DoubleSide });
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2 + rand(-.12, .12);
      const pivot = new T.Group();
      pivot.position.set(Math.cos(a) * 1.15, -.55 + Math.sin(a) * 1.0, -1.35 + rand(-.15, .15));
      pivot.rotation.z = a - Math.PI / 2; pivot.rotation.x = -.35 - rand(0, .3);
      const leaf = new T.Mesh(leafGeo, leafMat); leaf.scale.setScalar(rand(.95, 1.3));
      pivot.add(leaf); blossoms.add(pivot);
    }
  }
  // gypsophila sprays: tiny instanced dots
  {
    const dots = new T.InstancedMesh(new T.SphereGeometry(.045, 6, 6), new T.MeshStandardMaterial({ color: lin('#ffffff'), roughness: .8, emissive: lin('#2a2a2a') }), 260);
    const m4 = new T.Matrix4();
    for (let i = 0; i < 260; i++) {
      const th = rand(0, Math.PI * 2), r = rand(1.1, 2.45), cx = Math.cos(th) * r, cy = Math.sin(th) * r * .8 - .45;
      m4.makeTranslation(cx, cy, rand(-1.1, -.2)); dots.setMatrixAt(i, m4);
    }
    blossoms.add(dots);
  }
  // stems
  {
    const stemMat = new T.MeshStandardMaterial({ color: lin('#5f8a45'), roughness: .75 });
    stemPts.forEach((p, i) => {
      const end = new T.Vector3((i % 5 - 2) * .07, -4.25 - (i % 3) * .06, (i % 2) * .06);
      const curve = new T.CatmullRomCurve3([p.clone(), gather.clone().add(new T.Vector3(p.x * .12, 0, p.z * .1)), end]);
      const tube = new T.Mesh(new T.TubeGeometry(curve, 24, .045, 6, false), stemMat);
      bouquet.add(tube);
    });
  }
  // wrapping paper: two layered sheets + inner tissue
  function sheet(rTop, h, start, len, color, rough = .9, opacity = 1) {
    const g = new T.CylinderGeometry(rTop, .18, h, 48, 6, true, start, len);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) { // soft folds
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i), a = Math.atan2(z, x);
      const k = 1 + .045 * Math.sin(a * 9) * ((y + h / 2) / h);
      pos.setXYZ(i, x * k, y, z * k);
    }
    g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: lin(color), roughness: rough, side: T.DoubleSide, transparent: opacity < 1, opacity }));
    m.position.y = -2.2 - h / 2 + .95; return m;
  }
  const wrapGroup = new T.Group(); bouquet.add(wrapGroup);
  wrapGroup.add(sheet(2.25, 3.5, Math.PI * 1.25, Math.PI * 1.0, '#f4bfce', .85));       // blush tissue, back
  wrapGroup.add(sheet(2.0, 2.6, Math.PI * 1.1, Math.PI * .95, '#c99a6e', .95));      // kraft, front-left
  wrapGroup.add(sheet(1.9, 2.45, -Math.PI * .1, Math.PI * .95, '#dcb58b', .95));      // kraft, front-right
  wrapGroup.rotation.y = -Math.PI / 2;
  // ribbon + bow
  {
    const rib = new T.MeshStandardMaterial({ color: lin('#d4577f'), roughness: .35, metalness: .1 });
    const band = new T.Mesh(new T.TorusGeometry(.42, .07, 10, 40), rib); band.rotation.x = Math.PI / 2; band.position.set(0, -3.5, 0); band.scale.set(1, 1, 1.6);
    bouquet.add(band);
    [-1, 1].forEach(s => {
      const loop = new T.Mesh(new T.TorusGeometry(.32, .06, 10, 32), rib);
      loop.position.set(s * .36, -3.42, .48); loop.scale.set(1.3, .75, 1); loop.rotation.z = s * .25; bouquet.add(loop);
      const tail = new T.Mesh(new T.BoxGeometry(.13, .9, .02), rib);
      tail.position.set(s * .18, -3.95, .5); tail.rotation.z = s * .28; bouquet.add(tail);
    });
    const knot = new T.Mesh(new T.SphereGeometry(.11, 12, 10), rib); knot.position.set(0, -3.44, .5); bouquet.add(knot);
  }
  bouquet.position.y = .55;

  /* ---------- floating petals ---------- */
  const floatGeos = [pink, blush, peach, white].map(c => petalGeo({ len: .34, width: .3, cup: .9, curl: .1, base: c[0], mid: c[1], tip: c[2], segU: 5, segV: 6 }));
  const floaters = [];
  for (let i = 0; i < (innerWidth < 700 ? 22 : 38); i++) {
    const m = new T.Mesh(floatGeos[i % floatGeos.length], petalMat);
    const f = { m, v: new T.Vector3(rand(-.004, .004), rand(-.012, -.004), 0), spin: new T.Vector3(rand(-.02, .02), rand(-.02, .02), rand(-.02, .02)) };
    m.position.set(rand(-6, 6), rand(-4, 5), rand(-3, 2)); m.rotation.set(rand(0, 6), rand(0, 6), rand(0, 6));
    scene.add(m); floaters.push(f);
  }
  function burst(at, power = 1) {
    floaters.forEach(f => {
      f.m.position.copy(at).add(new T.Vector3(rand(-.4, .4), rand(-.4, .4), rand(-.2, .4)));
      const d = f.m.position.clone().sub(at).normalize().multiplyScalar(rand(.05, .14) * power);
      f.v.copy(d); f.v.y += .03 * power;
    });
  }

  /* ---------- surprise: pulse → spin → explode → reassemble ---------- */
  const parts = blossoms.children.map(o => ({ o, pos: o.position.clone(), q: o.quaternion.clone(), v: new T.Vector3(), w: new T.Vector3() }));
  let pulse = 0, heat = 0, phase = 'idle', phaseAt = 0, spinBoost = 0, onBoom = null;
  const worldCenter = () => blossoms.getWorldPosition(new T.Vector3()).add(new T.Vector3(0, -.3, 0));
  window.Bloom3D = {
    pulse(h) { pulse = 1; heat = h; burst(worldCenter(), .35 + h * .5); loop(); },
    sparkle() { burst(worldCenter(), .8); pulse = .6; loop(); },
    explode() {
      return new Promise(res => { phase = 'spin'; phaseAt = performance.now(); onBoom = res; loop(); });
    }
  };
  function boom() {
    parts.forEach(p => {
      const dir = p.o.position.clone().sub(new T.Vector3(0, -1.2, -.8));
      if (dir.lengthSq() < .01) dir.set(rand(-1, 1), 1, rand(-1, 1));
      p.v.copy(dir.normalize().multiplyScalar(rand(.16, .3))); p.v.y += rand(.04, .12); p.v.z += rand(.05, .15);
      p.w.set(rand(-.2, .2), rand(-.2, .2), rand(-.2, .2));
    });
    burst(worldCenter(), 2.4);
    host.classList.add('flash'); setTimeout(() => host.classList.remove('flash'), 700);
  }
  const qTmp = new T.Quaternion();
  function stepSurprise(now) {
    const dt = (now - phaseAt) / 1000;
    if (phase === 'spin') {
      spinBoost += .02 + dt * .06;
      if (dt > 1.15) { phase = 'boom'; phaseAt = now; boom(); onBoom && onBoom(); onBoom = null; }
    } else if (phase === 'boom') {
      spinBoost *= .95;
      parts.forEach(p => {
        p.o.position.add(p.v); p.v.multiplyScalar(.965); p.v.y -= .004;
        p.o.rotation.x += p.w.x; p.o.rotation.y += p.w.y; p.o.rotation.z += p.w.z;
      });
      if (dt > 2.4) { phase = 'return'; phaseAt = now; parts.forEach(p => { p.from = p.o.position.clone(); p.fromQ = p.o.quaternion.clone(); }); }
    } else if (phase === 'return') {
      const k = ease(dt / 1.5);
      parts.forEach(p => { p.o.position.lerpVectors(p.from, p.pos, k); qTmp.copy(p.fromQ).slerp(p.q, k); p.o.quaternion.copy(qTmp); });
      if (dt > 1.5) { phase = 'idle'; heat = 0; }
    }
  }

  /* ---------- sizing ---------- */
  function size() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.position.z = w / h < .8 ? 16.5 : 13.6;
    camera.updateProjectionMatrix();
  }
  size(); addEventListener('resize', size);

  /* ---------- interaction ---------- */
  let tx = 0, ty = 0, rx = 0, ry = 0, drag = null, dragY = 0, spinV = 0;
  host.addEventListener('pointermove', e => {
    const r = host.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - .5); ty = ((e.clientY - r.top) / r.height - .5);
    if (drag) { spinV = (e.clientX - drag) * .006; dragY += spinV; drag = e.clientX; }
  });
  host.addEventListener('pointerleave', () => { tx = ty = 0; drag = null; });
  // a tap = press and release without moving much (works with touch even when the page scrolls a bit)
  let down = null;
  host.addEventListener('pointerdown', e => { drag = e.clientX; down = { x: e.clientX, y: e.clientY, t: performance.now() }; host.classList.add('grabbing'); });
  const release = e => {
    const wasTap = down && Math.hypot(e.clientX - down.x, e.clientY - down.y) < 12 && performance.now() - down.t < 600;
    if (wasTap && !e.target.closest('#surprise-btn')) {
      const r = host.getBoundingClientRect();
      const v = new T.Vector3(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1, .5).unproject(camera);
      const dir = v.sub(camera.position).normalize();
      burst(camera.position.clone().add(dir.multiplyScalar(12)), .5);
      host.classList.add('tapped');
      window.BloomySurprise?.tap();
    }
    down = null; drag = null; host.classList.remove('grabbing');
  };
  host.addEventListener('pointerup', release);
  host.addEventListener('pointercancel', () => { down = null; drag = null; host.classList.remove('grabbing'); });

  /* ---------- loop ---------- */
  let visible = true, start = performance.now();
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) loop(); }, { threshold: 0 }).observe(host);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) loop(); });
  const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
  let raf = 0;
  function loop() {
    cancelAnimationFrame(raf);
    if (!visible || document.hidden) return;
    raf = requestAnimationFrame(frame);
  }
  function frame(now) {
    const t = (now - start) / 1000;
    for (const b of blooming) b.m.rotation.x = 1.5 + (b.lift - 1.5) * ease((t - .4 - b.delay) / 1.6);
    const sc = Math.min(1, scrollY / innerHeight);
    if (!drag) { spinV *= .94; dragY += spinV; }
    if (phase !== 'idle') stepSurprise(now);
    dragY += spinBoost;
    ry += ((tx * .7 + dragY + (reduced ? 0 : Math.sin(t * .35) * .18) + sc * 1.2) - ry) * (spinBoost > .01 ? .5 : .06);
    rx += ((ty * .35 - .05) - rx) * .06;
    pulse *= .9;
    const wob = Math.sin(t * 38) * pulse * (.05 + heat * .1);
    bouquet.rotation.set(rx, ry, wob);
    bouquet.scale.setScalar(1 + pulse * (.04 + heat * .06) + (phase === 'spin' ? Math.min(.12, (now - phaseAt) / 9000) : 0));
    bouquet.position.y = .55 + (reduced ? 0 : Math.sin(t * .9) * .06) + sc * .8;
    for (const f of floaters) {
      f.m.position.add(f.v); f.m.rotation.x += f.spin.x; f.m.rotation.y += f.spin.y; f.m.rotation.z += f.spin.z;
      f.v.x += Math.sin(t + f.m.position.y) * .00012; f.v.y = Math.max(f.v.y - .0006, -.016); f.v.multiplyScalar(.995);
      if (f.m.position.y < -5.5 || Math.abs(f.m.position.x) > 8) { f.m.position.set(rand(-6, 6), rand(5, 7), rand(-3, 2)); f.v.set(rand(-.004, .004), rand(-.012, -.004), 0); }
    }
    renderer.render(scene, camera);
    if (reduced && t > 3 && !drag && phase === 'idle' && pulse < .01) return; // settle, stop animating
    raf = requestAnimationFrame(frame);
  }
  host.classList.add('ready3d');
  loop();
})();
