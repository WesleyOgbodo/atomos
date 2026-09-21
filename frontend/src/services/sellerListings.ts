import { supabase } from '@/lib/supabase'
import type { ListingOption } from './listings'

export type SellerListing = {
  id: string
  title: string
  description: string
  price: number
  condition: 'brand_new' | 'used'
  location: string
  stock: number
  status: 'draft' | 'active' | 'sold' | 'archived' | 'removed'
  specs: Record<string, string>
  created_at: string
  updated_at: string
  category_id: string
  brand_id: string | null
  category_name: string
  brand_name: string
  photos: { id: string; storage_path: string; sort_order: number; url: string }[]
}

type RawListing = Omit<SellerListing, 'category_name' | 'brand_name' | 'photos'> & {
  categories: { name: string } | null
  brands: { name: string } | null
  listing_photos: { id: string; storage_path: string; sort_order: number }[]
}

async function signPhotos(photos: RawListing['listing_photos']) {
  const sorted = [...(photos ?? [])].sort((a, b) => a.sort_order - b.sort_order)
  return Promise.all(sorted.map(async photo => {
    const { data } = await supabase.storage.from('listing-photos').createSignedUrl(photo.storage_path, 60 * 60)
    return { ...photo, url: data?.signedUrl ?? '' }
  }))
}

export async function getSellerListings(userId: string): Promise<SellerListing[]> {
  const { data, error } = await supabase
    .from('listings')
    .select('id,title,description,price,condition,location,stock,status,specs,created_at,updated_at,category_id,brand_id,categories(name),brands(name),listing_photos(id,storage_path,sort_order)')
    .eq('seller_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return Promise.all((data ?? []).map(async row => {
    const listing = row as unknown as RawListing
    return {
      ...listing,
      category_name: listing.categories?.name ?? 'Other',
      brand_name: listing.brands?.name ?? 'Other',
      photos: await signPhotos(listing.listing_photos),
    }
  }))
}

export async function updateSellerListing(userId: string, listingId: string, input: {
  title: string
  description: string
  categoryId: string
  brandId: string | null
  price: number
  condition: 'brand_new' | 'used'
  location: string
  stock: number
  specs: Record<string, string>
}) {
  const { error } = await supabase.from('listings').update({
    title: input.title.trim(), description: input.description.trim(), category_id: input.categoryId,
    brand_id: input.brandId || null, price: input.price, condition: input.condition,
    location: input.location.trim(), stock: input.stock, specs: input.specs,
  }).eq('id', listingId).eq('seller_id', userId)
  if (error) throw error
}

export async function updateSellerListingStatus(userId: string, listingId: string, status: 'active' | 'sold' | 'archived' | 'draft') {
  const { error } = await supabase.from('listings').update({ status }).eq('id', listingId).eq('seller_id', userId)
  if (error) throw error
}

export async function deleteSellerListing(userId: string, listing: SellerListing) {
  const paths = listing.photos.map(photo => photo.storage_path)
  if (paths.length) await supabase.storage.from('listing-photos').remove(paths)
  const { error } = await supabase.from('listings').delete().eq('id', listing.id).eq('seller_id', userId)
  if (error) throw error
}

export async function removeSellerListingPhoto(userId: string, listingId: string, photo: SellerListing['photos'][number]) {
  const { data: listing } = await supabase.from('listings').select('id').eq('id', listingId).eq('seller_id', userId).maybeSingle()
  if (!listing) throw new Error('Listing not found or you do not own it.')
  const { error: storageError } = await supabase.storage.from('listing-photos').remove([photo.storage_path])
  if (storageError) throw storageError
  const { error } = await supabase.from('listing_photos').delete().eq('id', photo.id).eq('listing_id', listingId)
  if (error) throw error
}

export async function addSellerListingPhotos(userId: string, listingId: string, files: File[]) {
  const { data: listing } = await supabase.from('listings').select('id').eq('id', listingId).eq('seller_id', userId).maybeSingle()
  if (!listing) throw new Error('Listing not found or you do not own it.')
  const { data: existing, error: existingError } = await supabase.from('listing_photos').select('sort_order').eq('listing_id', listingId).order('sort_order', { ascending: false }).limit(1)
  if (existingError) throw existingError
  let nextOrder = (existing?.[0]?.sort_order ?? -1) + 1
  const uploaded: string[] = []
  try {
    for (const file of files) {
      if (nextOrder >= 8) break
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const safeExtension = /^[a-z0-9]+$/.test(extension) ? extension : 'jpg'
      const path = `${userId}/${listingId}/${nextOrder + 1}-${crypto.randomUUID()}.${safeExtension}`
      const { error } = await supabase.storage.from('listing-photos').upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type || undefined })
      if (error) throw error
      uploaded.push(path)
      const { error: rowError } = await supabase.from('listing_photos').insert({ listing_id: listingId, storage_path: path, sort_order: nextOrder })
      if (rowError) throw rowError
      nextOrder += 1
    }
  } catch (error) {
    if (uploaded.length) await supabase.storage.from('listing-photos').remove(uploaded)
    throw error
  }
}

export type { ListingOption }
