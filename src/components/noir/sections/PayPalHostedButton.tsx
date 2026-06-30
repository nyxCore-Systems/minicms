'use client'

import { useEffect, useRef, useState } from 'react'

// PayPal "Hosted Buttons" (No-Code Payments) embedded inline. Loaded defensively:
// - SDK is fetched only when the button scrolls near the viewport (lazy),
// - the SDK loads once and is shared across buttons,
// - render() is wrapped in try/catch and promise-catch,
// - any failure (SDK blocked, render error, ineligibility) degrades gracefully
//   to a plain link to PayPal's hosted checkout page — the page never breaks.

const CLIENT_ID =
  'BAAwa_9Bodol9079jEnwSEiR_VDS5zWmH0djpJxqABTtcdDqPNeK1pdWGAdTV3e2OSD6iffCdMQg3bKJaY'
// paylater is disabled too: it is ineligible for EUR hosted buttons and used to
// log a `ncps_standalone_paylater_ineligible` console error.
const SDK_SRC =
  `https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&components=hosted-buttons&disable-funding=venmo,paylater&currency=EUR`

type PayPalNS = {
  HostedButtons?: (opts: { hostedButtonId: string }) => { render: (selector: string) => unknown }
}

// Local accessor instead of augmenting the global Window type — avoids clashing
// with other PayPal type declarations that may exist in the build tree.
function getPayPal(): PayPalNS | undefined {
  if (typeof window === 'undefined') return undefined
  return (window as unknown as { paypal?: PayPalNS }).paypal
}

let sdkPromise: Promise<PayPalNS> | null = null

function loadPayPalSdk(): Promise<PayPalNS> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  const existingNs = getPayPal()
  if (existingNs?.HostedButtons) return Promise.resolve(existingNs)
  if (sdkPromise) return sdkPromise

  sdkPromise = new Promise<PayPalNS>((resolve, reject) => {
    const finish = () => {
      const ns = getPayPal()
      if (ns?.HostedButtons) resolve(ns)
      else reject(new Error('PayPal SDK loaded without HostedButtons'))
    }
    const existing = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk]')
    if (existing) {
      existing.addEventListener('load', finish)
      existing.addEventListener('error', () => reject(new Error('PayPal SDK failed')))
      return
    }
    const s = document.createElement('script')
    s.src = SDK_SRC
    s.async = true
    s.crossOrigin = 'anonymous'
    s.dataset.paypalSdk = '1'
    s.onload = finish
    s.onerror = () => {
      sdkPromise = null // allow a later retry
      reject(new Error('PayPal SDK failed to load'))
    }
    document.head.appendChild(s)
  })
  return sdkPromise
}

export default function PayPalHostedButton({
  hostedButtonId,
  fallbackUrl,
  fallbackLabel,
}: {
  hostedButtonId: string
  fallbackUrl: string
  fallbackLabel: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const startedRef = useRef(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    let cancelled = false

    const start = () => {
      if (startedRef.current) return
      startedRef.current = true
      loadPayPalSdk()
        .then((paypal) => {
          if (cancelled) return
          try {
            if (!paypal.HostedButtons) throw new Error('HostedButtons unavailable')
            const result = paypal.HostedButtons({ hostedButtonId }).render(`#${el.id}`)
            if (result && typeof (result as Promise<unknown>).then === 'function') {
              ;(result as Promise<unknown>).catch(() => {
                if (!cancelled) setFailed(true)
              })
            }
          } catch (err) {
            console.warn('PayPal hosted button render failed:', err)
            if (!cancelled) setFailed(true)
          }
        })
        .catch((err) => {
          console.warn('PayPal SDK load failed:', err)
          if (!cancelled) setFailed(true)
        })
    }

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          io.disconnect()
          start()
        }
      },
      { threshold: 0.01, rootMargin: '300px' },
    )
    io.observe(el)
    return () => {
      cancelled = true
      io.disconnect()
    }
  }, [hostedButtonId])

  return (
    <div className="nh-pp">
      <div id={`paypal-container-${hostedButtonId}`} ref={ref} className="nh-pp-box" />
      {failed && (
        <a className="nh-ticket-btn" href={fallbackUrl} target="_blank" rel="noopener noreferrer">
          {fallbackLabel} &rarr;
        </a>
      )}
    </div>
  )
}
