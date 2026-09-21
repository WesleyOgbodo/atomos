import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2 } from 'lucide-react'
import { formatNaira } from '@/lib/format'
import { clearMyCart, getMyCart, removeFromCart, setCartQuantity, type CartProductItem } from '@/services/cart'

export function Cart() {
  const [items, setItems] = useState<CartProductItem[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [clearing, setClearing] = useState(false)
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

  const changeQuantity = async (listingId: string, currentQuantity: number, delta: number, stock: number) => {
    const nextQuantity = Math.max(1, Math.min(99, stock, currentQuantity + delta))
    if (nextQuantity === currentQuantity) return

    setBusyId(listingId)
    setError('')
    try {
      const savedQuantity = await setCartQuantity(listingId, nextQuantity)
      setItems(current => current.map(item =>
        item.product.id === listingId
          ? { ...item, quantity: savedQuantity, product: { ...item.product, stock } }
          : item,
      ))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update quantity.')
      await loadCart()
    } finally {
      setBusyId(null)
    }
  }

  const removeItem = async (listingId: string) => {
    setBusyId(listingId)
    setError('')
    try {
      await removeFromCart(listingId)
      setItems(current => current.filter(item => item.product.id !== listingId))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not remove item.')
    } finally {
      setBusyId(null)
    }
  }

  const handleClearCart = async () => {
    if (!window.confirm('Clear every item from your cart?')) return

    setClearing(true)
    setError('')
    try {
      await clearMyCart()
      setItems([])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear your cart.')
    } finally {
      setClearing(false)
    }
  }

  if (loading) {
    return <main className="mx-auto max-w-4xl px-5 py-24 text-center text-sm font-semibold text-slate-500">Loading your cart…</main>
  }

  if (error && !items.length) {
    return (
      <main className="mx-auto max-w-4xl px-5 py-24 text-center">
        <h1 className="text-3xl font-black">We couldn't load your cart</h1>
        <p className="mt-3 text-sm text-slate-500">{error}</p>
        <button onClick={() => void loadCart()} className="mt-6 rounded-full bg-black px-6 py-3 font-bold text-white">Try again</button>
      </main>
    )
  }

  if (!items.length) {
    return <main className="mx-auto max-w-4xl px-5 py-24 text-center"><h1 className="text-4xl font-black">Your cart is empty</h1><p className="mt-3 text-gray-500">Find something you like and bring it here.</p><Link to="/featured" className="mt-7 inline-block rounded-full bg-black px-6 py-3 font-bold text-white">Shop now</Link></main>
  }

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0)

  return (
    <main className="mx-auto max-w-6xl px-5 py-12 lg:px-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-black">Your cart</h1>
        <button
          type="button"
          onClick={() => void handleClearCart()}
          disabled={clearing || busyId !== null}
          className="rounded-full border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-red-300 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {clearing ? 'Clearing…' : 'Clear cart'}
        </button>
      </div>
      {error && <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}

      <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_360px]">
        <div className="space-y-5">
          {items.map(item => {
            const unavailable = item.product.stock < 1
            const maxQuantity = Math.min(99, Math.max(1, item.product.stock))
            const disabled = clearing || busyId === item.product.id

            return (
              <div key={item.product.id} className="flex gap-4 rounded-2xl border p-3 sm:p-4">
                <img src={item.product.imageUrl} alt={item.product.name} className="h-28 w-24 rounded-xl object-cover sm:h-36 sm:w-28" />
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    <div className="flex justify-between gap-3">
                      <div>
                        <Link to={`/products/${item.product.id}`} className="font-bold hover:text-blue-600">{item.product.name}</Link>
                        <p className="mt-1 text-sm text-gray-500">{formatNaira(item.product.price)} · {item.product.location}</p>
                      </div>
                      <button disabled={disabled} onClick={() => void removeItem(item.product.id)} aria-label={`Remove ${item.product.name}`} className="p-1 disabled:opacity-40"><Trash2 size={17} /></button>
                    </div>
                    {unavailable && <p className="mt-2 text-sm font-bold text-red-600">This listing is out of stock. Remove it before checkout.</p>}
                    {!unavailable && item.quantity > item.product.stock && <p className="mt-2 text-sm font-bold text-amber-700">Only {item.product.stock} available. Reduce the quantity.</p>}
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-4">
                    <div className="flex items-center rounded-full border">
                      <button disabled={disabled || unavailable || item.quantity <= 1} onClick={() => void changeQuantity(item.product.id, item.quantity, -1, item.product.stock)} className="p-2 disabled:opacity-30" aria-label="Decrease quantity"><Minus size={14} /></button>
                      <span className="w-8 text-center text-sm">{item.quantity}</span>
                      <button disabled={disabled || unavailable || item.quantity >= maxQuantity} onClick={() => void changeQuantity(item.product.id, item.quantity, 1, item.product.stock)} className="p-2 disabled:opacity-30" aria-label="Increase quantity"><Plus size={14} /></button>
                    </div>
                    <strong>{formatNaira(item.product.price * item.quantity)}</strong>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        <aside className="h-fit rounded-2xl bg-gray-50 p-6">
          <h2 className="text-xl font-black">Summary</h2>
          <div className="mt-6 flex justify-between"><span>Subtotal</span><strong>{formatNaira(subtotal)}</strong></div>
          <div className="mt-3 flex justify-between text-sm text-gray-500"><span>Delivery</span><span>Calculated at checkout</span></div>
          <div className="my-6 border-t" />
          <div className="flex justify-between text-lg font-black"><span>Total</span><span>{formatNaira(subtotal)}</span></div>
          <Link to="/checkout" className="mt-6 block w-full rounded-full bg-black py-4 text-center font-bold text-white hover:bg-slate-800">Proceed to checkout</Link>
          <p className="mt-3 text-center text-xs text-slate-500">Your cart is stored in Supabase. Checkout re-checks current price and stock on the server.</p>
        </aside>
      </div>
    </main>
  )
}
