'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import type { TElement } from '@udecode/plate'
import {
  ELEMENT_CALLOUT,
  ELEMENT_BOX,
  ELEMENT_HERO,
  ELEMENT_COLUMNS,
  ELEMENT_COLUMN,
  ELEMENT_HERO_SECTION,
  ELEMENT_HERO_SLIDER,
  ELEMENT_CV_TIMELINE,
  ELEMENT_PROJECT_BENTO,
  ELEMENT_SHOWCASE,
  ELEMENT_GRID,
  ELEMENT_BANNER,
  ELEMENT_DONATE,
  ELEMENT_SLIDER,
  ELEMENT_PRODUCTS,
} from './types'

interface SlashMenuItem {
  label: string
  description: string
  category: string
  insert: () => TElement
}

const CATEGORIES = [
  'Text',
  'Listen',
  'Layout',
  'Callouts',
  'Inhalte',
  'Einbettungen',
]

function createItems(): SlashMenuItem[] {
  return [
    // Text
    { label: 'Absatz', description: 'Normaler Text', category: 'Text', insert: () => ({ type: 'p', children: [{ text: '' }] }) },
    { label: 'Überschrift 1', description: 'Große Überschrift', category: 'Text', insert: () => ({ type: 'h1', children: [{ text: '' }] }) },
    { label: 'Überschrift 2', description: 'Mittlere Überschrift', category: 'Text', insert: () => ({ type: 'h2', children: [{ text: '' }] }) },
    { label: 'Überschrift 3', description: 'Kleine Überschrift', category: 'Text', insert: () => ({ type: 'h3', children: [{ text: '' }] }) },
    { label: 'Zitat', description: 'Blockzitat', category: 'Text', insert: () => ({ type: 'blockquote', children: [{ type: 'p', children: [{ text: '' }] }] }) },
    { label: 'Trennlinie', description: 'Horizontale Linie', category: 'Text', insert: () => ({ type: 'hr', children: [{ text: '' }] }) },

    // Layout
    { label: 'Zwei Spalten', description: 'Zweispaltiges Layout', category: 'Layout', insert: () => ({
      type: ELEMENT_COLUMNS, columnCount: 2,
      children: [
        { type: ELEMENT_COLUMN, children: [{ type: 'p', children: [{ text: '' }] }] },
        { type: ELEMENT_COLUMN, children: [{ type: 'p', children: [{ text: '' }] }] },
      ],
    }) },
    { label: 'Drei Spalten', description: 'Dreispaltiges Layout', category: 'Layout', insert: () => ({
      type: ELEMENT_COLUMNS, columnCount: 3,
      children: [
        { type: ELEMENT_COLUMN, children: [{ type: 'p', children: [{ text: '' }] }] },
        { type: ELEMENT_COLUMN, children: [{ type: 'p', children: [{ text: '' }] }] },
        { type: ELEMENT_COLUMN, children: [{ type: 'p', children: [{ text: '' }] }] },
      ],
    }) },
    { label: 'Feature-Box', description: 'Glas-Karte', category: 'Layout', insert: () => ({
      type: ELEMENT_BOX, children: [{ type: 'p', children: [{ text: '' }] }],
    }) },

    // Callouts
    { label: 'Info', description: 'Info-Hinweis', category: 'Callouts', insert: () => ({
      type: ELEMENT_CALLOUT, variant: 'info', children: [{ type: 'p', children: [{ text: '' }] }],
    }) },
    { label: 'Warnung', description: 'Warnungshinweis', category: 'Callouts', insert: () => ({
      type: ELEMENT_CALLOUT, variant: 'warning', children: [{ type: 'p', children: [{ text: '' }] }],
    }) },
    { label: 'Tipp', description: 'Hilfreicher Tipp', category: 'Callouts', insert: () => ({
      type: ELEMENT_CALLOUT, variant: 'tip', children: [{ type: 'p', children: [{ text: '' }] }],
    }) },
    { label: 'Achtung', description: 'Dringende Warnung', category: 'Callouts', insert: () => ({
      type: ELEMENT_CALLOUT, variant: 'danger', children: [{ type: 'p', children: [{ text: '' }] }],
    }) },

    // Inhalte
    { label: 'Hero', description: 'Hero-Block', category: 'Inhalte', insert: () => ({
      type: ELEMENT_HERO, children: [{ type: 'h1', children: [{ text: '' }] }],
    }) },
    { label: 'Hero-Section', description: 'Animierte Hero', category: 'Inhalte', insert: () => ({
      type: ELEMENT_HERO_SECTION, rawMarkdown: '', children: [{ text: '' }],
    }) },
    { label: 'Hero-Slider', description: 'Bild-Slider', category: 'Inhalte', insert: () => ({
      type: ELEMENT_HERO_SLIDER, variant: 'viewport', slides: [{ image: '' }], children: [{ text: '' }],
    }) },
    { label: 'CV-Timeline', description: 'Lebenslauf-Timeline', category: 'Inhalte', insert: () => ({
      type: ELEMENT_CV_TIMELINE, rawMarkdown: '', children: [{ text: '' }],
    }) },
    { label: 'Projekt-Bento', description: 'Projekt-Raster', category: 'Inhalte', insert: () => ({
      type: ELEMENT_PROJECT_BENTO, rawMarkdown: '', children: [{ text: '' }],
    }) },
    { label: 'Showcase', description: 'Showcase-Block', category: 'Inhalte', insert: () => ({
      type: ELEMENT_SHOWCASE, items: [{ name: '' }], children: [{ text: '' }],
    }) },
    { label: 'Grid', description: 'Organisches Grid', category: 'Inhalte', insert: () => ({
      type: ELEMENT_GRID, items: [{ title: '' }], children: [{ text: '' }],
    }) },

    // Einbettungen
    { label: 'Banner', description: 'Werbebanner', category: 'Einbettungen', insert: () => ({
      type: ELEMENT_BANNER, children: [{ text: '' }],
    }) },
    { label: 'PayPal-Spende', description: 'PayPal-Spendenbutton', category: 'Einbettungen', insert: () => ({
      type: ELEMENT_DONATE, children: [{ text: '' }],
    }) },
    { label: 'Slider', description: 'Inhalts-Slider', category: 'Einbettungen', insert: () => ({
      type: ELEMENT_SLIDER, slug: '', children: [{ text: '' }],
    }) },
    { label: 'Produkte', description: 'Produktliste', category: 'Einbettungen', insert: () => ({
      type: ELEMENT_PRODUCTS, slug: '', children: [{ text: '' }],
    }) },
  ]
}

