create table if not exists public.short_links (
  slug text primary key,
  target_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists short_links_created_at_idx
  on public.short_links (created_at desc);

alter table public.short_links enable row level security;

drop policy if exists "Service role can manage short links" on public.short_links;

create policy "Service role can manage short links"
  on public.short_links
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
