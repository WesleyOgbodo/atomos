import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Authentication required' }, 401)

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKeys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
  const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')

  if (!supabaseUrl || !publishableKeys || !paystackSecret || !secretKeys) {
    return json({ error: 'Payment service is not configured' }, 500)
  }

  const parsedKeys = JSON.parse(publishableKeys)
  const publishableKey = parsedKeys.default
  if (!publishableKey) return json({ error: 'Supabase publishable key is not configured' }, 500)

  const supabase = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
  })

  let body: { orderId?: string }
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  if (!body.orderId) return json({ error: 'orderId is required' }, 400)

  const { data: payment, error: prepareError } = await supabase.rpc('prepare_order_for_payment', {
    p_order_id: body.orderId,
  })

  if (prepareError) return json({ error: prepareError.message }, 400)

  const context = Array.isArray(payment) ? payment[0] : payment
  if (!context) return json({ error: 'Could not prepare payment' }, 400)

  if (context.payment_authorization_url) {
    return json({
      orderId: context.order_id,
      orderNumber: context.order_number,
      reference: context.payment_reference,
      authorizationUrl: context.payment_authorization_url,
    })
  }

  const callbackUrl = Deno.env.get('PAYSTACK_CALLBACK_URL')

  const response = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${paystackSecret}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: context.customer_email,
      amount: String(context.amount_kobo),
      currency: context.currency,
      reference: context.payment_reference,
      ...(callbackUrl ? { callback_url: callbackUrl } : {}),
      metadata: JSON.stringify({
        order_id: context.order_id,
        order_number: context.order_number,
      }),
    }),
  })

  const result = await response.json()

  if (!response.ok || !result.status || !result.data?.authorization_url) {
    return json({ error: result.message || 'Paystack could not initialize the transaction' }, 502)
  }

  const adminKey = JSON.parse(secretKeys).default
  if (!adminKey) return json({ error: 'Supabase secret key is not configured' }, 500)
  const admin = createClient(supabaseUrl, adminKey)
  const { error: storeError } = await admin.rpc('store_paystack_authorization_url', {
    p_reference: result.data.reference,
    p_authorization_url: result.data.authorization_url,
  })
  if (storeError) return json({ error: storeError.message }, 500)

  return json({
    orderId: context.order_id,
    orderNumber: context.order_number,
    reference: result.data.reference,
    authorizationUrl: result.data.authorization_url,
  })
})
