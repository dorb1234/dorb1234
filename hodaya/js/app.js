(function () {
  "use strict";
  var S = window.SITE, G = window.GALLERY || [];
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var el = function (tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var ils = function (n) { return n.toLocaleString("he-IL") + " ₪"; };
  var waUrl = function (msg) { return "https://wa.me/" + S.whatsapp + "?text=" + encodeURIComponent(msg); };

  /* ---------- basics ---------- */
  $("#city").textContent = S.city;
  document.querySelectorAll(".wa-link").forEach(function (a) {
    a.href = waUrl(a.dataset.msg); a.target = "_blank"; a.rel = "noopener";
  });
  $("#ig").href = S.instagram;
  $("#tel").href = $("#call").href = "tel:" + S.phoneIntl;
  $("#tel-txt").textContent = S.phone;
  var nav = $("#nav");
  addEventListener("scroll", function () { nav.classList.toggle("scrolled", scrollY > 10); }, { passive: true });

  /* ---------- menu cards ---------- */
  var grid = $("#menu-grid");
  S.types.forEach(function (t) {
    var min = Math.min.apply(null, t.sizes.map(function (s) { return s.price; }));
    var a = el("a", "menu-card reveal " + t.color);
    a.href = "#builder";
    a.innerHTML = '<span class="emoji" aria-hidden="true">' + t.emoji + '</span>' +
      '<div class="ph"><img src="' + t.img + '" alt="" loading="lazy"></div>' +
      "<h3>" + t.name + "</h3><p>" + t.blurb + "</p>" +
      '<p class="from">החל מ־<b><bdi>' + ils(min) + "</bdi></b></p>";
    a.addEventListener("click", function () { pickType(t.id); });
    grid.appendChild(a);
  });

  /* ---------- included / extras ---------- */
  S.included.forEach(function (x) { $("#included").appendChild(el("li", null, x)); });
  S.extras.forEach(function (x) {
    $("#extras-list").appendChild(el("li", null, "<span>" + x.emoji + " " + x.name + "</span><b>" +
      (x.price == null ? "לפי הבקשה" : "החל מ־<bdi>" + ils(x.price) + "</bdi>") + "</b>"));
  });

  /* ---------- builder ---------- */
  var state = { type: "round", size: "r18-3", extras: {} };
  var typeOf = function (id) { return S.types.filter(function (t) { return t.id === id; })[0]; };
  var sizeOf = function () { return typeOf(state.type).sizes.filter(function (s) { return s.id === state.size; })[0]; };
  var extraPrice = function (x) { return x.freeFor && x.freeFor.indexOf(state.type) > -1 ? 0 : x.price; };

  var typeChips = $("#type-chips");
  S.types.forEach(function (t) {
    var b = el("button", "chip", '<span aria-hidden="true">' + t.emoji + "</span>" + t.name);
    b.type = "button"; b.dataset.id = t.id;
    b.addEventListener("click", function () { pickType(t.id); });
    typeChips.appendChild(b);
  });

  function pickType(id) {
    state.type = id;
    var t = typeOf(id), g = +$("#guests").value;
    // choose the smallest size that feeds the guests, else the largest
    var fit = t.sizes.filter(function (s) { return s.portions[1] >= g; }).sort(function (a, b) { return a.price - b.price; })[0];
    state.size = (fit || t.sizes[t.sizes.length - 1]).id;
    renderSizes(); renderExtras(); render();
  }

  function renderSizes() {
    typeChips.querySelectorAll(".chip").forEach(function (c) { c.setAttribute("aria-pressed", c.dataset.id === state.type); });
    var list = $("#size-list"); list.innerHTML = "";
    var g = +$("#guests").value;
    typeOf(state.type).sizes.forEach(function (s) {
      var b = el("button", "size" + (g >= s.portions[0] - 2 && g <= s.portions[1] ? " fit" : ""));
      b.type = "button";
      b.setAttribute("aria-pressed", s.id === state.size);
      b.innerHTML = '<img src="' + s.img + '" alt="" loading="lazy"><div><b>' + s.name + "</b><span><bdi>" +
        s.portions[0] + "–" + s.portions[1] + "</bdi> מנות · <bdi>" + ils(s.price) + "</bdi></span></div>";
      b.addEventListener("click", function () { state.size = s.id; renderSizes(); render(); });
      list.appendChild(b);
    });
  }

  function renderExtras() {
    var box = $("#extra-chips"); box.innerHTML = "";
    S.extras.forEach(function (x) {
      var p = extraPrice(x);
      var b = el("button", "chip", '<span aria-hidden="true">' + x.emoji + "</span>" + x.name +
        " <small>" + (p == null ? "לפי בקשה" : p === 0 ? "ללא תוספת" : "+" + p + " ₪") + "</small>");
      b.type = "button";
      b.setAttribute("aria-pressed", !!state.extras[x.id]);
      b.addEventListener("click", function () { state.extras[x.id] = !state.extras[x.id]; renderExtras(); render(); });
      box.appendChild(b);
    });
  }

  var shown = 0, raf;
  function animatePrice(to) {
    cancelAnimationFrame(raf);
    var from = shown, t0 = performance.now(), out = $("#t-price");
    var put = function (n) { out.innerHTML = n.toLocaleString("he-IL") + '<span class="sh">₪</span>'; };
    if (reduce) { shown = to; put(to); return; }
    (function step(now) {
      var k = Math.min(1, (now - t0) / 450), e = 1 - Math.pow(1 - k, 3);
      shown = Math.round(from + (to - from) * e);
      put(shown);
      if (k < 1) raf = requestAnimationFrame(step);
    })(t0);
  }

  var lastImg = "";
  function render() {
    var t = typeOf(state.type), s = sizeOf(), total = s.price, chosen = [];
    S.extras.forEach(function (x) {
      if (!state.extras[x.id]) return;
      var p = extraPrice(x);
      if (p) total += p;
      chosen.push(x);
    });
    $("#t-name").textContent = t.name + " · " + s.name;
    $("#t-portions").textContent = s.portions[0] + "–" + s.portions[1] + " מנות";
    var ul = $("#t-extras"); ul.innerHTML = "";
    chosen.forEach(function (x) { ul.appendChild(el("li", null, x.emoji + " " + x.name)); });
    animatePrice(total);
    var img = $("#t-img");
    if (lastImg !== s.img) {
      lastImg = s.img;
      img.classList.add("swap");
      setTimeout(function () { img.src = s.img; img.alt = t.name + ", " + s.name; img.classList.remove("swap"); }, reduce ? 0 : 200);
    }
    $("#send").href = waUrl(orderMessage(t, s, chosen, total));
  }

  function orderMessage(t, s, chosen, total) {
    var d = $("#f-date").value, lines = ["היי הודיה! 🎂 אשמח להזמין עוגה:", "", "• " + t.name + ", " + s.name + " (" + s.portions[0] + "–" + s.portions[1] + " מנות)"];
    if (chosen.length) lines.push("• תוספות: " + chosen.map(function (x) { return x.name; }).join(", "));
    if (d) lines.push("• תאריך האירוע: " + d.split("-").reverse().join("/"));
    var occ = $("#f-occasion").value.trim(), txt = $("#f-text").value.trim(), notes = $("#f-notes").value.trim();
    if (occ) lines.push("• מה חוגגים: " + occ);
    if (txt) lines.push("• כיתוב על העוגה: " + txt);
    if (notes) lines.push("• רעיון לעיצוב: " + notes);
    lines.push("", "הערכת מחיר מהאתר: החל מ־" + total + " ₪", "אפשר לבדוק זמינות? תודה!");
    return lines.join("\n");
  }

  var dateIn = $("#f-date");
  var today = new Date(); today.setMinutes(today.getMinutes() - today.getTimezoneOffset());
  dateIn.min = today.toISOString().slice(0, 10);
  ["#f-date", "#f-occasion", "#f-text", "#f-notes"].forEach(function (id) { $(id).addEventListener("input", render); });

  // guests slider
  var gIn = $("#guests");
  function guestsTip() {
    var g = +gIn.value; $("#guests-out").textContent = g;
    var fits = [];
    S.types.forEach(function (t) { t.sizes.forEach(function (s) { if (g >= s.portions[0] - 2 && g <= s.portions[1]) fits.push(t.name + " " + s.name.split(" · ")[0]); }); });
    $("#guests-tip").textContent = fits.length ? "מתאים לכם: " + fits.join(" · ") : g < 10 ? "בנטו יהיה מושלם בשבילכם 💕" : "לחגיגה גדולה כדאי לדבר עם הודיה על עוגה גבוהה במיוחד 🎉";
    renderSizes();
  }
  gIn.addEventListener("input", guestsTip);
  gIn.addEventListener("change", function () { pickType(state.type); });
  guestsTip();
  renderSizes(); renderExtras(); render();

  /* ---------- gallery ---------- */
  var cats = ["הכל"].concat(G.map(function (g) { return g.cat; }).filter(function (c, i, a) { return a.indexOf(c) === i; }));
  var filt = "הכל", view = G;
  var fBox = $("#filters"), mason = $("#masonry");
  cats.forEach(function (c) {
    var n = c === "הכל" ? G.length : G.filter(function (g) { return g.cat === c; }).length;
    var b = el("button", "chip", c + " <small>" + n + "</small>");
    b.type = "button"; b.dataset.c = c;
    b.addEventListener("click", function () { filt = c; drawGallery(); });
    fBox.appendChild(b);
  });
  function drawGallery() {
    fBox.querySelectorAll(".chip").forEach(function (b) { b.setAttribute("aria-pressed", b.dataset.c === filt); });
    view = filt === "הכל" ? G : G.filter(function (g) { return g.cat === filt; });
    mason.innerHTML = "";
    view.forEach(function (g, i) {
      var b = el("button", "tile");
      b.type = "button";
      b.style.animationDelay = Math.min(i, 12) * 40 + "ms";
      b.setAttribute("aria-label", g.title + ": " + g.alt);
      b.innerHTML = '<img src="' + g.img + '" width="' + g.w + '" height="' + g.h + '" loading="lazy" alt="">' +
        '<span class="cap"><strong>' + g.title + "</strong><span>" + g.cat + "</span></span>";
      b.addEventListener("click", function () { openLb(i); });
      mason.appendChild(b);
    });
  }
  drawGallery();

  /* ---------- lightbox ---------- */
  var lb = $("#lightbox"), cur = 0;
  function showLb() {
    var g = view[cur];
    $("#lb-img").src = g.img; $("#lb-img").alt = g.alt;
    $("#lb-title").textContent = g.title; $("#lb-alt").textContent = g.alt;
    $("#lb-want").href = waUrl("היי הודיה! ראיתי באתר את העוגה \"" + g.title + "\" (" + g.cat + ") ואני רוצה כזאת 😍\nתאריך האירוע: \nמספר מנות: ");
    $("#lb-want").target = "_blank";
  }
  function openLb(i) { cur = i; showLb(); if (lb.showModal) lb.showModal(); else lb.setAttribute("open", ""); }
  function step(d) { cur = (cur + d + view.length) % view.length; showLb(); }
  $("#lb-close").addEventListener("click", function () { lb.close(); });
  // RTL: "prev" sits on the right and goes back
  $("#lb-prev").addEventListener("click", function () { step(-1); });
  $("#lb-next").addEventListener("click", function () { step(1); });
  lb.addEventListener("click", function (e) { if (e.target === lb) lb.close(); });
  lb.addEventListener("keydown", function (e) { if (e.key === "ArrowLeft") step(1); if (e.key === "ArrowRight") step(-1); });
  var tx = null;
  lb.addEventListener("touchstart", function (e) { tx = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", function (e) {
    if (tx == null) return; var dx = e.changedTouches[0].clientX - tx; tx = null;
    if (Math.abs(dx) > 50) step(dx > 0 ? 1 : -1);
  });

  /* ---------- candles + confetti ---------- */
  var out = 0, hint = $("#cake-hint");
  document.querySelectorAll(".candle").forEach(function (c) {
    c.setAttribute("tabindex", "0");
    c.setAttribute("role", "button");
    c.setAttribute("aria-label", "כיבוי נר");
    function blow() {
      if (c.classList.contains("out")) return;
      c.classList.add("out"); out++;
      var ns = "http://www.w3.org/2000/svg";
      for (var k = 0; k < 3; k++) {
        var p = document.createElementNS(ns, "circle");
        p.setAttribute("class", "smoke"); p.setAttribute("cx", (k - 1) * 4); p.setAttribute("cy", -6); p.setAttribute("r", 4);
        p.style.animationDelay = k * 120 + "ms";
        c.appendChild(p);
      }
      if (out === 3) {
        hint.textContent = "🎉 המשאלה בדרך! עכשיו רק צריך עוגה אמיתית…";
        hint.classList.add("win");
        confetti();
        setTimeout(relight, 5200);
      } else {
        hint.textContent = "עוד " + (3 - out) + "… 🌬️";
      }
    }
    c.addEventListener("click", blow);
    c.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); blow(); } });
  });
  function relight() {
    out = 0;
    document.querySelectorAll(".candle").forEach(function (c) {
      c.classList.remove("out");
      c.querySelectorAll(".smoke").forEach(function (s) { s.remove(); });
    });
    hint.textContent = "👆 כבו את הנרות ותבקשו משאלה"; hint.classList.remove("win");
  }

  var cv = $("#confetti"), cx = cv.getContext("2d"), parts = [], running = false;
  var colors = ["#d6336c", "#ffb8cf", "#9fd8f5", "#ffe08a", "#9ad9a8", "#b79cf0", "#ff8a5b"];
  function size() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
  addEventListener("resize", size); size();
  function confetti() {
    if (reduce) return;
    var dpr = devicePixelRatio;
    for (var i = 0; i < 160; i++) {
      parts.push({
        x: innerWidth / 2 * dpr, y: innerHeight * .45 * dpr,
        vx: (Math.random() - .5) * 22 * dpr, vy: (-Math.random() * 18 - 6) * dpr,
        w: (6 + Math.random() * 6) * dpr, h: (10 + Math.random() * 8) * dpr,
        r: Math.random() * 6, vr: (Math.random() - .5) * .4,
        c: colors[i % colors.length], round: Math.random() < .3, life: 0
      });
    }
    if (!running) { running = true; requestAnimationFrame(tick); }
  }
  function tick() {
    cx.clearRect(0, 0, cv.width, cv.height);
    var dpr = devicePixelRatio;
    parts = parts.filter(function (p) { return p.y < cv.height + 40 && p.life < 400; });
    parts.forEach(function (p) {
      p.life++; p.vy += .45 * dpr; p.vx *= .985; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      cx.save(); cx.translate(p.x, p.y); cx.rotate(p.r); cx.fillStyle = p.c;
      if (p.round) { cx.beginPath(); cx.arc(0, 0, p.w / 2, 0, 7); cx.fill(); }
      else cx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h * Math.abs(Math.cos(p.life / 8)));
      cx.restore();
    });
    if (parts.length) requestAnimationFrame(tick); else { running = false; cx.clearRect(0, 0, cv.width, cv.height); }
  }

  /* ---------- scroll reveal ---------- */
  var io = "IntersectionObserver" in window && !reduce ? new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
  }, { threshold: .15 }) : null;
  document.querySelectorAll(".head, .step, .ticket, .inc-card, .how li, .cta, .guests, .reveal").forEach(function (n) {
    n.classList.add("reveal");
    if (io) io.observe(n); else n.classList.add("in");
  });
})();
