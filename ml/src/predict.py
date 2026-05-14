"""
Predict: Find matching recipes and suggest ingredients using trained models.

Usage (as module):
  from ml.src.predict import find_matching_recipes, suggest_ingredients
  matching = find_matching_recipes(['chicken', 'rice'], top_k=3)
  suggestions = suggest_ingredients(['chicken', 'rice'])
"""

import json
import numpy as np
import pandas as pd
import joblib
from pathlib import Path
from sklearn.metrics.pairwise import cosine_similarity
import scipy.sparse

MODEL_DIR = Path(__file__).parent.parent / 'models'

def load_models():
    """Load trained models."""
    vectorizer_path = MODEL_DIR / 'vectorizer.joblib'
    metadata_path = MODEL_DIR / 'recipes_metadata.csv'
    matrix_path = MODEL_DIR / 'tfidf_matrix.npz'
    rules_path = MODEL_DIR / 'rules.json'
    
    vectorizer = joblib.load(vectorizer_path) if vectorizer_path.exists() else None
    metadata = pd.read_csv(metadata_path) if metadata_path.exists() else None
    tfidf_matrix = scipy.sparse.load_npz(matrix_path) if matrix_path.exists() else None
    
    with open(rules_path, 'r') as f:
        rules = json.load(f)
    
    return vectorizer, metadata, tfidf_matrix, rules

def find_matching_recipes(ingredients: list, top_k: int = 3) -> list:
    """
    Find recipes matching the given ingredients.
    
    Args:
        ingredients: List of ingredient names
        top_k: Number of top matches to return
    
    Returns:
        List of dicts with 'id', 'title', 'similarity' keys
    """
    vectorizer, metadata, tfidf_matrix, _ = load_models()
    
    if vectorizer is None or metadata is None or tfidf_matrix is None:
        return []
    
    # Vectorize user input
    user_text = ' '.join(ingredients).lower()
    user_vec = vectorizer.transform([user_text])
    
    # Compute similarities
    similarities = cosine_similarity(user_vec, tfidf_matrix).flatten()
    
    # Get top matches
    top_indices = np.argsort(similarities)[-top_k:][::-1]
    
    results = []
    for idx in top_indices:
        if similarities[idx] > 0:
            results.append({
                'id': int(metadata.iloc[idx]['id']),
                'title': metadata.iloc[idx]['title'],
                'similarity': float(similarities[idx])
            })
    
    return results

def suggest_ingredients(selected_ingredients: list, top_k: int = 3) -> list:
    """
    Suggest ingredients that typically pair with the selected ones.
    
    Args:
        selected_ingredients: List of selected ingredient names
        top_k: Number of suggestions to return
    
    Returns:
        List of suggested ingredient names
    """
    _, _, _, rules = load_models()
    
    if not rules:
        return []
    
    suggestions = {}
    for ingredient in selected_ingredients:
        ingredient_lower = ingredient.lower()
        
        if ingredient_lower in rules:
            for rule in rules[ingredient_lower]:
                for suggestion in rule['suggestions']:
                    if suggestion not in selected_ingredients:
                        suggestion_lower = suggestion.lower()
                        if suggestion_lower not in suggestions:
                            suggestions[suggestion_lower] = 0
                        suggestions[suggestion_lower] += rule['confidence'] * rule['lift']
    
    # Sort by score and return top k
    sorted_suggestions = sorted(suggestions.items(), key=lambda x: x[1], reverse=True)
    return [sugg[0] for sugg in sorted_suggestions[:top_k]]

if __name__ == '__main__':
    import sys
    
    # Parse command-line arguments
    # Usage: python predict.py ingredient1 ingredient2 ...
    if len(sys.argv) > 1:
        ingredients = sys.argv[1:]
        
        # Get predictions
        matching_recipes = find_matching_recipes(ingredients, top_k=5)
        suggested_ingredients = suggest_ingredients(ingredients, top_k=5)
        
        # Output JSON for API consumption
        result = {
            'matchingRecipes': matching_recipes,
            'suggestedIngredients': suggested_ingredients
        }
        print(json.dumps(result))
