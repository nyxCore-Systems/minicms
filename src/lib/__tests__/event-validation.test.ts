import assert from 'node:assert/strict'
import {
  sanitizeEventType, ALLOWED_ROLES, ALLOWED_CURRENCIES,
  sanitizeStage, sanitizeAppearance, sanitizePriceTier,
} from '../event-validation'

assert.equal(sanitizeEventType('concert'), 'concert')
assert.equal(sanitizeEventType('WORKSHOP'), 'workshop')
assert.equal(sanitizeEventType('garbage'), 'festival')

assert.deepEqual(sanitizeStage({ name: 'Hauptbühne', color: '#b87333' }, 2),
  { name: 'Hauptbühne', color: '#b87333', sortOrder: 2 })
assert.equal(sanitizeStage({ name: '' }, 0), null)
assert.equal(sanitizeStage({ name: 'X', color: 'red' }, 0)!.color, null)

const a1 = sanitizeAppearance({ stageId: 's1', artistId: 'art1', title: 'ignored', role: 'headliner', startTime: '2026-08-07T20:00:00Z' }, 0)!
assert.equal(a1.artistId, 'art1')
assert.equal(a1.title, null)
assert.equal(a1.role, 'headliner')

const a2 = sanitizeAppearance({ stageId: 's1', title: 'Umbaupause', role: 'break', startTime: '2026-08-07T21:00:00Z' }, 1)!
assert.equal(a2.artistId, null)
assert.equal(a2.title, 'Umbaupause')

assert.equal(sanitizeAppearance({ stageId: 's1', startTime: '2026-08-07T20:00:00Z' }, 0), null)
assert.equal(sanitizeAppearance({ artistId: 'a', startTime: '2026-08-07T20:00:00Z' }, 0), null)
assert.equal(sanitizeAppearance({ stageId: 's1', artistId: 'a', startTime: '2026-08-07T20:00:00Z', endTime: '2026-08-07T19:00:00Z' }, 0), null)
assert.equal(sanitizeAppearance({ stageId: 's1', artistId: 'a', role: 'nonsense', startTime: '2026-08-07T20:00:00Z' }, 0)!.role, 'support')

const p1 = sanitizePriceTier({ name: 'Festival 2-Tage', price: 49, currency: 'EUR' }, 0)!
assert.equal(p1.price, 49)
assert.equal(p1.currency, 'EUR')
assert.equal(sanitizePriceTier({ name: 'X', price: -5 }, 0)!.price, null)
assert.equal(sanitizePriceTier({ name: 'X', currency: 'XYZ' }, 0)!.currency, 'EUR')
assert.equal(sanitizePriceTier({ name: '' }, 0), null)
assert.equal(sanitizePriceTier({ name: 'X', buyUrl: 'http://x.com' }, 0)!.buyUrl, null)
assert.equal(sanitizePriceTier({ name: 'X', validFrom: '2026-02-01', validUntil: '2026-01-01' }, 0), null)

assert.ok(ALLOWED_ROLES.includes('guest'))
assert.ok(ALLOWED_CURRENCIES.includes('CHF'))

console.log('✓ event-validation.test.ts — all assertions passed')
