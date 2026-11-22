import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { fetchDbProfile, fetchProfileEnsured } from './api'
import type { DbProfile } from './api'

type Auth = { profileError: string; ready: boolean; session: Session | null; profile: DbProfile | null; reloadProfile: () => Promise<void>; signOut: () => Promise<void> }
const Ctx = createContext<Auth | null>(null)

export function useAuth() {
  const v = useContext(Ctx)
  if (!v) throw new Error('useAuth precisa estar dentro do AuthProvider')
  return v
}

// Sessão persistente: o supabase-js guarda e renova o login sozinho (localStorage).
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<DbProfile | null>(null)
  const [profileError, setProfileError] = useState('')
  const [checked, setChecked] = useState(false)
  const [profileReady, setProfileReady] = useState(false)
  const uid = session?.user.id

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => { setSession(data.session); setChecked(true) }).catch(() => setChecked(true))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => { setSession(s); setChecked(true) })
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!checked) return
    if (!uid) { setProfile(null); setProfileReady(true); return }
    let alive = true
    setProfileReady(false)
    fetchProfileEnsured(uid)
      .then((p) => { if (alive) { setProfile(p); setProfileError(p ? '' : 'nenhuma linha de perfil para esta conta') } })
      .catch((e) => { if (alive) { setProfile(null); setProfileError((e as { message?: string })?.message ?? String(e)) } })
      .finally(() => alive && setProfileReady(true))
    return () => { alive = false }
  }, [checked, uid])

  const reloadProfile = useCallback(async () => { if (uid) setProfile(await fetchDbProfile(uid)) }, [uid])
  const signOut = useCallback(async () => { await supabase.auth.signOut() }, [])

  return <Ctx.Provider value={{ profileError, ready: checked && profileReady, session, profile, reloadProfile, signOut }}>{children}</Ctx.Provider>
}
