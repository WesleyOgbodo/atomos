import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin, Store } from 'lucide-react'
import { formatNaira } from '@/lib/format'
import { getMyCart, type CartProductItem } from '@/services/cart'
import { createOrderFromCart, type DeliveryMethod } from '@/services/orders'
import { initializeOrderPayment } from '@/services/payments'

const DELIVERY_FEE = 2000

export function Checkout() {
  const navigate = useNavigate()
  const [items, setItems] = useState<CartProductItem[]>([])
  const [method, setMethod] = useState<DeliveryMethod>('pickup')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(true)
  const [placing, setPlacing] = useState(false)
  const [error, setError] = useState('')

  const loadCart = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      setItems(await getMyCart())
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load your cart.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void loadCart() }, [loadCart])

  const subtotal = useMemo(
    () => items.reduce((sum, item) => sum + item.product.price * item.quantity, 0),
    [items],
  )
  const deliveryFee = method === 'delivery' ? DELIVERY_FEE : 0
  const total = subtotal + deliveryFee
  const hasStockIssue = items.some(item => item.product.stock < item.quantity || item.product.stock < 1)

  async function handlePlaceOrder() {
    setError('')

    if (!items.length) {
      setError('Your cart is empty.')
      return
    }

    if (hasStockIssue) {
      setError('One or more items no longer have enough stock. Return to your cart and adjust them.')
      return
    }

    if (method === 'delivery' && address.trim().length < 5) {
      setError('Enter a valid delivery address.')
      return
    }

    setPlacing(true)
    try {
      const orderId = await createOrderFromCart(method, address)
      const payment = await initializeOrderPayment(orderId)
      window.location.assign(payment.authorizationUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not place your order.')
      await loadCart()
    } finally {
      setPlacing(false)
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-6xl px-5 py-24 text-center text-sm font-semibold text-slate-500">Loading checkout…</main>
  }

  if (!items.length && !error) {
    return (
      <main className="mx-auto max-w-3xl px-5 py-24 text-center">
        <h1 className="text-4xl font-black tracking-tight">Your cart is empty</h1>
        <p className="mt-3 text-slate-500">Add an item before starting checkout.</p>
        <Link to="/featured" className="mt-7 inline-flex rounded-full bg-slate-950 px-6 py-3 font-bold text-white">Continue shopping</Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
      <Link to="/cart" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950"><ArrowLeft size={16} /> Back to cart</Link>
      <div className="mt-7 grid gap-8 lg:grid-cols-[1fr_380px]">
        <section>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Secure checkout</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Complete your order</h1>
          <p className="mt-2 text-sm text-slate-500">Prices and stock are checked again when you place the order.</p>

          <div className="mt-8 rounded-2xl border border-slate-200 p-5">
            <h2 className="text-lg font-black">How do you want to receive it?</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <button type="button" onClick={() => setMethod('pickup')} className={`rounded-2xl border p-4 text-left transition ${method === 'pickup' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <Store size={20} className="text-blue-600" />
                <p className="mt-3 font-bold">Pickup</p>
                <p className="mt-1 text-sm text-slate-500">Arrange pickup with the seller.</p>
                <p className="mt-2 text-sm font-bold">No delivery fee</p>
              </button>
              <button type="button" onClick={() => setMethod('delivery')} className={`rounded-2xl border p-4 text-left transition ${method === 'delivery' ? 'border-blue-600 bg-blue-50' : 'border-slate-200 hover:border-slate-300'}`}>
                <MapPin size={20} className="text-blue-600" />
                <p className="mt-3 font-bold">Delivery</p>
                <p className="mt-1 text-sm text-slate-500">Use the address below for delivery.</p>
                <p className="mt-2 text-sm font-bold">{formatNaira(DELIVERY_FEE)} delivery</p>
              </button>
            </div>

            {method === 'delivery' && (
              <label className="mt-5 block">
                <span className="mb-2 block text-sm font-semibold text-slate-700">Delivery address</span>
                <textarea value={address} onChange={event => setAddress(event.target.value)} rows={4} maxLength={500} placeholder="House/building, street, area, city" className="w-full resize-none rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
                <span className="mt-1 block text-xs text-slate-400">Do not enter card details or account passwords here.</span>
              </label>
            )}
          </div>

          <div className="mt-5 rounded-2xl border border-slate-200 p-5">
            <h2 className="text-lg font-black">Items</h2>
            <div className="mt-4 divide-y divide-slate-100">
              {items.map(item => (
                <div key={item.product.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                  <img src={item.product.imageUrl} alt="" className="h-20 w-16 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-bold">{item.product.name}</p>
                    <p className="mt-1 text-sm text-slate-500">Qty {item.quantity} · {formatNaira(item.product.price)} each</p>
                    {item.product.stock < item.quantity && <p className="mt-1 text-xs font-bold text-red-600">Stock changed. Please return to cart.</p>}
                  </div>
                  <strong className="shrink-0">{formatNaira(item.product.price * item.quantity)}</strong>
                </div>
              ))}
            </div>
          </div>
        </section>

        <aside className="h-fit rounded-2xl bg-slate-50 p-6 lg:sticky lg:top-24">
          <h2 className="text-xl font-black">Order summary</h2>
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex justify-between"><span>Subtotal</span><strong>{formatNaira(subtotal)}</strong></div>
            <div className="flex justify-between"><span>Delivery</span><strong>{deliveryFee ? formatNaira(deliveryFee) : 'Free'}</strong></div>
          </div>
          <div className="my-6 border-t border-slate-200" />
          <div className="flex justify-between text-lg font-black"><span>Total</span><span>{formatNaira(total)}</span></div>
          {error && <p className="mt-5 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700" role="alert">{error}</p>}
          <button type="button" onClick={() => void handlePlaceOrder()} disabled={placing || hasStockIssue} className="mt-6 w-full rounded-full bg-slate-950 py-4 font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50">
            {placing ? 'Placing order…' : 'Place order'}
          </button>
          <p className="mt-3 text-center text-xs leading-5 text-slate-500">You will be redirected to Paystack to complete payment securely. Atomos never collects your card details.</p>
        </aside>
      </div>
    </main>
  )
}
