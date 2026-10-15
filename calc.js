// Math Docs — kalkulator naukowy z historią (Ans, DEG/RAD, ułamki dziesiętne z przecinkiem).
(() => {
'use strict';
const MD = window.MD, { $, $$ } = MD;
const inEl = $('#cIn'), outEl = $('#cOut'), keysEl = $('#cKeys'), histEl = $('#cHist'), degBtn = $('#cDeg');
const KEYS = [
  ['sin', 'sin('], ['cos', 'cos('], ['tan', 'tan('], ['asin', 'asin('], ['acos', 'acos('],
  ['ln', 'ln('], ['log', 'log('], ['√', 'sqrt('], ['xʸ', '^'], ['n!', '!'],
  ['(', '('], [')', ')'], ['π', 'pi'], ['e', 'e'], ['Ans', 'ans'],
  ['7', '7'], ['8', '8'], ['9', '9'], ['÷', '/'], ['|x|', 'abs('],
  ['4', '4'], ['5', '5'], ['6', '6'], ['×', '*'], ['mod', 'mod('],
  ['1', '1'], ['2', '2'], ['3', '3'], ['−', '-'], ['%', '%'],
  ['0', '0'], [',', ','], ['⌫', 'BS'], ['+', '+'], ['=', 'EQ']
];
const S = () => (MD.S.calc = MD.S.calc || { hist: [], deg: false });
let ans = 0;

function evalSrc(src) {
  const row = MD.parseRow(src.replace(/\bans\b/gi, `(${ans})`), {});
  if (row.kind !== 'expr' || row.usesX || row.usesY) throw new Error(MD.tr('Wpisz działanie liczbowe'));
  const ctx = MD.makeCtx({ ans }, {}, S().deg);
  const v = MD.evalAst(row.ast, ctx);
  if (!Number.isFinite(v) && !Number.isNaN(v)) return v;
  if (Number.isNaN(v)) throw new Error(MD.tr('Wynik nie jest liczbą rzeczywistą'));
  return v;
}
const show = v => { let s = MD.fmtNum(v, 10); if (MD.lang() === 'pl') s = s.replace('.', ','); return s; };
function preview() {
  const q = inEl.value.trim(); outEl.classList.remove('err');
  if (!q) { outEl.textContent = ''; return; }
  try { outEl.textContent = '= ' + show(evalSrc(q)); } catch (e) { outEl.textContent = ''; }
}
function commit() {
  const q = inEl.value.trim(); if (!q) return;
  try {
    const v = evalSrc(q); ans = v;
    const h = S().hist; h.unshift({ q, r: show(v), v }); h.length = Math.min(h.length, 40);
    inEl.value = ''; outEl.textContent = '= ' + show(v); MD.save(); buildHist();
  } catch (e) { outEl.classList.add('err'); outEl.textContent = e.message; }
}
function insert(t) {
  const el = inEl, a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? a;
  el.value = el.value.slice(0, a) + t + el.value.slice(b);
  const p = a + t.length; el.setSelectionRange(p, p); el.focus(); preview();
}
function backspace() {
  const el = inEl, a = el.selectionStart ?? el.value.length, b = el.selectionEnd ?? a;
  if (a !== b) { el.value = el.value.slice(0, a) + el.value.slice(b); el.setSelectionRange(a, a); }
  else if (a > 0) { el.value = el.value.slice(0, a - 1) + el.value.slice(a); el.setSelectionRange(a - 1, a - 1); }
  el.focus(); preview();
}
function buildKeys() {
  keysEl.innerHTML = '';
  KEYS.forEach(([label, val]) => {
    const b = document.createElement('button'); b.textContent = label; b.setAttribute('data-notr', '');
    b.className = /^[0-9,]$/.test(label) ? 'num' : val === 'EQ' ? 'eq' : /^[+\-*/%]$/.test(val) ? 'op' : '';
    b.onclick = () => { if (val === 'BS') backspace(); else if (val === 'EQ') commit(); else insert(val); };
    keysEl.appendChild(b);
  });
}
function buildHist() {
  const h = S().hist; histEl.innerHTML = h.length ? `<small>${MD.tr('Historia')}</small>` : '';
  h.forEach(it => {
    const row = document.createElement('div'); row.className = 'hrow';
    const q = document.createElement('button'); q.textContent = it.q; q.title = MD.tr('Wstaw działanie'); q.setAttribute('data-notr', ''); q.onclick = () => insert(it.q);
    const r = document.createElement('button'); r.textContent = '= ' + it.r; r.className = 'res'; r.title = MD.tr('Wstaw wynik'); r.setAttribute('data-notr', ''); r.onclick = () => insert(it.r.replace(/,/g, '.'));
    row.appendChild(q); row.appendChild(r); histEl.appendChild(row);
  });
}
function setDeg() { degBtn.textContent = S().deg ? 'DEG' : 'RAD'; preview(); }
MD.tabs.calc = {
  show() { buildHist(); setTimeout(() => { if (!matchMedia('(pointer:coarse)').matches) inEl.focus(); }, 30); },
  resize() {}, png: null,
  clear() { S().hist = []; inEl.value = ''; outEl.textContent = ''; MD.save(); buildHist(); }
};
MD.initCalc = () => {
  S(); buildKeys(); buildHist(); setDeg();
  degBtn.onclick = () => { S().deg = !S().deg; MD.save(); setDeg(); };
  inEl.addEventListener('input', preview);
  inEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } });
  $('#cClearHist').onclick = () => MD.tabs.calc.clear();
  MD.onLang.push(() => { buildHist(); preview(); });
};
})();
