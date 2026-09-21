import { useState } from 'react'
import type { Product } from '@/types/product'

export function ProductImage({ product, className = '', detail = false }: { product: Product; className?: string; detail?: boolean }) {
  const [failed, setFailed] = useState(false)

  if (failed) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center ${className}`}
        style={{ backgroundColor: product.bgColor ?? '#eef2f7' }}
      >
        <div className="px-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/90 text-lg font-black text-blue-600 shadow-sm">
            {product.name.charAt(0)}
          </div>
          <p className="max-w-[180px] text-sm font-bold text-slate-800">{product.name}</p>
          <p className="mt-1 text-[11px] text-slate-500">Photo unavailable</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative h-full w-full">
      <img
        src={product.imageUrl}
        alt={product.name}
        loading={detail ? 'eager' : 'lazy'}
        onError={() => setFailed(true)}
        className={`h-full w-full object-cover ${className}`}
      />
      {product.photoType === 'seller' && (
        <span className="absolute bottom-3 left-3 rounded-full bg-slate-950/85 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white">
          Actual item photo
        </span>
      )}
    </div>
  )
}

export default ProductImage
