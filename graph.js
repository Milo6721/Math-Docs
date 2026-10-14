// Math Docs — kalkulator graficzny (wiele funkcji, suwaki, punkty, krzywe uwikłane, nierówności, analiza).
(() => {
'use strict';
const MD = window.MD, { $, $$ } = MD;
const cv = $('#gCanvas'), wrap = $('#gWrap'), rowsEl = $('#gRows'), coordEl = $('#gCoord'), side = $('#gSide');
const EXAMPLES = [
  ['Parabola', ['y=x^2-2x-3']],
  ['Sinus i cosinus', ['y=sin(x)', 'y=cos(x)']],
  ['Suwaki', ['a=1', 'b=0', 'y=a*sin(x)+b']],
  ['Okrąg', ['x^2+y^2=25', '(3,4)']],
  ['Pochodna', ['f(x)=x^3-3x', "f'(x)", "f''(x)"]],
  ['Elipsa', ['x^2/16+y^2/4=1']],
  ['Nierówność', ['y>x^2-2', 'y<4-x']],
  ['Moduł', ['y=|x-2|-1']],
  ['Lissajous-lite', ['x^2+y^2=sin(3x)*cos(2y)+4']]
];
let uid = 1, C = { fns: {}, vars: {} }, W = 800, H = 600, dirty = false, trace = null, anCache = null, anKey = '';

function defaults() {
  return { rows: [mk('y=x^2-2x-3', 0, true), mk('y=sin(x)', 1)], view: { cx: 0, cy: 0, sc: 48 }, deg: false, grid: true };
}
function mk(src, i, an) { return { id: uid++, src: src || '', color: MD.COLORS[(i == null ? 0 : i) % MD.COLORS.length], vis: true, lo: -10, hi: 10, an: !!an }; }
const G = () => MD.S.graph;
function ensure() {
  if (!MD.S.graph || !Array.isArray(MD.S.graph.rows)) MD.S.graph = defaults();
  const g = MD.S.graph; g.view = g.view || { cx: 0, cy: 0, sc: 48 };
  g.rows.forEach(r => { if (r.id >= uid) uid = r.id + 1; });
}

/* ---------- kompilacja wierszy ---------- */
function compile() {
  const g = G(), names = {};
  g.rows.forEach(r => { const m = /^\s*([A-Za-z]{1,3})\s*\(\s*([A-Za-z])\s*\)\s*=/.exec(r.src || ''); if (m && !MD.isBuiltin(m[1]) && m[1] !== 'x' && m[1] !== 'y') names[m[1]] = 1; });
  const fns = {}, vars = {};
  g.rows.forEach(r => {
    r._e = null; r._p = null; r._f = null; r._val = undefined; r._missing = [];
    try { r._p = MD.parseRow(r.src, names); } catch (e) { r._e = e.message; }
  });
  g.rows.forEach(r => { if (r._p && r._p.kind === 'def') fns[r._p.name] = { param: r._p.param, f: MD.comp(r._p.ast) }; });
  for (let pass = 0; pass < 3; pass++) g.rows.forEach(r => {
    if (r._p && r._p.kind === 'var') { const v = MD.evalAst(r._p.ast, MD.makeCtx(vars, fns, g.deg)); vars[r._p.name] = v; r._val = v; }
  });
  C = { fns, vars };
  const ctx = MD.makeCtx(vars, fns, g.deg);
  g.rows.forEach(r => {
    const p = r._p; if (!p) return;
    const fv = new Set();
    if (p.kind === 'implicit') { MD.freeVars(p.l, fv); MD.freeVars(p.r, fv); }
    else if (p.ast) MD.freeVars(p.ast, fv);
    if (p.kind === 'def') fv.delete(p.param);
    if (p.kind === 'var') fv.delete(p.name);
    r._missing = [...fv].filter(n => vars[n] === undefined && !(p.kind === 'def' && n === p.param));
    if (p.kind === 'fn' || p.kind === 'def' || (p.kind === 'expr' && p.usesX && !p.usesY)) {
      const f = MD.comp(p.ast), c = ctx;
      if (p.kind === 'def') { const par = p.param; r._f = x => { c.loc = { [par]: x }; c.x = x; const v = f(c); c.loc = null; return v; }; }
      else r._f = x => { c.x = x; return f(c); };
    }
    if (p.kind === 'implicit') {
      const l = MD.comp(p.l), rr = MD.comp(p.r), c = ctx; r._F = (x, y) => { c.x = x; c.y = y; return l(c) - rr(c); };
    }
    if (p.kind === 'point') r._pt = [MD.evalAst(p.ast.x, ctx), MD.evalAst(p.ast.y, ctx)];
    if (p.kind === 'expr' && !p.usesX && !p.usesY) r._val = MD.evalAst(p.ast, ctx);
    if (p.kind === 'vline') r._val = MD.evalAst(p.ast, ctx);
  });
  anKey = '';
}

/* ---------- widok ---------- */
const X = x => W / 2 + (x - G().view.cx) * G().view.sc, Y = y => H / 2 - (y - G().view.cy) * G().view.sc;
const wx = px => (px - W / 2) / G().view.sc + G().view.cx, wy = py => -(py - H / 2) / G().view.sc + G().view.cy;
function redraw() { if (!dirty) { dirty = true; requestAnimationFrame(draw); setTimeout(() => { if (dirty) draw(); }, 80); } }
const fmt = v => { const s = MD.fmtNum(v, 5); return s; };

function draw() {
  dirty = false;
  if (!$('#v-graph').classList.contains('on')) return;
  const f = MD.fitCanvas(cv), g = f.g; W = f.w; H = f.h;
  const vw = G().view, sc = vw.sc;
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#FFFFFF'; g.fillRect(0, 0, W, H);
  const x0 = wx(0), x1 = wx(W), y1 = wy(0), y0 = wy(H);
  /* siatka */
  const major = MD.nice(80 / sc), minor = major / 5;
  g.lineWidth = 1;
  if (G().grid) {
    if (minor * sc >= 11) { g.strokeStyle = '#E3F2F1'; g.beginPath(); for (let v = Math.ceil(x0 / minor) * minor; v <= x1; v += minor) { const px = Math.round(X(v)) + .5; g.moveTo(px, 0); g.lineTo(px, H); } for (let v = Math.ceil(y0 / minor) * minor; v <= y1; v += minor) { const py = Math.round(Y(v)) + .5; g.moveTo(0, py); g.lineTo(W, py); } g.stroke(); }
    g.strokeStyle = '#C6E0DF'; g.beginPath();
    for (let v = Math.ceil(x0 / major) * major; v <= x1; v += major) { const px = Math.round(X(v)) + .5; g.moveTo(px, 0); g.lineTo(px, H); }
    for (let v = Math.ceil(y0 / major) * major; v <= y1; v += major) { const py = Math.round(Y(v)) + .5; g.moveTo(0, py); g.lineTo(W, py); }
    g.stroke();
  }
  /* osie */
  const ax = MD.clamp(Math.round(X(0)) + .5, 0.5, W - .5), ay = MD.clamp(Math.round(Y(0)) + .5, 0.5, H - .5);
  g.strokeStyle = '#2F5251'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(0, ay); g.lineTo(W, ay); g.moveTo(ax, 0); g.lineTo(ax, H); g.stroke();
  g.fillStyle = '#6B8F8E'; g.font = '11.5px Inter,sans-serif'; g.textBaseline = 'top'; g.textAlign = 'center';
  const lblY = MD.clamp(ay + 4, 2, H - 16);
  for (let v = Math.ceil(x0 / major) * major; v <= x1; v += major) { if (Math.abs(v) < major / 1e3) continue; g.fillText(fmt(v), X(v), lblY); }
  g.textAlign = 'right'; g.textBaseline = 'middle';
  const lblX = ax > 40 ? ax - 6 : ax + 36;
  for (let v = Math.ceil(y0 / major) * major; v <= y1; v += major) { if (Math.abs(v) < major / 1e3) continue; g.fillText(fmt(v), lblX, Y(v)); }
  g.textAlign = 'right'; g.textBaseline = 'top'; if (ax > 40 && ay < H - 20) g.fillText('0', ax - 6, ay + 4);
  /* wykresy */
  G().rows.forEach(r => { if (r.vis && r._p && !r._e) { try { drawRow(g, r, x0, x1, y0, y1); } catch (e) { r._e = String(e.message || e); } } });
  /* analiza */
  drawAnalysis(g);
  /* ślad */
  if (trace) {
    g.fillStyle = '#fff'; g.strokeStyle = trace.color; g.lineWidth = 2.5; g.beginPath(); g.arc(X(trace.x), Y(trace.y), 5.5, 0, 6.3); g.fill(); g.stroke();
    label(g, `(${fmt(trace.x)}, ${fmt(trace.y)})`, X(trace.x), Y(trace.y), trace.color);
  }
}
function label(g, t, px, py, col) {
  g.font = '600 12px Inter,sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
  const w = g.measureText(t).width + 12; let lx = px + 10, ly = py - 14; if (lx + w > W - 4) lx = px - w - 10; if (ly < 12) ly = py + 16;
  g.fillStyle = 'rgba(251,255,255,.94)'; g.strokeStyle = col || '#D2EBEA'; g.lineWidth = 1;
  g.beginPath(); g.roundRect ? g.roundRect(lx, ly - 11, w, 22, 8) : g.rect(lx, ly - 11, w, 22); g.fill(); g.stroke();
  g.fillStyle = '#10282A'; g.fillText(t, lx + 6, ly + .5);
}
function drawRow(g, r, x0, x1, y0, y1) {
  const p = r._p, col = r.color;
  g.strokeStyle = col; g.fillStyle = col; g.lineWidth = 2.6; g.lineJoin = 'round'; g.lineCap = 'round';
  if (r._f) {
    g.beginPath(); let pen = false, py0 = 0, ppx = 0;
    const step = 1, big = H * 3;
    for (let px = -2; px <= W + 2; px += step) {
      const x = wx(px), y = r._f(x), py = Y(y);
      if (!Number.isFinite(y) || Math.abs(py) > 1e6) { pen = false; continue; }
      if (pen && Math.abs(py - py0) > big) pen = false;
      // skok przez asymptotę: znak zmienia się i oba końce daleko poza ekranem
      if (pen && ((py0 < -H && py > H * 2) || (py0 > H * 2 && py < -H))) pen = false;
      if (!pen) g.moveTo(px, py); else g.lineTo(px, py);
      pen = true; py0 = py; ppx = px;
    }
    g.stroke();
  } else if (p.kind === 'vline') {
    const v = r._val; if (Number.isFinite(v)) { const px = Math.round(X(v)) + .5; g.beginPath(); g.moveTo(px, 0); g.lineTo(px, H); g.stroke(); }
  } else if (p.kind === 'point') {
    const [a, b] = r._pt || []; if (Number.isFinite(a) && Number.isFinite(b)) {
      g.beginPath(); g.arc(X(a), Y(b), 5.5, 0, 6.3); g.fill(); g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.stroke();
      label(g, `(${fmt(a)}, ${fmt(b)})`, X(a), Y(b), col);
    }
  } else if (p.kind === 'implicit') drawImplicit(g, r);
}
function drawImplicit(g, r) {
  const F = r._F, p = r._p, cs = 5, nx = Math.ceil(W / cs) + 1, ny = Math.ceil(H / cs) + 1;
  const val = new Float64Array(nx * ny);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) val[j * nx + i] = F(wx(i * cs), wy(j * cs));
  const op = p.op, ineq = op !== '=';
  const ok = v => op === '>' ? v > 0 : op === '<' ? v < 0 : op === '>=' ? v >= 0 : op === '<=' ? v <= 0 : op === '!=' ? v !== 0 : false;
  if (ineq && op !== '!=') {
    g.save(); g.globalAlpha = .16; g.fillStyle = r.color;
    for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) { const v = val[j * nx + i]; if (Number.isFinite(v) && ok(v)) g.fillRect(i * cs, j * cs, cs + .5, cs + .5); }
    g.restore();
  }
  if (op === '!=') return;
  if (ineq) { g.setLineDash(op === '>' || op === '<' ? [7, 6] : []); g.lineWidth = 2; }
  g.beginPath();
  const SEG = [[], [[3, 0]], [[0, 1]], [[3, 1]], [[1, 2]], [[3, 0], [1, 2]], [[0, 2]], [[3, 2]], [[3, 2]], [[0, 2]], [[0, 1], [3, 2]], [[1, 2]], [[3, 1]], [[0, 1]], [[3, 0]], []];
  const maxStep = 1e6;
  for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const a = val[j * nx + i], b = val[j * nx + i + 1], c = val[(j + 1) * nx + i + 1], d = val[(j + 1) * nx + i];
    if (!(Number.isFinite(a) && Number.isFinite(b) && Number.isFinite(c) && Number.isFinite(d))) continue;
    const idx = (a > 0 ? 1 : 0) | (b > 0 ? 2 : 0) | (c > 0 ? 4 : 0) | (d > 0 ? 8 : 0);
    const sg = SEG[idx]; if (!sg.length) continue;
    // skok (asymptota) — pomiń
    if (Math.abs(a - b) > maxStep || Math.abs(a - d) > maxStep) continue;
    const x = i * cs, y = j * cs;
    const E = e => {
      switch (e) {
        case 0: return [x + cs * a / (a - b), y];
        case 1: return [x + cs, y + cs * b / (b - c)];
        case 2: return [x + cs * d / (d - c), y + cs];
        default: return [x, y + cs * a / (a - d)];
      }
    };
    for (const [e1, e2] of sg) { const P = E(e1), Q = E(e2); g.moveTo(P[0], P[1]); g.lineTo(Q[0], Q[1]); }
  }
  g.stroke(); g.setLineDash([]);
}

