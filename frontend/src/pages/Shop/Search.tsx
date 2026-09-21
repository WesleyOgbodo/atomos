import { useEffect, useMemo, useState } from 'react'
import { Search as SearchIcon, SlidersHorizontal } from 'lucide-react'
import { ProductGrid } from '@/components/product/ProductGrid'
import { useMarketplaceProducts } from '@/hooks/useMarketplaceProducts'
import type { ProductBrand, ProductCategory, ProductCondition } from '@/types/product'

export function Search() {
  const [query, setQuery] = useState('')
  const [condition, setCondition] = useState<ProductCondition | 'All'>('All')
  const [brand, setBrand] = useState<ProductBrand | 'All'>('All')
  const [category, setCategory] = useState<ProductCategory | 'All'>('All')
  const [sort, setSort] = useState<'newest' | 'oldest' | 'price-low' | 'price-high' | 'views'>('newest')
  const [debouncedQuery, setDebouncedQuery] = useState('')

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedQuery(query), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  const filters = useMemo(() => ({
    search: debouncedQuery,
    condition,
    brand,
    category,
    sort,
  }), [debouncedQuery, condition, brand, category, sort])

  const { products, total, loading, loadingMore, error, hasMore, loadMore } = useMarketplaceProducts(filters)

  return (
    <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">
      <div className="max-w-3xl">
        <p className="text-xs font-bold uppercase tracking-widest text-blue-600">Find your next item</p>
        <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">Search Atomos</h1>
        <p className="mt-2 text-sm text-slate-500">Search active seller listings by product, brand, category, description or location.</p>
      </div>

      <div className="relative mt-7 max-w-3xl">
        <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
        <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Try iPhone, Samsung, shoes, Enugu..." className="w-full rounded-2xl border border-slate-200 bg-white px-12 py-4 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-50" />
      </div>

      <div className="mt-5 flex items-center gap-2 text-sm font-black text-slate-900"><SlidersHorizontal size={16} className="text-blue-600" /> Filters</div>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select value={condition} onChange={e => setCondition(e.target.value as ProductCondition | 'All')} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold"><option value="All">All conditions</option><option>Brand New</option><option>Used</option></select>
        <select value={brand} onChange={e => setBrand(e.target.value as ProductBrand | 'All')} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold"><option value="All">All brands</option><option>Apple</option><option>Samsung</option><option>Xiaomi</option><option>Infinix</option><option>Oppo</option><option>Other</option></select>
        <select value={category} onChange={e => setCategory(e.target.value as ProductCategory | 'All')} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold"><option value="All">All categories</option><option>Phones</option><option>Laptops</option><option>Audio</option><option>Accessories</option><option>Fashion</option><option>Shoes</option><option>Other</option></select>
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)} className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold"><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option><option value="views">Most viewed</option></select>
      </div>

      <div className="my-8 text-sm font-semibold text-slate-500">
        {loading ? 'Loading listings…' : `${total} result${total === 1 ? '' : 's'}`}
      </div>
      {error && <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">Could not load live listings. Check that the Section 2.3 discovery SQL has been run in Supabase.</div>}
      <ProductGrid products={products} hasMore={hasMore} loadingMore={loadingMore} onLoadMore={loadMore} />
    </main>
  )
}
