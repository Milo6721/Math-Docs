// Math Docs — silnik matematyczny: parser wyrażeń + składanie wzorów (podzbiór LaTeX).
(() => {
'use strict';
const MD = window.MD = window.MD || {};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const r1 = v => Math.round(v * 10) / 10;
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const FONTS = { sans: "Inter,'Segoe UI',system-ui,sans-serif", math: "'Cambria Math','Latin Modern Math','STIX Two Math','Times New Roman',Georgia,serif" };
const mctx = document.createElement('canvas').getContext('2d');
const measure = (t, size, font) => { mctx.font = `${size}px ${FONTS[font] || FONTS.sans}`; return mctx.measureText(t).width; };
const E = (s, ...a) => (MD.tf ? MD.tf(s, ...a) : s.replace(/\{(\d+)\}/g, (_, i) => a[+i]));

/* ===== składanie wzorów (LaTeX) — wspólne z Work Docs ===== */
/* wzory (podzbiór LaTeX) */
const TEX_GREEK={alpha:'α',beta:'β',gamma:'γ',delta:'δ',epsilon:'ε',varepsilon:'ε',zeta:'ζ',eta:'η',theta:'θ',iota:'ι',kappa:'κ',lambda:'λ',mu:'μ',nu:'ν',xi:'ξ',pi:'π',rho:'ρ',sigma:'σ',tau:'τ',upsilon:'υ',phi:'φ',varphi:'φ',chi:'χ',psi:'ψ',omega:'ω',Gamma:'Γ',Delta:'Δ',Theta:'Θ',Lambda:'Λ',Xi:'Ξ',Pi:'Π',Sigma:'Σ',Phi:'Φ',Psi:'Ψ',Omega:'Ω'};
const TEX_SYM={cdot:'·',times:'×',div:'÷',pm:'±',mp:'∓',leq:'≤',le:'≤',geq:'≥',ge:'≥',neq:'≠',ne:'≠',approx:'≈',equiv:'≡',sim:'∼',infty:'∞',to:'→',rightarrow:'→',leftarrow:'←',Rightarrow:'⇒',Leftrightarrow:'⇔',in:'∈',notin:'∉',subset:'⊂',cup:'∪',cap:'∩',forall:'∀',exists:'∃',partial:'∂',nabla:'∇',angle:'∠',triangle:'△',perp:'⟂',parallel:'∥',ldots:'…',cdots:'⋯',circ:'∘',degree:'°',prime:'′',emptyset:'∅',neg:'¬',land:'∧',lor:'∨',therefore:'∴',because:'∵',propto:'∝',cong:'≅',subseteq:'⊆',supseteq:'⊇',supset:'⊃',ll:'≪',gg:'≫',leftrightarrow:'↔',iff:'⇔',Leftarrow:'⇐',mid:'∣',star:'⋆',ast:'∗',bullet:'•',dots:'…',vdots:'⋮',lfloor:'⌊',rfloor:'⌋',lceil:'⌈',rceil:'⌉',sqcup:'⊔',oplus:'⊕',otimes:'⊗',nsubseteq:'⊈'};
const TEX_FN=new Set(['sin','cos','tan','cot','sec','csc','arcsin','arccos','arctan','sinh','cosh','tanh','ln','log','lg','exp','min','max','gcd','det','deg']);
const TEX_BIG={sum:['∑',1],prod:['∏',1],int:['∫',0],oint:['∮',0]};
function texParse(s){
  let i=0;
  const REL=new Set('=<>≤≥≠≈≡∼→←⇒⇔∈∉⊂'.split('')),BIN=new Set('+−·×÷±∓∪∩∘∧∨'.split(''));
  const isL=c=>/[A-Za-z]/.test(c||''),isD=c=>/[0-9.]/.test(c||'');
  const tn=(str,o={})=>({k:'t',s:str,it:false,pl:0,pr:0,...o});
  const opNode=(ch,out)=>{
    const prev=out[out.length-1];
    const unary=!prev||prev.k==='sp'||(prev.k==='t'&&(REL.has(prev.s)||BIN.has(prev.s)||(prev.s.length===1&&'([{,'.includes(prev.s))));
    if(REL.has(ch))return tn(ch,{pl:.28,pr:.28});
    if(BIN.has(ch))return unary&&'−+±∓'.includes(ch)?tn(ch):tn(ch,{pl:.22,pr:.22});
    if(ch===',')return tn(ch,{pr:.16});
    return tn(ch);
  };
  function arg(){
    while(s[i]===' ')i++;if(i>=s.length)return[];
    if(s[i]==='{'){i++;const a=seq('}');i++;return a;}
    return token([],true);
  }
  function raw(){while(s[i]===' ')i++;if(s[i]!=='{')return s[i]?s[i++]:'';i++;let j=s.indexOf('}',i);if(j<0)j=s.length;const r=s.slice(i,j);i=j+1;return r;}
  function cmd(out){
    i++;
    if(!isL(s[i])){const ch=s[i++]||'';if(ch===','||ch===';'||ch===' '||ch==='!')return[{k:'sp',w:ch===','?.17:ch==='!'?0:.28}];if(ch==='\\')return[{k:'sp',w:0}];return[tn(ch)];}
    let nm='';while(isL(s[i]))nm+=s[i++];
    if(nm==='frac'||nm==='dfrac'){const a=arg(),b=arg();return[{k:'frac',a,b}];}
    if(nm==='binom'){const a=arg(),b=arg();return[{k:'grp',a:[tn('('),{k:'frac',a,b,bar:false},tn(')')]}];}
    if(nm==='bar'||nm==='overline')return[{k:'over',a:arg(),t:'bar'}];
    if(nm==='vec')return[{k:'over',a:arg(),t:'vec'}];
    if(nm==='hat')return[{k:'over',a:arg(),t:'hat'}];
    if(nm==='mathbb'){const r=raw();return[tn({R:'ℝ',N:'ℕ',Z:'ℤ',Q:'ℚ',C:'ℂ'}[r]||r)];}
    if(nm==='sqrt'){let n=null;if(s[i]==='['){i++;n=seq(']');i++;}return[{k:'sqrt',n,a:arg()}];}
    if(nm==='text'||nm==='mathrm'||nm==='mbox')return[tn(raw())];
    if(nm==='left'||nm==='right'){if(s[i]==='.')i++;return[];}
    if(nm==='quad')return[{k:'sp',w:1}];if(nm==='qquad')return[{k:'sp',w:2}];
    if(TEX_BIG[nm])return[{k:'op',s:TEX_BIG[nm][0],lim:!!TEX_BIG[nm][1]}];
    if(nm==='lim')return[{k:'op',s:'lim',lim:true,txt:true}];
    if(TEX_FN.has(nm))return[tn(nm,{pr:.17})];
    if(TEX_GREEK[nm])return[tn(TEX_GREEK[nm],{it:nm[0]===nm[0].toLowerCase()})];
    if(TEX_SYM[nm])return[opNode(TEX_SYM[nm],out)];
    return[tn(nm)];
  }
  function token(out,single){
    const c=s[i];
    if(c==='{'){i++;const a=seq('}');i++;return[{k:'grp',a}];}
    if(c==='\\')return cmd(out);
    if(isD(c)){let j=i+1;if(!single)while(isD(s[j]))j++;const str=s.slice(i,j);i=j;return[tn(str)];}
    if(isL(c)){let j=i+1;if(!single)while(isL(s[j]))j++;const str=s.slice(i,j);i=j;return[tn(str,{it:true})];}
    i++;return[opNode(c==='-'?'−':c==='*'?'·':c,out)];
  }
  function seq(stop){
    const out=[];
    while(i<s.length){
      const c=s[i];
      if(stop&&c===stop)break;
      if(c===' '||c==='\n'||c==='\t'){i++;continue;}
      if(c==='}'){i++;continue;}
      if(c==='^'||c==='_'){
        i++;const a=arg();let b=out.pop()||tn('');
        if(b.k!=='script')b={k:'script',base:b,sup:null,sub:null};
        b[c==='^'?'sup':'sub']=a;out.push(b);continue;
      }
      out.push(...token(out,false));
    }
    return out;
  }
  return seq(null);
}
function texLay(nodes,size){
  let x=0,a=0,d=0;const parts=[];
  for(const n of nodes){const b=layNode(n,size);parts.push({x,b});x+=b.w;a=Math.max(a,b.a);d=Math.max(d,b.d);}
  return{w:x,a,d,draw:(ox,oy)=>parts.map(p=>p.b.draw(ox+p.x,oy)).join('')};
}
function layNode(n,size){
  const none={w:0,a:0,d:0,draw:()=>''};
  switch(n.k){
    case'sp':return{w:n.w*size,a:0,d:0,draw:()=>''};
    case'grp':return texLay(n.a,size);
    case't':{
      const tw=n.s?measure(n.s,size,'math'):0,pl=n.pl*size,pr=n.pr*size;
      return{w:tw+pl+pr,a:size*.72,d:size*.22,draw:(ox,oy)=>n.s?`<text x="${r1(ox+pl)}" y="${r1(oy)}"${n.it?' font-style="italic"':''}>${esc(n.s)}</text>`:''};
    }
    case'frac':{
      const s2=size*.88,A=texLay(n.a,s2),B=texLay(n.b,s2),w=Math.max(A.w,B.w)+size*.3,ax=size*.3,gap=size*.16;
      return{w,a:ax+gap+A.d+A.a,d:Math.max(0,B.d+B.a+gap-ax),draw:(ox,oy)=>(n.bar===false?'':`<line x1="${r1(ox+size*.05)}" x2="${r1(ox+w-size*.05)}" y1="${r1(oy-ax)}" y2="${r1(oy-ax)}" stroke="currentColor" stroke-width="${r1(size*.055)}"/>`)+A.draw(ox+(w-A.w)/2,oy-ax-gap-A.d)+B.draw(ox+(w-B.w)/2,oy-ax+gap+B.a)};
    }
    case'over':{
      const B=texLay(n.a,size),gap=size*.14,sw=r1(size*.055);
      return{w:B.w,a:B.a+gap+size*.1,d:B.d,draw:(ox,oy)=>{
        const yy=oy-B.a-gap,x1=ox+size*.04,x2=ox+B.w-size*.04,mx=ox+B.w/2;
        let m;
        if(n.t==='bar')m=`<line x1="${r1(x1)}" x2="${r1(x2)}" y1="${r1(yy)}" y2="${r1(yy)}" stroke="currentColor" stroke-width="${sw}"/>`;
        else if(n.t==='vec')m=`<path d="M${r1(x1)} ${r1(yy)}H${r1(x2)}M${r1(x2-size*.13)} ${r1(yy-size*.08)}L${r1(x2)} ${r1(yy)}L${r1(x2-size*.13)} ${r1(yy+size*.08)}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round"/>`;
        else m=`<path d="M${r1(mx-size*.14)} ${r1(yy+size*.06)}L${r1(mx)} ${r1(yy-size*.08)}L${r1(mx+size*.14)} ${r1(yy+size*.06)}" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/>`;
        return B.draw(ox,oy)+m;
      }};
    }
    case'sqrt':{
      const B=texLay(n.a,size),I=n.n?texLay(n.n,size*.55):null,ix=I?Math.max(0,I.w-size*.25):0,lw=size*.6,top=B.a+size*.14;
      return{w:ix+lw+B.w+size*.12,a:top+size*.12,d:B.d+size*.06,draw:(ox,oy)=>{
        const x0=ox+ix;
        return`<path d="M${r1(x0)} ${r1(oy-size*.28)}L${r1(x0+size*.14)} ${r1(oy-size*.34)}L${r1(x0+size*.3)} ${r1(oy+B.d+size*.04)}L${r1(x0+lw-size*.04)} ${r1(oy-top)}H${r1(x0+lw+B.w+size*.08)}" fill="none" stroke="currentColor" stroke-width="${r1(size*.06)}" stroke-linejoin="round" stroke-linecap="round"/>`+B.draw(x0+lw,oy)+(I?I.draw(ox,oy-top*.55):'');
      }};
    }
    case'op':{
      const gs=n.txt?size:size*(n.s==='∫'?1.55:1.3),tw=measure(n.s,gs,'math');
      return{w:tw+size*.08,a:n.txt?size*.72:size*.95,d:n.txt?size*.22:size*.55,draw:(ox,oy)=>`<text x="${r1(ox)}" y="${r1(oy+(n.txt?0:size*.3))}" font-size="${r1(gs)}">${esc(n.s)}</text>`};
    }
    case'script':{
      const base=layNode(n.base,size),sup=n.sup?texLay(n.sup,size*.7):null,sub=n.sub?texLay(n.sub,size*.7):null;
      if(n.base.k==='op'&&n.base.lim){
        const w=Math.max(base.w,sup?sup.w:0,sub?sub.w:0),sy=-(base.a+(sup?sup.d:0)+size*.08),by=base.d+(sub?sub.a:0)+size*.08;
        return{w,a:sup?-sy+sup.a:base.a,d:sub?by+sub.d:base.d,draw:(ox,oy)=>base.draw(ox+(w-base.w)/2,oy)+(sup?sup.draw(ox+(w-sup.w)/2,oy+sy):'')+(sub?sub.draw(ox+(w-sub.w)/2,oy+by):'')};
      }
      const sy=-Math.max(size*.42,base.a-size*.3),by=Math.max(size*.22,base.d+size*.1),sw=Math.max(sup?sup.w:0,sub?sub.w:0);
      return{w:base.w+sw+size*.04,a:Math.max(base.a,sup?-sy+sup.a:0),d:Math.max(base.d,sub?by+sub.d:0),draw:(ox,oy)=>base.draw(ox,oy)+(sup?sup.draw(ox+base.w+size*.02,oy+sy):'')+(sub?sub.draw(ox+base.w+size*.02,oy+by):'')};
    }
  }
  return none;
}
function mathInner(e,ex){
  let box;try{box=texLay(texParse(e.tex||''),e.size);}catch(err){box={w:60,a:e.size*.7,d:e.size*.2,draw:(ox,oy)=>`<text x="${ox}" y="${oy}">?</text>`};}
  const pad=Math.max(6,e.size*.28);
  e.w=Math.max(24,Math.round(box.w+pad*2));e.h=Math.max(24,Math.round(box.a+box.d+pad*2));
  return(ex?'':`<rect x="${e.x}" y="${e.y}" width="${e.w}" height="${e.h}" fill="transparent" pointer-events="all"/>`)+
    `<g color="${e.stroke}" fill="currentColor" font-family="${FONTS.math}" font-size="${e.size}">${box.draw(e.x+pad,e.y+pad+box.a)}</g>`;
}

/* ===== parser i ewaluator wyrażeń ===== */
const fact = n => { if (n < 0 || n > 170 || Math.abs(n - Math.round(n)) > 1e-9) return NaN; let r = 1; for (let i = 2; i <= Math.round(n); i++) r *= i; return r; };
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) { [a, b] = [b, a % b]; } return a; };
const FN1 = {
  sin: Math.sin, cos: Math.cos, tan: Math.tan, cot: x => 1 / Math.tan(x), sec: x => 1 / Math.cos(x), csc: x => 1 / Math.sin(x),
  asin: Math.asin, acos: Math.acos, atan: Math.atan, arcsin: Math.asin, arccos: Math.acos, arctan: Math.atan,
  sinh: Math.sinh, cosh: Math.cosh, tanh: Math.tanh, ln: Math.log, log: Math.log10, lg: Math.log10, log2: Math.log2,
  sqrt: Math.sqrt, cbrt: Math.cbrt, abs: Math.abs, exp: Math.exp, floor: Math.floor, ceil: Math.ceil, round: Math.round,
  sign: Math.sign, sgn: Math.sign, fact
};
const FNN = {
  min: Math.min, max: Math.max, mod: (a, b) => ((a % b) + b) % b, gcd, lcm: (a, b) => Math.abs(a * b) / gcd(a, b),
  logb: (b, x) => Math.log(x) / Math.log(b), root: (n, x) => (x < 0 && n % 2 === 1 ? -Math.pow(-x, 1 / n) : Math.pow(x, 1 / n)),
  ncr: (n, k) => fact(n) / (fact(k) * fact(n - k)), npr: (n, k) => fact(n) / fact(n - k), atan2: Math.atan2
};
const CONSTS = { pi: Math.PI, e: Math.E, tau: 2 * Math.PI, phi: (1 + Math.sqrt(5)) / 2 };
const TRIG = new Set(['sin', 'cos', 'tan', 'cot', 'sec', 'csc']), ITRIG = new Set(['asin', 'acos', 'atan', 'arcsin', 'arccos', 'arctan']);
const KNOWN = [...Object.keys(FN1), ...Object.keys(FNN), ...Object.keys(CONSTS)].sort((a, b) => b.length - a.length);