/* ---------- analiza: zera, ekstrema, przecięcia ---------- */
function analysis() {
  const vw = G().view, key = JSON.stringify([vw, G().rows.map(r => [r.src, r.vis, r.an]), G().deg]);
  if (key === anKey && anCache) return anCache;
  const x0 = wx(0), x1 = wx(W), out = [];
  const fr = G().rows.filter(r => r.vis && r._f && !r._e);
  G().rows.forEach(r => {
    if (!r.an || !r._f || !r.vis || r._e) return;
    const f = r._f, o = { row: r, zeros: [], ext: [], inter: [], yi: null };
    try {
      o.zeros = MD.findRoots(f, x0, x1, 1200).slice(0, 12).map(x => ({ x, y: 0 }));
      o.ext = MD.findExtrema(f, x0, x1, 1200).slice(0, 12);
      const y0v = f(0); if (0 >= x0 && 0 <= x1 && Number.isFinite(y0v)) o.yi = { x: 0, y: y0v };
      fr.forEach(q => {
        if (q === r || (q.an && q.id < r.id)) return;
        MD.findRoots(x => f(x) - q._f(x), x0, x1, 1200).slice(0, 8).forEach(x => { const y = f(x); if (Number.isFinite(y)) o.inter.push({ x, y, with: q }); });
      });
    } catch (e) {}
    out.push(o);
  });
  anKey = key; anCache = out; return out;
}
function drawAnalysis(g) {
  if (!G().rows.some(r => r.an)) return;
  analysis().forEach(o => {
    const pts = [['z', o.zeros], ['e', o.ext], ['i', o.inter]];
    pts.forEach(([k, arr]) => arr.forEach(p => {
      const px = X(p.x), py = Y(p.y); if (px < -10 || px > W + 10 || py < -10 || py > H + 10) return;
      g.fillStyle = '#fff'; g.strokeStyle = k === 'i' ? p.with.color : o.row.color; g.lineWidth = 2.4; g.beginPath(); g.arc(px, py, 4.6, 0, 6.3); g.fill(); g.stroke();
    }));
    if (o.yi) { g.fillStyle = o.row.color; g.beginPath(); g.moveTo(X(0), Y(o.yi.y) - 6); g.lineTo(X(0) + 5, Y(o.yi.y)); g.lineTo(X(0), Y(o.yi.y) + 6); g.lineTo(X(0) - 5, Y(o.yi.y)); g.fill(); }
  });
}
function analysisHTML(r) {
  const o = analysis().find(a => a.row === r); if (!o) return '';
  const sp = (t, cls) => `<span>${cls ? `<b>${cls}</b> ` : ''}${t}</span>`;
  let h = '';
  if (o.zeros.length) h += sp(o.zeros.map(p => `x=${fmt(p.x)}`).join(', '), MD.tr('Zera'));
  if (o.yi) h += sp(`y=${fmt(o.yi.y)}`, MD.tr('Wyraz wolny'));
  o.ext.forEach(p => h += sp(`(${fmt(p.x)}, ${fmt(p.y)})`, p.kind === 'min' ? MD.tr('Minimum') : MD.tr('Maksimum')));
  o.inter.forEach(p => h += sp(`(${fmt(p.x)}, ${fmt(p.y)})`, MD.tr('Przecięcie')));
  return h || `<span class="muted">${MD.tr('Brak punktów w widocznym obszarze')}</span>`;
}

