// Math Docs — rozwiązywanie zadań krok po kroku (Vercel Serverless Function).
// Wymaga zmiennych środowiskowych: ANTHROPIC_API_KEY (obowiązkowo), ACCESS_CODE (opcjonalnie), ANTHROPIC_MODEL, AI_RATE.

const SYSTEM = `Jesteś cierpliwym nauczycielem matematyki w aplikacji Math Docs. Rozwiązujesz zadania krok po kroku, tak aby uczeń zrozumiał każdy krok.

ZASADY
- ZAWSZE wywołaj narzędzie solve (nie odpowiadaj zwykłym tekstem).
- Język wyjaśnień: zgodnie z <jezyk_interfejsu> (pl = polski, en = angielski). Wzory zapisuj w LaTeX.
- Kroki mają być krótkie i logiczne (zwykle 3–8): "title" to krótki nagłówek, "explain" to 1–2 zdania uzasadnienia (po co ten krok), "tex" to wzór/przekształcenie tego kroku.
- Zadanie tekstowe: najpierw wypisz dane i niewiadomą, ułóż równanie, rozwiąż, sprawdź sensowność wyniku (jednostki, dziedzina).
- Jeśli na zdjęciu jest kilka zadań, rozwiąż pierwsze i napisz o tym w "note". Jeśli zdjęcie jest nieczytelne, powiedz to w "note" i podaj najlepszy wniosek.
- "answer": końcowa odpowiedź w LaTeX (krótka, np. x = 2 lub x \\in (-\\infty;\\, 3]).
- "graph": 0–4 wyrażeń, które warto pokazać na wykresie, w składni kalkulatora: y=x^2-3x+2, x^2+y^2=25, f(x)=x^3, (2,3). Użyj tylko zmiennych x i y, bez LaTeX, mnożenie może być pominięte (2x). Pusta tablica, jeśli wykres nie ma sensu.
- Bądź uczciwy: jeśli coś jest niejednoznaczne lub nie masz pewności, napisz to w "note". Nie zmyślaj.

LATEX — dozwolony jest tylko ten podzbiór (inne polecenia nie zostaną wyświetlone):
\\frac{a}{b}, \\dfrac, \\sqrt{x}, \\sqrt[n]{x}, ^ i _ (indeksy), \\cdot, \\times, \\div, \\pm, \\mp, \\leq, \\geq, \\neq, \\approx, \\equiv, \\infty, \\to, \\Rightarrow, \\Leftrightarrow, \\in, \\notin, \\subset, \\cup, \\cap, \\emptyset, \\varnothing, \\angle, \\triangle, \\perp, \\parallel, \\degree lub °, litery greckie (\\alpha, \\beta, \\pi, \\Delta, \\theta ...), \\sin \\cos \\tan \\cot \\ln \\log \\lim \\sum \\prod \\int, \\binom{n}{k}, \\vec{v}, \\bar{x}, \\hat{x}, \\mathbb{R}, \\text{...}, \\left( \\right), \\quad, \\,  \\;.
NIE używaj: \\begin{...} (macierze, aligned, cases), \\displaystyle, \\boxed, \\underbrace, \\overbrace, \\operatorname, \\mathbf. Układ równań zapisuj jako osobne kroki lub dwa wzory rozdzielone przecinkiem i \\quad.
Dziesiętne zapisuj z kropką lub {,} — spójnie.`;

const TOOL = {
  name: 'solve',
  description: 'Zwraca rozwiązanie zadania matematycznego krok po kroku.',
  input_schema: {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Krótki tytuł zadania, np. "Równanie kwadratowe".' },
      steps: {
        type: 'array',
        description: 'Kolejne kroki rozwiązania.',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            explain: { type: 'string', description: '1–2 zdania uzasadnienia kroku.' },
            tex: { type: 'string', description: 'Wzór lub przekształcenie w LaTeX (dozwolony podzbiór).' }
          },
          required: ['title', 'tex']
        }
      },
      answer: { type: 'string', description: 'Końcowa odpowiedź w LaTeX.' },
      graph: { type: 'array', items: { type: 'string' }, description: 'Wyrażenia do pokazania na wykresie (składnia kalkulatora, bez LaTeX).' },
      note: { type: 'string', description: 'Uwagi: założenia, wątpliwości, nieczytelne zdjęcie, kilka zadań.' }
    },
    required: ['title', 'steps', 'answer']
  }
};

