'use client'

import { useEffect, useRef, useState } from 'react'

// PayPal "Hosted Buttons" embedded via an ISOLATED iframe (/paypal-hosted-button.html).
// The PayPal SDK previously ran in the page's own JS/DOM context and broke the
// site navigation (the desktop nav flipped to display:none once the SDK loaded).
// Hosting it in a same-origin iframe sandboxes all of PayPal's DOM/layout side
// effects to that frame. The iframe reports its height (auto-resize) and any
// failure via postMessage; on failure we fall back to PayPal's hosted page link.
export default function PayPalHostedButton({
  hostedButtonId,
  fallbackUrl,
  fallbackLabel,
}: {
  hostedButtonId: string
  fallbackUrl: string
  fallbackLabel: string
}) {
  const [height, setHeight] = useState(230)
  const [failed, setFailed] = useState(false)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    function onMessage(e: MessageEvent) {
      // Only trust messages from our own iframe's content window.
      if (iframeRef.current && e.source !== iframeRef.current.contentWindow) return
      const d = e.data as { source?: string; id?: string; type?: string; height?: number }
      if (!d || d.source !== 'pp-btn' || d.id !== hostedButtonId) return
      if (d.type === 'fail') setFailed(true)
      else if (d.type === 'height' && typeof d.height === 'number') {
        setHeight(Math.max(60, Math.min(1000, Math.ceil(d.height) + 8)))
      }
    }
    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [hostedButtonId])

  if (failed) {
    return (
      <a className="nh-ticket-btn" href={fallbackUrl} target="_blank" rel="noopener noreferrer">
        {fallbackLabel} &rarr;
      </a>
    )
  }

  return (
    <div className="nh-pp">
      <iframe
        ref={iframeRef}
        src={`/paypal-hosted-button.html?id=${encodeURIComponent(hostedButtonId)}`}
        title={`PayPal – ${fallbackLabel}`}
        loading="lazy"
        scrolling="no"
        allow="payment *"
        className="nh-pp-frame"
        style={{ height }}
      />
    </div>
  )
}
