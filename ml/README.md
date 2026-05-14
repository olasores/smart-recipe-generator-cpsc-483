# ML Pipeline for Smart Recipe Generator

This directory contains the machine learning components for the Smart Recipe Generator project.

## Setup

1. **Download RecipeNLG dataset**
   - Go to https://www.kaggle.com/datasets/paultimothymooney/recipenlg
   - Download the dataset (CSV, JSON, or JSONL format)
   - Save to `ml/data/raw/recipes.csv` (or `.json`)

2. **Install Python dependencies**
   ```bash
   pip3 install -r ml/requirements.txt
   ```

3. **Preprocess the dataset**
   ```bash
   python3 ml/src/preprocess.py --input ml/data/raw/recipes.csv --output ml/data/processed/recipes.csv --sample 20000
   ```
   This extracts up to 20,000 clean recipes and saves to `ml/data/processed/recipes.csv`.
   Supports CSV, JSON, or JSONL input formats.

4. **Train models**
   ```bash
   python3 ml/src/train_models.py --input ml/data/processed/recipes.csv
   ```
   This trains:
   - TF-IDF vectorizer for ingredient-to-recipe retrieval
   - Association Rules for ingredient suggestions
   - Saves artifacts to `ml/models/`

## Directory Structure

- `data/raw/` - Original RecipeNLG dataset (gitignored)
- `data/processed/` - Cleaned and normalized recipe data
- `src/` - Python scripts for preprocessing and training
- `models/` - Trained model artifacts (vectorizer, metadata, rules)

## Files

### `src/preprocess.py`
Loads RecipeNLG, cleans data, normalizes ingredients, saves sample.

### `src/train_models.py`
Trains TF-IDF vectorizer and mines association rules.

### `src/predict.py`
Inference module: finds matching recipes and suggests ingredients.

## Usage in Next.js

The trained models are used by the API route at `app/api/recipe/route.ts`:

```typescript
import { find_matching_recipes, suggest_ingredients } from 'ml.src.predict'
```

Call directly from Node.js or via Python subprocess.

## .gitignore

Add to `.gitignore`:
```
ml/data/raw/
```

This prevents committing the full 2M recipe dataset, while keeping model artifacts.

## Notes

- Models are small (~50MB total) and can be committed to git
- Processing a 20k recipe subset takes ~5 minutes on a laptop
- Training is one-time; inference is fast (< 100ms per request)
