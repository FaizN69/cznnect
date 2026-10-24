import { useState } from 'react'
import {
  birthText,
  initials,
  isAncestor,
  relationLabel,
  relativesOf,
  wouldCreateLoop,
  type Link,
  type Person,
  type TreeIndex,
} from '../lib/tree'
import {
  addLink,
  addPerson,
  claimPerson,
  deleteLink,
  deletePerson,
  mergePeople,
  unclaimPerson,
  updatePerson,
  type PersonValues,
} from '../lib/treeApi'
import PersonForm from './PersonForm'
import PersonPicker from './PersonPicker'
import PersonRow from './PersonRow'
import Sheet from './Sheet'

type Role = 'parent' | 'partner' | 'child' | 'sibling'
type Mode =
  | { kind: 'view' }
  | { kind: 'edit' }
  | { kind: 'pick'; role: Role }
  | { kind: 'merge' }
  | { kind: 'mergeConfirm'; other: Person }
  | { kind: 'confirmDelete' }
  | { kind: 'confirmUnlink'; link: Link; other: Person }

const ROLE_TITLE: Record<Role, string> = {
  parent: 'Add a parent',
  partner: 'Add a partner',
  child: 'Add a child',
  sibling: 'Add a brother or sister',
}

// Everything about one person: details, relatives, and the actions on them.
export default function PersonSheet({
  person,
  index,
  links,
  people,
  me,
  userId,
  isOwner,
  familyId,
  onClose,
  onSelect,
  onChanged,
  onNotice,
}: {
  person: Person
  index: TreeIndex
  links: Link[]
  people: Person[]
  me: Person | null
  userId: string
  isOwner: boolean
  familyId: string
  onClose: () => void
  onSelect: (id: string) => void
  onChanged: () => Promise<void>
  onNotice: (message: string) => void
}) {
  const [mode, setMode] = useState<Mode>({ kind: 'view' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isMe = person.claimed_by === userId
  const rel = relativesOf(index, person.id)
  const canRemove = (p: Person) => isOwner || p.created_by === userId
  const relation = me && !isMe ? relationLabel(index, me.id, person.id) : null

  function linkBetween(a: string, b: string, kind: 'parent' | 'partner'): Link | undefined {
    return links.find(
      (l) => l.kind === kind && ((l.a_id === a && l.b_id === b) || (kind === 'partner' && l.a_id === b && l.b_id === a)),
    )
  }
  const canUnlink = (l: Link | undefined) => !!l && (isOwner || l.created_by === userId)

  async function finish(message: string) {
    await onChanged()
    onNotice(message)
    setMode({ kind: 'view' })
  }

  // Run one action: show errors, keep buttons disabled while it works.
  async function act(work: () => Promise<string | null>, doneMessage: string) {
    setBusy(true)
    setError('')
    const problem = await work()
    setBusy(false)
    if (problem) setError(problem)
    else await finish(doneMessage)
  }

  // ----- adding relatives -----

  async function linkNew(role: Role, otherId: string): Promise<string | null> {
    if (role === 'parent') {
      const r = await addLink(familyId, otherId, person.id, 'parent')
      return r.error
    }
    if (role === 'child') {
      const r = await addLink(familyId, person.id, otherId, 'parent')
      return r.error
    }
    if (role === 'partner') {
      const r = await addLink(familyId, person.id, otherId, 'partner')
      return r.error
    }
    // sibling: give them the same parents
    const parents = index.parentsOf.get(person.id) ?? []
    for (const parent of parents) {
      if (wouldCreateLoop(index, parent, otherId)) continue
      const r = await addLink(familyId, parent, otherId, 'parent')
      if (r.error && !r.duplicate) return r.error
    }
    return null
  }

  function whyNot(role: Role, other: Person): string | null {
    if (other.id === person.id) return 'That is this person'
    if (role === 'parent') {
      if (rel.parents.some((p) => p.id === other.id)) return 'Already a parent'
      if (wouldCreateLoop(index, other.id, person.id)) return 'Comes after this person in the family'
    } else if (role === 'child') {
      if (rel.children.some((p) => p.id === other.id)) return 'Already a child'
      if (wouldCreateLoop(index, person.id, other.id)) return 'Comes before this person in the family'
    } else if (role === 'partner') {
      if (rel.partners.some((p) => p.id === other.id)) return 'Already a partner'
      if (isAncestor(index, person.id, other.id) || isAncestor(index, other.id, person.id)) {
        return 'A parent and child cannot be partners'
      }
    } else {
      if (rel.siblings.some((p) => p.id === other.id)) return 'Already a brother or sister'
      if (isAncestor(index, person.id, other.id) || isAncestor(index, other.id, person.id)) return 'Not possible'
    }
    return null
  }

  function startPick(role: Role) {
    setError('')
    if (role === 'sibling' && rel.parents.length === 0) {
      setError(`Add a parent for ${person.full_name} first. Brothers and sisters are people who share a parent.`)
      return
    }
    setMode({ kind: 'pick', role })
  }

  // ----- screens -----

  if (mode.kind === 'edit') {
    return (
      <Sheet title="Edit details" onClose={() => setMode({ kind: 'view' })}>
        <PersonForm
          initial={{
            full_name: person.full_name,
            nickname: person.nickname ?? '',
            birth_date: person.birth_date ?? '',
            is_deceased: person.is_deceased,
            notes: person.notes ?? '',
          }}
          people={people}
          editingId={person.id}
          submitLabel="Save"
          onCancel={() => setMode({ kind: 'view' })}
          onSubmit={async (v: PersonValues) => {
            const problem = await updatePerson(person.id, v)
            if (!problem) await finish('Saved')
            return problem
          }}
        />
      </Sheet>
    )
  }

  if (mode.kind === 'pick') {
    const role = mode.role
    return (
      <Sheet title={ROLE_TITLE[role]} onClose={() => setMode({ kind: 'view' })}>
        {error && (
          <p role="alert" className="mb-3 text-sm font-bold text-danger">
            {error}
          </p>
        )}
        <PersonPicker
          people={people}
          allPeople={people}
          prompt={`Who is ${person.full_name}'s ${role === 'sibling' ? 'brother or sister' : role}? Look for them first.`}
          note={role === 'sibling' ? 'They will be linked to the same parents.' : undefined}
          disabledReason={(p) => whyNot(role, p)}
          onCancel={() => setMode({ kind: 'view' })}
          onPick={(p) => act(() => linkNew(role, p.id), 'Linked')}
          onCreate={async (v) => {
            const added = await addPerson(familyId, v)
            if (added.error || !added.id) return added.error ?? 'Could not add that person.'
            const problem = await linkNew(role, added.id)
            await onChanged()
            if (problem) return `Added, but could not link them: ${problem}`
            onNotice('Added')
            setMode({ kind: 'view' })
            return null
          }}
        />
      </Sheet>
    )
  }

  if (mode.kind === 'merge') {
    return (
      <Sheet title="Merge duplicates" onClose={() => setMode({ kind: 'view' })}>
        <PersonPicker
          people={people.filter((p) => p.id !== person.id)}
          allPeople={people}
          allowNew={false}
          prompt={`Which other entry is the same person as ${person.full_name}?`}
          onCancel={() => setMode({ kind: 'view' })}
          onPick={(other) => setMode({ kind: 'mergeConfirm', other })}
        />
      </Sheet>
    )
  }

  if (mode.kind === 'mergeConfirm') {
    const other = mode.other
    const options: { keep: Person; discard: Person }[] = [
      { keep: person, discard: other },
      { keep: other, discard: person },
    ]
    const bothLinked = !!person.claimed_by && !!other.claimed_by
    const allowed = options.filter((o) => isOwner || o.discard.created_by === userId)
    return (
      <Sheet title="Merge these two?" onClose={() => setMode({ kind: 'view' })}>
        <div className="flex flex-col gap-3">
          <p>
            <b>{person.full_name}</b> and <b>{other.full_name}</b> will become one person. Everything linked to the entry
            you remove moves to the one you keep, and any blank details are filled in. This cannot be undone.
          </p>
          {bothLinked && (
            <p role="alert" className="text-sm font-bold text-danger">
              Both entries are linked to accounts, so they cannot be merged.
            </p>
          )}
          {!bothLinked && allowed.length === 0 && (
            <p role="alert" className="text-sm font-bold text-danger">
              Only the owner, or the person who added an entry, can merge it away. Ask the owner to do this one.
            </p>
          )}
          {error && (
            <p role="alert" className="text-sm font-bold text-danger">
              {error}
            </p>
          )}
          {!bothLinked &&
            allowed.map((o) => (
              <button
                key={o.keep.id}
                className="btn btn-primary"
                disabled={busy}
                onClick={async () => {
                  setBusy(true)
                  setError('')
                  const problem = await mergePeople(o.keep.id, o.discard.id)
                  setBusy(false)
                  if (problem) {
                    setError(problem)
                    return
                  }
                  await onChanged()
                  onNotice('Merged')
                  onSelect(o.keep.id)
                  setMode({ kind: 'view' })
                }}
              >
                Keep {o.keep.full_name}, remove {o.discard.full_name}
              </button>
            ))}
          <button className="btn btn-plain" onClick={() => setMode({ kind: 'view' })}>
            Cancel
          </button>
        </div>
      </Sheet>
    )
  }

  if (mode.kind === 'confirmDelete') {
    return (
      <Sheet title="Delete this person?" onClose={() => setMode({ kind: 'view' })}>
        <div className="flex flex-col gap-3">
          <p>
            <b>{person.full_name}</b> will be removed from the tree, along with their links to relatives. The relatives
            themselves stay. This cannot be undone.
          </p>
          {error && (
            <p role="alert" className="text-sm font-bold text-danger">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button className="btn btn-plain" onClick={() => setMode({ kind: 'view' })}>
              Cancel
            </button>
            <button
              className="btn btn-danger"
              disabled={busy}
              onClick={async () => {
                setBusy(true)
                setError('')
                const problem = await deletePerson(person.id)
                setBusy(false)
                if (problem) {
                  setError(problem)
                  return
                }
                await onChanged()
                onNotice('Deleted')
                onClose()
              }}
            >
              Delete
            </button>
          </div>
        </div>
      </Sheet>
    )
  }

  if (mode.kind === 'confirmUnlink') {
    const { link, other } = mode
    return (
      <Sheet title="Remove this link?" onClose={() => setMode({ kind: 'view' })}>
        <div className="flex flex-col gap-3">
          <p>
            Remove the link between <b>{person.full_name}</b> and <b>{other.full_name}</b>? Neither person is deleted.
          </p>
          {error && (
            <p role="alert" className="text-sm font-bold text-danger">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <button className="btn btn-plain" onClick={() => setMode({ kind: 'view' })}>
              Cancel
            </button>
            <button className="btn btn-danger" disabled={busy} onClick={() => act(() => deleteLink(link.id), 'Link removed')}>
              Remove link
            </button>
          </div>
        </div>
      </Sheet>
    )
  }

  // ----- the main view -----

  const group = (title: string, list: Person[], kind: 'parent' | 'partner' | 'child') => {
    if (list.length === 0) return null
    return (
      <section>
        <h3 className="eyebrow mb-1">{title}</h3>
        <ul className="divide-y divide-line">
          {list.map((p) => {
            const link =
              kind === 'parent'
                ? linkBetween(p.id, person.id, 'parent')
                : kind === 'child'
                  ? linkBetween(person.id, p.id, 'parent')
                  : linkBetween(person.id, p.id, 'partner')
            return (
              <li key={p.id} className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  <PersonRow person={p} isMe={p.claimed_by === userId} onClick={() => onSelect(p.id)} />
                </div>
                {link && canUnlink(link) && (
                  <button
                    className="min-h-11 px-2 text-sm font-bold text-danger underline underline-offset-2"
                    aria-label={`Remove link to ${p.full_name}`}
                    onClick={() => {
                      setError('')
                      setMode({ kind: 'confirmUnlink', link, other: p })
                    }}
                  >
                    Unlink
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    )
  }

  return (
    <Sheet title={person.full_name} onClose={onClose}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="flex size-14 flex-none items-center justify-center rounded-[var(--radius-avatar)] bg-accent-soft font-display text-lg font-bold text-accent-text"
          >
            {initials(person.full_name)}
          </span>
          <div className="min-w-0">
            {person.nickname && <p className="truncate font-semibold">“{person.nickname}”</p>}
            <p className="text-sm text-muted">
              {[
                isMe ? 'This is you' : relation,
                person.birth_date ? `Born ${birthText(person)}` : '',
                person.is_deceased ? 'Passed away' : '',
                person.claimed_by && !isMe ? 'Has an account' : '',
              ]
                .filter(Boolean)
                .join(' · ') || 'No details yet'}
            </p>
          </div>
        </div>

        {person.notes && <p className="whitespace-pre-wrap rounded-[var(--radius-ctl)] bg-surface-2 p-3">{person.notes}</p>}

        {error && (
          <p role="alert" className="text-sm font-bold text-danger">
            {error}
          </p>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button className="btn btn-plain" onClick={() => startPick('parent')}>
            + Parent
          </button>
          <button className="btn btn-plain" onClick={() => startPick('partner')}>
            + Partner
          </button>
          <button className="btn btn-plain" onClick={() => startPick('child')}>
            + Child
          </button>
          <button className="btn btn-plain" onClick={() => startPick('sibling')}>
            + Brother or sister
          </button>
        </div>

        {group('Parents', rel.parents, 'parent')}
        {group('Partners', rel.partners, 'partner')}
        {group('Children', rel.children, 'child')}
        {rel.siblings.length > 0 && (
          <section>
            <h3 className="eyebrow mb-1">Brothers and sisters</h3>
            <ul className="divide-y divide-line">
              {rel.siblings.map((p) => (
                <li key={p.id}>
                  <PersonRow person={p} isMe={p.claimed_by === userId} onClick={() => onSelect(p.id)} />
                </li>
              ))}
            </ul>
          </section>
        )}

        <div className="flex flex-col gap-2 border-t border-line pt-4">
          <button className="btn btn-primary" onClick={() => setMode({ kind: 'edit' })}>
            Edit details
          </button>
          {!person.claimed_by && !me && (
            <button className="btn btn-plain" disabled={busy} onClick={() => act(() => claimPerson(person.id), 'You are linked to this person')}>
              This is me
            </button>
          )}
          {isMe && (
            <button className="btn btn-plain" disabled={busy} onClick={() => act(() => unclaimPerson(person.id), 'Unlinked')}>
              This is not me
            </button>
          )}
          <button
            className="btn btn-plain"
            onClick={() => {
              setError('')
              setMode({ kind: 'merge' })
            }}
          >
            Merge with a duplicate
          </button>
          {canRemove(person) && (
            <button
              className="btn btn-plain !text-danger"
              onClick={() => {
                setError('')
                setMode({ kind: 'confirmDelete' })
              }}
            >
              Delete this person
            </button>
          )}
        </div>
      </div>
    </Sheet>
  )
}
