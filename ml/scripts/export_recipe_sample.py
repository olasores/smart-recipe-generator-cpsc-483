#!/usr/bin/env python3
"""
Copy only the first N rows from a full RecipeNLG CSV into RecipeNLG_sample.csv.

Use this when the Kaggle download is multi‑GB: pandas stops reading after `nrows`,
so you never load the whole file into memory. The sample is small enough to commit
to GitHub (stay under ~100 MB per file — use a smaller --nrows if needed).

Run from the `ml/` directory (after `pip install -r requirements.txt`):

  cd ml && source .venv/bin/activate
  python scripts/export_recipe_sample.py
  python scripts/export_recipe_sample.py --nrows 40000 --src data/full_dataset.csv
"""

from __future__ import annotations

import argparse
import sys
from pathlib import Path


def main() -> None:
    here = Path(__file__).resolve().parent
    ml_dir = here.parent
    data_dir = ml_dir / "data"

    parser = argparse.ArgumentParser(description="Export first N rows of RecipeNLG CSV for Git.")
    parser.add_argument(
        "--src",
        type=Path,
        default=data_dir / "RecipeNLG_dataset.csv",
        help="Source CSV path (default: ml/data/RecipeNLG_dataset.csv)",
    )
    parser.add_argument(
        "--out",
        type=Path,
        default=data_dir / "RecipeNLG_sample.csv",
        help="Output path (default: ml/data/RecipeNLG_sample.csv)",
    )
    parser.add_argument(
        "--nrows",
        type=int,
        default=80_000,
        help="Number of rows to copy from the start of the file (default: 80000).",
    )
    args = parser.parse_args()

    src = args.src if args.src.is_absolute() else (Path.cwd() / args.src).resolve()
    if not src.is_file():
        print(f"Error: source not found: {src}", file=sys.stderr)
        sys.exit(1)

    out = args.out if args.out.is_absolute() else (Path.cwd() / args.out).resolve()
    out.parent.mkdir(parents=True, exist_ok=True)

    import pandas as pd

    df = pd.read_csv(src, nrows=args.nrows)
    df.to_csv(out, index=False)
    size_mb = out.stat().st_size / (1024 * 1024)
    print(f"Wrote {len(df):,} rows -> {out} ({size_mb:.1f} MB)")
    if size_mb > 95:
        print("Warning: output is near GitHub's ~100 MB per-file limit; re-run with a smaller --nrows.", file=sys.stderr)


if __name__ == "__main__":
    main()
