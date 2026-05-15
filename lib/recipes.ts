'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getSupabaseServerClient } from './supabase/server';

export type RecipeSource = 'claude' | 'dataset';

export type SavedRecipeInput = {
  source: RecipeSource;
  title: string;
  summary?: string;
  ingredients: string[];
  instructions: string[];
};

export type SavedRecipe = {
  id: string;
  user_id: string;
  source: RecipeSource;
  title: string;
  summary: string | null;
  ingredients: string[];
  instructions: string[];
  created_at: string;
};

type SaveResult = { ok: true } | { ok: false; error: string };

function sanitizeStringList(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  return values
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter((v) => v.length > 0);
}

export async function saveRecipe(input: SavedRecipeInput): Promise<SaveResult> {
  if (!input || typeof input !== 'object') {
    return { ok: false, error: 'Invalid recipe' };
  }
  if (input.source !== 'claude' && input.source !== 'dataset') {
    return { ok: false, error: 'Invalid recipe source' };
  }
  const title = String(input.title ?? '').trim();
  if (!title) {
    return { ok: false, error: 'Recipe has no title' };
  }

  const supabase = await getSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return { ok: false, error: 'You must be logged in to save recipes.' };

  const { error } = await supabase.from('saved_recipes').insert({
    user_id: user.id,
    source: input.source,
    title,
    summary: input.summary?.trim() || null,
    ingredients: sanitizeStringList(input.ingredients),
    instructions: sanitizeStringList(input.instructions),
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath('/my-recipes');
  return { ok: true };
}

export async function deleteSavedRecipe(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '').trim();
  if (!id) return;

  const supabase = await getSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) redirect('/');

  await supabase
    .from('saved_recipes')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  revalidatePath('/my-recipes');
}

export async function getMyRecipes(): Promise<SavedRecipe[]> {
  const supabase = await getSupabaseServerClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) return [];

  const { data, error } = await supabase
    .from('saved_recipes')
    .select('id, user_id, source, title, summary, ingredients, instructions, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data as SavedRecipe[];
}
