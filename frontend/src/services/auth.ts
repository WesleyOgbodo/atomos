import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export type Profile = {
  id: string
  full_name: string | null
  username: string | null
  phone: string | null
  avatar_url: string | null
  role: 'buyer' | 'seller' | 'admin'
  is_suspended: boolean
}

export async function signUp(email: string, password: string, fullName: string) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName.trim() },
      emailRedirectTo: `${window.location.origin}/account`,
    },
  })

  if (error) throw error
  return data
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error) throw error
  return data
}

export async function signOut() {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function getSession() {
  const { data, error } = await supabase.auth.getSession()
  if (error) throw error
  return data.session
}

export async function getCurrentUser() {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  return data.user
}

export async function getProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, username, phone, avatar_url, role, is_suspended')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data as Profile | null
}

export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  if (error) throw error
}

export async function updatePassword(password: string) {
  const { data, error } = await supabase.auth.updateUser({ password })
  if (error) throw error
  return data.user
}

export function onAuthStateChange(callback: (event: AuthChangeEvent, session: Session | null) => void) {
  return supabase.auth.onAuthStateChange(callback)
}

export type { Session, User }
