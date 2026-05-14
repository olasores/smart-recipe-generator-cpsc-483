"""
Local HTTP API for ML features used by the Next.js app.

Run:
  cd ml && source .venv/bin/activate && uvicorn serve_predict:app --host 127.0.0.1 --port 8765

Endpoints:
  POST /predict          — trained pipeline on `recipe_rf_pipeline.joblib` (corpus label: Gathered vs Recipes1M).
  POST /matching-recipes — Only RecipeNLG rows whose **NER + ingredients + title** contain **every** user-listed
                          ingredient (extras in the recipe are OK). Ranked by NER phrase hits, then TF–IDF on
                          NER+ingredients+title. Each match includes full `ingredients` and `directions` arrays
                          plus RF scores on NER+title (notebook-aligned).
"""

from __future__ import annotations

import ast
import os
import re
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
    REPO_ROOT / "ml" / "data" / "RecipeNLG_sample.csv",
]

if not MODEL_PATH.is_file():
    raise SystemExit(f"Missing trained model at {MODEL_PATH}. Run the notebook save cell first.")

model = joblib.load(MODEL_PATH)
app = FastAPI(title="Recipe ML API (classifier + retrieval)")


def _rf_annotation(text: str) -> dict[str, Any]:
    """Run the saved sklearn pipeline on one document (NER+title, same as notebook `recipe_text`)."""
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


def directions_to_steps(val: Any) -> list[str]:
    if pd.isna(val):
        return []
    s = str(val).strip()
    if s.startswith("["):
        try:
            parts = ast.literal_eval(s)
            return [str(p).strip() for p in parts if str(p).strip()]
        except (ValueError, SyntaxError):
            return [s] if s else []
    return [s] if s else []


def ingredients_to_lines(val: Any) -> list[str]:
    if pd.isna(val):
        return []
    s = str(val).strip()
    if s.startswith("["):
        try:
            parts = ast.literal_eval(s)
            return [str(p).strip() for p in parts if str(p).strip()]
        except (ValueError, SyntaxError):
            return [s] if s else []
    return [s] if s else []


def _col_map(df: pd.DataFrame) -> dict[str, str]:
    return {str(c).strip().lower(): c for c in df.columns}


def parse_user_ingredient_phrases(query: str) -> list[str]:
    parts = re.split(r"[\n,]+", query)
    out: list[str] = []
    for p in parts:
        t = " ".join(p.strip().lower().split())
        if len(t) >= 2:
            out.append(t)
    return out


def haystack_contains_all_phrases(hay_raw: str, phrases: list[str]) -> bool:
    """Every phrase must appear as a whole token run (space-padded) in normalized lowercase text."""
    if not phrases:
        return False
    h = " " + " ".join(hay_raw.lower().split()) + " "
    for ph in phrases:
        if f" {ph} " not in h:
            return False
    return True


def ner_phrase_hits(ner_raw: str, phrases: list[str]) -> int:
    ner = " " + " ".join(ner_raw.lower().split()) + " "
    return sum(1 for p in phrases if f" {p} " in ner)


_corpus_bundle: (
    tuple[
        TfidfVectorizer,
        Any,
        list[str],
        list[str],
        list[str],
        list[str],
        list[list[str]],
        list[list[str]],
    ]
    | None
) = None


