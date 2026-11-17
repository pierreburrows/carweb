/* ============================================================
   Obsidian Detail Studio — scroll stage + booking
   ============================================================ */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const easeInOut = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  // map progress p across [a,b] -> 0..1
  const span = (p, a, b) => clamp((p - a) / (b - a));
  // fade window: in over [a, a+f], out over [b-f, b]
  const window_ = (p, a, b, f = 0.04) => {
    if (p < a || p > b) return 0;
    if (p < a + f) return (p - a) / f;
    if (p > b - f) return (b - p) / f;
    return 1;
  };

  /* ---------------------------------------------------------
     Scroll stage
  --------------------------------------------------------- */
  const stage = $("#stage");
  const pin = $(".stage__pin", stage);
  const L = {
    dirty: $("#layerDirty"),
    clean: $("#layerClean"),
    swirls: $("#layerSwirls"),
    glass: $("#layerGlass"),
    sunset: $("#layerSunset"),
    wipe: $("#wipe"),
  };
  const C = [1, 2, 3, 4, 5].map((i) => $("#copy" + i));
  const specs3 = $("#specs3");
  const specs4 = $("#specs4");
  const bottombar = $("#bottombar");
  const scrollhint = $("#scrollhint");
  const progressBar = $("#progress i");

  // Scene boundaries in stage progress (0..1)
  const S = {
    hero: [0.0, 0.14],
    wash: [0.14, 0.4],
    inspect: [0.4, 0.58],
    coat: [0.58, 0.76],
    pickup: [0.76, 1.0],
  };

  let targetP = 0;
  let currentP = 0;
  let raf = null;
  let lastApplied = -1;

  const setCopy = (el, vis, dir = 1) => {
    el.style.opacity = vis.toFixed(3);
    const y = (1 - easeOut(vis)) * 28 * dir;
    el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
  };

  const apply = (p) => {
    const vw = pin.clientWidth;
    const vh = pin.clientHeight;

    /* --- Scene 1 + 2: dirty -> clean wipe --- */
    const wash = span(p, S.wash[0], S.wash[1]);
    // wipe moves 0 -> 1 across the width with slight ease
    const wipeX = easeInOut(wash);
    const washActive = p > S.wash[0] - 0.001 && p < S.wash[1] + 0.02;

    // leaving inspect we zoom into the hood of the clean image
    const zoomT = span(p, S.inspect[0], S.inspect[0] + 0.1);
    const zoom = lerp(1, 3.2, easeInOut(zoomT));
    const zoomOpacity = 1 - span(p, S.inspect[0] + 0.06, S.inspect[0] + 0.12);

    L.dirty.style.opacity = p < S.inspect[0] + 0.12 ? "1" : "0";
    L.dirty.style.transform = `scale(${zoom.toFixed(4)})`;
    L.dirty.style.transformOrigin = "42% 58%";

    L.clean.style.opacity = washActive || p >= S.wash[1] ? String(zoomOpacity) : "0";
    L.clean.style.clipPath = p >= S.wash[1] ? "inset(0 0 0 0)" : `inset(0 ${((1 - wipeX) * 100).toFixed(3)}% 0 0)`;
    L.clean.style.transform = `scale(${zoom.toFixed(4)})`;
    L.clean.style.transformOrigin = "42% 58%";

    const wipeVis = washActive ? window_(p, S.wash[0], S.wash[1], 0.03) : 0;
    L.wipe.style.opacity = wipeVis.toFixed(3);
    L.wipe.style.transform = `translate3d(${(wipeX * vw).toFixed(1)}px, 0, 0)`;

    /* --- Scene 3: macro swirls --- */
    const swirlsIn = span(p, S.inspect[0] + 0.05, S.inspect[0] + 0.12);
    const swirlsOut = 1 - span(p, S.coat[0], S.coat[0] + 0.08);
    L.swirls.style.opacity = (easeOut(swirlsIn) * swirlsOut).toFixed(3);
    const swirlScale = lerp(1.25, 1.0, easeOut(span(p, S.inspect[0] + 0.05, S.inspect[1])));
    L.swirls.style.transform = `scale(${swirlScale.toFixed(4)})`;

    /* --- Scene 4: glass bead --- */
    const glassIn = span(p, S.coat[0], S.coat[0] + 0.08);
    const glassOut = 1 - span(p, S.pickup[0], S.pickup[0] + 0.06);
    L.glass.style.opacity = (easeOut(glassIn) * glassOut).toFixed(3);
    const glassScale = lerp(1.0, 1.12, easeOut(span(p, S.coat[0], S.coat[1])));
    L.glass.style.transform = `scale(${glassScale.toFixed(4)})`;

    /* --- Scene 5: sunset reveal (zoom out from hood) --- */
    const sunIn = span(p, S.pickup[0], S.pickup[0] + 0.1);
    L.sunset.style.opacity = easeOut(sunIn).toFixed(3);
    const sunScale = lerp(2.4, 1.0, easeInOut(span(p, S.pickup[0], S.pickup[0] + 0.14)));
    const drift = lerp(0, -3, span(p, S.pickup[0] + 0.14, 1)); // slow push after reveal
    L.sunset.style.transform = `scale(${(sunScale + drift * -0.01).toFixed(4)})`;
    L.sunset.style.transformOrigin = "40% 60%";

    /* --- Copy --- */
    setCopy(C[0], window_(p, 0, S.hero[1] + 0.02, 0.05) * (p < 0.01 ? 1 : 1));
    // hero copy is visible at 0 without the fade-in
    if (p < 0.05) setCopy(C[0], 1);
    setCopy(C[1], window_(p, S.wash[0] + 0.02, S.wash[1] + 0.04, 0.05));
    setCopy(C[2], window_(p, S.inspect[0] + 0.03, S.inspect[1] + 0.02, 0.05));
    specs3.style.opacity = window_(p, S.inspect[0] + 0.1, S.inspect[1] + 0.02, 0.04).toFixed(3);
    setCopy(C[3], window_(p, S.coat[0] + 0.03, S.coat[1] + 0.02, 0.05));
    specs4.style.opacity = window_(p, S.coat[0] + 0.1, S.coat[1] + 0.02, 0.04).toFixed(3);
    const c5 = window_(p, S.pickup[0] + 0.06, 1.01, 0.06);
    setCopy(C[4], c5);
    // on final stretch the headline parallaxes left like the reference
    const exitT = span(p, 0.9, 1);
    C[4].style.transform = `translate3d(${(-exitT * 120).toFixed(1)}px, ${((1 - easeOut(c5)) * 28).toFixed(1)}px, 0)`;

    /* --- Chrome --- */
    const showBar = p < S.hero[1] || p > S.pickup[0] + 0.12;
    bottombar.classList.toggle("is-hidden", !showBar);
    scrollhint.classList.toggle("is-hidden", p > 0.04);
    progressBar.style.width = (p * 100).toFixed(2) + "%";

    document.body.dataset.stage = p < S.wash[0] ? "1" : p < S.inspect[0] ? "2" : p < S.coat[0] ? "3" : p < S.pickup[0] ? "4" : "5";
  };

  const readScroll = () => {
    const rect = stage.getBoundingClientRect();
    const total = stage.offsetHeight - pin.clientHeight;
    targetP = clamp(-rect.top / total);
  };

  const tick = () => {
    const diff = targetP - currentP;
    currentP = Math.abs(diff) < 0.0004 ? targetP : currentP + diff * 0.14;
    if (currentP !== lastApplied) {
      apply(currentP);
      lastApplied = currentP;
    }
    raf = Math.abs(targetP - currentP) > 0 ? requestAnimationFrame(tick) : null;
  };

  const schedule = () => { if (!raf) raf = requestAnimationFrame(tick); };

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  window.addEventListener("scroll", () => { readScroll(); if (reduceMotion) { currentP = targetP; apply(currentP); } else schedule(); }, { passive: true });
  window.addEventListener("resize", () => { readScroll(); apply(currentP); });
  readScroll();
  currentP = targetP;
  apply(currentP);

  // Nav links jump to a scene
  const sceneStart = { 1: 0, 2: S.wash[0] + 0.03, 3: S.inspect[0] + 0.08, 4: S.coat[0] + 0.04, 5: S.pickup[0] + 0.12 };
  $$("a[data-scene]").forEach((a) => {
    a.addEventListener("click", (e) => {
      e.preventDefault();
      const p = sceneStart[a.dataset.scene] ?? 0;
      const total = stage.offsetHeight - pin.clientHeight;
      window.scrollTo({ top: stage.offsetTop + p * total, behavior: "smooth" });
    });
  });

  /* ---------------------------------------------------------
     Booking drawer
  --------------------------------------------------------- */
  const drawer = $("#drawer");
  const backdrop = $("#drawerBackdrop");
  const form = $("#bookingForm");
  const toast = $("#toast");

  const PRICES = { wash: 89, polish: 349, ceramic: 899 };
  const CAR_MULT = { sedan: 1, coupe: 1, suv: 1.2, truck: 1.3 };
  const CAR_LABEL = { sedan: "Sedan", coupe: "Coupe", suv: "SUV", truck: "Truck" };
  const PACK_LABEL = { wash: "Wash", polish: "Polish", ceramic: "Ceramic" };
  const TIMES = ["9:00", "11:00", "13:00", "15:00"];
  const money = (n) => "$" + Math.round(n).toLocaleString("en-US");

  const state = { car: "sedan", pack: "ceramic", day: null, time: null };

  // Build the next 4 open days (Mon–Sat) starting tomorrow
  const days = [];
  {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + 1);
    while (days.length < 4) {
      if (d.getDay() !== 0) days.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
  }
  const fmtDay = (d) => d.toLocaleDateString("en-US", { weekday: "short" });
  const fmtLongDay = (d) => d.toLocaleDateString("en-US", { weekday: "long" });
  const fmtDate = (d) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  // deterministic "taken" slots so the grid feels alive
  const taken = (di, ti) => ((di * 7 + ti * 3) % 5) === 1;

  const dayRow = $("#dayRow");
  const timeRow = $("#timeRow");
  days.forEach((d, i) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "day";
    b.dataset.i = i;
    b.innerHTML = `<strong>${fmtDay(d)}</strong><span>${fmtDate(d)}</span>`;
    b.addEventListener("click", () => { state.day = i; state.time = null; renderTimes(); sync(); });
    dayRow.appendChild(b);
  });
  const renderTimes = () => {
    timeRow.innerHTML = "";
    TIMES.forEach((t, ti) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "time";
      b.textContent = t;
      const dis = state.day == null || taken(state.day, ti);
      if (dis) b.disabled = true;
      b.addEventListener("click", () => { state.time = ti; sync(); });
      timeRow.appendChild(b);
    });
  };
  renderTimes();

  $("#nextSlotLabel").textContent = `Next slot ${fmtDay(days[0])} ${TIMES[0].replace(":00", "AM")}`;

  $$("#carGrid .car").forEach((b) => b.addEventListener("click", () => { state.car = b.dataset.car; sync(); }));
  $$("#packList .pack").forEach((b) => b.addEventListener("click", () => { state.pack = b.dataset.pack; sync(); }));

  const total = () => PRICES[state.pack] * CAR_MULT[state.car];

  const sync = () => {
    $$("#carGrid .car").forEach((b) => b.classList.toggle("is-selected", b.dataset.car === state.car));
    $$("#packList .pack").forEach((b) => {
      b.classList.toggle("is-selected", b.dataset.pack === state.pack);
      $("[data-price]", b).textContent = money(PRICES[b.dataset.pack] * CAR_MULT[state.car]);
    });
    $$("#dayRow .day").forEach((b) => b.classList.toggle("is-selected", Number(b.dataset.i) === state.day));
    $$("#timeRow .time").forEach((b, i) => b.classList.toggle("is-selected", i === state.time));
    $("#sumCar").textContent = CAR_LABEL[state.car];
    $("#sumPack").textContent = PACK_LABEL[state.pack];
    $("#sumSlot").textContent = state.day != null && state.time != null
      ? `${fmtDay(days[state.day])} ${fmtDate(days[state.day])} · ${TIMES[state.time]}`
      : state.day != null ? `${fmtDay(days[state.day])} ${fmtDate(days[state.day])} · pick a time` : "—";
    $("#sumTotal").textContent = money(total());
  };
  sync();

  let lastFocus = null;
  const openDrawer = () => {
    lastFocus = document.activeElement;
    drawer.classList.add("is-open");
    drawer.setAttribute("aria-hidden", "false");
    backdrop.classList.add("is-open");
    setTimeout(() => $("input[name=name]", form).focus({ preventScroll: true }), 650);
  };
  const closeDrawer = () => {
    drawer.classList.remove("is-open");
    drawer.setAttribute("aria-hidden", "true");
    backdrop.classList.remove("is-open");
    if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    setTimeout(() => { if (!drawer.classList.contains("is-open")) drawer.classList.remove("is-success"); }, 800);
  };
  $$("[data-open-booking]").forEach((b) => b.addEventListener("click", (e) => { e.preventDefault(); openDrawer(); }));
  $("#drawerClose").addEventListener("click", closeDrawer);
  backdrop.addEventListener("click", closeDrawer);
  $("#successDone").addEventListener("click", closeDrawer);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && drawer.classList.contains("is-open")) closeDrawer(); });

  const showToast = (msg) => {
    $("#toastMsg").textContent = msg;
    toast.classList.add("is-visible");
    clearTimeout(showToast.t);
    showToast.t = setTimeout(() => toast.classList.remove("is-visible"), 5200);
  };

  const LEADS_KEY = "obsidian_leads";
  const saveLead = (lead) => {
    try {
      const arr = JSON.parse(localStorage.getItem(LEADS_KEY) || "[]");
      arr.unshift(lead);
      localStorage.setItem(LEADS_KEY, JSON.stringify(arr.slice(0, 200)));
    } catch (_) { /* storage unavailable; booking still confirms */ }
  };

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const name = form.name.value.trim();
    const phone = form.phone.value.trim();
    const email = form.email.value.trim();
    let ok = true;
    [["name", name], ["phone", phone]].forEach(([k, v]) => {
      form[k].classList.toggle("is-invalid", !v);
      if (!v) ok = false;
    });
    if (state.day == null || state.time == null) {
      ok = false;
      $("#dayRow").scrollIntoView({ behavior: "smooth", block: "center" });
      dayRow.animate([{ transform: "translateX(0)" }, { transform: "translateX(-6px)" }, { transform: "translateX(6px)" }, { transform: "translateX(0)" }], { duration: 320 });
    }
    if (!ok) return;

    const btn = $("#confirmBtn");
    btn.disabled = true;
    btn.innerHTML = "Confirming…";

    const d = days[state.day];
    const slot = new Date(d);
    slot.setHours(Number(TIMES[state.time].split(":")[0]), 0, 0, 0);
    const lead = {
      id: "L" + Date.now().toString(36).toUpperCase(),
      name, phone, email,
      car: CAR_LABEL[state.car],
      pack: PACK_LABEL[state.pack],
      total: Math.round(total()),
      slot: slot.toISOString(),
      source: "Website",
      status: "booked",
      createdAt: new Date().toISOString(),
      notes: "",
      timeline: [
        { t: new Date().toISOString(), text: "Booked via website" },
        { t: new Date().toISOString(), text: "Confirmation text sent" },
        { t: new Date(slot.getTime() - 24 * 3600e3).toISOString(), text: "Reminder scheduled (24h before)", future: true },
      ],
    };

    setTimeout(() => {
      saveLead(lead);
      const first = name.split(/\s+/)[0].toUpperCase();
      $("#successTitle").textContent = `YOU'RE BOOKED, ${first}.`;
      $("#successMeta").textContent = `${fmtLongDay(d)} · ${TIMES[state.time]} · ${PACK_LABEL[state.pack]}`;
      drawer.classList.add("is-success");
      showToast(`${fmtLongDay(d)} at ${TIMES[state.time]} · ${PACK_LABEL[state.pack]} · ${money(lead.total)}. We've texted you the details.`);
      btn.disabled = false;
      btn.innerHTML = "Confirm booking <span>→</span>";
      form.reset();
      state.day = null; state.time = null; renderTimes(); sync();
    }, 900);
  });

  $("#year").textContent = new Date().getFullYear();
})();
