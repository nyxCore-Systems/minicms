import Link from 'next/link'
import Image from 'next/image'
import { getSiteSettings, getMenuItems } from '@/lib/menu'

// Labels that go into the bottom legal bar instead of the main grid
const LEGAL_LABELS = ['rechtshinweise', 'legal', 'rechtliches']

export default async function Footer() {
  const settings = await getSiteSettings()
  const footerItems = await getMenuItems('footer')

  // Split into content columns (main grid) and legal links (bottom bar)
  const contentGroups = footerItems.filter(
    (item) => !LEGAL_LABELS.includes(item.label.toLowerCase())
  )
  const legalGroup = footerItems.find((item) =>
    LEGAL_LABELS.includes(item.label.toLowerCase())
  )
  const legalLinks = legalGroup?.children ?? []

  // Fallback footer links if no footer menu items in DB
  const fallbackLinks = [
    {
      title: 'Festival',
      links: [
        { name: 'Programm 2026', href: '/programm-2026' },
        { name: 'Über uns', href: '/informationen' },
        { name: 'Rückschau', href: '/rueckschau' },
        { name: 'Festival-Filme', href: '/festival-filme' },
      ],
    },
    {
      title: 'Mitmachen',
      links: [
        { name: 'Unterstützung', href: '/unterstuetzung' },
        { name: 'Ihre Spende', href: '/unterstuetzung/spende' },
        { name: 'Unsere Förderer', href: '/foerderer' },
        { name: 'Kontakt', href: '/kontakt' },
      ],
    },
  ]

  const hasContentGroups = contentGroups.length > 0
  // 1 logo column + N content groups = total columns (max 4)
  const gridCols = Math.min(1 + (hasContentGroups ? contentGroups.length : fallbackLinks.length), 4)
  const gridClass =
    gridCols === 4
      ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8'
      : gridCols === 3
        ? 'grid grid-cols-1 md:grid-cols-3 gap-8'
        : 'grid grid-cols-1 md:grid-cols-2 gap-8'

  return (
    <footer className="mt-auto">
      <div className="glass-strong">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12" aria-label="Footer-Navigation">
          <div className={gridClass}>
            <div>
              <div className="mb-4">
                {settings.logoMode === 'text' || (!settings.logoUrl && settings.logoMode !== 'image') ? (
                  <span className="text-xl font-display font-bold text-brand-primary">
                    {settings.siteName}
                  </span>
                ) : settings.logoUrl ? (
                  <Link href="/">
                    <Image
                      src={settings.logoUrl}
                      alt={settings.siteName}
                      width={400}
                      height={100}
                      className="h-10 w-auto max-w-[400px] object-contain"
                    />
                  </Link>
                ) : (
                  <span className="text-xl font-display font-bold text-brand-primary">
                    {settings.siteName}
                  </span>
                )}
              </div>
              <p className="text-sm text-brand-text-muted leading-relaxed mb-4">
                {settings.footerText ||
                  'Das e-Ventschau-Benefiz-Festival – internationale Live-Musik für den guten Zweck in Ventschau, Landkreis Lüneburg.'}
              </p>
            </div>

            {hasContentGroups
              ? contentGroups.map((item) => (
                  <div key={item.id}>
                    <h4 className="text-sm font-semibold text-brand-text mb-4 uppercase tracking-wider">
                      {item.label}
                    </h4>
                    <ul className="space-y-2.5">
                      {item.children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={child.href}
                            className="text-sm text-brand-text-muted hover:text-brand-accent transition-colors"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              : fallbackLinks.map((column) => (
                  <div key={column.title}>
                    <h4 className="text-sm font-semibold text-brand-text mb-4 uppercase tracking-wider">
                      {column.title}
                    </h4>
                    <ul className="space-y-2.5">
                      {column.links.map((link) => (
                        <li key={link.name}>
                          <Link
                            href={link.href}
                            className="text-sm text-brand-text-muted hover:text-brand-accent transition-colors"
                          >
                            {link.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
          </div>

          <div className="mt-10 pt-6 border-t border-brand-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-brand-text-light">
              &copy; {new Date().getFullYear()} {settings.siteName}. Alle Rechte
              vorbehalten.
            </p>
            <div className="flex gap-6">
              {legalLinks.length > 0
                ? legalLinks.map((link) => (
                    <Link
                      key={link.id}
                      href={link.href}
                      className="text-xs text-brand-text-light hover:text-brand-text transition-colors"
                    >
                      {link.label}
                    </Link>
                  ))
                : (
                  <>
                    <Link
                      href="/datenschutz"
                      className="text-xs text-brand-text-light hover:text-brand-text transition-colors"
                    >
                      Datenschutz
                    </Link>
                    <Link
                      href="/impressum"
                      className="text-xs text-brand-text-light hover:text-brand-text transition-colors"
                    >
                      Impressum
                    </Link>
                  </>
                )}
            </div>
          </div>
        </nav>
      </div>
    </footer>
  )
}
