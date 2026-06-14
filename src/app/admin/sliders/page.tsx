'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  ClipboardIcon,
  EyeIcon,
  CursorArrowRaysIcon,
  MegaphoneIcon,
  SparklesIcon,
  Square3Stack3DIcon,
  FunnelIcon,
  ChartBarIcon,
  CurrencyEuroIcon,
  Cog6ToothIcon,
  MagnifyingGlassIcon,
  PhotoIcon,
  FilmIcon,
  PlayIcon,
  LinkIcon,
} from '@heroicons/react/24/outline'

// ─── Types ────────────────────────────────────────────────────

type ItemType = 'PAGE' | 'PRODUCT' | 'VENDOR' | 'MEDIA' | 'ARTIST'

interface SliderConfig {
  animation: 'slide' | 'fade' | 'cube' | 'flip' | 'coverflow' | 'cards'
  layout: 'carousel' | 'grid' | 'marquee' | 'featured'
  cardStyle: 'glass' | 'minimal' | 'overlay' | 'bordered' | 'gradient'
  slidesPerView: { mobile: number; tablet: number; desktop: number }
  autoplay: boolean
  autoplayDelay: number
  speed: number
  loop: boolean
  showNavigation: boolean
  showPagination: boolean
  spacing: number
}

interface SliderItem {
  id: string
  sortOrder: number
  isActive: boolean
  title: string | null
  subtitle: string | null
  imageUrl: string | null
  videoUrl: string | null
  linkUrl: string | null
  buttonText: string | null
  pageId: string | null
  productId: string | null
  vendorId: string | null
  mediaId: string | null
  page: { id: string; title: string; slug: string; ogImage: string | null; featureImage?: string | null; featureVideo?: string | null } | null
  product: { id: string; label: string; url: string; image: string | null } | null
  vendor: { id: string; name: string; slug: string; imageUrl: string | null; description: string | null } | null
  media: { id: string; url: string; type: string; filename: string } | null
  config: { gradient?: 'none' | 'dark' | 'light'; kenBurns?: boolean } | null
}

interface Slider {
  id: string
  name: string
  slug: string
  itemType: ItemType
  isActive: boolean
  config: SliderConfig | null
  filterMode: string
  filterTags: string[]
  filterCategoryIds: string[]
  filterVendorIds: string[]
  maxItems: number | null
  sortBy: string
  sponsorVendorId: string | null
  sponsorVendor: { id: string; name: string } | null
  costPerMille: number | null
  impressionTarget: number | null
  impressions: number
  clicks: number
  items: SliderItem[]
  createdAt: string
}

interface SearchResult {
  id: string
  label: string
  sub: string
  imageUrl?: string | null
  videoUrl?: string | null
  mediaType?: string | null
}

interface CategoryItem {
  id: string
  name: string
  slug: string
  parentId: string | null
  children?: CategoryItem[]
}

interface VendorItem {
  id: string
  name: string
  slug: string
}

type FormTab = 'basics' | 'design' | 'content' | 'ads'

// ─── Defaults ─────────────────────────────────────────────────

const DEFAULT_CONFIG: SliderConfig = {
  animation: 'slide',
  layout: 'carousel',
  cardStyle: 'glass',
  slidesPerView: { mobile: 1, tablet: 2, desktop: 3 },
  autoplay: false,
  autoplayDelay: 5000,
  speed: 500,
  loop: false,
  showNavigation: true,
  showPagination: true,
  spacing: 16,
}

const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  PAGE: 'Seiten',
  PRODUCT: 'Produkte',
  VENDOR: 'Haendler',
  MEDIA: 'Medien',
  ARTIST: 'Kuenstler',
}

const FILTER_MODE_LABELS: Record<string, string> = {
  manual: 'Manuell',
  auto: 'Automatisch',
  mixed: 'Gemischt',
}

const ANIMATION_OPTIONS: { value: SliderConfig['animation']; label: string; icon: string }[] = [
  { value: 'slide', label: 'Slide', icon: '↔' },
  { value: 'fade', label: 'Fade', icon: '◐' },
  { value: 'cube', label: 'Cube', icon: '⬡' },
  { value: 'flip', label: 'Flip', icon: '↻' },
  { value: 'coverflow', label: 'Coverflow', icon: '▣' },
  { value: 'cards', label: 'Cards', icon: '⊞' },
]

const LAYOUT_OPTIONS: { value: SliderConfig['layout']; label: string; desc: string }[] = [
  { value: 'carousel', label: 'Karussell', desc: 'Standard Swiper' },
  { value: 'grid', label: 'Grid', desc: 'Festes Raster' },
  { value: 'marquee', label: 'Marquee', desc: 'Endlos-Scroll' },
  { value: 'featured', label: 'Featured', desc: 'Einzelnes Hero' },
]

const CARD_STYLE_OPTIONS: { value: SliderConfig['cardStyle']; label: string }[] = [
  { value: 'glass', label: 'Glass' },
  { value: 'minimal', label: 'Minimal' },
  { value: 'overlay', label: 'Overlay' },
  { value: 'bordered', label: 'Bordered' },
  { value: 'gradient', label: 'Gradient' },
]

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'manual', label: 'Manuell' },
  { value: 'newest', label: 'Neueste zuerst' },
  { value: 'random', label: 'Zufaellig' },
]

// ─── Component ────────────────────────────────────────────────

