import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { getProfile, getSession, onAuthStateChange, signOut, type Profile } from '@/services/auth'

interface AuthContextValue {
  session: Session | null
  user: User | null
  profile: Profile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = async (nextSession: Session | null) => {
    setSession(nextSession)
    if (!nextSession?.user) {
      setProfile(null)
      return
    }

    const nextProfile = await getProfile(nextSession.user.id)
    setProfile(nextProfile)
  }

  useEffect(() => {
    let active = true

    getSession()
      .then(async (currentSession) => {
        if (!active) return
        await loadProfile(currentSession)
      })
      .catch(() => {
        if (active) {
          setSession(null)
          setProfile(null)
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    const { data } = onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      if (!nextSession) {
        setProfile(null)
        return
      }

      // Keep the auth callback lightweight; fetch profile after the session changes.
      void getProfile(nextSession.user.id).then((nextProfile) => {
        if (active) setProfile(nextProfile)
      })
    })

    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    session,
    user: session?.user ?? null,
    profile,
    loading,
    refreshProfile: async () => {
      if (!session?.user) return
      setProfile(await getProfile(session.user.id))
    },
    logout: signOut,
  }), [session, profile, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside AuthProvider.')
  return context
}
