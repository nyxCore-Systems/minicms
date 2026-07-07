'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  SparklesIcon,
  ShieldCheckIcon,
  CubeIcon,
  InformationCircleIcon,
  BuildingStorefrontIcon,
  QuestionMarkCircleIcon,
  MegaphoneIcon,
  RectangleGroupIcon,
  FilmIcon,
  PhotoIcon,
  DocumentTextIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilSquareIcon,
  TrashIcon,
  PlusIcon,
  ArrowPathIcon,
  SwatchIcon,
  ClockIcon,
  Bars3Icon,
} from '@heroicons/react/24/outline'
import HelpButton from '@/components/admin/HelpButton'
import MarkdownEditorField from '@/components/admin/MarkdownEditorField'
import type { TElement } from '@udecode/plate'
import { sectionContentToValue, valueToSectionContent, type EditorMode } from '@/lib/contentEditor'
import {
  DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, verticalListSortingStrategy, useSortable, sortableKeyboardCoordinates, arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { orderSlots, CATEGORY_LABELS, SLOT_CATEGORIES, LINEUP_DEFAULT_CATEGORIES, type LineupSlot } from '@/lib/lineup'
import { NOIR_LINEUP_DEFAULTS } from '@/lib/noir-home-defaults'

// ---------------------------------------------------------------------------
// Types & Constants
// ---------------------------------------------------------------------------

const SECTION_TYPES = [
  // Festival-„Noir"-Elemente der Startseite (Live-Daten / eigenes Design)
  { value: 'noir_hero', label: 'Festival Hero', icon: SparklesIcon },
  { value: 'noir_marquee', label: 'Band-Laufschrift', icon: Bars3Icon },
  { value: 'noir_lineup', label: 'Line-up', icon: RectangleGroupIcon },
  { value: 'noir_timetable', label: 'Timetable', icon: ClockIcon },
  { value: 'noir_manifest', label: 'Manifest', icon: DocumentTextIcon },
  { value: 'noir_donate', label: 'Spenden', icon: MegaphoneIcon },
  // Generische Bausteine
  { value: 'hero', label: 'Hero Banner', icon: SparklesIcon },
  { value: 'trust', label: 'Trust Indicators', icon: ShieldCheckIcon },
  { value: 'showcase', label: 'Product Showcase', icon: CubeIcon },
  { value: 'info', label: 'Info Teaser', icon: InformationCircleIcon },
  { value: 'vendors', label: 'Vendor Showcase', icon: BuildingStorefrontIcon },
  { value: 'faq', label: 'FAQ', icon: QuestionMarkCircleIcon },
  { value: 'cta', label: 'CTA Form', icon: MegaphoneIcon },
  { value: 'content', label: 'Freitext / Markdown', icon: DocumentTextIcon },
  { value: 'slider', label: 'Slider', icon: RectangleGroupIcon },
  { value: 'ads_banner', label: 'Werbebanner', icon: PhotoIcon },
  { value: 'hero_slider', label: 'Hero Slider', icon: FilmIcon },
]

const HERO_SLIDER_VARIANTS = [
  { value: 'viewport', label: 'Vollbild (100vh)' },
  { value: 'full', label: 'Breit (60vh)' },
  { value: 'fitted', label: 'Zentriert (50vh)' },
]

const HERO_SLIDER_GRADIENTS = [
  { value: 'none', label: 'Kein Gradient' },
  { value: 'light', label: 'Leicht' },
  { value: 'dark', label: 'Dunkel' },
]

const BANNER_TYPE_OPTIONS = [
  { value: 'HOMEPAGE_SLIDER', label: 'Homepage Slider' },
  { value: 'HOMEPAGE_FIXED', label: 'Homepage Fixed' },
  { value: 'CONTENT_FIXED_WIDE', label: 'Content Breit' },
  { value: 'CONTENT_FIXED_TALL', label: 'Content Hoch' },
]

const ANIMATION_OPTIONS = [
  { value: 'none', label: 'Keine' },
  { value: 'fade', label: 'Einblenden' },
  { value: 'slide-left', label: 'Von links' },
  { value: 'slide-right', label: 'Von rechts' },
  { value: 'slide-up', label: 'Von unten' },
  { value: 'slide-down', label: 'Von oben' },
  { value: 'zoom', label: 'Zoom' },
]

interface HeroSlideForm {
  image: string
  heading: string
  description: string
  button: string
  href: string
}

interface HeroButtonForm {
  label: string
  href: string
  variant: 'primary' | 'secondary'
}

interface HeroStatForm {
  label: string
  sublabel: string
}

interface TrustItemForm {
  label: string
  sublabel: string
}

interface FaqItemForm {
  question: string
  answer: string
}

interface InfoLinkForm {
  label: string
  href: string
}

interface InfoCardForm {
  emoji: string
  label: string
  sublabel: string
}

// Noir homepage element forms
interface NoirButtonForm {
  label: string
  href: string
  variant: 'primary' | 'secondary'
}

interface NoirTileForm {
  label: string
  value: string
}

interface NoirStatForm {
  value: string
  label: string
}

interface NoirChipForm {
  value: string
}

interface Section {
  id: string
  type: string
  title: string | null
  subtitle: string | null
  content: unknown
  config: unknown
  sortOrder: number
  isVisible: boolean
  createdAt: string
  updatedAt: string
}

interface SliderData {
  id: string
  name: string
  slug: string
  itemType: string
  isActive: boolean
  config: Record<string, unknown> | null
  filterMode: string
  filterTags: string[]
  filterCategoryIds: string[]
  filterVendorIds: string[]
  maxItems: number | null
  sortBy: string
  sponsorVendorId: string | null
  costPerMille: number | null
  impressionTarget: number | null
  impressions: number
  clicks: number
  items: unknown[]
  sponsorVendor: { id: string; name: string } | null
}

// ---------------------------------------------------------------------------
// Shared class strings
// ---------------------------------------------------------------------------

const glassCard =
  'glass rounded-xl'
const glassFormArea =
  'glass rounded-xl p-6 mb-6 shadow-lg'
const glassListItem =
  'glass rounded-xl p-4 flex flex-wrap items-center gap-4 hover:shadow-md transition-all'
const inputClass =
  'input-glass rounded-lg px-3 py-2 text-sm'
const labelClass = 'block text-sm font-medium text-brand-text/80 mb-1'

// ---------------------------------------------------------------------------
// Helper: get section type metadata
// ---------------------------------------------------------------------------

function getSectionMeta(type: string) {
  return SECTION_TYPES.find((t) => t.value === type) || { value: type, label: type, icon: RectangleGroupIcon }
}

// ---------------------------------------------------------------------------
// Helper: format relative time
// ---------------------------------------------------------------------------

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  if (diffMin < 1) return 'gerade eben'
  if (diffMin < 60) return `vor ${diffMin} Min.`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `vor ${diffHours} Std.`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) return `vor ${diffDays} Tag${diffDays > 1 ? 'en' : ''}`
  return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

// ---------------------------------------------------------------------------
// Sub-component: Dynamic List (add / remove items)
// ---------------------------------------------------------------------------

function DynamicList<T>({
  items,
  onChange,
  renderItem,
  newItem,
  addLabel,
}: {
  items: T[]
  onChange: (items: T[]) => void
  renderItem: (item: T, index: number, update: (val: T) => void) => React.ReactNode
  newItem: () => T
  addLabel: string
}) {
  return (
    <div className="space-y-2">
      {items.map((item, idx) => (
        <div key={idx} className="glass rounded-lg p-3 relative">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-brand-text-muted">
              #{idx + 1}
            </span>
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                className="text-xs text-red-500 hover:text-red-700"
              >
                Entfernen
              </button>
            )}
          </div>
          {renderItem(item, idx, (val) => {
            const updated = [...items]
            updated[idx] = val
            onChange(updated)
          })}
        </div>
      ))}
      <button
        type="button"
        onClick={() => onChange([...items, newItem()])}
        className="inline-flex items-center gap-1 text-xs text-brand-accent hover:text-brand-accent/80 font-medium"
      >
        <PlusIcon className="w-3.5 h-3.5" />
        {addLabel}
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-component: Info Box (for showcase/vendors)
// ---------------------------------------------------------------------------

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="backdrop-blur-md bg-blue-50/60 border border-blue-200/40 rounded-lg p-4 text-sm text-blue-800">
      <InformationCircleIcon className="w-5 h-5 inline-block mr-1.5 -mt-0.5" />
      {children}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-component: Slider Picker (used by both 'slider' and 'hero_slider' types)
// ---------------------------------------------------------------------------

