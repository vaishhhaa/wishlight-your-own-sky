const wishes = JSON.parse(document.getElementById("wishes-data").textContent || "[]");

const lanternsEl = document.getElementById("lanterns");
const shootingStarsEl = document.getElementById("shootingStars");
const counterEl = document.getElementById("counter");
const toastEl = document.getElementById("toast");
const wishModal = document.getElementById("wishModal");
const newWishModal = document.getElementById("newWishModal");
const wishForm = document.getElementById("wishForm");
const formError = document.getElementById("formError");
const modalTitle = document.getElementById("modalTitle");
const modalDescription = document.getElementById("modalDescription");
const modalCategory = document.getElementById("modalCategory");
const modalStatus = document.getElementById("modalStatus");
const modalDate = document.getElementById("modalDate");
const modalLantern = document.getElementById("modalLantern");
const cycleStatusBtn = document.getElementById("cycleStatusBtn");
const deleteWishBtn = document.getElementById("deleteWishBtn");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const rand = (min, max) => Math.random() * (max - min) + min;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smoothstep = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
function mulberry32(seed) {
    return () => {
        seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
        let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

let W = window.innerWidth, H = window.innerHeight;
let activeWish = null;
let lastFocusedElement = null;

/* =====================================================
   SHARED SVG GRADIENTS
   ===================================================== */
document.body.insertAdjacentHTML("afterbegin", `
<svg width="0" height="0" style="position:absolute" aria-hidden="true">
  <defs>
    <radialGradient id="gDream" cx=".5" cy=".82" r=".78">
      <stop offset="0" stop-color="#fff1b8"/><stop offset=".35" stop-color="#ffc15a"/>
      <stop offset=".75" stop-color="#ee7d24"/><stop offset="1" stop-color="#9c4413"/>
    </radialGradient>
    <radialGradient id="gWork" cx=".5" cy=".82" r=".78">
      <stop offset="0" stop-color="#fff6cf"/><stop offset=".3" stop-color="#ffd36e"/>
      <stop offset=".7" stop-color="#ff9230"/><stop offset="1" stop-color="#b2501a"/>
    </radialGradient>
    <radialGradient id="gDone" cx=".5" cy=".8" r=".8">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".3" stop-color="#fff0b8"/>
      <stop offset=".65" stop-color="#ffd36a"/><stop offset="1" stop-color="#e6962c"/>
    </radialGradient>
    <linearGradient id="lShade" x1="0" x2="1" y1="0" y2="0">
      <stop offset="0" stop-color="#3c1400" stop-opacity=".55"/><stop offset=".24" stop-color="#3c1400" stop-opacity="0"/>
      <stop offset=".76" stop-color="#3c1400" stop-opacity="0"/><stop offset="1" stop-color="#3c1400" stop-opacity=".55"/>
    </linearGradient>
    <radialGradient id="lCore">
      <stop offset="0" stop-color="#fffbe6" stop-opacity=".95"/><stop offset="1" stop-color="#ffdc82" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="lFlame" cx=".5" cy=".7" r=".6">
      <stop offset="0" stop-color="#ffffff"/><stop offset=".5" stop-color="#ffe08a"/><stop offset="1" stop-color="#ff9a2a"/>
    </radialGradient>
  </defs>
</svg>`);

const LANTERN_SVG = `
<svg viewBox="0 0 100 130" aria-hidden="true">
  <path class="paper" d="M22 14C6 40 4 86 26 112H74C96 86 94 40 78 14Z"/>
  <ellipse cx="50" cy="90" rx="26" ry="30" fill="url(#lCore)"/>
  <g class="ribs">
    <path d="M50 14V112"/><path d="M37 14C23 46 24 84 38 112"/><path d="M63 14C77 46 76 84 62 112"/>
    <path d="M29 14C13 48 14 86 31 112"/><path d="M71 14C87 48 86 86 69 112"/>
  </g>
  <path d="M22 14C6 40 4 86 26 112H74C96 86 94 40 78 14Z" fill="url(#lShade)"/>
  <rect x="19" y="9" width="62" height="7" rx="3" fill="#5b2a0e"/>
  <rect x="22" y="109" width="56" height="6" rx="3" fill="#4a210a"/>
  <path class="flame" d="M50 88C57 97 57 106 50 111C43 106 43 97 50 88Z" fill="url(#lFlame)"/>
  <path d="M50 115V125" stroke="#7a3a12" stroke-width="1.2"/><circle cx="50" cy="127" r="2.2" fill="#d9822b"/>
</svg>`;

const statusClass = s => s === "Achieved" ? "achieved" : s === "Working on it" ? "working" : "dreaming";

/* =====================================================
   STARS (canvas, twinkling)
   ===================================================== */
const starCanvas = document.getElementById("starCanvas");
const sctx = starCanvas.getContext("2d");
let stars = [];

function buildStars() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    starCanvas.width = W * dpr; starCanvas.height = H * dpr;
    sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round(clamp((W * H) / 5500, 120, 320));
    const tints = ["255,255,255", "205,222,255", "255,236,205"];
    stars = Array.from({ length: count }, () => ({
        x: rand(0, W), y: rand(0, H * 0.92),
        r: Math.random() < 0.08 ? rand(1.4, 2.2) : rand(0.4, 1.3),
        a: rand(0.35, 1), speed: rand(0.6, 2.6), ph: rand(0, 6.28),
        tint: tints[Math.floor(Math.random() * tints.length)],
    }));
}

function drawStars(t) {
    sctx.clearRect(0, 0, W, H);
    for (const s of stars) {
        const tw = reduceMotion ? 0.8 : 0.5 + 0.5 * Math.sin(t * s.speed + s.ph);
        const alpha = s.a * (0.2 + 0.8 * tw);
        sctx.fillStyle = `rgba(${s.tint},${alpha})`;
        sctx.beginPath(); sctx.arc(s.x, s.y, s.r, 0, 6.2832); sctx.fill();
        if (s.r > 1.4) {   // sparkle cross + soft glow on the bright ones
            sctx.strokeStyle = `rgba(${s.tint},${alpha * 0.5})`;
            sctx.lineWidth = 0.6;
            const L = s.r * 4 * (0.6 + tw);
            sctx.beginPath();
            sctx.moveTo(s.x - L, s.y); sctx.lineTo(s.x + L, s.y);
            sctx.moveTo(s.x, s.y - L); sctx.lineTo(s.x, s.y + L);
            sctx.stroke();
            sctx.fillStyle = `rgba(${s.tint},${alpha * 0.12})`;
            sctx.beginPath(); sctx.arc(s.x, s.y, s.r * 4, 0, 6.2832); sctx.fill();
        }
    }
}

function createShootingStar() {
    if (document.hidden || reduceMotion) return;
    const star = document.createElement("span");
    star.className = "shooting-star";
    star.style.left = `${rand(10, 75)}%`;
    star.style.top = `${rand(5, 40)}%`;
    shootingStarsEl.appendChild(star);
    setTimeout(() => star.remove(), 1700);
}
function scheduleShootingStars() {
    setTimeout(() => { createShootingStar(); scheduleShootingStars(); }, rand(6000, 13000));
}

/* =====================================================
   REAL MOON (phase from today's date)
   ===================================================== */
const SYNODIC = 29.530588853;
const ANOMALISTIC = 27.55455;

function moonInfo(date = new Date()) {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const age = (((jd - 2451550.1) % SYNODIC) + SYNODIC) % SYNODIC;   // days since new moon (6 Jan 2000)
    const phase = age / SYNODIC;                                       // 0 new → .5 full → 1 new
    const illum = (1 - Math.cos(2 * Math.PI * phase)) / 2;
    // approximate perigee/apogee size change (±5%); an estimate, not an ephemeris
    const scale = 1 + 0.05 * Math.cos(2 * Math.PI * ((jd - 2451562.2) / ANOMALISTIC));
    let name = "New Moon";
    if (phase >= 0.03 && phase < 0.22) name = "Waxing Crescent";
    else if (phase < 0.28) name = "First Quarter";
    else if (phase < 0.47) name = "Waxing Gibbous";
    else if (phase < 0.53) name = "Full Moon";
    else if (phase < 0.72) name = "Waning Gibbous";
    else if (phase < 0.78) name = "Last Quarter";
    else if (phase < 0.97) name = "Waning Crescent";
    return { age, phase, illum, scale, name };
}

function buildMoonAlbedo(S) {
    const rnd = mulberry32(2026);
    const c = document.createElement("canvas"); c.width = c.height = S;
    const g = c.getContext("2d");
    g.fillStyle = "#bfbaac"; g.fillRect(0, 0, S, S);

    for (let i = 0; i < 900; i++) {            // highland mottling
        const l = rnd() < 0.5 ? 255 : 70;
        g.fillStyle = `rgba(${l},${l},${l - 8},${rnd() * 0.05})`;
        g.beginPath(); g.arc(rnd() * S, rnd() * S, rnd() * S * 0.06 + 2, 0, 7); g.fill();
    }
    const maria = [   // x, y, radius (fractions of the disc, northern-hemisphere view)
        [.38,.30,.13],[.55,.30,.08],[.60,.43,.10],[.75,.33,.05],
        [.72,.55,.07],[.22,.46,.15],[.40,.68,.08],[.27,.66,.05],[.50,.55,.05],
    ];
    maria.forEach(([x, y, r]) => {
        for (let k = 0; k < 4; k++) {
            const px = x * S + (rnd() - 0.5) * r * S * 0.9;
            const py = y * S + (rnd() - 0.5) * r * S * 0.9;
            const rr = r * S * (0.6 + rnd() * 0.5);
            const gr = g.createRadialGradient(px, py, 0, px, py, rr);
            gr.addColorStop(0, "rgba(52,54,64,.62)");
            gr.addColorStop(0.7, "rgba(60,62,70,.42)");
            gr.addColorStop(1, "rgba(60,62,70,0)");
            g.fillStyle = gr; g.fillRect(0, 0, S, S);
        }
    });
    for (let i = 0; i < 320; i++) {            // craters
        const a = rnd() * 6.283, d = Math.sqrt(rnd()) * 0.96;
        const cx = S * (0.5 + 0.5 * d * Math.cos(a)), cy = S * (0.5 + 0.5 * d * Math.sin(a));
        const r = (Math.pow(rnd(), 3) * 0.035 + 0.004) * S;
        const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r * 1.25);
        gr.addColorStop(0, "rgba(40,40,44,.35)"); gr.addColorStop(0.68, "rgba(40,40,44,.12)");
        gr.addColorStop(0.8, "rgba(255,255,255,.3)"); gr.addColorStop(1, "rgba(255,255,255,0)");
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, r * 1.25, 0, 7); g.fill();
    }
    const tx = 0.42 * S, ty = 0.84 * S;        // Tycho and its bright rays
    g.lineWidth = 1;
    for (let i = 0; i < 24; i++) {
        const a = rnd() * 6.283, len = S * (0.15 + rnd() * 0.3);
        g.strokeStyle = "rgba(255,255,255,.10)";
        g.beginPath(); g.moveTo(tx, ty); g.lineTo(tx + Math.cos(a) * len, ty + Math.sin(a) * len); g.stroke();
    }
    const tg = g.createRadialGradient(tx, ty, 0, tx, ty, S * 0.03);
    tg.addColorStop(0, "rgba(255,255,255,.9)"); tg.addColorStop(1, "rgba(255,255,255,0)");
    g.fillStyle = tg; g.beginPath(); g.arc(tx, ty, S * 0.03, 0, 7); g.fill();
    return g.getImageData(0, 0, S, S).data;
}

