// Math Docs — geometria dynamiczna: konstrukcje zależne od punktów (przeciągnij punkt — wszystko się przelicza).
(() => {
'use strict';
const MD = window.MD, { $, $$ } = MD;
const cv = $('#geoCanvas'), wrap = $('#geoWrap'), listEl = $('#geoList'), toolsEl = $('#geoTools'), barEl = $('#geoBar'), hintEl = $('#geoHint'), side = $('#geoSide');
const TOOLS = [
  { id: 'move', ic: 'move', n: 'Przesuń' }, { id: 'point', ic: 'point', n: 'Punkt' }, { id: 'seg', ic: 'segment', n: 'Odcinek' }, { id: 'line', ic: 'line', n: 'Prosta' },
  { id: 'ray', ic: 'ray', n: 'Półprosta' }, { id: 'circ', ic: 'circle', n: 'Okrąg' }, { id: 'circ3', ic: 'circle3', n: 'Okrąg 3 pkt' }, { id: 'poly', ic: 'polygon', n: 'Wielokąt' },
  { id: 'mid', ic: 'mid', n: 'Środek' }, { id: 'perp', ic: 'perp', n: 'Prostopadła' }, { id: 'par', ic: 'par', n: 'Równoległa' }, { id: 'bis', ic: 'bisect', n: 'Dwusieczna' },
  { id: 'int', ic: 'inter', n: 'Przecięcie' }, { id: 'ang', ic: 'angle', n: 'Kąt' }, { id: 'refl', ic: 'reflect', n: 'Odbicie' }, { id: 'del', ic: 'eraser', n: 'Usuń' }
];
const NEED = { seg: ['P', 'P'], line: ['P', 'P'], ray: ['P', 'P'], circ: ['P', 'P'], circ3: ['P', 'P', 'P'], mid: ['P', 'P'], perp: ['P', 'L'], par: ['P', 'L'], bis: ['P', 'P', 'P'], ang: ['P', 'P', 'P'], refl: ['P', 'L'], int: ['LC', 'LC'], poly: [] };
const HINT = {
  move: 'Przeciągaj punkty i obiekty — konstrukcja przelicza się na bieżąco. Puste tło przesuwa widok.',
  point: 'Kliknij w puste miejsce (punkt), albo na obiekt (punkt na obiekcie).',
  seg: 'Wskaż dwa punkty.', line: 'Wskaż dwa punkty.', ray: 'Wskaż początek i punkt kierunku.', circ: 'Wskaż środek, potem punkt na okręgu.', circ3: 'Wskaż trzy punkty okręgu.',
  poly: 'Klikaj wierzchołki; kliknij pierwszy punkt, aby zamknąć (min. 3).', mid: 'Wskaż dwa punkty.', perp: 'Wskaż punkt i prostą (odcinek).', par: 'Wskaż punkt i prostą (odcinek).',
  bis: 'Wskaż trzy punkty: ramię, wierzchołek, ramię.', int: 'Wskaż dwa obiekty (proste, odcinki, okręgi).', ang: 'Wskaż trzy punkty: ramię, wierzchołek, ramię.', refl: 'Wskaż punkt i oś symetrii.', del: 'Kliknij obiekt, aby go usunąć (razem z zależnymi).'
};
const LINE_T = new Set(['seg', 'line', 'ray', 'perp', 'par', 'bis']), PT_T = new Set(['P', 'mid', 'int', 'on', 'refl']), CI_T = new Set(['circ', 'circ3']);
const COL = { pt: '#14A3A8', line: '#E0457B', circ: '#7048E8', poly: '#0A6A6E', ang: '#0C8599', sel: '#F08C00' };
let tool = 'move', pend = [], W = 800, H = 600, dirty = false, drag = null, hist = [], fut = [], R = new Map(), selId = null, moved = 0, hoverP = null;
const ptrs = new Map();
let pinch = null;

const GS = () => MD.S.geo;
function defaults() {
  const g = { objs: [], view: { cx: 0, cy: 0.5, sc: 42 }, snap: true, measure: true, n: 1 };
  const mk = (t, o) => Object.assign({ id: g.n++, t }, o);
  const a = mk('P', { x: -4, y: -2, name: 'A' }), b = mk('P', { x: 3, y: -2, name: 'B' }), c = mk('P', { x: -0.5, y: 3, name: 'C' });
  g.objs.push(a, b, c, mk('poly', { pts: [a.id, b.id, c.id], name: 'T' }));
  return g;
}
function ensure() { if (!GS() || !Array.isArray(GS().objs)) MD.S.geo = defaults(); }
const byId = id => GS().objs.find(o => o.id === id);
const num = (v, d = 2) => { if (!Number.isFinite(v)) return '—'; let s = String(parseFloat(v.toFixed(d))); if (s === '-0') s = '0'; return MD.lang() === 'pl' ? s.replace('.', ',') : s; };

/* ---------- historia ---------- */
const snap = () => JSON.stringify({ objs: GS().objs, n: GS().n });
function pushHist() { hist.push(snap()); if (hist.length > 100) hist.shift(); fut = []; }
function undo() { if (!hist.length) return; fut.push(snap()); const s = JSON.parse(hist.pop()); GS().objs = s.objs; GS().n = s.n; selId = null; pend = []; afterChange(); }
function redo() { if (!fut.length) return; hist.push(snap()); const s = JSON.parse(fut.pop()); GS().objs = s.objs; GS().n = s.n; selId = null; pend = []; afterChange(); }
function afterChange() { buildList(); redraw(); MD.save(); status(); }

/* ---------- geometria ---------- */
const refsOf = o => { switch (o.t) { case 'seg': case 'line': case 'ray': case 'mid': return [o.a, o.b]; case 'circ': return [o.c, o.p]; case 'circ3': case 'bis': case 'ang': return [o.a, o.b, o.c]; case 'perp': case 'par': case 'refl': return [o.p, o.l]; case 'int': return [o.a, o.b]; case 'on': return [o.o]; case 'poly': return o.pts; default: return []; } };
function res(id) {
  if (R.has(id)) return R.get(id);
  R.set(id, null); const o = byId(id); let v = null;
  if (o) { try { v = calc(o); } catch (e) { v = null; } }
  R.set(id, v); return v;
}
const NaNpt = { k: 'pt', x: NaN, y: NaN };
const okp = p => p && Number.isFinite(p.x) && Number.isFinite(p.y);
function lineDir(L) { return [L.q[0] - L.p[0], L.q[1] - L.p[1]]; }
function calc(o) {
  const P = id => res(id);
  switch (o.t) {
    case 'P': return { k: 'pt', x: o.x, y: o.y };
    case 'mid': { const a = P(o.a), b = P(o.b); return okp(a) && okp(b) ? { k: 'pt', x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : NaNpt; }
    case 'seg': case 'line': case 'ray': { const a = P(o.a), b = P(o.b); return okp(a) && okp(b) ? { k: o.t, p: [a.x, a.y], q: [b.x, b.y] } : null; }
    case 'circ': { const c = P(o.c), p = P(o.p); return okp(c) && okp(p) ? { k: 'circ', x: c.x, y: c.y, r: Math.hypot(p.x - c.x, p.y - c.y) } : null; }
    case 'circ3': {
      const a = P(o.a), b = P(o.b), c = P(o.c); if (!okp(a) || !okp(b) || !okp(c)) return null;
      const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y)); if (Math.abs(d) < 1e-9) return null;
      const ux = ((a.x ** 2 + a.y ** 2) * (b.y - c.y) + (b.x ** 2 + b.y ** 2) * (c.y - a.y) + (c.x ** 2 + c.y ** 2) * (a.y - b.y)) / d;
      const uy = ((a.x ** 2 + a.y ** 2) * (c.x - b.x) + (b.x ** 2 + b.y ** 2) * (a.x - c.x) + (c.x ** 2 + c.y ** 2) * (b.x - a.x)) / d;
      return { k: 'circ', x: ux, y: uy, r: Math.hypot(a.x - ux, a.y - uy) };
    }
    case 'perp': case 'par': {
      const p = P(o.p), L = P(o.l); if (!okp(p) || !L || L.k === 'circ' || L.k === 'pt') return null;
      const d = lineDir(L); return { k: 'line', p: [p.x, p.y], q: o.t === 'par' ? [p.x + d[0], p.y + d[1]] : [p.x - d[1], p.y + d[0]] };
    }
    case 'bis': {
      const a = P(o.a), b = P(o.b), c = P(o.c); if (!okp(a) || !okp(b) || !okp(c)) return null;
      let u = [a.x - b.x, a.y - b.y], v = [c.x - b.x, c.y - b.y]; const lu = Math.hypot(...u), lv = Math.hypot(...v); if (!lu || !lv) return null;
      u = [u[0] / lu, u[1] / lu]; v = [v[0] / lv, v[1] / lv]; let d = [u[0] + v[0], u[1] + v[1]]; if (Math.hypot(...d) < 1e-9) d = [-u[1], u[0]];
      return { k: 'ray', p: [b.x, b.y], q: [b.x + d[0], b.y + d[1]] };
    }
    case 'refl': {
      const p = P(o.p), L = P(o.l); if (!okp(p) || !L || L.k === 'circ' || L.k === 'pt') return NaNpt;
      const d = lineDir(L), dd = d[0] * d[0] + d[1] * d[1]; if (!dd) return NaNpt;
      const t = ((p.x - L.p[0]) * d[0] + (p.y - L.p[1]) * d[1]) / dd, fx = L.p[0] + t * d[0], fy = L.p[1] + t * d[1];
      return { k: 'pt', x: 2 * fx - p.x, y: 2 * fy - p.y };
    }
    case 'on': {
      const t = P(o.o); if (!t) return NaNpt;
      if (t.k === 'circ') return { k: 'pt', x: t.x + t.r * Math.cos(o.u), y: t.y + t.r * Math.sin(o.u) };
      if (t.p) { const d = lineDir(t); return { k: 'pt', x: t.p[0] + o.u * d[0], y: t.p[1] + o.u * d[1] }; }
      return NaNpt;
    }
    case 'int': { const a = P(o.a), b = P(o.b); return intersect(a, b, o.k || 0) || NaNpt; }
    case 'poly': { const pts = o.pts.map(P); return pts.every(okp) ? { k: 'poly', pts: pts.map(p => [p.x, p.y]) } : null; }
    case 'ang': {
      const a = P(o.a), b = P(o.b), c = P(o.c); if (!okp(a) || !okp(b) || !okp(c)) return null;
      const u = [a.x - b.x, a.y - b.y], v = [c.x - b.x, c.y - b.y], lu = Math.hypot(...u), lv = Math.hypot(...v); if (!lu || !lv) return null;
      const cs = MD.clamp((u[0] * v[0] + u[1] * v[1]) / (lu * lv), -1, 1);
      return { k: 'ang', b: [b.x, b.y], a1: Math.atan2(u[1], u[0]), a2: Math.atan2(v[1], v[0]), val: Math.acos(cs) * 180 / Math.PI };
    }
  }
  return null;
}
const inRange = (k, t) => k === 'line' || (k === 'seg' ? t >= -1e-9 && t <= 1 + 1e-9 : k === 'ray' ? t >= -1e-9 : true);
function intersect(A, B, k) {
  if (!A || !B) return null;
  const isL = v => v.p, isC = v => v.k === 'circ';
  if (isL(A) && isL(B)) {
    const d1 = lineDir(A), d2 = lineDir(B), den = d1[0] * d2[1] - d1[1] * d2[0]; if (Math.abs(den) < 1e-12) return null;
    const dx = B.p[0] - A.p[0], dy = B.p[1] - A.p[1], t = (dx * d2[1] - dy * d2[0]) / den, s = (dx * d1[1] - dy * d1[0]) / den;
    if (!inRange(A.k, t) || !inRange(B.k, s)) return null;
    return { k: 'pt', x: A.p[0] + t * d1[0], y: A.p[1] + t * d1[1] };
  }
  if (isC(A) && isL(B)) [A, B] = [B, A];
  if (isL(A) && isC(B)) {
    const d = lineDir(A), fx = A.p[0] - B.x, fy = A.p[1] - B.y, a = d[0] ** 2 + d[1] ** 2, b = 2 * (fx * d[0] + fy * d[1]), c = fx * fx + fy * fy - B.r * B.r, disc = b * b - 4 * a * c;
    if (disc < 0 || !a) return null; const sq = Math.sqrt(disc), ts = [(-b - sq) / (2 * a), (-b + sq) / (2 * a)];
    const hits = ts.map(t => ({ t, ok: inRange(A.k, t) }));
    // kolejność stała względem kierunku prostej: k=0 mniejsze t
    const h = hits[k]; if (!h || !h.ok) return null; return { k: 'pt', x: A.p[0] + h.t * d[0], y: A.p[1] + h.t * d[1] };
  }
  if (isC(A) && isC(B)) {
    const dx = B.x - A.x, dy = B.y - A.y, d = Math.hypot(dx, dy); if (d < 1e-12 || d > A.r + B.r || d < Math.abs(A.r - B.r)) return null;
    const a = (A.r * A.r - B.r * B.r + d * d) / (2 * d), h = Math.sqrt(Math.max(0, A.r * A.r - a * a)), mx = A.x + a * dx / d, my = A.y + a * dy / d, s = k ? 1 : -1;
    return { k: 'pt', x: mx + s * h * dy / d, y: my - s * h * dx / d };
  }
  return null;
}

/* ---------- widok ---------- */
const V = () => GS().view;
const X = x => W / 2 + (x - V().cx) * V().sc, Y = y => H / 2 - (y - V().cy) * V().sc;
const wx = px => (px - W / 2) / V().sc + V().cx, wy = py => -(py - H / 2) / V().sc + V().cy;
function redraw() { if (!dirty) { dirty = true; requestAnimationFrame(draw); setTimeout(() => { if (dirty) draw(); }, 80); } }
const snapStep = () => MD.nice(40 / V().sc);

function nameFor(upper) {
  const used = new Set(GS().objs.map(o => o.name)), L = upper ? 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' : 'abcdefghijklmnopqrstuvwxyz';
  for (let r = 0; r < 20; r++) for (const ch of L) { const s = r ? ch + r : ch; if (!used.has(s)) return s; }
  return '?';
}
function add(o) { o.id = GS().n++; o.name = o.name || nameFor(PT_T.has(o.t)); GS().objs.push(o); return o; }

/* ---------- rysowanie ---------- */
function draw() {
  dirty = false;
  if (!$('#v-geo').classList.contains('on')) return;
  R = new Map();
  const f = MD.fitCanvas(cv), g = f.g; W = f.w; H = f.h;
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
  const sc = V().sc, x0 = wx(0), x1 = wx(W), y1 = wy(0), y0 = wy(H), major = MD.nice(80 / sc), minor = major / 5;
  g.lineWidth = 1;
  if (minor * sc >= 11) { g.strokeStyle = '#E3F2F1'; g.beginPath(); for (let v = Math.ceil(x0 / minor) * minor; v <= x1; v += minor) { const px = Math.round(X(v)) + .5; g.moveTo(px, 0); g.lineTo(px, H); } for (let v = Math.ceil(y0 / minor) * minor; v <= y1; v += minor) { const py = Math.round(Y(v)) + .5; g.moveTo(0, py); g.lineTo(W, py); } g.stroke(); }
  g.strokeStyle = '#D2EBEA'; g.beginPath();
  for (let v = Math.ceil(x0 / major) * major; v <= x1; v += major) { const px = Math.round(X(v)) + .5; g.moveTo(px, 0); g.lineTo(px, H); }
  for (let v = Math.ceil(y0 / major) * major; v <= y1; v += major) { const py = Math.round(Y(v)) + .5; g.moveTo(0, py); g.lineTo(W, py); }
  g.stroke();
  const objs = GS().objs, order = ['poly', 'circ', 'circ3', 'line', 'ray', 'seg', 'perp', 'par', 'bis', 'ang'];
  const rank = o => { const i = order.indexOf(o.t); return i < 0 ? 99 : i; };
  [...objs].sort((a, b) => rank(a) - rank(b)).forEach(o => { const r = res(o.id); if (r && r.k !== 'pt') drawObj(g, o, r); });
  objs.forEach(o => { const r = res(o.id); if (r && r.k === 'pt' && okp(r)) drawPt(g, o, r); });
  // podgląd w trakcie konstrukcji
  if (pend.length && hoverP) {
    const last = res(pend[pend.length - 1].id);
    if (last && okp(last) && (tool === 'seg' || tool === 'line' || tool === 'ray' || tool === 'circ' || tool === 'poly' || tool === 'mid')) {
      g.setLineDash([6, 5]); g.strokeStyle = '#6B8F8E'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(X(last.x), Y(last.y)); g.lineTo(hoverP[0], hoverP[1]); g.stroke(); g.setLineDash([]);
    }
  }
}
function lbl(g, t, px, py, col, off = 12) {
  g.font = '600 12.5px Inter,sans-serif'; g.textAlign = 'left'; g.textBaseline = 'alphabetic';
  g.lineWidth = 3.5; g.strokeStyle = 'rgba(255,255,255,.92)'; g.strokeText(t, px + off, py - off * .6); g.fillStyle = col || '#10282A'; g.fillText(t, px + off, py - off * .6);
}
function drawObj(g, o, r) {
  const sel = o.id === selId, meas = GS().measure;
  g.lineJoin = 'round'; g.lineCap = 'round';
  if (r.k === 'poly') {
    g.beginPath(); r.pts.forEach(([x, y], i) => i ? g.lineTo(X(x), Y(y)) : g.moveTo(X(x), Y(y))); g.closePath();
    g.fillStyle = sel ? 'rgba(20,163,168,.22)' : 'rgba(20,163,168,.12)'; g.fill(); g.strokeStyle = sel ? COL.sel : COL.poly; g.lineWidth = sel ? 3 : 2.2; g.stroke();
    if (meas) { const c = centroid(r.pts); lbl(g, `${MD.tr('P')} = ${num(polyArea(r.pts))}`, X(c[0]) - 24, Y(c[1]), COL.poly, 0); }
    return;
  }
  if (r.k === 'circ') {
    g.strokeStyle = sel ? COL.sel : COL.circ; g.lineWidth = sel ? 3.2 : 2.2; g.beginPath(); g.arc(X(r.x), Y(r.y), Math.max(0.01, r.r * V().sc), 0, 6.2832); g.stroke(); return;
  }
  if (r.k === 'ang') {
    const d = ((r.a2 - r.a1 + 3 * Math.PI) % (2 * Math.PI)) - Math.PI, rad = 26;
    g.strokeStyle = sel ? COL.sel : COL.ang; g.lineWidth = 2.2; g.beginPath(); g.arc(X(r.b[0]), Y(r.b[1]), rad, -r.a1, -(r.a1 + d), d > 0); g.stroke();
    g.fillStyle = 'rgba(96,66,166,.14)'; g.beginPath(); g.moveTo(X(r.b[0]), Y(r.b[1])); g.arc(X(r.b[0]), Y(r.b[1]), rad, -r.a1, -(r.a1 + d), d > 0); g.closePath(); g.fill();
    const mid = r.a1 + d / 2; lbl(g, `${num(r.val, 1)}°`, X(r.b[0]) + Math.cos(mid) * (rad + 6), Y(r.b[1]) - Math.sin(mid) * (rad + 6), COL.ang, 2);
    return;
  }
  // linie
  const p = [X(r.p[0]), Y(r.p[1])], q = [X(r.q[0]), Y(r.q[1])];
  let a = p, b = q;
  const dx = q[0] - p[0], dy = q[1] - p[1], L = Math.hypot(dx, dy) || 1, ext = (W + H) * 3;
  if (r.k === 'line') { a = [p[0] - dx / L * ext, p[1] - dy / L * ext]; b = [p[0] + dx / L * ext, p[1] + dy / L * ext]; }
  else if (r.k === 'ray') b = [p[0] + dx / L * ext, p[1] + dy / L * ext];
  g.strokeStyle = sel ? COL.sel : (r.k === 'seg' ? '#10282A' : COL.line); g.lineWidth = sel ? 3.2 : (r.k === 'seg' ? 2.4 : 2); g.beginPath(); g.moveTo(a[0], a[1]); g.lineTo(b[0], b[1]); g.stroke();
  if (r.k === 'seg' && meas) { const len = Math.hypot(r.q[0] - r.p[0], r.q[1] - r.p[1]); lbl(g, num(len), (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, '#2F5251', 6); }
}
function drawPt(g, o, r) {
  const px = X(r.x), py = Y(r.y), free = o.t === 'P' || o.t === 'on', sel = o.id === selId, inP = pend.some(q => q.id === o.id);
  g.beginPath(); g.arc(px, py, sel || inP ? 7.5 : 6, 0, 6.2832);
  g.fillStyle = free ? COL.pt : '#6B8F8E'; g.fill(); g.lineWidth = 2; g.strokeStyle = sel || inP ? COL.sel : '#fff'; g.stroke();
  lbl(g, o.name, px, py, '#10282A', 9);
}
const polyArea = pts => { let s = 0; for (let i = 0; i < pts.length; i++) { const a = pts[i], b = pts[(i + 1) % pts.length]; s += a[0] * b[1] - b[0] * a[1]; } return Math.abs(s) / 2; };
const polyPer = pts => pts.reduce((s, a, i) => s + Math.hypot(a[0] - pts[(i + 1) % pts.length][0], a[1] - pts[(i + 1) % pts.length][1]), 0);
const centroid = pts => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];

/* ---------- wybór obiektów ---------- */
function hit(px, py, touch, polyOk = true) {
  const tol = touch ? 16 : 10, objs = GS().objs;
  // punkty najpierw
  let best = null;
  for (const o of objs) { const r = res(o.id); if (r && r.k === 'pt' && okp(r)) { const d = Math.hypot(X(r.x) - px, Y(r.y) - py); if (d < tol + 2 && (!best || d < best.d)) best = { o, d }; } }
  if (best) return best.o;
  const wxp = wx(px), wyp = wy(py);
  for (const o of [...objs].reverse()) {
    const r = res(o.id); if (!r) continue;
    if (r.k === 'circ') { if (Math.abs(Math.hypot(X(r.x) - px, Y(r.y) - py) - r.r * V().sc) < tol - 2) return o; }
    else if (r.p) { const d = distLine(r, px, py); if (d < tol - 2) return o; }
  }
  if (!polyOk) return null;
  for (const o of [...objs].reverse()) {
    const r = res(o.id); if (r && r.k === 'poly') { if (inPoly(r.pts, wxp, wyp)) return o; }
  }
  return null;
}
function distLine(r, px, py) {
  const ax = X(r.p[0]), ay = Y(r.p[1]), bx = X(r.q[0]), by = Y(r.q[1]), dx = bx - ax, dy = by - ay, dd = dx * dx + dy * dy;
  if (!dd) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / dd; if (r.k === 'seg') t = MD.clamp(t, 0, 1); else if (r.k === 'ray') t = Math.max(0, t);
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}
function inPoly(pts, x, y) { let c = false; for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) { const a = pts[i], b = pts[j]; if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) c = !c; } return c; }
const kindOf = o => { const r = res(o.id); if (!r) return null; return r.k === 'pt' ? 'P' : r.k === 'circ' ? 'C' : r.p ? 'L' : null; };
const accepts = (slot, k) => slot === k || (slot === 'LC' && (k === 'L' || k === 'C'));

