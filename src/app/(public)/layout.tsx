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
      <div className="flex flex-col min-h-screen">
        <Header />
        <main className="flex-1">{children}</main>
        <Footer />
        <TrackPageView />
        <MiniRagWidget />
      </div>
    </LenisProvider>
  )
}
