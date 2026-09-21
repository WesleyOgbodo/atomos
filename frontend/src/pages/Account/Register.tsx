import { FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signUp } from '@/services/auth'

export function Register() {
  const navigate = useNavigate()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    if (password.length < 8) return setError('Password must be at least 8 characters.')
    if (password !== confirmPassword) return setError('Passwords do not match.')

    setSubmitting(true)
    try {
      const { session } = await signUp(email.trim(), password, fullName)
      if (session) navigate('/account', { replace: true })
      else setSuccess(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create your account.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-5 py-12"><div className="mx-auto max-w-md"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Atomos account</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Create your account</h1><p className="mt-2 text-sm text-slate-500">Buy, sell and manage your Atomos activity from one account.</p>
    {success ? <div className="mt-7 rounded-xl bg-blue-50 p-5"><h2 className="font-bold text-slate-950">Check your email</h2><p className="mt-2 text-sm leading-6 text-slate-600">We sent a confirmation link to <strong>{email}</strong>. Confirm your email before signing in.</p><Link className="mt-4 inline-block text-sm font-semibold text-blue-600" to="/login">Go to sign in</Link></div> : <form onSubmit={handleSubmit} className="mt-7 space-y-4">
      <Field label="Full name" type="text" value={fullName} onChange={setFullName} autoComplete="name" required />
      <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
      <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="new-password" required />
      <Field label="Confirm password" type="password" value={confirmPassword} onChange={setConfirmPassword} autoComplete="new-password" required />
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      <p className="text-xs leading-5 text-slate-500">New accounts start as buyers. Seller access will be handled through the Atomos seller flow; it cannot be selected during registration.</p>
      <button disabled={submitting} className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Creating account…' : 'Create account'}</button>
    </form>}
    {!success && <p className="mt-6 text-center text-sm text-slate-500">Already have an account? <Link className="font-semibold text-blue-600" to="/login">Sign in</Link></p>}
  </div></div></main>
}

function Field({ label, type, value, onChange, autoComplete, required }: { label: string; type: string; value: string; onChange: (value: string) => void; autoComplete: string; required?: boolean }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required={required} /></label>
}
