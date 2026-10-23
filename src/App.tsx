import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { configured } from './config'
import AuthScreen from './components/AuthScreen'
import Splash from './components/Splash'
import Logo from './components/Logo'
import Authed from './Authed'

function SetupNeeded() {
  return (
    <div className="mx-auto flex min-h-full max-w-md flex-col justify-center gap-6 p-6">
      <Logo big />
      <div className="card">
        <h1 className="font-display text-2xl font-bold">Almost there</h1>
        <p className="mt-2">
          Open <b>src/config.ts</b> and paste in your Supabase project URL and anon key. The steps
          are in the README.
        </p>
      </div>
    </div>
  )
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!configured) return
    // If the session check hangs, show the sign-in screen after 8 seconds instead of a blank page.
    const timer = setTimeout(() => setReady(true), 8000)
    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data.session))
      .catch(() => {})
      .finally(() => {
        clearTimeout(timer)
        setReady(true)
      })
    const { data } = supabase.auth.onAuthStateChange((_event, s) => setSession(s))
    return () => {
      clearTimeout(timer)
      data.subscription.unsubscribe()
    }
  }, [])

  if (!configured) return <SetupNeeded />
  if (!ready) return <Splash />
  if (!session) return <AuthScreen />
  return <Authed userId={session.user.id} />
}
