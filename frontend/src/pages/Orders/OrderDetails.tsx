import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Check, Circle, X } from 'lucide-react'
import { formatNaira } from '@/lib/format'
import { cancelMyOrder, getMyOrder, type OrderItem, type OrderStatus, type OrderSummary } from '@/services/orders'
import { initializeOrderPayment } from '@/services/payments'

const steps: OrderStatus[] = ['pending', 'confirmed', 'processing', 'ready_for_delivery', 'delivered']
const labels: Record<OrderStatus, string> = {
  pending: 'Order placed',
  confirmed: 'Confirmed',
  processing: 'Processing',
  ready_for_delivery: 'Ready',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export function OrderDetails() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderSummary | null>(null)
  const [items, setItems] = useState<OrderItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cancelling, setCancelling] = useState(false)
  const [paying, setPaying] = useState(false)

  const load = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    setError('')
    try {
      const result = await getMyOrder(orderId)
      if (!result) {
        setError('Order not found.')
        return
      }
      setOrder(result.order)
      setItems(result.items)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this order.')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => { void load() }, [load])


  async function handlePay() {
    if (!orderId || order?.payment_status === 'paid') return
    setPaying(true)
    setError('')
    try {
      const payment = await initializeOrderPayment(orderId)
      window.location.assign(payment.authorizationUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not initialize payment.')
    } finally {
      setPaying(false)
    }
  }

  async function handleCancel() {
    if (!orderId || !order || order.status !== 'pending') return
    if (!window.confirm('Cancel this order?')) return
    setCancelling(true)
    setError('')
    try {
      await cancelMyOrder(orderId)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not cancel this order.')
    } finally {
      setCancelling(false)
    }
  }

  if (loading) return <main className="mx-auto max-w-4xl px-5 py-24 text-center text-sm font-semibold text-slate-500">Loading order…</main>
  if (error || !order) return <main className="mx-auto max-w-4xl px-5 py-24 text-center"><h1 className="text-3xl font-black">Order unavailable</h1><p className="mt-3 text-sm text-red-600">{error || 'This order could not be found.'}</p><Link to="/orders" className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">Back to orders</Link></main>

  const currentIndex = steps.indexOf(order.status)
  const cancelled = order.status === 'cancelled'

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <Link to="/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft size={16} /> My orders</Link>

      <div className="mt-7 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Order</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">{order.order_number}</h1>
          <p className="mt-2 text-sm text-slate-500">Placed {new Date(order.created_at).toLocaleString('en-NG')}</p>
        </div>
        {order.status !== 'cancelled' && <span className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold capitalize">{order.status.replace(/_/g, ' ')}</span>}
        {cancelled && <span className="rounded-full bg-red-50 px-4 py-2 text-sm font-bold text-red-700">Cancelled</span>}
      </div>

      {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}

      <section className="mt-8 rounded-2xl border border-slate-200 p-5">
        <h2 className="text-lg font-black">Order status</h2>
        {cancelled ? (
          <div className="mt-5 flex items-center gap-3 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700"><X size={18} /> This order was cancelled.</div>
        ) : (
          <div className="mt-6 grid grid-cols-5 gap-2">
            {steps.map((step, index) => {
              const complete = index <= currentIndex
              return (
                <div key={step} className="text-center">
                  <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border ${complete ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-slate-400'}`}>
                    {complete ? <Check size={16} /> : <Circle size={14} />}
                  </div>
                  <p className={`mt-2 text-[11px] font-bold capitalize ${complete ? 'text-slate-900' : 'text-slate-400'}`}>{labels[step]}</p>
                </div>
              )
            })}
          </div>
        )}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-slate-200 p-5">
          <h2 className="text-lg font-black">Items purchased</h2>
          <div className="mt-4 divide-y divide-slate-100">
            {items.map(item => (
              <div key={item.id} className="flex justify-between gap-4 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="font-bold">{item.title_snapshot}</p>
                  <p className="mt-1 text-sm text-slate-500">Qty {item.quantity} · {formatNaira(item.unit_price)} each</p>
                </div>
                <strong className="shrink-0">{formatNaira(item.unit_price * item.quantity)}</strong>
              </div>
            ))}
          </div>
        </section>

        <aside className="h-fit rounded-2xl bg-slate-50 p-6">
          <h2 className="text-lg font-black">Summary</h2>
          <div className="mt-5 space-y-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><strong>{formatNaira(order.subtotal)}</strong></div>
            <div className="flex justify-between"><span>Delivery</span><strong>{order.delivery_fee ? formatNaira(order.delivery_fee) : 'Free'}</strong></div>
          </div>
          <div className="my-5 border-t" />
          <div className="flex justify-between text-lg font-black"><span>Total</span><span>{formatNaira(order.total)}</span></div>

          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <p className="font-bold">Payment</p>
            <p className="mt-1 capitalize text-slate-500">{order.payment_status.replace(/_/g, ' ')}</p>
          </div>

          {order.payment_status !== 'paid' && order.status !== 'cancelled' && (
            <button type="button" onClick={() => void handlePay()} disabled={paying} className="mt-4 w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">
              {paying ? 'Opening Paystack…' : 'Pay with Paystack'}
            </button>
          )}

          <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4 text-sm">
            <p className="font-bold capitalize">{order.delivery_method}</p>
            {order.delivery_method === 'delivery' && order.delivery_address && <p className="mt-1 leading-6 text-slate-500">{order.delivery_address}</p>}
            {order.delivery_method === 'pickup' && <p className="mt-1 text-slate-500">Arrange pickup details with the seller.</p>}
          </div>

          {order.status === 'pending' && (
            <button type="button" onClick={() => void handleCancel()} disabled={cancelling} className="mt-5 w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">
              {cancelling ? 'Cancelling…' : 'Cancel order'}
            </button>
          )}
        </aside>
      </div>

      <button type="button" onClick={() => navigate('/orders')} className="mt-6 text-sm font-semibold text-slate-500 hover:text-slate-900">Back to all orders</button>
    </main>
  )
}
