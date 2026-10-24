// Every change to the family tree goes through here, so errors are handled the same way
// everywhere and always come back as plain sentences the screens can show.
import { supabase } from '../supabase'
import { withTimeout } from './net'

export type PersonValues = {
  full_name: string
  nickname: string
  birth_date: string // '' when unknown
  is_deceased: boolean
  notes: string
}

type DbError = { message: string; code?: string }
type Kind = 'person' | 'link' | 'other'

function friendly(e: DbError, what: Kind): string {
  if (e.code === '23505') {
    if (what === 'person') return 'Someone with that name and birth date is already in the tree.'
    if (what === 'link') return 'They are already linked that way.'
    return 'That already exists.'
  }
  if (e.code === '42501') return 'You do not have permission to do that.'
  if (e.code === '23514') return 'Please check the details. Name is required, and some fields have a length limit.'
  return e.message
}

async function run<T>(
  what: Kind,
  fn: () => PromiseLike<{ data: T | null; error: DbError | null }>,
): Promise<{ data: T | null; error: string | null }> {
  try {
    const r = await withTimeout(fn())
    return { data: r.data, error: r.error ? friendly(r.error, what) : null }
  } catch {
    return { data: null, error: 'Could not reach the server. Check your connection and try again.' }
  }
}

function clean(v: PersonValues) {
  return {
    full_name: v.full_name.trim(),
    nickname: v.nickname.trim() || null,
    birth_date: v.birth_date || null,
    is_deceased: v.is_deceased,
    notes: v.notes.trim() || null,
  }
}

export async function addPerson(familyId: string, v: PersonValues): Promise<{ id: string | null; error: string | null }> {
  const r = await run<{ id: string }>('person', () =>
    supabase.from('people').insert({ family_id: familyId, ...clean(v) }).select('id').single(),
  )
  return { id: r.data?.id ?? null, error: r.error }
}

export async function updatePerson(id: string, v: PersonValues): Promise<string | null> {
  const r = await run<{ id: string }[]>('person', () =>
    supabase.from('people').update(clean(v)).eq('id', id).select('id'),
  )
  if (r.error) return r.error
  return (r.data?.length ?? 0) === 0 ? 'Could not save. This person may have been removed.' : null
}

export async function deletePerson(id: string): Promise<string | null> {
  const r = await run<{ id: string }[]>('other', () => supabase.from('people').delete().eq('id', id).select('id'))
  if (r.error) return r.error
  return (r.data?.length ?? 0) === 0 ? 'Only the owner or the person who added them can delete this.' : null
}

export async function addLink(
  familyId: string,
  a: string,
  b: string,
  kind: 'parent' | 'partner',
): Promise<{ error: string | null; duplicate: boolean }> {
  const r = await run<null>('link', () =>
    supabase.from('relationships').insert({ family_id: familyId, a_id: a, b_id: b, kind }),
  )
  return { error: r.error, duplicate: r.error === 'They are already linked that way.' }
}

export async function deleteLink(id: string): Promise<string | null> {
  const r = await run<{ id: string }[]>('other', () => supabase.from('relationships').delete().eq('id', id).select('id'))
  if (r.error) return r.error
  return (r.data?.length ?? 0) === 0 ? 'Only the owner or the person who made this link can remove it.' : null
}

export async function claimPerson(id: string): Promise<string | null> {
  return (await run<null>('other', () => supabase.rpc('claim_person', { pid: id }))).error
}

export async function unclaimPerson(id: string): Promise<string | null> {
  return (await run<null>('other', () => supabase.rpc('unclaim_person', { pid: id }))).error
}

export async function addMeToTree(familyId: string): Promise<{ id: string | null; error: string | null }> {
  const r = await run<string>('other', () => supabase.rpc('add_me_to_tree', { fid: familyId }))
  return { id: r.data, error: r.error }
}

export async function mergePeople(keep: string, discard: string): Promise<string | null> {
  return (await run<null>('other', () => supabase.rpc('merge_people', { keep, discard }))).error
}
