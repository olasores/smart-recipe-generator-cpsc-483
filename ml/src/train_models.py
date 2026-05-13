"""
Train ML models: TF-IDF retrieval and Association Rules mining.

Usage:
  python ml/src/train_models.py --input ml/data/processed/recipes.csv
"""

import pandas as pd
import json
import joblib
from pathlib import Path
from sklearn.feature_extraction.text import TfidfVectorizer
from mlxtend.frequent_patterns import apriori, association_rules
from mlxtend.preprocessing import TransactionEncoder

def train_tfidf_and_retrieval(df: pd.DataFrame, output_dir: str = 'ml/models') -> None:
    """Train TF-IDF vectorizer and save recipe index."""
    print("Training TF-IDF vectorizer...")
    
    # Build TF-IDF on normalized ingredient text
    vectorizer = TfidfVectorizer(
        analyzer='char',
        ngram_range=(2, 3),
        max_features=1000,
        min_df=2,
        max_df=0.8
    )
    
    X = vectorizer.fit_transform(df['ingredients_text'].fillna(''))
    
    # Save vectorizer
    vectorizer_path = Path(output_dir) / 'vectorizer.joblib'
    joblib.dump(vectorizer, vectorizer_path)
    print(f"Saved vectorizer to {vectorizer_path}")
    
    # Save recipe metadata for retrieval
    metadata = df[['id', 'title', 'ingredients_normalized', 'ingredients_text']].copy()
    metadata_path = Path(output_dir) / 'recipes_metadata.csv'
    metadata.to_csv(metadata_path, index=False)
    print(f"Saved metadata to {metadata_path}")
    
    # Optionally save the TF-IDF matrix (for faster inference)
    import scipy.sparse
    matrix_path = Path(output_dir) / 'tfidf_matrix.npz'
    scipy.sparse.save_npz(matrix_path, X)
    print(f"Saved TF-IDF matrix to {matrix_path}")

def train_association_rules(df: pd.DataFrame, output_dir: str = 'ml/models', min_support: float = 0.02) -> None:
    """Mine Association Rules from ingredients."""
    print("Mining Association Rules...")
    
    # Build itemsets from ingredients
    itemsets = []
    for ing_list in df['ingredients_normalized']:
        # Handle both list and string representations
        if isinstance(ing_list, str):
            try:
                import ast
                ing_list = ast.literal_eval(ing_list)
            except:
                ing_list = [ing_list]
        
        itemset = set(ing_list) if isinstance(ing_list, (list, set)) else {ing_list}
        if itemset:
            itemsets.append(itemset)
    
    # One-hot encode for Apriori
    te = TransactionEncoder()
    te_ary = te.fit(itemsets).transform(itemsets)
    te_df = pd.DataFrame(te_ary, columns=te.columns_)
    
    print(f"Generated {te_df.shape[1]} unique ingredients from {len(itemsets)} recipes")
    
    # Run Apriori with progressively lower support thresholds
    frequent_itemsets = None
    for support in [0.02, 0.01, 0.005]:
        frequent_itemsets = apriori(te_df, min_support=support, use_colnames=True)
        print(f"With min_support={support}: Found {len(frequent_itemsets)} frequent itemsets")
        if len(frequent_itemsets) > 1:
            break
    
    # Generate rules if we have enough itemsets
    if len(frequent_itemsets) > 1:
        try:
            rules_df = association_rules(frequent_itemsets, metric='confidence', min_threshold=0.3)
            print(f"Generated {len(rules_df)} association rules")
            
            if len(rules_df) > 0:
                # Ensure numeric types
                rules_df['lift'] = pd.to_numeric(rules_df['lift'], errors='coerce')
                rules_df['confidence'] = pd.to_numeric(rules_df['confidence'], errors='coerce')
                
                # Convert to a more usable format
                rules_dict = {}
                for _, rule in rules_df.nlargest(500, 'confidence').iterrows():
                    antecedent = list(rule['antecedents'])
                    consequent = list(rule['consequents'])
                    
                    for ant in antecedent:
                        if ant not in rules_dict:
                            rules_dict[ant] = []
                        rules_dict[ant].append({
                            'suggestions': consequent,
                            'confidence': float(rule['confidence']),
                            'lift': float(rule['lift']) if not pd.isna(rule['lift']) else 1.0
                        })
                
                # Save rules
                rules_path = Path(output_dir) / 'rules.json'
                with open(rules_path, 'w') as f:
                    json.dump(rules_dict, f, indent=2)
                print(f"Saved {len(rules_dict)} ingredient rules to {rules_path}")
            else:
                print("No valid rules generated")
                rules_path = Path(output_dir) / 'rules.json'
                with open(rules_path, 'w') as f:
                    json.dump({}, f)
        except Exception as e:
            print(f"Could not generate rules: {e}")
            rules_path = Path(output_dir) / 'rules.json'
            with open(rules_path, 'w') as f:
                json.dump({}, f)
    else:
        print("Not enough frequent itemsets for rules")
        rules_path = Path(output_dir) / 'rules.json'
        with open(rules_path, 'w') as f:
            json.dump({}, f)

if __name__ == '__main__':
    import argparse
    import ast
    
    parser = argparse.ArgumentParser(description='Train ML models')
    parser.add_argument('--input', default='ml/data/processed/recipes.csv', help='Input recipes CSV')
    parser.add_argument('--output', default='ml/models', help='Output directory for models')
    
    args = parser.parse_args()
    
    print(f"Loading recipes from {args.input}...")
    df = pd.read_csv(args.input)
    
    # Parse list strings (e.g., "['chicken', 'rice']") if needed
    if 'ingredients_normalized' in df.columns and isinstance(df['ingredients_normalized'].iloc[0], str):
        try:
            df['ingredients_normalized'] = df['ingredients_normalized'].apply(
                lambda x: ast.literal_eval(x) if isinstance(x, str) else x
            )
        except:
            print("Warning: Could not parse ingredients_normalized, using ingredients_text instead")
            if 'ingredients_text' not in df.columns:
                df['ingredients_text'] = df['ingredients_normalized']
    
    print(f"Loaded {len(df)} recipes")
    
    Path(args.output).mkdir(parents=True, exist_ok=True)
    
    train_tfidf_and_retrieval(df, args.output)
    train_association_rules(df, args.output)
    
    print("\nTraining complete!")
