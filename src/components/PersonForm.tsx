import { useState, type FormEvent } from 'react'
import { similarPeople, type Person } from '../lib/tree'
import type { PersonValues } from '../lib/treeApi'

// Add or edit one person. While adding, anyone already in the tree who looks like the
// same person is shown first, so the same relative is not entered twice.
export default function PersonForm({
  initial,
  people,
  editingId,
  submitLabel,
  onSubmit,
  onCancel,
  onUseExisting,
}: {
  initial?: Partial<PersonValues>
  people: Person[]
  editingId?: string
  submitLabel: string
  onSubmit: (values: PersonValues) => Promise<string | null>
  onCancel: () => void
  onUseExisting?: (person: Person) => void
}) {
  const [name, setName] = useState(initial?.full_name ?? '')
  const [nickname, setNickname] = useState(initial?.nickname ?? '')
  const [birth, setBirth] = useState(initial?.birth_date ?? '')
  const [deceased, setDeceased] = useState(initial?.is_deceased ?? false)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const similar = editingId ? [] : similarPeople(people, name, birth || null)
  const today = new Date().toISOString().slice(0, 10)

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Please enter a name.')
      return
    }
    setBusy(true)
    setError('')
    const problem = await onSubmit({
      full_name: name,
      nickname,
      birth_date: birth,
      is_deceased: deceased,
      notes,
    })
    setBusy(false)
    if (problem) setError(problem)
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div>
        <label className="label" htmlFor="pf-name">
          Full name
        </label>
        <input
          id="pf-name"
          className="input"
          value={name}
          maxLength={80}
          autoComplete="off"
          onChange={(e) => setName(e.target.value)}
          required
        />
      </div>

      {similar.length > 0 && (
        <div className="rounded-[var(--radius-ctl)] border border-line bg-surface-2 p-3" role="status">
          <p className="text-sm font-bold">Already in the tree?</p>
          <ul className="mt-1 divide-y divide-line">
            {similar.map((s) => (
              <li key={s.person.id} className="flex min-h-12 items-center gap-3">
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{s.person.full_name}</span>
                  <span className="block truncate text-sm text-muted">
                    {s.reason}
                    {s.person.birth_date ? ` · born ${s.person.birth_date.slice(0, 4)}` : ''}
                  </span>
                </span>
                {onUseExisting && (
                  <button type="button" className="link" onClick={() => onUseExisting(s.person)}>
                    Use this person
                  </button>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-sm text-muted">If this is someone different, carry on and add them.</p>
        </div>
      )}

      <div>
        <label className="label" htmlFor="pf-nick">
          Nickname (optional)
        </label>
        <input
          id="pf-nick"
          className="input"
          value={nickname}
          maxLength={40}
          autoComplete="off"
          onChange={(e) => setNickname(e.target.value)}
        />
      </div>

      <div>
        <label className="label" htmlFor="pf-birth">
          Birthday (optional)
        </label>
        <input
          id="pf-birth"
          type="date"
          className="input"
          value={birth}
          max={today}
          onChange={(e) => setBirth(e.target.value)}
        />
      </div>

      <label className="flex min-h-11 items-center gap-3 font-semibold">
        <input
          type="checkbox"
          className="size-5"
          checked={deceased}
          onChange={(e) => setDeceased(e.target.checked)}
        />
        Passed away
      </label>

      <div>
        <label className="label" htmlFor="pf-notes">
          Notes (optional)
        </label>
        <textarea
          id="pf-notes"
          className="input"
          value={notes}
          maxLength={1000}
          onChange={(e) => setNotes(e.target.value)}
        />
      </div>

      {error && (
        <p role="alert" className="text-sm font-bold text-danger">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3">
        <button type="button" className="btn btn-plain" onClick={onCancel}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={busy}>
          {busy ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
