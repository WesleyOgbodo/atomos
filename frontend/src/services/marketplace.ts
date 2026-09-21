import { supabase } from '@/lib/supabase'
import type { Product, ProductBrand, ProductCategory, ProductCondition } from '@/types/product'

type MarketplaceFilters = {
  search?: string
  category?: ProductCategory | 'All'
  brand?: ProductBrand | 'All'
  condition?: ProductCondition | 'All'
  minPrice?: number
  maxPrice?: number
  location?: string
  sort?: 'newest' | 'oldest' | 'price-low' | 'price-high' | 'views'
  limit?: number
  offset?: number
}

type MarketplaceRow = {
  id: string
  title: string
  description: string | null
  price: number
  condition: 'brand_new' | 'used'
  location: string
  stock: number
  created_at: string
  view_count: number
  category_name: string | null
  brand_name: string | null
  photo_paths: string[] | null
  total_count: number
}

const allowedCategories: ProductCategory[] = ['Phones', 'Laptops', 'Audio', 'Accessories', 'Fashion', 'Shoes', 'Other']
const allowedBrands: ProductBrand[] = ['Apple', 'Samsung', 'Xiaomi', 'Infinix', 'Oppo', 'Other']

function mapCondition(value: MarketplaceRow['condition']): ProductCondition {
  return value === 'brand_new' ? 'Brand New' : 'Used'
}

function mapCategory(value: string | null): ProductCategory {
  return allowedCategories.includes(value as ProductCategory) ? value as ProductCategory : 'Other'
}

function mapBrand(value: string | null): ProductBrand {
  return allowedBrands.includes(value as ProductBrand) ? value as ProductBrand : 'Other'
}

async function signedPhotoUrls(paths: string[] | null) {
  const validPaths = (paths ?? []).filter(Boolean)
  if (!validPaths.length) return []

  const { data, error } = await supabase.storage
    .from('listing-photos')
    .createSignedUrls(validPaths, 60 * 60)

  if (error) throw error

  return (data ?? [])
    .map(item => item.signedUrl)
    .filter((url): url is string => Boolean(url))
}

async function mapRow(row: MarketplaceRow): Promise<Product> {
  let imageUrls: string[] = []
  try {
    imageUrls = await signedPhotoUrls(row.photo_paths)
  } catch (error) {
    console.warn('Could not create signed listing-photo URLs:', error)
  }

  const fallback = '/atomos-mark.svg'
  return {
    id: row.id,
    name: row.title,
    category: mapCategory(row.category_name),
    brand: mapBrand(row.brand_name),
    condition: mapCondition(row.condition),
    price: Number(row.price),
    rating: 0,
    reviewsCount: 0,
    imageUrl: imageUrls[0] ?? fallback,
    imageUrls: imageUrls.length ? imageUrls : [fallback],
    photoType: 'seller',
    location: row.location,
    description: row.description ?? '',
    sizes: [],
    colors: [],
    stock: row.stock,
    isNew: true,
    isBestSeller: false,
    badge: row.condition === 'used' ? 'Used' : 'New listing',
  }
}

export async function searchMarketplace(filters: MarketplaceFilters = {}) {
  const { data, error } = await supabase.rpc('search_listings', {
    p_search: filters.search?.trim() || null,
    p_category: filters.category && filters.category !== 'All' ? filters.category : null,
    p_brand: filters.brand && filters.brand !== 'All' ? filters.brand : null,
    p_condition: filters.condition && filters.condition !== 'All'
      ? filters.condition === 'Brand New' ? 'brand_new' : 'used'
      : null,
    p_min_price: filters.minPrice ?? null,
    p_max_price: filters.maxPrice ?? null,
    p_location: filters.location?.trim() || null,
    p_sort: filters.sort ?? 'newest',
    p_limit: filters.limit ?? 32,
    p_offset: filters.offset ?? 0,
  })

  if (error) throw error

  const rows = (data ?? []) as MarketplaceRow[]
  const products = await Promise.all(rows.map(mapRow))
  return {
    products,
    total: rows[0]?.total_count ?? 0,
  }
}

export async function incrementListingView(listingId: string) {
  const { error } = await supabase.rpc('increment_listing_view', { p_listing_id: listingId })
  if (error) console.warn('Could not increment listing view:', error)
}
