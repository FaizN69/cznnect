import { initials, type Person } from '../lib/tree'

// One person in a list: a round initial, their name, and a short line underneath.
export default function PersonRow({
  person,
  note,
  isMe = false,
  onClick,
  disabled = false,
}: {
  person: Person
  note?: string
  isMe?: boolean
  onClick?: () => void
  disabled?: boolean
}) {
  const year = person.birth_date ? person.birth_date.slice(0, 4) : ''
  const line = [person.nickname ? `“${person.nickname}”` : '', year, person.is_deceased ? 'Passed away' : '', note ?? '']
    .filter(Boolean)
    .join(' · ')
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex min-h-14 w-full items-center gap-3 py-1 text-left disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className="flex size-10 flex-none items-center justify-center rounded-[var(--radius-avatar)] bg-accent-soft font-display text-sm font-bold text-accent-text"
      >
        {initials(person.full_name)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold">
          {person.full_name}
          {isMe && <span className="ml-2 text-xs font-bold text-accent-text">You</span>}
        </span>
        {line && <span className="block truncate text-sm text-muted">{line}</span>}
      </span>
    </button>
  )
}
