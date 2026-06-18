import Header from '@/components/layout/Header'
import Footer from '@/components/layout/Footer'
import TrackPageView from '@/components/TrackPageView'
import LenisProvider from '@/components/providers/LenisProvider'
import MiniRagWidget from '@/components/MiniRagWidget'

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
      </div>
    </LenisProvider>
  )
}
