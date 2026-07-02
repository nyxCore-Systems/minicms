import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildMetadata } from '../seo'

// buildMetadata must emit alternates.canonical so tracking-param variants
// (?utm_*, ?fbclid) collapse to a single indexable URL in Search Console.
test('buildMetadata sets an absolute alternates.canonical for the given path', () => {
  const md = buildMetadata(null, '/kontakt', { title: 'Kontakt', description: 'x' })
  const canonical = String(md.alternates?.canonical ?? '')
  assert.match(canonical, /^https?:\/\//)
  assert.ok(canonical.endsWith('/kontakt'), `got: ${canonical}`)
})

// The canonical and the OpenGraph url share one source of truth — they must agree.
test('buildMetadata canonical matches the OpenGraph url', () => {
  const md = buildMetadata(null, '/events/foo', { title: 'Foo', description: 'x' })
  assert.equal(String(md.alternates?.canonical ?? ''), String(md.openGraph?.url ?? ''))
})
