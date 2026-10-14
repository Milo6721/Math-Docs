// Math Docs — rdzeń aplikacji: stan, zakładki, menu, ikony, tłumaczenia PL/EN, eksport/import.
(() => {
'use strict';
const MD = window.MD = window.MD || {};
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
MD.$ = $; MD.$$ = $$;
const EN = window.MATHDOCS_EN || {};
let LANG = 'pl';
try { LANG = localStorage.getItem('mathdocs.lang') || ((navigator.language || '').toLowerCase().startsWith('pl') ? 'pl' : 'en'); } catch (e) {}

/* ---------- tłumaczenia ---------- */
const trKey = s => s.replace(/\s+/g, ' ').trim();
MD.lang = () => LANG;
MD.tr = s => (LANG === 'en' && EN[s] !== undefined) ? EN[s] : s;
MD.tf = (s, ...a) => MD.tr(s).replace(/\{(\d+)\}/g, (_, i) => a[+i]);
const TR_ATTRS = ['title', 'placeholder', 'aria-label'];
const trSkip = el => !el || !!(el.closest && el.closest('canvas,textarea,script,style,[data-notr],.fct,.tex'));
const trSkipAttr = el => !el || !!(el.closest && el.closest('[data-notr]'));
function trNode(n) {
  const raw = n.nodeValue; if (!raw || !/\S/.test(raw)) return;
  const core = raw.trim(), at = raw.indexOf(core), lead = raw.slice(0, at), trail = raw.slice(at + core.length), key = trKey(core);
  let pl = n.__pl;
  if (pl !== undefined && key !== pl && key !== EN[pl]) pl = undefined;
  if (pl === undefined) { if (EN[key] === undefined) return; pl = key; }
  n.__pl = pl;
  const want = LANG === 'en' ? EN[pl] : pl;
  if (key !== want) n.nodeValue = lead + want + trail;
}
function trAttrs(el) {
  if (!el.hasAttribute) return;
  for (const a of TR_ATTRS) {
    if (!el.hasAttribute(a)) continue;
    const st = el.__pla || (el.__pla = {}), cur = el.getAttribute(a), key = trKey(cur); let pl = st[a];
    if (pl !== undefined && key !== pl && key !== EN[pl]) pl = undefined;
    if (pl === undefined) { if (EN[key] === undefined) continue; pl = key; }
    st[a] = pl; const want = LANG === 'en' ? EN[pl] : pl; if (key !== want) el.setAttribute(a, want);
  }
}
function trTree(root) {
  if (!root) return;
  if (root.nodeType === 3) { if (!trSkip(root.parentElement)) trNode(root); return; }
  if (root.nodeType !== 1 || trSkipAttr(root)) return;
  trAttrs(root);
  root.querySelectorAll('[title],[placeholder],[aria-label]').forEach(el => { if (!trSkipAttr(el)) trAttrs(el); });
  const tw = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let n;
  while ((n = tw.nextNode())) if (!trSkip(n.parentElement)) trNode(n);
}
const trOpts = { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: TR_ATTRS };
const trMO = new MutationObserver(recs => {
  trMO.disconnect();
  try {
    for (const r of recs) {
      if (r.type === 'childList') r.addedNodes.forEach(n => trTree(n));
      else if (r.type === 'characterData') { if (!trSkip(r.target.parentElement)) trNode(r.target); }
      else if (r.type === 'attributes') { if (!trSkipAttr(r.target)) trAttrs(r.target); }
    }
  } finally { trMO.observe(document.body, trOpts); }
});
MD.setLang = l => {
  LANG = l === 'en' ? 'en' : 'pl';
  try { localStorage.setItem('mathdocs.lang', LANG); } catch (e) {}
  document.documentElement.lang = LANG;
  document.title = MD.tr('Math Docs — pracownia matematyczna');
  $$('#langBtn .lg').forEach(s => s.classList.toggle('on', s.dataset.l === LANG));
  trMO.disconnect(); trTree(document.body); trMO.observe(document.body, trOpts);
  (MD.onLang || []).forEach(f => { try { f(); } catch (e) { console.error(e); } });
};

/* ---------- ikony ---------- */
const P = {
  graph: '<path d="M3 20V4M3 20h18"/><path d="M5 16c3 0 3-9 7-9s3 9 7 9"/>',
  geo: '<path d="M12 4 3 19h18z"/><circle cx="12" cy="4" r="1.6" fill="currentColor"/><circle cx="3" cy="19" r="1.6" fill="currentColor"/><circle cx="21" cy="19" r="1.6" fill="currentColor"/>',
  solve: '<path d="M5 6h6M8 3v6M14 7h6M5 17h6M14 15l6 6M20 15l-6 6"/>',
  formulas: '<path d="M7 4h10M7 4l7 8-7 8h10"/>',
  dl: '<path d="M12 4v11M7 11l5 5 5-5M5 20h14"/>',
  chev: '<path d="m6 9 6 6 6-6"/>',
  help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9.5a2.5 2.5 0 1 1 3.6 2.2c-.7.4-1.1.9-1.1 1.8M12 17h.01"/>',
  plus: '<path d="M12 5v14M5 12h14"/>', minus: '<path d="M5 12h14"/>',
  fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
  grid: '<path d="M4 4h16v16H4zM4 12h16M12 4v16"/>',
  list: '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/>',
  undo: '<path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="m15 14 5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  spark: '<path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.7"/><path d="m21 16-5-5-8 9"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3"/>',
  move: '<path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3"/>',
  point: '<circle cx="12" cy="12" r="3.2" fill="currentColor"/>',
  segment: '<path d="M5 19 19 5"/><circle cx="5" cy="19" r="2" fill="currentColor"/><circle cx="19" cy="5" r="2" fill="currentColor"/>',
  line: '<path d="M3 20 21 4"/><circle cx="8" cy="16" r="1.8" fill="currentColor"/><circle cx="16" cy="9" r="1.8" fill="currentColor"/>',
  ray: '<path d="M6 18 21 5"/><circle cx="6" cy="18" r="2" fill="currentColor"/>',
  circle: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="1.6" fill="currentColor"/>',
  circle3: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="4" r="1.5" fill="currentColor"/><circle cx="5" cy="16" r="1.5" fill="currentColor"/><circle cx="19" cy="16" r="1.5" fill="currentColor"/>',
  polygon: '<path d="M12 3 21 10l-3.5 11h-11L3 10z"/>',
  mid: '<path d="M4 18 20 6"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/>',
  perp: '<path d="M3 17h18M12 17V4"/><path d="M12 13h4v4"/>',
  par: '<path d="M4 9 20 5M4 19l16-4"/>',
  bisect: '<path d="M4 20 20 20M4 20 18 6M4 20 20 12"/>',
  inter: '<path d="M4 6 20 18M4 18 20 6"/><circle cx="12" cy="12" r="2.2" fill="currentColor"/>',
  angle: '<path d="M4 20 20 20M4 20 17 7"/><path d="M12 20a8 8 0 0 0-3-6"/>',
  dist: '<path d="M4 12h16M4 8v8M20 8v8"/>',
  reflect: '<path d="M12 3v18" stroke-dasharray="2 3"/><path d="M4 8l5 4-5 4zM20 8l-5 4 5 4z"/>',
  tangent: '<circle cx="12" cy="14" r="6"/><path d="M3 8h18"/>',
  target: '<circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/>',
  eraser:'<path d="m4 16 9-9 7 7-5 5H8zM9 21h11"/>'
};
MD.icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[n] || ''}</svg>`;
MD.fillIcons = root => $$('i[data-i]', root || document).forEach(i => { if (!i.firstChild) i.innerHTML = MD.icon(i.dataset.i); });

/* ---------- stan i zapis ---------- */
const KEY = 'mathdocs.v1';
MD.S = { graph: null, geo: null, solve: { hist: [] }, tab: 'graph' };
MD.load = () => { try { const j = JSON.parse(localStorage.getItem(KEY) || 'null'); if (j && typeof j === 'object') Object.assign(MD.S, j); } catch (e) {} };
let saveT = 0;
MD.save = () => { clearTimeout(saveT); saveT = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(MD.S)); } catch (e) {} }, 300); };

/* ---------- toast ---------- */
let toastT = 0;
MD.toast = (m, ms = 2400) => { const t = $('#toast'); t.textContent = MD.tr(m); t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), ms); };

/* ---------- zakładki ---------- */
MD.tabs = {}; // name -> {show(), hide(), png(), clear(), resize()}
MD.setTab = name => {
  if (!MD.tabs[name]) name = 'graph';
  MD.S.tab = name;
  $$('#mainTabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === name));
  $$('.view').forEach(v => v.classList.toggle('on', v.id === 'v-' + name));
  const t = MD.tabs[name]; if (t && t.show) t.show();
  MD.save();
  try { history.replaceState(null, '', '#' + name); } catch (e) {}
};
MD.onLang = [];

/* ---------- pomoce wspólne ---------- */
MD.download = (name, blob) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500); };
MD.canvasPNG = (cv, name) => cv.toBlob(b => b && MD.download(name, b), 'image/png');
MD.COLORS = ['#14A3A8', '#2D6CDF', '#7048E8', '#F08C00', '#C92A2A', '#0C8599', '#B8860B', '#D6336C'];
MD.nice = v => { // ładny krok siatki
  const e = Math.floor(Math.log10(v)), f = v / Math.pow(10, e);
  return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * Math.pow(10, e);
};
// Przygotowanie canvasu o ostrości retina
MD.fitCanvas = cv => {
  const r = cv.parentElement.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(10, Math.round(r.width)), h = Math.max(10, Math.round(r.height));
  if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) { cv.width = Math.round(w * d); cv.height = Math.round(h * d); }
  const g = cv.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
  return { g, w, h, d };
};

/* ---------- init interfejsu ---------- */
MD.initApp = () => {
  MD.fillIcons();
  $$('#mainTabs button').forEach(b => b.onclick = () => MD.setTab(b.dataset.tab));
  // menu Plik
  const m = $('#mFile');
  m.querySelector('[data-menu]').onclick = e => { e.stopPropagation(); m.classList.toggle('open'); };
  document.addEventListener('click', e => { if (!m.contains(e.target)) m.classList.remove('open'); });
  $$('#mFile .drop button').forEach(b => b.onclick = () => { m.classList.remove('open'); fileAct(b.dataset.act); });
  $$('[data-close]').forEach(b => b.onclick = () => b.closest('.side').classList.add('closed'));
  $('#langBtn').onclick = () => MD.setLang(LANG === 'pl' ? 'en' : 'pl');
  $('#helpBtn').onclick = () => $('#helpDlg').showModal();
  $('#helpClose').onclick = () => $('#helpDlg').close();
  $('#fileIn').onchange = e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const rd = new FileReader();
    rd.onload = () => {
      try {
        const j = JSON.parse(rd.result);
        if (!j || j.app !== 'mathdocs') throw 0;
        MD.S.graph = j.graph || null; MD.S.geo = j.geo || null; MD.S.solve = j.solve || { hist: [] };
        MD.save(); MD.toast('Projekt wczytany'); setTimeout(() => location.reload(), 500);
      } catch (_) { MD.toast('To nie jest plik projektu Math Docs'); }
    };
    rd.readAsText(f);
  };
  window.addEventListener('resize', () => { const t = MD.tabs[MD.S.tab]; if (t && t.resize) t.resize(); });
};
function fileAct(a) {
  const t = MD.tabs[MD.S.tab] || {};
  if (a === 'png') { if (t.png) t.png(); else MD.toast('Ta zakładka nie ma widoku do zapisania'); }
  else if (a === 'json') {
    MD.save();
    const o = { app: 'mathdocs', v: 1, graph: MD.S.graph, geo: MD.S.geo, solve: MD.S.solve };
    MD.download('math-docs.json', new Blob([JSON.stringify(o)], { type: 'application/json' }));
  }
  else if (a === 'import') $('#fileIn').click();
  else if (a === 'clear') { if (t.clear && confirm(MD.tr('Wyczyścić bieżącą zakładkę?'))) t.clear(); }
}
})();
