-- Cznnect, stage 1b: owner tools.
-- Run this after 01_accounts.sql. Paste it into Supabase > SQL Editor > New query, then Run.
-- It is safe to run again.
--
-- What it adds:
--   remove_member   the owner removes someone from the family
--   leave_family    a member leaves on their own
--   regenerate_invite   the owner gets a fresh invite code (the old one stops working)

create or replace function public.is_family_owner(fid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where family_id = fid and user_id = auth.uid() and role = 'owner'
  );
$$;

create or replace function public.remove_member(fid uuid, target uuid)
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
    raise exception 'Only the owner can remove people';
  end if;
  if exists (
    select 1 from public.family_members
    where family_id = fid and user_id = target and role = 'owner'
  ) then
    raise exception 'The owner cannot be removed';
  end if;

  delete from public.family_members
  where family_id = fid and user_id = target;
end;
$$;

create or replace function public.leave_family(fid uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Please sign in first';
  end if;
  if public.is_family_owner(fid) then
    raise exception 'The owner cannot leave the family';
  end if;

  delete from public.family_members
  where family_id = fid and user_id = auth.uid();
end;
$$;

create or replace function public.regenerate_invite(fid uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first';
  end if;
  if not public.is_family_owner(fid) then
    raise exception 'Only the owner can change the invite code';
  end if;

  new_code := substr(md5(random()::text || clock_timestamp()::text), 1, 8);
  update public.families set invite_code = new_code where id = fid;
  return new_code;
end;
$$;

revoke execute on function public.remove_member(uuid, uuid) from public, anon;
revoke execute on function public.leave_family(uuid) from public, anon;
revoke execute on function public.regenerate_invite(uuid) from public, anon;
grant execute on function public.remove_member(uuid, uuid) to authenticated;
grant execute on function public.leave_family(uuid) to authenticated;
grant execute on function public.regenerate_invite(uuid) to authenticated;
