import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Package } from 'lucide-react'
import { getMyOrders, type OrderStatus, type OrderSummary } from '@/services/orders'
import { formatNaira } from '@/lib/format'

const statusClasses: Record<OrderStatus, string> = {
  pending: 'bg-amber-50 text-amber-700',
  confirmed: 'bg-blue-50 text-blue-700',
  processing: 'bg-indigo-50 text-indigo-700',
  ready_for_delivery: 'bg-violet-50 text-violet-700',
  delivered: 'bg-emerald-50 text-emerald-700',
  cancelled: 'bg-red-50 text-red-700',
}

const statusLabel = (status: OrderStatus) => status.replace(/_/g, ' ')

export function Orders() {
  const [orders, setOrders] = useState<OrderSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setOrders(await getMyOrders())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your orders.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void load() }, [load])

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Orders</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight">My orders</h1>
      <p className="mt-2 text-sm text-slate-500">Track purchases and view the details of every order.</p>

      {loading && <p className="mt-10 text-sm font-semibold text-slate-500">Loading orders…</p>}
      {error && (
        <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 px-4 py-4 text-sm font-semibold text-red-700" role="alert">
          {error}
          <button type="button" onClick={() => void load()} className="ml-3 underline">Retry</button>
        </div>
      )}

      {!loading && !error && !orders.length && (
        <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-10 text-center">
          <Package className="mx-auto text-slate-400" size={32} />
          <h2 className="mt-4 text-xl font-black">No orders yet</h2>
          <p className="mt-2 text-sm text-slate-500">Your completed checkouts will appear here.</p>
          <Link to="/featured" className="mt-5 inline-flex rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white">Shop products</Link>
        </div>
      )}

      {!loading && !error && orders.length > 0 && (
        <div className="mt-8 space-y-4">
          {orders.map(order => (
            <Link key={order.id} to={`/orders/${order.id}`} className="block rounded-2xl border border-slate-200 p-5 transition hover:border-blue-300 hover:shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-black">{order.order_number}</p>
                  <p className="mt-1 text-sm text-slate-500">{new Date(order.created_at).toLocaleString('en-NG')}</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-bold capitalize ${statusClasses[order.status]}`}>{statusLabel(order.status)}</span>
              </div>
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
                <span className="capitalize text-slate-500">{order.delivery_method}</span>
                <span className="flex items-center gap-2 font-black">{formatNaira(order.total)} <ArrowRight size={16} /></span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