export default function AdminSlidersPage() {
  // List state
  const [sliders, setSliders] = useState<Slider[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<FormTab>('basics')

  // Form fields
  const [formName, setFormName] = useState('')
  const [formItemType, setFormItemType] = useState<ItemType>('PAGE')
  const [formIsActive, setFormIsActive] = useState(true)
  const [formConfig, setFormConfig] = useState<SliderConfig>({ ...DEFAULT_CONFIG })
  const [formFilterMode, setFormFilterMode] = useState('manual')
  const [formFilterTags, setFormFilterTags] = useState<string[]>([])
  const [formFilterCategoryIds, setFormFilterCategoryIds] = useState<string[]>([])
  const [formFilterVendorIds, setFormFilterVendorIds] = useState<string[]>([])
  const [formMaxItems, setFormMaxItems] = useState<number | null>(null)
  const [formSortBy, setFormSortBy] = useState('manual')
  const [formSponsorVendorId, setFormSponsorVendorId] = useState<string | null>(null)
  const [formCostPerMille, setFormCostPerMille] = useState<number | null>(null)
  const [formImpressionTarget, setFormImpressionTarget] = useState<number | null>(null)

  // Stats (read-only, from editing slider)
  const [editImpressions, setEditImpressions] = useState(0)
  const [editClicks, setEditClicks] = useState(0)

  // Item management (in content tab)
  const [detailedSlider, setDetailedSlider] = useState<Slider | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  // Debounce ref for search
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Tag input
  const [tagInput, setTagInput] = useState('')
  const [availableTags, setAvailableTags] = useState<string[]>([])

  // Categories & vendors for filters
  const [allCategories, setAllCategories] = useState<CategoryItem[]>([])
  const [allVendors, setAllVendors] = useState<VendorItem[]>([])
  const [vendorSearch, setVendorSearch] = useState('')
  const [sponsorVendorSearch, setSponsorVendorSearch] = useState('')

  // ─── Data fetching ────────────────────────────────────────

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/sliders')
      if (!res.ok) throw new Error('Laden fehlgeschlagen')
      const data = await res.json()
      setSliders(data)
    } catch {
      setError('Slider konnten nicht geladen werden')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchSliderDetail = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/admin/sliders/${id}`)
      if (!res.ok) throw new Error('Detail-Laden fehlgeschlagen')
      const data = await res.json()
      setDetailedSlider(data)
    } catch {
      setError('Slider-Details konnten nicht geladen werden')
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/categories')
      if (!res.ok) return
      const data = await res.json()
      setAllCategories(data)
    } catch { /* ignore */ }
  }, [])

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/vendors')
      if (!res.ok) return
      const data = await res.json()
      setAllVendors(data.map((v: VendorItem) => ({ id: v.id, name: v.name, slug: v.slug })))
    } catch { /* ignore */ }
  }, [])

  const fetchTags = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/products')
      if (!res.ok) return
      const data = await res.json()
      const tags = new Set<string>()
      data.forEach((p: { tags?: string[] }) => {
        p.tags?.forEach((t: string) => tags.add(t))
      })
      setAvailableTags(Array.from(tags).sort())
    } catch { /* ignore */ }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // ─── Form helpers ─────────────────────────────────────────

  function resetForm() {
    setFormName('')
    setFormItemType('PAGE')
    setFormIsActive(true)
    setFormConfig({ ...DEFAULT_CONFIG })
    setFormFilterMode('manual')
    setFormFilterTags([])
    setFormFilterCategoryIds([])
    setFormFilterVendorIds([])
    setFormMaxItems(null)
    setFormSortBy('manual')
    setFormSponsorVendorId(null)
    setFormCostPerMille(null)
    setFormImpressionTarget(null)
    setEditImpressions(0)
    setEditClicks(0)
    setDetailedSlider(null)
    setSearchQuery('')
    setSearchResults([])
    setTagInput('')
    setVendorSearch('')
    setSponsorVendorSearch('')
  }

  function openAddForm() {
    setEditingId(null)
    resetForm()
    setActiveTab('basics')
    setShowForm(true)
    fetchCategories()
    fetchVendors()
    fetchTags()
  }

  function openEditForm(slider: Slider) {
    setEditingId(slider.id)
    setFormName(slider.name)
    setFormItemType(slider.itemType)
    setFormIsActive(slider.isActive)
    setFormConfig(slider.config ? { ...DEFAULT_CONFIG, ...slider.config } : { ...DEFAULT_CONFIG })
    setFormFilterMode(slider.filterMode)
    setFormFilterTags(slider.filterTags ?? [])
    setFormFilterCategoryIds(slider.filterCategoryIds ?? [])
    setFormFilterVendorIds(slider.filterVendorIds ?? [])
    setFormMaxItems(slider.maxItems)
    setFormSortBy(slider.sortBy)
    setFormSponsorVendorId(slider.sponsorVendorId)
    setFormCostPerMille(slider.costPerMille)
    setFormImpressionTarget(slider.impressionTarget)
    setEditImpressions(slider.impressions)
    setEditClicks(slider.clicks)
    setActiveTab('basics')
    setShowForm(true)
    setSearchQuery('')
    setSearchResults([])
    setTagInput('')
    setVendorSearch('')
    setSponsorVendorSearch('')
    fetchSliderDetail(slider.id)
    fetchCategories()
    fetchVendors()
    fetchTags()
  }

  function closeForm() {
    setShowForm(false)
    setEditingId(null)
    resetForm()
  }

  async function handleSave() {
    if (!formName) {
      setError('Name ist ein Pflichtfeld')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: formName,
        itemType: formItemType,
        isActive: formIsActive,
        config: formConfig,
        filterMode: formFilterMode,
        filterTags: formFilterTags,
        filterCategoryIds: formFilterCategoryIds,
        filterVendorIds: formFilterVendorIds,
        maxItems: formMaxItems,
        sortBy: formSortBy,
        sponsorVendorId: formSponsorVendorId,
        costPerMille: formCostPerMille,
        impressionTarget: formImpressionTarget,
      }

      const res = editingId
        ? await fetch(`/api/admin/sliders/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/admin/sliders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Fehler beim Speichern')
      }

      closeForm()
      await fetchData()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setSaving(false)
    }
  }

  async function deleteSlider(id: string) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/sliders/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Fehler beim Loeschen')
      setDeleteConfirm(null)
      if (editingId === id) closeForm()
      await fetchData()
    } catch {
      setError('Slider konnte nicht geloescht werden')
    } finally {
      setSaving(false)
    }
  }

  async function toggleActive(slider: Slider) {
    try {
      const res = await fetch(`/api/admin/sliders/${slider.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !slider.isActive }),
      })
      if (!res.ok) throw new Error('Fehler')
      await fetchData()
    } catch {
      setError('Status konnte nicht geaendert werden')
    }
  }

  // ─── Item search & management ──────────────────────────────

  async function searchItems(query: string, itemType: ItemType) {
    if (!query.trim()) {
      setSearchResults([])
      return
    }
    setSearching(true)
    try {
      if (itemType === 'MEDIA') {
        const res = await fetch(`/api/admin/media?search=${encodeURIComponent(query)}`)
        if (!res.ok) throw new Error('Suche fehlgeschlagen')
        const data = await res.json()
        setSearchResults(data.map((m: { id: string; url: string; type: string; filename: string }) => ({
          id: m.id,
          label: m.filename,
          sub: m.type === 'IMAGE' ? 'Bild' : 'Video',
          imageUrl: m.type === 'IMAGE' ? m.url : null,
          videoUrl: m.type === 'VIDEO' ? m.url : null,
          mediaType: m.type,
        })))
        setSearching(false)
        return
      }

      let endpoint = ''
      if (itemType === 'PAGE') endpoint = '/api/admin/pages'
      else if (itemType === 'PRODUCT') endpoint = '/api/admin/products'
      else if (itemType === 'ARTIST') endpoint = '/api/admin/artists'
      else endpoint = '/api/admin/vendors'

      const res = await fetch(endpoint)
      if (!res.ok) throw new Error('Suche fehlgeschlagen')
      const data = await res.json()

      const q = query.toLowerCase()
      const results: SearchResult[] = data
        .filter((item: Record<string, string>) => {
          const name = (item.title || item.label || item.name || '').toLowerCase()
          const slug = (item.slug || '').toLowerCase()
          return name.includes(q) || slug.includes(q)
        })
        .slice(0, 20)
        .map((item: Record<string, string>) => ({
          id: item.id,
          label: item.title || item.label || item.name,
          sub: item.slug || item.url || '',
        }))

      setSearchResults(results)
    } catch {
      setError('Suche fehlgeschlagen')
    } finally {
      setSearching(false)
    }
  }

  async function addItem(sliderId: string, itemType: ItemType, refId: string) {
    setSaving(true)
    setError('')
    try {
      const body: Record<string, string | number | null> = {
        sortOrder: detailedSlider?.items.length ?? 0,
      }
      if (itemType === 'MEDIA') {
        body.mediaId = refId
        const media = searchResults.find((r) => r.id === refId)
        if (media?.videoUrl) body.videoUrl = media.videoUrl
      } else if (itemType === 'PAGE') {
        body.pageId = refId
      } else if (itemType === 'PRODUCT') {
        body.productId = refId
      } else if (itemType === 'ARTIST') {
        body.artistId = refId
      } else {
        body.vendorId = refId
      }

      const res = await fetch(`/api/admin/sliders/${sliderId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error('Fehler beim Hinzufuegen')

      setSearchQuery('')
      setSearchResults([])
      await fetchSliderDetail(sliderId)
      await fetchData()
    } catch {
      setError('Element konnte nicht hinzugefuegt werden')
    } finally {
      setSaving(false)
    }
  }

  async function removeItem(sliderId: string, itemId: string) {
    setSaving(true)
    setError('')
    try {
      const res = await fetch(`/api/admin/sliders/${sliderId}/items/${itemId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Fehler beim Entfernen')
      await fetchSliderDetail(sliderId)
      await fetchData()
    } catch {
      setError('Element konnte nicht entfernt werden')
    } finally {
      setSaving(false)
    }
  }

  async function moveItem(sliderId: string, item: SliderItem, direction: 'up' | 'down') {
    if (!detailedSlider) return
    const items = detailedSlider.items
    const idx = items.findIndex((i) => i.id === item.id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= items.length) return

    const swapItem = items[swapIdx]
    try {
      await Promise.all([
        fetch(`/api/admin/sliders/${sliderId}/items/${item.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: swapItem.sortOrder }),
        }),
        fetch(`/api/admin/sliders/${sliderId}/items/${swapItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sortOrder: item.sortOrder }),
        }),
      ])
      await fetchSliderDetail(sliderId)
    } catch {
      setError('Reihenfolge konnte nicht geaendert werden')
    }
  }

  function copySlug(slug: string) {
    navigator.clipboard.writeText(`:::slider-${slug}:::`)
    setCopiedSlug(slug)
    setTimeout(() => setCopiedSlug(null), 2000)
  }

  function getItemLabel(item: SliderItem): string {
    if (item.media) return item.title || item.media.filename
    if (item.page) return item.page.title
    if (item.product) return item.product.label
    if (item.vendor) return item.vendor.name
    return item.title || '(Unbenannt)'
  }

  function getItemSub(item: SliderItem): string {
    if (item.media) return item.media.type === 'IMAGE' ? 'Bild' : 'Video'
    if (item.page) return `/${item.page.slug}`
    if (item.product) return item.product.url
    if (item.vendor) return `/haendler/${item.vendor.slug}`
    return ''
  }

  function getItemDisplay(item: SliderItem): { name: string; image: string | null; isVideo: boolean; videoUrl: string | null } {
    if (item.media) {
      return {
        name: item.title || item.media.filename,
        image: item.media.type === 'IMAGE' ? item.media.url : null,
        isVideo: item.media.type === 'VIDEO',
        videoUrl: item.media.type === 'VIDEO' ? item.media.url : null,
      }
    }
    if (item.page) {
      return {
        name: item.title || item.page.title,
        image: item.imageUrl || item.page.featureImage || item.page.ogImage || null,
        isVideo: !!item.page.featureVideo,
        videoUrl: item.page.featureVideo || null,
      }
    }
    if (item.product) {
      return {
        name: item.title || item.product.label,
        image: item.imageUrl || item.product.image,
        isVideo: false,
        videoUrl: null,
      }
    }
    if (item.vendor) {
      return {
        name: item.title || item.vendor.name,
        image: item.imageUrl || item.vendor.imageUrl,
        isVideo: false,
        videoUrl: null,
      }
    }
    return { name: item.title || '(Unbenannt)', image: item.imageUrl, isVideo: !!item.videoUrl, videoUrl: item.videoUrl }
  }

  async function updateItemField(sliderId: string, itemId: string, field: string, value: string) {
    try {
      const res = await fetch(`/api/admin/sliders/${sliderId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value || null }),
      })
      if (!res.ok) throw new Error('Fehler beim Speichern')
      await fetchSliderDetail(sliderId)
    } catch {
      setError(`${field} konnte nicht gespeichert werden`)
    }
  }

  async function updateItemConfig(
    sliderId: string,
    itemId: string,
    currentConfig: SliderItem['config'],
    key: string,
    value: string | boolean | null
  ) {
    const merged: Record<string, unknown> = { ...(currentConfig || {}), [key]: value }
    if (value === null) delete merged[key]
    const newConfig = Object.keys(merged).length > 0 ? merged : null
    try {
      const res = await fetch(`/api/admin/sliders/${sliderId}/items/${itemId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig }),
      })
      if (!res.ok) throw new Error('Fehler beim Speichern')
      await fetchSliderDetail(sliderId)
    } catch {
      setError('Konfiguration konnte nicht gespeichert werden')
    }
  }

  function slugPreview(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  // ─── Tag helpers ──────────────────────────────────────────

  function addTag(tag: string) {
    const t = tag.trim()
    if (t && !formFilterTags.includes(t)) {
      setFormFilterTags([...formFilterTags, t])
    }
    setTagInput('')
  }

  function removeTag(tag: string) {
    setFormFilterTags(formFilterTags.filter((t) => t !== tag))
  }

  // ─── Category helpers ──────────────────────────────────────

  function toggleCategory(id: string) {
    setFormFilterCategoryIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id]
    )
  }

  // ─── Vendor filter helpers ─────────────────────────────────

  function toggleFilterVendor(id: string) {
    setFormFilterVendorIds((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id]
    )
  }

  // ─── Config updater ────────────────────────────────────────

  function updateConfig<K extends keyof SliderConfig>(key: K, value: SliderConfig[K]) {
    setFormConfig((prev) => ({ ...prev, [key]: value }))
  }

  function updateSlidesPerView(breakpoint: 'mobile' | 'tablet' | 'desktop', value: number) {
    setFormConfig((prev) => ({
      ...prev,
      slidesPerView: { ...prev.slidesPerView, [breakpoint]: value },
    }))
  }

  // ─── Animation badge for list ──────────────────────────────

  function getAnimationBadge(config: SliderConfig | null): string {
    if (!config) return 'Slide'
    const opt = ANIMATION_OPTIONS.find((a) => a.value === config.animation)
    return opt ? `${opt.icon} ${opt.label}` : 'Slide'
  }

  // ─── Render ────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-brand-accent border-t-transparent rounded-full" />
      </div>
    )
  }

  // Tab content components for the form
  const renderTab = () => {
    switch (activeTab) {
      case 'basics':
        return renderBasicsTab()
      case 'design':
        return renderDesignTab()
      case 'content':
        return renderContentTab()
      case 'ads':
        return renderAdsTab()
    }
  }

  function renderBasicsTab() {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">Name *</label>
          <input
            type="text"
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            className="input-glass w-full"
            placeholder="Slider-Name"
          />
          {formName && (
            <p className="text-xs text-brand-text-muted mt-1">
              Slug: <span className="font-mono">{slugPreview(formName)}</span>
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text mb-2">Element-Typ *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {([
              { value: 'PAGE' as ItemType, label: 'Seiten', description: 'Inhaltsseiten verlinken', Icon: Square3Stack3DIcon },
              { value: 'PRODUCT' as ItemType, label: 'Produkte', description: 'Produkte aus dem Katalog', Icon: CurrencyEuroIcon },
              { value: 'VENDOR' as ItemType, label: 'Haendler', description: 'Haendler-Profile anzeigen', Icon: MegaphoneIcon },
              { value: 'MEDIA' as ItemType, label: 'Medien', description: 'Bilder & Videos mit Verlinkung', Icon: PhotoIcon },
              { value: 'ARTIST' as ItemType, label: 'Kuenstler', description: 'Kuenstler-Profile anzeigen', Icon: MegaphoneIcon },
            ]).map((opt) => (
              <label
                key={opt.value}
                className={`flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  formItemType === opt.value
                    ? 'border-brand-accent bg-brand-accent/5'
                    : 'border-brand-border hover:border-brand-accent/40'
                }`}
              >
                <input
                  type="radio"
                  name="itemType"
                  value={opt.value}
                  checked={formItemType === opt.value}
                  onChange={() => {
                    setFormItemType(opt.value)
                    if (opt.value === 'MEDIA') {
                      setFormFilterMode('manual')
                    }
                  }}
                  className="sr-only"
                />
                <opt.Icon className={`w-5 h-5 mb-1 ${formItemType === opt.value ? 'text-brand-accent' : 'text-brand-text-muted'}`} />
                <span className="text-sm font-medium text-brand-text">{opt.label}</span>
                <span className="text-xs text-brand-text-muted">{opt.description}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={formIsActive}
              onChange={(e) => setFormIsActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
          </label>
          <span className="text-sm text-brand-text">Aktiv</span>
        </div>
      </div>
    )
  }

  function renderDesignTab() {
    return (
      <div className="space-y-6">
        {/* Animation */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-2">Animation</label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {ANIMATION_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateConfig('animation', opt.value)}
                className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all text-center ${
                  formConfig.animation === opt.value
                    ? 'border-brand-accent bg-brand-accent/5 text-brand-accent'
                    : 'border-brand-border hover:border-brand-accent/40 text-brand-text-muted'
                }`}
              >
                <span className="text-2xl leading-none">{opt.icon}</span>
                <span className="text-xs font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Layout */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-2">Layout</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LAYOUT_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={`flex flex-col p-3 rounded-xl border-2 cursor-pointer transition-all ${
                  formConfig.layout === opt.value
                    ? 'border-brand-accent bg-brand-accent/5'
                    : 'border-brand-border hover:border-brand-accent/40'
                }`}
              >
                <input
                  type="radio"
                  name="layout"
                  value={opt.value}
                  checked={formConfig.layout === opt.value}
                  onChange={() => updateConfig('layout', opt.value)}
                  className="sr-only"
                />
                <span className="text-sm font-medium text-brand-text">{opt.label}</span>
                <span className="text-xs text-brand-text-muted">{opt.desc}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Card Style */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-2">Darstellung</label>
          <div className="flex flex-wrap gap-2">
            {CARD_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => updateConfig('cardStyle', opt.value)}
                className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
                  formConfig.cardStyle === opt.value
                    ? 'border-brand-accent bg-brand-accent/5 text-brand-accent'
                    : 'border-brand-border hover:border-brand-accent/40 text-brand-text-muted'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Slides per view */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-2">Slides pro Ansicht</label>
          <div className="grid grid-cols-3 gap-3">
            {(['mobile', 'tablet', 'desktop'] as const).map((bp) => (
              <div key={bp}>
                <label className="block text-xs text-brand-text-muted mb-1 capitalize">{bp === 'mobile' ? 'Mobil' : bp === 'tablet' ? 'Tablet' : 'Desktop'}</label>
                <input
                  type="number"
                  min={1}
                  max={6}
                  value={formConfig.slidesPerView[bp]}
                  onChange={(e) => updateSlidesPerView(bp, Math.max(1, parseInt(e.target.value) || 1))}
                  className="input-glass w-full"
                />
              </div>
            ))}
          </div>
        </div>

        {/* Autoplay */}
        <div>
          <div className="flex items-center gap-3 mb-2">
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formConfig.autoplay}
                onChange={(e) => updateConfig('autoplay', e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-500" />
            </label>
            <span className="text-sm text-brand-text">Autoplay</span>
          </div>
          {formConfig.autoplay && (
            <div className="ml-12">
              <label className="block text-xs text-brand-text-muted mb-1">
                Verzoegerung: {formConfig.autoplayDelay}ms
              </label>
              <input
                type="range"
                min={3000}
                max={10000}
                step={500}
                value={formConfig.autoplayDelay}
                onChange={(e) => updateConfig('autoplayDelay', parseInt(e.target.value))}
                className="w-full accent-brand-accent"
              />
              <div className="flex justify-between text-xs text-brand-text-muted">
                <span>3s</span>
                <span>10s</span>
              </div>
            </div>
          )}
        </div>

        {/* Speed */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">
            Geschwindigkeit: {formConfig.speed}ms
          </label>
          <input
            type="range"
            min={300}
            max={1000}
            step={50}
            value={formConfig.speed}
            onChange={(e) => updateConfig('speed', parseInt(e.target.value))}
            className="w-full accent-brand-accent"
          />
          <div className="flex justify-between text-xs text-brand-text-muted">
            <span>300ms (schnell)</span>
            <span>1000ms (langsam)</span>
          </div>
        </div>

        {/* Toggles row */}
        <div className="flex flex-wrap gap-4">
          {([
            ['loop', 'Loop'],
            ['showNavigation', 'Navigation'],
            ['showPagination', 'Pagination'],
          ] as const).map(([key, label]) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formConfig[key] as boolean}
                onChange={(e) => updateConfig(key, e.target.checked)}
                className="rounded border-brand-border text-brand-accent focus:ring-brand-accent"
              />
              <span className="text-sm text-brand-text">{label}</span>
            </label>
          ))}
        </div>

        {/* Spacing */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">
            Abstand: {formConfig.spacing}px
          </label>
          <input
            type="range"
            min={8}
            max={32}
            step={2}
            value={formConfig.spacing}
            onChange={(e) => updateConfig('spacing', parseInt(e.target.value))}
            className="w-full accent-brand-accent"
          />
          <div className="flex justify-between text-xs text-brand-text-muted">
            <span>8px</span>
            <span>32px</span>
          </div>
        </div>
      </div>
    )
  }

  function renderContentTab() {
    const sliderId = editingId
    const isMediaType = formItemType === 'MEDIA'

    return (
      <div className="space-y-6">
        {/* Filter mode segmented control */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-2">Modus</label>
          {isMediaType ? (
            <div>
              <div className="inline-flex rounded-lg border border-brand-border overflow-hidden">
                <button
                  type="button"
                  className="px-4 py-2 text-sm font-medium bg-brand-accent text-white"
                >
                  {FILTER_MODE_LABELS['manual']}
                </button>
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 text-sm font-medium bg-brand-bg-dark text-gray-400 cursor-not-allowed"
                >
                  {FILTER_MODE_LABELS['auto']}
                </button>
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 text-sm font-medium bg-brand-bg-dark text-gray-400 cursor-not-allowed"
                >
                  {FILTER_MODE_LABELS['mixed']}
                </button>
              </div>
              <p className="text-xs text-brand-text-muted mt-2">
                Medien-Slider unterstuetzen nur manuelle Inhaltspflege
              </p>
            </div>
          ) : (
            <div className="inline-flex rounded-lg border border-brand-border overflow-hidden">
              {(['manual', 'auto', 'mixed'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setFormFilterMode(mode)}
                  className={`px-4 py-2 text-sm font-medium transition-colors ${
                    formFilterMode === mode
                      ? 'bg-brand-accent text-white'
                      : 'bg-brand-surface text-brand-text-muted hover:bg-brand-bg-dark'
                  }`}
                >
                  {FILTER_MODE_LABELS[mode]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Auto/Mixed filter controls */}
        {!isMediaType && (formFilterMode === 'auto' || formFilterMode === 'mixed') && (
          <div className="space-y-4 p-4 rounded-xl border border-brand-border bg-brand-bg/50">
            <h4 className="text-sm font-semibold text-brand-text flex items-center gap-1.5">
              <FunnelIcon className="w-4 h-4" />
              Filter-Konfiguration
            </h4>

            {/* Tags */}
            <div>
              <label className="block text-xs font-medium text-brand-text mb-1">Tags</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {formFilterTags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-brand-accent/10 text-brand-accent text-xs"
                  >
                    {tag}
                    <button type="button" onClick={() => removeTag(tag)} className="hover:text-red-500">
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag(tagInput)
                    }
                  }}
                  className="input-glass flex-1 text-sm"
                  placeholder="Tag eingeben..."
                  list="available-tags"
                />
                <datalist id="available-tags">
                  {availableTags
                    .filter((t) => !formFilterTags.includes(t))
                    .map((t) => (
                      <option key={t} value={t} />
                    ))}
                </datalist>
                <button
                  type="button"
                  onClick={() => addTag(tagInput)}
                  className="btn-secondary text-xs px-3"
                >
                  +
                </button>
              </div>
            </div>

            {/* Categories */}
            <div>
              <label className="block text-xs font-medium text-brand-text mb-1">Kategorien</label>
              <div className="max-h-40 overflow-y-auto space-y-1 p-2 rounded-lg border border-brand-border bg-brand-surface">
                {allCategories.length === 0 && (
                  <p className="text-xs text-brand-text-muted">Keine Kategorien vorhanden</p>
                )}
                {allCategories.map((cat) => (
                  <div key={cat.id}>
                    <label className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={formFilterCategoryIds.includes(cat.id)}
                        onChange={() => toggleCategory(cat.id)}
                        className="rounded border-brand-border text-brand-accent focus:ring-brand-accent"
                      />
                      <span className="text-sm text-brand-text">{cat.name}</span>
                    </label>
                    {cat.children?.map((child) => (
                      <label key={child.id} className="flex items-center gap-2 cursor-pointer py-0.5 ml-5">
                        <input
                          type="checkbox"
                          checked={formFilterCategoryIds.includes(child.id)}
                          onChange={() => toggleCategory(child.id)}
                          className="rounded border-brand-border text-brand-accent focus:ring-brand-accent"
                        />
                        <span className="text-sm text-brand-text-muted">{child.name}</span>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>

            {/* Vendors filter */}
            <div>
              <label className="block text-xs font-medium text-brand-text mb-1">Haendler</label>
              <input
                type="text"
                value={vendorSearch}
                onChange={(e) => setVendorSearch(e.target.value)}
                className="input-glass w-full text-sm mb-1"
                placeholder="Haendler suchen..."
              />
              <div className="max-h-32 overflow-y-auto space-y-0.5 p-2 rounded-lg border border-brand-border bg-brand-surface">
                {allVendors
                  .filter((v) => !vendorSearch || v.name.toLowerCase().includes(vendorSearch.toLowerCase()))
                  .map((v) => (
                    <label key={v.id} className="flex items-center gap-2 cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={formFilterVendorIds.includes(v.id)}
                        onChange={() => toggleFilterVendor(v.id)}
                        className="rounded border-brand-border text-brand-accent focus:ring-brand-accent"
                      />
                      <span className="text-sm text-brand-text">{v.name}</span>
                    </label>
                  ))}
              </div>
            </div>

            {/* Max items */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-brand-text mb-1">Max. Elemente</label>
                <input
                  type="number"
                  min={1}
                  value={formMaxItems ?? ''}
                  onChange={(e) => setFormMaxItems(e.target.value ? parseInt(e.target.value) : null)}
                  className="input-glass w-full text-sm"
                  placeholder="Unbegrenzt"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-brand-text mb-1">Sortierung</label>
                <select
                  value={formSortBy}
                  onChange={(e) => setFormSortBy(e.target.value)}
                  className="input-glass w-full text-sm"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Manual items (shown for manual & mixed, and always for MEDIA) */}
        {(formFilterMode === 'manual' || formFilterMode === 'mixed' || isMediaType) && sliderId && (
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-brand-text flex items-center gap-1.5">
              <Square3Stack3DIcon className="w-4 h-4" />
              Manuelle Elemente ({detailedSlider?.items.length ?? 0})
            </h4>

            {/* Search to add items */}
            <div className="flex gap-2">
              <div className="relative flex-1">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    const value = e.target.value
                    setSearchQuery(value)
                    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
                    searchTimerRef.current = setTimeout(() => {
                      searchItems(value, formItemType)
                    }, 300)
                  }}
                  className="input-glass w-full pl-9 text-sm"
                  placeholder={`${ITEM_TYPE_LABELS[formItemType]} suchen...`}
                />
              </div>
              {searching && (
                <div className="flex items-center">
                  <div className="animate-spin h-4 w-4 border-2 border-brand-accent border-t-transparent rounded-full" />
                </div>
              )}
            </div>

            {searchResults.length > 0 && (
              <div className="border border-brand-border rounded-lg overflow-hidden">
                {searchResults.map((result) => {
                  const alreadyAdded = detailedSlider?.items.some((item) => {
                    if (formItemType === 'MEDIA') return item.mediaId === result.id
                    if (formItemType === 'PAGE') return item.pageId === result.id
                    if (formItemType === 'PRODUCT') return item.productId === result.id
                    if (formItemType === 'ARTIST') return (item as any).artistId === result.id
                    return item.vendorId === result.id
                  })
                  return (
                    <div
                      key={result.id}
                      className="flex items-center justify-between px-3 py-2 border-b border-brand-border last:border-b-0 text-sm"
                    >
                      <div className="flex items-center gap-2">
                        {/* Thumbnail or icon for media search results */}
                        {formItemType === 'MEDIA' && result.imageUrl && (
                          <img
                            src={result.imageUrl}
                            alt={result.label}
                            className="w-8 h-8 object-cover rounded"
                          />
                        )}
                        {formItemType === 'MEDIA' && result.mediaType === 'VIDEO' && (
                          <div className="w-8 h-8 rounded bg-purple-100 flex items-center justify-center">
                            <FilmIcon className="w-4 h-4 text-purple-600" />
                          </div>
                        )}
                        <div>
                          <span className="text-brand-text">{result.label}</span>
                          {result.sub && (
                            <span className={`text-xs ml-2 ${formItemType === 'MEDIA' ? 'px-1.5 py-0.5 rounded-full' : 'font-mono'} ${
                              result.mediaType === 'VIDEO' ? 'bg-purple-100 text-purple-700' :
                              result.mediaType === 'IMAGE' ? 'bg-blue-100 text-blue-700' :
                              'text-brand-text-muted'
                            }`}>
                              {result.sub}
                            </span>
                          )}
                        </div>
                      </div>
                      {alreadyAdded ? (
                        <span className="text-xs text-brand-text-muted">Bereits vorhanden</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addItem(sliderId, formItemType, result.id)}
                          disabled={saving}
                          className="px-2 py-1 text-xs rounded-lg bg-brand-accent/10 text-brand-accent hover:bg-brand-accent/20 transition-colors"
                        >
                          Hinzufuegen
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Current items */}
            {!detailedSlider || detailedSlider.items.length === 0 ? (
              <p className="text-sm text-brand-text-muted py-4 text-center">
                Keine Elemente. Suchen Sie oben, um Elemente hinzuzufuegen.
              </p>
            ) : (
              <div className="space-y-1">
                {detailedSlider.items.map((item, idx) => {
                  const display = getItemDisplay(item)
                  return (
                    <div
                      key={item.id}
                      className="flex flex-wrap items-center gap-2 py-2 px-3 rounded-lg hover:bg-brand-bg-dark transition-colors group"
                    >
                      <div className="flex flex-col gap-0.5 mr-1">
                        <button
                          type="button"
                          onClick={() => moveItem(editingId!, item, 'up')}
                          disabled={idx === 0}
                          className="p-0.5 rounded hover:bg-brand-bg-dark disabled:opacity-30 transition-colors"
                        >
                          <ChevronUpIcon className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveItem(editingId!, item, 'down')}
                          disabled={idx === detailedSlider.items.length - 1}
                          className="p-0.5 rounded hover:bg-brand-bg-dark disabled:opacity-30 transition-colors"
                        >
                          <ChevronDownIcon className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-xs text-brand-text-muted w-6 text-center">
                        {idx + 1}
                      </span>

                      {/* Thumbnail / video indicator */}
                      {display.image ? (
                        <div className="relative w-8 h-8 flex-shrink-0">
                          <img src={display.image} alt="" className="w-8 h-8 object-cover rounded" />
                          {display.isVideo && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded">
                              <PlayIcon className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                      ) : display.isVideo ? (
                        <div className="w-8 h-8 flex-shrink-0 rounded bg-purple-100 flex items-center justify-center">
                          <FilmIcon className="w-4 h-4 text-purple-600" />
                        </div>
                      ) : null}

                      <div className="flex-1 min-w-0">
                        <span className="text-sm text-brand-text block truncate">
                          {display.name}
                        </span>
                        {/* Media type badge */}
                        {item.media && (
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                            item.media.type === 'VIDEO' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {item.media.type === 'VIDEO' ? 'Video' : 'Bild'}
                          </span>
                        )}
                        {/* Video indicator for page items */}
                        {item.page && display.isVideo && (
                          <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700">
                            Video
                          </span>
                        )}
                      </div>

                      {/* Non-media: type label + button text */}
                      {!item.media && (
                        <>
                          <span className="text-xs text-brand-text-muted font-mono">
                            {getItemSub(item)}
                          </span>
                          {item.linkUrl && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-brand-text-muted flex-shrink-0">BTN</span>
                              <input
                                type="text"
                                defaultValue={item.buttonText || ''}
                                onBlur={(e) => {
                                  if (e.target.value !== (item.buttonText || '')) {
                                    updateItemField(editingId!, item.id, 'buttonText', e.target.value)
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                }}
                                className="input-glass text-xs py-1 px-2 w-28"
                                placeholder="Mehr erfahren"
                                title="Button-Text"
                              />
                            </div>
                          )}
                        </>
                      )}

                      <button
                        type="button"
                        onClick={() => removeItem(editingId!, item.id)}
                        disabled={saving}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100"
                        title="Entfernen"
                      >
                        <XMarkIcon className="w-4 h-4 text-brand-text-muted hover:text-red-500" />
                      </button>

                      {/* Media items: second row with title, subtitle, link, button */}
                      {item.media && (
                        <div className="w-full flex flex-wrap items-center gap-2 pt-1.5 mt-1.5 border-t border-brand-border/50 pl-[4.5rem]">
                          <input
                            type="text"
                            defaultValue={item.title || ''}
                            onBlur={(e) => {
                              if (e.target.value !== (item.title || '')) {
                                updateItemField(editingId!, item.id, 'title', e.target.value)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                            }}
                            className="input-glass text-xs py-1 px-2 w-36"
                            placeholder="Titel"
                            title="Titel"
                          />
                          <input
                            type="text"
                            defaultValue={item.subtitle || ''}
                            onBlur={(e) => {
                              if (e.target.value !== (item.subtitle || '')) {
                                updateItemField(editingId!, item.id, 'subtitle', e.target.value)
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                            }}
                            className="input-glass text-xs py-1 px-2 w-44"
                            placeholder="Untertitel"
                            title="Untertitel"
                          />
                          <div className="flex items-center gap-1">
                            <LinkIcon className="w-3.5 h-3.5 text-brand-text-muted flex-shrink-0" />
                            <input
                              type="text"
                              defaultValue={item.linkUrl || ''}
                              onBlur={(e) => {
                                if (e.target.value !== (item.linkUrl || '')) {
                                  updateItemField(editingId!, item.id, 'linkUrl', e.target.value)
                                }
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                              }}
                              className="input-glass text-xs py-1 px-2 w-36"
                              placeholder="https://... oder /pfad"
                              title="Link-URL"
                            />
                          </div>
                          {item.linkUrl && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-brand-text-muted flex-shrink-0">BTN</span>
                              <input
                                type="text"
                                defaultValue={item.buttonText || ''}
                                onBlur={(e) => {
                                  if (e.target.value !== (item.buttonText || '')) {
                                    updateItemField(editingId!, item.id, 'buttonText', e.target.value)
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                                }}
                                className="input-glass text-xs py-1 px-2 w-28"
                                placeholder="Mehr erfahren"
                                title="Button-Text"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {/* Per-item display config: gradient + Ken Burns */}
                      {item.media && (
                        <div className="w-full flex flex-wrap items-center gap-3 pt-1.5 mt-1.5 border-t border-brand-border/50 pl-[4.5rem]">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-brand-text-muted whitespace-nowrap">Gradient</span>
                            <select
                              value={item.config?.gradient ?? ''}
                              onChange={(e) => {
                                const val = e.target.value || null
                                updateItemConfig(editingId!, item.id, item.config, 'gradient', val)
                              }}
                              className="input-glass text-xs py-1 px-2 w-24"
                            >
                              <option value="">Standard</option>
                              <option value="none">Keiner</option>
                              <option value="dark">Dunkel</option>
                              <option value="light">Hell</option>
                            </select>
                          </div>
                          <label className="flex items-center gap-1.5 cursor-pointer">
                            <span className="text-[10px] text-brand-text-muted whitespace-nowrap">Ken Burns</span>
                            <input
                              type="checkbox"
                              checked={item.config?.kenBurns !== false}
                              onChange={(e) => {
                                const val = e.target.checked ? null : false
                                updateItemConfig(editingId!, item.id, item.config, 'kenBurns', val)
                              }}
                              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                            />
                          </label>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {/* Message for new sliders in manual/mixed mode */}
        {(formFilterMode === 'manual' || formFilterMode === 'mixed' || isMediaType) && !sliderId && (
          <p className="text-sm text-brand-text-muted bg-amber-50 rounded-lg p-3">
            Erstellen Sie den Slider zuerst, um manuelle Elemente hinzuzufuegen.
          </p>
        )}
      </div>
    )
  }

  function renderAdsTab() {
    const filteredSponsorVendors = allVendors.filter(
      (v) => !sponsorVendorSearch || v.name.toLowerCase().includes(sponsorVendorSearch.toLowerCase())
    )
    const selectedSponsor = allVendors.find((v) => v.id === formSponsorVendorId)

    return (
      <div className="space-y-6">
        {/* Sponsor vendor */}
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1">Sponsor-Haendler</label>
          {selectedSponsor && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-lg bg-[#b87333]/10 border border-[#b87333]/20">
              <MegaphoneIcon className="w-4 h-4 text-[#b87333]" />
              <span className="text-sm font-medium text-[#b87333]">{selectedSponsor.name}</span>
              <button
                type="button"
                onClick={() => setFormSponsorVendorId(null)}
                className="ml-auto text-brand-text-muted hover:text-red-500"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          )}
          <input
            type="text"
            value={sponsorVendorSearch}
            onChange={(e) => setSponsorVendorSearch(e.target.value)}
            className="input-glass w-full text-sm"
            placeholder="Haendler suchen..."
          />
          {sponsorVendorSearch && (
            <div className="mt-1 max-h-32 overflow-y-auto rounded-lg border border-brand-border bg-brand-surface">
              {filteredSponsorVendors.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  onClick={() => {
                    setFormSponsorVendorId(v.id)
                    setSponsorVendorSearch('')
                  }}
                  className="w-full text-left px-3 py-1.5 text-sm hover:bg-brand-bg-dark transition-colors"
                >
                  {v.name}
                </button>
              ))}
              {filteredSponsorVendors.length === 0 && (
                <p className="px-3 py-2 text-xs text-brand-text-muted">Keine Ergebnisse</p>
              )}
            </div>
          )}
        </div>

        {/* CPM & target */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">CPM (EUR)</label>
            <div className="relative">
              <CurrencyEuroIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-text-muted" />
              <input
                type="number"
                min={0}
                step={0.01}
                value={formCostPerMille ?? ''}
                onChange={(e) => setFormCostPerMille(e.target.value ? parseFloat(e.target.value) : null)}
                className="input-glass w-full pl-9 text-sm"
                placeholder="0.00"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1">Impressions-Ziel</label>
            <input
              type="number"
              min={0}
              value={formImpressionTarget ?? ''}
              onChange={(e) => setFormImpressionTarget(e.target.value ? parseInt(e.target.value) : null)}
              className="input-glass w-full text-sm"
              placeholder="Unbegrenzt"
            />
          </div>
        </div>

        {/* Stats (read-only, only when editing) */}
        {editingId && (
          <div className="p-4 rounded-xl border border-brand-border bg-brand-bg/50 space-y-3">
            <h4 className="text-sm font-semibold text-brand-text flex items-center gap-1.5">
              <ChartBarIcon className="w-4 h-4" />
              Statistiken
            </h4>

            {/* Impressions with progress bar */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-brand-text-muted">Impressions</span>
                <span className="text-brand-text font-medium">
                  {editImpressions.toLocaleString('de-DE')} / {formImpressionTarget ? formImpressionTarget.toLocaleString('de-DE') : '\u221E'}
                </span>
              </div>
              {formImpressionTarget && formImpressionTarget > 0 && (
                <div className="w-full bg-brand-bg-dark rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      editImpressions / formImpressionTarget > 1
                        ? 'bg-[#b87333]'
                        : editImpressions / formImpressionTarget > 0.8
                        ? 'bg-yellow-500'
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(100, (editImpressions / formImpressionTarget) * 100)}%` }}
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-2 rounded-lg bg-brand-surface">
                <div className="text-lg font-semibold text-brand-text">{editClicks.toLocaleString('de-DE')}</div>
                <div className="text-xs text-brand-text-muted">Klicks</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-brand-surface">
                <div className="text-lg font-semibold text-brand-text">
                  {editImpressions > 0 ? ((editClicks / editImpressions) * 100).toFixed(2) + '%' : '\u2013'}
                </div>
                <div className="text-xs text-brand-text-muted">CTR</div>
              </div>
              <div className="text-center p-2 rounded-lg bg-brand-surface">
                <div className="text-lg font-semibold text-brand-text">
                  {formCostPerMille && editImpressions > 0
                    ? '\u20AC' + ((editImpressions / 1000) * formCostPerMille).toFixed(2)
                    : '\u2013'}
                </div>
                <div className="text-xs text-brand-text-muted">Umsatz</div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ─── Main render ───────────────────────────────────────────

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-brand-text">
            Slider verwalten ({sliders.length})
          </h1>
          <p className="text-sm text-brand-text-muted mt-1">
            Slider erstellen, konfigurieren und Elemente zuordnen
          </p>
        </div>
        <button onClick={openAddForm} className="btn-primary text-sm whitespace-nowrap">
          <PlusIcon className="w-4 h-4 inline mr-1" />
          Neuer Slider
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-xl mb-4">
          {error}
          <button onClick={() => setError('')} className="ml-2 underline">
            Schliessen
          </button>
        </div>
      )}

      {/* ─── Create/Edit Form ─────────────────────────────── */}
      {showForm && (
        <div className="glass rounded-2xl mb-6 overflow-hidden">
          {/* Form header */}
          <div className="flex items-center justify-between px-6 pt-5 pb-3">
            <h2 className="text-lg font-semibold text-brand-text">
              {editingId ? 'Slider bearbeiten' : 'Neuer Slider'}
            </h2>
            <button
              onClick={closeForm}
              className="p-1.5 rounded-lg hover:bg-brand-bg-dark transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-brand-text-muted" />
            </button>
          </div>

          {/* Tab bar */}
          <div className="px-6 flex gap-1 border-b border-brand-border">
            {([
              { key: 'basics' as FormTab, label: 'Grundlagen', icon: Cog6ToothIcon },
              { key: 'design' as FormTab, label: 'Design & Animation', icon: SparklesIcon },
              { key: 'content' as FormTab, label: 'Inhalte & Filter', icon: FunnelIcon },
              { key: 'ads' as FormTab, label: 'Werbung & Tracking', icon: MegaphoneIcon },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium rounded-t-lg transition-colors -mb-px ${
                  activeTab === tab.key
                    ? 'border-b-2 border-brand-accent text-brand-accent bg-brand-accent/5'
                    : 'text-brand-text-muted hover:text-brand-text'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="px-6 py-5">
            {renderTab()}
          </div>

          {/* Save / cancel */}
          <div className="flex gap-3 px-6 pb-5">
            <button
              onClick={handleSave}
              disabled={saving}
              className="btn-primary text-sm disabled:opacity-50"
            >
              {saving ? 'Speichern...' : editingId ? 'Speichern' : 'Erstellen'}
            </button>
            <button
              onClick={closeForm}
              className="px-4 py-2 text-sm rounded-lg bg-brand-bg-dark text-brand-text-muted hover:text-brand-text transition-colors"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* ─── Slider List ──────────────────────────────────── */}
      {sliders.length === 0 ? (
        <div className="glass-card text-center py-12">
          <p className="text-brand-text-muted mb-4">Noch keine Slider vorhanden.</p>
          <button onClick={openAddForm} className="btn-primary text-sm">
            Ersten Slider anlegen
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {sliders.map((slider) => {
            const ctr = slider.impressions > 0
              ? ((slider.clicks / slider.impressions) * 100).toFixed(1) + '%'
              : null

            return (
              <div
                key={slider.id}
                className={`glass-card ${!slider.isActive ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0">
                    {/* Row 1: Name + badges */}
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-sm font-semibold text-brand-text">
                        {slider.name}
                      </span>
                      <span
                        className={`px-2 py-0.5 text-xs rounded-full ${
                          slider.isActive
                            ? 'bg-green-100/50 text-green-800'
                            : 'bg-red-100/50 text-red-800'
                        }`}
                      >
                        {slider.isActive ? 'Aktiv' : 'Inaktiv'}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        slider.itemType === 'MEDIA'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-brand-accent/10 text-brand-accent'
                      }`}>
                        {ITEM_TYPE_LABELS[slider.itemType]}
                      </span>

                      {/* Filter mode badge */}
                      <span className={`px-2 py-0.5 text-xs rounded-full ${
                        slider.filterMode === 'auto' ? 'bg-blue-100/50 text-blue-700' :
                        slider.filterMode === 'mixed' ? 'bg-purple-100/50 text-purple-700' :
                        'bg-brand-bg-dark text-brand-text-muted'
                      }`}>
                        {FILTER_MODE_LABELS[slider.filterMode] || 'Manuell'}
                      </span>

                      {/* Animation badge */}
                      <span className="px-2 py-0.5 text-xs rounded-full bg-brand-bg-dark text-brand-text-muted">
                        {getAnimationBadge(slider.config)}
                      </span>

                      {/* Sponsor badge */}
                      {slider.sponsorVendor && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-[#b87333]/10 text-[#b87333] font-medium">
                          <MegaphoneIcon className="w-3 h-3 inline mr-0.5 -mt-0.5" />
                          {slider.sponsorVendor.name}
                        </span>
                      )}
                    </div>

                    {/* Row 2: Slug + stats */}
                    <div className="flex items-center gap-3 text-xs text-brand-text-muted flex-wrap">
                      <span className="font-mono">slider-{slider.slug}</span>
                      <span>{slider.items.length} Elemente</span>
                      {(slider.impressions > 0 || slider.clicks > 0) && (
                        <>
                          <span className="flex items-center gap-0.5">
                            <EyeIcon className="w-3 h-3" />
                            {slider.impressions.toLocaleString('de-DE')}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <CursorArrowRaysIcon className="w-3 h-3" />
                            {slider.clicks.toLocaleString('de-DE')}
                          </span>
                          {ctr && (
                            <span className="text-brand-accent font-medium">
                              CTR {ctr}
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => copySlug(slider.slug)}
                      className="px-2 py-1 text-xs rounded-lg bg-brand-bg-dark hover:bg-brand-bg-dark/80 transition-colors"
                      title="Slider-Slug kopieren"
                    >
                      {copiedSlug === slider.slug ? (
                        <CheckIcon className="w-3.5 h-3.5 text-green-600 inline" />
                      ) : (
                        <ClipboardIcon className="w-3.5 h-3.5 inline" />
                      )}
                    </button>
                    <button
                      onClick={() => toggleActive(slider)}
                      className="px-3 py-1.5 text-xs rounded-lg bg-brand-bg-dark hover:bg-brand-bg-dark/80 transition-colors"
                    >
                      {slider.isActive ? 'Deaktivieren' : 'Aktivieren'}
                    </button>
                    <button
                      onClick={() => openEditForm(slider)}
                      className="p-1.5 rounded-lg hover:bg-brand-bg-dark transition-colors"
                      title="Bearbeiten"
                    >
                      <PencilIcon className="w-4 h-4 text-brand-text-muted" />
                    </button>
                    {deleteConfirm === slider.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => deleteSlider(slider.id)}
                          disabled={saving}
                          className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                        >
                          <CheckIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(null)}
                          className="p-1.5 rounded-lg hover:bg-brand-bg-dark transition-colors"
                        >
                          <XMarkIcon className="w-4 h-4 text-brand-text-muted" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setDeleteConfirm(slider.id)}
                        className="p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                        title="Loeschen"
                      >
                        <TrashIcon className="w-4 h-4 text-brand-text-muted hover:text-red-500" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
