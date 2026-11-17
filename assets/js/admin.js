/* ============================================================
   Obsidian Studio OS — owner admin (demo, localStorage backed)
   ============================================================ */
(() => {
  "use strict";
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const money = (n) => "$" + Math.round(n).toLocaleString("en-US");

  const SESSION_KEY = "obsidian_session";
  const LEADS_KEY = "obsidian_leads";
  const SEED_KEY = "obsidian_seed_v1";

  const now = Date.now();
  const H = 3600e3, D = 24 * H;
  const at = (daysAhead, hour) => { const d = new Date(now + daysAhead * D); d.setHours(hour, 0, 0, 0); return d.toISOString(); };
  const ago = (ms) => new Date(now - ms).toISOString();

  /* ---------- Seed data ---------- */
  const seed = [
    { id: "L7Q2K1", name: "Marc Tremblay", phone: "(555) 018-2237", email: "marc.t@gmail.com", car: "SUV", pack: "Ceramic", total: 1079, slot: at(2, 9), source: "Website", status: "booked", createdAt: ago(14 * 60e3), notes: "Black SUV, light swirls, wants wheels coated too.", timeline: [ { t: ago(14 * 60e3), text: "Booked via website" }, { t: ago(13 * 60e3), text: "Confirmation text sent" }, { t: at(1, 9), text: "Reminder scheduled (24h before)", future: true } ] },
    { id: "L7Q1A9", name: "Jenna Castillo", phone: "(555) 010-7781", email: "jenna.castillo@outlook.com", car: "Truck", pack: "Wash", total: 116, slot: at(0, 15), source: "Google", status: "booked", createdAt: ago(1.2 * H), notes: "", timeline: [ { t: ago(1.2 * H), text: "Called from Google listing" }, { t: ago(1.1 * H), text: "Quote sent by text" }, { t: ago(50 * 60e3), text: "Booked by owner" } ] },
    { id: "L7P9Z4", name: "Daniel Okafor", phone: "(555) 016-4410", email: "d.okafor@proton.me", car: "Coupe", pack: "Ceramic", total: 899, slot: at(5, 11), source: "Instagram", status: "quote", createdAt: ago(3.4 * H), notes: "Asked about PPF on front bumper as well.", timeline: [ { t: ago(3.4 * H), text: "Instagram DM → lead captured" }, { t: ago(3.3 * H), text: "Quote sent ($899 + PPF estimate)" }, { t: ago(2 * H), text: "Follow-up text queued", future: true } ] },
    { id: "L7P8M2", name: "Sofia Lindqvist", phone: "(555) 012-9035", email: "", car: "Sedan", pack: "Polish", total: 349, slot: at(1, 13), source: "Referral", status: "booked", createdAt: ago(9 * H), notes: "Referred by Marc T.", timeline: [ { t: ago(9 * H), text: "Referral link opened" }, { t: ago(8.8 * H), text: "Booked via website" }, { t: ago(8.8 * H), text: "Confirmation text sent" } ] },
    { id: "L7P7C8", name: "Aaron Whitfield", phone: "(555) 019-6624", email: "aaron.w@icloud.com", car: "Sedan", pack: "Wash", total: 89, slot: at(-1, 9), source: "ChatGPT", status: "done", createdAt: ago(2 * D), notes: "Maintenance plan candidate.", timeline: [ { t: ago(2 * D), text: "Found us via ChatGPT" }, { t: ago(2 * D + 10 * 60e3), text: "Booked via website" }, { t: ago(1 * D), text: "Detail completed · review request sent" } ] },
    { id: "L7P5R1", name: "Priya Natarajan", phone: "(555) 014-3312", email: "priya.n@gmail.com", car: "SUV", pack: "Polish", total: 419, slot: at(3, 9), source: "Website", status: "new", createdAt: ago(3 * D), notes: "", timeline: [ { t: ago(3 * D), text: "Quote requested on website" }, { t: ago(3 * D - 5 * 60e3), text: "Auto quote sent" } ] },
    { id: "L7P4T6", name: "Liam Gallagher", phone: "(555) 011-5508", email: "", car: "Truck", pack: "Ceramic", total: 1169, slot: at(-6, 9), source: "Google", status: "lost", createdAt: ago(8 * D), notes: "Went with a cheaper quote.", timeline: [ { t: ago(8 * D), text: "Called from Google listing" }, { t: ago(7 * D), text: "Marked lost" } ] },
  ];

  const load = () => { try { return JSON.parse(localStorage.getItem(LEADS_KEY) || "[]"); } catch (_) { return []; } };
  const persist = (arr) => { try { localStorage.setItem(LEADS_KEY, JSON.stringify(arr)); } catch (_) {} };
  const ensureSeed = () => {
    let arr = load();
    if (!localStorage.getItem(SEED_KEY)) {
      const ids = new Set(arr.map((l) => l.id));
      arr = arr.concat(seed.filter((s) => !ids.has(s.id)));
      persist(arr);
      localStorage.setItem(SEED_KEY, "1");
    }
    return arr;
  };
  let leads = ensureSeed();
  leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  /* ---------- Helpers ---------- */
  const rel = (iso) => {
    const diff = now - new Date(iso).getTime();
    const m = Math.round(diff / 60e3);
    if (m < 1) return "just now";
    if (m < 60) return `${m} min ago`;
    const h = Math.round(m / 60);
    if (h < 24) return `${h} h ago`;
    const d = Math.round(h / 24);
    return d === 1 ? "yesterday" : `${d} days ago`;
  };
  const slotLabel = (iso) => {
    const d = new Date(iso);
    const t = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).replace(":00", "");
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const dd = Math.round((new Date(d).setHours(0, 0, 0, 0) - today) / D);
    if (dd === 0) return `Today · ${t}`;
    if (dd === 1) return `Tomorrow · ${t}`;
    return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${t}`;
  };
  const STATUS = { new: "New", quote: "Quoted", booked: "Booked", done: "Done", lost: "Lost" };
  const pill = (s) => `<span class="pill pill--${s}">${STATUS[s] || s}</span>`;
  const toast = (msg) => { $("#toastMsg").textContent = msg; $("#toast").classList.add("is-visible"); clearTimeout(toast.t); toast.t = setTimeout(() => $("#toast").classList.remove("is-visible"), 2600); };
  const save = () => { persist(leads); updateBadge(); };
  const updateBadge = () => { const n = leads.filter((l) => l.status === "new").length; $("#leadsBadge").textContent = n ? n : ""; };

  /* ---------- Auth ---------- */
  const login = $("#login"), app = $("#app");
  const showApp = () => { login.hidden = true; app.hidden = false; route(); };
  if (sessionStorage.getItem(SESSION_KEY)) showApp();
  $("#loginForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const btn = $("button", e.target);
    btn.textContent = "Signing in…";
    setTimeout(() => { sessionStorage.setItem(SESSION_KEY, "1"); showApp(); btn.innerHTML = "Sign in <span>→</span>"; }, 600);
  });
  $("#logoutBtn").addEventListener("click", () => { sessionStorage.removeItem(SESSION_KEY); location.hash = ""; app.hidden = true; login.hidden = false; });

  /* ---------- Router ---------- */
  const page = $("#page");
  let filter = "all";
  let query = "";
  let selectedId = null;

  const pages = {
    overview: renderOverview,
    leads: () => renderLeads("leads"),
    bookings: () => renderLeads("bookings"),
    calendar: renderCalendar,
    messages: renderMessages,
    customers: renderCustomers,
    reviews: renderReviews,
    automations: renderAutomations,
    settings: renderSettings,
  };
  function route() {
    const name = (location.hash || "#leads").slice(1).split("?")[0];
    const fn = pages[name] || pages.leads;
    $$("#sideNav a").forEach((a) => a.classList.toggle("is-active", a.dataset.page === (pages[name] ? name : "leads")));
    page.innerHTML = "";
    page.style.animation = "none"; void page.offsetWidth; page.style.animation = "";
    fn();
    updateBadge();
  }
  window.addEventListener("hashchange", route);
  $("#search").addEventListener("input", (e) => { query = e.target.value.trim().toLowerCase(); if (!location.hash.startsWith("#leads") && !location.hash.startsWith("#bookings") && !location.hash.startsWith("#customers")) location.hash = "#leads"; else route(); });

  /* ---------- Pages ---------- */
  function head(title, sub, actions = "") {
    return `<div class="page__head"><div><h1 class="h-big">${title}</h1>${sub ? `<p class="page__sub">${sub}</p>` : ""}</div><div class="page__actions">${actions}</div></div>`;
  }

  function matches(l) {
    if (!query) return true;
    return [l.name, l.phone, l.email, l.car, l.pack, l.source, l.id].join(" ").toLowerCase().includes(query);
  }

  function renderLeads(mode) {
    const isBookings = mode === "bookings";
    const base = isBookings ? leads.filter((l) => l.status === "booked" || l.status === "done") : leads;
    const chips = isBookings
      ? [["all", "All"], ["booked", "Upcoming"], ["done", "Completed"]]
      : [["all", "All"], ["new", "New"], ["quote", "Quoted"], ["booked", "Booked"], ["done", "Done"]];
    if (!chips.some((c) => c[0] === filter)) filter = "all";
    const rows = base.filter((l) => (filter === "all" || l.status === filter) && matches(l));
    if (isBookings) rows.sort((a, b) => new Date(a.slot) - new Date(b.slot));

    page.innerHTML = head(
      isBookings ? "BOOKINGS" : "LEADS",
      isBookings ? "Every confirmed detail, in drop-off order. Tap a row to open it." : "Every booking and quote from your website, Google, Instagram and ChatGPT. Followed up automatically.",
      `<button class="btn btn--sm" id="exportBtn">Export CSV</button><button class="btn btn--sm btn--white" id="addBtn">+ Add lead</button>`
    ) + `
      <div class="card">
        <div class="card__head">
          <div class="card__title">${isBookings ? "Schedule" : "All leads"} <b>${rows.length}</b></div>
          <div class="chips">${chips.map(([k, v]) => `<button class="chip ${filter === k ? "is-active" : ""}" data-f="${k}">${v}</button>`).join("")}</div>
        </div>
        ${rows.length ? `<table class="table">
          <thead><tr><th>Customer</th><th>Vehicle</th><th>Package</th><th>Slot</th><th>Source</th><th>Status</th><th>Total</th><th></th></tr></thead>
          <tbody>${rows.map((l) => `
            <tr data-id="${l.id}" class="${l.id === selectedId ? "is-selected" : ""}">
              <td><div class="cust"><strong>${esc(l.name)}</strong><span>${rel(l.createdAt)}</span></div></td>
              <td>${esc(l.car)}</td>
              <td>${esc(l.pack)}</td>
              <td>${slotLabel(l.slot)}</td>
              <td><span class="pill pill--src">${esc(l.source)}</span></td>
              <td>${pill(l.status)}</td>
              <td class="muted">${money(l.total)}</td>
              <td><div class="row-actions"><a class="btn" href="tel:${esc(l.phone.replace(/\D/g, ""))}" data-stop>Call</a><a class="btn" href="sms:${esc(l.phone.replace(/\D/g, ""))}" data-stop>Text</a></div></td>
            </tr>`).join("")}
          </tbody></table>` : `<div class="empty">Nothing here yet${query ? ` for “${esc(query)}”` : ""}.</div>`}
      </div>`;

    $$(".chip", page).forEach((c) => c.addEventListener("click", () => { filter = c.dataset.f; route(); }));
    $$("tbody tr", page).forEach((tr) => tr.addEventListener("click", (e) => { if (e.target.closest("[data-stop]")) return; openLead(tr.dataset.id); }));
    $("#exportBtn").addEventListener("click", exportCsv);
    $("#addBtn").addEventListener("click", addLeadPrompt);
  }

  function renderOverview() {
    const week = leads.filter((l) => now - new Date(l.createdAt) < 7 * D);
    const booked = leads.filter((l) => l.status === "booked");
    const revenue = booked.reduce((s, l) => s + l.total, 0);
    const done = leads.filter((l) => l.status === "done").reduce((s, l) => s + l.total, 0);
    const conv = leads.length ? Math.round((leads.filter((l) => ["booked", "done"].includes(l.status)).length / leads.length) * 100) : 0;
    const upcoming = booked.slice().sort((a, b) => new Date(a.slot) - new Date(b.slot)).slice(0, 5);
    page.innerHTML = head("OVERVIEW", "What the studio looks like this week.") + `
      <div class="stats">
        <div class="card stat"><span>New leads · 7d</span><strong>${week.length}</strong><em>+3 vs last week</em></div>
        <div class="card stat"><span>Booked pipeline</span><strong>${money(revenue)}</strong><em>${booked.length} details scheduled</em></div>
        <div class="card stat"><span>Completed · 30d</span><strong>${money(done)}</strong><em>4.9★ average review</em></div>
        <div class="card stat"><span>Lead → booking</span><strong>${conv}%</strong><em class="${conv < 50 ? "down" : ""}">${conv < 50 ? "-4 pts" : "+6 pts"} vs last month</em></div>
      </div>
      <div class="grid-2">
        <div class="card"><div class="card__head"><div class="card__title">Next up</div><a class="chip" href="#bookings">All bookings →</a></div>
          <ul class="list">${upcoming.map((l) => `<li data-id="${l.id}"><i class="dot dot--ok"></i><strong>${esc(l.name)}</strong><span class="muted">${esc(l.car)} · ${esc(l.pack)}</span><time>${slotLabel(l.slot)}</time></li>`).join("") || `<li class="muted">No upcoming bookings.</li>`}</ul>
        </div>
        <div class="card"><div class="card__head"><div class="card__title">Activity</div></div>
          <ul class="list">
            ${leads.slice(0, 6).map((l) => `<li data-id="${l.id}"><i class="dot ${l.status === "booked" ? "dot--ok" : l.status === "quote" ? "dot--warn" : l.status === "done" || l.status === "lost" ? "dot--muted" : ""}"></i><span>${esc(l.name)} · ${STATUS[l.status]} via ${esc(l.source)}</span><time>${rel(l.createdAt)}</time></li>`).join("")}
          </ul>
        </div>
      </div>`;
    $$("li[data-id]", page).forEach((li) => { li.style.cursor = "pointer"; li.addEventListener("click", () => openLead(li.dataset.id)); });
  }

  function renderCalendar() {
    const days = [];
    const start = new Date(); start.setHours(0, 0, 0, 0);
    while (start.getDay() !== 1) start.setDate(start.getDate() - 1);
    for (let i = 0; i < 6; i++) { const d = new Date(start); d.setDate(d.getDate() + i); days.push(d); }
    const hours = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
    const cells = [];
    cells.push(`<div class="cal-h"></div>` + days.map((d) => `<div class="cal-h">${d.toLocaleDateString("en-US", { weekday: "short" })} <span class="muted">${d.getDate()}</span></div>`).join(""));
    hours.forEach((h) => {
      cells.push(`<div class="cal-t">${h}:00</div>`);
      days.forEach((d) => {
        const ev = leads.find((l) => { const s = new Date(l.slot); return ["booked", "done"].includes(l.status) && s.getDate() === d.getDate() && s.getMonth() === d.getMonth() && s.getHours() === h; });
        cells.push(`<div>${ev ? `<div class="cal-ev ev-${ev.pack.toLowerCase()}" data-id="${ev.id}">${esc(ev.name.split(" ")[0])}<small>${esc(ev.car)} · ${esc(ev.pack)}</small></div>` : ""}</div>`);
      });
    });
    page.innerHTML = head("CALENDAR", `Week of ${days[0].toLocaleDateString("en-US", { month: "long", day: "numeric" })}. Two bays, Mon–Sat.`, `<button class="btn btn--sm" disabled>‹ Prev</button><button class="btn btn--sm" disabled>Next ›</button>`) +
      `<div class="card"><div class="calendar">${cells.join("")}</div></div>`;
    $$(".cal-ev", page).forEach((el) => { el.style.cursor = "pointer"; el.addEventListener("click", () => openLead(el.dataset.id)); });
  }

  function renderMessages() {
    const threads = leads.slice(0, 5);
    const active = threads[0];
    const pane = (l) => `
      <div class="thread__msgs">
        <div class="msg auto">Hi ${esc(l.name.split(" ")[0])}, it's Obsidian Detail Studio. Your ${esc(l.pack.toLowerCase())} is set for ${slotLabel(l.slot)}. Reply here with any questions.<small>Auto · confirmation</small></div>
        <div class="msg">Perfect, thanks. Is there parking out front for drop-off?<small>${esc(l.name)}</small></div>
        <div class="msg me">Yes, pull straight into bay 2 and we'll meet you there. Keys back ${l.pack === "Ceramic" ? "in two days" : "same day"}.<small>You</small></div>
      </div>
      <div class="thread__compose"><input placeholder="Message ${esc(l.name.split(" ")[0])}…" /><button class="btn btn--white btn--sm">Send</button></div>`;
    page.innerHTML = head("MESSAGES", "Texts and DMs in one inbox. Replies go out from the studio number.") + `
      <div class="card thread">
        <div class="thread__list">${threads.map((l, i) => `<div class="thread__item ${i === 0 ? "is-active" : ""}" data-id="${l.id}"><strong>${esc(l.name)}</strong><span>${i === 0 ? "Yes, pull straight into bay 2…" : "Your " + esc(l.pack.toLowerCase()) + " is set for " + slotLabel(l.slot)}</span></div>`).join("")}</div>
        <div class="thread__pane" id="threadPane">${pane(active)}</div>
      </div>`;
    $$(".thread__item", page).forEach((it) => it.addEventListener("click", () => {
      $$(".thread__item", page).forEach((x) => x.classList.remove("is-active")); it.classList.add("is-active");
      $("#threadPane").innerHTML = pane(leads.find((l) => l.id === it.dataset.id));
      bindCompose();
    }));
    const bindCompose = () => {
      const inp = $(".thread__compose input", page), btn = $(".thread__compose .btn", page);
      const send = () => { const v = inp.value.trim(); if (!v) return; const m = document.createElement("div"); m.className = "msg me"; m.innerHTML = `${esc(v)}<small>You · just now</small>`; $(".thread__msgs", page).appendChild(m); inp.value = ""; };
      btn.addEventListener("click", send); inp.addEventListener("keydown", (e) => { if (e.key === "Enter") send(); });
    };
    bindCompose();
  }

  function renderCustomers() {
    const map = new Map();
    leads.forEach((l) => { const k = l.phone; const c = map.get(k) || { ...l, visits: 0, spent: 0, last: l.createdAt }; c.visits++; if (["booked", "done"].includes(l.status)) c.spent += l.total; map.set(k, c); });
    const rows = Array.from(map.values()).filter(matches);
    page.innerHTML = head("CUSTOMERS", "Everyone who has booked or asked for a quote, with lifetime value.") + `
      <div class="card"><table class="table"><thead><tr><th>Customer</th><th>Phone</th><th>Email</th><th>Vehicle</th><th>Visits</th><th>Spent</th><th>Last seen</th></tr></thead>
      <tbody>${rows.map((c) => `<tr data-id="${c.id}"><td><div class="cust"><strong>${esc(c.name)}</strong></div></td><td class="muted">${esc(c.phone)}</td><td class="muted">${esc(c.email) || "—"}</td><td>${esc(c.car)}</td><td>${c.visits}</td><td>${money(c.spent)}</td><td class="muted">${rel(c.last)}</td></tr>`).join("")}</tbody></table></div>`;
    $$("tbody tr", page).forEach((tr) => tr.addEventListener("click", () => openLead(tr.dataset.id)));
  }

  function renderReviews() {
    const reviews = [
      ["Aaron W.", 5, "Dropped it off filthy, picked it up looking better than the day I bought it. The price was exactly what the website said."],
      ["Chloe B.", 5, "Ceramic coating is unreal. Rain just slides off. Booking took about a minute."],
      ["Marcus D.", 4, "Great polish, swirls are gone. Only reason it's not 5 is I had to wait a week for a slot. Worth it."],
      ["Hana S.", 5, "They sent photos under the inspection light before and after. Nobody else does that."],
    ];
    page.innerHTML = head("REVIEWS", "4.9 average across 128 reviews. New reviews are requested automatically after every detail.", `<button class="btn btn--sm">Copy review link</button>`) +
      `<div class="card">${reviews.map(([n, s, t]) => `<div class="review"><div class="review__head"><strong>${n}</strong><span class="stars">${"★".repeat(s)}${"☆".repeat(5 - s)}</span><span class="muted" style="margin-left:auto;font-size:11px">Google</span></div><p>${t}</p></div>`).join("")}</div>`;
  }

  function renderAutomations() {
    const autos = [
      ["Instant confirmation text", "Sent the moment a booking is confirmed on the website.", true],
      ["24-hour reminder", "Text reminder with drop-off instructions the day before.", true],
      ["Quote follow-up", "If a quote isn't booked in 48h, send a nudge with an open slot.", true],
      ["Review request", "Ask for a Google review 3 hours after the keys go back.", true],
      ["Maintenance plan offer", "Offer a monthly wash plan 30 days after a ceramic coating.", false],
      ["Lost-lead win-back", "Re-engage leads marked lost after 60 days with a seasonal offer.", false],
    ];
    page.innerHTML = head("AUTOMATIONS", "The follow-ups that run without you.") +
      `<div class="card">${autos.map(([t, d, on]) => `<div class="auto"><div><strong>${t}</strong><span>${d}</span></div><button class="switch ${on ? "is-on" : ""}" aria-label="Toggle"></button></div>`).join("")}</div>`;
    $$(".switch", page).forEach((s) => s.addEventListener("click", () => { s.classList.toggle("is-on"); toast(s.classList.contains("is-on") ? "Automation on" : "Automation paused"); }));
  }

  function renderSettings() {
    page.innerHTML = head("SETTINGS", "Studio details, hours and pricing shown on the website.") + `
      <div class="settings">
        <div class="card"><h3>Studio</h3>
          <label class="field"><span>Name</span><input value="Obsidian Detail Studio" /></label>
          <label class="field"><span>Phone</span><input value="(555) 013-4221" /></label>
          <label class="field"><span>Address</span><input value="14 Foundry Lane, Unit 3" /></label>
          <label class="field"><span>Hours</span><input value="Mon–Sat 8:00–18:00" /></label>
        </div>
        <div class="card"><h3>Pricing</h3>
          <div class="price-row"><span>Wash <span class="muted">· 1.5 h</span></span><input value="89" /></div>
          <div class="price-row"><span>Polish <span class="muted">· 4 h</span></span><input value="349" /></div>
          <div class="price-row"><span>Ceramic <span class="muted">· 2 days</span></span><input value="899" /></div>
          <div class="price-row"><span>SUV multiplier</span><input value="1.20" /></div>
          <div class="price-row"><span>Truck multiplier</span><input value="1.30" /></div>
          <h3 style="margin-top:18px">Data</h3>
          <button class="btn btn--sm btn--danger" id="resetBtn">Reset demo data</button>
        </div>
      </div>`;
    $("#resetBtn").addEventListener("click", () => {
      localStorage.removeItem(LEADS_KEY); localStorage.removeItem(SEED_KEY);
      leads = ensureSeed(); leads.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      toast("Demo data reset"); location.hash = "#leads";
    });
  }

  /* ---------- Lead drawer ---------- */
  const ld = $("#ldrawer"), ldb = $("#ldrawerBackdrop");
  function openLead(id) {
    const l = leads.find((x) => x.id === id);
    if (!l) return;
    selectedId = id;
    $$("tbody tr", page).forEach((tr) => tr.classList.toggle("is-selected", tr.dataset.id === id));
    ld.innerHTML = `
      <div class="ldrawer__head">
        <div class="ldrawer__eyebrow">Lead · ${esc(l.id)} · ${esc(l.source)}</div>
        <h2 class="ldrawer__name">${esc(l.name)}</h2>
        <div class="ldrawer__meta">${esc(l.car)} · ${esc(l.pack)} ${pill(l.status)}</div>
        <button class="ldrawer__close" aria-label="Close">×</button>
      </div>
      <div class="ldrawer__sec"><h4>Details</h4>
        <div class="kv">
          <div><span>Drop-off</span><strong>${slotLabel(l.slot)}</strong></div>
          <div><span>Total</span><strong class="total">${money(l.total)}</strong></div>
          <div><span>Phone</span><strong>${esc(l.phone)}</strong></div>
          <div><span>Email</span><strong>${esc(l.email) || "—"}</strong></div>
          <div><span>Created</span><strong>${rel(l.createdAt)}</strong></div>
          <div><span>Source</span><strong>${esc(l.source)}</strong></div>
        </div>
      </div>
      <div class="ldrawer__sec"><h4>Status</h4>
        <div class="status-select">${Object.keys(STATUS).map((s) => `<span class="pill pill--${s} ${l.status === s ? "is-on" : ""}" data-s="${s}">${STATUS[s]}</span>`).join("")}</div>
      </div>
      <div class="ldrawer__sec"><h4>Timeline</h4>
        <ul class="timeline">${(l.timeline || []).map((t) => `<li class="${t.future ? "future" : ""}">${esc(t.text)}<small>${t.future ? "Scheduled · " : ""}${new Date(t.t).toLocaleString("en-US", { weekday: "short", hour: "numeric", minute: "2-digit" })}</small></li>`).join("")}</ul>
      </div>
      <div class="ldrawer__sec ldrawer__notes"><h4>Notes</h4><textarea placeholder="Anything the techs should know…">${esc(l.notes)}</textarea></div>
      <div class="ldrawer__actions">
        <a class="btn" href="tel:${esc(l.phone.replace(/\D/g, ""))}">Call</a>
        <a class="btn" href="sms:${esc(l.phone.replace(/\D/g, ""))}">Text</a>
        <button class="btn btn--white" data-done>${l.status === "done" ? "Completed ✓" : "Mark done"}</button>
      </div>`;
    ld.classList.add("is-open"); ld.setAttribute("aria-hidden", "false"); ldb.classList.add("is-open");
    $(".ldrawer__close", ld).addEventListener("click", closeLead);
    $$(".status-select .pill", ld).forEach((p) => p.addEventListener("click", () => { setStatus(l, p.dataset.s); openLead(l.id); }));
    $("[data-done]", ld).addEventListener("click", () => { setStatus(l, "done"); openLead(l.id); });
    $("textarea", ld).addEventListener("input", (e) => { l.notes = e.target.value; save(); });
  }
  function setStatus(l, s) {
    if (l.status === s) return;
    l.status = s;
    (l.timeline = l.timeline || []).push({ t: new Date().toISOString(), text: `Status → ${STATUS[s]}` });
    save(); toast(`${l.name.split(" ")[0]} marked ${STATUS[s].toLowerCase()}`);
    const tr = $(`tbody tr[data-id="${l.id}"]`, page);
    if (tr) tr.children[5].innerHTML = pill(s);
  }
  function closeLead() { ld.classList.remove("is-open"); ld.setAttribute("aria-hidden", "true"); ldb.classList.remove("is-open"); }
  ldb.addEventListener("click", closeLead);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeLead(); });

  /* ---------- Misc actions ---------- */
  function exportCsv() {
    const cols = ["id", "name", "phone", "email", "car", "pack", "total", "slot", "source", "status", "createdAt"];
    const csv = [cols.join(",")].concat(leads.map((l) => cols.map((c) => `"${String(l[c] ?? "").replace(/"/g, '""')}"`).join(","))).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    a.download = "obsidian-leads.csv"; a.click();
    toast("CSV exported");
  }
  function addLeadPrompt() {
    const name = prompt("Customer name");
    if (!name) return;
    const phone = prompt("Phone", "(555) 000-0000") || "";
    const l = { id: "L" + Date.now().toString(36).toUpperCase(), name: name.trim(), phone, email: "", car: "Sedan", pack: "Wash", total: 89, slot: at(1, 9), source: "Phone", status: "new", createdAt: new Date().toISOString(), notes: "", timeline: [{ t: new Date().toISOString(), text: "Added by owner" }] };
    leads.unshift(l); save(); route(); openLead(l.id);
  }

  updateBadge();
})();