interface SlashCommandMenuProps {
  onInsert: (node: TElement) => void
  onClose: () => void
  position?: { top: number; left: number }
}

export function SlashCommandMenu({ onInsert, onClose, position }: SlashCommandMenuProps) {
  const [search, setSearch] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const items = createItems()
  const filtered = search
    ? items.filter(item =>
        item.label.toLowerCase().includes(search.toLowerCase()) ||
        item.description.toLowerCase().includes(search.toLowerCase()) ||
        item.category.toLowerCase().includes(search.toLowerCase())
      )
    : items

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filtered.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && filtered[selectedIndex]) {
      e.preventDefault()
      onInsert(filtered[selectedIndex].insert())
      onClose()
    }
  }, [filtered, selectedIndex, onInsert, onClose])

  // Group by category
  const grouped: { category: string; items: (SlashMenuItem & { globalIndex: number })[] }[] = []
  let globalIdx = 0
  const categoryMap = new Map<string, (SlashMenuItem & { globalIndex: number })[]>()
  for (const item of filtered) {
    if (!categoryMap.has(item.category)) categoryMap.set(item.category, [])
    categoryMap.get(item.category)!.push({ ...item, globalIndex: globalIdx++ })
  }
  for (const cat of CATEGORIES) {
    const catItems = categoryMap.get(cat)
    if (catItems && catItems.length > 0) {
      grouped.push({ category: cat, items: catItems })
    }
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 w-72 max-h-80 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-600 overflow-hidden flex flex-col animate-fade-in"
      style={position ? { top: position.top, left: position.left } : { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
    >
      <div className="p-2 border-b border-gray-100 dark:border-slate-700">
        <input
          ref={inputRef}
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Block suchen..."
          className="w-full text-sm border border-gray-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-brand-text dark:text-slate-100 placeholder:text-brand-text-light dark:placeholder:text-slate-400 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-accent/30"
        />
      </div>
      <div className="flex-1 overflow-y-auto p-1">
        {grouped.length === 0 && (
          <p className="text-xs text-brand-text-light text-center py-4">Kein Block gefunden</p>
        )}
        {grouped.map(group => (
          <div key={group.category}>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-brand-text-light px-2 pt-2 pb-1">{group.category}</p>
            {group.items.map(item => (
              <button
                key={item.label}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onInsert(item.insert()); onClose() }}
                className={`w-full text-left px-2 py-1.5 rounded-lg flex items-center gap-2 transition-colors ${
                  item.globalIndex === selectedIndex ? 'bg-brand-accent/10 text-brand-text' : 'text-brand-text hover:bg-brand-bg-dark'
                }`}
              >
                <div>
                  <span className="text-xs font-medium">{item.label}</span>
                  <span className="text-[10px] text-brand-text-light ml-1.5">{item.description}</span>
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
