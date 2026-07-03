import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildMetadata, buildMusicFestivalJsonLd } from '../seo'

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

// ── MusicFestival JSON-LD (homepage entity) ────────────────────────────────
const festivalInput = {
  siteUrl: 'https://e-ventschau.de',
  name: 'e-Ventschau',
  description: 'Benefiz-Festival',
  image: 'https://res.cloudinary.com/x/logo.png',
  organizerName: 'e-Ventschau e. V.',
  sameAs: ['https://www.facebook.com/groups/436038379848640/', 'https://www.instagram.com/e.ventschau/'],
  address: {
    venueName: 'Hof Thiele',
    street: 'Am Bruch 1-2',
    postalCode: '21371',
    locality: 'Tosterglope-Ventschau',
    region: 'Niedersachsen',
    country: 'DE',
    lat: 53.207676,
    lng: 10.85933,
  },
  featured: {
    title: 'e-Ventschau 2026',
    slug: 'e-ventschau-2026',
    startDate: new Date('2026-08-07T16:00:00.000Z'),
    endDate: new Date('2026-08-08T22:00:00.000Z'),
    locationName: 'Hof Thiele',
  },
  editions: [
    { title: 'e-Ventschau 2026', slug: 'e-ventschau-2026', startDate: new Date('2026-08-07T16:00:00.000Z'), endDate: new Date('2026-08-08T22:00:00.000Z') },
    { title: 'e-Ventschau 2025', slug: 'e-ventschau-2025', startDate: new Date('2025-08-08T16:00:00.000Z'), endDate: null },
  ],
}

test('buildMusicFestivalJsonLd returns null when there is no featured edition to anchor dates', () => {
  assert.equal(buildMusicFestivalJsonLd({ ...festivalInput, featured: null }), null)
})

test('buildMusicFestivalJsonLd builds a MusicFestival with Place, geo, organizer, subEvents and sameAs', () => {
  const ld: any = buildMusicFestivalJsonLd(festivalInput)
  assert.equal(ld['@type'], 'MusicFestival')
  assert.equal(ld.url, 'https://e-ventschau.de/')
  assert.equal(ld.startDate, '2026-08-07T16:00:00.000Z')
  assert.equal(ld.endDate, '2026-08-08T22:00:00.000Z')
  assert.equal(ld.eventAttendanceMode, 'https://schema.org/OfflineEventAttendanceMode')
  assert.equal(ld.location['@type'], 'Place')
  assert.equal(ld.location.name, 'Hof Thiele')
  assert.equal(ld.location.address.streetAddress, 'Am Bruch 1-2')
  assert.equal(ld.location.address.addressLocality, 'Tosterglope-Ventschau')
  assert.equal(ld.location.address.addressCountry, 'DE')
  assert.equal(ld.location.geo.latitude, 53.207676)
  assert.equal(ld.location.geo.longitude, 10.85933)
  assert.equal(ld.organizer.name, 'e-Ventschau e. V.')
  assert.equal(ld.subEvent.length, 2)
  assert.equal(ld.subEvent[0].url, 'https://e-ventschau.de/events/e-ventschau-2026')
  assert.equal(ld.subEvent[1].endDate, undefined) // null endDate is omitted, not serialized
  assert.deepEqual(ld.sameAs, festivalInput.sameAs)
})

test('buildMusicFestivalJsonLd omits location entirely when there is no address and no fallback name', () => {
  const ld: any = buildMusicFestivalJsonLd({
    ...festivalInput,
    address: null,
    featured: { ...festivalInput.featured, locationName: null },
  })
  assert.equal('location' in ld, false)
})

test('buildMusicFestivalJsonLd falls back to featured.locationName for the Place name', () => {
  const ld: any = buildMusicFestivalJsonLd({ ...festivalInput, address: null })
  assert.equal(ld.location.name, 'Hof Thiele')
  assert.equal('address' in ld.location, false)
  assert.equal('geo' in ld.location, false)
})
