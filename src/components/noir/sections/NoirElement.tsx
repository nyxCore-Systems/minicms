import NoirHeroSection from './NoirHeroSection'
import NoirMarqueeSection from './NoirMarqueeSection'
import NoirLineupSection from './NoirLineupSection'
import NoirProgrammSection from './NoirProgrammSection'
import NoirManifestSection from './NoirManifestSection'
import NoirDonateSection from './NoirDonateSection'
import type { NoirHeroContent, NoirManifestContent, NoirDonateContent } from '@/lib/noir-home-defaults'

/**
 * Renders a single Noir homepage element by its `noir_*` type. Shared by
 * HomepageSectionRenderer (DB-driven) and the no-sections default layout in
 * the homepage route, so the mapping lives in exactly one place.
 */
export default function NoirElement({
  type,
  title,
  subtitle,
  content,
}: {
  type: string
  title?: string | null
  subtitle?: string | null
  content?: unknown
}) {
  switch (type) {
    case 'noir_hero':
      return <NoirHeroSection content={content as NoirHeroContent | null} />
    case 'noir_marquee':
      return <NoirMarqueeSection />
    case 'noir_lineup':
      return <NoirLineupSection title={title} subtitle={subtitle} content={content as { categories?: string[]; order?: string[]; heading?: string } | null} />
    case 'noir_timetable':
      return <NoirProgrammSection title={title} subtitle={subtitle} />
    case 'noir_manifest':
      return <NoirManifestSection content={content as NoirManifestContent | null} />
    case 'noir_donate':
      return <NoirDonateSection content={content as NoirDonateContent | null} />
    default:
      return null
  }
}
