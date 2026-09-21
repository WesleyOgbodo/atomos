import { supabase } from '@/lib/supabase'

export type PaymentInitialization = {
  orderId: string
  orderNumber: string
  reference: string
  authorizationUrl: string
}

export async function initializeOrderPayment(orderId: string): Promise<PaymentInitialization> {
  const { data, error } = await supabase.functions.invoke('paystack-initialize', {
    body: { orderId },
  })

  if (error) throw error
  if (!data?.authorizationUrl) throw new Error(data?.error || 'Could not initialize payment.')
  return data as PaymentInitialization
}

export async function verifyPaystackPayment(reference: string) {
  const { data, error } = await supabase.functions.invoke('paystack-verify', {
    body: { reference },
  })

  if (error) throw error
  if (!data) throw new Error('Payment verification returned no result.')
  return data as { orderId: string; reference: string; status: string; paid: boolean }
}

export async function markOrderPaymentAbandoned(orderId: string) {
  const { error } = await supabase.rpc('mark_order_payment_abandoned', { p_order_id: orderId })
  if (error) throw error
}
