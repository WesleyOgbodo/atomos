import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Heart, Minus, Plus, Star, Camera } from 'lucide-react'
import { useProduct } from '@/hooks/useProducts'
import { formatNaira } from '@/lib/format'
import { addToCart } from '@/services/cart'
import { useAuth } from '@/contexts/AuthContext'
import { ProductImage } from '@/components/product/ProductImage'
import { incrementListingView } from '@/services/marketplace'

export function ProductDetails() {
  const { productId } = useParams()
  const { product, loading } = useProduct(productId)
  const { user } = useAuth()
  const [qty, setQty] = useState(1)
  const [added, setAdded] = useState(false)
  const [selectedImage, setSelectedImage] = useState(0)
  const [cartError, setCartError] = useState('')
  const [addingToCart, setAddingToCart] = useState(false)

  useEffect(() => {
    if (product?.photoType !== 'seller' || !productId) return
    void incrementListingView(productId)
  }, [product?.photoType, productId])

  if (loading) {
    return <main className="mx-auto max-w-7xl px-5 py-24 text-center text-sm font-semibold text-slate-500">Loading listing…</main>
  }

  if (!product) {
    return (
      <main className="mx-auto max-w-7xl px-5 py-24 text-center">
        <h1 className="text-3xl font-black">Product not found</h1>
        <Link
          className="mt-4 inline-block text-blue-600 underline"
          to="/featured"
        >
          Back to shop
        </Link>
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-7xl px-5 py-12 lg:px-8">
      <div className="grid gap-10 lg:grid-cols-2">
        <div>
          <div
            className="overflow-hidden rounded-3xl border border-slate-200"
            style={{ background: product.bgColor }}
          >
            {product.imageUrls?.[selectedImage] ? (
              <img
                src={product.imageUrls[selectedImage]}
                alt={`${product.name} photo ${selectedImage + 1}`}
                className="aspect-square w-full object-cover"
              />
            ) : (
              <ProductImage product={product} detail className="aspect-square" />
            )}
          </div>

          {(product.imageUrls?.length ?? 0) > 1 && (
            <div className="mt-3 grid grid-cols-4 gap-3 sm:grid-cols-5">
              {product.imageUrls?.map((image, index) => (
                <button
                  key={`${image}-${index}`}
                  type="button"
                  onClick={() => setSelectedImage(index)}
                  className={`overflow-hidden rounded-xl border-2 ${selectedImage === index ? 'border-blue-600' : 'border-slate-200'}`}
                  aria-label={`View product photo ${index + 1}`}
                >
                  <img
                    src={image}
                    alt=""
                    className="aspect-square w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="py-2">
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
              {product.brand}
            </span>
            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">
              {product.condition}
            </span>
          </div>

          <p className="mt-5 text-sm font-bold uppercase tracking-widest text-blue-600">
            {product.category}
          </p>
          <p className="mt-2 text-sm font-semibold text-slate-500">
            Seller location: {product.location}
          </p>

          {product.photoType === 'seller' && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
              <Camera size={14} />
              Actual item photo supplied by seller
            </div>
          )}

          <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
            {product.name}
          </h1>

          <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
            <Star size={16} fill="currentColor" />
            {product.rating} · {product.reviewsCount} reviews
          </div>

          <p className="mt-6 text-2xl font-black text-slate-950">
            {formatNaira(product.price)}
          </p>

          <p className="mt-5 leading-7 text-slate-600">
            {product.description}
          </p>

          {product.sizes.length > 0 && (
            <div className="mt-8">
              <p className="mb-3 text-sm font-bold">Size</p>
              <div className="flex flex-wrap gap-2">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:border-blue-500"
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          {product.colors.length > 0 && (
            <div className="mt-7">
              <p className="mb-3 text-sm font-bold">Colour</p>
              <div className="flex flex-wrap gap-2">
                {product.colors.map((color) => (
                  <button
                    key={color}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold hover:border-blue-500"
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <div className="flex items-center rounded-xl border border-slate-200">
              <button
                onClick={() => setQty((current) => Math.max(1, current - 1))}
                className="p-3"
                aria-label="Decrease quantity"
              >
                <Minus size={16} />
              </button>
              <span className="w-8 text-center text-sm font-bold">{qty}</span>
              <button
                onClick={() => setQty((current) => Math.min(99, current + 1))}
                className="p-3"
                aria-label="Increase quantity"
              >
                <Plus size={16} />
              </button>
            </div>

            <Link
              to={`/products/${product.id}/chat`}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 px-5 py-3.5 font-bold text-slate-800 hover:border-blue-500 hover:text-blue-600"
            >
              Chat seller
            </Link>

            <button
              disabled={addingToCart}
              onClick={async () => {
                if (!user) return

                setAddingToCart(true)
                setCartError('')

                try {
                  await addToCart(product.id, qty)
                  setAdded(true)
                } catch (error) {
                  setCartError(
                    error instanceof Error
                      ? error.message
                      : 'Could not add this item to your cart.',
                  )
                } finally {
                  setAddingToCart(false)
                }
              }}
              className="flex-1 rounded-xl bg-blue-600 px-6 py-3.5 font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {!user
                ? 'Sign in to add'
                : addingToCart
                  ? 'Adding…'
                  : added
                    ? 'Added to cart'
                    : 'Add to cart'}
            </button>

            <button
              aria-label="Add to wishlist"
              className="rounded-xl border border-slate-200 p-3 hover:text-blue-600"
            >
              <Heart size={19} />
            </button>
          </div>

          {cartError && <p className="mt-4 text-sm font-semibold text-red-600">{cartError}</p>}

          {added && (
            <Link
              to="/cart"
              className="mt-4 inline-block text-sm font-bold text-blue-600 underline"
            >
              View cart
            </Link>
          )}

          <p className="mt-6 text-sm text-slate-500">
            {product.stock} available · {product.condition} · Pickup is free;
            delivery is available for ₦2,000 at checkout.
          </p>
        </div>
      </div>
    </main>
  )
}
