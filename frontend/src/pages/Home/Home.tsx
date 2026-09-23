import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Smartphone,
  Laptop,
  Headphones,
  Shirt,
} from 'lucide-react'
import { Hero } from '@/components/layout/Hero'
import { ProductGrid } from '@/components/product/ProductGrid'
import { useProducts } from '@/hooks/useProducts'

const categories = [
  {
    label: 'Phones',
    path: '/phones',
    icon: Smartphone,
    text: 'Apple, Samsung, Xiaomi, Infinix & OPPO',
  },
  {
    label: 'Laptops',
    path: '/laptops',
    icon: Laptop,
    text: 'Study, work & everyday machines',
  },
  {
    label: 'Audio',
    path: '/audio',
    icon: Headphones,
    text: 'Earbuds, headphones & more',
  },
  {
    label: 'Fashion',
    path: '/fashion',
    icon: Shirt,
    text: 'Clothes, shoes & everyday style',
  },
]

export function Home() {
  const { products, loading } = useProducts()

  const newArrivals = products.slice(0, 4)

  const best = [...products]
    .sort((a, b) => (b.viewCount ?? 0) - (a.viewCount ?? 0))
    .slice(0, 4)

  return (
    <main>
      <Hero />

      <section className="border-b border-slate-100 bg-slate-50">
        <div className="mx-auto flex max-w-7xl items-start gap-3 px-5 py-4 text-xs leading-5 text-slate-600 lg:px-8">
          <div className="mt-0.5 rounded-lg bg-white p-2 text-blue-600 shadow-sm">
            ✓
          </div>

          <p>
            <span className="font-black text-slate-900">
              Live listings matter.
            </span>{' '}
            Atomos uses seller-uploaded photos of the actual item,
            especially for used devices.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
        <div className="mb-7 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Browse
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-950">
              Shop by category
            </h2>
          </div>

          <Link
            to="/search"
            className="hidden items-center gap-1 text-sm font-bold text-blue-600 sm:flex"
          >
            Search all
            <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map(
            ({ label, path, icon: Icon, text }) => (
              <Link
                key={path}
                to={path}
                className="group rounded-2xl border border-slate-200 bg-white p-5 transition hover:-translate-y-1 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-100/50"
              >
                <Icon className="text-blue-600" size={24} />

                <h3 className="mt-8 font-black text-slate-950">
                  {label}
                </h3>

                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {text}
                </p>

                <ArrowRight
                  className="mt-4 text-slate-300 transition group-hover:translate-x-1 group-hover:text-blue-600"
                  size={17}
                />
              </Link>
            ),
          )}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-14 lg:px-8">
        <div className="mb-7 flex items-end justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-blue-600">
              Fresh stock
            </p>

            <h2 className="mt-2 text-3xl font-black text-slate-950">
              New arrivals
            </h2>
          </div>

          <Link
            to="/featured"
            className="text-sm font-bold text-blue-600"
          >
            See all
          </Link>
        </div>

        {loading ? (
          <p className="text-sm font-semibold text-slate-500">
            Loading listings…
          </p>
        ) : (
          <ProductGrid products={newArrivals} />
        )}
      </section>

      <section className="bg-slate-950">
        <div className="mx-auto max-w-7xl px-5 py-14 lg:px-8">
          <div className="mb-7 flex items-end justify-between text-white">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400">
                Popular now
              </p>

              <h2 className="mt-2 text-3xl font-black">
                Popular listings
              </h2>
            </div>

            <Link
              to="/featured"
              className="text-sm font-bold text-blue-400"
            >
              See all
            </Link>
          </div>

          <div className="rounded-3xl bg-white p-5 sm:p-7">
            {loading ? (
              <p className="text-sm font-semibold text-slate-500">
                Loading listings…
              </p>
            ) : (
              <ProductGrid products={best} />
            )}
          </div>
        </div>
      </section>
    </main>
  )
}