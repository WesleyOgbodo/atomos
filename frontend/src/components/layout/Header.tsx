import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, Search, ShoppingBag, UserRound, Heart, X, MessageCircle } from 'lucide-react'
import { Logo } from '@/components/layout/Logo'

const nav = [['Phones','/phones'],['Laptops','/laptops'],['Accessories','/accessories'],['Fashion','/fashion'],['Deals','/featured']]

export function Header() {
  const [open, setOpen] = useState(false)
  return <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
    <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <button className="mr-2 md:hidden" onClick={() => setOpen(!open)} aria-label="Toggle menu">{open ? <X /> : <Menu />}</button>
      <Logo />
      <nav className="hidden items-center gap-6 md:flex">{nav.map(([label,path]) => <NavLink key={path} to={path} className={({isActive}) => `text-sm font-semibold transition ${isActive ? 'text-blue-600' : 'text-slate-600 hover:text-slate-950'}`}>{label}</NavLink>)}</nav>
      <div className="flex items-center gap-3">
        <Link to="/search" aria-label="Search"><Search size={20}/></Link>
        <Link to="/wishlist" className="hidden sm:block" aria-label="Wishlist"><Heart size={20}/></Link>
        <Link to="/account" className="hidden sm:block" aria-label="Account"><UserRound size={20}/></Link>
        <Link to="/messages" aria-label="Messages"><MessageCircle size={20}/></Link><Link to="/cart" aria-label="Cart"><ShoppingBag size={20}/></Link>
      </div>
    </div>
    {open && <nav className="border-t border-slate-200 bg-white px-4 py-3 md:hidden">{nav.map(([label,path]) => <NavLink onClick={() => setOpen(false)} key={path} to={path} className="block border-b border-slate-100 py-3 text-sm font-semibold">{label}</NavLink>)}<NavLink onClick={() => setOpen(false)} to="/search" className="block py-3 text-sm font-semibold">Search everything</NavLink></nav>}
  </header>
}
