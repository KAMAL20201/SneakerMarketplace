-- Homepage promotional banners (pure image carousel)
create table if not exists banners (
  id          uuid        primary key default gen_random_uuid(),
  image_url   text        not null,
  cta_url     text,
  is_active   boolean     not null default true,
  start_date  date,
  end_date    date,
  sort_order  integer     not null default 0,
  created_at  timestamptz not null default now()
);

alter table banners enable row level security;

-- Public: only see active banners
create policy "Public can read active banners" on banners
  for select using (is_active = true);

-- Admin: full access to all banners
create policy "Admin can select all banners" on banners
  for select using (
    auth.uid() in (select user_id from admin_users)
  );

create policy "Admin can insert banners" on banners
  for insert with check (
    auth.uid() in (select user_id from admin_users)
  );

create policy "Admin can update banners" on banners
  for update using (
    auth.uid() in (select user_id from admin_users)
  );

create policy "Admin can delete banners" on banners
  for delete using (
    auth.uid() in (select user_id from admin_users)
  );
