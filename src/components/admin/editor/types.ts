import type { TElement } from '@udecode/plate'

// ── Element type constants ──────────────────────────────────────────
export const ELEMENT_CALLOUT = 'callout'
export const ELEMENT_BOX = 'box'
export const ELEMENT_HERO = 'hero'
export const ELEMENT_COLUMNS = 'columns'
export const ELEMENT_COLUMN = 'column'
export const ELEMENT_HERO_SECTION = 'hero-section'
export const ELEMENT_HERO_SLIDER = 'hero-slider'
export const ELEMENT_CV_TIMELINE = 'cv-timeline'
export const ELEMENT_PROJECT_BENTO = 'project-bento'
export const ELEMENT_SHOWCASE = 'showcase'
export const ELEMENT_GRID = 'grid'
export const ELEMENT_BANNER = 'banner'
export const ELEMENT_SLIDER = 'slider'
export const ELEMENT_PRODUCTS = 'products'
export const ELEMENT_DIRECTIVE_RAW = 'directive-raw'

// ── Editable blocks (rich text children) ────────────────────────────

export interface CalloutElement extends TElement {
  type: typeof ELEMENT_CALLOUT
  variant: 'info' | 'warning' | 'tip' | 'danger'
}

export interface BoxElement extends TElement {
  type: typeof ELEMENT_BOX
}

export interface HeroElement extends TElement {
  type: typeof ELEMENT_HERO
}

export interface ColumnsElement extends TElement {
  type: typeof ELEMENT_COLUMNS
  columnCount: 2 | 3
}

export interface ColumnElement extends TElement {
  type: typeof ELEMENT_COLUMN
}

// ── Void blocks (data-driven, form UI) ──────────────────────────────

export interface HeroSectionElement extends TElement {
  type: typeof ELEMENT_HERO_SECTION
  rawMarkdown: string
}

export interface HeroSliderSlide {
  image: string
  heading?: string
  description?: string
  button?: string
  href?: string
}

export interface HeroSliderElement extends TElement {
  type: typeof ELEMENT_HERO_SLIDER
  variant: 'viewport' | 'full' | 'fitted'
  slides: HeroSliderSlide[]
}

export interface CvTimelineElement extends TElement {
  type: typeof ELEMENT_CV_TIMELINE
  rawMarkdown: string
}

export interface ProjectBentoElement extends TElement {
  type: typeof ELEMENT_PROJECT_BENTO
  rawMarkdown: string
}

export interface ShowcaseItem {
  name: string
  description?: string
  href?: string
  image?: string
  count?: string
}

export interface ShowcaseElement extends TElement {
  type: typeof ELEMENT_SHOWCASE
  items: ShowcaseItem[]
}

export interface GridItem {
  title: string
  image?: string
  href?: string
  description?: string
}

export interface GridElement extends TElement {
  type: typeof ELEMENT_GRID
  items: GridItem[]
}

export interface BannerElement extends TElement {
  type: typeof ELEMENT_BANNER
  bannerId?: string
}

export interface SliderBlockElement extends TElement {
  type: typeof ELEMENT_SLIDER
  slug: string
}

export interface ProductsElement extends TElement {
  type: typeof ELEMENT_PRODUCTS
  slug: string
}

/** Fallback: raw markdown preserved as-is for unknown/not-yet-implemented directives */
export interface DirectiveRawElement extends TElement {
  type: typeof ELEMENT_DIRECTIVE_RAW
  rawMarkdown: string
}

// ── Union type ──────────────────────────────────────────────────────

export type DirectiveElement =
  | CalloutElement
  | BoxElement
  | HeroElement
  | ColumnsElement
  | ColumnElement
  | HeroSectionElement
  | HeroSliderElement
  | CvTimelineElement
  | ProjectBentoElement
  | ShowcaseElement
  | GridElement
  | BannerElement
  | SliderBlockElement
  | ProductsElement
  | DirectiveRawElement
