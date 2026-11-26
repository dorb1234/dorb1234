/* Bloomy — 3D bouquet studio scene. builder.js calls Studio3D.set(list, seed, wrap). */
(() => {
  'use strict';
  const canvas = document.getElementById('studio3d'), stage = document.getElementById('stage');
  if (!canvas || !stage || !window.THREE || !window.Flora3D) return;
  const T = window.THREE, F = window.Flora3D;
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: true }); } catch (e) { return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = .88;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let on = false, raf = 0, last = performance.now(), busyUntil = 0;

  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(30, 1, .1, 100);
  try { scene.environment = F.studioEnv(renderer); } catch (e) {}
  scene.add(new T.HemisphereLight(0xfff5f7, 0xc9a99a, .3));
  const key = new T.DirectionalLight(0xffffff, .95); key.position.set(3, 6, 7); scene.add(key);
  const rim = new T.DirectionalLight(0xffc2d4, .6); rim.position.set(-5, 2, -4); scene.add(rim);
  const fill = new T.DirectionalLight(0xfff0d8, .3); fill.position.set(-4, -2, 6); scene.add(fill);

  const root = new T.Group(); scene.add(root);
  const flowers = new T.Group(); root.add(flowers);
  const stemsG = new T.Group(); root.add(stemsG);
  const wrapG = new T.Group(); root.add(wrapG);
  const stemMat = new T.MeshStandardMaterial({ color: F.lin('#5f8a45'), roughness: .75 });

  /* ---------- wrap ---------- */
  const wraps = {
    kraft: { a: '#c99a6e', b: '#dcb58b', t: '#f4bfce', r: '#d4577f', o: 1 },
    blush: { a: '#e9a7b9', b: '#f6c9d5', t: '#fff4ea', r: '#f3ece4', o: 1 },
    white: { a: '#e8e3db', b: '#f8f6f2', t: '#f7c7d4', r: '#7fae69', o: 1 },
    clear: { a: '#dfeef6', b: '#f2f8fb', t: '#ffe0e8', r: '#d4577f', o: .32 }
  };
  function sheet(rTop, h, start, len, color, opacity) {
    const g = new T.CylinderGeometry(rTop, .16, h, 40, 5, true, start, len);
    const pos = g.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = pos.getY(i), a = Math.atan2(z, x);
      const k = 1 + .05 * Math.sin(a * 9) * ((y + h / 2) / h);
      pos.setXYZ(i, x * k, y, z * k);
    }
    g.computeVertexNormals();
    const m = new T.Mesh(g, new T.MeshStandardMaterial({ color: F.lin(color), roughness: opacity < 1 ? .15 : .92, metalness: 0, side: T.DoubleSide, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }));
    m.position.y = -h / 2; return m;
  }
  let wrapKey = null;
  function buildWrap(w) {
    if (w === wrapKey) return; wrapKey = w;
    wrapG.children.slice().forEach(c => { wrapG.remove(c); c.geometry?.dispose(); c.material?.dispose?.(); });
    const c = wraps[w] || wraps.kraft;
    const inner = new T.Group(); inner.rotation.y = -Math.PI / 2;
    inner.add(sheet(2.25, 3.3, Math.PI * 1.25, Math.PI * 1.0, c.t, 1));
    inner.add(sheet(2.0, 2.5, Math.PI * 1.1, Math.PI * .95, c.a, c.o));
    inner.add(sheet(1.9, 2.35, -Math.PI * .1, Math.PI * .95, c.b, c.o));
    inner.position.y = -.7;
    wrapG.add(inner);
    const rib = new T.MeshStandardMaterial({ color: F.lin(c.r), roughness: .35, metalness: .1 });
    const y = -3.05;
    const band = new T.Mesh(new T.TorusGeometry(.34, .065, 8, 32), rib); band.rotation.x = Math.PI / 2; band.position.set(0, y, 0); band.scale.set(1, 1, 1.5); wrapG.add(band);
    [-1, 1].forEach(s => {
      const loop = new T.Mesh(new T.TorusGeometry(.3, .055, 8, 28), rib); loop.position.set(s * .33, y + .07, .42); loop.scale.set(1.3, .75, 1); loop.rotation.z = s * .25; wrapG.add(loop);
      const tail = new T.Mesh(new T.BoxGeometry(.12, .85, .02), rib); tail.position.set(s * .16, y - .48, .45); tail.rotation.z = s * .28; wrapG.add(tail);
    });
    const knot = new T.Mesh(new T.SphereGeometry(.1, 10, 8), rib); knot.position.set(0, y + .05, .44); wrapG.add(knot);
  }

  /* ---------- layout ---------- */
  const kindOf = id => (F.spec[id] || ['rose'])[0];
  const kindSize = { rose: 1.3, lisianthus: 1.15, carnation: 1.3, gerbera: 1, sunflower: 1.05, lily: 1.0, bud: .95, gypsophila: 1.3, greenery: .85 };
  const live = new Map(); // key -> {mesh, pos, quat, scale}
  let rng = 1;
  const rnd = () => { rng = (rng * 16807) % 2147483647; return (rng - 1) / 2147483646; };
  function set(list, seed = 1, wrap = 'kraft') {
    buildWrap(wrap);
    rng = seed * 9973 + 7;
    const blooms = list.filter(x => !['gypsophila', 'greenery'].includes(kindOf(x.id)));
    const gyps = list.filter(x => kindOf(x.id) === 'gypsophila'), greens = list.filter(x => kindOf(x.id) === 'greenery');
    for (let i = blooms.length - 1; i > 0; i--) { const j = (rnd() * (i + 1)) | 0; [blooms[i], blooms[j]] = [blooms[j], blooms[i]]; }
    const nb = Math.max(1, blooms.length);
    const R = 1.25 + 1.35 * Math.sqrt(Math.min(nb + gyps.length * .4, 44) / 44);
    const base = 1.05 - .42 * Math.min(1, Math.max(0, (nb - 4) / 36));
    const center = new T.Vector3(0, -R * .42, -R * .72), tilt = -.58, golden = Math.PI * (3 - Math.sqrt(5)), ph0 = rnd() * 6.28;
    const axisX = new T.Vector3(1, 0, 0);
    const dome = (th, ph, r) => {
      const d = new T.Vector3(Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)).applyAxisAngle(axisX, tilt).normalize();
      return { d, p: center.clone().add(d.clone().multiplyScalar(r)) };
    };
    const targets = [];
    blooms.forEach((b, i) => {
      const th = Math.acos(1 - (i + .5) / nb * (1 - Math.cos(1.1))) + (rnd() - .5) * .06;
      const { d, p } = dome(th, i * golden + ph0, R);
      targets.push({ ...b, d, p, s: base * (kindSize[kindOf(b.id)] || 1) * (.92 + rnd() * .16), spin: rnd() * 6.28 });
    });
    gyps.forEach(b => {
      const { d, p } = dome(rnd() * 1.15, rnd() * 6.28, R * .93);
      targets.push({ ...b, d, p, s: base * 1.25, spin: rnd() * 6.28 });
    });
    greens.forEach((b, i) => {
      const ph = (i + .5) / greens.length * 6.28 + rnd() * .3;
      const { d, p } = dome(1.18, ph, R * .9);
      d.lerp(new T.Vector3(d.x * .6, Math.abs(d.y) * .4 + .55, -.25), .55).normalize();
      targets.push({ ...b, d, p, s: base * 1.2, spin: rnd() * 6.28 });
    });
    const seen = new Set(), up = new T.Vector3(0, 0, 1);
    for (const t of targets) {
      seen.add(t.key);
      let o = live.get(t.key);
      if (!o) {
        const mesh = new T.Mesh(F.geometry(t.id), F.material);
        mesh.scale.setScalar(.001);
        if (live.size === 0 || list.length === 1) mesh.position.copy(t.p); else mesh.position.copy(t.p).multiplyScalar(1.4).add(new T.Vector3(0, 1.2, 1));
        o = { mesh, s: t.s, dying: false };
        flowers.add(mesh); live.set(t.key, o);
      }
      o.pos = t.p.clone(); o.s = t.s; o.dying = false;
      o.quat = new T.Quaternion().setFromUnitVectors(up, t.d).multiply(new T.Quaternion().setFromAxisAngle(up, t.spin));
    }
    for (const [k, o] of live) if (!seen.has(k)) o.dying = true;
    // stems: from behind each bloom to a gathered bundle under the ribbon
    stemsG.children.slice().forEach(c => { stemsG.remove(c); c.geometry.dispose(); });
    const gather = new T.Vector3(0, -2.5, -.9);
    targets.filter(t => kindOf(t.id) !== 'gypsophila').slice(0, 40).forEach((t, i) => {
      const a = t.p.clone().sub(t.d.clone().multiplyScalar(.7));
      const end = new T.Vector3((i % 7 - 3) * .045, -4.0 - (i % 3) * .05, (i % 2) * .05 - .02);
      const curve = new T.CatmullRomCurve3([a, gather.clone().add(new T.Vector3(t.p.x * .1, 0, 0)), end]);
      stemsG.add(new T.Mesh(new T.TubeGeometry(curve, 10, .04, 4, false), stemMat));
    });
    const ws = .92 + R * .14;
    wrapG.scale.set(ws * 1.06, ws, ws * 1.06);
    wrapG.position.y = ws * .7 - .7;
    kick();
  }

  /* ---------- size & camera ---------- */
  function size() {
    const w = canvas.clientWidth, h = canvas.clientHeight; if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h;
    camera.position.set(0, .3, w / h < .85 ? 14.5 : 12.5); camera.lookAt(0, -1.1, 0);
    camera.updateProjectionMatrix(); kick();
  }
  new ResizeObserver(size).observe(canvas); size();

  /* ---------- touch: rotate only the bouquet ---------- */
  let yaw = -.25, pitch = .08, vy = 0, drag = null, idle = 0;
  canvas.addEventListener('pointerdown', e => { drag = { x: e.clientX, y: e.clientY }; vy = 0; canvas.setPointerCapture(e.pointerId); stage.classList.add('turning'); kick(); });
  canvas.addEventListener('pointermove', e => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y; drag = { x: e.clientX, y: e.clientY };
    vy = dx * .012; yaw += vy; pitch = Math.max(-.25, Math.min(.5, pitch + dy * .006)); idle = 0; kick();
  });
  const end = () => { drag = null; stage.classList.remove('turning'); };
  canvas.addEventListener('pointerup', end); canvas.addEventListener('pointercancel', end);

  /* ---------- loop ---------- */
  function kick() { busyUntil = performance.now() + 1800; if (on && !raf) raf = requestAnimationFrame(frame); }
  new IntersectionObserver(([e]) => { on = e.isIntersecting; if (on) kick(); }).observe(canvas);
  function frame(now) {
    raf = 0;
    const dt = Math.min(50, now - last) / 1000; last = now;
    if (!drag) {
      vy *= .93; yaw += vy; idle += dt;
      if (idle > 2.5) { // drift back to the front and sway gently
        const front = -.25 + Math.round((yaw + .25) / 6.2832) * 6.2832;
        yaw += (front + (reduced ? 0 : Math.sin(now / 1600) * .3) - yaw) * .025;
      }
    }
    root.rotation.set(pitch, yaw, 0);
    let moving = false;
    for (const [k, o] of live) {
      const m = o.mesh, ts = o.dying ? 0 : o.s;
      m.position.lerp(o.pos, .14);
      m.quaternion.slerp(o.quat, .14);
      const s = m.scale.x + (ts - m.scale.x) * .16;
      m.scale.setScalar(Math.max(.0001, s));
      if (Math.abs(ts - s) > .005 || m.position.distanceToSquared(o.pos) > 1e-4) moving = true;
      if (o.dying && s < .02) { flowers.remove(m); live.delete(k); }
    }
    renderer.render(scene, camera);
    const keep = on && (drag || moving || Math.abs(vy) > .0005 || (!reduced && idle > 2.5) || (idle > 2.5 && idle < 6) || now < busyUntil);
    if (keep) raf = requestAnimationFrame(frame);
  }
  stage.classList.add('is3d');
  window.Studio3D = { set };
})();
