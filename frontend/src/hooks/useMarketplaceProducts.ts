import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Product, ProductBrand, ProductCategory, ProductCondition } from '@/types/product'
import { searchMarketplace } from '@/services/marketplace'

type Filters = {
  search?: string
  category?: ProductCategory | 'All'
  brand?: ProductBrand | 'All'
  condition?: ProductCondition | 'All'
  minPrice?: number
  maxPrice?: number
  location?: string
  sort?: 'newest' | 'oldest' | 'price-low' | 'price-high' | 'views'
}

const PAGE_SIZE = 32

export function useMarketplaceProducts(filters: Filters) {
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const requestId = useRef(0)

  const key = useMemo(() => JSON.stringify(filters), [filters])

  const load = useCallback(async (append: boolean) => {
    const id = ++requestId.current
    append ? setLoadingMore(true) : setLoading(true)
    setError(null)

    try {
      const offset = append ? products.length : 0
      const result = await searchMarketplace({ ...filters, limit: PAGE_SIZE, offset })
      if (id !== requestId.current) return
      setTotal(result.total)
      setProducts(current => append ? [...current, ...result.products] : result.products)
    } catch (err) {
      if (id !== requestId.current) return
      setError(err instanceof Error ? err.message : 'Could not load listings.')
      if (!append) setProducts([])
    } finally {
      if (id === requestId.current) {
        setLoading(false)
        setLoadingMore(false)
      }
    }
  }, [filters, products.length])

  useEffect(() => {
    setProducts([])
    setTotal(0)
    void load(false)
    // `key` intentionally controls a fresh request whenever filters change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  const hasMore = products.length < total
  const loadMore = useCallback(() => {
    if (!loading && !loadingMore && hasMore) void load(true)
  }, [hasMore, load, loading, loadingMore])

  return { products, total, loading, loadingMore, error, hasMore, loadMore }
}