/* ---------- działania narzędzi ---------- */
function newPoint(px, py) {
  let x = wx(px), y = wy(py); if (GS().snap) { const s = snapStep(); x = Math.round(x / s) * s; y = Math.round(y / s) * s; }
  return add({ t: 'P', x, y });
}
function toolClick(px, py, touch) {
  const h = hit(px, py, touch, tool === 'move' || tool === 'del');
  if (tool === 'move') { selId = h ? h.id : null; buildList(); redraw(); return; }
  if (tool === 'del') { if (h) removeObj(h.id); return; }
  if (tool === 'point') {
    pushHist();
    if (h && h.t !== 'P' && kindOf(h) !== 'P' && h.t !== 'poly') {
      const r = res(h.id), kk = kindOf(h);
      let u = 0;
      if (kk === 'C') u = Math.atan2(wy(py) - r.y, wx(px) - r.x);
      else { const d = lineDir(r), dd = d[0] ** 2 + d[1] ** 2; u = ((wx(px) - r.p[0]) * d[0] + (wy(py) - r.p[1]) * d[1]) / dd; if (r.k === 'seg') u = MD.clamp(u, 0, 1); else if (r.k === 'ray') u = Math.max(0, u); }
      add({ t: 'on', o: h.id, u });
    } else if (!h) newPoint(px, py);
    else { hist.pop(); return; }
    afterChange(); return;
  }
  if (tool === 'poly') {
    let p = h && kindOf(h) === 'P' ? h : null;
    if (p && pend.length >= 3 && p.id === pend[0].id) { finishPoly(); return; }
    pushHist(); if (!p) p = newPoint(px, py);
    pend.push({ id: p.id, kind: 'P' }); afterChange(); return;
  }
  const need = NEED[tool]; if (!need) return;
  const k = h ? kindOf(h) : null;
  let slotIdx = -1;
  const free = need.map((s, i) => i).filter(i => !pend.some(p => p.slot === i));
  if (h && k) { slotIdx = free.find(i => accepts(need[i], k)); if (slotIdx === undefined) slotIdx = -1; }
  else if (!h) { slotIdx = free.find(i => need[i] === 'P'); if (slotIdx === undefined) slotIdx = -1; }
  if (slotIdx < 0) { MD.toast(h ? 'Ten obiekt nie pasuje do tego narzędzia' : 'Wskaż obiekt'); return; }
  pushHist();
  let target = h;
  if (!h) target = newPoint(px, py);
  pend.push({ id: target.id, slot: slotIdx, kind: need[slotIdx] });
  if (pend.length === need.length) { buildObj(); pend = []; }
  else hist.pop() && 0;
  afterChange();
}
function buildObj() {
  const s = i => pend.find(p => p.slot === i).id, t = tool;
  if (t === 'seg' || t === 'line' || t === 'ray' || t === 'mid') add({ t, a: s(0), b: s(1) });
  else if (t === 'circ') add({ t, c: s(0), p: s(1) });
  else if (t === 'circ3' || t === 'bis' || t === 'ang') add({ t, a: s(0), b: s(1), c: s(2) });
  else if (t === 'perp' || t === 'par') add({ t, p: s(0), l: s(1) });
  else if (t === 'refl') add({ t, p: s(0), l: s(1) });
  else if (t === 'int') {
    const a = s(0), b = s(1); let made = 0;
    for (let k = 0; k < 2; k++) { const test = intersect(res(a), res(b), k); if (test) { add({ t: 'int', a, b, k }); made++; } }
    if (!made) MD.toast('Te obiekty nie przecinają się');
  }
}
function finishPoly() {
  if (pend.length < 3) { MD.toast('Wielokąt potrzebuje co najmniej 3 punktów'); return; }
  pushHist(); add({ t: 'poly', pts: pend.map(p => p.id), name: nameFor(false) }); pend = []; afterChange();
}
function removeObj(id) {
  pushHist(); const kill = new Set([id]); let ch = true;
  while (ch) { ch = false; GS().objs.forEach(o => { if (!kill.has(o.id) && refsOf(o).some(r => kill.has(r))) { kill.add(o.id); ch = true; } }); }
  GS().objs = GS().objs.filter(o => !kill.has(o.id)); if (kill.has(selId)) selId = null; pend = pend.filter(p => !kill.has(p.id)); afterChange();
}
function rootPoints(o, set = new Set()) { if (o.t === 'P') set.add(o.id); else refsOf(o).forEach(id => { const q = byId(id); if (q) rootPoints(q, set); }); return set; }

