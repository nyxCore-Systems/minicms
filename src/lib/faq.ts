// Pure helpers for the homepage festival FAQ. No React/Prisma imports so the
// logic stays unit-testable (see __tests__/faq.test.ts). FaqItem is the same
// shape lib/seo.ts's buildFaqJsonLd consumes.
import type { FaqItem } from '@/lib/markdown'

const TZ = 'Europe/Berlin'
const day = (d: Date) => new Intl.DateTimeFormat('de-DE', { day: 'numeric', timeZone: TZ }).format(d)
const month = (d: Date) => new Intl.DateTimeFormat('de-DE', { month: 'long', timeZone: TZ }).format(d)
const year = (d: Date) => new Intl.DateTimeFormat('de-DE', { year: 'numeric', timeZone: TZ }).format(d)
const dayKey = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit', timeZone: TZ }).format(d)

/** German long-date label, e.g. "7. und 8. August 2026". Same-day / null end
 *  collapses to a single date; a cross-month range keeps both month names. */
export function formatFestivalDateLabel(start: Date, end: Date | null): string {
  if (!end || dayKey(start) === dayKey(end)) {
    return `${day(start)}. ${month(start)} ${year(start)}`
  }
  if (month(start) === month(end) && year(start) === year(end)) {
    return `${day(start)}. und ${day(end)}. ${month(end)} ${year(end)}`
  }
  return `${day(start)}. ${month(start)} und ${day(end)}. ${month(end)} ${year(end)}`
}

/** Homepage FAQ heading + intro — shared by the public page and the admin seed. */
export const HOMEPAGE_FAQ_TITLE = 'Häufig gestellte Fragen'
export const HOMEPAGE_FAQ_SUBTITLE = 'Alles Wichtige zu Termin, Ort, Anreise und Eintritt.'

/** Resolve the homepage FAQ (title/subtitle + items) from the featured event,
 *  falling back to static defaults when no event is set. Pure — no Prisma. */
export function resolveFestivalFaq(
  featured: { startDate: Date; endDate: Date | null; locationName: string | null } | null,
): { title: string; subtitle: string; items: FaqItem[] } {
  const dateLabel = featured
    ? formatFestivalDateLabel(featured.startDate, featured.endDate)
    : '7. und 8. August 2026'
  const location = featured?.locationName || 'Hof Thiele, Ventschau'
  return {
    title: HOMEPAGE_FAQ_TITLE,
    subtitle: HOMEPAGE_FAQ_SUBTITLE,
    items: festivalFaqDefaults({ dateLabel, location }),
  }
}

/** The default festival FAQ. The "Wo?" answer carries the broad region terms. */
export function festivalFaqDefaults(input: { dateLabel: string; location: string }): FaqItem[] {
  const { dateLabel, location } = input
  return [
    {
      question: 'Wann findet das e-Ventschau-Festival 2026 statt?',
      answer: `Am ${dateLabel} (Freitag & Samstag), Open Air auf dem Hof.`,
    },
    {
      question: 'Wo findet das Festival statt?',
      answer: `Auf ${location}, Landkreis Lüneburg – im Norden Niedersachsens (Norddeutschland).`,
    },
    {
      question: 'Was kostet der Eintritt?',
      answer: 'Zahl-was-du-kannst: sozial verträglicher Eintritt, 100 % Benefiz.',
    },
    {
      question: 'Welche Musik läuft?',
      answer:
        'Internationale Live-Musik – Blues-Rock, Funk, Latin u. a., dazu Ausstellungen, Vorträge und Kinderprogramm.',
    },
    {
      question: 'Anreise & Camping?',
      answer: 'Anfahrt nach Ventschau; Camping frei auf der Wiese.',
    },
  ]
}
