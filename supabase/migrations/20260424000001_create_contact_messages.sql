create table contact_messages (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  message text not null,
  is_read boolean not null default false,
  admin_reply text,
  replied_at timestamptz,
  created_at timestamptz not null default now()
);

alter table contact_messages enable row level security;

-- Anyone can insert (public contact form)
create policy "allow public insert" on contact_messages
  for insert with check (true);

-- Only admin can select
create policy "allow admin select" on contact_messages
  for select using (
    exists (select 1 from admin_users where user_id = auth.uid())
  );

-- Only admin can update (mark as read, store reply)
create policy "allow admin update" on contact_messages
  for update using (
    exists (select 1 from admin_users where user_id = auth.uid())
  );
