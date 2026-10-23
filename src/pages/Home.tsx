import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import type { Family, Member } from '../types'

export default function Home({ family, userId }: { family: Family; userId: string }) {
  const [members, setMembers] = useState<Member[]>([])
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    supabase
      .from('family_members')
      .select('user_id, role, profiles(display_name)')
      .eq('family_id', family.id)
      .order('joined_at')
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) setError(error.message)
        else setMembers((data ?? []) as unknown as Member[])
      })
    return () => {
      cancelled = true
    }
  }, [family.id])

  const me = members.find((m) => m.user_id === userId)
  const firstName = me?.profiles?.display_name.split(' ')[0] ?? ''
  const code = family.invite_code.toUpperCase()
  const inviteText = `Join ${family.name} on Cznnect. Open ${location.href.split('?')[0]}, create an account, then enter this invite code: ${code}`

  async function copy() {
    try {
      await navigator.clipboard.writeText(inviteText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // The code is selectable on screen, so copying by hand still works.
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-1">
        <p className="eyebrow">Family space</p>
        <h1 className="font-display text-2xl font-extrabold leading-tight">{family.name}</h1>
        <p className="text-muted">{firstName ? `Welcome back, ${firstName}.` : 'Welcome back.'}</p>
      </header>

      <section className="card flex flex-col gap-3">
        <h2 className="font-display text-lg font-bold">Invite your cousins</h2>
        <p className="text-sm text-muted">
          They create an account, then enter this code. Only people with the code can join.
        </p>
        <p className="select-all rounded-[var(--radius-ctl)] border border-dashed border-line bg-surface-2 py-3 text-center font-mono text-2xl font-semibold tracking-[0.25em] text-accent-text">
          {code}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn btn-primary" onClick={copy}>
            {copied ? 'Copied' : 'Copy invite'}
          </button>
          {'share' in navigator && (
            <button className="btn btn-plain" onClick={() => navigator.share({ text: inviteText }).catch(() => {})}>
              Share
            </button>
          )}
        </div>
      </section>

      <section className="card flex flex-col gap-2">
        <h2 className="font-display text-lg font-bold">
          Members {members.length > 0 && <span className="text-muted">({members.length})</span>}
        </h2>
        {error && <p className="text-sm font-bold text-danger">{error}</p>}
        <ul className="divide-y divide-line">
          {members.map((m) => {
            const name = m.profiles?.display_name || 'Someone'
            return (
              <li key={m.user_id} className="flex min-h-14 items-center gap-3">
                <span
                  className="flex size-10 flex-none items-center justify-center rounded-[var(--radius-avatar)] bg-accent-soft font-display text-base font-bold text-accent-text"
                  aria-hidden="true"
                >
                  {name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate font-semibold">{name}</span>
                {m.role === 'owner' && (
                  <span className="rounded-[var(--radius-ctl)] bg-accent-soft px-2 py-0.5 text-xs font-bold text-accent-text">
                    Owner
                  </span>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
