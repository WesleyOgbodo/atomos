import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { verifyPaystackPayment } from '@/services/payments'

export function PaymentCallback() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [error, setError] = useState('')

  useEffect(() => {
    const reference = params.get('reference')
    if (!reference) {
      setError('Paystack did not return a payment reference.')
      return
    }

    let active = true
    void verifyPaystackPayment(reference)
      .then(result => {
        if (!active) return
        if (result.paid && result.orderId) {
          navigate(`/orders/${result.orderId}`, { replace: true })
          return
        }
        setError(`Payment was not completed. Paystack status: ${result.status}.`)
      })
      .catch(err => {
        if (active) setError(err instanceof Error ? err.message : 'Could not verify this payment.')
      })

    return () => { active = false }
  }, [navigate, params])

  return (
    <main className="mx-auto max-w-xl px-5 py-24 text-center">
      {!error ? (
        <>
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />
          <h1 className="mt-6 text-3xl font-black">Verifying payment</h1>
          <p className="mt-3 text-sm text-slate-500">Please wait while Atomos confirms your Paystack transaction.</p>
        </>
      ) : (
        <>
          <h1 className="text-3xl font-black">Payment not completed</h1>
          <p className="mt-3 text-sm text-red-600">{error}</p>
          <Link to="/orders" className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">Go to orders</Link>
        </>
      )}
    </main>
  )
}
