import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Archive, Check, Edit3, ExternalLink, ImagePlus, Trash2, X } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { getListingBrands, getListingCategories, type ListingOption } from '@/services/listings'
import { addSellerListingPhotos, deleteSellerListing, getSellerListings, removeSellerListingPhoto, updateSellerListing, updateSellerListingStatus, type SellerListing } from '@/services/sellerListings'
import { formatNaira } from '@/lib/format'

const MAX_PHOTOS = 8
const statuses = ['all', 'draft', 'active', 'sold', 'archived'] as const

type FormState = { title: string; description: string; categoryId: string; brandId: string; price: string; condition: 'brand_new' | 'used'; location: string; stock: string; specs: { key: string; value: string }[] }

export function SellerListings() {
  const { user, profile } = useAuth()
  const [listings, setListings] = useState<SellerListing[]>([])
  const [categories, setCategories] = useState<ListingOption[]>([])
  const [brands, setBrands] = useState<ListingOption[]>([])
  const [filter, setFilter] = useState<(typeof statuses)[number]>('all')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState('')
  const [editing, setEditing] = useState<SellerListing | null>(null)
  const [form, setForm] = useState<FormState | null>(null)

  const load = async () => {
    if (!user) return
    setLoading(true); setError('')
    try { setListings(await getSellerListings(user.id)) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load your listings.') }
    finally { setLoading(false) }
  }

  useEffect(() => {
    if (!user || profile?.role !== 'seller') return
    void Promise.all([load(), getListingCategories(), getListingBrands()]).then(([, cats, nextBrands]) => { setCategories(cats); setBrands(nextBrands) }).catch(err => setError(err instanceof Error ? err.message : 'Could not load listing options.'))
  }, [user?.id, profile?.role])

  const visible = useMemo(() => filter === 'all' ? listings : listings.filter(item => item.status === filter), [filter, listings])

  const beginEdit = (listing: SellerListing) => {
    setEditing(listing)
    setForm({ title: listing.title, description: listing.description, categoryId: listing.category_id, brandId: listing.brand_id ?? '', price: String(listing.price), condition: listing.condition, location: listing.location, stock: String(listing.stock), specs: Object.entries(listing.specs ?? {}).map(([key, value]) => ({ key, value })) .concat(Object.keys(listing.specs ?? {}).length ? [] : [{ key: '', value: '' }]) })
    setError('')
  }

  const saveEdit = async (event: FormEvent) => {
    event.preventDefault(); if (!user || !editing || !form) return
    const price = Number(form.price); const stock = Number(form.stock)
    if (form.title.trim().length < 4) return setError('Enter a clear product title.')
    if (form.description.trim().length < 10) return setError('Add a useful product description.')
    if (!form.categoryId) return setError('Select a category.')
    if (!Number.isFinite(price) || price <= 0) return setError('Enter a valid price.')
    if (!Number.isInteger(stock) || stock < 0 || stock > 9999) return setError('Stock must be between 0 and 9,999.')
    setBusy(editing.id); setError('')
    try {
      const specs = Object.fromEntries(form.specs.map(item => [item.key.trim(), item.value.trim()]).filter(([key, value]) => key && value))
      await updateSellerListing(user.id, editing.id, { ...form, price, stock, specs, brandId: form.brandId || null })
      setEditing(null); setForm(null); await load()
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not update listing.') }
    finally { setBusy('') }
  }

  const action = async (listing: SellerListing, next: 'active' | 'sold' | 'archived') => {
    if (!user) return
    setBusy(listing.id); setError('')
    try { await updateSellerListingStatus(user.id, listing.id, next); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not update listing status.') }
    finally { setBusy('') }
  }

  const remove = async (listing: SellerListing) => {
    if (!user || !window.confirm(`Delete “${listing.title}”? This cannot be undone.`)) return
    setBusy(listing.id); setError('')
    try { await deleteSellerListing(user.id, listing); await load() }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not delete listing.') }
    finally { setBusy('') }
  }

  const removePhoto = async (listing: SellerListing, photo: SellerListing['photos'][number]) => {
    if (!user || listing.photos.length <= 1) return setError('A listing must keep at least one photo.')
    setBusy(`${listing.id}:${photo.id}`); setError('')
    try { await removeSellerListingPhoto(user.id, listing.id, photo); await load(); if (editing?.id === listing.id) setEditing(listings.find(item => item.id === listing.id) ?? null) }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not remove photo.') }
    finally { setBusy('') }
  }

  if (profile?.role !== 'seller' || !user) return null

  return <main className="mx-auto max-w-6xl px-5 py-10 lg:px-8">
    <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-end"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Seller</p><h1 className="mt-2 text-4xl font-black tracking-tight">My listings</h1><p className="mt-2 text-sm text-slate-500">Manage the products you have listed on Atomos.</p></div><Link to="/sell" className="rounded-xl bg-blue-600 px-4 py-3 text-center text-sm font-bold text-white hover:bg-blue-700">Create listing</Link></div>
    <div className="mt-6 flex flex-wrap gap-2">{statuses.map(status => <button key={status} onClick={() => setFilter(status)} className={`rounded-full px-4 py-2 text-sm font-bold capitalize ${filter === status ? 'bg-slate-950 text-white' : 'border border-slate-200 text-slate-600 hover:border-slate-400'}`}>{status}</button>)}</div>
    {error && <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">{error}</p>}
    {loading ? <p className="py-20 text-center text-sm font-semibold text-slate-500">Loading your listings…</p> : visible.length === 0 ? <div className="mt-10 rounded-2xl border border-dashed border-slate-300 p-12 text-center"><h2 className="text-xl font-black">No listings here</h2><p className="mt-2 text-sm text-slate-500">Create your first listing or switch the status filter.</p></div> : <div className="mt-8 space-y-4">{visible.map(listing => <article key={listing.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5"><div className="flex flex-col gap-5 md:flex-row"><div className="grid w-full grid-cols-4 gap-2 md:w-52 md:flex-shrink-0">{listing.photos.slice(0, 4).map(photo => <img key={photo.id} src={photo.url} alt="" className="aspect-square w-full rounded-xl bg-slate-100 object-cover" />)}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-xl font-black text-slate-950">{listing.title}</h2><p className="mt-1 text-sm text-slate-500">{listing.brand_name} · {listing.category_name} · {listing.condition === 'brand_new' ? 'Brand New' : 'Used'}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold capitalize text-slate-700">{listing.status}</span></div><div className="mt-4 grid gap-3 sm:grid-cols-3"><div><p className="text-xs font-bold uppercase text-slate-400">Price</p><p className="mt-1 font-black">{formatNaira(Number(listing.price))}</p></div><div><p className="text-xs font-bold uppercase text-slate-400">Stock</p><p className="mt-1 font-black">{listing.stock}</p></div><div><p className="text-xs font-bold uppercase text-slate-400">Location</p><p className="mt-1 font-black">{listing.location}</p></div></div><div className="mt-5 flex flex-wrap gap-2"><button disabled={busy === listing.id} onClick={() => beginEdit(listing)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold hover:border-blue-500"><Edit3 size={15}/> Edit</button><Link to={`/products/${listing.id}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><ExternalLink size={15}/> View</Link>{listing.status === 'active' && <button disabled={busy === listing.id} onClick={() => void action(listing, 'sold')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><Check size={15}/> Mark sold</button>}{listing.status !== 'archived' && <button disabled={busy === listing.id} onClick={() => void action(listing, 'archived')} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><Archive size={15}/> Archive</button>}<button disabled={busy === listing.id} onClick={() => void remove(listing)} className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-sm font-bold text-red-600"><Trash2 size={15}/> Delete</button></div></div></div></article>)}</div>}

    {editing && form && <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/50 p-4"><div className="mx-auto my-8 max-w-4xl rounded-3xl bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-blue-600">Edit listing</p><h2 className="mt-1 text-2xl font-black">{editing.title}</h2></div><button onClick={() => { setEditing(null); setForm(null) }} className="rounded-full border border-slate-200 p-2"><X size={18}/></button></div><form onSubmit={saveEdit} className="mt-6 space-y-5"><div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2 text-sm font-bold">Title<input value={form.title} onChange={e => setForm({...form, title:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"/></label><label className="text-sm font-bold">Category<select value={form.categoryId} onChange={e => setForm({...form, categoryId:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3">{categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="text-sm font-bold">Brand<select value={form.brandId} onChange={e => setForm({...form, brandId:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="">Other / not listed</option>{brands.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label><label className="text-sm font-bold">Condition<select value={form.condition} onChange={e => setForm({...form, condition:e.target.value as FormState['condition']})} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3"><option value="brand_new">Brand New</option><option value="used">Used</option></select></label><label className="text-sm font-bold">Price<input type="number" min="1" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"/></label><label className="text-sm font-bold">Stock<input type="number" min="0" max="9999" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"/></label><label className="text-sm font-bold">Location<input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"/></label><label className="sm:col-span-2 text-sm font-bold">Description<textarea rows={5} value={form.description} onChange={e=>setForm({...form,description:e.target.value})} className="mt-2 w-full rounded-xl border border-slate-300 px-4 py-3"/></label></div>
    <div><div className="flex items-center justify-between"><h3 className="font-black">Photos</h3><label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold"><ImagePlus size={15}/> Add photos<input type="file" multiple accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={async e=>{if(!user)return;const files=Array.from(e.target.files??[]).filter(f=>f.type.startsWith('image/'));if(editing.photos.length+files.length>MAX_PHOTOS)return setError(`A listing can have up to ${MAX_PHOTOS} photos.`);setBusy(editing.id);try{await addSellerListingPhotos(user.id,editing.id,files);await load();const refreshed=(await getSellerListings(user.id)).find(x=>x.id===editing.id);if(refreshed)setEditing(refreshed)}catch(err){setError(err instanceof Error?err.message:'Could not add photos.')}finally{setBusy('')}}}/></label></div><div className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-5">{editing.photos.map((photo,index)=><div key={photo.id} className="relative overflow-hidden rounded-xl border border-slate-200"><img src={photo.url} alt="" className="aspect-square w-full object-cover"/><button type="button" disabled={editing.photos.length<=1||busy===`${editing.id}:${photo.id}`} onClick={()=>void removePhoto(editing,photo)} className="absolute right-2 top-2 rounded-full bg-white p-1.5 shadow disabled:opacity-40"><Trash2 size={14}/></button>{index===0&&<span className="absolute bottom-2 left-2 rounded bg-slate-950 px-2 py-1 text-[10px] font-bold text-white">Main</span>}</div>)}</div></div>
    <div><h3 className="font-black">Specifications</h3><div className="mt-3 space-y-2">{form.specs.map((spec,index)=><div key={index} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]"><input value={spec.key} onChange={e=>setForm({...form,specs:form.specs.map((s,i)=>i===index?{...s,key:e.target.value}:s)})} placeholder="Specification" className="rounded-xl border border-slate-300 px-3 py-2.5"/><input value={spec.value} onChange={e=>setForm({...form,specs:form.specs.map((s,i)=>i===index?{...s,value:e.target.value}:s)})} placeholder="Value" className="rounded-xl border border-slate-300 px-3 py-2.5"/><button type="button" onClick={()=>setForm({...form,specs:form.specs.length===1?[{key:'',value:''}]:form.specs.filter((_,i)=>i!==index)})} className="rounded-xl border border-slate-200 px-3 text-sm font-bold">Remove</button></div>)}<button type="button" onClick={()=>setForm({...form,specs:[...form.specs,{key:'',value:''}]})} className="text-sm font-bold text-blue-600">Add field</button></div></div>
    <div className="flex justify-end gap-3"><button type="button" onClick={()=>{setEditing(null);setForm(null)}} className="rounded-xl border border-slate-300 px-4 py-3 text-sm font-bold">Cancel</button><button disabled={busy===editing.id} className="rounded-xl bg-blue-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy===editing.id?'Saving…':'Save changes'}</button></div></form></div></div>}
  </main>
}
