import { createClient } from 'npm:@supabase/supabase-js@2'

type PaystackTransaction = {
  id: number
  reference: string
  status: string
  amount: number
  requested_amount: number
  currency: string
}

type PaystackVerifyResponse = {
  status: boolean
  message?: string
  data?: PaystackTransaction
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json({ error: 'Method not allowed' }, 405)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return json({ error: 'Authentication required' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const publishableKeys = Deno.env.get('SUPABASE_PUBLISHABLE_KEYS')
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')
  const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')

  if (!supabaseUrl || !publishableKeys || !secretKeys || !paystackSecret) {
    return json({ error: 'Payment service is not configured' }, 500)
  }

  let parsedPublishableKeys: Record<string, string>
  let parsedSecretKeys: Record<string, string>

  try {
    parsedPublishableKeys = JSON.parse(publishableKeys)
    parsedSecretKeys = JSON.parse(secretKeys)
  } catch {
    return json({ error: 'Supabase key configuration is invalid' }, 500)
  }

  const publishableKey = parsedPublishableKeys.default
  const secretKey = parsedSecretKeys.default

  if (!publishableKey || !secretKey) {
    return json({ error: 'Supabase key configuration is incomplete' }, 500)
  }

  const userClient = createClient(supabaseUrl, publishableKey, {
    global: { headers: { Authorization: authHeader } },
  })

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser()

  if (userError || !user) {
    return json({ error: 'Invalid or expired authentication session' }, 401)
  }

  let body: { reference?: string }

  try {
    body = await req.json()
  } catch {
    return json({ error: 'Invalid JSON body' }, 400)
  }

  const reference = body.reference?.trim()

  if (!reference) {
    return json({ error: 'reference is required' }, 400)
  }

  const { data: order, error: orderError } = await userClient
    .from('orders')
    .select('id, payment_reference, payment_provider, payment_status')
    .eq('buyer_id', user.id)
    .eq('payment_reference', reference)
    .eq('payment_provider', 'paystack')
    .maybeSingle()

  if (orderError) {
    return json({ error: 'Could not verify payment ownership' }, 400)
  }

  if (!order) {
    return json({ error: 'Payment reference does not belong to this account' }, 403)
  }

  const verifyResponse = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    {
      method: 'GET',
      headers: { Authorization: `Bearer ${paystackSecret}` },
    },
  )

  let result: PaystackVerifyResponse

  try {
    result = (await verifyResponse.json()) as PaystackVerifyResponse
  } catch {
    return json({ error: 'Paystack returned an invalid response' }, 502)
  }

  if (!verifyResponse.ok || !result.status || !result.data) {
    return json(
      { error: result.message || 'Could not verify payment with Paystack' },
      502,
    )
  }

  const transaction = result.data

  if (transaction.reference !== reference) {
    return json({ error: 'Paystack reference mismatch' }, 400)
  }

  const adminClient = createClient(supabaseUrl, secretKey)

  const { data: orderId, error: recordError } = await adminClient.rpc(
    'record_verified_paystack_payment',
    {
      p_reference: transaction.reference,
      p_transaction_id: String(transaction.id),
      p_amount_kobo: Number(transaction.amount),
      p_requested_amount_kobo: Number(transaction.requested_amount),
      p_currency: transaction.currency,
      p_gateway_status: transaction.status,
    },
  )

  if (recordError) {
    return json({ error: recordError.message }, 400)
  }

  return json({
    orderId,
    reference: transaction.reference,
    status: transaction.status,
    paid: transaction.status === 'success',
  })
})
