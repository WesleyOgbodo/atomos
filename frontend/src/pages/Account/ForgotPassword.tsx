import { FormEvent, useState } from 'react'
import { Link } from 'react-router-dom'
import { requestPasswordReset } from '@/services/auth'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      await requestPasswordReset(email.trim())
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to send the reset email.')
    } finally {
      setSubmitting(false)
    }
  }

  return <main className="min-h-[calc(100vh-4rem)] bg-slate-50 px-5 py-12"><div className="mx-auto max-w-md"><div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Atomos account</p><h1 className="mt-2 text-3xl font-black tracking-tight">Reset your password</h1><p className="mt-2 text-sm text-slate-500">Enter your account email and we'll send you a secure reset link.</p>{sent ? <div className="mt-7 rounded-xl bg-blue-50 p-5"><p className="text-sm leading-6 text-slate-700">If an account exists for <strong>{email}</strong>, a password reset email has been sent.</p><Link className="mt-4 inline-block text-sm font-semibold text-blue-600" to="/login">Back to sign in</Link></div> : <form onSubmit={handleSubmit} className="mt-7 space-y-4"><label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">Email</span><input className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>{error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700" role="alert">{error}</p>}<button disabled={submitting} className="w-full rounded-xl bg-slate-950 px-4 py-3 font-semibold text-white disabled:opacity-60">{submitting ? 'Sending…' : 'Send reset link'}</button><Link className="block text-center text-sm font-semibold text-blue-600" to="/login">Back to sign in</Link></form>}</div></div></main>
}
