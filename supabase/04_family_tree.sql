-- Cznnect, stage 2: the shared family tree (plus the rename-family function).
-- Run this after 01_accounts.sql and 02_member_management.sql.
-- Paste it into Supabase > SQL Editor > New query, then Run. Safe to run again.
--
-- Who can do what in the tree:
--   every member of the family   see everyone, add people, edit people, add and remove links
--   the person who added someone   remove that person or link
--   the family owner   remove or merge anyone
-- People in the tree do NOT need an account. A cousin links their own account to their
-- spot with "This is me" (claim_person) or "Add me" (add_me_to_tree).

-- 1. Rename the family (used by the "Change family name" button on Home) -------

drop function if exists public.update_family_name(uuid, text);
create function public.update_family_name(fid uuid, new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Please sign in first';
  end if;
  if not public.is_family_owner(fid) then
    raise exception 'Only the owner can change the family name';
  end if;
  if length(trim(coalesce(new_name, ''))) = 0 then
    raise exception 'Give your family a name';
  end if;
  if length(trim(new_name)) > 60 then
    raise exception 'That name is too long (60 characters at most)';
  end if;

  update public.families set name = trim(new_name) where id = fid;
end;
$$;

revoke execute on function public.update_family_name(uuid, text) from public, anon;
grant execute on function public.update_family_name(uuid, text) to authenticated;

-- 2. Tables ---------------------------------------------------------------------

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references public.families (id) on delete cascade,
  full_name text not null check (length(trim(full_name)) between 1 and 80),
  nickname text check (nickname is null or length(nickname) <= 40),
  birth_date date,
  is_deceased boolean not null default false,
  notes text check (notes is null or length(notes) <= 1000),
  claimed_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  unique (id, family_id)
);

-- Same name and same birth date in one family cannot be added twice.
create unique index if not exists people_no_exact_duplicates
  on public.people (family_id, lower(trim(full_name)), birth_date)
  where birth_date is not null;

-- One account can be linked to only one person per family.
create unique index if not exists people_one_claim_per_account
  on public.people (family_id, claimed_by)
  where claimed_by is not null;

create index if not exists people_family_idx on public.people (family_id);

-- kind = 'parent': a is a parent of b.   kind = 'partner': a and b are partners.
create table if not exists public.relationships (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null,
  a_id uuid not null,
  b_id uuid not null,
  kind text not null check (kind in ('parent', 'partner')),
  created_by uuid references public.profiles (id) on delete set null default auth.uid(),
  created_at timestamptz not null default now(),
  check (a_id <> b_id),
  foreign key (a_id, family_id) references public.people (id, family_id) on delete cascade,
  foreign key (b_id, family_id) references public.people (id, family_id) on delete cascade
);

-- The same link cannot be added twice, in either direction.
create unique index if not exists relationships_no_duplicates
  on public.relationships (family_id, kind, least(a_id, b_id), greatest(a_id, b_id));

create index if not exists relationships_family_idx on public.relationships (family_id);

-- 3. Nobody can be their own ancestor ------------------------------------------

create or replace function public.block_parent_loops()
returns trigger
language plpgsql
as $$
begin
  if new.kind = 'parent' and exists (
    with recursive below as (
      select r.b_id as id from public.relationships r
      where r.kind = 'parent' and r.a_id = new.b_id
      union
      select r.b_id from public.relationships r
      join below on r.a_id = below.id
      where r.kind = 'parent'
    )
    select 1 from below where id = new.a_id
  ) then
    raise exception 'That would make someone their own ancestor';
  end if;
  return new;
end;
$$;

drop trigger if exists relationships_block_loops on public.relationships;
create trigger relationships_block_loops
  before insert on public.relationships
  for each row execute function public.block_parent_loops();

-- 4. Privacy rules: only members of the family see or change its tree ----------

alter table public.people enable row level security;
alter table public.relationships enable row level security;

drop policy if exists "members see people" on public.people;
create policy "members see people" on public.people
  for select to authenticated
  using (public.is_family_member(family_id));

drop policy if exists "members add people" on public.people;
create policy "members add people" on public.people
  for insert to authenticated
  with check (public.is_family_member(family_id));

drop policy if exists "members edit people" on public.people;
create policy "members edit people" on public.people
  for update to authenticated
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

drop policy if exists "creator or owner removes people" on public.people;
create policy "creator or owner removes people" on public.people
  for delete to authenticated
  using (
    public.is_family_member(family_id)
    and (created_by = auth.uid() or public.is_family_owner(family_id))
  );

drop policy if exists "members see links" on public.relationships;
create policy "members see links" on public.relationships
  for select to authenticated
  using (public.is_family_member(family_id));

drop policy if exists "members add links" on public.relationships;
create policy "members add links" on public.relationships
  for insert to authenticated
  with check (public.is_family_member(family_id));

drop policy if exists "creator or owner removes links" on public.relationships;
create policy "creator or owner removes links" on public.relationships
  for delete to authenticated
  using (
    public.is_family_member(family_id)
    and (created_by = auth.uid() or public.is_family_owner(family_id))
  );