let moonAlbedo = null;
function renderMoon() {
    const canvas = document.getElementById("moonCanvas");
    const S = canvas.width, ctx = canvas.getContext("2d");
    if (!moonAlbedo) moonAlbedo = buildMoonAlbedo(S);
    const info = moonInfo();

    const ang = info.phase * 2 * Math.PI;
    const Lx = Math.sin(ang), Lz = -Math.cos(ang);       // sun direction: right-lit when waxing
    const out = ctx.createImageData(S, S), r = S / 2;

    for (let y = 0; y < S; y++) {
        for (let x = 0; x < S; x++) {
            const nx = (x + 0.5 - r) / r, ny = (y + 0.5 - r) / r;
            const d2 = nx * nx + ny * ny;
            if (d2 > 1) continue;
            const i = (y * S + x) * 4;
            const nz = Math.sqrt(1 - d2);
            const lit = smoothstep(-0.04, 0.22, nx * Lx + nz * Lz);   // soft terminator
            const b = 0.04 + lit * 0.96 * (0.86 + 0.14 * nz);         // earthshine + limb
            out.data[i]     = moonAlbedo[i]     * b * 1.18;
            out.data[i + 1] = moonAlbedo[i + 1] * b * 1.16;
            out.data[i + 2] = Math.min(255, moonAlbedo[i + 2] * b * 1.10 + (1 - lit) * 7);
            out.data[i + 3] = 255 * clamp((1 - Math.sqrt(d2)) * r / 1.2);
        }
    }
    ctx.putImageData(out, 0, 0);

    const moon = document.getElementById("moon");
    moon.style.setProperty("--illum", info.illum.toFixed(3));
    moon.style.setProperty("--moon-scale", info.scale.toFixed(3));
    const text = `${info.name} · ${Math.round(info.illum * 100)}% lit`;
    document.getElementById("moonLabel").textContent = text;
    moon.setAttribute("aria-label", `The moon tonight: ${text}`);
}