def _load_matching_index() -> tuple[
    TfidfVectorizer,
    Any,
    list[str],
    list[str],
    list[str],
    list[str],
    list[list[str]],
    list[list[str]],
]:
    """TF–IDF on NER+ingredients+title; parallel NER-only + model doc + full rows for filter and UI."""
    global _corpus_bundle
    if _corpus_bundle is not None:
        return _corpus_bundle

    csv_path = _csv_path()
    if csv_path is None:
        raise FileNotFoundError("No RecipeNLG CSV in ml/data/. See ml/data/DATA_HERE.txt.")

    max_rows = int(os.environ.get("RECIPE_MATCH_ROWS", "12000"))
    raw = pd.read_csv(csv_path, nrows=max_rows)
    cmap = _col_map(raw)
    for need in ("ner", "title"):
        if need not in cmap:
            raise KeyError(f"CSV needs a {need!r} column. Found: {list(raw.columns)}")

    ner_c, ttl_c = cmap["ner"], cmap["title"]
    ing_c = cmap.get("ingredients")
    dir_c = cmap.get("directions")

    rank_docs: list[str] = []
    model_docs: list[str] = []
    ner_docs: list[str] = []
    titles: list[str] = []
    ingredients_lines: list[list[str]] = []
    directions_list: list[list[str]] = []

    for _, row in raw.iterrows():
        ner_t = list_cell_to_text(row[ner_c])
        ttl = str(row[ttl_c]).strip() or "Untitled"
        ing_t = list_cell_to_text(row[ing_c]) if ing_c else ""
        rank_doc = (ner_t + " " + ing_t + " " + ttl).strip()
        model_doc = (ner_t + " " + ttl).strip()
        if len(rank_doc) < 8:
            continue
        rank_docs.append(rank_doc)
        model_docs.append(model_doc)
        ner_docs.append(ner_t.strip())
        titles.append(ttl)
        ingredients_lines.append(ingredients_to_lines(row[ing_c]) if ing_c else [])
        directions_list.append(directions_to_steps(row[dir_c]) if dir_c else [])

    if len(rank_docs) < 10:
        raise RuntimeError("Too few rows after cleaning; check CSV.")

    vectorizer = TfidfVectorizer(max_features=8000, ngram_range=(1, 2), min_df=2)
    matrix = vectorizer.fit_transform(rank_docs)
    _corpus_bundle = (
        vectorizer,
        matrix,
        titles,
        rank_docs,
        model_docs,
        ner_docs,
        ingredients_lines,
        directions_list,
    )
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
    """Only rows containing every user ingredient in NER+ingredients+title; ranked; full steps in response."""
    query = body.ingredients.strip()
    phrases = parse_user_ingredient_phrases(query)
    if not phrases:
        raise HTTPException(
            status_code=400,
            detail="List at least one ingredient (comma or newline separated), each at least 2 characters.",
        )

    try:
        vectorizer, matrix, titles, rank_docs, model_docs, ner_docs, ingredients_lines, directions_list = (
            _load_matching_index()
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=503, detail=str(e)) from e
    except (KeyError, RuntimeError) as e:
        raise HTTPException(status_code=500, detail=str(e)) from e

    eligible: list[int] = []
    for i, doc in enumerate(rank_docs):
        if haystack_contains_all_phrases(doc, phrases):
            eligible.append(i)

    if not eligible:
        return {
            "matches": [],
            "user_query_model": _rf_annotation(query),
            "required_ingredients": phrases,
            "note": (
                "No recipe in the loaded sample contains **all** of: "
                + ", ".join(phrases)
                + ". Try broader spellings (e.g. noodles vs pasta), fewer items, or set RECIPE_MATCH_ROWS higher."
            ),
        }

    sub = matrix[eligible]
    q_vec = vectorizer.transform([query])
    sims = cosine_similarity(q_vec, sub).flatten()

    def sort_key(local_j: int) -> tuple[int, float]:
        orig = eligible[local_j]
        return (ner_phrase_hits(ner_docs[orig], phrases), sims[local_j])

    order = list(range(len(sims)))
    order.sort(key=lambda j: sort_key(j), reverse=True)
    k = min(body.top_k, len(order))
    top_local = order[:k]

    matches: list[dict[str, Any]] = []
    for j in top_local:
        idx = int(eligible[int(j)])
        rank_doc = rank_docs[idx]
        model_doc = model_docs[idx]
        snippet = rank_doc
        if len(snippet) > 220:
            snippet = snippet[:217] + "..."
        row: dict[str, Any] = {
            "title": titles[idx],
            "similarity": float(sims[int(j)]),
            "ner_ingredient_hits": ner_phrase_hits(ner_docs[idx], phrases),
            "snippet": snippet,
            "ingredients": ingredients_lines[idx],
            "directions": directions_list[idx],
        }
        row.update(_rf_annotation(model_doc))
        matches.append(row)

    return {
        "matches": matches,
        "user_query_model": _rf_annotation(query),
        "required_ingredients": phrases,
        "note": (
            "Each recipe contains **all** your listed ingredients somewhere in NER + ingredient lines + title "
            "(the recipe may list more ingredients). Ranked by how many appear in structured NER, then similarity. "
            "Open a result for full ingredient lines and cooking steps from the dataset."
        ),
    }
