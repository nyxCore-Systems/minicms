import assert from 'node:assert/strict'
import { localDayKey, localClock, combineDayClock, resolveEndDate, eventDays } from '../timetable-datetime'

// --- localDayKey / localClock (local-time round-trips, TZ-independent) ---
const d = new Date(2026, 7, 8, 20, 5) // 8 Aug 2026, 20:05 local
assert.equal(localDayKey(d), '2026-08-08')
assert.equal(localClock(d), '20:05')
assert.equal(localClock(new Date(2026, 7, 8, 9, 0)), '09:00')
assert.equal(localDayKey(new Date(2026, 0, 1, 0, 0)), '2026-01-01')

// --- combineDayClock ---
const combined = combineDayClock('2026-08-08', '21:30')
assert.equal(combined.getFullYear(), 2026)
assert.equal(combined.getMonth(), 7)
assert.equal(combined.getDate(), 8)
assert.equal(combined.getHours(), 21)
assert.equal(combined.getMinutes(), 30)
// round-trips through the local helpers
assert.equal(localDayKey(combined), '2026-08-08')
assert.equal(localClock(combined), '21:30')

// --- resolveEndDate ---
const start = combineDayClock('2026-08-08', '20:00')
// normal same-day end
const end1 = resolveEndDate(start, '2026-08-08', '21:00')
assert.ok(end1)
assert.equal(localDayKey(end1!), '2026-08-08')
assert.equal(localClock(end1!), '21:00')
// overnight: end clock <= start clock rolls to next day
const overnightStart = combineDayClock('2026-08-08', '23:00')
const end2 = resolveEndDate(overnightStart, '2026-08-08', '01:00')
assert.ok(end2)
assert.equal(localDayKey(end2!), '2026-08-09')
assert.equal(localClock(end2!), '01:00')
// empty end clock -> null
assert.equal(resolveEndDate(start, '2026-08-08', ''), null)

// --- eventDays ---
// two-day festival
const two = eventDays(new Date(2026, 7, 7, 12, 0), new Date(2026, 7, 8, 23, 0))
assert.deepEqual(two.map((o) => o.value), ['2026-08-07', '2026-08-08'])
assert.deepEqual(two.map((o) => o.label), ['07.08.', '08.08.'])
// single-day (endDate null)
const one = eventDays(new Date(2026, 7, 7, 12, 0), null)
assert.deepEqual(one.map((o) => o.value), ['2026-08-07'])
// legacy day outside range is merged in and sorted
const merged = eventDays(new Date(2026, 7, 7), new Date(2026, 7, 8), ['2026-08-10', '2026-08-07'])
assert.deepEqual(merged.map((o) => o.value), ['2026-08-07', '2026-08-08', '2026-08-10'])
// cross-year festival shows the year in the label
const ny = eventDays(new Date(2026, 11, 31), new Date(2027, 0, 1))
assert.deepEqual(ny.map((o) => o.label), ['31.12.2026', '01.01.2027'])

console.log('✓ timetable-datetime.test.ts — all assertions passed')
