'use client'

import React, { useCallback, useState } from 'react'
import { PlateElement, type PlateElementProps } from '@udecode/plate/react'
import { DirectiveWrapper } from './DirectiveWrapper'
import type { HeroSliderElement as HeroSliderElementType, HeroSliderSlide } from '../types'

const VARIANTS = ['viewport', 'full', 'fitted'] as const
const VARIANT_LABELS: Record<string, string> = {
  viewport: 'Viewport (100vh)',
  full: 'Full (60vh)',
  fitted: 'Fitted (50vh)',
}

export function HeroSliderElement(props: PlateElementProps<HeroSliderElementType>) {
  const { children, element, editor } = props
  const [slides, setSlides] = useState<HeroSliderSlide[]>(element.slides || [])
  const variant = element.variant || 'viewport'

  const updateElement = useCallback((updates: Partial<HeroSliderElementType>) => {
    const path = editor.api.findPath(element)
    if (path) {
      editor.tf.setNodes(updates as any, { at: path })
    }
  }, [editor, element])

  const setVariant = useCallback((v: string) => {
    updateElement({ variant: v as 'viewport' | 'full' | 'fitted' })
  }, [updateElement])

  const updateSlide = useCallback((index: number, field: keyof HeroSliderSlide, value: string) => {
    const updated = slides.map((s, i) => i === index ? { ...s, [field]: value } : s)
    setSlides(updated)
    updateElement({ slides: updated })
  }, [slides, updateElement])

  const addSlide = useCallback(() => {
    const updated = [...slides, { image: '' }]
    setSlides(updated)
    updateElement({ slides: updated })
  }, [slides, updateElement])

  const removeSlide = useCallback((index: number) => {
    const updated = slides.filter((_, i) => i !== index)
    setSlides(updated)
    updateElement({ slides: updated })
  }, [slides, updateElement])

  return (
    <PlateElement {...props}>
      <DirectiveWrapper label="Hero-Slider" color="hero">
        <div contentEditable={false} className="space-y-3">
          <div className="flex items-center gap-1">
            {VARIANTS.map(v => (
              <button
                key={v}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); setVariant(v) }}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  v === variant ? 'bg-gray-800 text-white' : 'bg-brand-bg-dark text-brand-text-muted hover:bg-gray-200'
                }`}
              >
                {VARIANT_LABELS[v]}
              </button>
            ))}
          </div>

          {slides.map((slide, i) => (
            <div key={i} className="bg-brand-surface border border-gray-200 rounded p-2 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-brand-text-muted">Folie {i + 1}</span>
                <button
                  type="button"
                  onMouseDown={(e) => { e.preventDefault(); removeSlide(i) }}
                  className="text-[10px] text-red-500 hover:text-red-700"
                >
                  Entfernen
                </button>
              </div>
              <input type="text" value={slide.image} onChange={e => updateSlide(i, 'image', e.target.value)} placeholder="Bild-URL" className="w-full text-xs border border-gray-200 rounded px-2 py-1" />
              <input type="text" value={slide.heading || ''} onChange={e => updateSlide(i, 'heading', e.target.value)} placeholder="Überschrift" className="w-full text-xs border border-gray-200 rounded px-2 py-1" />
              <input type="text" value={slide.description || ''} onChange={e => updateSlide(i, 'description', e.target.value)} placeholder="Beschreibung" className="w-full text-xs border border-gray-200 rounded px-2 py-1" />
              <div className="grid grid-cols-2 gap-1.5">
                <input type="text" value={slide.button || ''} onChange={e => updateSlide(i, 'button', e.target.value)} placeholder="Button-Text" className="w-full text-xs border border-gray-200 rounded px-2 py-1" />
                <input type="text" value={slide.href || ''} onChange={e => updateSlide(i, 'href', e.target.value)} placeholder="Link-URL" className="w-full text-xs border border-gray-200 rounded px-2 py-1" />
              </div>
            </div>
          ))}

          <button
            type="button"
            onMouseDown={(e) => { e.preventDefault(); addSlide() }}
            className="text-xs text-brand-accent hover:underline"
          >
            + Folie hinzufügen
          </button>
        </div>
        <span className="hidden">{children}</span>
      </DirectiveWrapper>
    </PlateElement>
  )
}
