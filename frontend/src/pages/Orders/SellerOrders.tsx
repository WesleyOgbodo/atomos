import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { RefreshCw } from 'lucide-react'
import { formatNaira } from '@/lib/format'
import { getSellerOrders, updateSellerOrderStatus, type OrderStatus, type SellerOrder } from '@/services/orders'

const statusLabel = (status: OrderStatus) => status.replace(/_/g, ' ')
const nextStatus: Partial<Record<OrderStatus, OrderStatus>> = {
  pending: 'confirmed',
  confirmed: 'processing',
  processing: 'ready_for_delivery',
  ready_for_delivery: 'delivered',
}

const statusClasses: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  processing: 'bg-indigo-50 text-indigo-700',
  ready_for_delivery: 'bg-violet-50 text-violet-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
}

export function SellerOrders() {
  const [orders, setOrders] = useState<SellerOrder[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [updating, setUpdating] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setOrders(await getSellerOrders())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load seller orders.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  async function changeStatus(order: SellerOrder, status: OrderStatus) {
    if (!window.confirm(`Change your part of ${order.order_number} to ${statusLabel(status)}?`)) return
    setUpdating(order.order_id)
    setError('')
    try {
      await updateSellerOrderStatus(order.order_id, status)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the order status.')
    } finally {
      setUpdating('')
    }
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Seller area</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Orders</h1>
          <p className="mt-2 text-sm text-slate-500">Only orders containing your listings are shown. Your status is separate from other sellers.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"><RefreshCw size={16} /> Refresh</button>
      </div>

      {error && <p className="mt-6 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}
      {loading && <p className="mt-10 text-sm font-semibold text-slate-500">Loading seller orders…</p>}
      {!loading && !error && !orders.length && <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center"><h2 className="text-xl font-black">No seller orders yet</h2><p className="mt-2 text-sm text-slate-500">Paid orders containing your listings will appear here.</p></div>}

      <div className="mt-8 space-y-5">
        {orders.map(order => {
          const next = nextStatus[order.seller_status]
          const canCancel = order.seller_status === 'pending' || order.seller_status === 'confirmed'
          return (
            <article key={order.order_id} className="rounded-2xl border border-slate-200 p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-black">{order.order_number}</p>
                  <p className="mt-1 text-sm text-slate-500">{new Date(order.created_at).toLocaleString('en-NG')}</p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-bold">
                  <span className={`rounded-full px-3 py-1 capitalize ${statusClasses[order.seller_status]}`}>Your status: {statusLabel(order.seller_status)}</span>
                  <span className={`rounded-full px-3 py-1 capitalize ${statusClasses[order.global_status]}`}>Order: {statusLabel(order.global_status)}</span>
                </div>
              </div>

              <div className="mt-5 grid gap-5 lg:grid-cols-[1fr_300px]">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wide text-slate-500">Your items</h2>
                  <div className="mt-3 divide-y divide-slate-100">
                    {order.items.map(item => <div key={item.item_id} className="flex justify-between gap-4 py-3 first:pt-0"><div><p className="font-bold">{item.title_snapshot}</p><p className="mt-1 text-sm text-slate-500">Qty {item.quantity} · {formatNaira(item.unit_price)} each</p></div><strong className="shrink-0">{formatNaira(item.unit_price * item.quantity)}</strong></div>)}
                  </div>
                </div>

                <aside className="rounded-xl bg-slate-50 p-4 text-sm">
                  <p className="font-black">Buyer</p>
                  <p className="mt-2">{order.buyer_name || 'Name not provided'}</p>
                  {order.buyer_phone && <p className="mt-1 text-slate-500">{order.buyer_phone}</p>}
                  <div className="my-4 border-t border-slate-200" />
                  <p className="font-black">Fulfilment</p>
                  <p className="mt-2 capitalize">{order.delivery_method}</p>
                  {order.delivery_address && <p className="mt-1 leading-5 text-slate-500">{order.delivery_address}</p>}
                  <p className="mt-3 font-black">Order total: {formatNaira(order.total)}</p>
                </aside>
              </div>

              <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-100 pt-5">
                {next && <button type="button" onClick={() => void changeStatus(order, next)} disabled={updating === order.order_id} className="rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">{updating === order.order_id ? 'Updating…' : `Mark ${statusLabel(next)}`}</button>}
                {canCancel && <button type="button" onClick={() => void changeStatus(order, 'cancelled')} disabled={updating === order.order_id} className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-bold text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50">Cancel order</button>}
                {!next && !canCancel && <p className="text-sm font-semibold text-slate-500">No further seller action is available for this status.</p>}
                <Link to={`/seller/orders/${order.order_id}`} className="rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">View seller order</Link>
              </div>
            </article>
          )
        })}
      </div>
    </main>
  )
}
