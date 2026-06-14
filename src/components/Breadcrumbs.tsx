import Link from 'next/link'
import { getMenuItems } from '@/lib/menu'

interface BreadcrumbItem {
  label: string
  href: string | null
}

async function buildBreadcrumbs(pathname: string): Promise<BreadcrumbItem[]> {
  const menuItems = await getMenuItems()
  const crumbs: BreadcrumbItem[] = []

  // Check top-level items first
  for (const item of menuItems) {
    if (item.href === pathname) {
      crumbs.push({ label: item.label, href: null })
      return crumbs
    }

    // Check children
    for (const child of item.children) {
      if (child.href === pathname) {
        // Add parent as intermediate crumb
        crumbs.push({
          label: item.label,
          href: item.href !== '#' ? item.href : null,
        })
        crumbs.push({ label: child.label, href: null })
        return crumbs
      }
    }
  }

  return crumbs
}

export default async function Breadcrumbs({ pathname }: { pathname: string }) {
  const crumbs = await buildBreadcrumbs(pathname)

  if (crumbs.length === 0) return null

  return (
    <nav className="flex items-center gap-2 text-sm text-brand-text-muted mb-8">
      <Link
        href="/"
        className="hover:text-brand-text transition-colors"
      >
        Startseite
      </Link>
      {crumbs.map((crumb, i) => (
        <span key={i} className="contents">
          <span>/</span>
          {crumb.href ? (
            <Link
              href={crumb.href}
              className="hover:text-brand-text transition-colors"
            >
              {crumb.label}
            </Link>
          ) : (
            <span className="text-brand-text">
              {crumb.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  )
}
