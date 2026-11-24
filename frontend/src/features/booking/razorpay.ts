import type { PaymentOrder } from './api'

export type CheckoutResponse = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type CheckoutOptions = {
  key: string
  amount: number
  currency: string
  order_id: string
  name: string
  description: string
  prefill?: { email?: string }
  theme: { color: string }
  handler: (response: CheckoutResponse) => void
  modal: { ondismiss: () => void }
}

type CheckoutInstance = {
  open: () => void
  on: (event: 'payment.failed', handler: () => void) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: CheckoutOptions) => CheckoutInstance
  }
}

let scriptPromise: Promise<void> | null = null

function loadCheckout(): Promise<void> {
  if (window.Razorpay) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () =>
      window.Razorpay ? resolve() : reject(new Error('Payment checkout did not load'))
    script.onerror = () => reject(new Error('Payment checkout could not be loaded'))
    document.head.appendChild(script)
  }).catch((error: unknown) => {
    scriptPromise = null
    throw error
  })
  return scriptPromise
}

export async function openCheckout(
  order: PaymentOrder,
  options: {
    eventName: string
    email?: string
    onSuccess: (response: CheckoutResponse) => void
    onDismiss: () => void
    onFailure: () => void
  },
) {
  await loadCheckout()
  if (!window.Razorpay) throw new Error('Payment checkout is unavailable')
  let settled = false
  const checkout = new window.Razorpay({
    key: order.keyId,
    amount: order.amount,
    currency: order.currency,
    order_id: order.providerOrderId,
    name: 'EventNest',
    description: options.eventName,
    prefill: options.email ? { email: options.email } : undefined,
    theme: { color: '#ed5b18' },
    handler: (response) => {
      if (settled) return
      settled = true
      if (response.razorpay_order_id !== order.providerOrderId) {
        options.onFailure()
        return
      }
      options.onSuccess(response)
    },
    modal: {
      ondismiss: () => {
        if (!settled) options.onDismiss()
      },
    },
  })
  checkout.on('payment.failed', options.onFailure)
  checkout.open()
}