function SliderPicker({
  sliders,
  loadingSliders,
  selectedSlug,
  onSelect,
}: {
  sliders: SliderData[]
  loadingSliders: boolean
  selectedSlug: string
  onSelect: (slug: string) => void
}) {
  const selected = sliders.find((s) => s.slug === selectedSlug)

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Slider aus Slider-Manager</label>
        {loadingSliders ? (
          <div className="flex items-center gap-2 text-sm text-brand-text-muted py-2">
            <ArrowPathIcon className="w-4 h-4 animate-spin" />
            Slider werden geladen...
          </div>
        ) : sliders.length === 0 ? (
          <div className="text-sm text-brand-text-muted glass rounded-lg px-3 py-2">
            Keine Slider vorhanden. Erstellen Sie zuerst einen Slider im{' '}
            <a href="/admin/sliders" className="text-brand-accent underline hover:no-underline">
              Slider-Manager
            </a>
            .
          </div>
        ) : (
          <select
            value={selectedSlug}
            onChange={(e) => onSelect(e.target.value)}
            className={inputClass}
          >
            <option value="">-- Slider auswaehlen --</option>
            {sliders.map((s) => (
              <option key={s.id} value={s.slug}>
                {s.name} ({s.itemType.toLowerCase()}, {s.items.length} Eintraege
                {!s.isActive ? ', inaktiv' : ''})
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Preview card for selected slider */}
      {selected && (
        <div className="backdrop-blur-md bg-brand-accent/5 border border-brand-accent/20 rounded-lg p-3 space-y-2">
          <div className="flex items-center gap-2">
            <SwatchIcon className="w-4 h-4 text-brand-accent" />
            <span className="text-sm font-semibold text-brand-text">{selected.name}</span>
            {!selected.isActive && (
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded-full font-medium">
                Inaktiv
              </span>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-brand-accent/10 text-brand-accent">
              {selected.itemType}
            </span>
            {selected.config && Boolean((selected.config as Record<string, unknown>).animation) && (
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-purple-100 text-purple-700">
                {String((selected.config as Record<string, unknown>).animation)}
              </span>
            )}
            {selected.config && Boolean((selected.config as Record<string, unknown>).layout) && (
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-blue-100 text-blue-700">
                Layout: {String((selected.config as Record<string, unknown>).layout)}
              </span>
            )}
            {selected.config && Boolean((selected.config as Record<string, unknown>).cardStyle) && (
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-green-100 text-green-700">
                Card: {String((selected.config as Record<string, unknown>).cardStyle)}
              </span>
            )}
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-brand-bg-dark text-brand-text-muted">
              {selected.items.length} Eintraege
            </span>
            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-brand-bg-dark text-brand-text-muted">
              Filter: {selected.filterMode}
            </span>
            {selected.sponsorVendor && (
              <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium rounded-full bg-amber-100 text-amber-700">
                Sponsor: {selected.sponsorVendor.name}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function AdminSectionsPage() {
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [importing, setImporting] = useState(false)

  // Sliders from Slider Manager
  const [sliders, setSliders] = useState<SliderData[]>([])
  const [loadingSliders, setLoadingSliders] = useState(false)

  // Form state — shared
  const [formType, setFormType] = useState('hero')
  const [formTitle, setFormTitle] = useState('')
  const [formSubtitle, setFormSubtitle] = useState('')
  const [formAnimation, setFormAnimation] = useState('none')
  const [formBgColor, setFormBgColor] = useState('')
  const [formContent, setFormContent] = useState('')    // JSON fallback
  const [formConfig, setFormConfig] = useState('')      // JSON fallback

  // Hero
  const [heroBadge, setHeroBadge] = useState('')
  const [heroImageUrl, setHeroImageUrl] = useState('')
  const [heroTitleHighlight, setHeroTitleHighlight] = useState('')
  const [heroTitleSuffix, setHeroTitleSuffix] = useState('')
  const [heroButtons, setHeroButtons] = useState<HeroButtonForm[]>([
    { label: '', href: '', variant: 'primary' },
  ])
  const [heroStats, setHeroStats] = useState<HeroStatForm[]>([
    { label: '', sublabel: '' },
  ])

  // Trust
  const [trustItems, setTrustItems] = useState<TrustItemForm[]>([
    { label: '', sublabel: '' },
  ])

  // Info
  const [infoLinks, setInfoLinks] = useState<InfoLinkForm[]>([
    { label: '', href: '' },
  ])
  const [infoCards, setInfoCards] = useState<InfoCardForm[]>([
    { emoji: '', label: '', sublabel: '' },
  ])

  // FAQ
  const [faqItems, setFaqItems] = useState<FaqItemForm[]>([
    { question: '', answer: '' },
  ])

  // CTA
  const [ctaSource, setCtaSource] = useState('homepage_cta')

  // Content (markdown)
  const [contentMarkdown, setContentMarkdown] = useState('')
  const [contentJson, setContentJson] = useState<TElement[]>([])
  const [contentEditorMode, setContentEditorMode] = useState<EditorMode>('markdown')

  // Slider-specific
  const [sliderSlug, setSliderSlug] = useState('')
  const [sliderType, setSliderType] = useState('')
  // Ads banner-specific
  const [bannerType, setBannerType] = useState('HOMEPAGE_FIXED')
  const [bannerId, setBannerId] = useState('')
  // Hero slider-specific
  const [heroSliderVariant, setHeroSliderVariant] = useState('viewport')
  const [heroSliderGradient, setHeroSliderGradient] = useState('none')
  const [heroSliderAnimate, setHeroSliderAnimate] = useState(true)
  const [heroSliderSlides, setHeroSliderSlides] = useState<HeroSlideForm[]>([
    { image: '', heading: '', description: '', button: '', href: '' },
  ])
  const [heroSliderMode, setHeroSliderMode] = useState<'manual' | 'slider'>('manual')
  const [heroSliderSlug, setHeroSliderSlug] = useState('')

  // Noir Hero
  const [noirHeroSubtitle, setNoirHeroSubtitle] = useState('')
  const [noirHeroButtons, setNoirHeroButtons] = useState<NoirButtonForm[]>([
    { label: '', href: '', variant: 'primary' },
  ])
  const [noirHeroTiles, setNoirHeroTiles] = useState<NoirTileForm[]>([{ label: '', value: '' }])
  // Noir Manifest
  const [noirManifestHeading, setNoirManifestHeading] = useState('')
  const [noirManifestText, setNoirManifestText] = useState('')
  const [noirManifestTextJson, setNoirManifestTextJson] = useState<TElement[]>([])
  const [noirManifestTextMode, setNoirManifestTextMode] = useState<EditorMode>('markdown')
  const [noirManifestStats, setNoirManifestStats] = useState<NoirStatForm[]>([{ value: '', label: '' }])
  // Noir Donate
  const [noirDonateLabel, setNoirDonateLabel] = useState('')
  const [noirDonateHeading, setNoirDonateHeading] = useState('')
  const [noirDonateText, setNoirDonateText] = useState('')
  const [noirDonateTextJson, setNoirDonateTextJson] = useState<TElement[]>([])
  const [noirDonateTextMode, setNoirDonateTextMode] = useState<EditorMode>('markdown')
  const [noirDonateChips, setNoirDonateChips] = useState<NoirChipForm[]>([{ value: '' }])
  const [noirDonateCtaLabel, setNoirDonateCtaLabel] = useState('')
  const [noirDonateCtaHref, setNoirDonateCtaHref] = useState('')
  const [noirDonateCardHeading, setNoirDonateCardHeading] = useState('')
  const [noirDonateCardSubtext, setNoirDonateCardSubtext] = useState('')
  const [noirDonateRaised, setNoirDonateRaised] = useState('')
  const [noirDonateTarget, setNoirDonateTarget] = useState('')
  // Noir Line-up
  const [noirLineupCategories, setNoirLineupCategories] = useState<string[]>(LINEUP_DEFAULT_CATEGORIES)
  const [noirLineupOrder, setNoirLineupOrder] = useState<string[]>([])
  const [noirLineupSlots, setNoirLineupSlots] = useState<LineupSlot[]>([])
  const [noirLineupHeading, setNoirLineupHeading] = useState('')

  const lineupSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const fetchSections = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sections')
      if (!res.ok) throw new Error('Fehler beim Laden')
      const data = await res.json()
      setSections(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Laden')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSliders = useCallback(async () => {
    setLoadingSliders(true)
    try {
      const res = await fetch('/api/admin/sliders')
      if (!res.ok) throw new Error('Fehler beim Laden der Slider')
      const data = await res.json()
      setSliders(data)
    } catch {
      // Silently fail — slider dropdown will show empty state
    } finally {
      setLoadingSliders(false)
    }
  }, [])

  useEffect(() => {
    fetchSections()
    fetchSliders()
  }, [fetchSections, fetchSliders])

  useEffect(() => {
    if ((showAddForm || editingId) && (formType === 'slider' || formType === 'hero_slider')) {
      fetchSliders()
    }
  }, [showAddForm, editingId, formType, fetchSliders])

  // Line-up preview — reloads when the category filter (or manual order) changes.
  useEffect(() => {
    if (formType !== 'noir_lineup') return
    let ignore = false
    const qs = noirLineupCategories.join(',')
    fetch(`/api/admin/lineup/preview?categories=${encodeURIComponent(qs)}`)
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((d) => { if (!ignore) setNoirLineupSlots(orderSlots(d.slots ?? [], noirLineupOrder)) })
      .catch(() => { if (!ignore) setNoirLineupSlots([]) })
    return () => { ignore = true }
  }, [formType, noirLineupCategories]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // Form helpers
  // ---------------------------------------------------------------------------

  function resetForm() {
    setFormType('hero')
    setFormTitle('')
    setFormSubtitle('')
    setFormAnimation('none')
    setFormBgColor('')
    setFormContent('')
    setFormConfig('')
    // Hero
    setHeroBadge('')
    setHeroImageUrl('')
    setHeroTitleHighlight('')
    setHeroTitleSuffix('')
    setHeroButtons([{ label: '', href: '', variant: 'primary' }])
    setHeroStats([{ label: '', sublabel: '' }])
    // Trust
    setTrustItems([{ label: '', sublabel: '' }])
    // Info
    setInfoLinks([{ label: '', href: '' }])
    setInfoCards([{ emoji: '', label: '', sublabel: '' }])
    // FAQ
    setFaqItems([{ question: '', answer: '' }])
    // CTA
    setCtaSource('homepage_cta')
    // Content
    setContentMarkdown('')
    setContentJson([])
    setContentEditorMode('markdown')

    // Slider
    setSliderSlug('')
    setSliderType('')
    // Ads banner
    setBannerType('HOMEPAGE_FIXED')
    setBannerId('')
    // Hero slider
    setHeroSliderVariant('viewport')
    setHeroSliderGradient('none')
    setHeroSliderAnimate(true)
    setHeroSliderSlides([{ image: '', heading: '', description: '', button: '', href: '' }])
    setHeroSliderMode('manual')
    setHeroSliderSlug('')
    // Noir Hero
    setNoirHeroSubtitle('')
    setNoirHeroButtons([{ label: '', href: '', variant: 'primary' }])
    setNoirHeroTiles([{ label: '', value: '' }])
    // Noir Manifest
    setNoirManifestHeading('')
    setNoirManifestText('')
    setNoirManifestTextJson([])
    setNoirManifestTextMode('markdown')
    setNoirManifestStats([{ value: '', label: '' }])
    // Noir Donate
    setNoirDonateLabel('')
    setNoirDonateHeading('')
    setNoirDonateText('')
    setNoirDonateTextJson([])
    setNoirDonateTextMode('markdown')
    setNoirDonateChips([{ value: '' }])
    setNoirDonateCtaLabel('')
    setNoirDonateCtaHref('')
    setNoirDonateCardHeading('')
    setNoirDonateCardSubtext('')
    setNoirDonateRaised('')
    setNoirDonateTarget('')
    // Noir Line-up
    setNoirLineupCategories(LINEUP_DEFAULT_CATEGORIES)
    setNoirLineupOrder([])
    setNoirLineupSlots([])
    setNoirLineupHeading('')
    // UI
    setShowAddForm(false)
    setEditingId(null)
  }

  function startEdit(section: Section) {
    setEditingId(section.id)
    setFormType(section.type)
    setFormTitle(section.title || '')
    setFormSubtitle(section.subtitle || '')
    setShowAddForm(false)

    const content = section.content as Record<string, unknown> | null
    const config = section.config as Record<string, unknown> | null

    // Animation from config (shared across all section types)
    setFormAnimation((config?.animation as string) || 'none')
    setFormBgColor((config?.bgColor as string) || '')

    if (section.type === 'hero') {
      setHeroBadge((content?.badge as string) || '')
      setHeroImageUrl((content?.imageUrl as string) || '')
      setHeroTitleHighlight((content?.titleHighlight as string) || '')
      setHeroTitleSuffix((content?.titleSuffix as string) || '')
      const buttons = (content?.buttons as HeroButtonForm[]) || []
      setHeroButtons(buttons.length > 0 ? buttons : [{ label: '', href: '', variant: 'primary' }])
      const stats = (content?.stats as HeroStatForm[]) || []
      setHeroStats(stats.length > 0 ? stats : [{ label: '', sublabel: '' }])
      setFormContent('')
      setFormConfig(section.config ? JSON.stringify(section.config, null, 2) : '')
    } else if (section.type === 'trust') {
      const items = (content?.items as TrustItemForm[]) || []
      setTrustItems(items.length > 0 ? items : [{ label: '', sublabel: '' }])
      setFormContent('')
      setFormConfig(section.config ? JSON.stringify(section.config, null, 2) : '')
    } else if (section.type === 'info') {
      const links = (content?.links as InfoLinkForm[]) || []
      setInfoLinks(links.length > 0 ? links : [{ label: '', href: '' }])
      const cards = (content?.cards as InfoCardForm[]) || []
      setInfoCards(cards.length > 0 ? cards : [{ emoji: '', label: '', sublabel: '' }])
      setFormContent('')
      setFormConfig(section.config ? JSON.stringify(section.config, null, 2) : '')
    } else if (section.type === 'faq') {
      const items = (content?.items as FaqItemForm[]) || []
      setFaqItems(items.length > 0 ? items : [{ question: '', answer: '' }])
      setFormContent('')
      setFormConfig(section.config ? JSON.stringify(section.config, null, 2) : '')
    } else if (section.type === 'cta') {
      setCtaSource((content?.source as string) || 'homepage_cta')
      setFormContent('')
      setFormConfig(section.config ? JSON.stringify(section.config, null, 2) : '')
    } else if (section.type === 'content') {
      const cv = sectionContentToValue(content)
      setContentMarkdown(cv.markdown)
      setContentJson(cv.contentJson)
      setContentEditorMode(cv.editorMode)

      setFormContent('')
      setFormConfig(section.config ? JSON.stringify(section.config, null, 2) : '')
    } else if (section.type === 'showcase' || section.type === 'vendors') {
      // These only use title/subtitle; content comes from DB
      setFormContent('')
      setFormConfig(section.config ? JSON.stringify(section.config, null, 2) : '')
    } else if (section.type === 'slider') {
      setSliderSlug((content?.sliderSlug as string) || '')
      setSliderType((content?.sliderType as string) || '')
      setFormContent('')
      setFormConfig(section.config ? JSON.stringify(section.config, null, 2) : '')
    } else if (section.type === 'ads_banner') {
      setBannerType((content?.bannerType as string) || 'HOMEPAGE_FIXED')
      setBannerId((content?.bannerId as string) || '')
      setFormContent('')
      setFormConfig(section.config ? JSON.stringify(section.config, null, 2) : '')
    } else if (section.type === 'hero_slider') {
      const useSliderManager = content?.useSliderManager as boolean | undefined
      if (useSliderManager) {
        setHeroSliderMode('slider')
        setHeroSliderSlug((content?.sliderSlug as string) || '')
        setHeroSliderSlides([{ image: '', heading: '', description: '', button: '', href: '' }])
      } else {
        setHeroSliderMode('manual')
        setHeroSliderSlug('')
        const slides = (content?.slides as HeroSlideForm[]) || []
        setHeroSliderSlides(
          slides.length > 0
            ? slides
            : [{ image: '', heading: '', description: '', button: '', href: '' }]
        )
      }
      setHeroSliderVariant((config?.variant as string) || 'viewport')
      setHeroSliderGradient((config?.gradient as string) || 'none')
      setHeroSliderAnimate(config?.animate !== false)
      setFormContent('')
      setFormConfig('')
    } else if (section.type === 'noir_hero') {
      setNoirHeroSubtitle((content?.subtitle as string) || '')
      const buttons = (content?.buttons as NoirButtonForm[]) || []
      setNoirHeroButtons(buttons.length > 0 ? buttons : [{ label: '', href: '', variant: 'primary' }])
      const tiles = (content?.tiles as NoirTileForm[]) || []
      setNoirHeroTiles(tiles.length > 0 ? tiles : [{ label: '', value: '' }])
      setFormContent('')
      setFormConfig('')
    } else if (section.type === 'noir_manifest') {
      setNoirManifestHeading((content?.heading as string) || '')
      setNoirManifestText((content?.text as string) || '')
      setNoirManifestTextJson([])
      setNoirManifestTextMode('markdown')
      const stats = (content?.stats as NoirStatForm[]) || []
      setNoirManifestStats(stats.length > 0 ? stats : [{ value: '', label: '' }])
      setFormContent('')
      setFormConfig('')
    } else if (section.type === 'noir_donate') {
      setNoirDonateLabel((content?.label as string) || '')
      setNoirDonateHeading((content?.heading as string) || '')
      setNoirDonateText((content?.text as string) || '')
      setNoirDonateTextJson([])
      setNoirDonateTextMode('markdown')
      const chips = (content?.chips as string[]) || []
      setNoirDonateChips(chips.length > 0 ? chips.map((c) => ({ value: c })) : [{ value: '' }])
      setNoirDonateCtaLabel((content?.ctaLabel as string) || '')
      setNoirDonateCtaHref((content?.ctaHref as string) || '')
      setNoirDonateCardHeading((content?.cardHeading as string) || '')
      setNoirDonateCardSubtext((content?.cardSubtext as string) || '')
      setNoirDonateRaised(content?.raised !== undefined ? String(content.raised) : '')
      setNoirDonateTarget(content?.target !== undefined ? String(content.target) : '')
      setFormContent('')
      setFormConfig('')
    } else if (section.type === 'noir_lineup') {
      const cats = Array.isArray(content?.categories) ? (content!.categories as string[]) : LINEUP_DEFAULT_CATEGORIES
      setNoirLineupCategories(cats)
      setNoirLineupOrder(Array.isArray(content?.order) ? (content!.order as string[]) : [])
      setNoirLineupHeading(typeof content?.heading === 'string' ? content.heading : '')
      setFormContent('')
      setFormConfig('')
    } else if (section.type === 'noir_marquee' || section.type === 'noir_timetable') {
      // Auto data from events/artists; only title/subtitle (already set above) apply.
      setFormContent('')
      setFormConfig('')
    } else {
      // Unknown type — fall back to JSON
      setFormContent(section.content ? JSON.stringify(section.content, null, 2) : '')
      setFormConfig(section.config ? JSON.stringify(section.config, null, 2) : '')
    }
  }

  // ---------------------------------------------------------------------------
  // Which types have structured forms (no JSON fallback needed)
  // ---------------------------------------------------------------------------

  const structuredTypes = [
    'hero', 'trust', 'info', 'faq', 'cta', 'content',
    'showcase', 'vendors',
    'slider', 'ads_banner', 'hero_slider',
    'noir_hero', 'noir_marquee', 'noir_lineup', 'noir_timetable', 'noir_manifest', 'noir_donate',
  ]

  // ---------------------------------------------------------------------------
  // Save
  // ---------------------------------------------------------------------------

  async function handleSave() {
    setSaving(true)
    setError(null)

    try {
      let parsedContent = null
      let parsedConfig = null

      // ---- Type-specific content builders ----
      if (formType === 'hero') {
        const filteredButtons = heroButtons.filter((b) => b.label.trim() && b.href.trim())
        const filteredStats = heroStats.filter((s) => s.label.trim())
        parsedContent = {
          ...(heroBadge.trim() ? { badge: heroBadge.trim() } : {}),
          title: formTitle || '',
          subtitle: formSubtitle || '',
          ...(heroTitleHighlight.trim() ? { titleHighlight: heroTitleHighlight.trim() } : {}),
          ...(heroTitleSuffix.trim() ? { titleSuffix: heroTitleSuffix.trim() } : {}),
          ...(heroImageUrl.trim() ? { imageUrl: heroImageUrl.trim() } : {}),
          ...(filteredButtons.length > 0 ? { buttons: filteredButtons } : {}),
          ...(filteredStats.length > 0 ? { stats: filteredStats } : {}),
        }
      } else if (formType === 'trust') {
        const filteredItems = trustItems.filter((i) => i.label.trim())
        parsedContent = { items: filteredItems }
      } else if (formType === 'info') {
        const filteredLinks = infoLinks.filter((l) => l.label.trim() && l.href.trim())
        const filteredCards = infoCards.filter((c) => c.label.trim())
        parsedContent = {
          ...(filteredLinks.length > 0 ? { links: filteredLinks } : {}),
          ...(filteredCards.length > 0 ? { cards: filteredCards } : {}),
        }
      } else if (formType === 'faq') {
        const filteredItems = faqItems.filter((i) => i.question.trim() && i.answer.trim())
        if (filteredItems.length === 0) throw new Error('Mindestens eine Frage mit Antwort erforderlich')
        parsedContent = { items: filteredItems }
      } else if (formType === 'cta') {
        parsedContent = { source: ctaSource.trim() || 'homepage_cta' }
      } else if (formType === 'content') {
        if (!contentMarkdown.trim()) throw new Error('Markdown-Inhalt darf nicht leer sein')
        parsedContent = valueToSectionContent({
          markdown: contentMarkdown,
          contentJson,
          // never persist 'preview' — it is a transient view
          editorMode: contentEditorMode === 'preview' ? 'markdown' : contentEditorMode,
        })
      } else if (formType === 'showcase' || formType === 'vendors') {
        // Content comes from DB — send null (preserve any existing content)
        parsedContent = null
      } else if (formType === 'slider') {
        parsedContent = {
          ...(sliderSlug ? { sliderSlug } : {}),
          ...(sliderType ? { sliderType } : {}),
        }
      } else if (formType === 'ads_banner') {
        parsedContent = {
          bannerType,
          ...(bannerId ? { bannerId } : {}),
        }
      } else if (formType === 'hero_slider') {
        if (heroSliderMode === 'slider') {
          if (!heroSliderSlug) throw new Error('Bitte einen Slider auswaehlen')
          parsedContent = { sliderSlug: heroSliderSlug, useSliderManager: true }
        } else {
          const validSlides = heroSliderSlides.filter((s) => s.image.trim())
          if (validSlides.length === 0)
            throw new Error('Mindestens ein Slide mit Bild-URL ist erforderlich')
          parsedContent = { slides: validSlides }
        }
        parsedConfig = { variant: heroSliderVariant, gradient: heroSliderGradient, animate: heroSliderAnimate }
      } else if (formType === 'noir_hero') {
        const filteredButtons = noirHeroButtons.filter((b) => b.label.trim() && b.href.trim())
        const filteredTiles = noirHeroTiles.filter((t) => t.label.trim() && t.value.trim())
        parsedContent = {
          ...(noirHeroSubtitle.trim() ? { subtitle: noirHeroSubtitle.trim() } : {}),
          ...(filteredButtons.length > 0 ? { buttons: filteredButtons } : {}),
          ...(filteredTiles.length > 0 ? { tiles: filteredTiles } : {}),
        }
      } else if (formType === 'noir_manifest') {
        const filteredStats = noirManifestStats.filter((s) => s.value.trim() || s.label.trim())
        parsedContent = {
          ...(noirManifestHeading.trim() ? { heading: noirManifestHeading.trim() } : {}),
          ...(noirManifestText.trim() ? { text: noirManifestText.trim() } : {}),
          ...(filteredStats.length > 0 ? { stats: filteredStats } : {}),
        }
      } else if (formType === 'noir_donate') {
        const filteredChips = noirDonateChips.map((c) => c.value.trim()).filter(Boolean)
        const raisedNum = parseInt(noirDonateRaised, 10)
        const targetNum = parseInt(noirDonateTarget, 10)
        parsedContent = {
          ...(noirDonateLabel.trim() ? { label: noirDonateLabel.trim() } : {}),
          ...(noirDonateHeading.trim() ? { heading: noirDonateHeading.trim() } : {}),
          ...(noirDonateText.trim() ? { text: noirDonateText.trim() } : {}),
          ...(filteredChips.length > 0 ? { chips: filteredChips } : {}),
          ...(noirDonateCtaLabel.trim() ? { ctaLabel: noirDonateCtaLabel.trim() } : {}),
          ...(noirDonateCtaHref.trim() ? { ctaHref: noirDonateCtaHref.trim() } : {}),
          ...(noirDonateCardHeading.trim() ? { cardHeading: noirDonateCardHeading.trim() } : {}),
          ...(noirDonateCardSubtext.trim() ? { cardSubtext: noirDonateCardSubtext.trim() } : {}),
          ...(Number.isFinite(raisedNum) ? { raised: raisedNum } : {}),
          ...(Number.isFinite(targetNum) ? { target: targetNum } : {}),
        }
      } else if (formType === 'noir_lineup') {
        parsedContent = {
          categories: noirLineupCategories,
          order: noirLineupOrder,
          ...(noirLineupHeading.trim() ? { heading: noirLineupHeading.trim() } : {}),
        }
      } else if (formType === 'noir_marquee' || formType === 'noir_timetable') {
        // Live data from events/artists; heading/intro carried by title/subtitle.
        parsedContent = null
      } else if (formContent.trim()) {
        // JSON fallback for unknown types
        try {
          parsedContent = JSON.parse(formContent)
        } catch {
          throw new Error('Content muss gueltiges JSON sein')
        }
      }

      // Config: hero_slider sets it above; structured types skip it; fallback parses JSON
      if (formType !== 'hero_slider' && formConfig.trim()) {
        try {
          parsedConfig = JSON.parse(formConfig)
        } catch {
          throw new Error('Config muss gueltiges JSON sein')
        }
      }

      // Merge animation into config (all section types)
      if (formAnimation && formAnimation !== 'none') {
        parsedConfig = { ...(parsedConfig || {}), animation: formAnimation }
      } else if (parsedConfig && typeof parsedConfig === 'object') {
        // Remove animation key if set to 'none'
        const { animation: _, ...rest } = parsedConfig as Record<string, unknown>
        parsedConfig = Object.keys(rest).length > 0 ? rest : null
      }

      // Merge bgColor into config (all section types)
      if (formBgColor.trim()) {
        parsedConfig = { ...(parsedConfig || {}), bgColor: formBgColor.trim() }
      } else if (parsedConfig && typeof parsedConfig === 'object') {
        const { bgColor: _, ...rest } = parsedConfig as Record<string, unknown>
        parsedConfig = Object.keys(rest).length > 0 ? rest : null
      }

      if (editingId) {
        const res = await fetch('/api/admin/sections', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: editingId,
            title: formTitle || null,
            subtitle: formSubtitle || null,
            content: parsedContent,
            config: parsedConfig,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Fehler beim Speichern')
        }
      } else {
        const maxOrder = sections.reduce((max, s) => Math.max(max, s.sortOrder), -1)
        const res = await fetch('/api/admin/sections', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: formType,
            title: formTitle || null,
            subtitle: formSubtitle || null,
            content: parsedContent,
            config: parsedConfig,
            sortOrder: maxOrder + 1,
          }),
        })
        if (!res.ok) {
          const data = await res.json()
          throw new Error(data.error || 'Fehler beim Erstellen')
        }
      }

      resetForm()
      await fetchSections()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    } finally {
      setSaving(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Delete / Visibility / Reorder
  // ---------------------------------------------------------------------------

  async function handleDelete(id: string) {
    if (!confirm('Diese Sektion wirklich loeschen?')) return

    setError(null)
    try {
      const res = await fetch('/api/admin/sections', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Loeschen')
      }
      await fetchSections()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Loeschen')
    }
  }

  async function toggleVisibility(section: Section) {
    try {
      const res = await fetch('/api/admin/sections', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: section.id, isVisible: !section.isVisible }),
      })
      if (!res.ok) throw new Error('Fehler')
      await fetchSections()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler')
    }
  }

  async function moveSection(id: string, direction: 'up' | 'down') {
    const idx = sections.findIndex((s) => s.id === id)
    if (idx === -1) return
    if (direction === 'up' && idx === 0) return
    if (direction === 'down' && idx === sections.length - 1) return

    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    const reordered = sections.map((s, i) => {
      if (i === idx) return { id: s.id, sortOrder: sections[swapIdx].sortOrder }
      if (i === swapIdx) return { id: s.id, sortOrder: sections[idx].sortOrder }
      return { id: s.id, sortOrder: s.sortOrder }
    })

    try {
      const res = await fetch('/api/admin/sections/reorder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sections: reordered }),
      })
      if (!res.ok) throw new Error('Fehler beim Sortieren')
      await fetchSections()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Sortieren')
    }
  }

  async function importHomepage() {
    if (
      !confirm(
        'Aktuelle Startseite als bearbeitbare Elemente anlegen?\n(Hero, Band-Laufschrift, Line-up, Timetable, Manifest, Spenden)'
      )
    )
      return
    setImporting(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/sections/import-homepage', { method: 'POST' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Import fehlgeschlagen')
      }
      await fetchSections()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Import fehlgeschlagen')
    } finally {
      setImporting(false)
    }
  }

  // ---------------------------------------------------------------------------
  // Section list detail helpers
  // ---------------------------------------------------------------------------

  function getSectionDetail(section: Section): string | null {
    const content = section.content as Record<string, unknown> | null
    if (!content) return null

    if (section.type === 'hero') {
      const buttons = (content.buttons as unknown[]) || []
      const stats = (content.stats as unknown[]) || []
      const parts: string[] = []
      if (buttons.length > 0) parts.push(`${buttons.length} Button${buttons.length !== 1 ? 's' : ''}`)
      if (stats.length > 0) parts.push(`${stats.length} Stats`)
      return parts.length > 0 ? parts.join(', ') : null
    }

    if (section.type === 'trust') {
      const items = (content.items as unknown[]) || []
      return items.length > 0 ? `${items.length} Elemente` : null
    }

    if (section.type === 'info') {
      const links = (content.links as unknown[]) || []
      const cards = (content.cards as unknown[]) || []
      const parts: string[] = []
      if (links.length > 0) parts.push(`${links.length} Links`)
      if (cards.length > 0) parts.push(`${cards.length} Karten`)
      return parts.length > 0 ? parts.join(', ') : null
    }

    if (section.type === 'faq') {
      const items = (content.items as unknown[]) || []
      return items.length > 0 ? `${items.length} Fragen` : null
    }

    if (section.type === 'cta') {
      return content.source ? `Source: ${content.source}` : null
    }

    if (section.type === 'content') {
      const md = (content.markdown as string) || ''
      if (!md) return null
      const stripped = md.replace(/[#*_`\[\]()>\-]/g, '').trim()
      return stripped.length > 60 ? stripped.slice(0, 60) + '...' : stripped
    }

    if (section.type === 'slider') {
      if (content.sliderSlug) {
        const linked = sliders.find((s) => s.slug === content.sliderSlug)
        if (linked) return `Slider: ${linked.name}`
        return `Slug: ${content.sliderSlug}`
      }
      if (content.sliderType) return `Typ: ${content.sliderType}`
    }

    if (section.type === 'hero_slider') {
      if (content.useSliderManager && content.sliderSlug) {
        const linked = sliders.find((s) => s.slug === content.sliderSlug)
        if (linked) return `Slider: ${linked.name}`
        return `Slug: ${content.sliderSlug}`
      }
      const slides = content.slides as unknown[] | undefined
      if (slides) return `${slides.length} Slide${slides.length !== 1 ? 's' : ''}`
    }

    if (section.type === 'ads_banner') {
      return content.bannerType ? `Typ: ${content.bannerType}` : null
    }

    if (section.type === 'noir_hero') {
      const buttons = (content.buttons as unknown[]) || []
      const tiles = (content.tiles as unknown[]) || []
      const parts: string[] = []
      if (content.subtitle) parts.push('eigene Tagline')
      if (buttons.length > 0) parts.push(`${buttons.length} Buttons`)
      if (tiles.length > 0) parts.push(`${tiles.length} Kacheln`)
      return parts.length > 0 ? parts.join(', ') : null
    }

    if (section.type === 'noir_manifest') {
      const stats = (content.stats as unknown[]) || []
      return stats.length > 0 ? `${stats.length} Stats` : null
    }

    if (section.type === 'noir_donate') {
      if (content.raised !== undefined && content.target !== undefined) {
        return `Ziel: ${content.raised} / ${content.target} €`
      }
      return null
    }

    return null
  }

  function getSliderAnimationBadge(section: Section): string | null {
    const content = section.content as Record<string, unknown> | null
    if (!content) return null

    const slug = (content.sliderSlug as string) || null
    if (!slug) return null

    const linked = sliders.find((s) => s.slug === slug)
    if (!linked?.config) return null

    const config = linked.config as Record<string, unknown>
    return (config.animation as string) || null
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-accent" />
      </div>
    )
  }

  const isEditing = editingId !== null || showAddForm

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-display font-bold text-brand-text mb-1">
              Homepage Sektionen
            </h1>
            <HelpButton pageKey="sections" />
          </div>
          <p className="text-sm text-brand-text-muted">
            Startseite konfigurieren: Sektionen hinzufuegen, bearbeiten und sortieren.
          </p>
        </div>
        {!isEditing && (
          <div className="flex flex-wrap items-center gap-2">
            {sections.length === 0 && (
              <button
                onClick={importHomepage}
                disabled={importing}
                className="inline-flex items-center gap-1.5 px-4 py-2 glass text-brand-text rounded-xl text-sm font-medium hover:bg-brand-bg-dark transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                title="Aktuelle Startseite als bearbeitbare Elemente übernehmen"
              >
                <ArrowPathIcon className={`w-4 h-4 ${importing ? 'animate-spin' : ''}`} />
                Aktuelle Startseite übernehmen
              </button>
            )}
            <button
              onClick={() => {
                resetForm()
                setShowAddForm(true)
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-accent text-white rounded-xl text-sm font-medium hover:bg-brand-accent/90 shadow-lg shadow-brand-accent/20 transition-all"
            >
              <PlusIcon className="w-4 h-4" />
              Sektion hinzufuegen
            </button>
          </div>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="backdrop-blur-md bg-red-50/80 text-red-600 text-sm px-4 py-3 rounded-xl border border-red-200/40 mb-4">
          {error}
        </div>
      )}

      {/* ================================================================= */}
      {/* Add / Edit form                                                    */}
      {/* ================================================================= */}
      {isEditing && (
        <div className={glassFormArea}>
          <h2 className="text-lg font-semibold text-brand-text mb-4">
            {editingId ? 'Sektion bearbeiten' : 'Neue Sektion'}
          </h2>

          <div className="grid gap-4">
            {/* =========================================================== */}
            {/* Type selector — radio-card grid (only when creating)         */}
            {/* =========================================================== */}
            {!editingId && (
              <div>
                <label className={labelClass}>Typ</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                  {SECTION_TYPES.map((t) => {
                    const Icon = t.icon
                    const isSelected = formType === t.value
                    return (
                      <label
                        key={t.value}
                        className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-brand-accent bg-brand-accent/10 shadow-md'
                            : 'border-brand-border bg-brand-surface hover:border-brand-accent/40 hover:bg-brand-bg-dark'
                        }`}
                      >
                        <input
                          type="radio"
                          name="sectionType"
                          value={t.value}
                          checked={isSelected}
                          onChange={() => setFormType(t.value)}
                          className="sr-only"
                        />
                        <Icon className={`w-6 h-6 ${isSelected ? 'text-brand-accent' : 'text-brand-text-muted'}`} />
                        <span className={`text-xs font-medium text-center leading-tight ${isSelected ? 'text-brand-accent' : 'text-brand-text/70'}`}>
                          {t.label}
                        </span>
                      </label>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Title & subtitle (hidden for Noir elements using custom forms / auto data) */}
            {!['noir_marquee', 'noir_hero', 'noir_manifest', 'noir_donate'].includes(formType) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Titel</label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className={inputClass}
                  placeholder="Optionaler Titel"
                />
              </div>
              <div>
                <label className={labelClass}>Untertitel</label>
                <input
                  type="text"
                  value={formSubtitle}
                  onChange={(e) => setFormSubtitle(e.target.value)}
                  className={inputClass}
                  placeholder="Optionaler Untertitel"
                />
              </div>
            </div>
            )}

            {/* Animation picker (not for hero/hero_slider/Noir elements) */}
            {formType !== 'hero' && formType !== 'hero_slider' && !formType.startsWith('noir_') && (
              <div>
                <label className={labelClass}>Scroll-Animation</label>
                <select
                  value={formAnimation}
                  onChange={(e) => setFormAnimation(e.target.value)}
                  className={inputClass}
                >
                  {ANIMATION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-brand-text-muted mt-1">
                  Animation beim Scrollen in den sichtbaren Bereich
                </p>
              </div>
            )}

            {/* Background color picker (not for Noir elements — they bring their own bg) */}
            {!formType.startsWith('noir_') && (
            <div>
              <label className={labelClass}>Hintergrundfarbe</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formBgColor || '#ffffff'}
                  onChange={(e) => setFormBgColor(e.target.value)}
                  className="w-10 h-10 rounded-lg border border-brand-border cursor-pointer bg-transparent p-0.5"
                />
                <input
                  type="text"
                  value={formBgColor}
                  onChange={(e) => setFormBgColor(e.target.value)}
                  className={`${inputClass} flex-1`}
                  placeholder="#hex oder leer"
                />
                {formBgColor && (
                  <button
                    type="button"
                    onClick={() => setFormBgColor('')}
                    className="p-2 text-brand-text-muted hover:text-red-600 hover:bg-red-50/60 rounded-lg transition-all"
                    title="Zuruecksetzen"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                )}
              </div>
              <p className="text-xs text-brand-text-muted mt-1">
                Leer = Standard-Hintergrund des Themes
              </p>
            </div>
            )}

            {/* =========================================================== */}
            {/* Hero-specific fields                                         */}
            {/* =========================================================== */}
            {formType === 'hero' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Badge-Text</label>
                    <input
                      type="text"
                      value={heroBadge}
                      onChange={(e) => setHeroBadge(e.target.value)}
                      className={inputClass}
                      placeholder="z.B. Ihr Marktplatz fuer Messermanufakturen"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Bild-URL</label>
                    <input
                      type="text"
                      value={heroImageUrl}
                      onChange={(e) => setHeroImageUrl(e.target.value)}
                      className={inputClass}
                      placeholder="https://res.cloudinary.com/..."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Titel-Highlight</label>
                    <input
                      type="text"
                      value={heroTitleHighlight}
                      onChange={(e) => setHeroTitleHighlight(e.target.value)}
                      className={inputClass}
                      placeholder="Hervorgehobenes Wort"
                    />
                    <p className="text-xs text-brand-text-muted mt-1">
                      Wird farbig hervorgehoben im Titel
                    </p>
                  </div>
                  <div>
                    <label className={labelClass}>Titel-Suffix</label>
                    <input
                      type="text"
                      value={heroTitleSuffix}
                      onChange={(e) => setHeroTitleSuffix(e.target.value)}
                      className={inputClass}
                      placeholder="Text nach dem Highlight"
                    />
                  </div>
                </div>

                {/* Buttons */}
                <div>
                  <label className={labelClass}>Buttons</label>
                  <DynamicList
                    items={heroButtons}
                    onChange={setHeroButtons}
                    newItem={() => ({ label: '', href: '', variant: 'primary' as const })}
                    addLabel="Button hinzufuegen"
                    renderItem={(item, _idx, update) => (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => update({ ...item, label: e.target.value })}
                          className={inputClass}
                          placeholder="Label"
                        />
                        <input
                          type="text"
                          value={item.href}
                          onChange={(e) => update({ ...item, href: e.target.value })}
                          className={inputClass}
                          placeholder="Link (z.B. /messerwissen)"
                        />
                        <select
                          value={item.variant}
                          onChange={(e) => update({ ...item, variant: e.target.value as 'primary' | 'secondary' })}
                          className={inputClass}
                        >
                          <option value="primary">Primary</option>
                          <option value="secondary">Secondary</option>
                        </select>
                      </div>
                    )}
                  />
                </div>

                {/* Stats */}
                <div>
                  <label className={labelClass}>Statistiken</label>
                  <DynamicList
                    items={heroStats}
                    onChange={setHeroStats}
                    newItem={() => ({ label: '', sublabel: '' })}
                    addLabel="Statistik hinzufuegen"
                    renderItem={(item, _idx, update) => (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => update({ ...item, label: e.target.value })}
                          className={inputClass}
                          placeholder="Wert (z.B. 100+)"
                        />
                        <input
                          type="text"
                          value={item.sublabel}
                          onChange={(e) => update({ ...item, sublabel: e.target.value })}
                          className={inputClass}
                          placeholder="Beschreibung"
                        />
                      </div>
                    )}
                  />
                </div>
              </div>
            )}

            {/* =========================================================== */}
            {/* Trust-specific fields                                        */}
            {/* =========================================================== */}
            {formType === 'trust' && (
              <div>
                <label className={labelClass}>Trust-Elemente</label>
                <DynamicList
                  items={trustItems}
                  onChange={setTrustItems}
                  newItem={() => ({ label: '', sublabel: '' })}
                  addLabel="Element hinzufuegen"
                  renderItem={(item, _idx, update) => (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={item.label}
                        onChange={(e) => update({ ...item, label: e.target.value })}
                        className={inputClass}
                        placeholder="Wert (z.B. 100+)"
                      />
                      <input
                        type="text"
                        value={item.sublabel}
                        onChange={(e) => update({ ...item, sublabel: e.target.value })}
                        className={inputClass}
                        placeholder="Beschreibung"
                      />
                    </div>
                  )}
                />
              </div>
            )}

            {/* =========================================================== */}
            {/* Info-specific fields                                         */}
            {/* =========================================================== */}
            {formType === 'info' && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Links</label>
                  <DynamicList
                    items={infoLinks}
                    onChange={setInfoLinks}
                    newItem={() => ({ label: '', href: '' })}
                    addLabel="Link hinzufuegen"
                    renderItem={(item, _idx, update) => (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => update({ ...item, label: e.target.value })}
                          className={inputClass}
                          placeholder="Label"
                        />
                        <input
                          type="text"
                          value={item.href}
                          onChange={(e) => update({ ...item, href: e.target.value })}
                          className={inputClass}
                          placeholder="Link (z.B. /messerwissen)"
                        />
                      </div>
                    )}
                  />
                </div>
                <div>
                  <label className={labelClass}>Karten</label>
                  <DynamicList
                    items={infoCards}
                    onChange={setInfoCards}
                    newItem={() => ({ emoji: '', label: '', sublabel: '' })}
                    addLabel="Karte hinzufuegen"
                    renderItem={(item, _idx, update) => (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={item.emoji}
                          onChange={(e) => update({ ...item, emoji: e.target.value })}
                          className={inputClass}
                          placeholder="Emoji"
                        />
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => update({ ...item, label: e.target.value })}
                          className={inputClass}
                          placeholder="Label"
                        />
                        <input
                          type="text"
                          value={item.sublabel}
                          onChange={(e) => update({ ...item, sublabel: e.target.value })}
                          className={inputClass}
                          placeholder="Beschreibung"
                        />
                      </div>
                    )}
                  />
                </div>
              </div>
            )}

            {/* =========================================================== */}
            {/* FAQ-specific fields                                          */}
            {/* =========================================================== */}
            {formType === 'faq' && (
              <div>
                <label className={labelClass}>Fragen & Antworten</label>
                <DynamicList
                  items={faqItems}
                  onChange={setFaqItems}
                  newItem={() => ({ question: '', answer: '' })}
                  addLabel="Frage hinzufuegen"
                  renderItem={(item, _idx, update) => (
                    <div className="grid gap-2">
                      <input
                        type="text"
                        value={item.question}
                        onChange={(e) => update({ ...item, question: e.target.value })}
                        className={inputClass}
                        placeholder="Frage"
                      />
                      <textarea
                        value={item.answer}
                        onChange={(e) => update({ ...item, answer: e.target.value })}
                        rows={3}
                        className={inputClass}
                        placeholder="Antwort"
                      />
                    </div>
                  )}
                />
              </div>
            )}

            {/* =========================================================== */}
            {/* CTA-specific fields                                          */}
            {/* =========================================================== */}
            {formType === 'cta' && (
              <div>
                <label className={labelClass}>Source-Kennung</label>
                <input
                  type="text"
                  value={ctaSource}
                  onChange={(e) => setCtaSource(e.target.value)}
                  className={inputClass}
                  placeholder="homepage_cta"
                />
                <p className="text-xs text-brand-text-muted mt-1">
                  Wird intern zur Zuordnung der Anfrage verwendet (z.B. &quot;homepage_cta&quot;, &quot;footer_cta&quot;)
                </p>
              </div>
            )}

            {/* =========================================================== */}
            {/* Content (Markdown) fields                                    */}
            {/* =========================================================== */}
            {formType === 'content' && (
              <div>
                <MarkdownEditorField
                  value={contentMarkdown}
                  contentJson={contentJson}
                  editorMode={contentEditorMode}
                  onChange={(next) => {
                    setContentMarkdown(next.markdown)
                    setContentJson(next.contentJson)
                    setContentEditorMode(next.editorMode)
                  }}
                  label="Markdown-Inhalt"
                  placeholder="# Ueberschrift&#10;&#10;Ihr Markdown-Inhalt hier..."
                  minHeight={250}
                />
              </div>
            )}

            {/* =========================================================== */}
            {/* Showcase info box                                            */}
            {/* =========================================================== */}
            {formType === 'showcase' && (
              <InfoBox>
                Produktdaten kommen automatisch aus der Datenbank. Hier koennen Sie nur Titel und Untertitel anpassen.
              </InfoBox>
            )}

            {/* =========================================================== */}
            {/* Vendors info box                                             */}
            {/* =========================================================== */}
            {formType === 'vendors' && (
              <InfoBox>
                Haendlerdaten kommen automatisch aus der Datenbank. Hier koennen Sie nur Titel und Untertitel anpassen.
              </InfoBox>
            )}

            {/* =========================================================== */}
            {/* Slider-specific fields                                       */}
            {/* =========================================================== */}
            {formType === 'slider' && (
              <div className="space-y-4">
                <SliderPicker
                  sliders={sliders}
                  loadingSliders={loadingSliders}
                  selectedSlug={sliderSlug}
                  onSelect={(slug) => {
                    setSliderSlug(slug)
                    if (slug) setSliderType('')
                  }}
                />

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-brand-border" />
                  </div>
                  <div className="relative flex justify-center">
                    <span className="bg-brand-bg px-3 text-xs text-brand-text-muted rounded-full">
                      oder
                    </span>
                  </div>
                </div>

                <div>
                  <label className={labelClass}>Slider-Typ (Auto-Slider)</label>
                  <select
                    value={sliderType}
                    onChange={(e) => {
                      setSliderType(e.target.value)
                      if (e.target.value) setSliderSlug('')
                    }}
                    className={inputClass}
                  >
                    <option value="">-- Kein Typ --</option>
                    <option value="product">Produkte (Featured)</option>
                    <option value="vendor">Haendler (Featured)</option>
                    <option value="page">Seiten (Featured)</option>
                  </select>
                  <p className="text-xs text-brand-text-muted mt-1">
                    Automatisch aus Featured-Eintraegen generiert
                  </p>
                </div>
              </div>
            )}

            {/* =========================================================== */}
            {/* Ads Banner-specific fields                                   */}
            {/* =========================================================== */}
            {formType === 'ads_banner' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Banner-Typ</label>
                  <select
                    value={bannerType}
                    onChange={(e) => setBannerType(e.target.value)}
                    className={inputClass}
                  >
                    {BANNER_TYPE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Banner-ID (optional)</label>
                  <input
                    type="text"
                    value={bannerId}
                    onChange={(e) => setBannerId(e.target.value)}
                    className={inputClass}
                    placeholder="Leer = zufaellige Rotation"
                  />
                  <p className="text-xs text-brand-text-muted mt-1">
                    Bestimmten Banner anzeigen oder leer fuer Rotation
                  </p>
                </div>
              </div>
            )}

            {/* =========================================================== */}
            {/* Hero Slider-specific fields                                  */}
            {/* =========================================================== */}
            {formType === 'hero_slider' && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Variante</label>
                  <select
                    value={heroSliderVariant}
                    onChange={(e) => setHeroSliderVariant(e.target.value)}
                    className={inputClass}
                  >
                    {HERO_SLIDER_VARIANTS.map((v) => (
                      <option key={v.value} value={v.value}>
                        {v.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className={labelClass}>Gradient-Overlay</label>
                  <select
                    value={heroSliderGradient}
                    onChange={(e) => setHeroSliderGradient(e.target.value)}
                    className={inputClass}
                  >
                    {HERO_SLIDER_GRADIENTS.map((g) => (
                      <option key={g.value} value={g.value}>
                        {g.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-brand-text-muted mt-1">
                    Dunkler Verlauf ueber dem Bild fuer bessere Textlesbarkeit
                  </p>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={heroSliderAnimate}
                    onChange={(e) => setHeroSliderAnimate(e.target.checked)}
                    className="rounded border-brand-border text-brand-accent focus:ring-brand-accent/50"
                  />
                  <span className="text-sm text-brand-text/80">
                    Animation (Ken Burns + Autoplay)
                  </span>
                </label>

                <div>
                  <label className={labelClass}>Modus</label>
                  <div className="flex rounded-lg overflow-hidden border border-brand-border">
                    <button
                      type="button"
                      onClick={() => setHeroSliderMode('manual')}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-all ${
                        heroSliderMode === 'manual'
                          ? 'bg-brand-accent text-white shadow-inner'
                          : 'bg-brand-surface text-brand-text hover:bg-brand-bg-dark'
                      }`}
                    >
                      Manuell
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroSliderMode('slider')}
                      className={`flex-1 px-4 py-2 text-sm font-medium transition-all ${
                        heroSliderMode === 'slider'
                          ? 'bg-brand-accent text-white shadow-inner'
                          : 'bg-brand-surface text-brand-text hover:bg-brand-bg-dark'
                      }`}
                    >
                      Slider verwenden
                    </button>
                  </div>
                </div>

                {heroSliderMode === 'slider' && (
                  <SliderPicker
                    sliders={sliders}
                    loadingSliders={loadingSliders}
                    selectedSlug={heroSliderSlug}
                    onSelect={setHeroSliderSlug}
                  />
                )}

                {heroSliderMode === 'manual' && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className={labelClass}>Slides</label>
                      <button
                        type="button"
                        onClick={() =>
                          setHeroSliderSlides([
                            ...heroSliderSlides,
                            { image: '', heading: '', description: '', button: '', href: '' },
                          ])
                        }
                        className="inline-flex items-center gap-1 text-xs text-brand-accent hover:text-brand-accent/80 font-medium"
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                        Slide hinzufuegen
                      </button>
                    </div>

                    <div className="space-y-3">
                      {heroSliderSlides.map((slide, idx) => (
                        <div
                          key={idx}
                          className="glass rounded-lg p-3 relative"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-brand-text-muted">
                              Slide {idx + 1}
                            </span>
                            {heroSliderSlides.length > 1 && (
                              <button
                                type="button"
                                onClick={() =>
                                  setHeroSliderSlides(
                                    heroSliderSlides.filter((_, i) => i !== idx)
                                  )
                                }
                                className="text-xs text-red-500 hover:text-red-700"
                              >
                                Entfernen
                              </button>
                            )}
                          </div>
                          <div className="grid gap-2">
                            <input
                              type="text"
                              value={slide.image}
                              onChange={(e) => {
                                const updated = [...heroSliderSlides]
                                updated[idx] = { ...updated[idx], image: e.target.value }
                                setHeroSliderSlides(updated)
                              }}
                              className={inputClass}
                              placeholder="Bild-URL *"
                            />
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={slide.heading}
                                onChange={(e) => {
                                  const updated = [...heroSliderSlides]
                                  updated[idx] = { ...updated[idx], heading: e.target.value }
                                  setHeroSliderSlides(updated)
                                }}
                                className={inputClass}
                                placeholder="Ueberschrift"
                              />
                              <input
                                type="text"
                                value={slide.description}
                                onChange={(e) => {
                                  const updated = [...heroSliderSlides]
                                  updated[idx] = { ...updated[idx], description: e.target.value }
                                  setHeroSliderSlides(updated)
                                }}
                                className={inputClass}
                                placeholder="Beschreibung"
                              />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              <input
                                type="text"
                                value={slide.button}
                                onChange={(e) => {
                                  const updated = [...heroSliderSlides]
                                  updated[idx] = { ...updated[idx], button: e.target.value }
                                  setHeroSliderSlides(updated)
                                }}
                                className={inputClass}
                                placeholder="Button-Text"
                              />
                              <input
                                type="text"
                                value={slide.href}
                                onChange={(e) => {
                                  const updated = [...heroSliderSlides]
                                  updated[idx] = { ...updated[idx], href: e.target.value }
                                  setHeroSliderSlides(updated)
                                }}
                                className={inputClass}
                                placeholder="Button-Link (z.B. /ueber-uns)"
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* =========================================================== */}
            {/* Noir element fields                                          */}
            {/* =========================================================== */}
            {formType === 'noir_lineup' && (
              <div className="space-y-4">
                <InfoBox>
                  Inhalte kommen aus den <a href="/admin/events" className="underline">Timetable-Slots</a> des
                  Hauptevents. Wähle die Kategorien und sortiere die Reihenfolge per Drag&nbsp;&amp;&nbsp;Drop.
                </InfoBox>
                <div>
                  <label className={labelClass}>Überschrift (2. Zeile)</label>
                  <input
                    type="text"
                    value={noirLineupHeading}
                    onChange={(e) => setNoirLineupHeading(e.target.value)}
                    className={inputClass}
                    placeholder={NOIR_LINEUP_DEFAULTS.heading}
                  />
                  <p className="text-xs text-brand-text-muted mt-1">
                    Die erste Zeile („N&nbsp;Programmpunkte.") wird automatisch gesetzt. Leer = Standard „{NOIR_LINEUP_DEFAULTS.heading}".
                  </p>
                </div>
                <div>
                  <label className={labelClass}>Kategorien</label>
                  <div className="flex flex-wrap gap-3">
                    {SLOT_CATEGORIES.map((c) => (
                      <label key={c} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={noirLineupCategories.includes(c)}
                          onChange={(e) => {
                            setNoirLineupCategories((prev) =>
                              e.target.checked ? [...prev, c] : prev.filter((x) => x !== c))
                          }}
                        />
                        {CATEGORY_LABELS[c]}
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={labelClass}>Reihenfolge ({noirLineupSlots.length})</label>
                  {noirLineupSlots.length === 0 ? (
                    <p className="text-sm text-brand-text-muted">Keine passenden Slots.</p>
                  ) : (
                    <DndContext
                      sensors={lineupSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e: DragEndEvent) => {
                        const { active, over } = e
                        if (!over || active.id === over.id) return
                        const oldI = noirLineupSlots.findIndex((s) => s.appearanceId === active.id)
                        const newI = noirLineupSlots.findIndex((s) => s.appearanceId === over.id)
                        if (oldI < 0 || newI < 0) return
                        const reordered = arrayMove(noirLineupSlots, oldI, newI)
                        setNoirLineupSlots(reordered)
                        setNoirLineupOrder(reordered.map((s) => s.appearanceId))
                      }}
                    >
                      <SortableContext items={noirLineupSlots.map((s) => s.appearanceId)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {noirLineupSlots.map((s) => <SortableLineupRow key={s.appearanceId} slot={s} />)}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              </div>
            )}

            {formType === 'noir_timetable' && (
              <InfoBox>
                Die Inhalte (Künstler bzw. Programm) kommen automatisch aus{' '}
                <a href="/admin/events" className="underline">Events</a> &amp;{' '}
                <a href="/admin/artists" className="underline">Künstlern</a>. Oben passt du die kleine
                Überschrift (<strong>Titel</strong>) und den Intro-Text (<strong>Untertitel</strong>) an.
              </InfoBox>
            )}

            {formType === 'noir_marquee' && (
              <InfoBox>
                Laufende Band-Namen aus dem Line-up des Hauptevents. Keine weiteren Einstellungen nötig.
              </InfoBox>
            )}

            {formType === 'noir_hero' && (
              <div className="space-y-4">
                <InfoBox>
                  Datum, Ort und der „Acts"-Zähler kommen automatisch aus dem Hauptevent. Überschrift
                  „e-Ventschau" und Logo sind fest.
                </InfoBox>
                <div>
                  <label className={labelClass}>Untertitel / Tagline</label>
                  <input
                    type="text"
                    value={noirHeroSubtitle}
                    onChange={(e) => setNoirHeroSubtitle(e.target.value)}
                    className={inputClass}
                    placeholder="Benefiz · Kultur · Gemeinschaft — zwei Nächte auf dem Hof"
                  />
                  <p className="text-xs text-brand-text-muted mt-1">Leer = gestaltete Standard-Tagline.</p>
                </div>
                <div>
                  <label className={labelClass}>Buttons</label>
                  <DynamicList
                    items={noirHeroButtons}
                    onChange={setNoirHeroButtons}
                    newItem={(): NoirButtonForm => ({ label: '', href: '', variant: 'primary' })}
                    addLabel="Button hinzufügen"
                    renderItem={(item, _i, update) => (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => update({ ...item, label: e.target.value })}
                          className={inputClass}
                          placeholder="Label"
                        />
                        <input
                          type="text"
                          value={item.href}
                          onChange={(e) => update({ ...item, href: e.target.value })}
                          className={inputClass}
                          placeholder="#programm oder /unterstuetzung"
                        />
                        <select
                          value={item.variant}
                          onChange={(e) => update({ ...item, variant: e.target.value as 'primary' | 'secondary' })}
                          className={inputClass}
                        >
                          <option value="primary">Primär</option>
                          <option value="secondary">Sekundär</option>
                        </select>
                      </div>
                    )}
                  />
                </div>
                <div>
                  <label className={labelClass}>Info-Kacheln (nach Acts &amp; Datum)</label>
                  <DynamicList
                    items={noirHeroTiles}
                    onChange={setNoirHeroTiles}
                    newItem={() => ({ label: '', value: '' })}
                    addLabel="Kachel hinzufügen"
                    renderItem={(item, _i, update) => (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => update({ ...item, label: e.target.value })}
                          className={inputClass}
                          placeholder="Label (z.B. Camping)"
                        />
                        <input
                          type="text"
                          value={item.value}
                          onChange={(e) => update({ ...item, value: e.target.value })}
                          className={inputClass}
                          placeholder="Wert (z.B. Frei auf der Wiese)"
                        />
                      </div>
                    )}
                  />
                </div>
              </div>
            )}

            {formType === 'noir_manifest' && (
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Überschrift</label>
                  <input
                    type="text"
                    value={noirManifestHeading}
                    onChange={(e) => setNoirManifestHeading(e.target.value)}
                    className={inputClass}
                    placeholder="Wir machen Lärm gegen das Vergessen."
                  />
                  <p className="text-xs text-brand-text-muted mt-1">Leer = gestaltete Standard-Überschrift.</p>
                </div>
                <div>
                  <MarkdownEditorField
                    value={noirManifestText}
                    contentJson={noirManifestTextJson}
                    editorMode={noirManifestTextMode}
                    onChange={(next) => {
                      setNoirManifestText(next.markdown)
                      setNoirManifestTextJson(next.contentJson)
                      setNoirManifestTextMode(next.editorMode)
                    }}
                    label="Text"
                    placeholder="Seit 2013 erinnert e-Ventschau …"
                    minHeight={140}
                  />
                </div>
                <div>
                  <label className={labelClass}>Statistiken</label>
                  <DynamicList
                    items={noirManifestStats}
                    onChange={setNoirManifestStats}
                    newItem={() => ({ value: '', label: '' })}
                    addLabel="Statistik hinzufügen"
                    renderItem={(item, _i, update) => (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={item.value}
                          onChange={(e) => update({ ...item, value: e.target.value })}
                          className={inputClass}
                          placeholder="Wert (z.B. 11.)"
                        />
                        <input
                          type="text"
                          value={item.label}
                          onChange={(e) => update({ ...item, label: e.target.value })}
                          className={inputClass}
                          placeholder="Label (z.B. Ausgabe)"
                        />
                      </div>
                    )}
                  />
                </div>
              </div>
            )}

            {formType === 'noir_donate' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Label (klein)</label>
                    <input
                      type="text"
                      value={noirDonateLabel}
                      onChange={(e) => setNoirDonateLabel(e.target.value)}
                      className={inputClass}
                      placeholder="Tickets & Spenden"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Überschrift</label>
                    <input
                      type="text"
                      value={noirDonateHeading}
                      onChange={(e) => setNoirDonateHeading(e.target.value)}
                      className={inputClass}
                      placeholder="Zahl, was du kannst."
                    />
                  </div>
                </div>
                <div>
                  <MarkdownEditorField
                    value={noirDonateText}
                    contentJson={noirDonateTextJson}
                    editorMode={noirDonateTextMode}
                    onChange={(next) => {
                      setNoirDonateText(next.markdown)
                      setNoirDonateTextJson(next.contentJson)
                      setNoirDonateTextMode(next.editorMode)
                    }}
                    label="Text"
                    placeholder="Der Eintritt bleibt sozial verträglich …"
                    minHeight={140}
                  />
                </div>
                <div>
                  <label className={labelClass}>Beträge-Chips</label>
                  <DynamicList
                    items={noirDonateChips}
                    onChange={setNoirDonateChips}
                    newItem={() => ({ value: '' })}
                    addLabel="Chip hinzufügen"
                    renderItem={(item, _i, update) => (
                      <input
                        type="text"
                        value={item.value}
                        onChange={(e) => update({ value: e.target.value })}
                        className={inputClass}
                        placeholder="z.B. 25 €"
                      />
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Button-Text</label>
                    <input
                      type="text"
                      value={noirDonateCtaLabel}
                      onChange={(e) => setNoirDonateCtaLabel(e.target.value)}
                      className={inputClass}
                      placeholder="Jetzt spenden"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Button-Link</label>
                    <input
                      type="text"
                      value={noirDonateCtaHref}
                      onChange={(e) => setNoirDonateCtaHref(e.target.value)}
                      className={inputClass}
                      placeholder="/unterstuetzung"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Karten-Überschrift</label>
                    <input
                      type="text"
                      value={noirDonateCardHeading}
                      onChange={(e) => setNoirDonateCardHeading(e.target.value)}
                      className={inputClass}
                      placeholder="Spendenziel 2026"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Karten-Untertext</label>
                    <input
                      type="text"
                      value={noirDonateCardSubtext}
                      onChange={(e) => setNoirDonateCardSubtext(e.target.value)}
                      className={inputClass}
                      placeholder="Für Technik, Bühne & Künstler:innen."
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className={labelClass}>Gesammelt (€)</label>
                    <input
                      type="number"
                      value={noirDonateRaised}
                      onChange={(e) => setNoirDonateRaised(e.target.value)}
                      className={inputClass}
                      placeholder="8420"
                    />
                  </div>
                  <div>
                    <label className={labelClass}>Ziel (€)</label>
                    <input
                      type="number"
                      value={noirDonateTarget}
                      onChange={(e) => setNoirDonateTarget(e.target.value)}
                      className={inputClass}
                      placeholder="12000"
                    />
                  </div>
                </div>
                <p className="text-xs text-brand-text-muted">
                  Fortschritt (%) wird automatisch aus Gesammelt / Ziel berechnet.
                </p>
              </div>
            )}

            {/* =========================================================== */}
            {/* Generic JSON fallback for unknown types                      */}
            {/* =========================================================== */}
            {!structuredTypes.includes(formType) && (
              <div>
                <label className={labelClass}>Content (JSON)</label>
                <textarea
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  rows={5}
                  className={`${inputClass} font-mono`}
                  placeholder='{ "items": [...] }'
                />
              </div>
            )}

            {formType !== 'hero_slider' && !structuredTypes.includes(formType) && (
              <div>
                <label className={labelClass}>Config (JSON)</label>
                <textarea
                  value={formConfig}
                  onChange={(e) => setFormConfig(e.target.value)}
                  rows={3}
                  className={`${inputClass} font-mono`}
                  placeholder='{ "variant": "default" }'
                />
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-accent text-white rounded-xl text-sm font-medium hover:bg-brand-accent/90 shadow-lg shadow-brand-accent/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                {saving ? 'Speichert...' : editingId ? 'Speichern' : 'Erstellen'}
              </button>
              <button
                onClick={resetForm}
                className="btn-secondary text-sm !py-2.5 !px-5"
              >
                Abbrechen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Section list                                                       */}
      {/* ================================================================= */}
      {sections.length === 0 ? (
        <div className={`text-center py-12 ${glassCard}`}>
          <RectangleGroupIcon className="w-10 h-10 text-brand-text-muted/40 mx-auto mb-3" />
          <p className="text-brand-text-muted">
            Keine Sektionen vorhanden. Fuegen Sie eine neue Sektion hinzu.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {sections.map((section, idx) => {
            const meta = getSectionMeta(section.type)
            const Icon = meta.icon
            const detail = getSectionDetail(section)
            const animBadge = getSliderAnimationBadge(section)
            const sectionAnimation = (section.config as Record<string, unknown> | null)?.animation as string | undefined

            return (
              <div
                key={section.id}
                className={`${glassListItem} ${!section.isVisible ? 'opacity-50' : ''}`}
              >
                {/* Drag / sort area */}
                <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                  <button
                    onClick={() => moveSection(section.id, 'up')}
                    disabled={idx === 0}
                    className="p-1 text-brand-text-muted/60 hover:text-brand-accent disabled:opacity-20 disabled:cursor-not-allowed rounded transition-colors"
                    title="Nach oben"
                  >
                    <ChevronUpIcon className="w-4 h-4" />
                  </button>
                  <Bars3Icon className="w-3.5 h-3.5 text-brand-text-muted/30" />
                  <button
                    onClick={() => moveSection(section.id, 'down')}
                    disabled={idx === sections.length - 1}
                    className="p-1 text-brand-text-muted/60 hover:text-brand-accent disabled:opacity-20 disabled:cursor-not-allowed rounded transition-colors"
                    title="Nach unten"
                  >
                    <ChevronDownIcon className="w-4 h-4" />
                  </button>
                </div>

                {/* Type icon */}
                <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-brand-accent/10 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-brand-accent" />
                </div>

                {/* Type badge */}
                <span className="px-2.5 py-1 bg-brand-accent/10 text-brand-accent text-xs font-medium rounded-full min-w-[80px] text-center flex-shrink-0">
                  {meta.label}
                </span>

                {/* Title, detail & timestamp */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-brand-text truncate">
                    {section.title || '(Kein Titel)'}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs text-brand-text-muted">
                      Pos. {section.sortOrder}
                    </p>
                    {detail && (
                      <>
                        <span className="text-brand-text-muted/30">|</span>
                        <p className="text-xs text-brand-text-muted">{detail}</p>
                      </>
                    )}
                    {animBadge && (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-purple-100 text-purple-700">
                        {animBadge}
                      </span>
                    )}
                    {sectionAnimation && sectionAnimation !== 'none' && (
                      <span className="inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-indigo-100 text-indigo-700">
                        {ANIMATION_OPTIONS.find((o) => o.value === sectionAnimation)?.label || sectionAnimation}
                      </span>
                    )}
                    {(() => {
                      const bg = (section.config as Record<string, unknown> | null)?.bgColor as string | undefined
                      return bg ? (
                        <span
                          className="inline-block w-3 h-3 rounded-full border border-brand-border flex-shrink-0"
                          style={{ backgroundColor: bg }}
                          title={`Hintergrund: ${bg}`}
                        />
                      ) : null
                    })()}
                    <span className="text-brand-text-muted/30">|</span>
                    <span className="inline-flex items-center gap-0.5 text-[11px] text-brand-text-muted/60">
                      <ClockIcon className="w-3 h-3" />
                      {formatRelativeTime(section.updatedAt)}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    onClick={() => toggleVisibility(section)}
                    className={`p-1.5 rounded-lg transition-all ${
                      section.isVisible
                        ? 'text-green-600 hover:bg-green-500/10'
                        : 'text-brand-text-muted/40 hover:bg-brand-bg-dark'
                    }`}
                    title={section.isVisible ? 'Sichtbar' : 'Ausgeblendet'}
                  >
                    {section.isVisible ? (
                      <EyeIcon className="w-5 h-5" />
                    ) : (
                      <EyeSlashIcon className="w-5 h-5" />
                    )}
                  </button>

                  <button
                    onClick={() => startEdit(section)}
                    className="p-1.5 text-brand-text-muted hover:text-brand-accent hover:bg-brand-accent/5 rounded-lg transition-all"
                    title="Bearbeiten"
                  >
                    <PencilSquareIcon className="w-5 h-5" />
                  </button>

                  <button
                    onClick={() => handleDelete(section.id)}
                    className="p-1.5 text-brand-text-muted hover:text-red-600 hover:bg-red-50/60 rounded-lg transition-all"
                    title="Loeschen"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sub-component: sortable row for the noir_lineup drag-and-drop order editor
// ---------------------------------------------------------------------------

function SortableLineupRow({ slot }: { slot: LineupSlot }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: slot.appearanceId })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }
  return (
    <div ref={setNodeRef} style={style} className="glass-card flex items-center gap-3 p-2 text-sm">
      <button type="button" {...attributes} {...listeners}
        aria-label={`${slot.name} verschieben`}
        className="cursor-grab touch-none px-1 text-brand-text-muted select-none active:cursor-grabbing">⠿</button>
      <span className="rounded bg-brand-accent/10 px-2 py-0.5 text-xs">{slot.categoryLabel}</span>
      <span className="flex-1 font-medium">{slot.name}</span>
      <span className="text-xs text-brand-text-muted">{slot.meta}</span>
    </div>
  )
}