/* ---------- interakcja ---------- */
function evt(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function zoomAt(px, py, k) { const vw = V(), ns = MD.clamp(vw.sc * k, 4, 5000), x = wx(px), y = wy(py); vw.sc = ns; vw.cx = x - (px - W / 2) / ns; vw.cy = y + (py - H / 2) / ns; redraw(); MD.save(); }
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId); const [px, py] = evt(e); ptrs.set(e.pointerId, [px, py]); moved = 0;
  if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), sc: V().sc }; drag = null; return; }
  const touch = e.pointerType !== 'mouse', h = hit(px, py, touch, tool === 'move');
  drag = { px, py, cx: V().cx, cy: V().cy, obj: null, touch };
  if (tool === 'move' && h) {
    selId = h.id; buildList();
    const o = h;
    if (o.t === 'P') drag.obj = { kind: 'pt', o };
    else if (o.t === 'on') drag.obj = { kind: 'on', o };
    else { const roots = [...rootPoints(o)].map(id => byId(id)); if (roots.length && o.t !== 'ang') drag.obj = { kind: 'multi', roots, start: roots.map(r => [r.x, r.y]), wx: wx(px), wy: wy(py) }; }
    if (drag.obj) { pushHist(); drag.pushed = true; }
    redraw();
  }
});
cv.addEventListener('pointermove', e => {
  const [px, py] = evt(e); hoverP = [px, py];
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [px, py]);
  if (pinch && ptrs.size >= 2) { const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch.d > 5) zoomAt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (d / pinch.d) * pinch.sc / V().sc); moved = 99; return; }
  if (!drag || !ptrs.has(e.pointerId)) { if (pend.length) redraw(); return; }
  const dx = px - drag.px, dy = py - drag.py; moved = Math.max(moved, Math.hypot(dx, dy));
  if (drag.obj) {
    const d = drag.obj;
    if (d.kind === 'pt') { let x = wx(px), y = wy(py); if (GS().snap) { const s = snapStep(); x = Math.round(x / s) * s; y = Math.round(y / s) * s; } d.o.x = x; d.o.y = y; }
    else if (d.kind === 'on') {
      const t = res(d.o.o);
      if (t) { if (t.k === 'circ') d.o.u = Math.atan2(wy(py) - t.y, wx(px) - t.x); else if (t.p) { const dv = lineDir(t), dd = dv[0] ** 2 + dv[1] ** 2; let u = ((wx(px) - t.p[0]) * dv[0] + (wy(py) - t.p[1]) * dv[1]) / dd; if (t.k === 'seg') u = MD.clamp(u, 0, 1); else if (t.k === 'ray') u = Math.max(0, u); d.o.u = u; } }
    } else { const ddx = wx(px) - d.wx, ddy = wy(py) - d.wy; let sx = ddx, sy = ddy; if (GS().snap) { const s = snapStep(); sx = Math.round(ddx / s) * s; sy = Math.round(ddy / s) * s; } d.roots.forEach((r, i) => { r.x = d.start[i][0] + sx; r.y = d.start[i][1] + sy; }); }
    buildListValues(); redraw();
  } else if (moved > 3) { V().cx = drag.cx - dx / V().sc; V().cy = drag.cy + dy / V().sc; redraw(); }
});
const up = e => {
  const [px, py] = evt(e), wasOne = ptrs.size === 1; ptrs.delete(e.pointerId);
  if (ptrs.size < 2) pinch = null;
  if (ptrs.size === 0) {
    const d = drag; drag = null;
    if (d && d.pushed) { if (moved <= 2) hist.pop(); else { buildList(); MD.save(); } }
    else if (d && wasOne && moved <= 4 && e.type === 'pointerup') toolClick(px, py, d.touch);
    if (moved > 4) MD.save();
  }
  hoverP = e.pointerType === 'mouse' ? hoverP : null; redraw();
};
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('dblclick', () => { if (tool === 'poly' && pend.length >= 3) finishPoly(); });
cv.addEventListener('wheel', e => { e.preventDefault(); const [px, py] = evt(e); zoomAt(px, py, Math.exp(-e.deltaY * (e.ctrlKey ? .012 : .0018))); }, { passive: false });
document.addEventListener('keydown', e => {
  if (!$('#v-geo').classList.contains('on')) return;
  if (e.target.matches && e.target.matches('input,textarea')) return;
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? redo() : undo(); }
  else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); }
  else if ((e.key === 'Delete' || e.key === 'Backspace') && selId != null) { e.preventDefault(); removeObj(selId); }
  else if (e.key === 'Enter' && tool === 'poly') finishPoly();
  else if (e.key === 'Escape') { pend = []; selId = null; status(); buildList(); redraw(); }
});
$('#geoZoomIn').onclick = () => zoomAt(W / 2, H / 2, 1.4);
$('#geoZoomOut').onclick = () => zoomAt(W / 2, H / 2, 1 / 1.4);
$('#geoHome').onclick = () => { GS().view = { cx: 0, cy: 0.5, sc: 42 }; redraw(); MD.save(); };
$('#geoUndo').onclick = undo; $('#geoRedo').onclick = redo;
$('#geoSnap').onclick = () => { GS().snap = !GS().snap; $('#geoSnap').classList.toggle('on', GS().snap); MD.save(); };
$('#geoMeasure').onclick = () => { GS().measure = !GS().measure; $('#geoMeasure').classList.toggle('on', GS().measure); redraw(); MD.save(); };
$('#geoSideBtn').onclick = () => side.classList.remove('closed');