/* =====================================================
   LANTERNS (floating engine)
   ===================================================== */
const bodies = new Map();     // wish id → state
const far = [];               // decorative background lanterns
const farLayer = document.createElement("div");
farLayer.className = "lantern-layer far";
farLayer.setAttribute("aria-hidden", "true");
lanternsEl.before(farLayer);

function makeBody(el, size, opts) {
    el.style.width = `${size}px`;
    el.style.height = `${size * 1.3}px`;
    el.style.setProperty("--glow", rand(0.8, 1.2).toFixed(2));
    return {
        el, inner: el.querySelector(".lantern-inner"), size, h: size * 1.3,
        x: opts.x, y: opts.y, vy: opts.vy, amp: opts.amp,
        freq: rand(0.25, 0.5), ph: rand(0, 6.28), k: 1, hover: false, max: opts.max || 1,
    };
}

function spawnWish(wish, index, fresh = false) {
    const mobile = W < 600;
    const size = rand(mobile ? 40 : 50, mobile ? 60 : 82);
    const el = document.createElement("button");
    el.type = "button";
    el.className = `lantern ${statusClass(wish.status)}`;
    el.dataset.id = wish.id;
    el.setAttribute("aria-label", `Open wish: ${wish.title}`);
    el.innerHTML = `<span class="lantern-inner"><span class="lantern-glow"></span>${LANTERN_SVG}</span><span class="lantern-tip"></span>`;
    el.querySelector(".lantern-tip").textContent = wish.title;

    const spread = ((index * 0.618034 + 0.07) % 1) * Math.max(40, W - size - 24) + 12;
    const s = makeBody(el, size, {
        x: fresh ? clamp(W / 2 - size / 2 + rand(-60, 60), 12, W - size - 12) : spread,
        y: fresh ? H - size * 1.8 : rand(H * 0.2, H * 0.86),
        vy: 6 + size * 0.14, amp: rand(10, 26),
    });
    const setHover = v => { s.hover = v; };
    el.addEventListener("mouseenter", () => setHover(true));
    el.addEventListener("mouseleave", () => setHover(false));
    el.addEventListener("focus", () => setHover(true));
    el.addEventListener("blur", () => setHover(false));
    el.addEventListener("click", () => openWish(wish.id));

    lanternsEl.appendChild(el);
    bodies.set(Number(wish.id), s);
}

