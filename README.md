This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

Smart recipe UI: optional **Claude** generation plus a **local Python** API for RecipeNLG matching and your trained sklearn pipeline.

## Run locally (two terminals)

Dataset matching and model labels need **both** processes. Claude-only generation can still work if Python is not running, but the green “Sklearn + RecipeNLG” flow needs the API.

**One-time setup**

1. From the **repo root**: `npm install`
2. Python env (from repo root):

   ```bash
   cd ml && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
   ```

3. **Data** — add `RecipeNLG_dataset.csv` (or `full_dataset.csv`) under `ml/data/` (see `ml/data/DATA_HERE.txt`). The CSV is **not** committed to Git; teammates download it separately. Commit `ml/data/recipe_rf_pipeline.joblib` after you train (small file; allowed by `ml/data/.gitignore`).

4. **Claude** — add keys to `.env.local` in the repo root (see [Anthropic setup](#anthropic-setup)).

**Terminal 1 — Next.js (http://localhost:3000)**

From the **project root** (not `ml/`):

```bash
npm run dev
```

**Terminal 2 — Python ML API (http://127.0.0.1:8765)**

From the **repo root**:

```bash
cd ml && source .venv/bin/activate && uvicorn serve_predict:app --host 127.0.0.1 --port 8765
```

Keep this terminal open. Next.js calls `http://127.0.0.1:8765` by default; set `ML_API_URL` in `.env.local` if the ML service runs elsewhere.

**Optional (Python)**

- `RECIPE_MATCH_ROWS` — max CSV rows loaded for matching (default `6000`).

Edit `app/page.tsx` (and other files); the Next dev server hot-reloads.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Anthropic setup

The recipe generator now calls Claude through Anthropic from the server. Add these environment variables to `.env.local` before running the app:

```bash
ANTHROPIC_API_KEY=your_key_here
ANTHROPIC_MODEL=claude-sonnet-4-6
```

`ANTHROPIC_MODEL` is optional; if you omit it, the app falls back to the default model in the API route.

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## CPSC 483 — ML + ingredients (local)

- **Generate recipes:** `POST /api/recipe` (Claude) — writes a **new** recipe from your ingredients.
- **Dataset matches:** `POST /api/recipes-match` → Python **`/matching-recipes`** — RecipeNLG rows from a CSV sample, ranked by **TF–IDF** similarity to your ingredients; each match (and your query) is also scored with the saved **Random Forest** pipeline (`Gathered` vs `Recipes1M`).
- **Corpus label only:** `POST /api/recipe-source` → **`/predict`** — same sklearn pipeline on arbitrary text.

Use [Run locally (two terminals)](#run-locally-two-terminals) above. Override the ML base URL with `ML_API_URL` in `.env.local` if needed.
