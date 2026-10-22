import { useEffect, useState } from 'react'
import { supabase } from '../supabase'
import type { Family, Member } from '../types'

const DOTS = ['bg-brand text-white', 'bg-sun text-ink', 'bg-mint text-ink', 'bg-coral text-white']

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
      <header>
        <p className="font-semibold text-ink/70">{firstName ? `Hi ${firstName}` : 'Hi there'}</p>
        <h1 className="font-display text-3xl font-bold leading-tight">{family.name}</h1>
      </header>

      <section className="card flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold">Invite your cousins</h2>
        <p className="text-sm text-ink/70">
          They create an account, then enter this code. Only people with the code can join.
        </p>
        <p className="select-all rounded-xl border-2 border-dashed border-ink bg-paper py-3 text-center font-display text-3xl font-bold tracking-widest">
          {code}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button className="btn btn-sun" onClick={copy}>
            {copied ? 'Copied' : 'Copy invite'}
          </button>
          {'share' in navigator && (
            <button className="btn btn-plain" onClick={() => navigator.share({ text: inviteText }).catch(() => {})}>
              Share
            </button>
          )}
        </div>
      </section>

      <section className="card flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold">
          Family members {members.length > 0 && <span className="text-ink/60">({members.length})</span>}
        </h2>
        {error && <p className="text-sm font-bold text-coral">{error}</p>}
        <ul className="flex flex-col gap-2">
          {members.map((m, i) => {
            const name = m.profiles?.display_name || 'Someone'
            return (
              <li key={m.user_id} className="flex min-h-12 items-center gap-3">
                <span
                  className={`flex size-10 flex-none items-center justify-center rounded-full border-2 border-ink font-display text-lg font-bold ${DOTS[i % DOTS.length]}`}
                  aria-hidden="true"
                >
                  {name.charAt(0).toUpperCase()}
                </span>
                <span className="min-w-0 flex-1 truncate font-bold">{name}</span>
                {m.role === 'owner' && (
                  <span className="rounded-full bg-ink px-2 py-0.5 text-xs font-bold text-white">Owner</span>
                )}
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
