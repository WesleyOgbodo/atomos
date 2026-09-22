import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, RefreshCw } from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatNaira } from '@/lib/format'
import { getSellerOrder, updateSellerOrderStatus, type OrderStatus, type SellerOrder } from '@/services/orders'

const labels: Record<OrderStatus, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  ready_for_delivery: 'Ready for delivery',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'processing',
  processing: 'ready_for_delivery',
  ready_for_delivery: 'delivered',
}

const steps: OrderStatus[] = ['pending', 'confirmed', 'processing', 'ready_for_delivery', 'delivered']

export function SellerOrderDetails() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<SellerOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState(false)

  const load = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    setError('')
    try {
      setOrder(await getSellerOrder(orderId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load this seller order.')
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => { void load() }, [load])

  async function changeStatus(status: OrderStatus) {
    if (!order) return
    if (!window.confirm(`Change your part of ${order.order_number} to ${labels[status]}?`)) return
    setUpdating(true)
    setError('')
    try {
      await updateSellerOrderStatus(order.order_id, status)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update this order.')
    } finally {
      setUpdating(false)
    }
  }

  if (loading) return <main className="mx-auto max-w-4xl px-5 py-24 text-center text-sm font-semibold text-slate-500">Loading seller order…</main>
  if (!order) return <main className="mx-auto max-w-4xl px-5 py-24 text-center"><h1 className="text-3xl font-black">Seller order unavailable</h1><p className="mt-3 text-sm text-red-600">{error || 'This order does not contain one of your listings.'}</p><Link to="/seller/orders" className="mt-6 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">Back to seller orders</Link></main>

  const next = nextStatus[order.seller_status]
  const currentIndex = steps.indexOf(order.seller_status)
  const canCancel = order.seller_status === 'pending' || order.seller_status === 'confirmed'

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/seller/orders" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft size={16} /> Seller orders</Link>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} /> Refresh</button>
      </div>

      <div className="mt-7 flex flex-wrap items-start justify-between gap-4">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Seller order</p><h1 className="mt-2 text-4xl font-black tracking-tight">{order.order_number}</h1><p className="mt-2 text-sm text-slate-500">Placed {new Date(order.created_at).toLocaleString('en-NG')}</p></div>
        <div className="text-right"><p className="text-xs font-bold uppercase tracking-wide text-slate-400">Your status</p><p className="mt-1 text-lg font-black capitalize">{labels[order.seller_status]}</p></div>
      </div>

      {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}

      <section className="mt-8 rounded-2xl border border-slate-200 p-5">
        <h2 className="text-lg font-black">Fulfilment progress</h2>
        {order.seller_status === 'cancelled' ? <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700">Your part of this order has been cancelled.</p> : <div className="mt-6 grid grid-cols-5 gap-2">{steps.map((step, index) => <div key={step} className="text-center"><div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full border ${index <= currentIndex ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-300 text-slate-400'}`}>{index <= currentIndex ? '✓' : '•'}</div><p className={`mt-2 text-[11px] font-bold ${index <= currentIndex ? 'text-slate-900' : 'text-slate-400'}`}>{labels[step]}</p></div>)}</div>}
      </section>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section className="rounded-2xl border border-slate-200 p-5"><h2 className="text-lg font-black">Your items</h2><div className="mt-4 divide-y divide-slate-100">{order.items.map(item => <div key={item.item_id} className="flex justify-between gap-4 py-4 first:pt-0 last:pb-0"><div><p className="font-bold">{item.title_snapshot}</p><p className="mt-1 text-sm text-slate-500">Qty {item.quantity} · {formatNaira(item.unit_price)} each</p></div><strong>{formatNaira(item.unit_price * item.quantity)}</strong></div>)}</div></section>
        <aside className="h-fit rounded-2xl bg-slate-50 p-5"><h2 className="text-lg font-black">Buyer & fulfilment</h2><div className="mt-4 space-y-3 text-sm"><div><p className="font-bold">Buyer</p><p className="mt-1">{order.buyer_name || 'Name not provided'}</p>{order.buyer_phone && <p className="mt-1 text-slate-500">{order.buyer_phone}</p>}</div><div className="border-t border-slate-200 pt-3"><p className="font-bold">Method</p><p className="mt-1 capitalize">{order.delivery_method}</p>{order.delivery_address && <p className="mt-1 leading-6 text-slate-500">{order.delivery_address}</p>}</div><div className="border-t border-slate-200 pt-3"><p className="font-bold">Order total</p><p className="mt-1 text-lg font-black">{formatNaira(order.total)}</p></div></div></aside>
      </div>

      <div className="mt-6 flex flex-wrap gap-3 border-t border-slate-200 pt-6">
        {next && <button type="button" onClick={() => void changeStatus(next)} disabled={updating} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50">{updating ? 'Updating…' : `Mark ${labels[next]}`}</button>}
        {canCancel && <button type="button" onClick={() => void changeStatus('cancelled')} disabled={updating} className="rounded-xl border border-red-200 px-5 py-3 text-sm font-bold text-red-700 hover:bg-red-50 disabled:opacity-50">Cancel order</button>}
        <button type="button" onClick={() => navigate('/seller/orders')} className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-bold text-slate-700">Back to seller orders</button>
      </div>
    </main>
  )
}
