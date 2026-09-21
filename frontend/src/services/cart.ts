import { supabase } from '@/lib/supabase'
import type { Product } from '@/types/product'

export type CartRow = {
  listing_id: string
  quantity: number
  title: string
  price: number | string
  condition: 'brand_new' | 'used'
  location: string
  stock: number
  status: 'draft' | 'active' | 'sold' | 'archived' | 'removed'
  photo_path: string | null
}

export type CartProductItem = {
  product: Product
  quantity: number
}

function mapCondition(value: CartRow['condition']): Product['condition'] {
  return value === 'brand_new' ? 'Brand New' : 'Used'
}

async function photoUrl(path: string | null) {
  if (!path) return '/atomos-mark.svg'
  const { data, error } = await supabase.storage
    .from('listing-photos')
    .createSignedUrl(path, 60 * 60)
  if (error || !data?.signedUrl) return '/atomos-mark.svg'
  return data.signedUrl
}

export async function getMyCart(): Promise<CartProductItem[]> {
  const { data, error } = await supabase.rpc('get_my_cart')
  if (error) throw error

  const rows = (data ?? []) as CartRow[]
  return Promise.all(rows.map(async (row) => ({
    quantity: row.quantity,
    product: {
      id: row.listing_id,
      name: row.title,
      category: 'Other',
      brand: 'Other',
      condition: mapCondition(row.condition),
      price: Number(row.price),
      rating: 0,
      reviewsCount: 0,
      imageUrl: await photoUrl(row.photo_path),
      imageUrls: [],
      photoType: 'seller',
      location: row.location,
      description: '',
      sizes: [],
      colors: [],
      stock: row.stock,
      isNew: row.condition === 'brand_new',
      isBestSeller: false,
    },
  })))
}

export async function addToCart(listingId: string, quantity = 1) {
  const { error } = await supabase.rpc('add_to_my_cart', {
    p_listing_id: listingId,
    p_quantity: quantity,
  })
  if (error) throw error
}

export async function setCartQuantity(listingId: string, quantity: number) {
  const { data, error } = await supabase.rpc('set_my_cart_quantity', {
    p_listing_id: listingId,
    p_quantity: quantity,
  })
  if (error) throw error
  return Number((data as Array<{ quantity: number }> | null)?.[0]?.quantity ?? quantity)
}

export async function removeFromCart(listingId: string) {
  const { error } = await supabase.rpc('remove_from_my_cart', {
    p_listing_id: listingId,
  })
  if (error) throw error
}

export async function clearMyCart() {
  const { error } = await supabase.rpc('clear_my_cart')
  if (error) throw error
}

// Backwards-compatible alias for callers that still use the older name.
export const clearCart = clearMyCart
