'use client'

import { useEffect, useRef, useState } from 'react'

// PayPal Hosted Button (client-id + button-id are public, frontend-safe).
// `paylater` is disabled: it's ineligible for this account/region and otherwise
// logs a noisy `ncps_standalone_paylater_ineligible` error to the console.
const SDK_SRC =
  'https://www.paypal.com/sdk/js?client-id=BAAwa_9Bodol9079jEnwSEiR_VDS5zWmH0djpJxqABTtcdDqPNeK1pdWGAdTV3e2OSD6iffCdMQg3bKJaY&components=hosted-buttons&disable-funding=venmo,paylater&currency=EUR'
const HOSTED_BUTTON_ID = 'MGNNL73RQ88DG'
const CONTAINER_ID = `paypal-container-${HOSTED_BUTTON_ID}`

declare global {
  interface Window {
    paypal?: {
      HostedButtons?: (opts: { hostedButtonId: string }) => { render: (selector: string) => void }
    }
  }
}

export default function PayPalDonateButton() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  // Defer SDK loading until the button nears the viewport. The donate section
  // sits far down the homepage, so eagerly loading PayPal on every page load
  // wastes bandwidth and floods the console on first paint.
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '400px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    let cancelled = false

    function renderButton() {
      if (cancelled || !containerRef.current) return
      const hostedButtons = window.paypal?.HostedButtons
      if (!hostedButtons) return
      containerRef.current.innerHTML = '' // avoid duplicate render (StrictMode / re-mount)
      try {
        hostedButtons({ hostedButtonId: HOSTED_BUTTON_ID }).render(`#${CONTAINER_ID}`)
      } catch (err) {
        console.error('PayPal HostedButtons render failed', err)
      }
    }

    if (window.paypal?.HostedButtons) {
      renderButton()
      return () => {
        cancelled = true
      }
    }

    // Load the SDK once, reusing an existing tag if present.
    let script = document.querySelector<HTMLScriptElement>('script[data-paypal-sdk]')
    if (!script) {
      script = document.createElement('script')
      script.src = SDK_SRC
      script.async = true
      script.crossOrigin = 'anonymous'
      script.dataset.paypalSdk = 'true'
      document.body.appendChild(script)
    }
    script.addEventListener('load', renderButton, { once: true })

    return () => {
      cancelled = true
      script?.removeEventListener('load', renderButton)
    }
  }, [visible])

  return <div id={CONTAINER_ID} ref={containerRef} className="nh-paypal" />
}