/* ---------- lista wierszy ---------- */
function rowHTML(r) {
  const isVar = r._p && r._p.kind === 'var' && r._p.ast && (r._p.ast.t === 'n' || (r._p.ast.t === 'u' && r._p.ast.a.t === 'n'));
  const canAn = !!r._f;
  return `<div class="grow-row" data-id="${r.id}"><div class="rl">
    <button class="dot${r.vis ? '' : ' off'}" style="--c:${r.color}" data-a="vis" title="Pokaż / ukryj"></button>
    <input class="gin" value="${MD.esc(r.src).replace(/"/g, '&quot;')}" spellcheck="false" autocomplete="off" autocapitalize="off" inputmode="text" placeholder="y = …" data-notr>
    ${canAn ? `<button class="rb${r.an ? ' on' : ''}" data-a="an" title="Punkty szczególne (zera, ekstrema, przecięcia)"><i data-i="target"></i></button>` : ''}
    <button class="rb" data-a="del" title="Usuń">✕</button></div>
    ${isVar ? `<div class="sl"><input class="rng" data-a="lo" value="${r.lo}" data-notr><input type="range" data-a="sl" min="${r.lo}" max="${r.hi}" step="${sliderStep(r)}" value="${Number.isFinite(r._val) ? r._val : 0}"><input class="rng" data-a="hi" value="${r.hi}" data-notr></div>` : ''}
    <div class="rmeta" data-m></div>${canAn && r.an ? `<div class="an" data-an>${analysisHTML(r)}</div>` : ''}</div>`;
}
const sliderStep = r => { const s = MD.nice((r.hi - r.lo) / 300); return s > 0 ? s : 0.01; };
function metaHTML(r) {
  if (r._e) return `<span class="e">${MD.esc(r._e)}</span>`;
  const p = r._p; if (!p) return '';
  let h = '';
  if (r._missing && r._missing.length) h += r._missing.map(n => `<button class="chip" data-a="addvar" data-n="${n}">+ ${MD.tf('suwak {0}', n)}</button> `).join('');
  if (p.kind === 'expr' && !p.usesX && !p.usesY) {
    h += p.rel ? `<span class="v">${r._val === 0 || Math.abs(r._val) < 1e-9 ? MD.tr('prawda') : MD.tr('fałsz')}</span>` : `<span>= <span class="v">${fmt(r._val)}</span></span>`;
  }
  if (p.kind === 'var') h += `<span>${MD.esc(p.name)} = <span class="v">${fmt(r._val)}</span></span>`;
  if (p.kind === 'vline') h += `<span>x = <span class="v">${fmt(r._val)}</span></span>`;
  return h;
}
function buildList(focusId) {
  rowsEl.innerHTML = G().rows.map(rowHTML).join('');
  $$('.grow-row', rowsEl).forEach(el => updateMeta(el));
  MD.fillIcons(rowsEl);
  if (focusId != null) { const el = $(`.grow-row[data-id="${focusId}"] .gin`, rowsEl); if (el) el.focus(); }
}
function updateMeta(el) {
  const r = G().rows.find(x => x.id === +el.dataset.id); if (!r) return;
  const m = $('[data-m]', el); if (m) m.innerHTML = metaHTML(r);
  el.classList.toggle('err', !!r._e);
  const an = $('[data-an]', el); if (an) an.innerHTML = analysisHTML(r);
}
function refreshAll() { compile(); $$('.grow-row', rowsEl).forEach(updateMeta); redraw(); MD.save(); }
function addRow(src, after, an) {
  const g = G(), r = mk(src, g.rows.length, an), i = after != null ? g.rows.findIndex(x => x.id === after) + 1 : g.rows.length;
  g.rows.splice(i, 0, r); return r;
}