-- Which columns the app may write directly. Everything else (who added someone,
-- which account is linked) can only change through the functions below.
revoke all on public.people from anon;
revoke all on public.relationships from anon;
revoke insert, update on public.people from authenticated;
revoke insert, update on public.relationships from authenticated;
grant select, delete on public.people to authenticated;
grant select, delete on public.relationships to authenticated;
grant insert (family_id, full_name, nickname, birth_date, is_deceased, notes)
  on public.people to authenticated;
grant update (full_name, nickname, birth_date, is_deceased, notes)
  on public.people to authenticated;
grant insert (family_id, a_id, b_id, kind) on public.relationships to authenticated;

-- 5. Linking an account to a person --------------------------------------------

create or replace function public.claim_person(pid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.people;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first';
  end if;

  select * into p from public.people where id = pid;
  if p.id is null or not public.is_family_member(p.family_id) then
    raise exception 'Person not found';
  end if;
  if p.claimed_by is not null then
    raise exception 'Someone has already linked their account to this person';
  end if;
  if exists (
    select 1 from public.people
    where family_id = p.family_id and claimed_by = auth.uid()
  ) then
    raise exception 'You are already linked to someone in the tree';
  end if;

  update public.people set claimed_by = auth.uid() where id = pid;
end;
$$;

create or replace function public.unclaim_person(pid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  p public.people;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first';
  end if;

  select * into p from public.people where id = pid;
  if p.id is null or not public.is_family_member(p.family_id) then
    raise exception 'Person not found';
  end if;
  if p.claimed_by is distinct from auth.uid() and not public.is_family_owner(p.family_id) then
    raise exception 'Only that person or the owner can unlink this';
  end if;

  update public.people set claimed_by = null where id = pid;
end;
$$;

create or replace function public.add_me_to_tree(fid uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.profiles;
  pid uuid;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first';
  end if;
  if not public.is_family_member(fid) then
    raise exception 'You are not in this family';
  end if;
  if exists (
    select 1 from public.people where family_id = fid and claimed_by = auth.uid()
  ) then
    raise exception 'You are already in the tree';
  end if;

  select * into prof from public.profiles where id = auth.uid();

  insert into public.people (family_id, full_name, birth_date, claimed_by, created_by)
  values (
    fid,
    coalesce(nullif(trim(prof.display_name), ''), 'Me'),
    prof.birthday,
    auth.uid(),
    auth.uid()
  )
  returning id into pid;

  return pid;
exception
  when unique_violation then
    raise exception 'Someone with your name and birthday is already in the tree. Find them and tap "This is me".';
end;
$$;

-- 6. Merging two entries for the same person -----------------------------------
-- Moves every link from "discard" to "keep", fills in blanks on "keep", then removes "discard".

create or replace function public.merge_people(keep uuid, discard uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  k public.people;
  d public.people;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first';
  end if;
  if keep = discard then
    raise exception 'Pick two different people';
  end if;

  select * into k from public.people where id = keep;
  select * into d from public.people where id = discard;
  if k.id is null or d.id is null or not public.is_family_member(k.family_id) then
    raise exception 'Person not found';
  end if;
  if k.family_id <> d.family_id then
    raise exception 'Both people must be in the same family';
  end if;
  if not (public.is_family_owner(k.family_id) or d.created_by = auth.uid()) then
    raise exception 'Only the owner or the person who added them can merge';
  end if;
  if k.claimed_by is not null and d.claimed_by is not null then
    raise exception 'Both people are linked to accounts, so they cannot be merged';
  end if;

  insert into public.relationships (family_id, a_id, b_id, kind, created_by)
  select r.family_id,
         case when r.a_id = discard then keep else r.a_id end,
         case when r.b_id = discard then keep else r.b_id end,
         r.kind,
         r.created_by
  from public.relationships r
  where (r.a_id = discard or r.b_id = discard)
    and not ((r.a_id = discard and r.b_id = keep) or (r.b_id = discard and r.a_id = keep))
  on conflict do nothing;

  update public.people set claimed_by = null where id = discard;
  delete from public.people where id = discard;

  update public.people set
    nickname = coalesce(k.nickname, d.nickname),
    birth_date = coalesce(k.birth_date, d.birth_date),
    is_deceased = k.is_deceased or d.is_deceased,
    claimed_by = coalesce(k.claimed_by, d.claimed_by),
    notes = left(
      case
        when k.notes is null then d.notes
        when d.notes is null or d.notes = k.notes then k.notes
        else k.notes || E'\n' || d.notes
      end,
      1000
    )
  where id = keep;
end;
$$;

revoke execute on function public.claim_person(uuid) from public, anon;
revoke execute on function public.unclaim_person(uuid) from public, anon;
revoke execute on function public.add_me_to_tree(uuid) from public, anon;
revoke execute on function public.merge_people(uuid, uuid) from public, anon;
grant execute on function public.claim_person(uuid) to authenticated;
grant execute on function public.unclaim_person(uuid) to authenticated;
grant execute on function public.add_me_to_tree(uuid) to authenticated;
grant execute on function public.merge_people(uuid, uuid) to authenticated;
