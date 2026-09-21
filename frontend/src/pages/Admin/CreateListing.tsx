import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ImagePlus, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { createSellerListing, getListingBrands, getListingCategories, type ListingOption } from '@/services/listings'

const MAX_PHOTOS = 8

export function CreateListing() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [categories, setCategories] = useState<ListingOption[]>([])
  const [brands, setBrands] = useState<ListingOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [categoryId, setCategoryId] = useState('')
  const [brandId, setBrandId] = useState('')
  const [price, setPrice] = useState('')
  const [condition, setCondition] = useState<'brand_new' | 'used'>('used')
  const [location, setLocation] = useState('')
  const [stock, setStock] = useState('1')
  const [photos, setPhotos] = useState<File[]>([])
  const [specs, setSpecs] = useState([{ key: '', value: '' }])

  useEffect(() => {
    let mounted = true
    Promise.all([getListingCategories(), getListingBrands()])
      .then(([nextCategories, nextBrands]) => {
        if (!mounted) return
        setCategories(nextCategories)
        setBrands(nextBrands)
      })
      .catch((err: unknown) => {
        if (mounted) setError(err instanceof Error ? err.message : 'Could not load listing options.')
      })
      .finally(() => {
        if (mounted) setLoadingOptions(false)
      })
    return () => { mounted = false }
  }, [])

  const previews = useMemo(() => photos.map(file => ({ file, url: URL.createObjectURL(file) })), [photos])

  useEffect(() => () => previews.forEach(item => URL.revokeObjectURL(item.url)), [previews])

  if (profile?.role !== 'seller' || !user) return null

  const addPhotos = (files: FileList | null) => {
    if (!files) return
    const selected = Array.from(files).filter(file => file.type.startsWith('image/'))
    setPhotos(current => [...current, ...selected].slice(0, MAX_PHOTOS))
  }

  const updateSpec = (index: number, field: 'key' | 'value', value: string) => {
    setSpecs(current => current.map((spec, i) => i === index ? { ...spec, [field]: value } : spec))
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setError('')
    setSuccess('')

    const numericPrice = Number(price)
    const numericStock = Number(stock)

    if (!title.trim() || title.trim().length < 4) return setError('Enter a clear product title.')
    if (!description.trim() || description.trim().length < 10) return setError('Add a useful product description.')
    if (!categoryId) return setError('Select a category.')
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) return setError('Enter a valid price greater than ₦0.')
    if (!Number.isInteger(numericStock) || numericStock < 1 || numericStock > 9999) return setError('Stock must be a whole number between 1 and 9,999.')
    if (!location.trim()) return setError('Enter the listing location.')
    if (photos.length < 1) return setError('Add at least one clear photo of the exact item.')

    const specMap = Object.fromEntries(
      specs
        .map(spec => [spec.key.trim(), spec.value.trim()])
        .filter(([key, value]) => key && value),
    )

    setSaving(true)
    try {
      const listingId = await createSellerListing(user.id, {
        title,
        description,
        categoryId,
        brandId: brandId || null,
        price: numericPrice,
        condition,
        location,
        stock: numericStock,
        specs: specMap,
        photos,
      })
      setSuccess('Your listing is live on Atomos.')
      window.setTimeout(() => navigate(`/products/${listingId}`), 700)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not create the listing.')
    } finally {
      setSaving(false)
    }
  }

  return <main className="mx-auto max-w-5xl px-5 py-10 lg:px-8">
    <div className="mb-8">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Seller</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">Create a listing</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">List the exact item you have for sale. Use clear photos taken by you and describe the condition honestly.</p>
    </div>

    <form onSubmit={submit} className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <h2 className="text-lg font-black text-slate-950">Basic information</h2>
        <div className="mt-5 grid gap-5 sm:grid-cols-2">
          <label className="sm:col-span-2 text-sm font-bold text-slate-700">Product title<input value={title} onChange={e => setTitle(e.target.value)} maxLength={120} placeholder="e.g. iPhone 13 128GB Blue" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-blue-500" /></label>
          <label className="text-sm font-bold text-slate-700">Category<select disabled={loadingOptions} value={categoryId} onChange={e => setCategoryId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium outline-none focus:border-blue-500"><option value="">Select category</option>{categories.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
          <label className="text-sm font-bold text-slate-700">Brand<select disabled={loadingOptions} value={brandId} onChange={e => setBrandId(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium outline-none focus:border-blue-500"><option value="">Other / not listed</option>{brands.map(option => <option key={option.id} value={option.id}>{option.name}</option>)}</select></label>
          <label className="text-sm font-bold text-slate-700">Condition<select value={condition} onChange={e => setCondition(e.target.value as 'brand_new' | 'used')} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium outline-none focus:border-blue-500"><option value="brand_new">Brand New</option><option value="used">Used</option></select></label>
          <label className="text-sm font-bold text-slate-700">Price<input type="number" min="1" step="1" value={price} onChange={e => setPrice(e.target.value)} placeholder="₦0" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-blue-500" /></label>
          <label className="text-sm font-bold text-slate-700">Stock<input type="number" min="1" max="9999" step="1" value={stock} onChange={e => setStock(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-blue-500" /></label>
          <label className="text-sm font-bold text-slate-700">Location<input value={location} onChange={e => setLocation(e.target.value)} maxLength={100} placeholder="e.g. Enugu" className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-blue-500" /></label>
          <label className="sm:col-span-2 text-sm font-bold text-slate-700">Description<textarea value={description} onChange={e => setDescription(e.target.value)} maxLength={3000} rows={6} placeholder="Describe the item, its condition, included accessories, defects, warranty status, and anything a buyer should know." className="mt-2 w-full resize-y rounded-xl border border-slate-300 px-4 py-3 font-medium outline-none focus:border-blue-500" /></label>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-black text-slate-950">Photos</h2><p className="mt-1 text-sm text-slate-500">Upload 1–8 clear photos of the exact item. The first photo becomes the main image.</p></div><span className="text-xs font-bold text-slate-400">{photos.length}/{MAX_PHOTOS}</span></div>
        <label className="mt-5 flex min-h-32 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:border-blue-400"><ImagePlus className="text-slate-500" /><span className="mt-2 text-sm font-bold text-slate-700">Choose product photos</span><span className="mt-1 text-xs text-slate-500">JPG, PNG or WebP · up to 8 photos</span><input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => addPhotos(e.target.files)} className="sr-only" /></label>
        {previews.length > 0 && <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">{previews.map(({ file, url }, index) => <div key={`${file.name}-${index}`} className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-100"><img src={url} alt={`Listing photo ${index + 1}`} className="aspect-square w-full object-cover" /><button type="button" onClick={() => setPhotos(current => current.filter((_, i) => i !== index))} aria-label={`Remove photo ${index + 1}`} className="absolute right-2 top-2 rounded-full bg-white p-1.5 shadow"><X size={16} /></button>{index === 0 && <span className="absolute bottom-2 left-2 rounded-md bg-slate-950 px-2 py-1 text-[10px] font-bold text-white">Main photo</span>}</div>)}</div>}
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between"><div><h2 className="text-lg font-black text-slate-950">Specifications</h2><p className="mt-1 text-sm text-slate-500">Add useful details such as storage, RAM, size, colour or model.</p></div><button type="button" onClick={() => setSpecs(current => [...current, { key: '', value: '' }])} className="text-sm font-bold text-blue-600">Add field</button></div>
        <div className="mt-5 space-y-3">{specs.map((spec, index) => <div key={index} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]"><input value={spec.key} onChange={e => updateSpec(index, 'key', e.target.value)} placeholder="Specification" className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500" /><input value={spec.value} onChange={e => updateSpec(index, 'value', e.target.value)} placeholder="Value" className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500" /><button type="button" onClick={() => setSpecs(current => current.length === 1 ? [{ key: '', value: '' }] : current.filter((_, i) => i !== index))} className="rounded-xl border border-slate-300 px-3 py-2 text-sm font-bold text-slate-500 hover:bg-slate-50">Remove</button></div>)}</div>
      </section>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
      {success && <p role="status" className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-semibold text-green-700">{success}</p>}

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><Link to="/account" className="rounded-xl border border-slate-300 px-5 py-3 text-center text-sm font-bold text-slate-700">Cancel</Link><button disabled={saving || loadingOptions} type="submit" className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50">{saving ? 'Publishing...' : 'Publish listing'}</button></div>
    </form>
  </main>
}
