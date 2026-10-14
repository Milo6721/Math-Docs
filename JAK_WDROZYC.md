# Math Docs — jak wdrożyć

Math Docs to osobna strona (jak Work Docs). Kalkulator graficzny, geometria, wzory i proste równania działają **bez żadnej konfiguracji**. Rozwiązywanie zadań przez AI (tekst i zdjęcia) potrzebuje klucza Anthropic na serwerze.

## 1. Wdrożenie na Vercel
1. Wejdź na vercel.com → **Add New… → Project**.
2. Przeciągnij cały folder `Math Docs` (albo wgraj go na GitHub i zaimportuj repozytorium).
3. Nazwa projektu np. `mathdocs` → adres `mathdocs.vercel.app`.
4. Kliknij **Deploy**.

## 2. Klucz AI (tylko dla „Wyjaśnij z AI” i zadań ze zdjęcia)
W projekcie na Vercel: **Settings → Environment Variables** i dodaj:

| Nazwa | Wartość | Uwagi |
|---|---|---|
| `ANTHROPIC_API_KEY` | Twój klucz z console.anthropic.com | wpisz jako Secret / Sensitive |
| `ACCESS_CODE` | dowolny kod, np. własne hasło | strona poprosi o niego raz; chroni przed cudzym użyciem Twojego klucza |

Potem **Deployments → ⋯ → Redeploy**, żeby zmienne zaczęły działać.
(Możesz użyć tego samego klucza i kodu co w Work Docs — to osobny projekt, więc zmienne trzeba dodać także tutaj.)

## 3. Co jest w środku
- **Wykresy** — wiele funkcji, suwaki (`a=1`), punkty `(2,3)`, funkcje `f(x)=…`, pochodne `f'(x)`, krzywe uwikłane `x^2+y^2=25`, nierówności `y>x^2`, punkty szczególne.
- **Geometria** — konstrukcje zależne (przeciągnij punkt, wszystko się przelicza), cofnij/ponów.
- **Rozwiązywanie** — równania i nierówności liniowe/kwadratowe lokalnie, reszta przez AI (też ze zdjęcia).
- **Wzory** — ponad 90 wzorów z wyszukiwarką.
- Przełącznik **PL / EN**, zapis automatyczny w przeglądarce, eksport PNG i projektu JSON.

Stopka: © MGS Corporation 2026.
