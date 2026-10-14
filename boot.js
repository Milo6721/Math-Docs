// Math Docs — start aplikacji.
(() => {
'use strict';
const MD = window.MD;
MD.load();
MD.initApp();
MD.initGraph();
MD.initGeo();
MD.initFormulas();
MD.initSolver();
const h = (location.hash || '').slice(1);
MD.setTab(MD.tabs[h] ? h : (MD.tabs[MD.S.tab] ? MD.S.tab : 'graph'));
MD.setLang(MD.lang());
if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { const t = MD.tabs[MD.S.tab]; if (t && t.resize) t.resize(); });
})();
