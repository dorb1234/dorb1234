/* Bloomy — "tap the bouquet" surprise: 5 taps → spin, explode, 10% off */
(() => {
  'use strict';
  const $ = s => document.querySelector(s);
  const NEED = 5, PCT = 10, CODE = 'BLOOMY10', KEY = 'bloomy-discount';
  let unlocked = false, taps = 0, busy = false;
  try { unlocked = localStorage.getItem(KEY) === CODE; } catch (e) {}

  window.BloomyDiscount = { get: () => unlocked ? { pct: PCT, code: CODE } : null };

  const btn = $('#surprise-btn'), text = $('#sb-text'), dots = $('#sb-dots'), host = $('#hero-3d');
  const lines = ['לחצו על הזר להפתעה', 'עוד!', 'ממשיכים…', 'כמעט…', 'עוד אחת!!'];
  function ui() {
    if (!btn) return;
    btn.classList.toggle('done', unlocked);
    text.textContent = unlocked && !taps ? 'יש לכם 10% הנחה 🎉 · עוד פעם?' : lines[Math.min(taps, lines.length - 1)];
    dots.hidden = false;
    dots.innerHTML = Array.from({ length: NEED }, (_, i) => `<i class="${i < taps ? 'on' : ''}"></i>`).join('');
    btn.style.setProperty('--heat', taps / NEED);
  }

  function confetti() {
    if (window.BloomyFX?.reduced) return;
    const box = document.createElement('div'); box.className = 'confetti'; box.setAttribute('aria-hidden', 'true');
    const colors = ['#ef7aa0', '#f2b544', '#ffd3e0', '#a9c29a', '#c9426f', '#ffe6d6'];
    for (let i = 0; i < 90; i++) {
      const s = document.createElement('i');
      s.style.cssText = `--x:${(Math.random() * 2 - 1) * 48}vw;--y:${-30 - Math.random() * 60}vh;--r:${Math.random() * 900 - 450}deg;--d:${(.9 + Math.random() * .9).toFixed(2)}s;background:${colors[i % colors.length]};left:50%;top:55%;${i % 3 ? '' : 'border-radius:50%;'}`;
      box.append(s);
    }
    document.body.append(box);
    setTimeout(() => box.remove(), 2200);
  }

  function reveal() {
    unlocked = true; busy = false;
    try { localStorage.setItem(KEY, CODE); } catch (e) {}
    ui(); confetti();
    const d = $('#prize'); if (d && !d.open) d.showModal();
    document.dispatchEvent(new CustomEvent('bloomy:discount'));
  }

  function tap() {
    if (busy) return;
    taps++;
    ui();
    if (window.Bloom3D) window.Bloom3D.pulse(taps / NEED);
    else if (host) { host.classList.remove('shake'); void host.offsetWidth; host.classList.add('shake'); }
    if (navigator.vibrate) try { navigator.vibrate(taps >= NEED ? [30, 40, 60] : 15); } catch (e) {}
    if (taps >= NEED) {
      busy = true; taps = 0;
      (window.Bloom3D ? window.Bloom3D.explode().then(() => new Promise(r => setTimeout(r, 1300))) : new Promise(r => setTimeout(r, 500))).then(reveal);
    }
  }
  window.BloomySurprise = { tap };

  btn?.addEventListener('click', e => { e.stopPropagation(); tap(); });
  // without WebGL, taps on the fallback photo count too
  host?.addEventListener('click', e => { if (host.classList.contains('no3d') && !e.target.closest('button')) tap(); });

  $('#prize-copy')?.addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(CODE); toast('הקוד הועתק ✓'); } catch (e) { toast('הקוד: ' + CODE); }
  });
  $('#prize')?.addEventListener('click', e => { if (e.target.id === 'prize' || e.target.closest('[data-close]')) $('#prize').close(); });
  ui();
  if (unlocked) document.dispatchEvent(new CustomEvent('bloomy:discount'));

  /* giveaway strip on the home page */
  const strip = $('#ga-strip'), GV = window.BLOOMY && window.BLOOMY.giveaway;
  if (strip && GV) {
    const end = new Date(GV.ends).getTime();
    const upd = () => {
      const s = Math.floor((end - Date.now()) / 1000);
      if (s <= 0) { strip.hidden = true; return false; }
      strip.hidden = false;
      $('#ga-strip-left').textContent = s > 86400 ? `נשארו ${Math.floor(s / 86400)} ימים ו־${Math.floor(s / 3600) % 24} שעות` : `נשארו ${Math.floor(s / 3600)}:${String(Math.floor(s / 60) % 60).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      return true;
    };
    if (upd()) setInterval(upd, 1000);
  }
})();
