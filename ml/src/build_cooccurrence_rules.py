"""
Build ingredient-pairing rules from recipe co-occurrence (unsupervised).

For each ingredient, computes top-k other ingredients that frequently co-occur
with it across the recipe corpus, ranked by lift (P(B|A) / P(B)). Writes a
rules.json file in the same format `predict.py::suggest_ingredients` expects,
so the API path doesn't need to change.

Usage:
  python3 ml/src/build_cooccurrence_rules.py
"""

from __future__ import annotations

import ast
import json
import re
from collections import Counter, defaultdict
from pathlib import Path

import pandas as pd

REPO_ROOT = Path(__file__).resolve().parents[2]
METADATA_PATH = REPO_ROOT / "ml" / "models" / "recipes_metadata.csv"
RULES_PATH = REPO_ROOT / "ml" / "models" / "rules.json"

MEASUREMENT_WORDS = {
    "c", "cup", "cups", "tsp", "tsps", "teaspoon", "teaspoons",
    "tbsp", "tbsps", "tablespoon", "tablespoons", "oz", "ounce", "ounces",
    "lb", "lbs", "pound", "pounds", "g", "kg", "ml", "l", "pkg", "pkgs",
    "package", "packages", "can", "cans", "jar", "jars", "stick", "sticks",
    "slice", "slices", "pinch", "dash", "qt", "qts", "quart", "quarts",
    "pt", "pint", "pints", "gal", "gallon", "gallons", "doz", "dozen",
    "med", "lg", "sm", "small", "medium", "large", "x", "size",
    "of", "or", "and", "to", "for", "the", "a", "an", "in", "into",
    "on", "with", "from", "at", "by", "as", "is", "be", "any", "no",
    "fresh", "dried", "ground", "chopped", "sliced", "minced", "diced",
    "cubed", "shredded", "grated", "crushed", "whole", "halved", "softened",
    "melted", "cooked", "raw", "frozen", "canned", "boiling", "hot", "cold",
    "warm", "cool", "room", "temperature", "drained", "rinsed", "peeled",
    "cored", "seeded", "trimmed", "thawed", "uncooked", "lean", "boneless",
    "skinless", "extra", "virgin", "all", "purpose", "fine", "coarse",
    "thick", "thin", "long", "short", "instant", "quick", "regular",
    "low", "fat", "free", "reduced", "non", "stick", "approx", "approximately",
    "about", "scant", "heaping", "level", "rounded", "few", "several",
    "more", "less", "extra", "plus", "minus", "etc",
    "tbs", "tb", "lt", "ozs",
    # bigram fragments / brand words that aren't standalone ingredients
    "breast", "breasts", "thigh", "thighs", "wing", "wings", "leg", "legs",
    "krispies", "minute", "grain", "grains", "long", "instant", "quick",
    "kraft", "campbell", "campbells", "hershey", "hersheys", "knorr",
    "italian", "french", "spanish", "mexican", "chinese", "asian", "american",
    "style", "flavor", "flavored", "flavour", "favorite", "favourite",
    "container", "envelope", "envelopes", "head", "heads", "bunch", "bunches",
    "stalk", "stalks", "sprig", "sprigs", "drop", "drops", "bar", "bars",
    "piece", "pieces", "loaf", "loaves", "ear", "ears", "bay", "leaf", "leaves",
}

DIGIT_RE = re.compile(r"^[\d/.\-¼½¾⅓⅔⅛⅜⅝⅞]+$")


def extract_terms(ingredient_line: str) -> set[str]:
    """Pull noun-like tokens from a free-form ingredient string."""
    cleaned = re.sub(r"[^a-zA-Z\s\-]", " ", ingredient_line.lower())
    tokens = cleaned.split()
    out: set[str] = set()
    for tok in tokens:
        tok = tok.strip("-")
        if len(tok) < 3:
            continue
        if DIGIT_RE.match(tok):
            continue
        if tok in MEASUREMENT_WORDS:
            continue
        out.add(tok)
    return out


def recipe_terms(ing_list_str: str) -> set[str]:
    try:
        items = ast.literal_eval(ing_list_str)
    except (ValueError, SyntaxError):
        return set()
    if not isinstance(items, list):
        return set()
    terms: set[str] = set()
    for line in items:
        if isinstance(line, str):
            terms |= extract_terms(line)
    return terms


def build_rules(
    metadata_path: Path,
    *,
    min_pair_count: int = 30,
    min_term_count: int = 50,
    top_k_per_term: int = 8,
) -> dict[str, list[dict]]:
    df = pd.read_csv(metadata_path)
    print(f"Loaded {len(df)} recipes")

    term_count: Counter[str] = Counter()
    pair_count: dict[tuple[str, str], int] = defaultdict(int)
    n_recipes = 0

    for _, row in df.iterrows():
        terms = recipe_terms(row["ingredients_normalized"])
        if not terms:
            continue
        n_recipes += 1
        sorted_terms = sorted(terms)
        for i, a in enumerate(sorted_terms):
            term_count[a] += 1
            for b in sorted_terms[i + 1:]:
                pair_count[(a, b)] += 1

    print(f"Indexed {n_recipes} recipes, {len(term_count)} unique terms, "
          f"{len(pair_count)} unique pairs")

    # Build per-term suggestion list using lift = P(B|A) / P(B)
    rules: dict[str, list[dict]] = defaultdict(list)
    for (a, b), c_ab in pair_count.items():
        if c_ab < min_pair_count:
            continue
        c_a = term_count[a]
        c_b = term_count[b]
        if c_a < min_term_count or c_b < min_term_count:
            continue
        # confidence A→B = P(B|A); lift = P(B|A) / P(B)
        conf_ab = c_ab / c_a
        conf_ba = c_ab / c_b
        p_b = c_b / n_recipes
        p_a = c_a / n_recipes
        lift = conf_ab / p_b  # symmetric, same as conf_ba / p_a
        rules[a].append({"suggestions": [b], "confidence": conf_ab, "lift": lift})
        rules[b].append({"suggestions": [a], "confidence": conf_ba, "lift": lift})

    # Trim to top-K per term, sorted by confidence * lift
    trimmed: dict[str, list[dict]] = {}
    for term, candidates in rules.items():
        candidates.sort(key=lambda r: r["confidence"] * r["lift"], reverse=True)
        trimmed[term] = candidates[:top_k_per_term]

    print(f"Generated rules for {len(trimmed)} ingredients")
    return trimmed


if __name__ == "__main__":
    rules = build_rules(METADATA_PATH)
    with open(RULES_PATH, "w") as f:
        json.dump(rules, f, indent=2)
    print(f"Wrote {RULES_PATH} ({RULES_PATH.stat().st_size // 1024} KB)")

    print("\nSample suggestions:")
    for probe in ("chicken", "tomato", "garlic", "rice", "onion"):
        if probe in rules:
            top = [r["suggestions"][0] for r in rules[probe][:5]]
            print(f"  {probe}: {top}")
