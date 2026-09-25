// PaceVelo 90-second animated explainer.
// Every frame is a pure function of time: PV.frame(t) returns the SVG markup for
// second `t`, so the same code drives live playback and frame-exact MP4 rendering.
(function () {
  "use strict";

  const W = 1920, H = 1080, DURATION = 90;
  const C = {
    cyan: "#00F2FE", cyanD: "#06B6D4", mint: "#38EF7D", mintD: "#16A34A",
    slate: "#334155", slateD: "#1E293B", slateL: "#94A3B8", ink: "#0B1220",
    sky: "#E6FDFF", paper: "#F8FAFC", line: "#CBD5E1", gold: "#FFC83D", goldD: "#F59E0B",
    pink: "#FF6B9A", orange: "#FF8A3D", strava: "#FC4C02", purple: "#8B5CF6", red: "#FF5A5F",
    blue: "#3B82F6",
  };
  const SKIN = ["#F7D3B5", "#E8B48A", "#C68642", "#8D5524", "#5C3A21"];
  const FONT = "Nunito, 'Liberation Sans', sans-serif";

  // ---------- math ----------
  const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const p = (t, a, b) => clamp((t - a) / (b - a));
  const eo = (t) => 1 - Math.pow(1 - t, 3);
  const eio = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
  const back = (t) => { const c1 = 1.9, c3 = c1 + 1; return t <= 0 ? 0 : t >= 1 ? 1 : 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); };
  const elastic = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3) + 1);
  const pop = (t, a, d = 0.5) => back(p(t, a, a + d));
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const f = (n) => (Math.round(n * 10) / 10).toString();
  const rad = (d) => (d * Math.PI) / 180;

  // ---------- svg helpers ----------
  const g = (tf, body, op = 1) => (op <= 0.001 ? "" : `<g transform="${tf}"${op < 1 ? ` opacity="${f(op * 100) / 100}"` : ""}>${body}</g>`);
  const T = (x, y, s = 1, r = 0) => `translate(${f(x)} ${f(y)})${r ? ` rotate(${f(r)})` : ""}${s !== 1 ? ` scale(${Math.round(s * 1000) / 1000})` : ""}`;
  const rect = (x, y, w, h, rx, fill, extra = "") => `<rect x="${f(x)}" y="${f(y)}" width="${f(w)}" height="${f(h)}" rx="${f(rx)}" fill="${fill}" ${extra}/>`;
  const circ = (x, y, r, fill, extra = "") => `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="${fill}" ${extra}/>`;
  const line = (x1, y1, x2, y2, stroke, w, extra = "") => `<line x1="${f(x1)}" y1="${f(y1)}" x2="${f(x2)}" y2="${f(y2)}" stroke="${stroke}" stroke-width="${w}" stroke-linecap="round" ${extra}/>`;
  const path = (d, fill, extra = "") => `<path d="${d}" fill="${fill}" ${extra}/>`;
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const text = (x, y, s, o = {}) =>
    `<text x="${f(x)}" y="${f(y)}" font-family="${FONT}" font-size="${o.size || 40}" font-weight="${o.weight || 800}" fill="${o.fill || C.slateD}" text-anchor="${o.anchor || "middle"}"${o.ls ? ` letter-spacing="${o.ls}"` : ""}${o.extra ? " " + o.extra : ""}>${esc(s)}</text>`;
  const star = (x, y, r, fill, extra = "") => {
    let d = "";
    for (let i = 0; i < 10; i++) {
      const rr = i % 2 ? r * 0.45 : r, a = rad(i * 36 - 90);
      d += (i ? "L" : "M") + f(x + Math.cos(a) * rr) + " " + f(y + Math.sin(a) * rr);
    }
    return path(d + "Z", fill, extra);
  };
  const sparkle = (x, y, r, fill) => path(`M${f(x)} ${f(y - r)} Q${f(x)} ${f(y)} ${f(x + r)} ${f(y)} Q${f(x)} ${f(y)} ${f(x)} ${f(y + r)} Q${f(x)} ${f(y)} ${f(x - r)} ${f(y)} Q${f(x)} ${f(y)} ${f(x)} ${f(y - r)}Z`, fill);
  const chevrons = (x, y, s, sw = 52) =>
    g(T(x, y, s), `<polyline points="-90,-90 -4,0 -90,90" fill="none" stroke="url(#pvGrad)" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/><polyline points="0,-90 86,0 0,90" fill="none" stroke="url(#pvGrad)" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`);
  const check = (x, y, s, color) => `<path d="M${f(x - 14 * s)} ${f(y)} L${f(x - 4 * s)} ${f(y + 10 * s)} L${f(x + 16 * s)} ${f(y - 12 * s)}" fill="none" stroke="${color}" stroke-width="${f(7 * s)}" stroke-linecap="round" stroke-linejoin="round"/>`;
  const bubble = (x, y, w, h, fill, tailDir = 1) =>
    rect(x - w / 2, y - h / 2, w, h, h / 2, fill) + path(`M${f(x + tailDir * (w / 2 - 50))} ${f(y + h / 2 - 4)} l${f(tailDir * 26)} 34 l${f(-tailDir * 2)} -34Z`, fill);

  const defs = `<defs>
    <linearGradient id="pvGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="${C.mint}"/><stop offset="1" stop-color="${C.cyan}"/></linearGradient>
    <linearGradient id="pvGradV" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${C.cyan}"/><stop offset="1" stop-color="${C.mint}"/></linearGradient>
    <radialGradient id="glow"><stop offset="0" stop-color="${C.cyan}" stop-opacity=".9"/><stop offset="1" stop-color="${C.cyan}" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowMint"><stop offset="0" stop-color="${C.mint}" stop-opacity=".8"/><stop offset="1" stop-color="${C.mint}" stop-opacity="0"/></radialGradient>
    <radialGradient id="glowGold"><stop offset="0" stop-color="${C.gold}" stop-opacity=".9"/><stop offset="1" stop-color="${C.gold}" stop-opacity="0"/></radialGradient>
    <filter id="soft" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#0B1220" flood-opacity=".18"/></filter>
    <filter id="neon" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="8" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  </defs>`;

  // ---------- characters ----------
  function limb(x, y, angs, lens) {
    const pts = [[x, y]];
    let cx = x, cy = y;
    angs.forEach((a, i) => { cx += Math.sin(rad(a)) * lens[i]; cy += Math.cos(rad(a)) * lens[i]; pts.push([cx, cy]); });
    return { d: "M" + pts.map((q) => f(q[0]) + " " + f(q[1])).join(" L"), pts, end: [cx, cy] };
  }
  const stroke = (d, color, w) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"/>`;

  function hairFront(style, color) {
    switch (style) {
      case "bun":
        return circ(0, -388, 30, color) + path("M-67 -300 C-70 -392 70 -392 67 -300 C54 -348 -54 -348 -67 -300Z", color);
      case "long":
        return path("M-68 -290 C-76 -396 76 -396 68 -290 C60 -330 30 -352 -6 -346 C-40 -346 -62 -326 -68 -290Z", color);
      case "curly": {
        let s = "";
        for (let a = -95; a <= 95; a += 19) s += circ(Math.sin(rad(a)) * 58, -312 - Math.cos(rad(a)) * 58, 24, color);
        return s;
      }
      case "bald":
        return "";
      case "spiky":
        return path("M-66 -300 L-70 -350 L-44 -340 L-40 -382 L-12 -356 L4 -394 L22 -356 L50 -380 L48 -340 L72 -344 L66 -300 C54 -338 -54 -338 -66 -300Z", color);
      default:
        return path("M-67 -298 C-74 -384 70 -398 67 -298 C60 -336 24 -350 -8 -340 C-30 -352 -60 -340 -67 -298Z", color);
    }
  }

  function face(expr, o) {
    const blink = o.blink || 1, lx = o.lookX || 0, ly = o.lookY || 0;
    let s = "";
    // eyes
    for (const sx of [-1, 1]) {
      const ex = sx * 24;
      if (expr === "joy") {
        s += `<path d="M${ex - 14} -306 Q${ex} -324 ${ex + 14} -306" fill="none" stroke="${C.ink}" stroke-width="7" stroke-linecap="round"/>`;
      } else {
        s += `<ellipse cx="${ex}" cy="-312" rx="16" ry="${f(19 * blink)}" fill="#fff"/>`;
        if (blink > 0.3) s += circ(ex + lx * 6, -310 + ly * 6, 9, C.ink) + circ(ex + lx * 6 + 3, -314 + ly * 6, 3, "#fff");
      }
    }
    // brows
    const brow = {
      worried: ["M-40 -336 L-12 -348", "M40 -336 L12 -348"],
      determined: ["M-40 -350 L-12 -340", "M40 -350 L12 -340"],
      tired: ["M-40 -340 Q-26 -334 -12 -340", "M40 -340 Q26 -334 12 -340"],
    }[expr === "stressed" ? "worried" : expr] || ["M-40 -342 Q-26 -352 -12 -344", "M40 -342 Q26 -352 12 -344"];
    s += brow.map((d) => `<path d="${d}" fill="none" stroke="${o.browColor || C.ink}" stroke-width="6" stroke-linecap="round"/>`).join("");
    // cheeks
    s += circ(-40, -284, 10, C.pink, 'opacity=".35"') + circ(40, -284, 10, C.pink, 'opacity=".35"');
    // mouth
    switch (expr) {
      case "stressed":
        s += `<path d="M-24 -270 q6 -9 12 0 t12 0 t12 0 t12 0" fill="none" stroke="${C.ink}" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>`;
        break;
      case "tired":
        s += `<ellipse cx="0" cy="-268" rx="14" ry="${f(12 + 4 * Math.sin((o.t || 0) * 6))}" fill="#7A1F2B"/>`;
        break;
      case "sip":
        s += circ(0, -270, 7, "#7A1F2B");
        break;
      case "grin":
      case "joy":
      case "determined":
        s += `<path d="M-26 -282 Q0 -238 26 -282Z" fill="#7A1F2B"/><path d="M-20 -280 L20 -280 L18 -274 L-18 -274Z" fill="#fff"/>`;
        break;
      default:
        s += `<path d="M-20 -280 Q0 -260 20 -280" fill="none" stroke="${C.ink}" stroke-width="6" stroke-linecap="round"/>`;
    }
    if (o.glasses) s += `<g fill="none" stroke="${C.ink}" stroke-width="5"><circle cx="-24" cy="-312" r="22"/><circle cx="24" cy="-312" r="22"/><line x1="-2" y1="-314" x2="2" y2="-314"/></g>`;
    return s;
  }

  function watch(x, y, a, t, lit) {
    return g(T(x, y, 1, -a),
      rect(-16, -14, 32, 28, 8, C.slateD) + rect(-11, -9, 22, 18, 5, lit ? C.cyan : "#0EA5E9", lit ? 'filter="url(#neon)"' : ""));
  }

  // o: pose + style. Origin is between the feet; figure is ~400 units tall at scale 1.
  function person(o) {
    const skin = o.skin || SKIN[0], hair = o.hair || "#2D1B12", shirt = o.shirt || C.cyanD, pants = o.pants || C.slateD, shoe = o.shoe || "#fff";
    const armL = o.armL || [-10, -4], armR = o.armR || [10, 4], legL = o.legL || [-3, 0], legR = o.legR || [3, 0];
    let s = "";
    if (o.hairStyle === "long") s += path("M-70 -306 C-86 -236 -70 -206 -52 -196 L52 -196 C70 -206 86 -236 70 -306Z", hair);
    if (o.cape) s += o.cape;
    if (o.jetpack) s += o.jetpack;
    if (!o.hideLegs) {
      for (const [lg, sx] of [[legL, -1], [legR, 1]]) {
        const L = limb(sx * 22, -128, lg, [64, 62]);
        s += stroke(L.d, pants, 32);
        s += g(T(L.end[0] + sx * 6, L.end[1] + 6, 1, -lg[1] * 0.6), `<ellipse cx="${sx * 8}" cy="0" rx="28" ry="15" fill="${shoe}"/><rect x="${sx * 8 - 28}" y="4" width="56" height="8" rx="4" fill="${o.sole || C.slate}"/>`);
      }
      s += rect(-46, -150, 92, 34, 14, pants);
    }
    s += rect(-48, -246, 96, 132, 40, shirt);
    if (o.tie) s += path("M-9 -238 L9 -238 L6 -222 L12 -170 L0 -156 L-12 -170 L-6 -222Z", o.tie);
    if (o.badge) s += chevrons(-22, -200, 0.1, 40);
    if (o.bib) s += rect(-26, -214, 52, 40, 6, "#fff") + text(0, -184, o.bib, { size: 24, fill: C.slateD });
    s += rect(-14, -258, 28, 22, 6, skin);
    // arms: [upper, fore] angles in degrees, 0 = straight down, +90 = pointing right
    for (const [ar, sx, key] of [[armL, -1, "L"], [armR, 1, "R"]]) {
      const A = limb(sx * 44, -222, ar, [56, 52]);
      s += stroke(`M${f(A.pts[0][0])} ${f(A.pts[0][1])} L${f(A.pts[1][0])} ${f(A.pts[1][1])}`, shirt, 30);
      s += stroke(`M${f(A.pts[1][0])} ${f(A.pts[1][1])} L${f(A.pts[2][0])} ${f(A.pts[2][1])}`, skin, 22);
      if (o.watch === key) {
        const wx = lerp(A.pts[1][0], A.pts[2][0], 0.7), wy = lerp(A.pts[1][1], A.pts[2][1], 0.7);
        s += watch(wx, wy, ar[1], o.t, o.watchLit);
      }
      s += circ(A.end[0], A.end[1], 16, skin);
      const hold = o["hold" + key];
      if (hold) s += g(T(A.end[0], A.end[1]), hold);
    }
    // head
    let head = circ(-62, -306, 13, skin) + circ(62, -306, 13, skin) + circ(0, -310, 64, skin) + hairFront(o.hairStyle, hair) + face(o.expr || "smile", o);
    if (o.headband) head += rect(-66, -364, 132, 18, 9, o.headband);
    if (o.hat) head += o.hat;
    s += o.headTilt ? g(`rotate(${f(o.headTilt)} 0 -250)`, head) : head;
    return g(`translate(${f(o.x || 0)} ${f(o.y || 0)}) rotate(${f(o.rot || 0)}) scale(${o.flip ? -(o.s || 1) : o.s || 1} ${o.s || 1})`, s);
  }

  const runPose = (ph) => {
    const a = Math.sin(ph), b = Math.sin(ph + Math.PI);
    return {
      legL: [-8 + 38 * a, -8 + 38 * a - 45 * Math.max(0, -a)],
      legR: [8 + 38 * b, 8 + 38 * b + 45 * Math.max(0, -b)],
      armL: [-30 - 40 * b, -120 - 30 * b],
      armR: [30 + 40 * a, 120 + 30 * a],
    };
  };

  const shadow = (x, y, rx, op = 0.12) => `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(rx)}" ry="${f(rx * 0.18)}" fill="${C.ink}" opacity="${op}"/>`;

  // ---------- props ----------
  function sheet(x, y, r, i, w = 150, h = 190) {
    let s = rect(-w / 2, -h / 2, w, h, 6, "#fff", `stroke="${C.line}" stroke-width="3"`);
    s += rect(-w / 2, -h / 2, w, 24, 6, i % 3 === 0 ? C.cyanD : "#A5F3FC");
    for (let k = 1; k < 7; k++) s += line(-w / 2 + 10, -h / 2 + 24 + k * 22, w / 2 - 10, -h / 2 + 24 + k * 22, "#E2E8F0", 3);
    s += line(-w / 6, -h / 2 + 30, -w / 6, h / 2 - 10, "#E2E8F0", 3) + line(w / 5, -h / 2 + 30, w / 5, h / 2 - 10, "#E2E8F0", 3);
    if (i % 4 === 1) s += rect(-w / 2 + 14, -h / 2 + 56, w * 0.5, 12, 4, C.red, 'opacity=".7"');
    if (i % 5 === 2) s += text(w / 4, h / 2 - 22, "#REF!", { size: 20, fill: C.red });
    return g(T(x, y, 1, r), s);
  }

  function phone(x, y, s, screen, o = {}) {
    const w = 330, h = 640;
    let b = rect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20, 60, o.body || C.slateD, o.shadow === false ? "" : 'filter="url(#soft)"');
    b += rect(-w / 2, -h / 2, w, h, 50, o.screenBg || "#fff");
    b += `<svg x="${-w / 2}" y="${-h / 2}" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><clipPath id="pc${o.id || 0}"><rect width="${w}" height="${h}" rx="50"/></clipPath><g clip-path="url(#pc${o.id || 0})">${screen}</g></svg>`;
    b += rect(-50, -h / 2 + 14, 100, 24, 12, o.body || C.slateD);
    return g(T(x, y, s, o.r || 0), b);
  }

  function trophy(sz = 1, glowOn = true) {
    return g(T(0, 0, sz),
      (glowOn ? circ(0, -60, 70, "url(#glowGold)") : "") +
      path("M-34 -100 L34 -100 L28 -52 Q0 -26 -28 -52Z", C.gold) +
      `<path d="M-34 -92 Q-60 -90 -54 -68 Q-48 -54 -30 -58 M34 -92 Q60 -90 54 -68 Q48 -54 30 -58" fill="none" stroke="${C.goldD}" stroke-width="8" stroke-linecap="round"/>` +
      rect(-8, -40, 16, 22, 3, C.goldD) + rect(-26, -20, 52, 16, 5, C.goldD) + star(0, -72, 12, "#FFF3C4"));
  }

  function medal(x, y, s, color, label) {
    return g(T(x, y, s),
      path("M-22 -70 L-6 -20 L6 -20 L-8 -70Z", C.blue) + path("M22 -70 L6 -20 L-6 -20 L8 -70Z", C.red) +
      circ(0, 0, 36, color, `stroke="${C.goldD}" stroke-width="6"`) + star(0, 0, 18, "#fff") +
      (label ? text(0, 70, label, { size: 26, fill: C.slateD }) : ""));
  }

  function confetti(t, n, seed, area = { x: 0, y: -60, w: W, h: H + 120 }, speed = 1, alpha = 1) {
    const cols = [C.cyan, C.mint, C.gold, C.pink, C.purple, C.orange];
    let s = "";
    for (let i = 0; i < n; i++) {
      const r1 = rnd(seed + i), r2 = rnd(seed + i * 3.1), r3 = rnd(seed + i * 7.7);
      const fall = (r2 * area.h + t * (120 + r3 * 140) * speed) % area.h;
      const x = area.x + r1 * area.w + Math.sin(t * 2 + i) * 30;
      const y = area.y + fall;
      const rot = t * (90 + r3 * 200) + i * 40;
      const c = cols[i % cols.length];
      s += i % 3 === 0 ? circ(x, y, 7, c, `opacity="${alpha}"`) : g(T(x, y, 1, rot), rect(-6, -12, 12, 24, 3, c), alpha);
    }
    return s;
  }

  function burst(x, y, t, a, n = 12, color = C.gold, len = 70) {
    const k = p(t, a, a + 0.5);
    if (k <= 0 || k >= 1) return "";
    let s = "";
    for (let i = 0; i < n; i++) {
      const ang = rad((360 / n) * i), r1 = 30 + eo(k) * len, r2 = r1 + 30 * (1 - k);
      s += line(x + Math.cos(ang) * r1, y + Math.sin(ang) * r1, x + Math.cos(ang) * r2, y + Math.sin(ang) * r2, color, 8, `opacity="${f(1 - k)}"`);
    }
    return s;
  }

  // ---------- captions ----------
  // Generated by marketing/explainer/voiceover.py to match the narration.
  // narration captions: start
  const CAPTIONS = [
    [0.35, 3.73, "Meet Dana. She runs her company's wellness challenge…"],
    [3.83, 8.25, "with fourteen spreadsheets, a pile of screenshots, and zero free time."],
    [10.25, 13.79, "Most fitness challenges crown the same few super-athletes."],
    [13.89, 16.07, "Everyone else gives up by week two."],
    [20.95, 25.29, "Enter PaceVelo! Branded company fitness challenges, made fun."],
    [27.35, 30.78, "HR picks a metric, chooses the sports, and hits launch."],
    [30.88, 33.71, "Your challenge is live in under five minutes."],
    [35.45, 39.37, "Employees connect Strava in one tap, from any watch or phone."],
    [41.75, 46.09, "From then on, every run, walk and ride syncs automatically."],
    [46.19, 48.44, "No screenshots. No data entry."],
    [50.35, 52.98, "Different sports. One fair race."],
    [55.25, 58.61, "Score by distance, active minutes or elevation,"],
    [58.71, 62.07, "so walkers and cyclists compete on equal terms."],
    [65.35, 69.85, "Automatic Slack shout-outs turn every workout into a team celebration."],
    [69.95, 73.32, "Kudos, high-fives, and bragging rights for everyone."],
    [75.65, 79.77, "Healthier teams. Happier people. Zero spreadsheets."],
    [85.25, 88.27, "PaceVelo. Launch your first challenge today."]
  ];
  function caption(t, dark) {
    const c = CAPTIONS.find(([a, b]) => t >= a && t <= b);
    if (!c) return "";
    const [a, b, str] = c;
    const k = Math.min(eo(p(t, a, a + 0.35)), 1 - p(t, b - 0.3, b));
    const w = Math.min(1760, str.length * 21 + 120);
    return g(T(W / 2, 1000 + (1 - k) * 40), rect(-w / 2, -44, w, 88, 44, dark ? "rgba(255,255,255,.94)" : "rgba(11,18,32,.88)") + text(0, 14, str, { size: 40, weight: 800, fill: dark ? C.ink : "#fff" }), k);
  }

  // ---------- scene 1: the HR chaos (0-10s) ----------
  function scene1(t) {
    let s = rect(0, 0, W, H, 0, "#fff") + rect(0, 780, W, 300, 0, "#EEF6FA");
    // wall calendar tearing pages
    const day = 1 + Math.floor(t * 2.6);
    s += g(T(330, 250, 1, -4),
      rect(-110, -120, 220, 240, 18, "#fff", `stroke="${C.slate}" stroke-width="6"`) + rect(-110, -120, 220, 60, 18, C.cyanD) + rect(-110, -80, 220, 20, 0, C.cyanD) +
      text(0, -74, "DEADLINE", { size: 28, fill: "#fff" }) + text(0, 60, String(day), { size: 110, fill: C.slateD }));
    const tear = (t * 2.6) % 1;
    const tk = clamp(tear / 0.45);
    s += g(T(330 + tk * 160, 250 + tk * 420, 1, -4 + tk * 140), rect(-110, -60, 220, 180, 10, "#fff", `stroke="${C.line}" stroke-width="4"`) + text(0, 60, String(day - 1 || 1), { size: 110, fill: C.slateL }), 1 - tk);
    // spinning clock
    const spin = t * 240 + t * t * 60;
    const wob = Math.sin(t * 20) * 4 * p(t, 3, 6);
    s += g(T(1560, 260, 1 + 0.04 * Math.sin(t * 12), wob),
      circ(0, 0, 150, "#fff", `stroke="${C.slate}" stroke-width="16"`) +
      Array.from({ length: 12 }, (_, i) => line(Math.sin(rad(i * 30)) * 118, -Math.cos(rad(i * 30)) * 118, Math.sin(rad(i * 30)) * 132, -Math.cos(rad(i * 30)) * 132, C.slate, 8)).join("") +
      g(`rotate(${f(spin / 12)})`, line(0, 0, 0, -70, C.slateD, 14)) + g(`rotate(${f(spin)})`, line(0, 0, 0, -110, C.cyanD, 9)) + circ(0, 0, 14, C.slateD));
    for (let i = 0; i < 3; i++) {
      const a = rad(spin * 0.8 + i * 120);
      s += `<path d="M${f(1560 + Math.cos(a) * 180)} ${f(260 + Math.sin(a) * 180)} A180 180 0 0 1 ${f(1560 + Math.cos(a + 0.6) * 180)} ${f(260 + Math.sin(a + 0.6) * 180)}" fill="none" stroke="${C.cyan}" stroke-width="8" stroke-linecap="round" opacity=".6"/>`;
    }
    // Dana at her desk
    const shake = Math.sin(t * 28) * 3 * (t > 5 ? 1 : 0.4);
    const typing = t < 4.6;
    const armsType = typing ? { armL: [-40, 60 + Math.sin(t * 30) * 12], armR: [40, -60 - Math.cos(t * 30) * 12] } : { armL: [-150, 165], armR: [150, -165] };
    s += person({ x: 960 + shake, y: 830, s: 1.05, hairStyle: "bun", hair: "#4A2C1A", skin: SKIN[1], shirt: C.cyanD, expr: typing ? "worried" : "stressed", lookY: typing ? 1 : -0.3, headTilt: shake * 1.5, ...armsType, blink: (t % 3) < 0.12 ? 0.1 : 1 });
    // desk
    s += rect(520, 690, 880, 46, 16, C.slate) + rect(560, 736, 40, 200, 10, C.slateD) + rect(1320, 736, 40, 200, 10, C.slateD) + rect(560, 736, 800, 160, 0, "#475569");
    // laptop
    s += path("M900 690 L1020 690 L1010 650 L910 650Z", C.slateD) + rect(916, 654, 88, 30, 4, "#0EA5E9", 'opacity=".5"');
    // paper piles growing
    const grow = p(t, 0, 8);
    for (const [px, seed] of [[640, 1], [1280, 2], [760, 3]]) {
      const n = Math.floor(lerp(6, px === 760 ? 12 : 22, grow));
      for (let i = 0; i < n; i++) {
        const k = pop(t, i * 0.35 * (seed === 3 ? 1.6 : 1), 0.3);
        s += sheet(px + (rnd(seed * 50 + i) - 0.5) * 50 + Math.sin(t * 3 + i) * i * 0.6, 670 - i * 20 - (1 - k) * 200, (rnd(seed * 90 + i) - 0.5) * 24 + Math.sin(t * 2 + i) * i * 0.3, i + seed, 170, 60);
      }
    }
    // flying sheets
    for (let i = 0; i < 9; i++) {
      const st = 1.5 + i * 0.8, k = (t - st) / 2.4;
      if (k > 0 && k < 1) s += sheet(200 + rnd(i + 9) * 1500, -120 + k * 1250, k * 540 * (i % 2 ? 1 : -1), i, 110, 140);
    }
    // sweat and alarm marks
    if (t > 4.6) {
      for (let i = 0; i < 3; i++) {
        const k = ((t * 1.4 + i / 3) % 1);
        s += path(`M0 -18 Q14 4 0 14 Q-14 4 0 -18Z`, "#7DD3FC", `transform="translate(${f(1040 + i * 18 + k * 40)} ${f(560 + k * 70)}) scale(${f(1.1 - k * 0.4)})" opacity="${f(1 - k)}"`);
      }
      s += g(T(860, 470, pop(t, 5, 0.3)), text(0, 0, "!!", { size: 90, fill: C.red, weight: 900 }));
    }
    // employee pings
    const pings = [[5.8, 330, 610, "Did my run count??"], [6.6, 1560, 560, "Where's the leaderboard?"], [7.4, 420, 820, "I emailed a screenshot!"], [8.2, 1500, 830, "My steps are missing 😩"]];
    for (const [a, x, y, str] of pings) {
      const k = pop(t, a, 0.4);
      if (k > 0) s += g(T(x, y, k), bubble(0, 0, str.length * 22 + 70, 84, C.slateD, x < 960 ? 1 : -1) + text(0, 14, str, { size: 36, fill: "#fff" }), 1);
    }
    return s;
  }

  // ---------- scene 2: the fitness gap (10-20s) ----------
  function scene2(t) {
    const lt = t - 10;
    const split = 960 + Math.sin(lt * 1.5) * 6;
    let s = rect(0, 0, W, H, 0, C.slateD);
    // left: speed lines
    for (let i = 0; i < 14; i++) {
      const y = 200 + rnd(i + 70) * 700, len = 120 + rnd(i + 5) * 220, x = ((1 - ((lt * (1.4 + rnd(i) * 1.6)) % 1)) * 1300) - 300;
      s += line(x, y, x + len, y, i % 2 ? C.cyan : "#fff", 6, 'opacity=".35"');
    }
    s += text(480, 120, "THE 1% SUPER-ATHLETES", { size: 46, fill: C.cyan, ls: 3 });
    // floating leaderboard
    const lbK = pop(lt, 0.8, 0.6);
    s += g(T(250, 420 + Math.sin(lt * 2) * 10, lbK, -4),
      rect(-190, -170, 380, 340, 30, "#fff", 'filter="url(#soft)"') + text(0, -115, "🏆 LEADERBOARD", { size: 32, fill: C.slateD }) +
      [["1", "Alex", "412 km", C.gold], ["2", "Jordan", "388 km", "#CBD5E1"], ["3", "Casey", "365 km", "#F4A261"]].map(([n, nm, km, col], i) =>
        rect(-160, -80 + i * 78, 320, 64, 18, i === 0 ? "#FFF7DB" : C.paper) + circ(-124, -48 + i * 78, 22, col) + text(-124, -38 + i * 78, n, { size: 26, fill: C.slateD }) +
        text(-88, -36 + i * 78, nm, { size: 30, anchor: "start" }) + text(146, -36 + i * 78, km, { size: 28, anchor: "end", fill: C.cyanD })).join(""));
    // jetpack runner zooming in
    const enter = eo(p(lt, 0, 1.4));
    const rx = lerp(-300, 640, enter) + Math.sin(lt * 3) * 20, ry = 700 + Math.sin(lt * 5) * 18;
    const flame = 60 + Math.sin(lt * 40) * 18;
    const jet = rect(-84, -236, 40, 110, 18, C.slate) + rect(44, -236, 40, 110, 18, C.slate) + rect(-80, -246, 32, 16, 6, C.red) + rect(48, -246, 32, 16, 6, C.red) +
      path(`M-80 -126 L-48 -126 L-64 ${f(-126 + flame)}Z`, C.orange) + path(`M48 -126 L80 -126 L64 ${f(-126 + flame)}Z`, C.orange) +
      path(`M-74 -126 L-54 -126 L-64 ${f(-126 + flame * 0.6)}Z`, C.gold) + path(`M54 -126 L74 -126 L64 ${f(-126 + flame * 0.6)}Z`, C.gold);
    s += person({ x: rx, y: ry, s: 1.1, rot: 12, ...runPose(lt * 14), hairStyle: "spiky", hair: "#1F2937", skin: SKIN[2], shirt: C.red, pants: C.ink, shoe: C.mint, headband: C.cyan, expr: "grin", jetpack: jet, bib: "#1", lookX: 1 });
    for (let i = 0; i < 4; i++) s += line(rx - 180 - i * 40, ry - 300 + i * 70, rx - 330 - i * 40, ry - 300 + i * 70, "#fff", 6, 'opacity=".5"');
    // right side
    s += `<clipPath id="rightHalf"><rect x="${f(split)}" y="0" width="${f(W - split)}" height="${H}"/></clipPath>`;
    let r = rect(split, 0, W, H, 0, "#FFF8F0") + text(1440, 120, "EVERYONE ELSE", { size: 46, fill: C.slate, ls: 3 });
    // track
    r += path(`M${split} 760 Q1440 700 1920 760 L1920 1080 L${split} 1080Z`, "#F07A5A");
    for (let i = 0; i < 3; i++) r += `<path d="M${split} ${800 + i * 80} Q1440 ${740 + i * 80} 1920 ${800 + i * 80}" fill="none" stroke="#fff" stroke-width="6" opacity=".8"/>`;
    // slumped office worker
    const slump = Math.sin(lt * 2) * 3;
    r += shadow(1440, 775, 190, 0.18);
    r += person({ x: 1440, y: 880, s: 1.05, legL: [-80, -95], legR: [80, 95], armL: [-30 + slump, -20], armR: [30 - slump, 20], hairStyle: "short", hair: "#6B4226", skin: SKIN[0], shirt: "#DBEAFE", pants: "#475569", tie: C.blue, shoe: "#fff", expr: "tired", headTilt: 10 + slump, t: lt, lookY: 0.6 });
    // sweat drips + puddle
    for (let i = 0; i < 5; i++) {
      const k = ((lt * 0.9 + i / 5) % 1);
      r += path("M0 -16 Q12 4 0 12 Q-12 4 0 -16Z", "#38BDF8", `transform="translate(${f(1380 + i * 30)} ${f(560 + eio(k) * 210)})" opacity="${f(1 - k * 0.6)}"`);
    }
    r += `<ellipse cx="1470" cy="785" rx="${f(40 + lt * 6)}" ry="${f(10 + lt)}" fill="#7DD3FC" opacity=".6"/>`;
    // dizzy swirl
    r += g(T(1460, 430, 1, lt * 180), `<path d="M0 0 m-30 0 a30 30 0 1 0 60 0 a22 22 0 1 0 -44 0 a12 12 0 1 0 24 0" fill="none" stroke="${C.slateL}" stroke-width="6"/>`);
    // rank card
    const rk = pop(lt, 2.2, 0.5);
    r += g(T(1700, 380, rk, 5), rect(-150, -60, 300, 120, 26, "#fff", 'filter="url(#soft)"') + text(0, -8, "#147  You", { size: 38, fill: C.slateD }) + text(0, 38, "2.1 km  😓", { size: 32, fill: C.red }));
    // quit tag
    const qk = pop(lt, 5.8, 0.5);
    r += g(T(1210, 330, qk, -8), rect(-140, -46, 280, 92, 20, C.red) + text(0, 16, "WEEK 2: QUIT", { size: 38, fill: "#fff" }));
    s += `<g clip-path="url(#rightHalf)">${r}</g>`;
    // divider
    s += path(`M${f(split - 14)} 0 L${f(split + 14)} 0 L${f(split + 14)} ${H} L${f(split - 14)} ${H}Z`, "#fff");
    s += g(T(split, 540, 1 + 0.06 * Math.sin(lt * 6)), circ(0, 0, 64, C.cyan, `stroke="#fff" stroke-width="10"`) + text(0, 18, "VS", { size: 52, fill: C.ink, weight: 900 }));
    return s;
  }

  // ---------- scene 3: enter PaceVelo (20-35s) ----------
  function mascot(t, x, y, s, pose) {
    const h = 520, w = 290;
    const cape = path(`M-120 -${h - 90} Q${f(-260 + Math.sin(t * 5) * 20)} -140 ${f(-220 + Math.sin(t * 4) * 30)} 40 L${f(220 + Math.sin(t * 4 + 1) * 30)} 40 Q${f(260 + Math.sin(t * 5 + 1) * 20)} -140 120 -${h - 90}Z`, C.mintD);
    let b = cape;
    // legs + shoes
    for (const sx of [-1, 1]) {
      b += stroke(`M${sx * 60} -60 L${sx * 80} 60`, C.slateD, 34);
      b += g(T(sx * 92, 74), `<path d="M-50 10 Q-50 -34 -6 -34 L20 -34 Q56 -22 58 10Z" fill="${C.cyan}"/><rect x="-54" y="6" width="116" height="16" rx="8" fill="#fff"/><path d="M-22 -28 L-8 0 M0 -32 L14 -2" stroke="#fff" stroke-width="6" stroke-linecap="round"/><path d="M20 -34 L40 -8" stroke="${C.mint}" stroke-width="10" stroke-linecap="round"/>`);
    }
    // arms
    const armR = pose.raise ? `M${w / 2 - 6} -${h - 170} Q${w / 2 + 70} -${h - 90} ${w / 2 + 90} -${h + 30}` : `M${w / 2 - 6} -${h - 170} Q${w / 2 + 90} -${h - 250} ${w / 2 + 10} -${h - 320}`;
    const armL = `M-${w / 2 - 6} -${h - 170} Q-${w / 2 + 90} -${h - 250} -${w / 2 + 10} -${h - 320}`;
    b += stroke(armL, C.slateD, 30) + stroke(armR, C.slateD, 30);
    b += circ(-(w / 2 + 10), -(h - 320), 26, C.slateD);
    b += pose.raise ? circ(w / 2 + 90, -(h + 30), 30, C.slateD) + circ(w / 2 + 90, -(h + 30), 60, "url(#glowMint)") : circ(w / 2 + 10, -(h - 320), 26, C.slateD);
    // body
    b += rect(-w / 2 - 12, -h - 12, w + 24, h + 24, 70, C.slateD) + rect(-w / 2, -h, w, h, 58, C.ink);
    b += rect(-w / 2 + 16, -h + 16, w - 32, h - 32, 46, "url(#pvGradV)");
    b += rect(-40, -h + 28, 80, 18, 9, C.slateD);
    // face on screen
    const bl = (t % 3.3) < 0.12 ? 0.1 : 1;
    b += `<ellipse cx="-56" cy="-${h - 190}" rx="36" ry="${f(44 * bl)}" fill="#fff"/><ellipse cx="56" cy="-${h - 190}" rx="36" ry="${f(44 * bl)}" fill="#fff"/>`;
    if (bl > 0.5) b += circ(-50, -(h - 196), 18, C.ink) + circ(62, -(h - 196), 18, C.ink) + circ(-44, -(h - 204), 6, "#fff") + circ(68, -(h - 204), 6, "#fff");
    b += `<path d="M-60 -${h - 270} Q0 -${h - 350} 60 -${h - 270}Z" fill="${C.ink}"/><path d="M-30 -${h - 300} Q0 -${h - 330} 30 -${h - 300}" fill="${C.pink}"/>`;
    b += circ(-100, -(h - 250), 16, C.pink, 'opacity=".5"') + circ(100, -(h - 250), 16, C.pink, 'opacity=".5"');
    b += chevrons(0, -(h - 420), 0.28, 44).replace(/url\(#pvGrad\)/g, "#fff");
    return g(T(x, y, s), b);
  }

  function scene3(t) {
    const lt = t - 20;
    let s = rect(0, 0, W, H, 0, C.ink);
    // rotating rays
    let rays = "";
    for (let i = 0; i < 16; i++) {
      const a = rad(i * 22.5 + lt * 8);
      rays += path(`M0 0 L${f(Math.cos(a - 0.09) * 1600)} ${f(Math.sin(a - 0.09) * 1600)} L${f(Math.cos(a + 0.09) * 1600)} ${f(Math.sin(a + 0.09) * 1600)}Z`, i % 2 ? C.cyan : C.mint, 'opacity=".07"');
    }
    s += g(T(640, 560), rays);
    s += circ(640, 560, 520, "url(#glow)", `opacity="${f(0.35 * p(lt, 0.6, 1.2))}"`);
    // twinkling stars
    for (let i = 0; i < 40; i++) {
      const tw = 0.5 + 0.5 * Math.sin(lt * 3 + i);
      s += sparkle(rnd(i + 200) * W, rnd(i + 300) * 900, 6 + 12 * tw * rnd(i + 400), i % 3 ? "#fff" : C.cyan);
    }
    // lightning bolt
    const boltOn = lt > 0.75;
    if (boltOn) {
      const flick = lt < 1.6 ? (Math.sin(lt * 80) > -0.3 ? 1 : 0.4) : 0.85 + 0.15 * Math.sin(lt * 10);
      const bolt = path("M40 -420 L-120 20 L10 20 L-60 380 L160 -80 L30 -80 L120 -420Z", C.gold, 'filter="url(#neon)"');
      s += g(T(300, 420, 0.8, -10), bolt, flick) + g(T(830, 290, 0.55, 18), bolt, flick);
    }
    // mascot drop + land
    const drop = lt < 0.9 ? eio(p(lt, 0.1, 0.9)) : 1;
    const squash = lt > 0.9 && lt < 1.4 ? Math.sin(p(lt, 0.9, 1.4) * Math.PI) * 0.12 : 0;
    const my = lerp(-700, 880, drop);
    s += shadow(640, 890, 220 * drop, 0.35);
    s += g(`translate(640 ${f(my)}) scale(${f(1 + squash)} ${f(1 - squash)}) translate(-640 ${f(-my)})`, mascot(lt, 640, my - 20, 1.0, { raise: lt > 7.2 }));
    // dust puffs
    const dk = p(lt, 0.9, 1.7);
    if (dk > 0 && dk < 1) for (let i = 0; i < 6; i++) s += circ(640 + (i < 3 ? -1 : 1) * (160 + eo(dk) * 180 + (i % 3) * 40), 880 - (i % 3) * 20, 30 * (1 - dk) + 10, "#fff", `opacity="${f(0.7 * (1 - dk))}"`);
    // flash
    if (lt > 0.75 && lt < 1.3) s += rect(0, 0, W, H, 0, "#fff", `opacity="${f(1 - p(lt, 0.75, 1.3))}"`);
    // title
    const tk = pop(lt, 1.6, 0.7);
    s += g(T(1340, 330, tk), chevrons(-330, 0, 0.42, 52) + text(-250, 0, "PaceVelo", { size: 150, weight: 900, anchor: "start", fill: "url(#pvGrad)", extra: 'dominant-baseline="middle"' }));
    s += g(T(1340, 460), text(0, 0, "Corporate fitness challenges, made fun.", { size: 44, fill: "#E2E8F0", weight: 700 }), eo(p(lt, 2.3, 3)));
    // setup steps
    const steps = [["Pick a metric", "km · minutes · elevation"], ["Choose the sports", "Run · Walk · Ride"], ["Launch!", "Branded & live"]];
    steps.forEach(([a, b], i) => {
      const k = pop(lt, 7.8 + i * 1.5, 0.5);
      if (k <= 0) return;
      const done = lt > 8.6 + i * 1.5;
      s += g(T(1340, 590 + i * 120, k),
        rect(-330, -48, 660, 96, 48, C.slateD, `stroke="${done ? C.mint : C.slate}" stroke-width="4"`) +
        circ(-280, 0, 32, done ? C.mint : C.slate) + (done ? check(-280, 0, 1.3, C.ink) : text(-280, 12, String(i + 1), { size: 34, fill: "#fff" })) +
        text(-228, -6, a, { size: 38, fill: "#fff", anchor: "start" }) + text(-228, 30, b, { size: 26, fill: C.slateL, anchor: "start", weight: 700 }));
    });
    // stopwatch
    const sk = pop(lt, 7.6, 0.5);
    if (sk > 0) {
      const secs = Math.max(0, Math.round(299 - p(lt, 8, 13) * 12));
      s += g(T(1790, 700, sk), circ(0, 0, 86, "#fff") + rect(-16, -110, 32, 26, 6, "#fff") + circ(0, 0, 70, C.ink) +
        text(0, 14, `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}`, { size: 42, fill: C.mint, weight: 900 }) + text(0, 132, "< 5 MIN", { size: 30, fill: C.mint }));
    }
    s += confetti(lt, 60, 11, { x: 0, y: -60, w: W, h: H + 120 }, 1, clamp(lt - 1));
    return s;
  }

  // ---------- scene 4: 1-tap wearable sync (35-50s) ----------
  function scene4(t) {
    const lt = t - 35;
    let s = rect(0, 0, W, H, 0, C.sky) + rect(0, 860, W, 220, 0, "#CFF7FB");
    // soft decor
    s += circ(1700, 180, 120, "#fff", 'opacity=".7"') + circ(1780, 220, 90, "#fff", 'opacity=".7"') + circ(200, 150, 90, "#fff", 'opacity=".7"');
    // relaxed HR manager in background with coffee
    const sip = (lt % 4) > 2.6 && (lt % 4) < 3.4;
    const mug = rect(-18, -36, 36, 44, 8, "#fff", `stroke="${C.slate}" stroke-width="4"`) + `<path d="M18 -26 Q34 -22 18 -2" fill="none" stroke="${C.slate}" stroke-width="5"/>` +
      [0, 1, 2].map((i) => `<path d="M${-8 + i * 8} -44 q-8 -12 0 -24 t0 -24" fill="none" stroke="${C.slateL}" stroke-width="4" opacity="${f(0.3 + 0.4 * Math.abs(Math.sin(lt * 2 + i)))}" transform="translate(0 ${f(-((lt * 20 + i * 10) % 20))})"/>`).join("");
    s += rect(1545, 410, 190, 170, 50, C.mint, 'opacity=".9"') + rect(1520, 530, 240, 70, 30, C.mintD) + rect(1540, 596, 14, 40, 6, C.slate) + rect(1726, 596, 14, 40, 6, C.slate);
    s += person({ x: 1640, y: 640, s: 0.62, hairStyle: "bun", hair: "#4A2C1A", skin: SKIN[1], shirt: C.cyanD, expr: sip ? "sip" : "joy", armR: sip ? [150, -140] : [40, -110], armL: [-10, 20], holdR: mug, hideLegs: true });
    s += g(T(1640, 300, pop(lt, 9.5, 0.5)), bubble(0, 0, 330, 84, "#fff", -1) + text(0, 14, "Zero data entry ☕", { size: 34, fill: C.slateD }));
    // central phone with the app
    const pk = pop(lt, 0.1, 0.7);
    const connected = lt > 2.8;
    const feed = [["Priya", "Run", "5.2 km", C.cyanD, 4.6], ["Marcus", "Ride", "18.4 km", C.purple, 6.0], ["Lena", "Walk", "3.1 km", C.mintD, 7.4], ["Tom", "Run", "8.0 km", C.orange, 8.8], ["Aisha", "Walk", "6.5 km", C.pink, 10.2]];
    let scr = rect(0, 0, 330, 640, 0, "#fff") + rect(0, 0, 330, 120, 0, C.ink) + chevrons(64, 76, 0.13, 50) + text(96, 88, "PaceVelo", { size: 30, fill: "#fff", anchor: "start" });
    if (!connected) {
      const press = lt > 2.2 && lt < 2.8 ? 0.94 : 1;
      scr += text(165, 250, "Join Spring Stride", { size: 28, fill: C.slateD }) + text(165, 290, "Acme Corp challenge", { size: 22, fill: C.slateL, weight: 700 });
      scr += g(T(165, 380, press), rect(-130, -36, 260, 72, 36, C.strava) + text(0, 10, "Connect Strava", { size: 28, fill: "#fff" }));
      scr += circ(165, 380, 60 * p(lt, 2.2, 2.8) + 1, "#fff", `opacity="${f(0.5 * (1 - p(lt, 2.2, 2.8)))}"`);
    } else {
      scr += g(T(165, 170, pop(lt, 2.8, 0.4)), rect(-120, -28, 240, 56, 28, "#DCFCE7") + check(-86, 0, 1, C.mintD) + text(10, 10, "Connected", { size: 26, fill: C.mintD }));
      scr += text(24, 240, "LIVE ACTIVITY", { size: 20, fill: C.slateL, anchor: "start", ls: 2 });
      const shown = feed.filter((e) => lt > e[4]);
      shown.slice(-4).reverse().forEach((e, i) => {
        const k = eo(p(lt, e[4], e[4] + 0.4));
        scr += g(T(165 + (1 - k) * 330, 300 + i * 84 + (i === 0 ? 0 : 0)),
          rect(-146, -34, 292, 72, 18, C.paper) + circ(-110, 2, 22, e[3]) + text(-110, 11, e[0][0], { size: 24, fill: "#fff" }) +
          text(-78, -2, e[0], { size: 24, fill: C.slateD, anchor: "start" }) + text(-78, 24, e[1], { size: 18, fill: C.slateL, anchor: "start" }) + text(134, 10, e[2], { size: 24, fill: e[3], anchor: "end" }));
      });
    }
    s += g(T(960, 470 + (1 - pk) * 500, pk), circ(0, 0, 360, "url(#glow)", `opacity="${f(0.35 + 0.15 * Math.sin(lt * 3))}"`) + phone(0, 0, 1, scr, { id: 4, shadow: true }), 1);
    // employees tapping smartwatches
    const emps = [
      { x: 210, skin: SKIN[3], hair: "#111", hairStyle: "curly", shirt: C.purple, a: 3.8, key: "R", glasses: true },
      { x: 560, skin: SKIN[0], hair: "#C2410C", hairStyle: "long", shirt: C.orange, a: 5.2, key: "R" },
      { x: 1360, skin: SKIN[2], hair: "#1F2937", hairStyle: "short", shirt: C.mintD, a: 6.6, key: "L" },
      { x: 1710, skin: SKIN[4], hair: "#111", hairStyle: "bald", shirt: C.blue, a: 8.0, key: "L" },
    ];
    emps.forEach((e, i) => {
      const ek = eo(p(lt, 0.4 + i * 0.25, 1.2 + i * 0.25));
      const tapped = lt > e.a;
      const raise = eo(p(lt, e.a - 0.8, e.a - 0.3));
      const toward = e.key === "R" ? 1 : -1;
      const armUp = [toward * lerp(10, 120, raise), toward * lerp(4, 200, raise)];
      const tap = [-toward * lerp(10, 60, raise), -toward * lerp(5, 150, raise)];
      const bob = tapped ? Math.abs(Math.sin((lt - e.a) * 5)) * 12 * Math.max(0, 1 - (lt - e.a) / 2) : 0;
      const o = { x: e.x, y: 1010 + (1 - ek) * 500 - bob, s: 0.95, skin: e.skin, hair: e.hair, hairStyle: e.hairStyle, shirt: e.shirt, glasses: e.glasses, expr: tapped ? "grin" : "smile", watch: e.key, watchLit: tapped, lookX: toward * 0.8, lookY: -0.2 };
      if (e.key === "R") { o.armR = armUp; o.armL = tap; } else { o.armL = armUp; o.armR = tap; }
      s += shadow(e.x, 1012, 90, 0.1) + person(o);
      // beam from watch to phone
      if (tapped) {
        const wx = e.x + toward * 110, wy = 1010 - 0.95 * 330;
        const px = 960 - toward * 150, py = 520;
        const mx = (wx + px) / 2, my = Math.min(wy, py) - 180;
        const d = `M${f(wx)} ${f(wy)} Q${f(mx)} ${f(my)} ${f(px)} ${f(py)}`;
        const k = eo(p(lt, e.a, e.a + 0.6));
        s += `<path d="${d}" fill="none" stroke="${C.cyan}" stroke-width="10" stroke-linecap="round" stroke-dasharray="1400" stroke-dashoffset="${f(1400 * (1 - k))}" filter="url(#neon)" opacity=".9"/>`;
        s += `<path d="${d}" fill="none" stroke="#fff" stroke-width="4" stroke-dasharray="18 26" stroke-dashoffset="${f(-lt * 120)}" opacity="${f(k)}"/>`;
        // travelling pulse
        const u = ((lt - e.a) * 0.9) % 1;
        const qx = (1 - u) * (1 - u) * wx + 2 * (1 - u) * u * mx + u * u * px, qy = (1 - u) * (1 - u) * wy + 2 * (1 - u) * u * my + u * u * py;
        if (k >= 1) s += circ(qx, qy, 14, "#fff", 'filter="url(#neon)"');
        s += burst(wx, wy, lt, e.a, 10, C.cyan, 60);
      }
    });
    return s;
  }

  // ---------- scene 5: the fair-play engine (50-65s) ----------
  function bike(t, spin) {
    const wheel = (x) => circ(x, 0, 62, "none", `stroke="${C.slateD}" stroke-width="12"`) +
      g(`translate(${x} 0) rotate(${f(spin)})`, [0, 60, 120].map((a) => line(Math.cos(rad(a)) * 56, Math.sin(rad(a)) * 56, -Math.cos(rad(a)) * 56, -Math.sin(rad(a)) * 56, C.slateL, 4)).join(""));
    return wheel(-110) + wheel(110) +
      `<path d="M-110 0 L-30 -110 L80 -110 L110 0 M-30 -110 L0 0 L80 -110 M0 0 L-110 0" fill="none" stroke="${C.purple}" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/>` +
      line(-30, -110, -40, -140, C.slateD, 10) + rect(-70, -150, 60, 16, 8, C.slateD) + line(80, -110, 90, -160, C.slateD, 10) + line(80, -160, 110, -160, C.slateD, 10);
  }

  function scene5(t) {
    const lt = t - 50;
    let s = rect(0, 0, W, H, 0, "#F4FFF8") + rect(0, 900, W, 180, 0, "#DDF8E7");
    // leaderboard panel
    const lk = pop(lt, 0.4, 0.6);
    const swap = eio(p(lt, 9.5, 11));
    const teams = [
      { name: "Sales", icon: "💼", col: C.orange, v: lerp(0.62, 0.9, eo(p(lt, 6, 12))), pos: lerp(0, 1, swap) },
      { name: "Engineering", icon: "💻", col: C.purple, v: lerp(0.66, 0.95, eo(p(lt, 6, 12.5))), pos: lerp(1, 0, swap) },
      { name: "Marketing", icon: "📣", col: C.pink, v: lerp(0.4, 0.74, eo(p(lt, 6, 13))), pos: 2 },
      { name: "People Ops", icon: "🌱", col: C.mintD, v: lerp(0.3, 0.62, eo(p(lt, 6, 13))), pos: 3 },
    ];
    let lb = rect(-300, -290, 600, 580, 40, "#fff", 'filter="url(#soft)"') + text(-250, -220, "Team standings", { size: 38, fill: C.slateD, anchor: "start" }) +
      text(-250, -180, "Active minutes · fair-play scoring", { size: 24, fill: C.slateL, anchor: "start", weight: 700 }) + circ(236, -212, 10, C.red, `opacity="${f(0.5 + 0.5 * Math.sin(lt * 6))}"`) + text(222, -204, "LIVE", { size: 22, fill: C.red, anchor: "end" });
    teams.forEach((tm) => {
      const y = -110 + tm.pos * 108;
      lb += rect(-260, y - 40, 520, 84, 22, C.paper) + text(-222, y + 14, tm.icon, { size: 38 }) +
        text(-180, y - 4, tm.name, { size: 30, fill: C.slateD, anchor: "start" }) + rect(-180, y + 14, 380, 14, 7, "#E2E8F0") + rect(-180, y + 14, 380 * tm.v, 14, 7, tm.col) +
        text(236, y + 4, String(Math.round(tm.v * 1400)), { size: 28, fill: tm.col, anchor: "end" });
    });
    s += g(T(1500, 450, lk), lb);
    // balance scale
    const fair = eo(p(lt, 4.4, 5.6));
    const tiltRaw = 16 + Math.sin(lt * 2.5) * 1.5;
    const tilt = lt < 4.4 ? tiltRaw * eo(p(lt, 0.6, 1.6)) : tiltRaw * (1 - elastic(p(lt, 4.4, 6.4)));
    const px = 640, py = 300, arm = 330;
    const L = [px - Math.cos(rad(tilt)) * arm, py - Math.sin(rad(tilt)) * arm];
    const R = [px + Math.cos(rad(tilt)) * arm, py + Math.sin(rad(tilt)) * arm];
    s += path(`M${px - 130} 900 L${px + 130} 900 L${px + 40} 840 L${px - 40} 840Z`, C.slate) + rect(px - 18, py, 36, 560, 12, C.slate);
    s += g(`translate(${px} ${py}) rotate(${f(tilt)})`, rect(-arm - 20, -14, arm * 2 + 40, 28, 14, C.slateD)) + circ(px, py, 32, C.gold, `stroke="${C.goldD}" stroke-width="6"`);
    const hang = 250;
    for (const [q, who] of [[L, "walk"], [R, "ride"]]) {
      s += line(q[0], q[1], q[0] - 110, q[1] + hang, C.slateL, 5) + line(q[0], q[1], q[0] + 110, q[1] + hang, C.slateL, 5);
      const bx = q[0], by = q[1] + hang;
      const cheer = lt > 6.2;
      const tro = cheer ? g(T(0, 16, pop(lt, 6.4 + (who === "ride" ? 0.3 : 0), 0.5) * 0.9), trophy(1)) : "";
      if (who === "walk") {
        const ph = lt * 6;
        s += person({ x: bx, y: by, s: 0.55, skin: SKIN[2], hair: "#3F2A1D", hairStyle: "long", shirt: C.pink, pants: "#1E3A8A", expr: cheer ? "joy" : "smile",
          legL: [-6 + 14 * Math.sin(ph), 0 + 14 * Math.sin(ph)], legR: [6 - 14 * Math.sin(ph), -14 * Math.sin(ph)],
          armL: cheer ? [-20, -40] : [-15 - 20 * Math.sin(ph), -10], armR: cheer ? [160, 180] : [15 + 20 * Math.sin(ph), 10], holdR: tro, lookX: 0.6 });
      } else {
        s += g(T(bx, by - 62, 0.55), bike(lt, lt * 400));
        const ph = lt * 8;
        s += person({ x: bx - 6, y: by - 64, s: 0.55, skin: SKIN[0], hair: "#EAB308", hairStyle: "short", shirt: C.cyanD, pants: C.ink, shoe: C.mint, expr: cheer ? "joy" : "determined",
          legL: [40 + 20 * Math.sin(ph), -20 + 20 * Math.sin(ph)], legR: [40 - 20 * Math.sin(ph), -20 - 20 * Math.sin(ph)],
          armL: [60, 90], armR: cheer ? [160, 180] : [70, 100], holdR: tro, hat: path("M-70 -330 Q0 -420 70 -330Z", C.red), lookX: 0.5 });
      }
      s += path(`M${f(bx - 130)} ${f(by)} L${f(bx + 130)} ${f(by)} Q${f(bx)} ${f(by + 60)} ${f(bx - 130)} ${f(by)}Z`, C.slate);
      // metric tag
      const raw = who === "walk" ? ["6 km", "60 min"] : ["42 km", "60 min"];
      const val = lt < 4.4 ? raw[0] : raw[1];
      const tagK = lt < 4.4 ? pop(lt, 1.2, 0.4) : pop(lt, 4.6, 0.4);
      s += g(T(bx, by + 110, tagK), rect(-100, -34, 200, 68, 34, lt < 4.4 ? (who === "ride" ? C.red : C.slateL) : C.mintD) + text(0, 12, val, { size: 34, fill: "#fff" }));
    }
    // raw distance label vs fair-play gear
    if (lt < 4.6) s += g(T(px, 130, pop(lt, 1.4, 0.4)), rect(-210, -40, 420, 80, 40, C.red) + text(0, 14, "Raw distance? Unfair!", { size: 34, fill: "#fff" }), 1 - p(lt, 4.2, 4.6));
    const gk = pop(lt, 4.2, 0.6);
    if (gk > 0) {
      let gear = "";
      for (let i = 0; i < 10; i++) gear += g(`rotate(${i * 36})`, rect(-14, -84, 28, 30, 6, C.mintD));
      gear += circ(0, 0, 64, C.mintD) + circ(0, 0, 26, "#fff");
      s += g(T(px, 110, gk), g(`rotate(${f(lt * 120)})`, gear) + text(0, 150, "", {}));
      s += g(T(px, 230, gk), rect(-200, -34, 400, 68, 34, C.ink) + text(0, 12, "⚡ Fair-Play Engine", { size: 32, fill: C.mint }));
    }
    // badges
    const badges = [[7.0, 1300, 850, C.gold, "Consistency"], [7.4, 1500, 850, C.cyan, "Hill Climber"], [7.8, 1700, 850, C.mint, "Early Bird"]];
    for (const [a, x, y, col, lbl] of badges) {
      const k = pop(lt, a, 0.5);
      if (k > 0) s += medal(x, y + Math.sin(lt * 2 + x) * 8, 0.95 * k, col, lbl);
    }
    s += burst(px, 300, lt, 5.6, 16, C.gold, 120);
    if (lt > 6) s += confetti(lt - 6, 28, 51, { x: 200, y: -60, w: 900, h: 1100 }, 0.8, clamp(lt - 6));
    return s;
  }

  // ---------- scene 6: social hype (65-75s) ----------
  function scene6(t) {
    const lt = t - 65;
    let s = rect(0, 0, W, H, 0, "#FFF7ED") + rect(0, 880, W, 200, 0, "#FFEAD5");
    s += circ(960, 1100, 900, "url(#glowGold)", 'opacity=".35"');
    // slack-style notification card
    const nk = eo(p(lt, 1.2, 1.9));
    s += g(T(1540 + (1 - nk) * 800, 150),
      rect(-330, -90, 660, 180, 30, "#fff", 'filter="url(#soft)"') + rect(-300, -60, 70, 70, 18, C.ink) + chevrons(-265, -25, 0.13, 50) +
      text(-212, -38, "#wellness  ·  PaceVelo", { size: 26, fill: C.slateL, anchor: "start" }) +
      text(-212, 4, "🏆 Engineering just overtook Sales!", { size: 32, fill: C.slateD, anchor: "start" }) +
      text(-212, 50, "👏 42   🔥 18   🙌 27", { size: 30, fill: C.slate, anchor: "start" }));
    // second card
    const nk2 = eo(p(lt, 4.2, 4.9));
    s += g(T(380 - (1 - nk2) * 800, 150),
      rect(-320, -90, 640, 180, 30, "#fff", 'filter="url(#soft)"') + rect(-290, -60, 70, 70, 18, C.ink) + chevrons(-255, -25, 0.13, 50) +
      text(-202, -38, "#general  ·  PaceVelo", { size: 26, fill: C.slateL, anchor: "start" }) +
      text(-202, 4, "🎉 Priya hit 100 km this month!", { size: 32, fill: C.slateD, anchor: "start" }) +
      text(-202, 50, "❤️ 64   🚀 23", { size: 30, fill: C.slate, anchor: "start" }));
    // coworkers
    const hf1 = 2.3, hf2 = 3.6, hf3 = 6.2;
    const crew = [
      { x: 330, skin: SKIN[4], hair: "#111", hairStyle: "curly", shirt: C.purple },
      { x: 640, skin: SKIN[0], hair: "#C2410C", hairStyle: "long", shirt: C.orange },
      { x: 960, skin: SKIN[2], hair: "#1F2937", hairStyle: "spiky", shirt: C.cyanD },
      { x: 1280, skin: SKIN[1], hair: "#4A2C1A", hairStyle: "bun", shirt: C.mintD },
      { x: 1590, skin: SKIN[3], hair: "#111", hairStyle: "short", shirt: C.pink, glasses: true },
    ];
    const reach = (a) => eo(p(lt, a - 0.5, a)) * (1 - eo(p(lt, a + 0.4, a + 1)));
    crew.forEach((c, i) => {
      const jump = Math.max(0, Math.sin(lt * 5.5 + i * 1.3)) * 40 * p(lt, 0.5, 1.2);
      const o = { x: c.x, y: 960 - jump, s: 1.0, skin: c.skin, hair: c.hair, hairStyle: c.hairStyle, shirt: c.shirt, glasses: c.glasses, expr: jump > 20 ? "joy" : "grin",
        armL: [-150 + Math.sin(lt * 5 + i) * 15, -170], armR: [150 - Math.sin(lt * 5 + i) * 15, 170] };
      // high-five pairs: 0-1, 3-4, 1-2
      const pairs = [[0, 1, hf1], [3, 4, hf2], [1, 2, hf3], [2, 3, hf3 + 1.6]];
      for (const [a, b, at] of pairs) {
        const k = reach(at);
        if (i === a) o.armR = [lerp(o.armR[0], 140, k), lerp(o.armR[1], 150, k)];
        if (i === b) o.armL = [lerp(o.armL[0], -140, k), lerp(o.armL[1], -150, k)];
      }
      s += shadow(c.x, 965, 90 * (1 - jump / 120), 0.12) + person(o);
    });
    const hfFx = [[485, 700, hf1], [1435, 700, hf2], [800, 700, hf3], [1120, 700, hf3 + 1.6]];
    for (const [x, y, a] of hfFx) {
      s += burst(x, y, lt, a, 14, C.gold, 110);
      const k = pop(lt, a, 0.3) * (1 - p(lt, a + 0.6, a + 1));
      if (k > 0) s += g(T(x, y - 40, k), star(0, 0, 60, C.gold) + text(0, -80, "HIGH FIVE!", { size: 36, fill: C.goldD, weight: 900 }));
    }
    // rising chat bubbles
    const chats = [["Kudos! 👏", C.cyanD], ["Nice ride, Tom! 🚴", C.purple], ["+5 km for Sales 🔥", C.orange], ["Team Eng FTW 🙌", C.mintD], ["Lunch walk? 🚶", C.pink], ["New PB!! ⚡", C.blue]];
    chats.forEach(([str, col], i) => {
      const st = 0.4 + i * 1.3, k = (lt - st) / 5;
      if (k <= 0 || k >= 1) return;
      const x = 180 + ((i * 331) % 1560), y = 560 - k * 380;
      const w = str.length * 20 + 70;
      s += g(T(x + Math.sin(lt * 2 + i) * 20, y, pop(lt, st, 0.4)), bubble(0, 0, w, 76, col, i % 2 ? -1 : 1) + text(0, 12, str, { size: 32, fill: "#fff" }), 1 - p(k, 0.8, 1));
    });
    // floating kudos icons
    for (let i = 0; i < 10; i++) {
      const k = ((lt * 0.25 + rnd(i + 900)) % 1);
      s += g(T(100 + rnd(i + 910) * 1720, 900 - k * 800, 0.6 + rnd(i + 920) * 0.5), i % 2 ? star(0, 0, 26, C.gold) : `<path d="M0 12 C-30 -10 -18 -36 0 -20 C18 -36 30 -10 0 12Z" fill="${C.pink}"/>`, 1 - k);
    }
    return s;
  }

  // ---------- scene 7: grand finale & CTA (75-90s) ----------
  function landing(lt, compact) {
    const w = compact ? 330 : 1000, h = compact ? 640 : 620;
    let s = rect(0, 0, w, h, 0, "#0F172A");
    s += rect(0, 0, w, compact ? 100 : 70, 0, C.ink) + chevrons(compact ? 50 : 44, compact ? 60 : 35, compact ? 0.12 : 0.1, 50) + text(compact ? 80 : 72, compact ? 70 : 45, "PaceVelo", { size: compact ? 28 : 28, fill: "#fff", anchor: "start" });
    if (!compact) {
      s += ["Features", "Pricing", "Customers"].map((n, i) => text(640 + i * 120, 45, n, { size: 20, fill: C.slateL, weight: 700 })).join("");
      s += text(80, 190, "Move together.", { size: 64, fill: "#fff", anchor: "start", weight: 900 }) + text(80, 265, "Win together.", { size: 64, fill: "url(#pvGrad)", anchor: "start", weight: 900 });
      s += text(80, 320, "Running, walking & cycling challenges", { size: 26, fill: C.slateL, anchor: "start", weight: 700 }) + text(80, 354, "for your whole company, live in 5 minutes.", { size: 26, fill: C.slateL, anchor: "start", weight: 700 });
      const pulse = 1 + 0.04 * Math.sin(lt * 5);
      const pressed = lt > 8.2 && lt < 8.5 ? 0.94 : 1;
      s += g(T(260, 440, pulse * pressed), rect(-190, -60, 380, 120, 60, "url(#glow)", 'opacity=".6"') + rect(-180, -42, 360, 84, 42, "url(#pvGrad)") + text(0, 12, "Start your challenge →", { size: 30, fill: C.ink, weight: 900 }));
      // hero leaderboard illustration
      s += rect(600, 130, 340, 400, 28, "#1E293B");
      [["Engineering", 0.95, C.purple], ["Sales", 0.86, C.orange], ["Marketing", 0.7, C.pink], ["People Ops", 0.58, C.mintD]].forEach(([n, v, col], i) => {
        const k = eo(p(lt, 2 + i * 0.3, 3.4 + i * 0.3));
        s += text(630, 200 + i * 86, n, { size: 22, fill: "#fff", anchor: "start" }) + rect(630, 214 + i * 86, 280, 16, 8, "#334155") + rect(630, 214 + i * 86, 280 * v * k, 16, 8, col);
      });
    } else {
      s += text(165, 170, "Spring Stride", { size: 30, fill: "#fff" }) + text(165, 204, "12 days left", { size: 20, fill: C.slateL, weight: 700 });
      [["Priya", "142 km", C.gold], ["Marcus", "131 km", "#CBD5E1"], ["Lena", "118 km", "#F4A261"], ["Tom", "104 km", C.slate]].forEach(([n, km, col], i) => {
        const k = eo(p(lt, 3 + i * 0.3, 3.6 + i * 0.3));
        s += g(T(165 + (1 - k) * 300, 270 + i * 86), rect(-140, -34, 280, 70, 20, "#1E293B") + circ(-104, 1, 22, col) + text(-104, 10, String(i + 1), { size: 22, fill: C.ink }) + text(-70, 10, n, { size: 24, fill: "#fff", anchor: "start" }) + text(124, 10, km, { size: 22, fill: C.mint, anchor: "end" }));
      });
      s += rect(35, 590 - 30, 260, 56, 28, "url(#pvGrad)") + text(165, 598, "Join challenge", { size: 22, fill: C.ink });
    }
    return s;
  }

  function scene7(t) {
    const lt = t - 75;
    let s = rect(0, 0, W, H, 0, C.ink);
    for (let i = 0; i < 30; i++) s += sparkle(rnd(i + 700) * W, rnd(i + 800) * H, 4 + 8 * (0.5 + 0.5 * Math.sin(lt * 3 + i)), i % 2 ? C.cyan : C.mint);
    s += circ(820, 520, 700, "url(#glow)", 'opacity=".22"');
    // laptop
    const lk = eo(p(lt, 0.1, 1.2));
    const finale = eio(p(lt, 10, 11.2));
    let lap = rect(-540, -350, 1080, 680, 36, "#334155") + rect(-520, -330, 1040, 640, 24, "#000");
    lap += `<svg x="-500" y="-310" width="1000" height="620" viewBox="0 0 1000 620">${landing(lt, false)}</svg>`;
    lap += path("M-620 330 L620 330 L660 380 Q660 400 640 400 L-640 400 Q-660 400 -660 380Z", "#94A3B8") + rect(-100, 330, 200, 16, 8, "#64748B");
    s += g(T(800, 480 + (1 - lk) * 700, 0.95 * (1 - finale * 0.25)), lap, 1 - finale);
    // phone
    const pk = eo(p(lt, 1.0, 2.0));
    s += g(T(1560 + (1 - pk) * 700, 540), phone(0, 0, 0.95, landing(lt, true), { id: 7, screenBg: "#0F172A" }), 1 - finale);
    // cursor clicking CTA
    const ck = eio(p(lt, 6.4, 8.2));
    const cx = lerp(1300, 800 - 500 * 0.95 + 260 * 0.95 + 60, ck), cy = lerp(900, 480 - 310 * 0.95 + 440 * 0.95 + 20, ck);
    if (lt > 6 && lt < 10.2) {
      s += g(T(cx, cy, lt > 8.2 && lt < 8.5 ? 0.85 : 1), path("M0 0 L0 64 L16 50 L28 76 L40 70 L28 45 L50 45Z", "#fff", `stroke="${C.ink}" stroke-width="4" stroke-linejoin="round"`), 1 - p(lt, 9.8, 10.2));
      s += burst(cx, cy, lt, 8.25, 16, C.mint, 140);
    }
    // confetti rain after click
    s += confetti(lt, 50, 91, { x: 0, y: -60, w: W, h: H + 120 }, 1, 0.6 * p(lt, 0.5, 1.5));
    if (lt > 8.2) s += confetti(lt - 8.2, 90, 131, { x: 0, y: -60, w: W, h: H + 120 }, 1.4, clamp((lt - 8.2) * 3));
    // end card
    if (finale > 0) {
      const ek = pop(lt, 10.4, 0.8);
      s += g(T(960, 400, ek), chevrons(-450, 0, 0.55, 52) + text(-350, 0, "PaceVelo", { size: 190, weight: 900, anchor: "start", fill: "url(#pvGrad)", extra: 'dominant-baseline="middle"' }));
      s += g(T(960, 580), text(0, 0, "Move together. Win together.", { size: 64, fill: "#fff", weight: 900 }), eo(p(lt, 11.2, 12)));
      s += g(T(960, 740, pop(lt, 12, 0.6)), rect(-360, -70, 720, 140, 70, "url(#glow)", 'opacity=".5"') + rect(-340, -56, 680, 112, 56, "url(#pvGrad)") + text(0, 16, "Launch your first challenge today", { size: 40, fill: C.ink, weight: 900 }));
      s += g(T(960, 880), text(0, 0, "Strava sync  ·  Team leaderboards  ·  Slack shout-outs", { size: 34, fill: C.slateL, weight: 700 }), eo(p(lt, 12.8, 13.5)));
    }
    return s;
  }

  // ---------- timeline ----------
  const SCENES = [[0, 10, scene1, false], [10, 20, scene2, true], [20, 35, scene3, true], [35, 50, scene4, false], [50, 65, scene5, false], [65, 75, scene6, false], [75, 90, scene7, true]];

  function wipe(t) {
    let s = "";
    for (const [b] of SCENES.slice(1)) {
      const k = p(t, b - 0.45, b + 0.45);
      if (k <= 0 || k >= 1) continue;
      for (const [off, col] of [[0, C.cyan], [0.12, C.mint]]) {
        const x = lerp(-2600, 2600, eio(clamp(k - off + 0.06)));
        s += path(`M${f(x - 1300)} 0 L${f(x + 1100)} 0 L${f(x + 1300)} ${H} L${f(x - 1100)} ${H}Z`, col);
      }
      s += chevrons(lerp(-400, 2300, eio(k)), 540, 0.5, 52).replace(/url\(#pvGrad\)/g, C.ink);
    }
    return s;
  }

  function frame(t) {
    t = clamp(t, 0, DURATION - 1e-6);
    const sc = SCENES.find(([a, b]) => t >= a && t < b) || SCENES[SCENES.length - 1];
    let body = sc[2](t);
    body += caption(t, sc[3]);
    if (t > 20.5 && t < 65) body += g(T(1830, 70, 1), rect(-66, -36, 132, 72, 22, "rgba(11,18,32,.75)") + chevrons(0, 0, 0.17, 50), 0.9);
    body += wipe(t);
    if (t < 0.4) body += rect(0, 0, W, H, 0, "#fff", `opacity="${f(1 - t / 0.4)}"`);
    if (t > 89) body += rect(0, 0, W, H, 0, C.ink, `opacity="${f(p(t, 89, 90))}"`);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="100%" height="100%" font-family="${FONT}">${defs}${body}</svg>`;
  }

  const api = { frame, DURATION, W, H, SCENES: SCENES.map(([a, b]) => [a, b]) };
  if (typeof window !== "undefined") window.PV = api;
  if (typeof module !== "undefined") module.exports = api;
})();
