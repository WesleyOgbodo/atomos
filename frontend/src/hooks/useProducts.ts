import { useEffect, useState } from 'react'
import type { Product } from '@/types/product'
import { getProductById, getProducts } from '@/services/products'

export function useProducts() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    getProducts()
      .then(items => {
        if (!cancelled) setProducts(items)
      })
      .catch(err => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load products.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  return { products, loading, error }
}

export function useProduct(productId: string | undefined) {
  const [product, setProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    if (!productId) {
      setProduct(null)
      setLoading(false)
      return
    }

    setLoading(true)
    getProductById(productId)
      .then(item => {
        if (!cancelled) setProduct(item)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [productId])

  return { product, loading }
}
