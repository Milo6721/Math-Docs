// Math Docs — ściąga ze wzorami (dane + widok). Nazwy: [PL, EN]. g = wyrażenia do pokazania na wykresie.
(() => {
'use strict';
const MD = window.MD, { $, $$ } = MD;
const CATS = {
  alg: ['Algebra', 'Algebra'], fun: ['Funkcje', 'Functions'], trig: ['Trygonometria', 'Trigonometry'], plan: ['Planimetria', 'Plane geometry'],
  ster: ['Stereometria', 'Solid geometry'], an: ['Analiza', 'Calculus'], ciag: ['Ciągi i szeregi', 'Sequences & series'], stat: ['Kombinatoryka i statystyka', 'Combinatorics & statistics'], ana: ['Geometria analityczna', 'Analytic geometry']
};
const F = [
  // Algebra
  ['alg', ['Kwadrat sumy', 'Square of a sum'], '(a+b)^2 = a^2 + 2ab + b^2'],
  ['alg', ['Kwadrat różnicy', 'Square of a difference'], '(a-b)^2 = a^2 - 2ab + b^2'],
  ['alg', ['Różnica kwadratów', 'Difference of squares'], 'a^2 - b^2 = (a-b)(a+b)'],
  ['alg', ['Sześcian sumy', 'Cube of a sum'], '(a+b)^3 = a^3 + 3a^2 b + 3 a b^2 + b^3'],
  ['alg', ['Suma sześcianów', 'Sum of cubes'], 'a^3 + b^3 = (a+b)(a^2 - ab + b^2)'],
  ['alg', ['Różnica sześcianów', 'Difference of cubes'], 'a^3 - b^3 = (a-b)(a^2 + ab + b^2)'],
  ['alg', ['Wzór dwumianowy Newtona', 'Binomial theorem'], '(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k'],
  ['alg', ['Potęgi: iloczyn', 'Powers: product'], 'a^m \\cdot a^n = a^{m+n}'],
  ['alg', ['Potęgi: iloraz', 'Powers: quotient'], '\\frac{a^m}{a^n} = a^{m-n}'],
  ['alg', ['Potęga potęgi', 'Power of a power'], '(a^m)^n = a^{m \\cdot n}'],
  ['alg', ['Potęga ujemna i zerowa', 'Negative and zero exponent'], 'a^{-n} = \\frac{1}{a^n},  a^0 = 1'],
  ['alg', ['Pierwiastek jako potęga', 'Root as a power'], '\\sqrt[n]{a^m} = a^{\\frac{m}{n}}'],
  ['alg', ['Logarytm: definicja', 'Logarithm: definition'], '\\log_a b = c \\iff a^c = b'],
  ['alg', ['Logarytm iloczynu i ilorazu', 'Log of product and quotient'], '\\log_a (xy) = \\log_a x + \\log_a y,  \\log_a \\frac{x}{y} = \\log_a x - \\log_a y'],
  ['alg', ['Logarytm potęgi', 'Log of a power'], '\\log_a x^n = n \\log_a x'],
  ['alg', ['Zmiana podstawy logarytmu', 'Change of base'], '\\log_a b = \\frac{\\log_c b}{\\log_c a}'],
  ['alg', ['Wartość bezwzględna', 'Absolute value'], '|x| \\le a \\iff -a \\le x \\le a'],
  ['alg', ['Średnia arytmetyczna ≥ geometryczna', 'AM–GM inequality'], '\\frac{a+b}{2} \\ge \\sqrt{ab}'],
  // Funkcje
  ['fun', ['Funkcja liniowa', 'Linear function'], 'y = ax + b', ['y=2x+1']],
  ['fun', ['Postać ogólna trójmianu', 'Quadratic: general form'], 'f(x) = ax^2 + bx + c', ['y=x^2-2x-3']],
  ['fun', ['Delta', 'Discriminant'], '\\Delta = b^2 - 4ac'],
  ['fun', ['Miejsca zerowe', 'Roots of a quadratic'], 'x_{1,2} = \\frac{-b \\pm \\sqrt{\\Delta}}{2a}'],
  ['fun', ['Wierzchołek paraboli', 'Vertex of a parabola'], 'p = \\frac{-b}{2a},  q = \\frac{-\\Delta}{4a}'],
  ['fun', ['Postać kanoniczna', 'Vertex form'], 'f(x) = a(x-p)^2 + q', ['y=2(x-1)^2-3']],
  ['fun', ['Postać iloczynowa', 'Factored form'], 'f(x) = a(x-x_1)(x-x_2)', ['y=(x+1)(x-3)']],
  ['fun', ['Wzory Viète’a', 'Vieta’s formulas'], 'x_1 + x_2 = \\frac{-b}{a},  x_1 \\cdot x_2 = \\frac{c}{a}'],
  ['fun', ['Funkcja wykładnicza', 'Exponential function'], 'f(x) = a^x', ['y=2^x', 'y=(1/2)^x']],
  ['fun', ['Funkcja logarytmiczna', 'Logarithmic function'], 'f(x) = \\log_a x', ['y=ln(x)', 'y=log(x)']],
  ['fun', ['Funkcja homograficzna', 'Rational (hyperbola)'], 'f(x) = \\frac{a}{x-p} + q', ['y=2/(x-1)+1']],
  ['fun', ['Funkcja potęgowa', 'Power function'], 'f(x) = x^n', ['y=x^3', 'y=x^2']],
  // Trygonometria
  ['trig', ['Jedynka trygonometryczna', 'Pythagorean identity'], '\\sin^2 \\alpha + \\cos^2 \\alpha = 1'],
  ['trig', ['Tangens i cotangens', 'Tangent and cotangent'], '\\tan \\alpha = \\frac{\\sin \\alpha}{\\cos \\alpha},  \\cot \\alpha = \\frac{\\cos \\alpha}{\\sin \\alpha}'],
  ['trig', ['Sinus sumy', 'Sine of a sum'], '\\sin(\\alpha \\pm \\beta) = \\sin \\alpha \\cos \\beta \\pm \\cos \\alpha \\sin \\beta'],
  ['trig', ['Cosinus sumy', 'Cosine of a sum'], '\\cos(\\alpha \\pm \\beta) = \\cos \\alpha \\cos \\beta \\mp \\sin \\alpha \\sin \\beta'],
  ['trig', ['Sinus i cosinus podwojonego kąta', 'Double-angle formulas'], '\\sin 2\\alpha = 2 \\sin \\alpha \\cos \\alpha,  \\cos 2\\alpha = \\cos^2 \\alpha - \\sin^2 \\alpha'],
  ['trig', ['Suma sinusów', 'Sum of sines'], '\\sin \\alpha + \\sin \\beta = 2 \\sin \\frac{\\alpha+\\beta}{2} \\cos \\frac{\\alpha-\\beta}{2}'],
  ['trig', ['Twierdzenie sinusów', 'Law of sines'], '\\frac{a}{\\sin \\alpha} = \\frac{b}{\\sin \\beta} = \\frac{c}{\\sin \\gamma} = 2R'],
  ['trig', ['Twierdzenie cosinusów', 'Law of cosines'], 'c^2 = a^2 + b^2 - 2ab \\cos \\gamma'],
  ['trig', ['Wykres sinusa', 'Sine graph'], 'y = \\sin x', ['y=sin(x)']],
  ['trig', ['Wykres cosinusa', 'Cosine graph'], 'y = \\cos x', ['y=cos(x)']],
  ['trig', ['Wykres tangensa', 'Tangent graph'], 'y = \\tan x', ['y=tan(x)']],
  ['trig', ['Wartości dla 30°, 45°, 60°', 'Values at 30°, 45°, 60°'], '\\sin 30° = \\frac{1}{2},  \\sin 45° = \\frac{\\sqrt{2}}{2},  \\sin 60° = \\frac{\\sqrt{3}}{2}'],
  ['trig', ['Radiany i stopnie', 'Radians and degrees'], '\\alpha_{rad} = \\frac{\\pi}{180°} \\cdot \\alpha_{deg}'],
  // Planimetria
  ['plan', ['Twierdzenie Pitagorasa', 'Pythagorean theorem'], 'a^2 + b^2 = c^2'],
  ['plan', ['Pole trójkąta', 'Triangle area'], 'P = \\frac{1}{2} a h = \\frac{1}{2} ab \\sin \\gamma'],
  ['plan', ['Wzór Herona', 'Heron’s formula'], 'P = \\sqrt{p(p-a)(p-b)(p-c)},  p = \\frac{a+b+c}{2}'],
  ['plan', ['Trójkąt równoboczny', 'Equilateral triangle'], 'P = \\frac{a^2 \\sqrt{3}}{4},  h = \\frac{a \\sqrt{3}}{2}'],
  ['plan', ['Pole prostokąta i równoległoboku', 'Rectangle & parallelogram area'], 'P = a \\cdot h'],
  ['plan', ['Pole trapezu', 'Trapezoid area'], 'P = \\frac{(a+b) \\cdot h}{2}'],
  ['plan', ['Pole rombu', 'Rhombus area'], 'P = \\frac{e \\cdot f}{2}'],
  ['plan', ['Koło', 'Circle'], 'P = \\pi r^2,  L = 2 \\pi r'],
  ['plan', ['Wycinek koła', 'Circular sector'], 'P = \\frac{\\alpha}{360°} \\pi r^2,  l = \\frac{\\alpha}{360°} 2 \\pi r'],
  ['plan', ['Promień okręgu opisanego i wpisanego', 'Circumradius and inradius'], 'R = \\frac{abc}{4P},  r = \\frac{P}{p}'],
  ['plan', ['Suma kątów wielokąta', 'Interior angle sum'], 'S = (n-2) \\cdot 180°'],
  ['plan', ['Twierdzenie Talesa', 'Thales’ theorem (intercept)'], '\\frac{|OA|}{|OB|} = \\frac{|OC|}{|OD|}'],
  // Stereometria
  ['ster', ['Prostopadłościan', 'Cuboid'], 'V = abc,  P_c = 2(ab+bc+ca)'],
  ['ster', ['Sześcian', 'Cube'], 'V = a^3,  P_c = 6a^2,  d = a\\sqrt{3}'],
  ['ster', ['Graniastosłup', 'Prism'], 'V = P_p \\cdot H'],
  ['ster', ['Ostrosłup', 'Pyramid'], 'V = \\frac{1}{3} P_p \\cdot H'],
  ['ster', ['Walec', 'Cylinder'], 'V = \\pi r^2 H,  P_c = 2\\pi r (r+H)'],
  ['ster', ['Stożek', 'Cone'], 'V = \\frac{1}{3} \\pi r^2 H,  P_c = \\pi r (r+l)'],
  ['ster', ['Kula', 'Sphere'], 'V = \\frac{4}{3} \\pi r^3,  P = 4 \\pi r^2'],
  // Analiza
  ['an', ['Pochodna: definicja', 'Derivative: definition'], 'f\'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}'],
  ['an', ['Pochodna potęgi', 'Power rule'], '(x^n)\' = n x^{n-1}'],
  ['an', ['Pochodna iloczynu', 'Product rule'], '(f \\cdot g)\' = f\' g + f g\''],
  ['an', ['Pochodna ilorazu', 'Quotient rule'], '\\left(\\frac{f}{g}\\right)\' = \\frac{f\' g - f g\'}{g^2}'],
  ['an', ['Pochodna funkcji złożonej', 'Chain rule'], '(f(g(x)))\' = f\'(g(x)) \\cdot g\'(x)'],
  ['an', ['Pochodne funkcji elementarnych', 'Common derivatives'], '(\\sin x)\' = \\cos x,  (\\cos x)\' = -\\sin x,  (e^x)\' = e^x,  (\\ln x)\' = \\frac{1}{x}'],
  ['an', ['Całka z potęgi', 'Power integral'], '\\int x^n dx = \\frac{x^{n+1}}{n+1} + C'],
  ['an', ['Całki elementarne', 'Common integrals'], '\\int \\sin x dx = -\\cos x + C,  \\int e^x dx = e^x + C,  \\int \\frac{1}{x} dx = \\ln|x| + C'],
  ['an', ['Całka oznaczona', 'Fundamental theorem'], '\\int_a^b f(x) dx = F(b) - F(a)'],
  ['an', ['Całkowanie przez części', 'Integration by parts'], '\\int u dv = uv - \\int v du'],
  ['an', ['Granice podstawowe', 'Basic limits'], '\\lim_{x \\to 0} \\frac{\\sin x}{x} = 1,  \\lim_{n \\to \\infty} \\left(1+\\frac{1}{n}\\right)^n = e'],
  // Ciągi
  ['ciag', ['Ciąg arytmetyczny: wyraz', 'Arithmetic sequence: term'], 'a_n = a_1 + (n-1) r'],
  ['ciag', ['Ciąg arytmetyczny: suma', 'Arithmetic sequence: sum'], 'S_n = \\frac{a_1 + a_n}{2} \\cdot n'],
  ['ciag', ['Ciąg geometryczny: wyraz', 'Geometric sequence: term'], 'a_n = a_1 \\cdot q^{n-1}'],
  ['ciag', ['Ciąg geometryczny: suma', 'Geometric sequence: sum'], 'S_n = a_1 \\cdot \\frac{1-q^n}{1-q}'],
  ['ciag', ['Szereg geometryczny nieskończony', 'Infinite geometric series'], 'S = \\frac{a_1}{1-q},  |q| < 1'],
  ['ciag', ['Procent składany', 'Compound interest'], 'K_n = K_0 \\left(1 + \\frac{p}{100}\\right)^n'],
  // Statystyka
  ['stat', ['Silnia', 'Factorial'], 'n! = 1 \\cdot 2 \\cdot 3 \\cdot \\ldots \\cdot n'],
  ['stat', ['Permutacje', 'Permutations'], 'P_n = n!'],
  ['stat', ['Wariacje bez powtórzeń', 'Arrangements (no repetition)'], 'V_n^k = \\frac{n!}{(n-k)!}'],
  ['stat', ['Kombinacje', 'Combinations'], '\\binom{n}{k} = \\frac{n!}{k! (n-k)!}'],
  ['stat', ['Prawdopodobieństwo klasyczne', 'Classical probability'], 'P(A) = \\frac{|A|}{|\\Omega|}'],
  ['stat', ['Prawdopodobieństwo sumy', 'Probability of a union'], 'P(A \\cup B) = P(A) + P(B) - P(A \\cap B)'],
  ['stat', ['Prawdopodobieństwo warunkowe', 'Conditional probability'], 'P(A|B) = \\frac{P(A \\cap B)}{P(B)}'],
  ['stat', ['Średnia i wariancja', 'Mean and variance'], '\\bar{x} = \\frac{1}{n} \\sum x_i,  \\sigma^2 = \\frac{1}{n} \\sum (x_i - \\bar{x})^2'],
  // Geometria analityczna
  ['ana', ['Odległość punktów', 'Distance between points'], '|AB| = \\sqrt{(x_B-x_A)^2 + (y_B-y_A)^2}'],
  ['ana', ['Środek odcinka', 'Midpoint'], 'S = \\left(\\frac{x_A+x_B}{2}, \\frac{y_A+y_B}{2}\\right)'],
  ['ana', ['Równanie prostej', 'Line equation'], 'y = ax + b,  Ax + By + C = 0'],
  ['ana', ['Prosta przez dwa punkty', 'Line through two points'], 'y - y_A = \\frac{y_B-y_A}{x_B-x_A}(x - x_A)'],
  ['ana', ['Proste równoległe i prostopadłe', 'Parallel and perpendicular lines'], 'a_1 = a_2 \\quad (\\parallel),  a_1 \\cdot a_2 = -1 \\quad (\\perp)'],
  ['ana', ['Odległość punktu od prostej', 'Point-to-line distance'], 'd = \\frac{|Ax_0 + By_0 + C|}{\\sqrt{A^2 + B^2}}'],
  ['ana', ['Równanie okręgu', 'Circle equation'], '(x-a)^2 + (y-b)^2 = r^2', ['(x-1)^2+(y-2)^2=9']],
  ['ana', ['Elipsa', 'Ellipse'], '\\frac{x^2}{a^2} + \\frac{y^2}{b^2} = 1', ['x^2/9+y^2/4=1']],
  ['ana', ['Hiperbola', 'Hyperbola'], '\\frac{x^2}{a^2} - \\frac{y^2}{b^2} = 1', ['x^2/4-y^2/4=1']]
];
let cat = 'all', q = '';
const L = () => MD.lang() === 'en' ? 1 : 0;
function render() {
  const cats = $('#fCats'); cats.innerHTML = '';
  const mkChip = (id, label) => { const b = document.createElement('button'); b.className = 'chip' + (cat === id ? ' on' : ''); b.textContent = label; b.setAttribute('data-notr', ''); b.onclick = () => { cat = id; render(); }; cats.appendChild(b); };
  mkChip('all', MD.tr('Wszystkie'));
  Object.keys(CATS).forEach(k => mkChip(k, CATS[k][L()]));
  const grid = $('#fGrid'); grid.innerHTML = '';
  const ql = q.trim().toLowerCase();
  const list = F.filter(f => (cat === 'all' || f[0] === cat) && (!ql || f[1].join(' ').toLowerCase().includes(ql) || f[2].toLowerCase().includes(ql)));
  list.forEach(f => {
    const el = document.createElement('div'); el.className = 'fcard';
    el.innerHTML = `<small data-notr>${CATS[f[0]][L()]}</small><b data-notr>${f[1][L()]}</b><div class="texbox">${MD.texHTML(f[2], 25)}</div><div class="fx"></div>`;
    const fx = el.querySelector('.fx');
    const cp = document.createElement('button'); cp.textContent = MD.tr('Kopiuj LaTeX'); cp.onclick = () => { try { navigator.clipboard.writeText(f[2]); MD.toast('Skopiowano'); } catch (e) { MD.toast('Nie udało się skopiować'); } }; fx.appendChild(cp);
    if (f[3]) { const gb = document.createElement('button'); gb.textContent = MD.tr('Na wykres'); gb.onclick = () => MD.graph.show(f[3]); fx.appendChild(gb); }
    grid.appendChild(el);
  });
  if (!list.length) grid.innerHTML = `<p class="muted">${MD.tr('Nic nie znaleziono.')}</p>`;
}
MD.tabs.formulas = { show() { render(); }, resize() {}, png: null, clear: null };
MD.initFormulas = () => {
  $('#fSearch').oninput = e => { q = e.target.value; render(); };
  MD.onLang.push(render); render();
};
})();
