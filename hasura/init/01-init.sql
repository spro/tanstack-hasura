create extension if not exists pgcrypto;

create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  author_name text not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_current_timestamp_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_public_posts_updated_at on public.posts;
create trigger set_public_posts_updated_at
before update on public.posts
for each row
execute function public.set_current_timestamp_updated_at();

insert into public.posts (title, content, author_name, published)
values
  (
    'Hello Hasura',
    'Your local Hasura instance is up and ready to serve GraphQL.',
    'System',
    true
  ),
  (
    'Draft post',
    'Use the Hasura console to explore tables, permissions, and GraphQL queries.',
    'System',
    false
  )
on conflict do nothing;
