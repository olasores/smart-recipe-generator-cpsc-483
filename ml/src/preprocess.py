"""
Preprocess RecipeNLG dataset: load, clean, and save a smaller subset.

Usage:
  python ml/src/preprocess.py --input ml/data/raw/recipes.json --output ml/data/processed/recipes.csv --sample 20000
"""

import json
import pandas as pd
import re
from pathlib import Path

def normalize_ingredient(ingredient: str) -> str:
    """Normalize ingredient text: lowercase, trim, remove punctuation."""
    ingredient = ingredient.lower().strip()
    ingredient = re.sub(r'\s*\([^)]*\)\s*', '', ingredient)
    ingredient = re.sub(r'\s*,.*', '', ingredient)
    ingredient = re.sub(r'\b(fresh|dried|ground|chopped|sliced|minced|diced)\b', '', ingredient)
    ingredient = ' '.join(ingredient.split())
    return ingredient.strip()

def load_recipenlg(filepath: str, sample_size: int = 20000) -> pd.DataFrame:
    """Load RecipeNLG from CSV, JSON, or JSONL file."""
    file_ext = filepath.lower().split('.')[-1]
    
    # Try CSV format first
    if file_ext == 'csv':
        try:
            df = pd.read_csv(filepath, nrows=sample_size)
            print(f"Loaded {len(df)} recipes from CSV")
            return df
        except Exception as e:
            print(f"CSV loading failed: {e}")
            raise
    
    recipes = []
    
    # Try JSONL format
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            for i, line in enumerate(f):
                if line.strip():
                    try:
                        recipe = json.loads(line)
                        recipes.append(recipe)
                        if sample_size and len(recipes) >= sample_size:
                            break
                    except json.JSONDecodeError:
                        continue
        
        if recipes:
            print(f"Loaded {len(recipes)} recipes from JSONL")
            return pd.DataFrame(recipes)
    except Exception as e:
        print(f"JSONL loading failed: {e}")
    
    # Try JSON format
    with open(filepath, 'r', encoding='utf-8') as f:
        data = json.load(f)
        if isinstance(data, list):
            recipes = data[:sample_size] if sample_size else data
        elif isinstance(data, dict):
            recipes = list(data.values())[:sample_size] if sample_size else list(data.values())
    
    print(f"Loaded {len(recipes)} recipes from JSON")
    return pd.DataFrame(recipes)

def clean_recipes(df: pd.DataFrame) -> pd.DataFrame:
    """Clean and validate recipes."""
    print(f"Starting with {len(df)} recipes")
    
    df = df.rename(columns={'name': 'title', 'recipe_name': 'title', 'directions': 'instructions', 'steps': 'instructions'})
    
    required_cols = ['title', 'ingredients', 'instructions']
    for col in required_cols:
        if col not in df.columns:
            print(f"Error: Missing column '{col}'")
            return df.head(0)
    
    df = df.dropna(subset=required_cols)
    print(f"After dropping NaN: {len(df)} recipes")
    
    # Ensure ingredients and instructions are lists
    def ensure_list(x):
        if isinstance(x, str):
            try:
                return json.loads(x)
            except:
                return [x]
        elif isinstance(x, list):
            return x
        return []
    
    df['ingredients'] = df['ingredients'].apply(ensure_list)
    df['instructions'] = df['instructions'].apply(ensure_list)
    
    df = df[(df['ingredients'].apply(len) > 0) & (df['instructions'].apply(len) > 0)]
    print(f"After filtering empty: {len(df)} recipes")
    
    df = df.drop_duplicates(subset=['title'], keep='first')
    print(f"After removing duplicates: {len(df)} recipes")
    
    df = df.reset_index(drop=True)
    df['id'] = range(len(df))
    
    return df

def normalize_ingredients(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize ingredient text."""
    def normalize_list(ing_list):
        return [normalize_ingredient(ing) for ing in ing_list if ing]
    
    df['ingredients_normalized'] = df['ingredients'].apply(normalize_list)
    df['ingredients_text'] = df['ingredients_normalized'].apply(lambda x: ' '.join(x))
    
    return df

if __name__ == '__main__':
    import argparse
    
    parser = argparse.ArgumentParser(description='Preprocess RecipeNLG')
    parser.add_argument('--input', required=True, help='Path to recipes.json')
    parser.add_argument('--output', default='ml/data/processed/recipes.csv', help='Output CSV')
    parser.add_argument('--sample', type=int, default=20000, help='Number of recipes to sample')
    
    args = parser.parse_args()
    
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    
    print(f"Loading from {args.input}...")
    df = load_recipenlg(args.input, sample_size=args.sample)
    
    print("Cleaning...")
    df = clean_recipes(df)
    
    print("Normalizing ingredients...")
    df = normalize_ingredients(df)
    
    print(f"Saving to {args.output}...")
    df.to_csv(args.output, index=False)
    
    print(f"\nDone! Saved {len(df)} recipes")
