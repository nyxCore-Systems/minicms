import { cookies } from 'next/headers'
import { getToken } from 'next-auth/jwt'
import type { Metadata } from 'next'
import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import TrackPageView from '@/components/TrackPageView'
import LenisProvider from '@/components/providers/LenisProvider'
import MiniRagWidget from '@/components/MiniRagWidget'
import CookieConsent from '@/components/CookieConsent'
import MaintenanceScreen from '@/components/MaintenanceScreen'
import { getSiteSettings } from '@/lib/menu'

// Keep search engines out of the placeholder while maintenance is on.
export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  if (settings.maintenanceMode) {
    return { robots: { index: false, follow: false } }
  }
  return {}
}

async function hasAdminSession(): Promise<boolean> {
  const cookieStore = await cookies()
  const token = await getToken({
    req: {
      cookies: Object.fromEntries(
        cookieStore.getAll().map((c) => [c.name, c.value])
      ),
    } as any,
    secret: process.env.NEXTAUTH_SECRET,
  })
  return !!token
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await getSiteSettings()

  // Maintenance mode hides the whole public site — except for logged-in admins,
  // who keep seeing the real site as a live preview while adjusting content.
  if (settings.maintenanceMode && !(await hasAdminSession())) {
    return <MaintenanceScreen siteName={settings.siteName} logoUrl={settings.logoUrl} />
  }

  return (
    <LenisProvider>
      <a href="#hauptinhalt" className="nh-skip">Zum Inhalt springen</a>
      <div className="nh-grain" aria-hidden="true" />
      <div className="nh-scan" aria-hidden="true" />
      <div className="flex flex-col min-h-screen">
        <Header />
        <main id="hauptinhalt" className="flex-1">{children}</main>
        <Footer />
        <TrackPageView />
        <MiniRagWidget />
        <CookieConsent />
      </div>
    </LenisProvider>
  )
}