const hits = new Map();
function limited(ip) {
  const max = Number(process.env.AI_RATE) || 25;
  const now = Date.now();
  const arr = (hits.get(ip) || []).filter(t => now - t < 10 * 60 * 1000);
  arr.push(now);
  hits.set(ip, arr);
  if (hits.size > 5000) hits.clear();
  return arr.length > max;
}

function send(res, status, obj) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(obj));
}

const str = (v, n) => (typeof v === 'string' ? v.slice(0, n) : '');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'Metoda niedozwolona' });

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return send(res, 500, { error: 'Brak ANTHROPIC_API_KEY na serwerze. Dodaj go w Vercel → Settings → Environment Variables i wdróż ponownie.' });

  const code = process.env.ACCESS_CODE;
  if (code && req.headers['x-access-code'] !== code) return send(res, 401, { error: 'Nieprawidłowy kod dostępu' });

  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'x').split(',')[0].trim();
  if (limited(ip)) return send(res, 429, { error: 'Za dużo zapytań — odczekaj kilka minut.' });

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { body = null; } }
  if (!body || typeof body.q !== 'string') return send(res, 400, { error: 'Nieprawidłowe zapytanie' });

  const q = body.q.trim().slice(0, 3000);
  if (!q) return send(res, 400, { error: 'Puste zadanie' });
  const lang = body.lang === 'en' ? 'en' : 'pl';

  let image = null;
  const im = body.image;
  if (im && typeof im.data === 'string' && /^image\/(jpeg|png|webp|gif)$/.test(im.media_type) && /^[A-Za-z0-9+/=]+$/.test(im.data)) {
    if (im.data.length > 1900000) return send(res, 413, { error: 'Za duże zdjęcie — zrób mniejsze lub przytnij.' });
    image = im;
  }

  const content = [];
  if (image) {
    content.push({ type: 'text', text: 'Zdjęcie zadania:' });
    content.push({ type: 'image', source: { type: 'base64', media_type: image.media_type, data: image.data } });
  }
  content.push({ type: 'text', text: `<jezyk_interfejsu>${lang}</jezyk_interfejsu>\n<zadanie>\n${q.replace(/<\/zadanie>/gi, '')}\n</zadanie>` });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 55000);
  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || 'claude-sonnet-5-5',
        max_tokens: 4096,
        system: SYSTEM,
        tools: [TOOL],
        tool_choice: { type: 'auto' },
        messages: [{ role: 'user', content }]
      }),
      signal: ctrl.signal
    });
    if (!r.ok) {
      const map = { 401: 'Serwer ma nieprawidłowy klucz API.', 429: 'Limit zapytań do AI — spróbuj za chwilę.', 529: 'AI jest przeciążone — spróbuj za chwilę.' };
      let detail = '';
      try { const j = await r.json(); detail = String((j && j.error && j.error.message) || '').slice(0, 220); } catch { /* ignore */ }
      return send(res, 502, { error: map[r.status] || `Błąd usługi AI (${r.status})${detail ? ': ' + detail : ''}` });
    }
    const data = await r.json();
    const tool = (data.content || []).find(b => b.type === 'tool_use');
    if (tool && tool.input && typeof tool.input === 'object') {
      const t = tool.input;
      // sanityzacja: tylko oczekiwane pola i ograniczone długości
      const steps = (Array.isArray(t.steps) ? t.steps : []).slice(0, 20).map(s => ({ title: str(s && s.title, 160), explain: str(s && s.explain, 600), tex: str(s && s.tex, 600) }));
      const graph = (Array.isArray(t.graph) ? t.graph : []).filter(g => typeof g === 'string').map(g => g.slice(0, 120)).slice(0, 4);
      return send(res, 200, { title: str(t.title, 160), steps, answer: str(t.answer, 600), graph, note: str(t.note, 800) });
    }
    const text = (data.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').slice(0, 1500);
    return send(res, 200, { title: '', steps: [], answer: '', graph: [], note: text || 'Brak odpowiedzi.' });
  } catch (e) {
    return send(res, 504, { error: e && e.name === 'AbortError' ? 'AI odpowiadało zbyt długo — spróbuj prostszego zadania.' : 'Nie udało się połączyć z usługą AI.' });
  } finally {
    clearTimeout(timer);
  }
};
