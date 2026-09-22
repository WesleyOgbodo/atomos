import { useMemo, useState } from 'react'
import { Filter } from 'lucide-react'
import { ProductGrid } from '@/components/product/ProductGrid'
import { useMarketplaceProducts } from '@/hooks/useMarketplaceProducts'
import type { ProductBrand, ProductCategory, ProductCondition } from '@/types/product'

export function Listing({ category }: { category?: ProductCategory }) {
  const [condition, setCondition] = useState<ProductCondition | 'All'>('All')
  const [brand, setBrand] = useState<ProductBrand | 'All'>('All')
  const [minPrice, setMinPrice] = useState('any')
  const [maxPrice, setMaxPrice] = useState('any')
  const [location, setLocation] = useState('')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'price-low' | 'price-high' | 'views'>('newest')

  const filters = useMemo(() => ({
  category: category ?? ('All' as const),
    condition,
    brand,
    minPrice: minPrice === 'any' ? undefined : Number(minPrice),
    maxPrice: maxPrice === 'any' ? undefined : Number(maxPrice),
    location,
    sort,
  }), [category, condition, brand, minPrice, maxPrice, location, sort])

  const { products, total, loading, loadingMore, error, hasMore, loadMore } = useMarketplaceProducts(filters)
  const title = category ?? 'All products'

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="mb-8">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Shop Atomos</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-500">Browse active seller listings with live price, condition, location and seller-uploaded photos.</p>
      </div>

      <div className="mb-8 rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-4 flex items-center gap-2 text-sm font-black text-slate-900"><Filter size={17} className="text-blue-600" /> Filters</div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="text-xs font-bold text-slate-600">Condition<select value={condition} onChange={e => setCondition(e.target.value as ProductCondition | 'All')} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold"><option>All</option><option>Brand New</option><option>Used</option></select></label>
          <label className="text-xs font-bold text-slate-600">Brand<select value={brand} onChange={e => setBrand(e.target.value as ProductBrand | 'All')} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold"><option>All</option><option>Apple</option><option>Samsung</option><option>Xiaomi</option><option>Infinix</option><option>Oppo</option><option>Other</option></select></label>
          <label className="text-xs font-bold text-slate-600">Min price<select value={minPrice} onChange={e => setMinPrice(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold"><option value="any">Any</option><option value="50000">₦50,000</option><option value="100000">₦100,000</option><option value="300000">₦300,000</option><option value="500000">₦500,000</option></select></label>
          <label className="text-xs font-bold text-slate-600">Max price<select value={maxPrice} onChange={e => setMaxPrice(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold"><option value="any">Any</option><option value="100000">₦100,000</option><option value="300000">₦300,000</option><option value="500000">₦500,000</option><option value="1000000">₦1,000,000</option><option value="1500000">₦1,500,000</option></select></label>
          <label className="text-xs font-bold text-slate-600">Location<input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Enugu" className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold outline-none focus:border-blue-500" /></label>
          <label className="text-xs font-bold text-slate-600">Sort<select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="views">Most viewed</option></select></label>
        </div>
      </div>

      <div className="mb-5 text-sm font-semibold text-slate-500">{loading ? 'Loading listings…' : `${total} product${total === 1 ? '' : 's'}`}</div>
      {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">Could not load live listings. Check that the Section 2.3 discovery SQL has been run in Supabase.</div>}
      <ProductGrid products={products} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore} />
    </main>
  )
}