rowsEl.addEventListener('input', e => {
  const el = e.target.closest('.grow-row'); if (!el) return;
  const r = G().rows.find(x => x.id === +el.dataset.id), a = e.target.dataset.a;
  if (e.target.classList.contains('gin')) { r.src = e.target.value; refreshAll(); }
  else if (a === 'sl') {
    const v = +e.target.value, nm = r._p && r._p.name; if (!nm) return;
    r.src = `${nm}=${+v.toFixed(6)}`; const gin = $('.gin', el); gin.value = r.src; refreshAll();
  }
});
rowsEl.addEventListener('change', e => {
  const el = e.target.closest('.grow-row'); if (!el) return;
  const r = G().rows.find(x => x.id === +el.dataset.id), a = e.target.dataset.a;
  if (a === 'lo' || a === 'hi') {
    const v = parseFloat(String(e.target.value).replace(',', '.')); if (Number.isFinite(v)) { r[a] = v; if (r.lo >= r.hi) { r.lo = r.hi - 1; } buildList(); MD.save(); }
  } else if (e.target.classList.contains('gin')) {
    // jeśli wpisany wiersz zmienił się w suwak lub zmienił zasięg – odbuduj widok listy
    const cnt = $$('.sl', rowsEl).length, want = G().rows.filter(x => x._p && x._p.kind === 'var' && x._p.ast && (x._p.ast.t === 'n' || (x._p.ast.t === 'u' && x._p.ast.a.t === 'n'))).length;
    const hasBtn = !!r._f !== !!$('[data-a="an"]', el);
    if (cnt !== want || hasBtn) { const focus = document.activeElement === e.target; buildList(focus ? r.id : null); }
  }
});
rowsEl.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b || b.tagName === 'INPUT') return;
  const el = b.closest('.grow-row'); const r = el && G().rows.find(x => x.id === +el.dataset.id), a = b.dataset.a;
  if (a === 'vis') { r.vis = !r.vis; b.classList.toggle('off', !r.vis); redraw(); MD.save(); }
  else if (a === 'an') { r.an = !r.an; anKey = ''; buildList(); redraw(); MD.save(); }
  else if (a === 'del') { G().rows.splice(G().rows.indexOf(r), 1); compile(); buildList(); redraw(); MD.save(); }
  else if (a === 'addvar') {
    const n = b.dataset.n, ex = G().rows.find(x => x._p && x._p.kind === 'var' && x._p.name === n); if (ex) return;
    const nr = addRow(`${n}=1`, null); G().rows.splice(G().rows.indexOf(nr), 1); G().rows.splice(Math.max(0, G().rows.indexOf(r)), 0, nr);
    compile(); buildList(); redraw(); MD.save();
  }
});
rowsEl.addEventListener('keydown', e => {
  if (e.key === 'Enter' && e.target.classList.contains('gin')) {
    e.preventDefault();
    const el = e.target.closest('.grow-row'), id = +el.dataset.id, rows = G().rows, i = rows.findIndex(x => x.id === id);
    if (i === rows.length - 1 || rows[i + 1].src.trim() !== '') { const r = addRow('', id); compile(); buildList(r.id); MD.save(); }
    else { const nx = $(`.grow-row[data-id="${rows[i + 1].id}"] .gin`, rowsEl); nx && nx.focus(); }
  } else if (e.key === 'Backspace' && e.target.classList.contains('gin') && e.target.value === '') {
    const id = +e.target.closest('.grow-row').dataset.id, rows = G().rows, i = rows.findIndex(x => x.id === id);
    if (rows.length > 1) { e.preventDefault(); rows.splice(i, 1); compile(); buildList(rows[Math.max(0, i - 1)].id); redraw(); MD.save(); }
  }
});
$('#gAdd').onclick = () => { const r = addRow(''); compile(); buildList(r.id); rowsEl.scrollTop = rowsEl.scrollHeight; MD.save(); };
$('#gAngle').onclick = () => { G().deg = !G().deg; $('#gAngle').textContent = G().deg ? 'DEG' : 'RAD'; refreshAll(); };
$('#gGrid').onclick = () => { G().grid = !G().grid; $('#gGrid').classList.toggle('on', G().grid); redraw(); MD.save(); };

