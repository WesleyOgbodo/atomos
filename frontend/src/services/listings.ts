import { supabase } from '@/lib/supabase'

export type ListingFormInput = {
  title: string
  description: string
  categoryId: string
  brandId: string | null
  price: number
  condition: 'brand_new' | 'used'
  location: string
  stock: number
  specs: Record<string, string>
  photos: File[]
}

export type ListingOption = {
  id: string
  name: string
  slug: string
}

export async function getListingCategories() {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug')
    .order('name')

  if (error) throw error
  return (data ?? []) as ListingOption[]
}

export async function getListingBrands() {
  const { data, error } = await supabase
    .from('brands')
    .select('id, name, slug')
    .order('name')

  if (error) throw error
  return (data ?? []) as ListingOption[]
}

export async function createSellerListing(userId: string, input: ListingFormInput) {
  if (input.photos.length < 1) throw new Error('Add at least one photo of the exact item you are selling.')
  if (input.photos.length > 8) throw new Error('You can upload up to 8 photos per listing.')

  const { data: listing, error: listingError } = await supabase
    .from('listings')
    .insert({
      seller_id: userId,
      category_id: input.categoryId,
      brand_id: input.brandId || null,
      title: input.title.trim(),
      description: input.description.trim(),
      price: input.price,
      condition: input.condition,
      location: input.location.trim(),
      stock: input.stock,
      status: 'draft',
      specs: input.specs,
    })
    .select('id')
    .single()

  if (listingError) throw listingError

  const uploadedPaths: string[] = []

  try {
    for (const [index, file] of input.photos.entries()) {
      const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
      const safeExtension = /^[a-z0-9]+$/.test(extension) ? extension : 'jpg'
      const path = `${userId}/${listing.id}/${index + 1}-${crypto.randomUUID()}.${safeExtension}`

      const { error: uploadError } = await supabase.storage
        .from('listing-photos')
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || undefined,
        })

      if (uploadError) throw uploadError
      uploadedPaths.push(path)
    }

    const photoRows = uploadedPaths.map((storage_path, index) => ({
      listing_id: listing.id,
      storage_path,
      sort_order: index,
    }))

    const { error: photoError } = await supabase
      .from('listing_photos')
      .insert(photoRows)

    if (photoError) throw photoError

    const { error: activateError } = await supabase
      .from('listings')
      .update({ status: 'active' })
      .eq('id', listing.id)
      .eq('seller_id', userId)

    if (activateError) throw activateError

    return listing.id as string
  } catch (error) {
    await supabase.storage.from('listing-photos').remove(uploadedPaths)
    await supabase.from('listing_photos').delete().eq('listing_id', listing.id)
    await supabase.from('listings').delete().eq('id', listing.id).eq('seller_id', userId)
    throw error
  }
}