function spawnFar() {
    const count = W < 600 ? 8 : 16;
    for (let i = 0; i < count; i++) {
        const el = document.createElement("span");
        el.className = "lantern far";
        el.innerHTML = `<span class="lantern-inner"><span class="lantern-glow"></span>${LANTERN_SVG}</span>`;
        const size = rand(14, 28);
        const s = makeBody(el, size, { x: rand(0, W), y: rand(H * 0.1, H), vy: rand(3, 6), amp: rand(6, 14), max: 0.55 });
        farLayer.appendChild(el);
        far.push(s);
    }
}

let lastTime = 0, clock = 0;
function step(dt) {
    clock += dt;
    const all = [...bodies.values(), ...far];
    for (const s of all) {
        s.k += ((s.hover ? 0 : 1) - s.k) * Math.min(1, dt * 4);   // ease to a stop on hover
        s.y -= s.vy * dt * s.k;
        if (s.y < -s.h * 1.6) { s.y = H + s.h * 0.5; s.x = rand(12, Math.max(13, W - s.size - 12)); }
        const sway = Math.sin(clock * s.freq + s.ph) * s.amp;
        const fadeIn = clamp((H - s.y) / (H * 0.14));
        const fadeOut = clamp((s.y + s.h) / (H * 0.2));
        s.el.style.transform = `translate3d(${(s.x + sway).toFixed(1)}px,${s.y.toFixed(1)}px,0)`;
        s.el.style.opacity = (Math.min(fadeIn, fadeOut) * s.max).toFixed(3);
        s.inner.style.transform = `rotate(${(sway * 0.16).toFixed(2)}deg)`;
    }
    drawStars(clock);
}
function loop(now) {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;
    step(dt);
    requestAnimationFrame(loop);
}

