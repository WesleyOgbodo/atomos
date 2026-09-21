import { products as demoProducts } from '@/data/products'
import { supabase } from '@/lib/supabase'
import type { Product } from '@/types/product'

const LIVE_LISTING_SELECT = `
  id,
  title,
  description,
  price,
  condition,
  location,
  stock,
  created_at,
  categories (name, slug),
  brands (name, slug),
  listing_photos (storage_path, sort_order)
`

type LiveListing = {
  id: string
  title: string
  description: string | null
  price: number
  condition: 'brand_new' | 'used'
  location: string
  stock: number
  created_at: string
  categories: { name: string; slug: string } | null
  brands: { name: string; slug: string } | null
  listing_photos: { storage_path: string; sort_order: number }[]
}

function mapCondition(condition: LiveListing['condition']): Product['condition'] {
  return condition === 'brand_new' ? 'Brand New' : 'Used'
}

function mapCategory(name: string | undefined): Product['category'] {
  const allowed: Product['category'][] = ['Phones', 'Laptops', 'Audio', 'Accessories', 'Fashion', 'Shoes', 'Other']
  return allowed.includes(name as Product['category']) ? (name as Product['category']) : 'Other'
}

function mapBrand(name: string | undefined): Product['brand'] {
  const allowed: Product['brand'][] = ['Apple', 'Samsung', 'Xiaomi', 'Infinix', 'Oppo', 'Other']
  return allowed.includes(name as Product['brand']) ? (name as Product['brand']) : 'Other'
}

async function toProduct(listing: LiveListing): Promise<Product | null> {
  const photos = [...(listing.listing_photos ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  const mainPhoto = photos[0]

  let imageUrl = '/atomos-mark.svg'
  const imageUrls: string[] = []

  for (const photo of photos) {
    const { data, error } = await supabase.storage
      .from('listing-photos')
      .createSignedUrl(photo.storage_path, 60 * 60)

    if (!error && data?.signedUrl) {
      imageUrls.push(data.signedUrl)
    } else {
      console.warn('Could not create a signed listing-photo URL:', error)
    }
  }

  if (imageUrls.length > 0) imageUrl = imageUrls[0]

  return {
    id: listing.id,
    name: listing.title,
    category: mapCategory(listing.categories?.name),
    brand: mapBrand(listing.brands?.name),
    condition: mapCondition(listing.condition),
    price: Number(listing.price),
    rating: 0,
    reviewsCount: 0,
    imageUrl,
    imageUrls: imageUrls.length > 0 ? imageUrls : [imageUrl],
    photoType: 'seller',
    location: listing.location,
    description: listing.description ?? '',
    sizes: [],
    colors: [],
    stock: listing.stock,
    isNew: true,
    isBestSeller: false,
    badge: 'New listing',
  }
}

export async function getLiveProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(LIVE_LISTING_SELECT)
    .eq('status', 'active')
    .gt('stock', 0)
    .order('created_at', { ascending: false })

  if (error) throw error

  const mapped = await Promise.all((data ?? []).map(listing => toProduct(listing as unknown as LiveListing)))
  return mapped.filter((product): product is Product => product !== null)
}

export async function getProducts(): Promise<Product[]> {
  try {
    const liveProducts = await getLiveProducts()
    return [...liveProducts, ...demoProducts]
  } catch (error) {
    console.error('Could not load live Atomos listings:', error)
    return demoProducts
  }
}

export async function getProductById(id: string): Promise<Product | null> {
  const demoProduct = demoProducts.find(product => product.id === id)

  try {
    const { data, error } = await supabase
      .from('listings')
      .select(LIVE_LISTING_SELECT)
      .eq('id', id)
      .eq('status', 'active')
      .maybeSingle()

    if (!error && data) {
      const liveProduct = await toProduct(data as unknown as LiveListing)
      if (liveProduct) return liveProduct
    }
  } catch (error) {
    console.error('Could not load listing:', error)
  }

  return demoProduct ?? null
}

export async function getProductsByCategory(category: string): Promise<Product[]> {
  const allProducts = await getProducts()
  return allProducts.filter(product => product.category.toLowerCase() === category.toLowerCase())
}
