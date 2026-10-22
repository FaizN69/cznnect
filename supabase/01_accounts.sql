-- Cznnect, stage 1: accounts and family spaces.
-- Paste this whole file into Supabase > SQL Editor > New query, then press Run.
-- It is safe to run again if something goes wrong.

-- 1. Tables ---------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  birthday date,
  created_at timestamptz not null default now()
);

create table if not exists public.families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  invite_code text not null unique
    default substr(md5(random()::text || clock_timestamp()::text), 1, 8),
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table if not exists public.family_members (
  family_id uuid not null references public.families (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

-- 2. Make a profile automatically when someone signs up -------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Helpers used by the privacy rules ------------------------------------

create or replace function public.is_family_member(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = fid and user_id = auth.uid()
  );
$$;

create or replace function public.shares_family_with(other uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.family_members a
    join public.family_members b on a.family_id = b.family_id
    where a.user_id = auth.uid() and b.user_id = other
  );
$$;

-- 4. Privacy rules: you only see families you belong to -------------------

alter table public.profiles enable row level security;
alter table public.families enable row level security;
alter table public.family_members enable row level security;

drop policy if exists "see yourself and family" on public.profiles;
create policy "see yourself and family" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.shares_family_with(id));

drop policy if exists "edit your own profile" on public.profiles;
create policy "edit your own profile" on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "see your families" on public.families;
create policy "see your families" on public.families
  for select to authenticated
  using (public.is_family_member(id));

drop policy if exists "see your family members" on public.family_members;
create policy "see your family members" on public.family_members
  for select to authenticated
  using (public.is_family_member(family_id));

-- Nobody can insert into families or family_members directly.
-- The two functions below are the only way in.

-- 5. Create a family, or join one with an invite code ---------------------

create or replace function public.create_family(family_name text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first';
  end if;
  if trim(coalesce(family_name, '')) = '' then
    raise exception 'Give your family a name';
  end if;

  insert into public.families (name, created_by)
  values (trim(family_name), auth.uid())
  returning id into fid;

  insert into public.family_members (family_id, user_id, role)
  values (fid, auth.uid(), 'owner');

  return fid;
end;
$$;

create or replace function public.join_family(code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  fid uuid;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first';
  end if;

  select id into fid from public.families
  where invite_code = lower(trim(code));

  if fid is null then
    raise exception 'That invite code does not match any family';
  end if;

  insert into public.family_members (family_id, user_id)
  values (fid, auth.uid())
  on conflict do nothing;

  return fid;
end;
$$;

revoke execute on function public.create_family(text) from public, anon;
revoke execute on function public.join_family(text) from public, anon;
grant execute on function public.create_family(text) to authenticated;
grant execute on function public.join_family(text) to authenticated;