/* ---------- przykłady ---------- */
function buildExamples() {
  const el = $('#gExamples'); el.innerHTML = '';
  EXAMPLES.forEach(([n, rows]) => {
    const b = document.createElement('button'); b.className = 'chip'; b.textContent = MD.tr(n);
    b.onclick = () => {
      G().rows = rows.map((s, i) => mk(s, i, i === 0 && /^y=/.test(s) && rows.length === 1));
      G().view = { cx: 0, cy: 0, sc: 48 }; trace = null; compile(); buildList(); redraw(); MD.save();
    };
    el.appendChild(b);
  });
}

/* ---------- interakcja z płótnem ---------- */
const ptrs = new Map(); let drag = null, pinch = null, moved = 0;
function evt(e) { const r = cv.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
function zoomAt(px, py, k) {
  const vw = G().view, ns = MD.clamp(vw.sc * k, 0.5, 1e5), x = wx(px), y = wy(py);
  vw.sc = ns; vw.cx = x - (px - W / 2) / ns; vw.cy = y + (py - H / 2) / ns; anKey = ''; redraw(); MD.save();
}
function nearest(px, py) {
  let best = null;
  G().rows.forEach(r => {
    if (!r.vis || !r._f || r._e) return;
    const x = wx(px), y = r._f(x), d = Math.abs(Y(y) - py);
    if (Number.isFinite(y) && d < 16 && (!best || d < best.d)) best = { x, y, d, color: r.color, row: r };
  });
  if (!best) { // punkty analizy
    if (G().rows.some(r => r.an)) analysis().forEach(o => [...o.zeros, ...o.ext, ...o.inter].forEach(p => { const d = Math.hypot(X(p.x) - px, Y(p.y) - py); if (d < 14 && (!best || d < best.d)) best = { x: p.x, y: p.y, d, color: o.row.color }; }));
  }
  return best;
}
cv.addEventListener('pointerdown', e => {
  cv.setPointerCapture(e.pointerId); ptrs.set(e.pointerId, evt(e)); moved = 0;
  if (ptrs.size === 1) { const [px, py] = evt(e); drag = { px, py, cx: G().view.cx, cy: G().view.cy }; }
  else if (ptrs.size === 2) { const [a, b] = [...ptrs.values()]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), sc: G().view.sc }; drag = null; }
});
cv.addEventListener('pointermove', e => {
  const [px, py] = evt(e);
  if (ptrs.has(e.pointerId)) ptrs.set(e.pointerId, [px, py]);
  if (pinch && ptrs.size >= 2) {
    const [a, b] = [...ptrs.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch.d > 5) { const mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2; zoomAt(mx, my, (d / pinch.d) * pinch.sc / G().view.sc); }
    moved = 99; return;
  }
  if (drag && ptrs.has(e.pointerId)) {
    const dx = px - drag.px, dy = py - drag.py; moved = Math.max(moved, Math.hypot(dx, dy));
    if (moved > 3) { const vw = G().view; vw.cx = drag.cx - dx / vw.sc; vw.cy = drag.cy + dy / vw.sc; anKey = ''; redraw(); }
  } else if (e.pointerType === 'mouse') {
    const n = nearest(px, py);
    coordEl.textContent = n ? `(${fmt(n.x)}, ${fmt(n.y)})` : `(${fmt(wx(px))}, ${fmt(wy(py))})`; coordEl.classList.add('show');
  }
});
const up = e => {
  const wasOne = ptrs.size === 1;
  ptrs.delete(e.pointerId);
  if (ptrs.size < 2) pinch = null;
  if (ptrs.size === 0) { drag = null; MD.save(); if (wasOne && moved <= 3 && e.type === 'pointerup') { const [px, py] = evt(e); const n = nearest(px, py); trace = n ? { x: n.x, y: n.y, color: n.color } : null; redraw(); } }
  else if (ptrs.size === 1) { const [id, p] = [...ptrs.entries()][0]; drag = { px: p[0], py: p[1], cx: G().view.cx, cy: G().view.cy }; }
};
cv.addEventListener('pointerup', up); cv.addEventListener('pointercancel', up);
cv.addEventListener('pointerleave', () => coordEl.classList.remove('show'));
cv.addEventListener('wheel', e => { e.preventDefault(); const [px, py] = evt(e); zoomAt(px, py, Math.exp(-e.deltaY * (e.ctrlKey ? .012 : .0018))); }, { passive: false });
$('#gZoomIn').onclick = () => zoomAt(W / 2, H / 2, 1.4);
$('#gZoomOut').onclick = () => zoomAt(W / 2, H / 2, 1 / 1.4);
$('#gHome').onclick = () => { G().view = { cx: 0, cy: 0, sc: 48 }; anKey = ''; redraw(); MD.save(); };
$('#gSideBtn').onclick = () => side.classList.remove('closed');

