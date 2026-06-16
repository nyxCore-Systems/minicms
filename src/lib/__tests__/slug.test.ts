import assert from 'node:assert/strict'
import { normalizeSlug, isValidSlug, safeHttpsUrl, safeCloudinaryUrl } from '../slug'

assert.equal(normalizeSlug('Motörhead'), 'motoerhead')
assert.equal(normalizeSlug('Thorbjørn Risager & The Black Tornado'), 'thorbjorn-risager-the-black-tornado')
assert.equal(normalizeSlug('  Über Größe  '), 'ueber-groesse')
assert.equal(normalizeSlug('a'.repeat(200)).length, 96)

assert.equal(isValidSlug('e-ventschau-2026'), true)
assert.equal(isValidSlug('-bad'), false)
assert.equal(isValidSlug('Bad Caps'), false)
assert.equal(isValidSlug(''), false)

assert.equal(safeHttpsUrl('https://example.com/x'), 'https://example.com/x')
assert.equal(safeHttpsUrl('http://example.com'), null)
assert.equal(safeHttpsUrl('https://user:pw@example.com'), null)
assert.equal(safeHttpsUrl('not a url'), null)

assert.equal(safeCloudinaryUrl('https://res.cloudinary.com/x/y.jpg'), 'https://res.cloudinary.com/x/y.jpg')
assert.equal(safeCloudinaryUrl('https://evil.com/y.jpg'), null)

console.log('✓ slug.test.ts — all assertions passed')
