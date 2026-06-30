'use client'

import { useEffect, useRef, useState } from 'react'

// PayPal "Hosted Buttons" embedded via an ISOLATED srcdoc iframe.
//
// Why srcdoc: the PayPal SDK, when run in the page's own JS/DOM context, broke
// the site navigation (the desktop nav flipped to display:none once the SDK
// loaded — proven by A/B test). An iframe sandboxes those side effects. A
// normal <iframe src> to a same-origin file is blocked here by the proxy's
// X-Frame-Options: DENY, so we use `srcdoc`: its document has no HTTP response,
// so X-Frame-Options never applies, yet it still runs in its own isolated
// window. It posts its height (auto-resize) and any failure to the parent.

const CLIENT_ID =
  'BAAwa_9Bodol9079jEnwSEiR_VDS5zWmH0djpJxqABTtcdDqPNeK1pdWGAdTV3e2OSD6iffCdMQg3bKJaY'

function buildSrcDoc(id: string): string {
  const sdk = `https://www.paypal.com/sdk/js?client-id=${CLIENT_ID}&components=hosted-buttons&disable-funding=venmo,paylater&currency=EUR`
  // Noir overrides: PayPal injects its form markup (white panel, light selects)
  // into THIS srcdoc document, so we can recolor it to the navy/gold theme. The
  // actual pay button lives in a nested cross-origin iframe and is left as-is.
  const css = `
html,body{margin:0;padding:0;background:transparent}
#c{min-height:40px;color:#FBF7EF;font-family:'IBM Plex Mono',ui-monospace,monospace}
#c,#c > div,#c [id^="form-container-"],#c [id^="paypal-form-fields-container-"]{background:transparent!important}
#c h3,#c p,#c label,#c span,#c .item-header,#c .item-description{color:#FBF7EF!important}
#c select,#c input{background:#0B3457!important;color:#FBF7EF!important;border:1px solid #1C5489!important;border-radius:0!important}
#c select option{color:#051A2E}
#c input::placeholder{color:#8AA0B4!important}`
  return `<!doctype html><html lang="de"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style></head><body><div id="c"></div><script>
(function(){
  var id=${JSON.stringify(id)};
  function send(m){try{parent.postMessage(Object.assign({source:'pp-btn',id:id},m),'*')}catch(e){}}
  function fail(){send({type:'fail'})}
  function rh(){send({type:'height',height:document.body.scrollHeight})}
  var s=document.createElement('script');
  s.src=${JSON.stringify(sdk)};
  s.crossOrigin='anonymous';
  s.onerror=fail;
  s.onload=function(){try{
    if(!window.paypal||!window.paypal.HostedButtons){fail();return}
    window.paypal.HostedButtons({hostedButtonId:id}).render('#c');
    send({type:'rendered'});
    if(window.ResizeObserver){new ResizeObserver(rh).observe(document.body)}
    [600,1500,3000,5000].forEach(function(t){setTimeout(rh,t)});
  }catch(e){fail()}};
  document.head.appendChild(s);
})();
</script></body></html>`
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
  const [srcDoc, setSrcDoc] = useState<string | undefined>(undefined)
  const [height, setHeight] = useState(230)
  const [failed, setFailed] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Lazy: only build/load the PayPal frame once the donate section is near view.
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    if (!/^[A-Za-z0-9]{6,30}$/.test(hostedButtonId)) {
      setFailed(true)
      return
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          io.disconnect()
          setSrcDoc(buildSrcDoc(hostedButtonId))
        }
      },
      { rootMargin: '400px' },
    )
    io.observe(el)
    return () => io.disconnect()
  }, [hostedButtonId])

  useEffect(() => {
    function onMessage(e: MessageEvent) {
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
    <div className="nh-pp" ref={wrapRef}>
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        title={`PayPal – ${fallbackLabel}`}
        className="nh-pp-frame"
        style={{ height }}
        scrolling="no"
        allow="payment"
      />
    </div>
  )
}