/* ---------- zakładka ---------- */
MD.graph = {
  // wywoływane z rozwiązywarki: pokaż wyrażenia na wykresie
  show(exprs) { G().rows = exprs.map((s, i) => mk(s, i, exprs.length === 1)); G().view = { cx: 0, cy: 0, sc: 48 }; trace = null; compile(); buildList(); MD.setTab('graph'); redraw(); MD.save(); }
};
MD.tabs.graph = {
  show() { side.classList.remove('closed'); setTimeout(() => { anKey = ''; redraw(); }, 30); },
  resize() { redraw(); },
  png() { dirty = true; draw(); MD.canvasPNG(cv, 'math-docs-wykres.png'); },
  clear() { MD.S.graph = defaults(); MD.S.graph.rows = [mk('', 0)]; trace = null; compile(); buildList(); redraw(); MD.save(); }
};
MD.initGraph = () => {
  ensure(); compile(); buildList(); buildExamples();
  $('#gAngle').textContent = G().deg ? 'DEG' : 'RAD'; $('#gGrid').classList.toggle('on', G().grid);
  if (window.matchMedia('(max-width:760px)').matches) side.classList.add('closed');
  MD.onLang.push(() => { buildExamples(); compile(); buildList(); redraw(); });
  if (window.ResizeObserver) new ResizeObserver(() => redraw()).observe(wrap);
  redraw();
};
})();