/* ---------- panele ---------- */
function setTool(t) {
  tool = t; pend = []; $$('button', toolsEl).forEach(b => b.classList.toggle('on', b.dataset.t === t)); status(); redraw();
  cv.style.cursor = t === 'move' ? 'default' : t === 'del' ? 'not-allowed' : 'crosshair';
}
function status() {
  const need = NEED[tool];
  let s = MD.tr(HINT[tool] || '');
  if (need && need.length && pend.length) s += ` (${pend.length}/${need.length})`;
  else if (tool === 'poly' && pend.length) s += ` (${pend.length})`;
  barEl.textContent = s; barEl.style.display = s ? '' : 'none';
}
function buildTools() {
  toolsEl.innerHTML = TOOLS.map(t => `<button data-t="${t.id}" title="${t.n}"><i data-i="${t.ic}"></i><span>${t.n}</span></button>`).join('');
  MD.fillIcons(toolsEl);
  $$('button', toolsEl).forEach(b => b.onclick = () => setTool(b.dataset.t));
  $$('button', toolsEl).forEach(b => b.classList.toggle('on', b.dataset.t === tool));
}
const TNAME = { P: 'Punkt', mid: 'Środek', int: 'Przecięcie', on: 'Punkt na obiekcie', refl: 'Odbicie', seg: 'Odcinek', line: 'Prosta', ray: 'Półprosta', perp: 'Prostopadła', par: 'Równoległa', bis: 'Dwusieczna', circ: 'Okrąg', circ3: 'Okrąg', poly: 'Wielokąt', ang: 'Kąt' };
function describe(o) {
  const r = res(o.id); if (!r) return '—';
  if (r.k === 'pt') return `(${num(r.x)}; ${num(r.y)})`;
  if (r.k === 'seg') return `|${o.name}| = ${num(Math.hypot(r.q[0] - r.p[0], r.q[1] - r.p[1]))}`;
  if (r.k === 'circ') return `r = ${num(r.r)},  ${MD.tr('pole')} = ${num(Math.PI * r.r * r.r)}`;
  if (r.k === 'poly') return `${MD.tr('P')} = ${num(polyArea(r.pts))},  ${MD.tr('obwód')} = ${num(polyPer(r.pts))}`;
  if (r.k === 'ang') return `${num(r.val, 1)}°`;
  if (r.p) { const dx = r.q[0] - r.p[0], dy = r.q[1] - r.p[1]; if (Math.abs(dx) < 1e-9) return `x = ${num(r.p[0])}`; const m = dy / dx, k = r.p[1] - m * r.p[0]; return `y = ${num(m)}x ${k < 0 ? '−' : '+'} ${num(Math.abs(k))}`; }
  return '';
}
function buildList() {
  const objs = GS().objs;
  if (!objs.length) { listEl.innerHTML = `<div class="orow"><span class="vl">${MD.tr('Brak obiektów — wybierz narzędzie i kliknij na płótnie.')}</span></div>`; return; }
  R = new Map();
  listEl.innerHTML = objs.map(o => `<div class="orow${o.id === selId ? ' sel' : ''}" data-id="${o.id}"><span class="nm" data-notr>${o.name}</span><span class="vl" data-notr title="${MD.tr(TNAME[o.t] || '')}">${describe(o)}</span><button class="rb" data-a="del" title="Usuń">✕</button></div>`).join('');
}
function buildListValues() { R = new Map(); $$('.orow', listEl).forEach(el => { const o = byId(+el.dataset.id); if (o) { const v = $('.vl', el); if (v) v.textContent = describe(o); } }); R = new Map(); }
listEl.addEventListener('click', e => {
  const row = e.target.closest('.orow'); if (!row || !row.dataset.id) return; const id = +row.dataset.id;
  if (e.target.closest('[data-a="del"]')) removeObj(id); else { selId = selId === id ? null : id; buildList(); redraw(); }
});

MD.tabs.geo = {
  show() { side.classList.remove('closed'); setTimeout(() => { buildList(); redraw(); }, 30); },
  resize() { redraw(); },
  png() { dirty = true; draw(); MD.canvasPNG(cv, 'math-docs-geometria.png'); },
  clear() { pushHist(); GS().objs = []; selId = null; pend = []; afterChange(); }
};
MD.initGeo = () => {
  ensure(); buildTools(); setTool('move'); buildList(); status();
  hintEl.textContent = MD.tr('Wskazówka: przeciągnij wierzchołek trójkąta — pole i długości przeliczą się na żywo.');
  $('#geoSnap').classList.toggle('on', GS().snap !== false); $('#geoMeasure').classList.toggle('on', GS().measure !== false);
  if (window.matchMedia('(max-width:760px)').matches) side.classList.add('closed');
  MD.onLang.push(() => { buildTools(); status(); buildList(); hintEl.textContent = MD.tr('Wskazówka: przeciągnij wierzchołek trójkąta — pole i długości przeliczą się na żywo.'); redraw(); });
  if (window.ResizeObserver) new ResizeObserver(() => redraw()).observe(wrap);
  redraw();
};
})();

