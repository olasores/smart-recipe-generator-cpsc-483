"""
Local HTTP API for ML features used by the Next.js app.

Run:
  cd ml && source .venv/bin/activate && uvicorn serve_predict:app --host 127.0.0.1 --port 8765

Endpoints:
  POST /predict          — trained pipeline on `recipe_rf_pipeline.joblib` (corpus label: Gathered vs Recipes1M).
  POST /matching-recipes — RecipeNLG rows closest to the user's ingredients (TF–IDF cosine), each row plus the
                          same query run through the saved pipeline so every suggestion uses the trained model.
"""

from __future__ import annotations

import ast
import os
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

REPO_ROOT = Path(__file__).resolve().parent.parent
MODEL_PATH = REPO_ROOT / "ml" / "data" / "recipe_rf_pipeline.joblib"
CSV_CANDIDATES = [
    REPO_ROOT / "ml" / "data" / "RecipeNLG_dataset.csv",
    REPO_ROOT / "ml" / "data" / "full_dataset.csv",
]

if not MODEL_PATH.is_file():
    raise SystemExit(f"Missing trained model at {MODEL_PATH}. Run the notebook save cell first.")

model = joblib.load(MODEL_PATH)
app = FastAPI(title="Recipe ML API (classifier + retrieval)")


def _rf_annotation(text: str) -> dict[str, Any]:
    """Run the saved sklearn pipeline on one document (full recipe row text or user query)."""
    pred = model.predict([text])[0]
    out: dict[str, Any] = {"trained_label": str(pred)}
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba([text])[0]
        clf = model.named_steps.get("clf")
        classes = getattr(clf, "classes_", None)
        if classes is not None:
            out["trained_probabilities"] = {str(c): float(p) for c, p in zip(classes, probs)}
    return out


def _csv_path() -> Path | None:
    for p in CSV_CANDIDATES:
        if p.is_file():
            return p
    return None


def list_cell_to_text(val: Any) -> str:
    if pd.isna(val):
        return ""
    s = str(val).strip()
    if s.startswith("["):
        try:
            parts = ast.literal_eval(s)
            return " ".join(str(p) for p in parts)
        except (ValueError, SyntaxError):
            return s
    return s


def _col_map(df: pd.DataFrame) -> dict[str, str]:
    return {str(c).strip().lower(): c for c in df.columns}


_corpus_bundle: tuple[TfidfVectorizer, Any, list[str], list[str]] | None = None


def _load_matching_index() -> tuple[TfidfVectorizer, Any, list[str], list[str]]:
    """Build TF–IDF matrix over a sample of recipes (lazy, cached)."""
    global _corpus_bundle
    if _corpus_bundle is not None:
        return _corpus_bundle

    csv_path = _csv_path()
    if csv_path is None:
        raise FileNotFoundError("No RecipeNLG CSV in ml/data/. Download from Kaggle for ingredient matching.")

    max_rows = int(os.environ.get("RECIPE_MATCH_ROWS", "6000"))
    raw = pd.read_csv(csv_path, nrows=max_rows)
    cmap = _col_map(raw)
    for need in ("ner", "title"):
        if need not in cmap:
            raise KeyError(f"CSV needs a {need!r} column. Found: {list(raw.columns)}")

    ner_c, ttl_c = cmap["ner"], cmap["title"]
    texts: list[str] = []
    titles: list[str] = []
    for _, row in raw.iterrows():
        t = list_cell_to_text(row[ner_c]) + " " + str(row[ttl_c])
        t = t.strip()
        if len(t) < 8:
            continue
        texts.append(t)
        titles.append(str(row[ttl_c]).strip() or "Untitled")

    if len(texts) < 10:
        raise RuntimeError("Too few rows after cleaning; check CSV.")

    vectorizer = TfidfVectorizer(max_features=8000, ngram_range=(1, 2), min_df=2)
    matrix = vectorizer.fit_transform(texts)
    _corpus_bundle = (vectorizer, matrix, titles, texts)
    return _corpus_bundle


class PredictBody(BaseModel):
    text: str


class MatchingBody(BaseModel):
    ingredients: str = Field(..., min_length=2)
    top_k: int = Field(5, ge=1, le=20)


@app.get("/health")
def health() -> dict:
    return {
        "ok": True,
        "model_path": str(MODEL_PATH),
        "csv_for_matching": str(_csv_path()) if _csv_path() else None,
    }


@app.post("/predict")
def predict(body: PredictBody) -> dict:
    text = body.text.strip()
    if len(text) < 2:
        raise HTTPException(status_code=400, detail="text too short")

    prediction = model.predict([text])[0]
    out: dict = {"prediction": str(prediction)}

    if hasattr(model, "predict_proba"):
        probs = model.predict_proba([text])[0]
        clf = model.named_steps.get("clf")
        classes = getattr(clf, "classes_", None)
        if classes is not None:
            out["probabilities"] = {str(c): float(p) for c, p in zip(classes, probs)}

    return out


@app.post("/matching-recipes")
def matching_recipes(body: MatchingBody) -> dict:
    """Return existing RecipeNLG rows whose text is closest to the user's ingredient string (cosine similarity)."""
    query = body.ingredients.strip()
    try:
        vectorizer, matrix, titles, texts = _load_matching_index()
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except (KeyError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    q_vec = vectorizer.transform([query])
    sims = cosine_similarity(q_vec, matrix).flatten()
    k = min(body.top_k, len(sims))
    top_idx = np.argsort(sims)[-k:][::-1]

    matches: list[dict[str, Any]] = []
    for i in top_idx:
        idx = int(i)
        full = texts[idx]
        snippet = full
        if len(snippet) > 220:
            snippet = snippet[:217] + "..."
        row: dict[str, Any] = {
            "title": titles[idx],
            "similarity": float(sims[idx]),
            "snippet": snippet,
        }
        row.update(_rf_annotation(full))
        matches.append(row)

    return {
        "matches": matches,
        "user_query_model": _rf_annotation(query),
        "note": (
            "Suggestions are real RecipeNLG rows ranked by TF–IDF similarity to your ingredients; "
            "each row (and your query) is scored with the saved Random Forest pipeline from the notebook."
        ),
    }
