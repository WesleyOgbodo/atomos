import { useEffect, useRef } from 'react'
import type { Product } from '@/types/product'
import { useInfiniteList } from '@/hooks/useInfiniteList'
import { ProductCard } from '@/components/product/ProductCard'

export function InfiniteProductGrid({
  products,
  pageSize = 32,
  hasServerMore = false,
  loadingMore = false,
  onLoadMore,
}: {
  products: Product[]
  pageSize?: number
  hasServerMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}) {
  const { visibleItems, hasMore: hasLocalMore, sentinelRef } = useInfiniteList(products, pageSize)
  const serverSentinelRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const node = serverSentinelRef.current
    if (!node || !hasServerMore || loadingMore || !onLoadMore) return
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0]?.isIntersecting) onLoadMore()
      },
      { rootMargin: '1000px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasServerMore, loadingMore, onLoadMore])

  if (!products.length) {
    return <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center text-slate-500">No products found.</div>
  }

  const showServerEnd = !hasServerMore && !loadingMore
  return (
    <>
      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-6">
        {visibleItems.map(product => <ProductCard key={product.id} product={product} />)}
      </div>
      {hasLocalMore ? (
        <div ref={sentinelRef} className="flex min-h-20 items-center justify-center py-6">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500" aria-live="polite">
            <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" /> Loading more listings…
          </div>
        </div>
      ) : (
        <div ref={serverSentinelRef} className="flex min-h-20 items-center justify-center py-6">
          {loadingMore ? (
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500" aria-live="polite">
              <span className="h-2 w-2 animate-pulse rounded-full bg-blue-600" /> Loading more listings…
            </div>
          ) : showServerEnd ? (
            <p className="text-xs font-semibold text-slate-400">You’ve reached the end of this catalogue.</p>
          ) : null}
        </div>
      )}
    </>
  )
}
