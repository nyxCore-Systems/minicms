'use client'

import { useEffect, useRef } from 'react'

// PayPal Hosted Button (client-id + button-id are public, frontend-safe).
const SDK_SRC =
  'https://www.paypal.com/sdk/js?client-id=BAAwa_9Bodol9079jEnwSEiR_VDS5zWmH0djpJxqABTtcdDqPNeK1pdWGAdTV3e2OSD6iffCdMQg3bKJaY&components=hosted-buttons&disable-funding=venmo&currency=EUR'
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

  useEffect(() => {
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
  }, [])

  return <div id={CONTAINER_ID} ref={containerRef} className="nh-paypal" />
}
