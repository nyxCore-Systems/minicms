'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  HomeIcon,
  UsersIcon,
  BuildingStorefrontIcon,
  MegaphoneIcon,
  ChartBarIcon,
  DocumentTextIcon,
  PhotoIcon,
  CogIcon,
  ArrowLeftStartOnRectangleIcon,
  RectangleStackIcon,
  RectangleGroupIcon,
  BuildingOfficeIcon,
  Bars3BottomLeftIcon,
  ShoppingBagIcon,
  TagIcon,
  ChevronDownIcon,
  ServerStackIcon,
} from '@heroicons/react/24/outline'
import { signOut } from 'next-auth/react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NavItem {
  name: string
  href: string
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>
}

interface NavGroup {
  key: string
  label: string
  items: NavItem[]
}

interface TopLevelItem extends NavItem {
  type: 'item'
}

interface GroupEntry {
  type: 'group'
  group: NavGroup
}

interface DividerEntry {
  type: 'divider'
}

type NavEntry = TopLevelItem | GroupEntry | DividerEntry

// ---------------------------------------------------------------------------
// Navigation structure
// ---------------------------------------------------------------------------

const navStructure: NavEntry[] = [
  {
    type: 'item',
    name: 'Dashboard',
    href: '/admin',
    icon: HomeIcon,
  },
  { type: 'divider' },
  {
    type: 'group',
    group: {
      key: 'inhalte',
      label: 'Inhalte',
      items: [
        { name: 'Seiten', href: '/admin/content', icon: DocumentTextIcon },
        { name: 'Medien', href: '/admin/media', icon: PhotoIcon },
        { name: 'Navigation', href: '/admin/menu', icon: Bars3BottomLeftIcon },
      ],
    },
  },
  { type: 'divider' },
  {
    type: 'group',
    group: {
      key: 'shop',
      label: 'Shop',
      items: [
        { name: 'Produkte', href: '/admin/products', icon: ShoppingBagIcon },
        { name: 'Kategorien', href: '/admin/categories', icon: TagIcon },
        {
          name: 'Händler',
          href: '/admin/vendors',
          icon: BuildingStorefrontIcon,
        },
      ],
    },
  },
  { type: 'divider' },
  {
    type: 'group',
    group: {
      key: 'marketing',
      label: 'Marketing',
      items: [
        { name: 'Slider', href: '/admin/sliders', icon: RectangleGroupIcon },
        {
          name: 'Sektionen',
          href: '/admin/sections',
          icon: RectangleStackIcon,
        },
        { name: 'Werbung', href: '/admin/ads', icon: MegaphoneIcon },
        { name: 'SEO', href: '/admin/seo', icon: ChartBarIcon },
      ],
    },
  },
  { type: 'divider' },
  {
    type: 'item',
    name: 'Leads',
    href: '/admin/leads',
    icon: UsersIcon,
  },
  { type: 'divider' },
  {
    type: 'group',
    group: {
      key: 'einstellungen',
      label: 'Einstellungen',
      items: [
        { name: 'Seiteneinstellungen', href: '/admin/setup', icon: CogIcon },
        { name: 'System', href: '/admin/system', icon: ServerStackIcon },
      ],
    },
  },
]

const superAdminGroup: NavGroup = {
  key: 'super-admin',
  label: 'Super-Admin',
  items: [
    { name: 'Mandanten', href: '/admin/super/tenants', icon: BuildingOfficeIcon },
  ],
}

// ---------------------------------------------------------------------------
// Persistence helpers
// ---------------------------------------------------------------------------

const STORAGE_KEY = 'adminNavExpanded'

function loadExpanded(): string[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as string[]
  } catch {
    // ignore
  }
  return []
}

function saveExpanded(keys: string[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
  } catch {
    // ignore
  }
}

// ---------------------------------------------------------------------------
// Helper: check if a route is active
// ---------------------------------------------------------------------------

