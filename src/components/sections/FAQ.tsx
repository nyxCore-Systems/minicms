'use client'

import { useState } from 'react'
import { ChevronDownIcon } from '@heroicons/react/24/outline'

export interface FAQItem {
  question: string
  answer: string
}

export interface FAQData {
  title: string
  subtitle: string
  items: FAQItem[]
}

interface FAQProps {
  data?: FAQData
}

const defaultData: FAQData = {
  title: 'Häufig gestellte Fragen',
  subtitle: '',
  items: [],
}

export default function FAQ({ data }: FAQProps) {
  const d = data || defaultData
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <section id="faq" className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-brand-text mb-4">
            {d.title}
          </h2>
          <p className="text-brand-text-muted text-lg max-w-2xl mx-auto">
            {d.subtitle}
          </p>
        </div>

        <div className="space-y-3">
          {d.items.map((faq, index) => (
            <div
              key={index}
              className="glass-card cursor-pointer"
              onClick={() => setOpenIndex(openIndex === index ? null : index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setOpenIndex(openIndex === index ? null : index)
                }
              }}
            >
              <div className="flex items-center justify-between gap-4">
                <h3 className="text-base sm:text-lg font-medium text-brand-text pr-2">
                  {faq.question}
                </h3>
                <ChevronDownIcon
                  className={`w-5 h-5 text-brand-text-muted flex-shrink-0 transition-transform duration-300 ${
                    openIndex === index ? 'rotate-180' : ''
                  }`}
                />
              </div>
              <div
                className={`grid transition-all duration-300 ${
                  openIndex === index
                    ? 'grid-rows-[1fr] opacity-100 mt-4'
                    : 'grid-rows-[0fr] opacity-0'
                }`}
              >
                <div className="overflow-hidden">
                  <p className="text-brand-text-muted leading-relaxed">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
