'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Bars3Icon,
  XMarkIcon,
  ChevronDownIcon,
  HomeIcon,
  Squares2X2Icon,
  CalendarDaysIcon,
  BookOpenIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline'
import DarkModeToggle from '@/components/ui/DarkModeToggle'
import type { MenuItemData, SiteSettingsData } from '@/lib/menu'

interface HeaderClientProps {
  navigation: MenuItemData[]
  settings: SiteSettingsData
}

export default function HeaderClient({ navigation, settings }: HeaderClientProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null)
  const [mobileOverlayOpen, setMobileOverlayOpen] = useState(false)
  const [bottomBarVisible, setBottomBarVisible] = useState(true)
  const lastScrollY = useRef(0)
  const overlayRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const pathname = usePathname()

  // Scroll-aware bottom bar: hide on scroll down, show on scroll up
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY
      if (currentScrollY > lastScrollY.current && currentScrollY > 50) {
        // Scrolling down past threshold
        setBottomBarVisible(false)
      } else {
        // Scrolling up
        setBottomBarVisible(true)
      }
      lastScrollY.current = currentScrollY
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Close overlay on route change
  useEffect(() => {
    setMobileOverlayOpen(false)
  }, [pathname])

  // Lock body scroll when overlay is open + focus management
  useEffect(() => {
    if (mobileOverlayOpen) {
      document.body.style.overflow = 'hidden'
      // Move focus into overlay
      requestAnimationFrame(() => {
        const firstLink = overlayRef.current?.querySelector<HTMLElement>('a, button')
        firstLink?.focus()
      })
    } else {
      document.body.style.overflow = ''
      // Return focus to menu button
      menuButtonRef.current?.focus()
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOverlayOpen])

  // Close on Escape + trap focus within the dialog (WCAG 2.1.2 / 2.4.3)
  useEffect(() => {
    if (!mobileOverlayOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileOverlayOpen(false)
        return
      }
      if (e.key !== 'Tab') return
      const root = overlayRef.current
      if (!root) return
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      const active = document.activeElement as HTMLElement | null
      if (e.shiftKey) {
        if (active === first || !root.contains(active)) {
          e.preventDefault()
          last.focus()
        }
      } else if (active === last || !root.contains(active)) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileOverlayOpen])

  const toggleOverlay = useCallback(() => {
    setMobileOverlayOpen((prev) => !prev)
  }, [])

  // Quick-access nav items for the bottom bar
  const quickNavItems = [
    { label: 'Start', href: '/', icon: HomeIcon },
    { label: 'Programm', href: '/events/e-ventschau-2026', icon: Squares2X2Icon },
    { label: 'Events', href: '/events', icon: CalendarDaysIcon },
    { label: 'Rückschau', href: '/rueckschau', icon: BookOpenIcon },
    { label: 'Kontakt', href: '/kontakt', icon: EnvelopeIcon },
  ]

  return (
    <>
      {/* ─── Desktop + Mobile top header ─── */}
      <header className="sticky top-0 z-50 glass-strong">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8" aria-label="Hauptnavigation">
          <div className="flex items-center justify-between h-16 lg:h-18">
            <Link href="/" className="flex-shrink-0">
              {settings.logoMode === 'text' || (!settings.logoUrl && settings.logoMode !== 'image') ? (
                <span className="text-xl font-display font-bold text-brand-primary">
                  {settings.siteName}
                </span>
              ) : settings.logoUrl ? (
                <Image
                  src={settings.logoUrl}
                  alt={settings.siteName}
                  width={400}
                  height={100}
                  className="h-10 lg:h-12 w-auto max-w-[400px] object-contain"
                  priority
                />
              ) : (
                <span className="text-xl font-display font-bold text-brand-primary">
                  {settings.siteName}
                </span>
              )}
            </Link>

            {/* Desktop navigation */}
            <div className="hidden lg:flex items-center gap-0.5">
              {navigation.map((item) => (
                <div
                  key={item.id}
                  className="relative"
                  onMouseEnter={() => item.children?.length && setOpenDropdown(item.id)}
                  onMouseLeave={() => setOpenDropdown(null)}
                >
                  <Link
                    href={item.href}
                    className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-brand-text/80 hover:text-brand-text hover:bg-brand-bg-dark transition-all"
                    aria-current={pathname === item.href ? 'page' : undefined}
                    aria-expanded={item.children?.length ? openDropdown === item.id : undefined}
                    aria-haspopup={item.children?.length ? 'true' : undefined}
                  >
                    {item.label}
                    {item.children && item.children.length > 0 && (
                      <ChevronDownIcon
                        className={`w-3.5 h-3.5 transition-transform duration-200 ${
                          openDropdown === item.id ? 'rotate-180' : ''
                        }`}
                      />
                    )}
                  </Link>

                  {item.children && item.children.length > 0 && openDropdown === item.id && (
                    <div className="absolute top-full left-0 pt-2 z-50">
                      <div className="glass-strong rounded-sm py-2 min-w-[220px] animate-fade-in shadow-card-hover" role="menu">
                        {item.children.map((child) => (
                          <Link
                            key={child.id}
                            href={child.href}
                            className="block px-4 py-2.5 text-sm text-brand-text/80 hover:text-brand-text hover:bg-brand-bg-dark transition-colors"
                            role="menuitem"
                          >
                            {child.label}
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop CTA + dark mode */}
            <div className="hidden lg:flex items-center gap-3">
              <DarkModeToggle />
              <Link href="/unterstuetzung" className="btn-primary text-sm px-5 py-2.5">
                Spenden
              </Link>
            </div>

            {/* Mobile: only dark mode toggle in top header */}
            <div className="flex items-center lg:hidden">
              <DarkModeToggle />
            </div>
          </div>
        </nav>
      </header>

      {/* ─── Mobile bottom floating nav bar ─── */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-50 lg:hidden flex justify-center px-4 transition-transform duration-300 ${
          bottomBarVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
        style={{ paddingBottom: `max(env(safe-area-inset-bottom, 0px), 1rem)` }}
      >
        <nav className="glass-strong rounded-full px-2 py-2 flex items-center gap-1 shadow-card-hover">
          {quickNavItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={isActive ? 'page' : undefined}
                className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-200 ${
                  isActive
                    ? 'bg-brand-accent/10 text-brand-accent'
                    : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-bg-dark'
                }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-[10px] leading-tight mt-0.5 font-medium">{item.label}</span>
              </Link>
            )
          })}

          {/* Menu button */}
          <button
            ref={menuButtonRef}
            onClick={toggleOverlay}
            className={`flex flex-col items-center justify-center w-14 h-14 rounded-full transition-all duration-200 ${
              mobileOverlayOpen
                ? 'bg-brand-accent/10 text-brand-accent'
                : 'text-brand-text-muted hover:text-brand-text hover:bg-brand-bg-dark'
            }`}
            aria-label={mobileOverlayOpen ? 'Menü schließen' : 'Menü öffnen'}
            aria-expanded={mobileOverlayOpen}
            aria-controls="mobile-nav-dialog"
          >
            {mobileOverlayOpen ? (
              <XMarkIcon className="w-5 h-5" />
            ) : (
              <Bars3Icon className="w-5 h-5" />
            )}
            <span className="text-[10px] leading-tight mt-0.5 font-medium">Menü</span>
          </button>
        </nav>
      </div>

      {/* ─── Mobile full-screen overlay ─── */}
      {mobileOverlayOpen && (
        <div
          ref={overlayRef}
          id="mobile-nav-dialog"
          className="fixed inset-0 z-40 lg:hidden animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          {/* Backdrop — fully opaque so page content is never visible behind the menu */}
          <div
            className="absolute inset-0 bg-brand-bg"
            onClick={toggleOverlay}
            aria-hidden="true"
          />

          {/* Overlay content */}
          <div className="relative z-10 h-full overflow-y-auto px-6 pt-24 pb-32">
            <button
              type="button"
              onClick={toggleOverlay}
              aria-label="Menü schließen"
              className="absolute top-5 right-5 z-20 flex items-center justify-center w-11 h-11 rounded-sm text-brand-text-muted hover:text-brand-text hover:bg-brand-bg-dark transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
            <div className="max-w-sm mx-auto space-y-1">
              {navigation.map((item) => (
                <div key={item.id}>
                  <div className="flex items-center justify-between">
                    <Link
                      href={item.href}
                      className={`flex-1 px-4 py-3.5 text-lg font-medium rounded-sm transition-colors ${
                        pathname === item.href
                          ? 'text-brand-accent bg-brand-accent/10'
                          : 'text-brand-text'
                      }`}
                      onClick={() => {
                        if (!item.children?.length) setMobileOverlayOpen(false)
                      }}
                    >
                      {item.label}
                    </Link>
                    {item.children && item.children.length > 0 && (
                      <button
                        onClick={() =>
                          setOpenDropdown(openDropdown === item.id ? null : item.id)
                        }
                        className="p-3 rounded-sm hover:bg-brand-bg-dark transition-colors"
                        aria-label={`${item.label} Untermenü`}
                      >
                        <ChevronDownIcon
                          className={`w-5 h-5 text-brand-text-muted transition-transform duration-200 ${
                            openDropdown === item.id ? 'rotate-180' : ''
                          }`}
                        />
                      </button>
                    )}
                  </div>
                  {item.children && item.children.length > 0 && openDropdown === item.id && (
                    <div className="pl-4 py-1 animate-fade-in">
                      {item.children.map((child) => (
                        <Link
                          key={child.id}
                          href={child.href}
                          className={`block px-4 py-2.5 text-base rounded-lg transition-colors ${
                            pathname === child.href
                              ? 'text-brand-accent'
                              : 'text-brand-text-muted hover:text-brand-text'
                          }`}
                          onClick={() => setMobileOverlayOpen(false)}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ))}

              {/* CTA button */}
              <div className="pt-6">
                <Link
                  href="/unterstuetzung"
                  className="btn-primary text-base w-full text-center block"
                  onClick={() => setMobileOverlayOpen(false)}
                >
                  Spenden
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
