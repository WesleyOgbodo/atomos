import type { Product, ProductBrand, ProductCategory } from '@/types/product'

type LiveListingSeed = Omit<
  Product,
  'id' | 'rating' | 'reviewsCount' | 'sizes' | 'colors' | 'stock' | 'isNew' | 'isBestSeller' | 'photoType'
>

  // This file intentionally contains ONLY verified live listings; no estimated prices or generated variants.
const liveListings: LiveListingSeed[] = [
  {
    name: 'Apple iPhone 14 Pro Max 256 GB Purple', category: 'Phones', brand: 'Apple', condition: 'Used',
    price: 600000, location: 'Enugu, Enugu State',
    imageUrl: 'https://pictures-nigeria.jijistatic.net/206471307_NjIwLTc0LTY5YjRkMzhhZDE.webp',
    description: 'Used iPhone 14 Pro Max 256GB in Purple. Listing states no cracks, 256GB storage, 6GB RAM, 5G, 6.7-inch OLED display, A16 Bionic, dual Nano-SIM, 4323mAh battery, Face ID and 91% battery health. Seller describes it as neat as new.',
    sizes: [], colors: ['Purple'],
  },
  {
    name: 'Samsung Galaxy S23 Ultra 256 GB Black', category: 'Phones', brand: 'Samsung', condition: 'Brand New',
    price: 730000, location: 'Enugu, Enugu State',
    imageUrl: 'https://pictures-nigeria.jijistatic.net/198911969_NjIwLTgyNy1iMzMxMTIxOWY2.webp',
    description: 'Brand-new Samsung Galaxy S23 Ultra 256GB Black. Listing states 256GB storage, 6.8-inch AMOLED display, 1440×3088 resolution, 5000mAh battery, quad 200MP/10MP/10MP/12MP rear cameras, 12MP front camera, Android, IP68 and USB-C 3.2.',
    sizes: [], colors: ['Black'],
  },
  {
    name: 'Apple iPhone 15 128 GB Black', category: 'Phones', brand: 'Apple', condition: 'Used',
    price: 625000, location: 'Enugu, Enugu State',
    imageUrl: 'https://pictures-nigeria.jijistatic.net/199642088_NjIwLTgyNy1kOWI0YTU3YTZmLTE.webp',
    description: 'Used Apple iPhone 15 128GB Black. Listing states no cracks, 128GB storage, 6GB RAM, 6.1-inch OLED display, 1179×2556 resolution, Nano-SIM and eSIM, iOS, 3349mAh battery and USB-C. Seller states 91% battery health and physical SIM plus eSIM.',
    sizes: [], colors: ['Black'],
  },
  {
    name: 'Apple iPhone 14 Pro 128 GB Purple', category: 'Phones', brand: 'Apple', condition: 'Used',
    price: 630000, location: 'Enugu, Enugu State',
    imageUrl: 'https://pictures-nigeria.jijistatic.net/199641682_NjIwLTgyNy01OTcwZjhlZjdkLTE.webp',
    description: 'Used Apple iPhone 14 Pro 128GB Purple. Listing states no cracks, 128GB storage, 6GB RAM, 6.1-inch OLED display, 1179×2556 resolution, A16 Bionic, dual Nano-SIM, 3200mAh battery and Face ID. Seller states Face ID and True Tone work and battery health is 84%.',
    sizes: [], colors: ['Purple'],
  },
  {
    name: 'Apple iPhone 14 Pro 128 GB Black', category: 'Phones', brand: 'Apple', condition: 'Used',
    price: 625000, location: 'Enugu, Enugu State',
    imageUrl: 'https://pictures-nigeria.jijistatic.net/206011791_NjIwLTEwNDQtNDAzNWUwM2MzNg.webp',
    description: 'Used Apple iPhone 14 Pro 128GB Black. Listing states no cracks, 128GB storage, 6GB RAM, 5G, 6.1-inch OLED display, A16 Bionic, dual Nano-SIM/eSIM and 3200mAh battery. Seller states the phone is mint, physical SIM, with 90% battery health.',
    sizes: [], colors: ['Black'],
  },
  {
    name: 'Apple iPhone 13 Pro 256 GB White', category: 'Phones', brand: 'Apple', condition: 'Used',
    price: 420000, location: 'Enugu, Enugu State',
    imageUrl: 'https://pictures-nigeria.jijistatic.net/206638004_NjIwLTcxOC1lOThkYjcxYmE0.webp',
    description: 'Used Apple iPhone 13 Pro 256GB White. Listing states no cracks, 256GB storage, 6GB RAM, 5G, 6.1-inch OLED display, A15 Bionic, single Nano/eSIM and 3095mAh battery. Seller states 74% battery health and that everything is active.',
    sizes: [], colors: ['White'],
  },
  {
    name: 'Apple iPhone 13 256 GB Pink', category: 'Phones', brand: 'Apple', condition: 'Used',
    price: 400000, location: 'Enugu, Enugu State',
    imageUrl: 'https://pictures-nigeria.jijistatic.net/205681700_NjIwLTgyNy1hMzcwODkxMDk5.webp',
    description: 'Used Apple iPhone 13 256GB Pink. Listing states no cracks, 256GB storage, 4GB RAM, 5G, 6.1-inch OLED display, A15 Bionic, Nano/eSIM and 3240mAh battery. Seller states 82% battery health.',
    sizes: [], colors: ['Pink'],
  },
  {
    name: 'Apple iPhone 12 Pro Max 256 GB White', category: 'Phones', brand: 'Apple', condition: 'Used',
    price: 400000, location: 'Enugu, Enugu State',
    imageUrl: 'https://pictures-nigeria.jijistatic.net/205886995_NjIwLTEzNDItYjBlMmViMDhkNg.webp',
    description: 'Used Apple iPhone 12 Pro Max 256GB White. Listing states no cracks, 256GB storage, 6GB RAM, 5G, 6.7-inch OLED display, A14 Bionic, single Nano-SIM and 3687mAh battery. Seller states battery health is 62%.',
    sizes: [], colors: ['White'],
  },
  {
    name: 'Apple iPhone XR 64 GB Black', category: 'Phones', brand: 'Apple', condition: 'Used',
    price: 145000, location: 'Enugu, Enugu State',
    imageUrl: 'https://pictures-nigeria.jijistatic.net/206437262_NjIwLTExMDItN2UxYjYyOTg2MQ.webp',
    description: 'Used Apple iPhone XR 64GB Black. Listing states no cracks, 64GB storage, 3GB RAM, 4G, 6.1-inch Retina IPS LCD, A12 Bionic, single Nano-SIM and 2942mAh battery. Seller says it is perfectly working and mentions Emene, Enugu in the listing.',
    sizes: [], colors: ['Black'],
  },
  {
    name: 'Samsung Galaxy S10 Plus 128 GB Black', category: 'Phones', brand: 'Samsung', condition: 'Used',
    price: 240000, location: 'Enugu, Enugu State',
    imageUrl: 'https://pictures-nigeria.jijistatic.net/205169788_NjIwLTgyNy05NjFhY2E1Mjdl.webp',
    description: 'Used Samsung Galaxy S10 Plus 128GB Black. Listing states no cracks, 128GB storage, microSD support up to 512GB, triple 12MP/12MP/16MP rear cameras, dual 10MP/8MP front cameras, 6.4-inch display, Android and 4100mAh battery.',
    sizes: [], colors: ['Black'],
  },
  {
    name: 'Apple MacBook Air 2015 8GB Core i7 256GB SSD', category: 'Laptops', brand: 'Apple', condition: 'Used',
    price: 380000, location: 'Enugu, Enugu State',
    imageUrl: 'https://pictures-nigeria.jijistatic.net/162676079_NjIwLTExMDItMGZlODg3ZTJhNA.webp',
    description: 'Used Apple MacBook Air 2015. Listing states 8GB RAM, Intel Core i7 processor, 256GB SSD, 13/13.3-inch display, Mac OS and Silver colour. Seller describes it as super clean and says an original charger is included.',
    sizes: [], colors: ['Silver'],
  },
  {
    name: 'Apple MacBook Pro 2018 16GB Core i5 512GB SSD', category: 'Laptops', brand: 'Apple', condition: 'Used',
    price: 850000, location: 'Enugu, Enugu State',
    imageUrl: 'https://pictures-nigeria.jijistatic.net/162676710_NjIwLTExMDItYzUyMGFjMGM3NA.webp',
    description: 'Used Apple MacBook Pro 2018. Listing states 16GB RAM, Intel Core i5 processor, 512GB SSD, 13/13.3-inch display, Mac OS and Gray colour. Seller mentions a Touch Bar, original charger and a super-clean condition.',
    sizes: [], colors: ['Gray'],
  },
  {
    name: 'Apple MacBook Pro 2020 M1 8GB 256GB SSD', category: 'Laptops', brand: 'Apple', condition: 'Used',
    price: 950000, location: 'Enugu, Enugu State',
    imageUrl: 'https://pictures-nigeria.jijistatic.net/198946498_NjIwLTgyNy05YjQwM2EyNGRh.webp',
    description: 'Used Apple MacBook Pro 2020 with M1. Listing states 8GB RAM, Apple M1 processor, 256GB SSD, 13/13.3-inch display, Mac OS and Silver colour. Seller describes it as neatly foreign used and says warranty is included.',
    sizes: [], colors: ['Silver'],
  },
]

export const products: Product[] = liveListings.map((listing, index) => ({
  ...listing,
  id: `live-${index + 1}`,
  rating: 0,
  reviewsCount: 0,
  photoType: 'catalog',
  stock: 1,
  isNew: listing.condition === 'Brand New',
  isBestSeller: false,
}))

export const liveListingCount = products.length
