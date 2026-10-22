import { useState, type FormEvent } from 'react'
import { supabase } from '../supabase'
import Logo from './Logo'

// Shown once, right after sign-up: start a family space or join one with an invite code.
export default function FamilySetup({ onDone }: { onDone: () => void }) {
  const [familyName, setFamilyName] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState<'' | 'create' | 'join'>('')
  const [error, setError] = useState('')

  async function create(e: FormEvent) {
    e.preventDefault()
    setBusy('create')
    setError('')
    const { error } = await supabase.rpc('create_family', { family_name: familyName })
    setBusy('')
    if (error) setError(error.message)
    else onDone()
  }

  async function join(e: FormEvent) {
    e.preventDefault()
    setBusy('join')
    setError('')
    const { error } = await supabase.rpc('join_family', { code })
    setBusy('')
    if (error) setError(error.message)
    else onDone()
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <Logo big />
        <p className="mt-2 text-center font-semibold text-ink/70">Start or join your family space</p>
      </div>

      {error && (
        <p role="alert" className="text-center text-sm font-bold text-coral">
          {error}
        </p>
      )}

      <form onSubmit={create} className="card flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold">Start our family space</h2>
        <p className="text-sm text-ink/70">You will get an invite code to send to your cousins.</p>
        <div>
          <label className="label" htmlFor="family-name">
            Family name
          </label>
          <input
            id="family-name"
            className="input"
            placeholder="The Rahman Cousins"
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            required
          />
        </div>
        <button className="btn btn-sun w-full" disabled={busy !== ''}>
          {busy === 'create' ? 'Creating...' : 'Create'}
        </button>
      </form>

      <form onSubmit={join} className="card flex flex-col gap-3">
        <h2 className="font-display text-xl font-bold">Join with an invite code</h2>
        <div>
          <label className="label" htmlFor="code">
            Invite code
          </label>
          <input
            id="code"
            className="input uppercase tracking-widest"
            placeholder="A1B2C3D4"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoCapitalize="characters"
            autoComplete="off"
            required
          />
        </div>
        <button className="btn btn-primary w-full" disabled={busy !== ''}>
          {busy === 'join' ? 'Joining...' : 'Join'}
        </button>
      </form>

      <button
        type="button"
        className="min-h-12 font-bold underline underline-offset-4"
        onClick={() => supabase.auth.signOut()}
      >
        Sign out
      </button>
    </div>
  )
}
