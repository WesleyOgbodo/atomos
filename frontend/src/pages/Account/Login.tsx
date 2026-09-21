import { FormEvent, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { signIn } from '@/services/auth'

export function Login() {
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: string } | null)?.from ?? '/account'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await signIn(email.trim(), password)
      navigate(from, { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to sign in.')
    } finally {
      setSubmitting(false)
    }
  }

  return <AuthLayout title="Welcome back" subtitle="Sign in to manage your Atomos account.">
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Email" type="email" value={email} onChange={setEmail} autoComplete="email" required />
      <Field label="Password" type="password" value={password} onChange={setPassword} autoComplete="current-password" required />
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}
      <div className="flex justify-end"><Link className="text-sm font-semibold text-blue-600 hover:text-blue-700" to="/forgot-password">Forgot password?</Link></div>
      <button disabled={submitting} className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60">{submitting ? 'Signing in…' : 'Sign in'}</button>
    </form>
    <p className="mt-6 text-center text-sm text-slate-500">Don't have an account? <Link className="font-semibold text-blue-600" to="/register">Create one</Link></p>
  </AuthLayout>
}

function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-5 py-12"><div className="mx-auto max-w-md"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Atomos account</p><h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">{title}</h1><p className="mt-2 text-sm text-slate-500">{subtitle}</p><div className="mt-7">{children}</div></div></div></main>
}

function Field({ label, type, value, onChange, autoComplete, required }: { label: string; type: string; value: string; onChange: (value: string) => void; autoComplete: string; required?: boolean }) {
  return <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">{label}</span><input className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100" type={type} value={value} onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete} required={required} /></label>
}