function updateCounter() {
    const total = wishes.length;
    counterEl.textContent = `✦ ${total} ${total === 1 ? "wish" : "wishes"} glowing in your sky ✦`;
}

let toastTimer;
function toast(message) {
    toastEl.textContent = message;
    toastEl.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove("show"), 2600);
}

/* =====================================================
   MODALS & ACTIONS
   ===================================================== */
function formatDate(value) {
    if (!value) return "";
    const date = new Date(`${value}T00:00:00`);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString(undefined, {
        day: "numeric", month: "short", year: "numeric",
    });
}

function openModal(modal) {
    lastFocusedElement = document.activeElement;
    modal.hidden = false;
    requestAnimationFrame(() => modal.classList.add("is-open"));
    document.body.classList.add("modal-open");
    modal.querySelector("button, input, textarea, select")?.focus();
}
function closeModal(modal) {
    modal.classList.remove("is-open");
    setTimeout(() => { modal.hidden = true; }, 220);
    document.body.classList.remove("modal-open");
    lastFocusedElement?.focus?.();
}

function paintModalLantern(status) {
    modalLantern.innerHTML = `<span class="${statusClass(status)}">${LANTERN_SVG}</span>`;
}

function openWish(id) {
    activeWish = wishes.find(w => Number(w.id) === Number(id));
    if (!activeWish) return;
    paintModalLantern(activeWish.status);
    modalTitle.textContent = activeWish.title;
    modalDescription.textContent = activeWish.description || "A wish waiting for its story.";
    modalCategory.textContent = activeWish.category;
    modalStatus.textContent = activeWish.status;
    modalDate.textContent = activeWish.target_date
        ? `Target: ${formatDate(activeWish.target_date)}`
        : `Created: ${formatDate(activeWish.created_at?.slice(0, 10))}`;
    openModal(wishModal);
}

