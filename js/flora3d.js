/* Bloomy — procedural 3D flowers (Three.js r128).
   Each flower kind is baked once into a single vertex-coloured geometry, so a
   whole bouquet costs one draw call per stem. Flowers face +Z; the stem runs to -Z. */
(() => {
  'use strict';
  if (!window.THREE) return;
  const T = window.THREE;
  const lin = hex => new T.Color(hex).convertSRGBToLinear();
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const rand = (a, b) => a + rnd() * (b - a);
  const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); };

  /* ---------- petal ----------
     A plane bent into a petal: rounded or pointed tip, cupped across, optional
     centre groove, edges rolling back, tip reflexed, ruffled or notched rim.
     Colour runs base→mid→tip with veins, a lighter rim and per-petal variation. */
  function petalGeo(o) {
    const { len = 1, width = .7, cup = .5, curl = .1, roll = 0, groove = 0, back = 0, pointy = 0, ruffle = 0, notch = 0,
      base, mid, tip, rim, veins = .5, spots = 0, spotColor = '#5a1020', segU = 10, segV = 12, jitter = .05 } = o;
    const g = new T.PlaneGeometry(1, 1, segU, segV);
    const pos = g.attributes.position, cols = [];
    const cb = lin(base), cm = lin(mid), ct = lin(tip), cr = lin(rim || tip), cs = lin(spotColor), tmp = new T.Color();
    const lightJ = 1 + rand(-jitter, jitter), sid = rnd() * 100;
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) * 2, v = pos.getY(i) + .5, au = Math.abs(u);
      const q = (v - .42) / .58;
      let w = width * Math.sqrt(Math.max(0, 1 - q * q)) * Math.sqrt(Math.min(1, v / .2 + .06));
      if (pointy) w *= 1 - pointy * Math.pow(v, 2.2);
      let y = v * len;
      if (ruffle) y *= 1 - ruffle * .35 * Math.abs(Math.sin(u * 7 + sid)) * Math.pow(v, 2);
      if (notch) y *= 1 - notch * .12 * Math.pow(Math.abs(Math.sin(u * Math.PI * 1.5)), 2) * Math.pow(v, 6);
      let z = cup * u * u * w * .55 * (.35 + v)
        - curl * v * v * len
        - groove * Math.exp(-u * u * 18) * Math.sin(Math.PI * v) * len * .12
        - roll * Math.pow(au, 3) * Math.pow(v, 1.5) * w * .9
        + back * Math.pow(v, 3) * len
        + (ruffle ? ruffle * .06 * Math.sin(u * 13 + v * 7 + sid) * v * w : .01 * Math.sin(u * 3 + v * 6 + sid));
      pos.setXYZ(i, u * w / 2, y, z);
      // colour
      if (v < .45) tmp.copy(cb).lerp(cm, v / .45); else tmp.copy(cm).lerp(ct, (v - .45) / .55);
      tmp.lerp(cr, Math.pow(au, 2.5) * .45 * v);
      const vein = 1 - veins * .09 * (.5 + .5 * Math.cos(u * 22)) * Math.sin(Math.PI * Math.min(1, v * 1.2));
      const shade = (.82 + .18 * Math.min(1, v * 2.2)) * vein * lightJ; // darker deep inside the flower
      tmp.multiplyScalar(shade);
      if (spots && v > .15 && v < .65 && au < .7) {
        const h = hash(Math.round(u * 9 + sid), Math.round(v * 16));
        if (h > 1 - spots) tmp.lerp(cs, .85);
      }
      cols.push(tmp.r, tmp.g, tmp.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    return g;
  }
  function tint(g, hex, vary = 0) {
    const c = lin(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { const k = 1 + (vary ? (hash(i, n) - .5) * vary : 0); a[i * 3] = c.r * k; a[i * 3 + 1] = c.g * k; a[i * 3 + 2] = c.b * k; }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    return g;
  }
  function merge(parts) {
    const P = [], C = [], I = []; let off = 0; const v = new T.Vector3();
    for (const { geo, m } of parts) {
      const pos = geo.attributes.position, col = geo.attributes.color;
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m); P.push(v.x, v.y, v.z); C.push(col.getX(i), col.getY(i), col.getZ(i)); }
      if (geo.index) for (let i = 0; i < geo.index.count; i++) I.push(geo.index.getX(i) + off);
      else for (let i = 0; i < pos.count; i++) I.push(i + off);
      off += pos.count;
    }
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    out.setAttribute('color', new T.Float32BufferAttribute(C, 3));
    out.setIndex(I);
    out.computeVertexNormals();
    out.computeBoundingSphere();
    return out;
  }
  const M = () => new T.Matrix4();
  const rotZ = a => M().makeRotationZ(a), rotX = a => M().makeRotationX(a), rotY = a => M().makeRotationY(a);
  const move = (x, y, z) => M().makeTranslation(x, y, z), scale = (x, y, z) => M().makeScale(x, y, z);
  const chain = (...ms) => ms.reduce((a, b) => a.multiply(b), M());
  /* petal placement: around the axis (+Z) by angle a, offset outward r, lifted toward the axis by lift */
  const petalM = (a, lift, r = 0, z = 0) => chain(rotZ(a), move(0, r, z), rotX(lift));

  /* rose heart: one sheet rolled into a spiral, flaring open at the top */
  function spiralCore(c, s) {
    const segA = 110, segT = 7, turns = 2.4, P = [], C = [], I = [];
    const cb = lin(c[0]), cm = lin(c[1]), ct = lin(c[2]), tmp = new T.Color();
    for (let i = 0; i <= segA; i++) {
      const f = i / segA, th = f * turns * 6.283;
      const r0 = (.03 + .2 * f) * s, h = (.3 + .12 * f) * s;
      for (let j = 0; j <= segT; j++) {
        const tt = j / segT, r = r0 * (1 + .55 * tt * tt * (.4 + f)) + .012 * s * Math.sin(th * 3 + tt * 4);
        P.push(Math.cos(th) * r, Math.sin(th) * r, tt * h - .08 * s);
        tmp.copy(cb).lerp(cm, tt).lerp(ct, tt * tt * .6).multiplyScalar(.72 + .28 * f);
        C.push(tmp.r, tmp.g, tmp.b);
      }
    }
    for (let i = 0; i < segA; i++) for (let j = 0; j < segT; j++) {
      const a0 = i * (segT + 1) + j, b0 = a0 + segT + 1;
      I.push(a0, b0, a0 + 1, b0, b0 + 1, a0 + 1);
    }
    const g = new T.BufferGeometry();
    g.setAttribute('position', new T.Float32BufferAttribute(P, 3));
    g.setAttribute('color', new T.Float32BufferAttribute(C, 3));
    g.setIndex(I);
    return g;
  }

  /* green parts */
  function sepals(parts, n, len, s = 1, color = ['#3f6b31', '#5b8a43', '#7aa65a']) {
    const g = petalGeo({ len: len * s, width: .2 * s, cup: .3, curl: -.05, pointy: .9, base: color[0], mid: color[1], tip: color[2], veins: .2, segU: 4, segV: 6 });
    for (let i = 0; i < n; i++) parts.push({ geo: g, m: petalM(i / n * 6.283 + rand(-.2, .2), -.35 - rand(0, .5), .05 * s, -.04 * s) });
  }
  function stemBit(parts, s = 1, len = .9, r = .045) {
    const g = tint(new T.CylinderGeometry(r * s * .9, r * s, len * s, 7, 1), '#4f7d3a');
    parts.push({ geo: g, m: chain(move(0, 0, -len * s / 2 - .05 * s), rotX(Math.PI / 2)) });
    parts.push({ geo: tint(new T.SphereGeometry(.12 * s, 10, 8), '#5d8a45'), m: chain(move(0, 0, -.06 * s), scale(1, 1, .7)) });
  }

  const kinds = {
    rose(c, s = 1) {
      const parts = [];
      // [count, size, lift, cup, roll, back] from the tight centre outward
      [[5, .62, 1.12, 1.0, .15, 0], [6, .7, 1.0, .95, .25, 0],
       [7, .78, .9, 1.0, .35, .05], [8, .89, .7, .92, .5, .1], [8, 1, .5, .82, .62, .16]].forEach(([n, k, lift, cup, roll, back], li) => {
        for (let i = 0; i < n; i++) {
          const g = petalGeo({ len: .8 * k * s, width: 1.08 * k * s, cup, roll, back, curl: .04, segU: 12, base: c[0], mid: c[1], tip: c[2], rim: c[3] || c[2], veins: .5, jitter: .06 });
          parts.push({ geo: g, m: petalM(i / n * 6.283 + li * 2.39 + rand(-.15, .15), lift + rand(-.07, .07), k * .06 * s) });
        }
      });
      parts.push({ geo: spiralCore(c, s), m: M() });
      sepals(parts, 5, .55, s); stemBit(parts, s);
      return parts;
    },
    lisianthus(c, s = 1) {
      const parts = [];
      [[5, .78, 1.05, .9], [5, 1, .72, .75]].forEach(([n, k, lift, cup], li) => {
        for (let i = 0; i < n; i++) {
          const g = petalGeo({ len: .9 * k * s, width: 1.1 * k * s, cup, ruffle: .35, roll: .2, base: c[0], mid: c[1], tip: c[2], veins: .7 });
          parts.push({ geo: g, m: petalM(i / n * 6.283 + li * .63, lift + rand(-.08, .08), .04 * s) });
        }
      });
      const pist = tint(new T.CylinderGeometry(.03 * s, .04 * s, .4 * s, 6), '#e9efc8');
      parts.push({ geo: pist, m: chain(move(0, 0, .22 * s), rotX(Math.PI / 2)) });
      sepals(parts, 5, .35, s); stemBit(parts, s);
      return parts;
    },
    carnation(c, s = 1) {
      const parts = [];
      [[9, .5, 1.3], [11, .66, 1.05], [13, .8, .8], [15, .92, .55], [16, 1, .32]].forEach(([n, k, lift], li) => {
        for (let i = 0; i < n; i++) {
          const g = petalGeo({ len: .74 * k * s, width: .72 * k * s, cup: .5, ruffle: 1, notch: 1, base: c[0], mid: c[1], tip: c[2], rim: c[3] || c[2], veins: .3, segU: 12, segV: 8, jitter: .08 });
          parts.push({ geo: g, m: petalM(i / n * 6.283 + li * .7 + rand(-.1, .1), lift + rand(-.12, .12), .03 * s) });
        }
      });
      // long calyx tube
      parts.push({ geo: tint(new T.CylinderGeometry(.16 * s, .1 * s, .5 * s, 10, 1, true), '#5b8a43'), m: chain(move(0, 0, -.22 * s), rotX(Math.PI / 2)) });
      sepals(parts, 5, .3, s); stemBit(parts, s, .8, .04);
      return parts;
    },
    gerbera(c, s = 1) {
      const parts = [];
      [[26, 1, .14], [22, .86, .34]].forEach(([n, k, lift], li) => {
        for (let i = 0; i < n; i++) {
          const g = petalGeo({ len: .98 * k * s, width: .24 * s, cup: .35, groove: 1, notch: 1, curl: .04, base: c[0], mid: c[1], tip: c[2], veins: .8, segU: 6, segV: 8, jitter: .07 });
          parts.push({ geo: g, m: petalM(i / n * 6.283 + li * .12, lift + rand(-.06, .06), .27 * s) });
        }
      });
      // short inner florets
      const fl = petalGeo({ len: .16 * s, width: .07 * s, cup: .4, base: c[0], mid: c[1], tip: c[1], veins: 0, segU: 2, segV: 3 });
      for (let i = 0; i < 34; i++) parts.push({ geo: fl, m: petalM(i / 34 * 6.283, .95, .22 * s) });
      // disc: dark centre + ring of tiny stamens
      parts.push({ geo: tint(new T.SphereGeometry(.24 * s, 22, 8, 0, 6.283, 0, Math.PI / 2), c[3] || '#3a1c16', .25), m: chain(rotX(Math.PI / 2), scale(1, .4, 1)) });
      const dot = tint(new T.IcosahedronGeometry(.018 * s, 0), c[4] || '#e8c44a');
      for (let i = 0; i < 70; i++) { const a = i * 2.39996, r = (.12 + .1 * (i % 7) / 7) * s; parts.push({ geo: dot, m: move(Math.cos(a) * r, Math.sin(a) * r, .085 * s) }); }
      sepals(parts, 16, .35, s); stemBit(parts, s, .9, .05);
      return parts;
    },
    sunflower(c, s = 1) {
      const parts = [];
      [[24, 1, .2], [20, .88, .42]].forEach(([n, k, lift], li) => {
        for (let i = 0; i < n; i++) {
          const g = petalGeo({ len: .78 * k * s, width: .34 * s, cup: .4, groove: 1.2, pointy: .55, curl: .06, base: c[0], mid: c[1], tip: c[2], veins: .9, segU: 6, segV: 8, jitter: .08 });
          parts.push({ geo: g, m: petalM(i / n * 6.283 + li * .13, lift + rand(-.06, .06), .4 * s) });
        }
      });
      parts.push({ geo: tint(new T.SphereGeometry(.44 * s, 26, 8, 0, 6.283, 0, Math.PI / 2), '#2e1a0e'), m: chain(rotX(Math.PI / 2), scale(1, .3, 1)) });
      // seeds in a golden-angle spiral, lighter toward the rim
      const seedG = new T.IcosahedronGeometry(.024 * s, 0);
      for (let i = 0; i < 230; i++) {
        const a = i * 2.39996, r = Math.sqrt(i / 230) * .42 * s, k = r / (.42 * s);
        const g = tint(seedG.clone(), k > .8 ? '#7a4a1c' : k > .5 ? '#4a2c14' : '#2a170b');
        parts.push({ geo: g, m: move(Math.cos(a) * r, Math.sin(a) * r, .13 * s * (1 - k * k) + .02) });
      }
      sepals(parts, 14, .42, s); stemBit(parts, s, .9, .06);
      return parts;
    },
    lily(c, s = 1) {
      const parts = [];
      [[3, 0, .7, .55, .55], [3, Math.PI / 3, .6, .7, .5]].forEach(([n, rot, lift, w, back]) => {
        for (let i = 0; i < n; i++) {
          const g = petalGeo({ len: 1.25 * s, width: w * s, cup: .45, groove: 1.5, back, curl: -.04, pointy: .9, base: c[0], mid: c[1], tip: c[2], veins: .6, spots: c[3] ? .16 : 0, spotColor: c[3] || '#5a1020', segU: 8, segV: 14 });
          parts.push({ geo: g, m: petalM(i / n * 6.283 + rot, lift + rand(-.05, .05), .02 * s) });
        }
      });
      const fil = tint(new T.CylinderGeometry(.01 * s, .013 * s, .75 * s, 4), '#dfe6b0');
      const anth = tint(new T.SphereGeometry(.05 * s, 8, 6), '#8a3a14');
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * 6.283 + .3, d = chain(rotZ(a), rotX(1.12));
        parts.push({ geo: fil, m: d.clone().multiply(move(0, .38 * s, 0)) });
        parts.push({ geo: anth, m: d.clone().multiply(move(0, .76 * s, 0)).multiply(scale(.7, 1.6, .7)) });
      }
      parts.push({ geo: tint(new T.CylinderGeometry(.02 * s, .03 * s, .85 * s, 6), '#b9cf7a'), m: chain(move(0, 0, .42 * s), rotX(Math.PI / 2)) });
      parts.push({ geo: tint(new T.SphereGeometry(.06 * s, 8, 6), '#8fae4a'), m: move(0, 0, .86 * s) });
      stemBit(parts, s, .9, .05);
      return parts;
    },
    bud(c, s = 1) {
      const parts = [];
      for (let i = 0; i < 3; i++) {
        const g = petalGeo({ len: 1.15 * s, width: .46 * s, cup: 1.6, groove: .6, pointy: .7, base: '#6f8f36', mid: '#97b84c', tip: '#c8db86', veins: .4, segU: 6, segV: 10 });
        parts.push({ geo: g, m: petalM(i / 3 * 6.283, 1.4, .02 * s) });
      }
      stemBit(parts, s, 1, .045);
      return parts;
    },
    gypsophila(c, s = 1) {
      const parts = [];
      const stem = tint(new T.CylinderGeometry(.007, .009, 1, 3), '#8aa86a');
      const flower = new T.IcosahedronGeometry(.04 * s, 1);
      const branch = (m, len, depth) => {
        parts.push({ geo: stem, m: m.clone().multiply(move(0, len / 2, 0)).multiply(scale(1, len, 1)) });
        const tipM = m.clone().multiply(move(0, len, 0));
        if (depth === 0) { for (let k = 0; k < 4; k++) parts.push({ geo: tint(flower.clone(), k % 2 ? '#ffffff' : '#f3f1ea'), m: tipM.clone().multiply(move(rand(-.04, .04) * s, rand(-.02, .03) * s, rand(-.04, .04) * s)) }); return; }
        const n = depth === 2 ? 4 : 3;
        for (let i = 0; i < n; i++) branch(tipM.clone().multiply(rotY(i / n * 6.283 + rand(-.3, .3))).multiply(rotX(rand(.35, .75))), len * rand(.45, .65), depth - 1);
      };
      for (let b = 0; b < 5; b++) branch(chain(rotX(Math.PI / 2), rotY(b * 1.26), rotZ(rand(.15, .5))), .55 * s, 2);
      return parts;
    },
    greenery(c, s = 1) {
      // eucalyptus-style stem with paired round leaves
      const parts = [];
      const L = 1.7 * s;
      parts.push({ geo: tint(new T.CylinderGeometry(.012, .02, L, 5), '#5c6e4f'), m: chain(move(0, 0, L / 2 - .2 * s), rotX(Math.PI / 2)) });
      for (let i = 0; i < 7; i++) {
        const z = -.05 * s + i * .22 * s, k = 1 - i * .08;
        const g = petalGeo({ len: .42 * k * s, width: .44 * k * s, cup: .2, curl: -.04, base: '#5f7a64', mid: '#7f9c86', tip: '#9db8a3', rim: '#b5c9b6', veins: .3, segU: 6, segV: 6, jitter: .1 });
        [-1, 1].forEach(side => parts.push({ geo: g, m: chain(move(0, 0, z), rotZ(side * Math.PI / 2 + i * .6), rotX(-.25 - rand(0, .3))) }));
      }
      return parts;
    }
  };

  /* builder flower id → kind + colours [base, mid, tip, rim/spots, extra] */
  const spec = {
    gerbera: ['gerbera', ['#b8325e', '#e8658d', '#fb9fbb', '#2e1410']],
    'gerbera-red': ['gerbera', ['#86101f', '#cf2236', '#ee4555', '#24100c']],
    'gerbera-yellow': ['gerbera', ['#d18a12', '#f2bd2a', '#ffdf6e', '#3b2314']],
    'gerbera-white': ['gerbera', ['#d7d2c2', '#f6f4ec', '#ffffff', '#4a3e1a', '#d4b43e']],
    rose: ['rose', ['#a3305a', '#de6690', '#f7a9c2', '#ffd6e2']],
    'rose-white': ['rose', ['#c9bf9e', '#ece4cf', '#fbf7ec', '#fffdf7']],
    'rose-red': ['rose', ['#4a0614', '#93102a', '#c41f3c', '#7a0c22']],
    'rose-orange': ['rose', ['#b8481a', '#ec7c36', '#ffb27a', '#ffd2a8']],
    'lily-pink': ['lily', ['#fbeef2', '#ef9fc0', '#d0457e', '#8a1e4a']],
    'lily-white': ['lily', ['#e3eac2', '#fbfaf3', '#ffffff']],
    'lily-orange': ['lily', ['#f6c066', '#f18a2a', '#de5c18', '#6a2208']],
    lily: ['bud', []],
    'lisianthus-white': ['lisianthus', ['#dde5c8', '#f7f5ee', '#ffffff']],
    'lisianthus-pink': ['lisianthus', ['#cf8fb5', '#e8bcd6', '#fbe9f2']],
    carnation: ['carnation', ['#b33561', '#e06e95', '#f7a3bd', '#ffd3df']],
    'carnation-wine': ['carnation', ['#3f0718', '#7d1236', '#a82e55', '#c95a7c']],
    sunflower: ['sunflower', ['#c96a08', '#f0a816', '#fcc838']],
    gypsophila: ['gypsophila', []],
    greenery: ['greenery', []]
  };
  const cache = {};
  function geometry(id) {
    if (cache[id]) return cache[id];
    const [kind, colors] = spec[id] || spec.rose;
    seed = 7 + id.length * 13;
    return (cache[id] = merge(kinds[kind](colors, 1)));
  }
  const material = new T.MeshPhysicalMaterial({ vertexColors: true, side: T.DoubleSide, roughness: .6, metalness: 0, sheen: new T.Color(.06, .05, .055), clearcoat: 0, envMapIntensity: .5 });

  /* soft studio lighting baked into an environment map */
  function studioEnv(renderer) {
    const env = new T.Scene();
    const sky = new T.Mesh(new T.SphereGeometry(10, 32, 16), new T.MeshBasicMaterial({ side: T.BackSide, vertexColors: true }));
    const pos = sky.geometry.attributes.position, col = [];
    const top = new T.Color('#fff7fa'), mid = new T.Color('#f5e3e6'), bot = new T.Color('#b89a8e');
    for (let i = 0; i < pos.count; i++) { const y = pos.getY(i) / 10; const c = y > 0 ? mid.clone().lerp(top, y) : mid.clone().lerp(bot, -y); col.push(c.r, c.g, c.b); }
    sky.geometry.setAttribute('color', new T.Float32BufferAttribute(col, 3));
    env.add(sky);
    const box = new T.Mesh(new T.PlaneGeometry(6, 4), new T.MeshBasicMaterial({ color: 0xffffff }));
    box.position.set(3, 6, 5); box.lookAt(0, 0, 0); env.add(box);
    const pm = new T.PMREMGenerator(renderer);
    const tex = pm.fromScene(env, .03).texture;
    pm.dispose();
    return tex;
  }
  window.Flora3D = { geometry, material, spec, petalGeo, tint, merge, lin, studioEnv };
})();
