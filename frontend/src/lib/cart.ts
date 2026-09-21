import type { Product } from '@/types/product'

export interface CartItem { product: Product; quantity: number }

// Legacy local-cart helpers are retained only for compatibility with older imports.
// Authenticated Atomos carts now use Supabase through src/services/cart.ts.
const KEY = 'atomos-cart'

export const readCart = (): CartItem[] => {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') as CartItem[] } catch { return [] }
}

export const writeCart = (items: CartItem[]) => localStorage.setItem(KEY, JSON.stringify(items))

export const addCartItem = (product: Product, quantity = 1) => {
  const cart = readCart()
  const existing = cart.find(item => item.product.id === product.id)
  if (existing) existing.quantity = Math.min(99, existing.quantity + quantity)
  else cart.push({ product, quantity: Math.min(99, Math.max(1, quantity)) })
  writeCart(cart)
  return cart
}
