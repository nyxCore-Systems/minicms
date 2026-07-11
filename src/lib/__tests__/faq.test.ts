import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  formatFestivalDateLabel,
  festivalFaqDefaults,
  resolveFestivalFaq,
  HOMEPAGE_FAQ_TITLE,
  HOMEPAGE_FAQ_SUBTITLE,
} from '../faq'

test('two-day range in one month → "7. und 8. August 2026"', () => {
  const start = new Date('2026-08-07T10:00:00+02:00')
  const end = new Date('2026-08-08T10:00:00+02:00')
  assert.equal(formatFestivalDateLabel(start, end), '7. und 8. August 2026')
})

test('single day (end null) → "7. August 2026"', () => {
  const start = new Date('2026-08-07T10:00:00+02:00')
  assert.equal(formatFestivalDateLabel(start, null), '7. August 2026')
})

test('same start/end day collapses to one date', () => {
  const d = new Date('2026-08-07T10:00:00+02:00')
  assert.equal(formatFestivalDateLabel(d, d), '7. August 2026')
})

test('range across months keeps both month names', () => {
  const start = new Date('2026-07-31T10:00:00+02:00')
  const end = new Date('2026-08-01T10:00:00+02:00')
  assert.equal(formatFestivalDateLabel(start, end), '31. Juli und 1. August 2026')
})

test('festivalFaqDefaults interpolates date + location and carries region terms', () => {
  const items = festivalFaqDefaults({ dateLabel: '7. und 8. August 2026', location: 'Hof Thiele, Ventschau' })
  assert.equal(items.length, 5)
  assert.match(items[0].answer, /7\. und 8\. August 2026/)
  const wo = items[1].answer
  assert.match(wo, /Hof Thiele, Ventschau/)
  assert.match(wo, /Niedersachsen/)
  assert.match(wo, /Norddeutschland/)
})

test('resolveFestivalFaq: uses the featured event date + location', () => {
  const featured = {
    startDate: new Date('2026-08-07T10:00:00+02:00'),
    endDate: new Date('2026-08-08T10:00:00+02:00'),
    locationName: 'Hof Meyer, Ventschau',
  }
  const faq = resolveFestivalFaq(featured)
  assert.equal(faq.title, HOMEPAGE_FAQ_TITLE)
  assert.equal(faq.subtitle, HOMEPAGE_FAQ_SUBTITLE)
  assert.equal(faq.items.length, 5)
  assert.match(faq.items[0].answer, /7\. und 8\. August 2026/)
  assert.match(faq.items[1].answer, /Hof Meyer, Ventschau/)
})

test('resolveFestivalFaq: falls back to defaults when no featured event', () => {
  const faq = resolveFestivalFaq(null)
  assert.match(faq.items[0].answer, /7\. und 8\. August 2026/)
  assert.match(faq.items[1].answer, /Hof Thiele, Ventschau/)
})