async function api(url, options = {}) {
    const response = await fetch(url, {
        headers: { "Content-Type": "application/json", ...(options.headers || {}) },
        ...options,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || "Something went wrong.");
    return data;
}

document.getElementById("newWishBtn").addEventListener("click", () => {
    formError.textContent = "";
    wishForm.reset();
    openModal(newWishModal);
});
document.querySelectorAll("[data-close]").forEach(btn =>
    btn.addEventListener("click", () => closeModal(btn.closest(".modal-backdrop"))));
document.querySelectorAll(".modal-backdrop").forEach(backdrop =>
    backdrop.addEventListener("click", e => { if (e.target === backdrop) closeModal(backdrop); }));
document.addEventListener("keydown", e => {
    if (e.key === "Escape") document.querySelectorAll(".modal-backdrop.is-open").forEach(m => closeModal(m));
});

wishForm.addEventListener("submit", async event => {
    event.preventDefault();
    formError.textContent = "";
    const payload = {
        title: document.getElementById("title").value.trim(),
        description: document.getElementById("description").value.trim(),
        category: document.getElementById("category").value,
        target_date: document.getElementById("targetDate").value,
    };
    try {
        const wish = await api("/api/wishes", { method: "POST", body: JSON.stringify(payload) });
        wishes.unshift(wish);
        closeModal(newWishModal);
        spawnWish(wish, 0, true);
        updateCounter();
        createShootingStar();
        toast("Your lantern is rising into the sky ✦");
    } catch (error) {
        formError.textContent = error.message;
    }
});

cycleStatusBtn.addEventListener("click", async () => {
    if (!activeWish) return;
    const statuses = ["Dreaming", "Working on it", "Achieved"];
    const next = statuses[(statuses.indexOf(activeWish.status) + 1) % statuses.length];
    try {
        const updated = await api(`/api/wishes/${activeWish.id}`, { method: "PATCH", body: JSON.stringify({ status: next }) });
        Object.assign(activeWish, updated);
        modalStatus.textContent = updated.status;
        paintModalLantern(updated.status);
        const s = bodies.get(Number(activeWish.id));
        if (s) {
            s.el.className = `lantern ${statusClass(updated.status)} pulse`;
            setTimeout(() => s.el.classList.remove("pulse"), 900);
        }
        if (updated.status === "Achieved") { createShootingStar(); toast("Wish achieved — it's shining bright ✦"); }
    } catch (error) {
        toast(error.message);
    }
});

deleteWishBtn.addEventListener("click", async () => {
    if (!activeWish) return;
    if (!window.confirm("Let this wish go? This cannot be undone.")) return;
    try {
        const id = Number(activeWish.id);
        await api(`/api/wishes/${id}`, { method: "DELETE" });
        const index = wishes.findIndex(w => Number(w.id) === id);
        if (index >= 0) wishes.splice(index, 1);
        bodies.get(id)?.el.remove();
        bodies.delete(id);
        activeWish = null;
        closeModal(wishModal);
        updateCounter();
        toast("Your wish drifted away into the night");
    } catch (error) {
        toast(error.message);
    }
});

window.addEventListener("resize", () => { W = window.innerWidth; H = window.innerHeight; buildStars(); });

/* =====================================================
   START
   ===================================================== */
buildStars();
renderMoon();
setInterval(renderMoon, 10 * 60 * 1000);          // keep the phase fresh if the tab stays open
spawnFar();
wishes.forEach((w, i) => spawnWish(w, i));
updateCounter();
scheduleShootingStars();


if (reduceMotion) { step(0); }
else { requestAnimationFrame(t => { lastTime = t; loop(t); }); }
