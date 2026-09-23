import { Heart, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import type { Product } from '@/types/product'
import ProductImage from '@/components/product/ProductImage'
import { formatNaira } from '@/lib/format'

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="group relative">
      <Link to={`/products/${product.id}`} className="block">
        <div className="overflow-hidden rounded-2xl bg-slate-100">
          <ProductImage
            product={product}
            className="aspect-square w-full transition duration-300 group-hover:scale-[1.02]"
          />
        </div>
      </Link>

      <button
        type="button"
        aria-label={`Add ${product.name} to wishlist`}
        onClick={event => {
          event.preventDefault()
          event.stopPropagation()
        }}
        className="absolute right-3 top-3 rounded-full bg-white/95 p-2 shadow-sm transition hover:text-blue-600"
      >
        <Heart size={16} />
      </button>

      <div className="pt-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-950">{product.name}</h3>
            <p className="text-sm text-slate-500">
              {product.brand} · {product.category}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              {product.location}
            </p>
          </div>

          <p className="whitespace-nowrap font-bold text-slate-950">
            {formatNaira(product.price)}
          </p>
        </div>

        <div className="mt-2 flex items-center gap-1 text-xs text-slate-600">
          <Star size={13} fill="currentColor" />
          <span>{product.rating}</span>
          <span>({product.reviewsCount})</span>
        </div>
      </div>
    </article>
  )
}

export default ProductCard
