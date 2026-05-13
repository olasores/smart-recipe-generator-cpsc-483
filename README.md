This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

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
- **Similar real recipes:** `POST /api/recipes-match` → Python **`/matching-recipes`** — TF–IDF **similarity** over a **sample** of RecipeNLG (not the Random Forest classifier).
- **Corpus label (course model):** `POST /api/recipe-source` → **`/predict`** — your trained **RF** (`Gathered` vs `Recipes1M`).

Run Python API: `cd ml && source .venv/bin/activate && uvicorn serve_predict:app --host 127.0.0.1 --port 8765`. Optional env on the Python side: `RECIPE_MATCH_ROWS` (default 6000). Next.js: `ML_API_URL` if not localhost:8765.
