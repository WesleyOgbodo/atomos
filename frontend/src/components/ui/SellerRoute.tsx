import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'

export function SellerRoute() {
  const { profile, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return <main className="mx-auto max-w-5xl px-5 py-16 text-center text-sm font-semibold text-slate-500">Checking seller access...</main>
  }

  if (profile?.role !== 'seller') {
    return <Navigate to="/account" replace state={{ from: location.pathname }} />
  }

  if (profile.is_suspended) {
    return <Navigate to="/account" replace />
  }

  return <Outlet />
}
