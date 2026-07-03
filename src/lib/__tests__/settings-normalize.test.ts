import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSocialLinks, normalizeContactAddress } from '../settings-normalize'

// socialLinks is a free-form JSON column; only clean, non-empty URL strings survive.
test('normalizeSocialLinks keeps trimmed non-empty strings and drops junk', () => {
  assert.deepEqual(
    normalizeSocialLinks(['  https://a  ', '', 42, null, 'https://b']),
    ['https://a', 'https://b'],
  )
})

test('normalizeSocialLinks returns [] for anything that is not an array', () => {
  assert.deepEqual(normalizeSocialLinks(null), [])
  assert.deepEqual(normalizeSocialLinks('https://x'), [])
  assert.deepEqual(normalizeSocialLinks(undefined), [])
})

// contactAddress is a free-form JSON column; strings are trimmed, geo is coerced to
// finite numbers (the admin form submits them as text), empty fields are dropped.
test('normalizeContactAddress trims strings, coerces numeric geo, drops empties', () => {
  const a = normalizeContactAddress({
    venueName: ' Hof Thiele ',
    street: ' Am Bruch 1-2 ',
    postalCode: '21371',
    locality: 'Tosterglope-Ventschau',
    region: '',
    country: '',
    lat: '53.207676',
    lng: '10.85933',
  })
  assert.equal(a?.venueName, 'Hof Thiele')
  assert.equal(a?.street, 'Am Bruch 1-2')
  assert.equal(a?.postalCode, '21371')
  assert.equal(a?.locality, 'Tosterglope-Ventschau')
  assert.equal(a?.region, undefined)
  assert.equal(a?.country, undefined)
  assert.equal(a?.lat, 53.207676)
  assert.equal(a?.lng, 10.85933)
})

test('normalizeContactAddress returns null when nothing usable is present', () => {
  assert.equal(normalizeContactAddress({ street: '', lat: '', lng: 'abc' }), null)
  assert.equal(normalizeContactAddress(null), null)
  assert.equal(normalizeContactAddress('nope'), null)
})