// Przecinek dziesiętny (0,5) tylko poza nawiasami; wewnątrz nawiasów przecinek rozdziela argumenty i współrzędne.
function fixCommas(s) { let d = 0, o = ''; for (let i = 0; i < s.length; i++) { const c = s[i]; if (c === '(') d++; else if (c === ')') d = Math.max(0, d - 1); o += (c === ',' && d === 0 && /\d/.test(s[i - 1] || '') && /\d/.test(s[i + 1] || '')) ? '.' : c; } return o; }
function tokenize(src, userFns) {
  src = fixCommas(String(src)).replace(/π/g, ' pi ').replace(/√/g, ' sqrt ').replace(/∞/g, ' inf ').replace(/\^\s*\(/g, '^(');
  const out = [], re = /\s*(?:(\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\.\d+)|([A-Za-zÀ-ɏͰ-Ͽ]+(?:_[A-Za-z0-9]+)?)|(<=|>=|!=|[+\-*/^()!%=<>,|'×÷−·≤≥≠]))/y;
  let pos = 0, m;
  while (pos < src.length) {
    re.lastIndex = pos; m = re.exec(src);
    if (!m) { if (/^\s*$/.test(src.slice(pos))) break; throw new Error(E('Nieznany znak „{0}”', src.slice(pos).trim()[0])); }
    pos = re.lastIndex;
    if (m[1] !== undefined) out.push({ t: 'num', v: parseFloat(m[1].replace(',', '.')) });
    else if (m[2] !== undefined) {
      const run = m[2], nextParen = /^\s*\(/.test(src.slice(pos));
      if (run === 'inf') { out.push({ t: 'num', v: Infinity }); continue; }
      if (run.includes('_')) { out.push({ t: 'id', v: run }); continue; }
      if (userFns && userFns[run] && (nextParen || src[pos] === "'")) { out.push({ t: 'id', v: run, user: true }); continue; }
      if (KNOWN.includes(run)) { out.push({ t: 'id', v: run }); continue; }
      let i = 0;
      while (i < run.length) {
        const rest = run.slice(i), k = KNOWN.find(n => rest.startsWith(n));
        if (k) { out.push({ t: 'id', v: k }); i += k.length; }
        else { const ch = run[i]; out.push(userFns && userFns[ch] && i === run.length - 1 && nextParen ? { t: 'id', v: ch, user: true } : { t: 'id', v: ch }); i++; }
      }
    } else {
      const c = { '×': '*', '·': '*', '÷': '/', '−': '-', '≤': '<=', '≥': '>=', '≠': '!=' }[m[3]] || m[3];
      out.push({ t: 'op', v: c });
    }
  }
  return out;
}

function parseTokens(tk) {
  let p = 0, inBar = 0;
  const isOp = v => !!tk[p] && tk[p].t === 'op' && tk[p].v === v;
  const startsOperand = () => { const t = tk[p]; return !!t && (t.t === 'num' || t.t === 'id' || (t.t === 'op' && (t.v === '(' || (t.v === '|' && !inBar)))); };
  function add() { let l = mul(); while (isOp('+') || isOp('-')) { const o = tk[p++].v; l = { t: 'b', o, a: l, b: mul() }; } return l; }
  function mul() {
    let l = unary();
    for (;;) {
      if (isOp('*') || isOp('/')) { const o = tk[p++].v; l = { t: 'b', o, a: l, b: unary() }; }
      else if (startsOperand()) l = { t: 'b', o: '*', a: l, b: unary() };
      else break;
    }
    return l;
  }
  function unary() { if (isOp('-')) { p++; return { t: 'u', a: unary() }; } if (isOp('+')) { p++; return unary(); } return pow(); }
  function pow() { const b = post(); if (isOp('^')) { p++; return { t: 'b', o: '^', a: b, b: unary() }; } return b; }
  function post() {
    let a = prim();
    for (;;) {
      if (isOp('!')) { p++; a = { t: 'f', name: 'fact', args: [a] }; }
      else if (isOp('%')) { p++; a = { t: 'b', o: '/', a, b: { t: 'n', v: 100 } }; }
      else break;
    }
    return a;
  }
  function call(nm) {
    if (!isOp('(')) throw new Error(E('Brak nawiasu po nazwie funkcji'));
    p++; const args = [add()];
    while (isOp(',')) { p++; args.push(add()); }
    if (!isOp(')')) throw new Error(E('Brak zamknięcia nawiasu'));
    p++; return args;
  }
  function prim() {
    const t = tk[p++];
    if (!t) throw new Error(E('Niekompletne wyrażenie'));
    if (t.t === 'num') return { t: 'n', v: t.v };
    if (t.t === 'op' && t.v === '(') {
      const e = add();
      if (isOp(',')) { p++; const e2 = add(); if (!isOp(')')) throw new Error(E('Brak zamknięcia nawiasu')); p++; return { t: 'pt', x: e, y: e2 }; }
      if (!isOp(')')) throw new Error(E('Brak zamknięcia nawiasu'));
      p++; return e;
    }
    if (t.t === 'op' && t.v === '|') {
      inBar++; const e = add(); inBar--;
      if (!isOp('|')) throw new Error(E('Brak zamknięcia znaku |'));
      p++; return { t: 'f', name: 'abs', args: [e] };
    }
    if (t.t === 'id') {
      const nm = t.v;
      let pr = 0; while (isOp("'")) { pr++; p++; }
      if (t.user || pr) { const a = call(nm); return pr ? { t: 'der', name: nm, order: pr, arg: a[0] } : { t: 'uf', name: nm, arg: a[0] }; }
      if (FN1[nm] || FNN[nm]) {
        let ex = null;
        if (FN1[nm] && isOp('^')) { // sin^2(x)
          p++; if (tk[p] && tk[p].t === 'num') ex = { t: 'n', v: tk[p++].v };
          else if (isOp('(')) { p++; ex = add(); if (!isOp(')')) throw new Error(E('Brak zamknięcia nawiasu')); p++; }
          else throw new Error(E('Nieoczekiwany symbol „{0}”', '^'));
        }
        const args = isOp('(') ? call(nm) : [pow()];
        const f = { t: 'f', name: nm, args };
        return ex ? { t: 'b', o: '^', a: f, b: ex } : f;
      }
      if (CONSTS[nm] !== undefined) return { t: 'c', v: CONSTS[nm], name: nm };
      if (nm === 'x') return { t: 'x' };
      if (nm === 'y') return { t: 'y' };
      return { t: 'v', name: nm };
    }
    throw new Error(E('Nieoczekiwany symbol „{0}”', t.v));
  }
  const ast = add();
  if (p < tk.length) throw new Error(E('Nieoczekiwany symbol „{0}”', tk[p].v));
  return ast;
}

const toFrac = x => { for (let q = 1; q <= 9; q++) { const pn = Math.round(x * q); if (Math.abs(pn / q - x) < 1e-9) return [pn, q]; } return null; };
const pw = (a, b) => {
  if (a < 0 && Number.isFinite(b) && !Number.isInteger(b)) {
    const fr = toFrac(b);
    if (fr && fr[1] % 2 === 1) return (Math.abs(fr[0]) % 2 === 0 ? 1 : -1) * Math.pow(-a, b);
    return NaN;
  }
  return Math.pow(a, b);
};
function callUser(c, name, val) {
  const d = c.fns && c.fns[name];
  if (!d || (c.depth || 0) > 40) return NaN;
  const loc = { ...(c.loc || {}), [d.param]: val };
  return d.f({ ...c, loc, x: d.param === 'x' ? val : c.x, depth: (c.depth || 0) + 1 });
}
function comp(n) {
  switch (n.t) {
    case 'n': case 'c': { const v = n.v; return () => v; }
    case 'x': return c => c.x;
    case 'y': return c => c.y;
    case 'v': { const k = n.name; return c => { if (c.loc && k in c.loc) return c.loc[k]; const v = c.v && c.v[k]; return v === undefined ? NaN : v; }; }
    case 'u': { const a = comp(n.a); return c => -a(c); }
    case 'b': {
      const a = comp(n.a), b = comp(n.b);
      switch (n.o) {
        case '+': return c => a(c) + b(c);
        case '-': return c => a(c) - b(c);
        case '*': return c => a(c) * b(c);
        case '/': return c => a(c) / b(c);
        default: return c => pw(a(c), b(c));
      }
    }
    case 'f': {
      const args = n.args.map(comp), nm = n.name;
      if (FN1[nm]) {
        const f = FN1[nm], a = args[0];
        if (TRIG.has(nm)) return c => f(c.deg ? a(c) * Math.PI / 180 : a(c));
        if (ITRIG.has(nm)) return c => { const r = f(a(c)); return c.deg ? r * 180 / Math.PI : r; };
        return c => f(a(c));
      }
      const f = FNN[nm];
      return c => f(...args.map(a => a(c)));
    }
    case 'uf': { const a = comp(n.arg), nm = n.name; return c => callUser(c, nm, a(c)); }
    case 'der': {
      const a = comp(n.arg), nm = n.name, ord = n.order;
      return c => {
        const x = a(c), h = ord === 1 ? 1e-5 * Math.max(1, Math.abs(x)) : 1e-3 * Math.max(1, Math.abs(x)), g = t => callUser(c, nm, t);
        return ord === 1 ? (g(x + h) - g(x - h)) / (2 * h) : (g(x + h) - 2 * g(x) + g(x - h)) / (h * h);
      };
    }
    default: return () => NaN;
  }
}
const uses = (n, k) => !!n && (n.t === k || (n.a && uses(n.a, k)) || (n.b && uses(n.b, k)) || (n.args && n.args.some(a => uses(a, k))) || (n.arg && uses(n.arg, k)) || (n.x && uses(n.x, k)) || (n.y && uses(n.y, k)));
function freeVars(n, set = new Set()) {
  if (!n) return set;
  if (n.t === 'v') set.add(n.name);
  for (const k of ['a', 'b', 'arg', 'x', 'y']) if (n[k] && typeof n[k] === 'object') freeVars(n[k], set);
  if (n.args) n.args.forEach(a => freeVars(a, set));
  return set;
}

/* Klasyfikacja wiersza użytkownika */
function parseRow(src, userFns) {
  src = String(src || '').trim();
  if (!src) return { kind: 'empty' };
  const tk = tokenize(src, userFns);
  let depth = 0, ri = -1;
  for (let i = 0; i < tk.length; i++) {
    const t = tk[i];
    if (t.t === 'op') {
      if (t.v === '(') depth++; else if (t.v === ')') depth--;
      else if (depth === 0 && ['=', '<', '>', '<=', '>=', '!='].includes(t.v) && ri < 0) ri = i;
    }
  }
  if (ri < 0) {
    const ast = parseTokens(tk);
    if (ast.t === 'pt') return { kind: 'point', px: comp(ast.x), py: comp(ast.y), ast };
    return { kind: 'expr', ast, usesX: uses(ast, 'x'), usesY: uses(ast, 'y') };
  }
  const L = tk.slice(0, ri), R = tk.slice(ri + 1), op = tk[ri].v;
  if (!R.length) throw new Error(E('Niekompletne wyrażenie'));
  // definicja funkcji: f(t)=...
  if (op === '=' && L.length === 4 && L[0].t === 'id' && L[1].v === '(' && L[2].t === 'id' && L[3].v === ')' && !FN1[L[0].v] && !FNN[L[0].v] && !CONSTS[L[0].v]) {
    return { kind: 'def', name: L[0].v, param: L[2].v, ast: parseTokens(R) };
  }
  if (op === '=' && L.length === 1 && L[0].t === 'id' && !['x', 'y'].includes(L[0].v) && !CONSTS[L[0].v]) {
    return { kind: 'var', name: L[0].v, ast: parseTokens(R) };
  }
  const la = parseTokens(L), ra = parseTokens(R);
  if (op === '=' && L.length === 1 && L[0].v === 'y' && !uses(ra, 'y')) return { kind: 'fn', ast: ra };
  if (op === '=' && L.length === 1 && L[0].v === 'x' && !uses(ra, 'y') && !uses(ra, 'x')) return { kind: 'vline', ast: ra };
  if (!uses(la, 'x') && !uses(la, 'y') && !uses(ra, 'x') && !uses(ra, 'y')) return { kind: 'expr', ast: { t: 'b', o: '-', a: la, b: ra }, rel: op, usesX: false, usesY: false };
  return { kind: 'implicit', op, l: la, r: ra };
}

/* Kontekst obliczeń: zmienne (suwaki) i funkcje użytkownika */
function makeCtx(vars, fns, deg) { return { x: 0, y: 0, v: vars || {}, fns: fns || {}, deg: !!deg, loc: null, depth: 0 }; }
const evalAst = (ast, ctx) => comp(ast)(ctx);
function fmtNum(v, digits = 6) {
  if (!Number.isFinite(v)) return Number.isNaN(v) ? '—' : (v > 0 ? '∞' : '−∞');
  if (Math.abs(v) < 1e-12) v = 0;
  let s = Number(v.toPrecision(digits));
  if (Math.abs(s) >= 1e9 || (Math.abs(s) < 1e-5 && s !== 0)) return s.toExponential(3).replace('e+', '·10^').replace('e-', '·10^-');
  return String(s);
}

/* Narzędzia analizy numerycznej funkcji f(x) */
function findRoots(f, a, b, n = 800) {
  const out = []; let px = a, py = f(a);
  const step = (b - a) / n;
  for (let i = 1; i <= n; i++) {
    const x = a + i * step, y = f(x);
    if (Number.isFinite(py) && Number.isFinite(y)) {
      if (py === 0) out.push(px);
      else if (py * y < 0 && Math.abs(py - y) < (Math.abs(py) + Math.abs(y)) * 50) {
        let lo = px, hi = x, flo = py;
        for (let k = 0; k < 60; k++) { const mid = (lo + hi) / 2, fm = f(mid); if (flo * fm <= 0) hi = mid; else { lo = mid; flo = fm; } }
        out.push((lo + hi) / 2);
      }
    }
    px = x; py = y;
  }
  if (Number.isFinite(py) && py === 0) out.push(px);
  return out.filter((v, i) => i === 0 || Math.abs(v - out[i - 1]) > step * 0.5);
}
function findExtrema(f, a, b, n = 800) {
  const h = (b - a) / n * 0.5, d = x => (f(x + h) - f(x - h)) / (2 * h);
  const roots = findRoots(d, a + h * 2, b - h * 2, n);
  return roots.map(x => {
    const dd = (d(x + h * 3) - d(x - h * 3));
    return { x, y: f(x), kind: dd > 0 ? 'min' : dd < 0 ? 'max' : 'infl' };
  }).filter(p => Number.isFinite(p.y) && p.kind !== 'infl');
}

Object.assign(MD, {
  clamp, r1, esc, measure, FONTS,
  parseRow, makeCtx, evalAst, comp, tokenize, parseTokens, uses, freeVars, fmtNum, findRoots, findExtrema,
  isBuiltin: nm => !!(FN1[nm] || FNN[nm] || CONSTS[nm]),
  texSVG(tex, size, color) { const e = { x: 0, y: 0, tex, size: size || 24, stroke: color || '#2E1A24' }; const g = mathInner(e, true); return { svg: g, w: e.w, h: e.h }; },
  texHTML(tex, size, color) { const t = MD.texSVG(tex, size, color); return `<svg class="tex" viewBox="0 0 ${t.w} ${t.h}" width="${Math.round(t.w)}" height="${Math.round(t.h)}">${t.svg}</svg>`; }
});
})();
