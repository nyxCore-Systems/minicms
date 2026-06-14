import { NextRequest, NextResponse } from 'next/server'

const ROOT_DOMAIN = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') || ''
  const pathname = request.nextUrl.pathname

  // Extract subdomain
  let tenantSlug = ''
  if (host) {
    // Remove port for comparison
    const hostWithoutPort = host.split(':')[0]
    const rootWithoutPort = ROOT_DOMAIN.split(':')[0]

    if (hostWithoutPort !== rootWithoutPort && hostWithoutPort.endsWith(`.${rootWithoutPort}`)) {
      tenantSlug = hostWithoutPort.replace(`.${rootWithoutPort}`, '')
    }
  }

  // Admin auth check — cookie presence for Edge, full JWT in layout + API
  if (pathname.startsWith('/admin') && pathname !== '/admin/login') {
    const hasSession =
      request.cookies.has('next-auth.session-token') ||
      request.cookies.has('__Secure-next-auth.session-token')
    if (!hasSession) {
      const loginUrl = new URL('/admin/login', request.url)
      return NextResponse.redirect(loginUrl, { status: 307 })
    }
  }

  // Forward tenant slug as request header (readable by server components)
  const requestHeaders = new Headers(request.headers)
  if (tenantSlug) {
    requestHeaders.set('x-tenant-slug', tenantSlug)
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    // Match all routes except static files and API routes that don't need tenant resolution
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
