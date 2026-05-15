'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { saveRecipe, type SavedRecipeInput } from '@/lib/recipes';

type Status = 'idle' | 'saved' | 'error';

type SaveRecipeButtonProps = {
  recipe: SavedRecipeInput;
  className?: string;
  savedClassName?: string;
  errorClassName?: string;
};

const defaultClass =
  'inline-flex h-10 items-center justify-center rounded-full border border-rose-200 bg-white px-4 text-sm font-medium text-rose-700 transition hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60';
const defaultSavedClass =
  'inline-flex h-10 items-center justify-center rounded-full border border-emerald-300 bg-emerald-50 px-4 text-sm font-medium text-emerald-800';
const defaultErrorClass =
  'inline-flex h-10 items-center justify-center rounded-full border border-rose-300 bg-rose-50 px-4 text-sm font-medium text-rose-700 hover:bg-rose-100';

export function SaveRecipeButton({ recipe, className, savedClassName, errorClassName }: SaveRecipeButtonProps) {
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<Status>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const resetTimer = useRef<number | null>(null);

  // Reset to idle when the recipe content changes (e.g. user regenerates).
  const recipeKey = `${recipe.source}|${recipe.title}|${recipe.ingredients.length}|${recipe.instructions.length}`;
  useEffect(() => {
    setStatus('idle');
    setErrorMessage('');
  }, [recipeKey]);

  useEffect(() => {
    return () => {
      if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
    };
  }, []);

  function handleClick() {
    if (pending) return;

    startTransition(async () => {
      const result = await saveRecipe(recipe);
      if (result.ok) {
        setStatus('saved');
        setErrorMessage('');
        if (resetTimer.current !== null) window.clearTimeout(resetTimer.current);
        resetTimer.current = window.setTimeout(() => setStatus('idle'), 2500);
      } else {
        setStatus('error');
        setErrorMessage(result.error);
      }
    });
  }

  const label = pending
    ? 'Saving…'
    : status === 'saved'
      ? 'Saved ✓'
      : status === 'error'
        ? 'Try again'
        : 'Save recipe';

  const cls =
    status === 'saved'
      ? (savedClassName ?? defaultSavedClass)
      : status === 'error'
        ? (errorClassName ?? defaultErrorClass)
        : (className ?? defaultClass);

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className={cls}
        aria-live="polite"
      >
        {label}
      </button>
      {status === 'error' && errorMessage ? (
        <p className="max-w-[280px] text-right text-xs leading-5 text-rose-700">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
