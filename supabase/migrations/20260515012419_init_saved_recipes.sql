create table if not exists public.saved_recipes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null check (source in ('claude','dataset')),
  title text not null,
  summary text,
  ingredients jsonb not null default '[]'::jsonb,
  instructions jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists saved_recipes_user_idx
  on public.saved_recipes (user_id, created_at desc);

alter table public.saved_recipes enable row level security;

drop policy if exists "Users read their own recipes" on public.saved_recipes;
create policy "Users read their own recipes"
  on public.saved_recipes for select using (auth.uid() = user_id);

drop policy if exists "Users insert their own recipes" on public.saved_recipes;
create policy "Users insert their own recipes"
  on public.saved_recipes for insert with check (auth.uid() = user_id);

drop policy if exists "Users delete their own recipes" on public.saved_recipes;
create policy "Users delete their own recipes"
  on public.saved_recipes for delete using (auth.uid() = user_id);
