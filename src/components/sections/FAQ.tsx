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
  subtitle: 'Alles Wichtige rund um Messer, Materialien, Pflege und unser Händlerportal',
  items: [
    {
      question: 'Welche Messerarten bieten Sie an?',
      answer:
        'Wir bieten eine sorgfältig kuratierte Auswahl an Küchenmessern, Outdoormessern und exklusiven Messerkollektionen. Von japanischen Santoku-Messern über europäische Kochmesser bis hin zu robusten Jagd- und Bushcraft-Messern — hier finden Sie das perfekte Messer für jeden Einsatzzweck.',
    },
    {
      question: 'Wie pflege ich meine Messer richtig?',
      answer:
        'Hochwertige Messer sollten stets von Hand gespült und sofort getrocknet werden. Verwenden Sie ein Schneidebrett aus Holz oder Kunststoff — niemals Glas oder Keramik. Regelmäßiges Abziehen mit einem Wetzstahl hält die Schneide lang scharf. Für die professionelle Aufbewahrung empfehlen wir einen Messerblock oder eine Magnetleiste.',
    },
    {
      question: 'Was macht ein gutes Küchenmesser aus?',
      answer:
        'Ein gutes Küchenmesser zeichnet sich durch hochwertigen Stahl, eine ausgewogene Balance zwischen Klinge und Griff, einen ergonomischen Griff und exzellente Schnitthaltigkeit aus. Der Schneidenwinkel, die Härte (gemessen in HRC), die Klingengeometrie und die Verarbeitung bestimmen maßgeblich die Qualität und Langlebigkeit eines Messers.',
    },
    {
      question: 'Aus welchen Materialien werden die Klingen gefertigt?',
      answer:
        'Unsere Hersteller verwenden verschiedene Hochleistungsstähle: Rostfreien Stahl mit über 13% Chrom für pflegeleichte Alltagsmesser, Kohlenstoffstahl für extreme Schärfe und feines Schnittgefühl, Damaststahl aus bis zu 300 gefalteten Lagen für einzigartige Muster und höchste Qualität, sowie pulvermetallurgischen Stahl (PM-Stahl) für maximale Härte und Verschleißfestigkeit.',
    },
    {
      question: 'Wie kann ich als Händler bei Das Messer verkaufen?',
      answer:
        'Gewerbliche Händler und Messerschmieden können sich über unser Händlerportal registrieren. Wir bieten transparente Festpreise ab 39,90 €/Monat statt Provisionen — keine versteckten Kosten wie bei Amazon oder Google. Besuchen Sie unsere Seite "So funktioniert es" für alle Details zum Partnerschaftsprogramm.',
    },
    {
      question: 'Welche Schleifmethoden empfehlen Sie?',
      answer:
        'Für die tägliche Pflege empfehlen wir einen Wetzstahl oder Keramikstab zum Aufrichten des Grats. Zum eigentlichen Nachschleifen eignen sich japanische Wassersteine (Körnung 1000/3000) oder geführte Schleifsysteme wie das Lansky-System. Vermeiden Sie Durchziehschärfer — sie können die Schneide dauerhaft beschädigen. Für Profis empfehlen wir das Schleifen am Bandschleifer mit anschließendem Polieren.',
    },
    {
      question: 'Was ist Damaststahl und warum ist er besonders?',
      answer:
        'Damaststahl entsteht durch wiederholtes Falten und Feuerverschweißen verschiedener Stahlsorten. Dabei werden wechselnd weiche und harte Stahllagen kombiniert — das Ergebnis sind einzigartige Muster und eine Klinge, die sowohl elastisch als auch extrem scharf ist. Historisch wurde dieses Verfahren bereits im Mittelalter perfektioniert. Heute ist Damast ein Zeichen höchster Schmiedekunst.',
    },
  ],
}

export default function FAQ({ data }: FAQProps) {
  const d = data || defaultData
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: d.items.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }

  return (
    <section id="faq" className="py-20">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(faqSchema)
              .replace(/</g, '\\u003c')
              .replace(/>/g, '\\u003e')
              .replace(/&/g, '\\u0026'),
          }}
        />

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
