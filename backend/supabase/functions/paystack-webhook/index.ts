import { createClient } from 'npm:@supabase/supabase-js@2'

type PaystackWebhookData = {
  id?: number
  reference?: string
}

type PaystackWebhookEvent = {
  event?: string
  data?: PaystackWebhookData
}

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

async function hmacSha512(secret: string, payload: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-512' },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    new TextEncoder().encode(payload),
  )

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false

  let result = 0
  for (let i = 0; i < a.length; i += 1) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  const paystackSecret = Deno.env.get('PAYSTACK_SECRET_KEY')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const secretKeys = Deno.env.get('SUPABASE_SECRET_KEYS')

  if (!paystackSecret || !supabaseUrl || !secretKeys) {
    return new Response('Webhook is not configured', { status: 500 })
  }

  const rawBody = await req.text()
  const signature = req.headers.get('x-paystack-signature') || ''
  const expectedSignature = await hmacSha512(paystackSecret, rawBody)

  if (!safeEqual(signature, expectedSignature)) {
    return new Response('Invalid signature', { status: 401 })
  }

  let event: PaystackWebhookEvent
  try {
    event = JSON.parse(rawBody) as PaystackWebhookEvent
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  if (event.event !== 'charge.success') {
    return new Response('ok', { status: 200 })
  }

  const reference = event.data?.reference?.trim()
  if (!reference) {
    return new Response('Missing transaction reference', { status: 400 })
  }

  let parsedSecretKeys: Record<string, string>
  try {
    parsedSecretKeys = JSON.parse(secretKeys)
  } catch {
    return new Response('Supabase secret configuration is invalid', { status: 500 })
  }

  const secretKey = parsedSecretKeys.default
  if (!secretKey) {
    return new Response('Supabase secret key is not configured', { status: 500 })
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
    return new Response('Invalid Paystack response', { status: 502 })
  }

  if (!verifyResponse.ok || !result.status || !result.data) {
    return new Response(result.message || 'Could not verify transaction', { status: 502 })
  }

  const transaction = result.data

  if (transaction.reference !== reference) {
    return new Response('Paystack reference mismatch', { status: 400 })
  }

  const admin = createClient(supabaseUrl, secretKey)

  const { error } = await admin.rpc('record_verified_paystack_payment', {
    p_reference: transaction.reference,
    p_transaction_id: String(transaction.id),
    p_amount_kobo: Number(transaction.amount),
    p_requested_amount_kobo: Number(transaction.requested_amount),
    p_currency: transaction.currency,
    p_gateway_status: transaction.status,
  })

  if (error) {
    return new Response(error.message, { status: 500 })
  }

  return new Response('ok', { status: 200 })
})
