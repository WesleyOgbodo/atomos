import { Route, Routes } from 'react-router-dom'
import { Account } from '@/pages/Account/Account'
import { Cart } from '@/pages/Cart/Cart'
import { Chat } from '@/pages/Orders/Chat'
import { CreateListing } from '@/pages/Admin/CreateListing'
import { ForgotPassword } from '@/pages/Account/ForgotPassword'
import { Home } from '@/pages/Home/Home'
import { Listing } from '@/pages/Shop/Listing'
import { Login } from '@/pages/Account/Login'
import { Messages } from '@/pages/Orders/Messages'
import { Checkout } from '@/pages/Checkout/Checkout'
import { PaymentCallback } from '@/pages/Checkout/PaymentCallback'
import { Placeholder } from '@/pages/Checkout/Placeholder'
import { Orders } from '@/pages/Orders/Orders'
import { OrderDetails } from '@/pages/Orders/OrderDetails'
import { SellerOrders } from '@/pages/Orders/SellerOrders'
import { Notifications } from '@/pages/Orders/Notifications'
import { SellerOrderDetails } from '@/pages/Orders/SellerOrderDetails'
import { ProductDetails } from '@/pages/Product/ProductDetails'
import { Register } from '@/pages/Account/Register'
import { ResetPassword } from '@/pages/Account/ResetPassword'
import { Search } from '@/pages/Shop/Search'
import { SellerListings } from '@/pages/Admin/SellerListings'
import { ProtectedRoute } from '@/components/ui/ProtectedRoute'
import { SellerRoute } from '@/components/ui/SellerRoute'

function NotFound() {
  return <Placeholder title="Page not found" text="The page you are looking for does not exist." />
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/phones" element={<Listing category="Phones" />} />
      <Route path="/laptops" element={<Listing category="Laptops" />} />
      <Route path="/audio" element={<Listing category="Audio" />} />
      <Route path="/accessories" element={<Listing category="Accessories" />} />
      <Route path="/fashion" element={<Listing category="Fashion" />} />
      <Route path="/shoes" element={<Listing category="Shoes" />} />
      <Route path="/men" element={<Listing category="Fashion" />} />
      <Route path="/women" element={<Listing category="Fashion" />} />
      <Route path="/kids" element={<Listing category="Fashion" />} />
      <Route path="/featured" element={<Listing />} />
      <Route path="/search" element={<Search />} />
      <Route path="/products/:productId" element={<ProductDetails />} />
      <Route path="/products/:productId/chat" element={<Chat />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/account" element={<Account />} />
        <Route element={<SellerRoute />}>
          <Route path="/sell" element={<CreateListing />} />
          <Route path="/account/listings" element={<SellerListings />} />
          <Route path="/seller/orders" element={<SellerOrders />} />
          <Route path="/seller/orders/:orderId" element={<SellerOrderDetails />} />
        </Route>
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={<Checkout />} />
        <Route path="/payment/callback" element={<PaymentCallback />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/orders/:orderId" element={<OrderDetails />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/wishlist" element={<Placeholder title="Wishlist" text="Your saved products will appear here once wishlist persistence is connected to Supabase." />} />
      </Route>
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
