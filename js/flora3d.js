/* Bloomy — procedural 3D flowers for the bouquet studio (Three.js r128).
   Each flower kind is baked once into a single vertex-coloured geometry, so a
   bouquet of 60 stems is only ~60 draw calls. */
(() => {
  'use strict';
  if (!window.THREE) return;
  const T = window.THREE;
  const lin = hex => new T.Color(hex).convertSRGBToLinear();
  let seed = 11;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
  const rand = (a, b) => a + rnd() * (b - a);

  /* petal: plane bent into a cup, rounded tip, colour gradient base→tip */
  function petalGeo({ len = 1, width = .7, cup = .5, curl = .12, base, mid, tip, edge = .12, segU = 8, segV = 10, pointy = 0, ruffle = 0, back = 0 }) {
    const g = new T.PlaneGeometry(1, 1, segU, segV);
    const pos = g.attributes.position, cols = [];
    const cb = lin(base), cm = lin(mid), ct = lin(tip), tmp = new T.Color();
    for (let i = 0; i < pos.count; i++) {
      const u = pos.getX(i) * 2, v = pos.getY(i) + .5;
      const q = (v - .42) / .58;
      let w = width * Math.sqrt(Math.max(0, 1 - q * q)) * Math.sqrt(Math.min(1, v / .22 + .08));
      if (pointy) w *= 1 - pointy * Math.pow(v, 2.2);
      let y = v * len;
      if (ruffle) y *= 1 - ruffle * .5 * Math.abs(Math.sin(u * 7)) * v;
      const z = cup * u * u * w * .55 * (.35 + v) - curl * v * v * len + back * Math.pow(v, 3) * len
        + (ruffle ? ruffle * .07 * Math.sin(u * 11 + v * 9) * v : .012 * Math.sin(u * 3 + v * 6));
      pos.setXYZ(i, u * w / 2, y, z);
      if (v < .5) tmp.copy(cb).lerp(cm, v / .5); else tmp.copy(cm).lerp(ct, (v - .5) / .5);
      tmp.lerp(ct, Math.abs(u) * edge);
      cols.push(tmp.r, tmp.g, tmp.b);
    }
    g.setAttribute('color', new T.Float32BufferAttribute(cols, 3));
    return g;
  }
  /* solid-colour helper: give a plain geometry a colour attribute */
  function tint(g, hex) {
    const c = lin(hex), n = g.attributes.position.count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { a[i * 3] = c.r; a[i * 3 + 1] = c.g; a[i * 3 + 2] = c.b; }
    g.setAttribute('color', new T.BufferAttribute(a, 3));
    return g;
  }
  /* merge [{geo, m:Matrix4}] into one indexed geometry */
  function merge(parts) {
    const P = [], C = [], I = []; let off = 0;
    for (const { geo, m } of parts) {
      const g = geo.index ? geo : geo; const pos = g.attributes.position, col = g.attributes.color;
      const v = new T.Vector3();
      for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i).applyMatrix4(m); P.push(v.x, v.y, v.z); C.push(col.getX(i), col.getY(i), col.getZ(i)); }
      if (g.index) for (let i = 0; i < g.index.count; i++) I.push(g.index.getX(i) + off);
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
  /* place a petal: around the flower axis (+Z) by angle, lifted toward the axis by lift */
  function petalM(angle, lift, y0 = 0) {
    return new T.Matrix4().makeRotationZ(angle).multiply(new T.Matrix4().makeTranslation(0, y0, 0)).multiply(new T.Matrix4().makeRotationX(lift));
  }

  const kinds = {
    rose(c, s = 1) {
      const parts = [];
      [[4, .3, 1.5], [5, .42, 1.36], [6, .54, 1.18], [7, .66, 1.0], [8, .78, .8], [9, .9, .6]].forEach(([n, k, lift], li) => {
        const g = petalGeo({ len: .82 * k * s, width: 1.02 * k * s, cup: 1.15, curl: .1 + li * .03, base: c[0], mid: c[1], tip: c[2], edge: .25 });
        for (let i = 0; i < n; i++) parts.push({ geo: g, m: petalM(i / n * 6.283 + li * 2.39, lift + rand(-.06, .06)) });
      });
      return parts;
    },
    lisianthus(c, s = 1) {
      const parts = [];
      [[5, .55, 1.25], [5, .8, .95], [6, 1, .7]].forEach(([n, k, lift], li) => {
        const g = petalGeo({ len: .85 * k * s, width: 1.05 * k * s, cup: .8, curl: .04, base: c[0], mid: c[1], tip: c[2], edge: .3, ruffle: .25 });
        for (let i = 0; i < n; i++) parts.push({ geo: g, m: petalM(i / n * 6.283 + li * 1.1, lift + rand(-.08, .08)) });
      });
      return parts;
    },
    carnation(c, s = 1) {
      const parts = [];
      [[8, .5, 1.25], [10, .7, .95], [12, .85, .65], [14, 1, .38]].forEach(([n, k, lift], li) => {
        const g = petalGeo({ len: .62 * k * s, width: .62 * k * s, cup: .4, curl: .02, base: c[0], mid: c[1], tip: c[2], edge: .2, ruffle: .9, segU: 12 });
        for (let i = 0; i < n; i++) parts.push({ geo: g, m: petalM(i / n * 6.283 + li * .7, lift + rand(-.1, .1)) });
      });
      return parts;
    },
    gerbera(c, s = 1) {
      const parts = [];
      [[24, 1, .2], [20, .82, .42]].forEach(([n, k, lift], li) => {
        const g = petalGeo({ len: .98 * k * s, width: .24 * s, cup: .55, curl: .05, base: c[0], mid: c[1], tip: c[2], edge: .1, segU: 4, segV: 6 });
        for (let i = 0; i < n; i++) parts.push({ geo: g, m: petalM(i / n * 6.283 + li * .13, lift + rand(-.05, .05)) });
      });
      const disc = tint(new T.SphereGeometry(.27 * s, 18, 8, 0, 6.283, 0, Math.PI / 2), c[3] || '#3a1c16');
      parts.push({ geo: disc, m: new T.Matrix4().makeRotationX(Math.PI / 2).multiply(new T.Matrix4().makeScale(1, .45, 1)) });
      parts.push({ geo: tint(new T.TorusGeometry(.28 * s, .045 * s, 6, 24), c[4] || '#d9b23a'), m: new T.Matrix4().makeTranslation(0, 0, .03) });
      return parts;
    },
    sunflower(c, s = 1) {
      const parts = [];
      [[22, 1, .25], [18, .85, .5]].forEach(([n, k, lift], li) => {
        const g = petalGeo({ len: .8 * k * s, width: .34 * s, cup: .5, curl: .08, base: c[0], mid: c[1], tip: c[2], edge: .1, segU: 4, segV: 6, pointy: .5 });
        for (let i = 0; i < n; i++) parts.push({ geo: g, m: petalM(i / n * 6.283 + li * .14, lift + rand(-.05, .05), .35 * s) });
      });
      const disc = tint(new T.SphereGeometry(.42 * s, 22, 8, 0, 6.283, 0, Math.PI / 2), '#3b2314');
      parts.push({ geo: disc, m: new T.Matrix4().makeRotationX(Math.PI / 2).multiply(new T.Matrix4().makeScale(1, .35, 1)) });
      return parts;
    },
    lily(c, s = 1) {
      const parts = [];
      [[3, 0, .62], [3, Math.PI / 3, .5]].forEach(([n, rot, lift]) => {
        const g = petalGeo({ len: 1.25 * s, width: .62 * s, cup: .55, curl: -.05, back: .32, base: c[0], mid: c[1], tip: c[2], edge: .15, pointy: .9, segU: 6, segV: 12 });
        for (let i = 0; i < n; i++) parts.push({ geo: g, m: petalM(i / n * 6.283 + rot, lift) });
      });
      const stam = tint(new T.CylinderGeometry(.012 * s, .012 * s, .7 * s, 4), '#d8e0a0');
      const anth = tint(new T.SphereGeometry(.045 * s, 6, 4), '#c0561e');
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * 6.283, m = new T.Matrix4().makeRotationZ(a).multiply(new T.Matrix4().makeRotationX(1.05)).multiply(new T.Matrix4().makeTranslation(0, .35 * s, 0));
        parts.push({ geo: stam, m });
        parts.push({ geo: anth, m: new T.Matrix4().makeRotationZ(a).multiply(new T.Matrix4().makeRotationX(1.05)).multiply(new T.Matrix4().makeTranslation(0, .7 * s, 0)) });
      }
      return parts;
    },
    bud(c, s = 1) {
      const parts = [];
      const g = petalGeo({ len: 1.1 * s, width: .42 * s, cup: 1.4, curl: 0, base: '#7d9a3c', mid: '#9cbb4c', tip: '#c4d77a', edge: .1, pointy: .7 });
      for (let i = 0; i < 3; i++) parts.push({ geo: g, m: petalM(i / 3 * 6.283, 1.38) });
      return parts;
    },
    gypsophila(c, s = 1) {
      const parts = [], dot = tint(new T.IcosahedronGeometry(.05 * s, 0), '#ffffff'), stem = tint(new T.CylinderGeometry(.008, .008, 1, 3), '#8aa86a');
      for (let b = 0; b < 7; b++) {
        const a = b / 7 * 6.283 + rand(-.3, .3), tilt = rand(.25, .85), len = rand(.45, .8) * s;
        const dirM = new T.Matrix4().makeRotationZ(a).multiply(new T.Matrix4().makeRotationX(Math.PI / 2 - tilt));
        parts.push({ geo: stem, m: dirM.clone().multiply(new T.Matrix4().makeTranslation(0, len / 2, 0)).multiply(new T.Matrix4().makeScale(1, len, 1)) });
        for (let k = 0; k < 7; k++) parts.push({ geo: dot, m: dirM.clone().multiply(new T.Matrix4().makeTranslation(rand(-.12, .12) * s, len + rand(-.1, .1) * s, rand(-.1, .1) * s)) });
      }
      return parts;
    },
    greenery(c, s = 1) {
      const parts = [];
      const leaf = petalGeo({ len: .55 * s, width: .3 * s, cup: .25, curl: -.05, base: '#4c7a40', mid: '#6b9a57', tip: '#86b06b', edge: .05, pointy: .5, segU: 4, segV: 6 });
      const stem = tint(new T.CylinderGeometry(.015, .02, 1.6 * s, 4), '#4d7a3d');
      parts.push({ geo: stem, m: new T.Matrix4().makeRotationX(Math.PI / 2).multiply(new T.Matrix4().makeTranslation(0, .8 * s, 0)) });
      for (let i = 0; i < 8; i++) {
        const z = .2 * s + i * .17 * s, side = i % 2 ? 1 : -1;
        parts.push({ geo: leaf, m: new T.Matrix4().makeTranslation(0, 0, z).multiply(new T.Matrix4().makeRotationZ(side * 1.2 + rand(-.2, .2))).multiply(new T.Matrix4().makeRotationX(-.5)) });
      }
      parts.push({ geo: leaf, m: new T.Matrix4().makeTranslation(0, 0, 1.6 * s).multiply(new T.Matrix4().makeRotationX(Math.PI / 2)) });
      return parts;
    }
  };

  /* builder flower id → kind + colours */
  const spec = {
    gerbera: ['gerbera', ['#d4527a', '#f08daa', '#ffc6d6', '#3a1c16']],
    'gerbera-red': ['gerbera', ['#9e1426', '#d8283d', '#f04b5a', '#2a1210']],
    'gerbera-yellow': ['gerbera', ['#d9961c', '#f3c432', '#ffe27a', '#3b2314']],
    'gerbera-white': ['gerbera', ['#dcd8cb', '#f7f5ee', '#ffffff', '#4a3e1a', '#c9b244']],
    rose: ['rose', ['#c74e74', '#ec8fac', '#ffd8e3']],
    'rose-white': ['rose', ['#d8d1bf', '#f6f1e6', '#ffffff']],
    'rose-red': ['rose', ['#5e0a1c', '#a3122e', '#d02a46']],
    'rose-orange': ['rose', ['#c9541c', '#f0873e', '#ffc58f']],
    'lily-pink': ['lily', ['#f6e3ea', '#ec9dbd', '#d45386']],
    'lily-white': ['lily', ['#e6eccc', '#faf8f0', '#ffffff']],
    'lily-orange': ['lily', ['#f2b25a', '#f08a2c', '#e0601c']],
    lily: ['bud', []],
    'lisianthus-white': ['lisianthus', ['#dfe6cf', '#f7f5ee', '#ffffff']],
    'lisianthus-pink': ['lisianthus', ['#d9a3c3', '#ecc4da', '#fbe8f1']],
    carnation: ['carnation', ['#d6567e', '#ee93b0', '#ffc9d8']],
    'carnation-wine': ['carnation', ['#4f0b22', '#86163c', '#b23a5e']],
    sunflower: ['sunflower', ['#d98a1c', '#f5c23c', '#ffe07a']],
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
  const material = new T.MeshStandardMaterial({ vertexColors: true, side: T.DoubleSide, roughness: .6, metalness: 0 });
  window.Flora3D = { geometry, material, spec, petalGeo, tint, merge, lin };
})();
