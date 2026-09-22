import { supabase } from '@/lib/supabase'

export type DeliveryMethod = 'pickup' | 'delivery'
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'ready_for_delivery' | 'delivered' | 'cancelled'

export type OrderSummary = {
  id: string
  order_number: string
  status: OrderStatus
  subtotal: number
  delivery_fee: number
  total: number
  delivery_method: DeliveryMethod
  delivery_address: string | null
  created_at: string
  payment_status: 'pending' | 'initiated' | 'paid' | 'failed' | 'abandoned'
  payment_reference: string | null
}

export type OrderItem = {
  id: string
  listing_id: string | null
  seller_id: string | null
  title_snapshot: string
  unit_price: number
  quantity: number
}

export type SellerOrderItem = {
  item_id: string
  listing_id: string | null
  title_snapshot: string
  unit_price: number
  quantity: number
}

export type SellerOrder = {
  order_id: string
  order_number: string
  buyer_id: string
  buyer_name: string
  buyer_phone: string
  global_status: OrderStatus
  seller_status: OrderStatus
  subtotal: number
  delivery_fee: number
  total: number
  delivery_method: DeliveryMethod
  delivery_address: string | null
  created_at: string
  items: SellerOrderItem[]
}

export async function createOrderFromCart(
  deliveryMethod: DeliveryMethod,
  deliveryAddress?: string,
) {
  const { data, error } = await supabase.rpc('create_order_from_cart', {
    p_delivery_method: deliveryMethod,
    p_delivery_address: deliveryAddress?.trim() || null,
  })

  if (error) throw error
  if (!data) throw new Error('The order was not created.')
  return data as string
}

function mapOrder(row: Record<string, unknown>): OrderSummary {
  return {
    id: String(row.id),
    order_number: String(row.order_number ?? `ATM-${String(row.id).slice(0, 10).toUpperCase()}`),
    status: row.status as OrderStatus,
    subtotal: Number(row.subtotal),
    delivery_fee: Number(row.delivery_fee),
    total: Number(row.total),
    delivery_method: row.delivery_method as DeliveryMethod,
    delivery_address: (row.delivery_address as string | null) ?? null,
    created_at: String(row.created_at),
    payment_status: row.payment_status as OrderSummary['payment_status'],
    payment_reference: (row.payment_reference as string | null) ?? null,
  }
}

export async function getMyOrders(): Promise<OrderSummary[]> {
  const { data, error } = await supabase
    .from('orders')
    .select('id,order_number,status,subtotal,delivery_fee,total,delivery_method,delivery_address,created_at,payment_status,payment_reference')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data ?? []).map(row => mapOrder(row as Record<string, unknown>))
}

export async function getMyOrder(orderId: string) {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select('id,order_number,status,subtotal,delivery_fee,total,delivery_method,delivery_address,created_at,payment_status,payment_reference')
    .eq('id', orderId)
    .maybeSingle()

  if (orderError) throw orderError
  if (!order) return null

  const { data: items, error: itemsError } = await supabase
    .from('order_items')
    .select('id,listing_id,seller_id,title_snapshot,unit_price,quantity')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (itemsError) throw itemsError

  return {
    order: mapOrder(order as Record<string, unknown>),
    items: (items ?? []).map(item => ({
      ...item,
      unit_price: Number(item.unit_price),
    })) as OrderItem[],
  }
}

export async function cancelMyOrder(orderId: string) {
  const { error } = await supabase.rpc('cancel_my_order', { p_order_id: orderId })
  if (error) throw error
}

export async function getSellerOrders(): Promise<SellerOrder[]> {
  const { data, error } = await supabase.rpc('get_seller_orders')
  if (error) throw error

  const grouped = new Map<string, SellerOrder>()

  for (const row of (data ?? []) as Array<Record<string, unknown>>) {
    const orderId = String(row.order_id)
    const existing = grouped.get(orderId)
    const item: SellerOrderItem = {
      item_id: String(row.item_id),
      listing_id: row.listing_id ? String(row.listing_id) : null,
      title_snapshot: String(row.title_snapshot),
      unit_price: Number(row.unit_price),
      quantity: Number(row.quantity),
    }

    if (existing) {
      existing.items.push(item)
      continue
    }

    grouped.set(orderId, {
      order_id: orderId,
      order_number: String(row.order_number),
      buyer_id: String(row.buyer_id),
      buyer_name: String(row.buyer_name ?? ''),
      buyer_phone: String(row.buyer_phone ?? ''),
      global_status: row.global_status as OrderStatus,
      seller_status: row.seller_status as OrderStatus,
      subtotal: Number(row.subtotal),
      delivery_fee: Number(row.delivery_fee),
      total: Number(row.total),
      delivery_method: row.delivery_method as DeliveryMethod,
      delivery_address: (row.delivery_address as string | null) ?? null,
      created_at: String(row.created_at),
      items: [item],
    })
  }

  return [...grouped.values()]
}

export async function getSellerOrder(orderId: string): Promise<SellerOrder | null> {
  const orders = await getSellerOrders()
  return orders.find(order => order.order_id === orderId) ?? null
}

export async function updateSellerOrderStatus(orderId: string, status: OrderStatus) {
  const { error } = await supabase.rpc('seller_update_order_status', {
    p_order_id: orderId,
    p_next_status: status,
  })
  if (error) throw error
}
