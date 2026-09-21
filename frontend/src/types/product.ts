export type ProductCategory = 'Phones' | 'Laptops' | 'Audio' | 'Accessories' | 'Fashion' | 'Shoes' | 'Other'
export type ProductCondition = 'Brand New' | 'Used'
export type ProductBrand = 'Apple' | 'Samsung' | 'Xiaomi' | 'Infinix' | 'Oppo' | 'Other'

export interface Product {
  id: string
  name: string
  category: ProductCategory
  brand: ProductBrand
  condition: ProductCondition
  price: number
  rating: number
  reviewsCount: number
  imageUrl: string
  imageUrls?: string[]
  photoType?: 'seller' | 'catalog'
  location: string
  badge?: string
  bgColor?: string
  description: string
  sizes: string[]
  colors: string[]
  stock: number
  isNew: boolean
  isBestSeller: boolean
  viewCount?: number
}
