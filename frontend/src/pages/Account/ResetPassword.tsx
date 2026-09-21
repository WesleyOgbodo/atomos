import { FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { updatePassword } from '@/services/auth'

export function ResetPassword() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirmPassword) return setError('Passwords do not match.')
    setSubmitting(true)
    try {
      await updatePassword(password)
      navigate('/account', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update your password.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-5 py-12"><div className="mx-auto max-w-md"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Atomos account</p><h1 className="mt-2 text-3xl font-black tracking-tight">Choose a new password</h1><p className="mt-2 text-sm text-slate-500">Use at least 8 characters.</p><form onSubmit={handleSubmit} className="mt-7 space-y-4"><Field label="New password" value={password} onChange={setPassword} /><Field label="Confirm password" value={confirmPassword} onChange={setConfirmPassword} />{error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}<button disabled={submitting} className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-60">{submitting ? 'Updating…' : 'Update password'}</button></form></div></div></main>
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><input className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" type="password" value={value} onChange={(event) => onChange(event.target.value)} autoComplete="new-password" required /></label>
}
