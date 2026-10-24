-- Cznnect, stage 1c: family settings.
-- Run this after 01_accounts.sql and 02_member_management.sql in Supabase SQL Editor.
-- Safe to run again.
--
-- Only the family owner can rename their family. This is enforced in the database,
-- not just by hiding the rename button in the UI.

create or replace function public.update_family_name(fid uuid, new_name text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  cleaned_name text;
begin
  if auth.uid() is null then
    raise exception 'Please sign in first';
  end if;

  if not public.is_family_owner(fid) then
    raise exception 'Only the owner can change the family name';
  end if;

  cleaned_name := trim(coalesce(new_name, ''));

  if cleaned_name = '' then
    raise exception 'Family name cannot be empty';
  end if;

  if char_length(cleaned_name) > 60 then
    raise exception 'Family name must be 60 characters or fewer';
  end if;

  update public.families
  set name = cleaned_name
  where id = fid;
end;
$$;

revoke execute on function public.update_family_name(uuid, text) from public, anon;
grant execute on function public.update_family_name(uuid, text) to authenticated;
