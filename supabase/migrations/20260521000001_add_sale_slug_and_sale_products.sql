-- Add sale_slug to banners (nullable, unique — identifies this banner as a sale landing)
alter table banners add column if not exists sale_slug text unique;

-- Products pinned to a sale banner
create table if not exists sale_products (
  id          uuid        primary key default gen_random_uuid(),
  banner_id   uuid        not null references banners(id) on delete cascade,
  listing_id  uuid        not null references product_listings(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (banner_id, listing_id)
);

alter table sale_products enable row level security;

-- Public can read sale products (to show on the sale page)
create policy "Public can read sale products" on sale_products
  for select using (true);

-- Admin full access
create policy "Admin can insert sale products" on sale_products
  for insert with check (
    auth.uid() in (select user_id from admin_users)
  );

create policy "Admin can delete sale products" on sale_products
  for delete using (
    auth.uid() in (select user_id from admin_users)
  );
