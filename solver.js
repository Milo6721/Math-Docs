// Math Docs — rozwiązywanie krok po kroku: lokalnie (równania liniowe i kwadratowe, nierówności, wartości) + AI (/api/solve).
(() => {
'use strict';
const MD = window.MD, { $, $$ } = MD;
const inEl = $('#sIn'), outEl = $('#sOut'), histEl = $('#sHist'), prevEl = $('#sPrev');
const EXAMPLES = ['x^2 - 5x + 6 = 0', '2x + 3 = 11', '3x - 7 <= 5', 'x^2 - 4 > 0', '(3+5)*2^3 - 4', 'pochodna x^3 * sin(x)', 'układ: x + y = 5, x - y = 1', 'Oblicz pole trójkąta o bokach 7, 8, 9'];
let image = null, busy = false;
const MAXH = 15;

/* ---------- TeX z tekstu wejściowego ---------- */
function toTex(src) {
  let s = String(src).replace(/²/g, '^2').replace(/³/g, '^3').replace(/π/g, ' \\pi ').replace(/\bpi\b/g, '\\pi ').replace(/<=/g, '\\leq ').replace(/>=/g, '\\geq ').replace(/!=/g, '\\neq ');
  const grab = (str, i) => { let d = 0; for (let j = i; j < str.length; j++) { if (str[j] === '(') d++; else if (str[j] === ')') { d--; if (!d) return j; } } return -1; };
  for (let guard = 0; guard < 30; guard++) {
    let m = /sqrt\s*\(/.exec(s); if (m) { const o = m.index + m[0].length - 1, c = grab(s, o); if (c > 0) { s = s.slice(0, m.index) + '\\sqrt{' + s.slice(o + 1, c) + '}' + s.slice(c + 1); continue; } }
    m = /\^\s*\(/.exec(s); if (m) { const o = m.index + m[0].length - 1, c = grab(s, o); if (c > 0) { s = s.slice(0, m.index) + '^{' + s.slice(o + 1, c) + '}' + s.slice(c + 1); continue; } }
    break;
  }
  return s.replace(/\*/g, ' \\cdot ').replace(/\^(-?\d+(?:[.,]\d+)?)/g, '^{$1}');
}

/* ---------- liczby jako ułamki TeX ---------- */
const frac = v => { for (let q = 1; q <= 120; q++) { const p = Math.round(v * q); if (Math.abs(p / q - v) < 1e-9 * Math.max(1, Math.abs(v))) return [p, q]; } return null; };
function tx(v) {
  if (!Number.isFinite(v)) return '?';
  if (Math.abs(v) < 1e-12) return '0';
  const f = frac(v);
  if (f) { const [p, q] = f; return q === 1 ? String(p) : `${p < 0 ? '-' : ''}\\frac{${Math.abs(p)}}{${q}}`; }
  return MD.fmtNum(v, 5).replace('.', '{,}').replace(/^(-?)\{,\}/, '$10{,}');
}
const txp = v => (v < 0 ? `(${tx(v)})` : tx(v));
function polyTex(a, b, c, v = 'x') {
  const t = [];
  const term = (k, pow) => { if (Math.abs(k) < 1e-12) return; const ab = Math.abs(k), coef = ab === 1 && pow > 0 ? '' : tx(ab), body = pow === 0 ? (coef || '1') : pow === 1 ? coef + v : coef + v + '^{2}'; t.push({ neg: k < 0, body }); };
  term(a, 2); term(b, 1); term(c, 0);
  if (!t.length) return '0';
  return t.map((x, i) => (i === 0 ? (x.neg ? '-' : '') : (x.neg ? ' - ' : ' + ')) + x.body).join('');
}
const sqrtSimplify = n => { // sqrt(n) dla całkowitego n>0 -> [k, m] gdzie sqrt(n)=k*sqrt(m)
  let k = 1, m = n; for (let d = 2; d * d <= m; d++) while (m % (d * d) === 0) { m /= d * d; k *= d; } return [k, m];
};

const gcdI = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
// Dokładna postać pierwiastków x = (−b ± k√m) / 2a dla całkowitych a, b, c i Δ niebędącej kwadratem
function exactRoots(a, b, c, D) {
  if (![a, b, c, D].every(Number.isInteger) || D <= 0) return '';
  const [k, m] = sqrtSimplify(D); if (m === 1) return '';
  let n0 = -b, kk = k, den = 2 * a; const g = gcdI(gcdI(n0, kk), den) || 1; n0 /= g; kk /= g; den /= g;
  if (den < 0) { den = -den; n0 = -n0; }
  const rad = `${kk === 1 ? '' : kk}\\sqrt{${m}}`, num = n0 === 0 ? `\\pm ${rad}` : `${n0} \\pm ${rad}`;
  return `x_{1,2} = ${den === 1 ? num : `\\frac{${num}}{${den}}`} `;
}

/* ---------- rozwiązywanie lokalne ---------- */
function splitRel(s) {
  const m = /(<=|>=|≤|≥|=|<|>)/.exec(s); if (!m) return null;
  const rest = s.slice(m.index + m[0].length); if (/(<=|>=|≤|≥|=|<|>)/.test(rest)) return null;
  return { L: s.slice(0, m.index), R: rest, op: { '≤': '<=', '≥': '>=' }[m[0]] || m[0] };
}
function polyFromExpr(expr, v) {
  const row = MD.parseRow(expr, {}); if (!row.ast) return null;
  const ctx = MD.makeCtx({}, {}, false), f = x => { ctx.x = x; ctx.v = { [v]: x }; return MD.evalAst(row.ast, ctx); };
  const c = f(0), p1 = f(1), m1 = f(-1);
  if (![c, p1, m1].every(Number.isFinite)) return null;
  const a = (p1 + m1) / 2 - c, b = (p1 - m1) / 2;
  for (const x of [2, -3, 0.7, 5.3, -8.1]) { const y = f(x), e = a * x * x + b * x + c; if (!Number.isFinite(y) || Math.abs(y - e) > 1e-7 * Math.max(1, Math.abs(y))) return null; }
  const z = k => Math.abs(k) < 1e-10 ? 0 : k;
  return { a: z(a), b: z(b), c: z(c) };
}
/* układ dwóch równań liniowych z x i y (wzory Cramera) */
function linXY(side) {
  const row = MD.parseRow(side, {}); if (!row.ast) return null;
  const ctx = MD.makeCtx({}, {}, false), f = (x, y) => { ctx.x = x; ctx.y = y; return MD.evalAst(row.ast, ctx); };
  const c = f(0, 0), a = f(1, 0) - c, b = f(0, 1) - c;
  if (![a, b, c].every(Number.isFinite)) return null;
  for (const [x, y] of [[2, 3], [-1.5, 4], [5, -2.5]]) { const v = f(x, y); if (!Number.isFinite(v) || Math.abs(v - (a * x + b * y + c)) > 1e-7 * Math.max(1, Math.abs(v))) return null; }
  const z = k => Math.abs(k) < 1e-10 ? 0 : k;
  return [z(a), z(b), z(c)];
}
function localSystem(src) {
  let s = src.replace(/^\s*(układ|uklad|system)\s*(równań|rownan|of equations)?\s*:?/i, '').replace(/[{}]/g, '').replace(/²/g, '^2');
  const parts = s.split(/[;\n]|,(?![^(]*\))/).map(p => p.trim()).filter(Boolean);
  if (parts.length !== 2 || !parts.every(p => (p.match(/=/g) || []).length === 1 && !/[<>]/.test(p))) return null;
  const co = parts.map(p => { const [L, R] = p.split('='); return linXY(`(${L})-(${R})`); });
  if (co.some(c => !c)) return null;
  // a x + b y + c = 0  ->  a x + b y = -c
  const [a1, b1, c1] = co[0], [a2, b2, c2] = co[1], d1 = -c1, d2 = -c2;
  const W = a1 * b2 - a2 * b1, Wx = d1 * b2 - d2 * b1, Wy = a1 * d2 - a2 * d1;
  const eqTex = (a, b, d) => `${[a ? `${a === 1 ? '' : a === -1 ? '-' : tx(a)}x` : '', b ? `${b < 0 ? '-' : (a ? '+' : '')}${Math.abs(b) === 1 ? '' : tx(Math.abs(b))}y` : ''].join('') || '0'} = ${tx(d)}`;
  const steps = [{ title: MD.tr('Zapisuję układ'), explain: MD.tr('Każde równanie zapisuję w postaci ax + by = c.'), tex: `${eqTex(a1, b1, d1)}\\quad\\text{;}\\quad ${eqTex(a2, b2, d2)}` }];
  steps.push({ title: MD.tr('Obliczam wyznaczniki (wzory Cramera)'), explain: MD.tr('W to wyznacznik główny, Wx i Wy powstają przez podmianę kolumny.'), tex: `W = ${txp(a1)}\\cdot${txp(b2)} - ${txp(a2)}\\cdot${txp(b1)} = ${tx(W)},\\quad W_x = ${tx(Wx)},\\quad W_y = ${tx(Wy)}` });
  let answer, graph = [];
  const gl = (a, b, d) => b ? `y=(${d}-(${a})x)/(${b})` : `x=${d / a}`;
  graph = [gl(a1, b1, d1), gl(a2, b2, d2)];
  if (Math.abs(W) > 1e-12) {
    const x = Wx / W, y = Wy / W;
    steps.push({ title: MD.tr('Jedno rozwiązanie'), explain: MD.tr('Gdy W ≠ 0, układ ma dokładnie jedno rozwiązanie: x = Wx / W, y = Wy / W.'), tex: `x = \\frac{W_x}{W} = ${tx(x)},\\quad y = \\frac{W_y}{W} = ${tx(y)}` });
    answer = `x = ${tx(x)},\\quad y = ${tx(y)}`; graph.push(`(${x},${y})`);
  } else if (Math.abs(Wx) < 1e-12 && Math.abs(Wy) < 1e-12) {
    steps.push({ title: MD.tr('W = 0 i Wx = Wy = 0'), explain: MD.tr('Układ jest nieoznaczony — proste się pokrywają.'), tex: '' });
    answer = `\\text{${MD.tr('nieskończenie wiele rozwiązań')}}`;
  } else {
    steps.push({ title: MD.tr('W = 0, ale Wx lub Wy ≠ 0'), explain: MD.tr('Układ jest sprzeczny — proste są równoległe.'), tex: '' });
    answer = `\\text{${MD.tr('brak rozwiązań')}}`;
  }
  return { title: MD.tr('Układ dwóch równań liniowych'), answer, steps: steps.map(s => (s.tex ? s : { ...s, tex: '' })), graph, local: true };
}
/* równanie z jedną niewiadomą x (nie wielomian): miejsca zerowe numerycznie */
function localNumeric(rel) {
  if (rel.op !== '=') return null;
  const f = MD.parseRow(`(${rel.L})-(${rel.R})`, {}); if (!f.ast) return null;
  const ctx = MD.makeCtx({}, {}, false), g = x => { ctx.x = x; return MD.evalAst(f.ast, ctx); };
  let roots = MD.findRoots(g, -50, 50, 8000).filter(r => Math.abs(g(r)) < 1e-4);
  if (!roots.length) return null;
  const many = roots.length > 8;
  if (many) roots = roots.sort((p, q) => Math.abs(p) - Math.abs(q)).slice(0, 8).sort((p, q) => p - q);
  const shown = roots.map(r => MD.fmtNum(r, 6));
  return {
    title: MD.tr('Równanie — rozwiązanie przybliżone'),
    answer: `x \\approx ${shown.join(';\\ ')}`,
    steps: [
      { title: MD.tr('Przekształcam do postaci f(x) = 0'), explain: MD.tr('Przenoszę wszystko na lewą stronę.'), tex: `${toTex(rel.L)} - (${toTex(rel.R)}) = 0` },
      { title: MD.tr('Szukam miejsc zerowych numerycznie'), explain: MD.tr('Skanuję przedział [−50, 50], wykrywam zmiany znaku i zawężam je metodą bisekcji.'), tex: `x \\approx ${shown.join(';\\ ')}` }
    ],
    note: MD.tr('To wartości przybliżone w przedziale [−50, 50]. Dokładne przekształcenia pokaże „Wyjaśnij z AI”.') + (many ? ' ' + MD.tr('Rozwiązań jest więcej (np. okresowych) — pokazano te najbliższe zera.') : ''),
    graph: [`y=(${rel.L})-(${rel.R})`], local: true
  };
}
function localSolve(src) {
  const sysTry = /układ|system|;|\{|\n/i.test(src) || (src.match(/=/g) || []).length >= 2 ? (() => { try { return localSystem(src); } catch (e) { return null; } })() : null;
  if (sysTry) return sysTry;
  let s = src.trim().replace(/²/g, '^2').replace(/³/g, '^3');
  if (!s || s.includes('\n') || /[;{}]|układ|system|pochodn|deriv|całk|integr|oblicz|calcul|find|pole|area|\bile\b|how many|znajd|rozwi|solve|zadan|problem/i.test(s)) return null;
  const rel = splitRel(s);
  if (!rel) { // wyrażenie liczbowe
    const row = MD.parseRow(s, {});
    if (row.kind !== 'expr' || row.usesX || row.usesY) return null;
    const ctx = MD.makeCtx({}, {}, false), val = MD.evalAst(row.ast, ctx);
    if (!Number.isFinite(val)) return null;
    return { title: MD.tr('Obliczenie wartości wyrażenia'), answer: `${toTex(s)} = ${tx(val)}`, steps: [{ title: MD.tr('Wartość wyrażenia'), explain: MD.tr('Wykonuję działania w kolejności: nawiasy, potęgi i pierwiastki, mnożenie i dzielenie, dodawanie i odejmowanie.'), tex: `${toTex(s)} = ${tx(val)}` + (frac(val) ? '' : ` \\approx ${MD.fmtNum(val, 6)}`) }], graph: [], local: true };
  }
  const vars = new Set(); for (const side of [rel.L, rel.R]) { const r = MD.parseRow(side, {}); const fv = new Set(); if (r.ast) MD.freeVars(r.ast, fv); if (r.usesX) fv.add('x'); if (r.usesY) fv.add('y'); fv.forEach(n => vars.add(n)); }
  if (vars.size !== 1) return null;
  const v = [...vars][0]; if (v !== 'x') return null;
  const p = polyFromExpr(`(${rel.L})-(${rel.R})`, v); if (!p) return localNumeric(rel);
  const { a, b, c } = p, eq = rel.op === '=';
  const lhs = polyTex(a, b, c), relTex = { '=': '=', '<': '<', '>': '>', '<=': '\\leq', '>=': '\\geq' }[rel.op];
  const steps = [];
  steps.push({ title: MD.tr('Zapisuję równanie w postaci standardowej'), explain: MD.tr('Przenoszę wszystko na lewą stronę, aby po prawej było zero.'), tex: `${lhs} ${relTex} 0` });
  const graph = [`y=${polyTex(a, b, c).replace(/\\frac\{(-?\d+)\}\{(\d+)\}/g, '($1/$2)').replace(/\^\{2\}/g, '^2').replace(/\{,\}/g, '.')}`.replace(/ /g, '')];
  let roots = [], answer = '', kind;
  if (a === 0 && b === 0) {
    const ok = eq ? c === 0 : (rel.op === '<' ? c < 0 : rel.op === '>' ? c > 0 : rel.op === '<=' ? c <= 0 : c >= 0);
    steps.push({ title: MD.tr('Obie strony nie zawierają x'), explain: ok ? MD.tr('Zdanie jest prawdziwe dla każdego x.') : MD.tr('Zdanie jest fałszywe dla każdego x.'), tex: `${tx(c)} ${relTex} 0` });
    answer = ok ? 'x \\in \\mathbb{R}' : '\\text{' + MD.tr('brak rozwiązań') + '}';
    return { title: MD.tr('Równanie bez niewiadomej'), answer, steps, graph: [], local: true };
  }
  if (a === 0) { // liniowe
    kind = 1; const x0 = -c / b;
    steps.push({ title: MD.tr('Przenoszę wyraz wolny'), explain: MD.tr('Dodaję/odejmuję po obu stronach tyle samo, aby x zostało samo po lewej.'), tex: `${polyTex(0, b, 0)} = ${tx(-c)}` });
    const flip = b < 0 && !eq;
    steps.push({ title: MD.tr('Dzielę przez współczynnik przy x'), explain: b < 0 && !eq ? MD.tr('Dzielę przez liczbę ujemną, więc zmieniam zwrot nierówności na przeciwny.') : MD.tr('Dzielę obie strony przez współczynnik przy x.'), tex: `x ${flip ? { '<': '>', '>': '<', '<=': '\\geq', '>=': '\\leq' }[rel.op] : relTex} \\frac{${tx(-c)}}{${txp(b)}} = ${tx(x0)}` });
    if (eq) { roots = [x0]; answer = `x = ${tx(x0)}`; }
    else { const op = flip ? { '<': '>', '>': '<', '<=': '>=', '>=': '<=' }[rel.op] : rel.op; const lt = op[0] === '<'; const cl = op.length === 2; answer = lt ? `x \\in (-\\infty;\\, ${tx(x0)}${cl ? ']' : ')'}` : `x \\in ${cl ? '[' : '('}${tx(x0)};\\, +\\infty)`; }
  } else { // kwadratowe
    kind = 2; const D = b * b - 4 * a * c;
    steps.push({ title: MD.tr('Odczytuję współczynniki'), explain: MD.tr('Dla ax² + bx + c = 0 odczytuję a, b i c.'), tex: `a = ${tx(a)},\\quad b = ${tx(b)},\\quad c = ${tx(c)}` });
    steps.push({ title: MD.tr('Obliczam wyróżnik Δ'), explain: MD.tr('Delta mówi, ile jest rozwiązań rzeczywistych.'), tex: `\\Delta = b^{2} - 4ac = ${txp(b)}^{2} - 4 \\cdot ${txp(a)} \\cdot ${txp(c)} = ${tx(D)}` });
    if (Math.abs(D) < 1e-12) {
      const x0 = -b / (2 * a); roots = [x0];
      steps.push({ title: MD.tr('Δ = 0 — jedno rozwiązanie (podwójne)'), explain: MD.tr('Wzór: x₀ = −b / 2a.'), tex: `x_0 = \\frac{-b}{2a} = \\frac{${tx(-b)}}{${tx(2 * a)}} = ${tx(x0)}` });
    } else if (D < 0) {
      steps.push({ title: MD.tr('Δ < 0 — brak rozwiązań rzeczywistych'), explain: MD.tr('Parabola nie przecina osi OX. W liczbach zespolonych rozwiązania są sprzężone.'), tex: `x_{1,2} = \\frac{${tx(-b)} \\pm i\\sqrt{${tx(-D)}}}{${tx(2 * a)}}` });
    } else {
      const sq = Math.sqrt(D), x1 = (-b - sq) / (2 * a), x2 = (-b + sq) / (2 * a); roots = [x1, x2].sort((p, q) => p - q);
      const sf = frac(sq);
      let exact;
      if (sf && sf[1] === 1) exact = `\\sqrt{\\Delta} = ${sf[0]}`; else if (Number.isInteger(D)) { const [k, m] = sqrtSimplify(D); exact = k > 1 ? `\\sqrt{\\Delta} = ${k}\\sqrt{${m}} \\approx ${MD.fmtNum(sq, 5)}` : `\\sqrt{\\Delta} = \\sqrt{${D}} \\approx ${MD.fmtNum(sq, 5)}`; } else exact = `\\sqrt{\\Delta} \\approx ${MD.fmtNum(sq, 5)}`;
      steps.push({ title: MD.tr('Δ > 0 — dwa rozwiązania'), explain: MD.tr('Wzór: x = (−b ± √Δ) / 2a.'), tex: `${exact}` });
      steps.push({ title: MD.tr('Podstawiam do wzoru'), explain: '', tex: `x_1 = \\frac{${tx(-b)} - \\sqrt{\\Delta}}{${tx(2 * a)}} = ${tx(x1)},\\quad x_2 = \\frac{${tx(-b)} + \\sqrt{\\Delta}}{${tx(2 * a)}} = ${tx(x2)}` });
      if (!(sf && sf[1] === 1)) steps[steps.length - 1].tex += ` \\quad (\\approx ${MD.fmtNum(x1, 5)};\\ ${MD.fmtNum(x2, 5)})`;
    }
    const ex = exactRoots(a, b, c, D);
    if (eq) answer = roots.length === 2 ? (ex ? `${ex}\\approx ${MD.fmtNum(roots[0], 5)};\\ ${MD.fmtNum(roots[1], 5)}` : `x_1 = ${tx(roots[0])},\\quad x_2 = ${tx(roots[1])}`) : roots.length === 1 ? `x = ${tx(roots[0])}` : `\\text{${MD.tr('brak rozwiązań rzeczywistych')}}`;
    else {
      // znak trójmianu: wybierz przedziały
      const pos = rel.op[0] === '>', closed = rel.op.length === 2, dirUp = a > 0;
      const want = pos; // szukamy f > 0 (lub < 0)
      const test = x => (a * x * x + b * x + c);
      let ans;
      if (roots.length === 0) { const sign = test(0); const holds = pos ? sign > 0 : sign < 0; ans = holds ? 'x \\in \\mathbb{R}' : '\\varnothing'; }
      else if (roots.length === 1) {
        const r0 = roots[0], holds = pos ? a > 0 : a < 0;
        ans = holds ? (closed ? 'x \\in \\mathbb{R}' : `x \\in \\mathbb{R} \\setminus \\{${tx(r0)}\\}`) : (closed ? `x = ${tx(r0)}` : '\\varnothing');
      } else {
        const [r1, r2] = roots, inside = pos ? a < 0 : a > 0, lb = closed ? '[' : '(', rb = closed ? ']' : ')';
        ans = inside ? `x \\in ${lb}${tx(r1)};\\, ${tx(r2)}${rb}` : `x \\in (-\\infty;\\, ${tx(r1)}${closed ? ']' : ')'} \\cup ${closed ? '[' : '('}${tx(r2)};\\, +\\infty)`;
      }
      steps.push({ title: MD.tr('Czytam znak z paraboli'), explain: a > 0 ? MD.tr('Ramiona paraboli idą w górę (a > 0): wartości dodatnie są na zewnątrz miejsc zerowych, ujemne — między nimi.') : MD.tr('Ramiona paraboli idą w dół (a < 0): wartości dodatnie są między miejscami zerowymi, ujemne — na zewnątrz.'), tex: roots.length ? `x_{${roots.length === 1 ? '0' : '1,2'}} = ${roots.map(tx).join(',\\ ')}` : '\\Delta < 0' });
      answer = ans;
    }
  }
  return { title: kind === 1 ? (eq ? MD.tr('Równanie liniowe') : MD.tr('Nierówność liniowa')) : (eq ? MD.tr('Równanie kwadratowe') : MD.tr('Nierówność kwadratowa')), answer, steps, graph, local: true };
}

/* ---------- AI ---------- */
function codeHeader() { try { return localStorage.getItem('mathdocs.code') || ''; } catch (e) { return ''; } }
async function askAI(q, retried) {
  const body = { q, lang: MD.lang() };
  if (image) body.image = image;
  const r = await fetch('/api/solve', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-access-code': codeHeader() }, body: JSON.stringify(body) });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (r.status === 401 && !retried) {
    const c = prompt(MD.tr('Podaj kod dostępu do AI:'));
    if (c) { try { localStorage.setItem('mathdocs.code', c.trim()); } catch (e) {} return askAI(q, true); }
  }
  if (!r.ok) throw new Error(j.error || (MD.tf('Błąd usługi AI ({0}).', r.status)));
  return j;
}

/* ---------- widok wyniku ---------- */
const texBox = (t, size) => { try { return `<div class="texbox">${MD.texHTML(t, size || 22)}</div>`; } catch (e) { return `<div class="texbox"><code>${MD.esc(t)}</code></div>`; } };
function renderResult(res, q) {
  let h = '';
  const esc = MD.esc;
  if (res.title) h += `<div class="sbar"><b>${esc(res.title)}</b>${res.local ? `<span>· ${MD.tr('obliczono na urządzeniu')}</span>` : `<span>· ${MD.tr('rozwiązanie AI — sprawdź wynik')}</span>`}</div>`;
  (res.steps || []).forEach((s, i) => {
    h += `<div class="scard"><h4><span class="sn">${i + 1}</span>${esc(s.title || '')}</h4>${s.explain ? `<p>${esc(s.explain)}</p>` : ''}${s.tex ? texBox(s.tex) : ''}</div>`;
  });
  if (res.answer) h += `<div class="scard answer"><h4>${MD.tr('Odpowiedź')}</h4>${texBox(res.answer, 26)}</div>`;
  if (res.note) h += `<div class="scard warn"><p>${esc(res.note)}</p></div>`;
  h += `<div class="srow">${res.graph && res.graph.length ? `<button class="btn" data-a="graph"><i data-i="graph"></i><span>${MD.tr('Pokaż na wykresie')}</span></button>` : ''}<button class="btn" data-a="ai"><i data-i="spark"></i><span>${MD.tr('Wyjaśnij z AI')}</span></button><button class="btn" data-a="copy"><span>${MD.tr('Kopiuj odpowiedź')}</span></button></div>`;
  outEl.innerHTML = h; MD.fillIcons(outEl);
  outEl.__res = res; outEl.__q = q;
}
outEl.addEventListener('click', e => {
  const b = e.target.closest('[data-a]'); if (!b) return; const a = b.dataset.a, res = outEl.__res;
  if (a === 'graph' && res) MD.graph.show(res.graph);
  else if (a === 'ai') run(true);
  else if (a === 'copy' && res) { try { navigator.clipboard.writeText(res.answer || ''); MD.toast('Skopiowano'); } catch (e2) { MD.toast('Nie udało się skopiować'); } }
});
function showErr(m) { outEl.innerHTML = `<div class="scard err"><p>${MD.esc(m)}</p></div>`; }
function addHist(q) {
  const h = MD.S.solve.hist = (MD.S.solve.hist || []).filter(x => x !== q); h.unshift(q); h.length = Math.min(h.length, MAXH); MD.save(); buildHist();
}
function buildHist() {
  const h = MD.S.solve.hist || []; histEl.innerHTML = h.length ? `<small>${MD.tr('Ostatnie zadania')}</small>` : '';
  h.forEach(q => { const b = document.createElement('button'); b.textContent = q; b.setAttribute('data-notr', ''); b.onclick = () => { inEl.value = q; inEl.focus(); }; histEl.appendChild(b); });
}
async function run(forceAI) {
  if (busy) return;
  const q = inEl.value.trim();
  if (!q && !image) { MD.toast('Wpisz zadanie albo dodaj zdjęcie'); return; }
  if (!forceAI && !image) {
    let loc = null; try { loc = localSolve(q); } catch (e) { loc = null; }
    if (loc) { renderResult(loc, q); addHist(q); return; }
  }
  busy = true; $('#sGo').disabled = $('#sAi').disabled = true;
  outEl.innerHTML = `<div class="scard"><div class="thinking"><i></i><i></i><i></i></div><p class="muted">${MD.tr('AI rozwiązuje zadanie…')}</p></div>`;
  try {
    const j = await askAI(q || MD.tr('Rozwiąż zadanie ze zdjęcia.'));
    renderResult({ title: j.title, answer: j.answer, steps: j.steps || [], graph: j.graph || [], note: j.note, local: false }, q);
    if (q) addHist(q);
  } catch (e) {
    let msg = e.message || String(e);
    if (/Failed to fetch|NetworkError|Load failed/i.test(msg)) msg = MD.tr('Brak połączenia z usługą AI. Proste równania liczę lokalnie, resztę rozwiąże AI po wdrożeniu na Vercel.');
    showErr(msg);
  } finally { busy = false; $('#sGo').disabled = $('#sAi').disabled = false; }
}
/* ---------- zdjęcie ---------- */
function setImage(file) {
  if (!file) return;
  const rd = new FileReader();
  rd.onload = () => {
    const im = new Image();
    im.onload = () => {
      const k = Math.min(1, 1280 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k);
      const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); g.drawImage(im, 0, 0, c.width, c.height);
      const url = c.toDataURL('image/jpeg', 0.85); image = { media_type: 'image/jpeg', data: url.split(',')[1] };
      prevEl.hidden = false; prevEl.querySelector('img').src = url;
    };
    im.onerror = () => MD.toast('Nie udało się wczytać obrazu'); im.src = rd.result;
  };
  rd.readAsDataURL(file);
}
function clearImage() { image = null; prevEl.hidden = true; prevEl.querySelector('img').removeAttribute('src'); }

function buildExamples() {
  const el = $('#sExamples'); el.innerHTML = '';
  EXAMPLES.forEach(s => { const b = document.createElement('button'); b.className = 'chip'; b.textContent = MD.tr(s); b.onclick = () => { inEl.value = MD.tr(s); inEl.focus(); }; b.setAttribute('data-notr', ''); el.appendChild(b); });
}
MD.tabs.solve = {
  show() { buildHist(); },
  resize() {}, png: null,
  clear() { inEl.value = ''; clearImage(); outEl.innerHTML = ''; MD.S.solve.hist = []; MD.save(); buildHist(); }
};
MD.initSolver = () => {
  $('#sGo').onclick = () => run(false); $('#sAi').onclick = () => run(true);
  $('#sImg').onclick = () => $('#sFile').click(); $('#sFile').onchange = e => { setImage(e.target.files[0]); e.target.value = ''; };
  $('#sPrevX').onclick = clearImage;
  $('#sClear').onclick = () => { inEl.value = ''; clearImage(); outEl.innerHTML = ''; inEl.focus(); };
  inEl.addEventListener('keydown', e => { if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); run(false); } });
  if (!MD.S.solve) MD.S.solve = { hist: [] };
  buildExamples(); buildHist();
  MD.onLang.push(() => { buildExamples(); buildHist(); });
  if (window.__solveTest) window.__solveTest.localSolve = localSolve;
};
MD._localSolve = localSolve;
})();
