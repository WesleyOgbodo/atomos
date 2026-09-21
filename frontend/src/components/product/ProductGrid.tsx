import type { Product } from '@/types/product'
import { InfiniteProductGrid } from '@/components/product/InfiniteProductGrid'

export function ProductGrid({
  products,
  hasMore,
  loadingMore,
  onLoadMore,
}: {
  products: Product[]
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}) {
  return (
    <InfiniteProductGrid
      products={products}
      hasServerMore={hasMore}
      loadingMore={loadingMore}
      onLoadMore={onLoadMore}
    />
  )
}
