import { test } from 'node:test'
import assert from 'node:assert/strict'
import { isUpcomingEvent, filterUpcomingEvents } from '../upcomingEvents'

const now = new Date('2026-07-11T12:00:00+02:00')

test('isUpcomingEvent: a future event is upcoming', () => {
  assert.equal(isUpcomingEvent({ startDate: new Date('2026-08-07T10:00:00+02:00'), endDate: null }, now), true)
})

test('isUpcomingEvent: a fully past event is not upcoming', () => {
  assert.equal(isUpcomingEvent({ startDate: new Date('2023-08-05T10:00:00+02:00'), endDate: new Date('2023-08-06T10:00:00+02:00') }, now), false)
})

test('isUpcomingEvent: an event still running today counts as upcoming (uses endDate)', () => {
  // started yesterday, ends tomorrow → still upcoming
  assert.equal(isUpcomingEvent({ startDate: new Date('2026-07-10T10:00:00+02:00'), endDate: new Date('2026-07-12T22:00:00+02:00') }, now), true)
})

test('isUpcomingEvent: single-day event earlier today is no longer upcoming', () => {
  assert.equal(isUpcomingEvent({ startDate: new Date('2026-07-11T08:00:00+02:00'), endDate: null }, now), false)
})

test('filterUpcomingEvents: keeps only upcoming, preserves order', () => {
  const events = [
    { slug: 'past', startDate: new Date('2023-08-05T10:00:00+02:00'), endDate: new Date('2023-08-06T10:00:00+02:00') },
    { slug: 'future', startDate: new Date('2026-08-07T10:00:00+02:00'), endDate: new Date('2026-08-08T10:00:00+02:00') },
  ]
  const out = filterUpcomingEvents(events, now)
  assert.deepEqual(out.map((e) => e.slug), ['future'])
})
