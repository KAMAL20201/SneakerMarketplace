create table public.home_brand_sections (
  id uuid primary key default gen_random_uuid(),
  brand text not null check (length(trim(brand)) between 1 and 100 and brand !~ '[%,_\\]'),
  title text not null default '' check (length(title) <= 120),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create unique index home_brand_sections_brand_key on public.home_brand_sections (lower(trim(brand)));
alter table public.home_brand_sections enable row level security;
grant select on public.home_brand_sections to anon, authenticated;
grant insert, update, delete on public.home_brand_sections to authenticated;
create policy "Read active brand sections" on public.home_brand_sections
  for select to anon, authenticated using (is_active);
create policy "Admins manage brand sections" on public.home_brand_sections
  for all to authenticated
  using ((select auth.uid()) in (select user_id from public.admin_users))
  with check ((select auth.uid()) in (select user_id from public.admin_users));
insert into public.home_brand_sections (brand, title) values ('Anta', 'Anta Running');