function isRouteActive(pathname: string, href: string): boolean {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

function groupContainsActive(group: NavGroup, pathname: string): boolean {
  return group.items.some((item) => isRouteActive(pathname, item.href))
}

// ---------------------------------------------------------------------------
// Collapsible group sub-component
// ---------------------------------------------------------------------------

function CollapsibleGroup({
  group,
  isExpanded,
  onToggle,
  pathname,
}: {
  group: NavGroup
  isExpanded: boolean
  onToggle: () => void
  pathname: string
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const [maxHeight, setMaxHeight] = useState<number | undefined>(undefined)

  // Measure content height for smooth animation
  useEffect(() => {
    if (contentRef.current) {
      setMaxHeight(contentRef.current.scrollHeight)
    }
  }, [group.items])

  const hasActive = groupContainsActive(group, pathname)

  return (
    <div>
      <button
        onClick={onToggle}
        className={`flex items-center justify-between w-full px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors ${
          hasActive
            ? 'text-brand-accent'
            : 'text-brand-text-muted hover:text-brand-text'
        }`}
      >
        <span>{group.label}</span>
        <ChevronDownIcon
          className={`w-3.5 h-3.5 transition-transform duration-200 ${
            isExpanded ? 'rotate-0' : '-rotate-90'
          }`}
        />
      </button>
      <div
        style={{
          maxHeight: isExpanded ? (maxHeight ?? 1000) : 0,
          opacity: isExpanded ? 1 : 0,
        }}
        className="overflow-hidden transition-all duration-200 ease-in-out"
      >
        <div ref={contentRef}>
          <ul className="space-y-0.5 mt-0.5">
            {group.items.map((item) => {
              const isActive = isRouteActive(pathname, item.href)
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-accent/10 text-brand-accent'
                        : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-bg-dark'
                    }`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main AdminNav
// ---------------------------------------------------------------------------

export default function AdminNav({ role }: { role: string }) {
  const pathname = usePathname()
  const [expandedKeys, setExpandedKeys] = useState<string[]>([])
  const [hydrated, setHydrated] = useState(false)

  // Hydrate from localStorage + auto-expand groups containing the active route
  useEffect(() => {
    const stored = loadExpanded()

    // Collect all group keys that contain the active route
    const activeGroupKeys: string[] = []
    for (const entry of navStructure) {
      if (entry.type === 'group' && groupContainsActive(entry.group, pathname)) {
        activeGroupKeys.push(entry.group.key)
      }
    }
    if (
      role === 'SUPER_ADMIN' &&
      groupContainsActive(superAdminGroup, pathname)
    ) {
      activeGroupKeys.push(superAdminGroup.key)
    }

    // Merge stored + active (deduplicated)
    const merged = Array.from(new Set([...stored, ...activeGroupKeys]))
    setExpandedKeys(merged)
    setHydrated(true)
  }, [pathname, role])

  const toggleGroup = useCallback(
    (key: string) => {
      setExpandedKeys((prev) => {
        const next = prev.includes(key)
          ? prev.filter((k) => k !== key)
          : [...prev, key]
        saveExpanded(next)
        return next
      })
    },
    []
  )

  // Avoid hydration mismatch — render collapsed by default on server
  if (!hydrated) {
    return <nav className="flex-1 py-4" />
  }

  return (
    <nav className="flex-1 py-4 overflow-y-auto">
      <div className="space-y-1 px-3">
        {navStructure.map((entry, idx) => {
          if (entry.type === 'divider') {
            return (
              <div
                key={`divider-${idx}`}
                className="border-t border-brand-border my-2"
              />
            )
          }

          if (entry.type === 'item') {
            const isActive = isRouteActive(pathname, entry.href)
            return (
              <Link
                key={entry.href}
                href={entry.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-brand-accent/10 text-brand-accent'
                    : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-bg-dark'
                }`}
              >
                <entry.icon className="w-5 h-5" />
                {entry.name}
              </Link>
            )
          }

          // type === 'group'
          return (
            <CollapsibleGroup
              key={entry.group.key}
              group={entry.group}
              isExpanded={expandedKeys.includes(entry.group.key)}
              onToggle={() => toggleGroup(entry.group.key)}
              pathname={pathname}
            />
          )
        })}

        {/* Super-Admin group */}
        {role === 'SUPER_ADMIN' && (
          <>
            <div className="border-t border-brand-border my-2" />
            <CollapsibleGroup
              group={superAdminGroup}
              isExpanded={expandedKeys.includes(superAdminGroup.key)}
              onToggle={() => toggleGroup(superAdminGroup.key)}
              pathname={pathname}
            />
          </>
        )}
      </div>

      {/* Sign out */}
      <div className="px-3 mt-4">
        <button
          onClick={() => signOut({ callbackUrl: '/admin/login' })}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-brand-text-muted hover:text-red-500 hover:bg-red-500/10 transition-all w-full"
        >
          <ArrowLeftStartOnRectangleIcon className="w-5 h-5" />
          Abmelden
        </button>
      </div>
    </nav>
  )
}
