import { useState, type FormEvent } from 'react'
import { supabase } from '../supabase'
import Logo from './Logo'

export default function AuthScreen() {
  const [mode, setMode] = useState<'in' | 'up'>('in')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'error' | 'info'; text: string } | null>(null)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg(null)
    if (mode === 'up') {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { display_name: name.trim() } },
      })
      if (error) setMsg({ kind: 'error', text: error.message })
      else if (!data.session)
        setMsg({ kind: 'info', text: 'Account created. Check your email to confirm it, then sign in.' })
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
      if (error) setMsg({ kind: 'error', text: error.message })
    }
    setBusy(false)
  }

  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 p-6">
      <div>
        <Logo big />
        <p className="mt-2 text-center font-semibold text-ink/70">Our private family space</p>
      </div>

      <form onSubmit={submit} className="card flex flex-col gap-4">
        <h1 className="font-display text-2xl font-bold">
          {mode === 'in' ? 'Welcome back' : 'Join the fun'}
        </h1>

        {mode === 'up' && (
          <div>
            <label className="label" htmlFor="name">
              Your name
            </label>
            <input
              id="name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              required
            />
          </div>
        )}

        <div>
          <label className="label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="label" htmlFor="password">
            Password
          </label>
          <input
            id="password"
            type="password"
            className="input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={mode === 'in' ? 'current-password' : 'new-password'}
            minLength={6}
            required
          />
        </div>

        {msg && (
          <p role="status" className={`text-sm font-bold ${msg.kind === 'error' ? 'text-coral' : 'text-mint'}`}>
            {msg.text}
          </p>
        )}

        <button className="btn btn-primary w-full" disabled={busy}>
          {busy ? 'One moment...' : mode === 'in' ? 'Sign in' : 'Create account'}
        </button>
      </form>

      <button
        type="button"
        className="min-h-12 font-bold underline underline-offset-4"
        onClick={() => {
          setMode(mode === 'in' ? 'up' : 'in')
          setMsg(null)
        }}
      >
        {mode === 'in' ? 'New here? Create an account' : 'Already have an account? Sign in'}
      </button>
    </div>
  )
}
