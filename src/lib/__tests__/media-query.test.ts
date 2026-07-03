import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseMediaQuery, buildMediaWhere, paginate, MEDIA_PAGE_SIZE, MEDIA_MAX_LIMIT,
} from '../media-query'

const q = (s: string) => new URLSearchParams(s)

// parseMediaQuery ----------------------------------------------------------
test('parseMediaQuery: leer → Defaults', () => {
  assert.deepEqual(parseMediaQuery(q('')), {
    search: undefined, type: undefined, cursor: undefined, limit: MEDIA_PAGE_SIZE,
  })
})

test('parseMediaQuery: type wird validiert und normalisiert', () => {
  assert.equal(parseMediaQuery(q('type=IMAGE')).type, 'IMAGE')
  assert.equal(parseMediaQuery(q('type=video')).type, 'VIDEO')
  assert.equal(parseMediaQuery(q('type=all')).type, undefined)
  assert.equal(parseMediaQuery(q('type=bogus')).type, undefined)
})

test('parseMediaQuery: search wird getrimmt, leer → undefined', () => {
  assert.equal(parseMediaQuery(q('search=%20foo%20')).search, 'foo')
  assert.equal(parseMediaQuery(q('search=%20%20')).search, undefined)
  assert.equal(parseMediaQuery(q('')).search, undefined)
})

test('parseMediaQuery: cursor durchgereicht, leer → undefined', () => {
  assert.equal(parseMediaQuery(q('cursor=abc123')).cursor, 'abc123')
  assert.equal(parseMediaQuery(q('cursor=')).cursor, undefined)
})

test('parseMediaQuery: limit geklemmt auf [1, MAX], Default bei Unsinn', () => {
  assert.equal(parseMediaQuery(q('limit=10')).limit, 10)
  assert.equal(parseMediaQuery(q('limit=9999')).limit, MEDIA_MAX_LIMIT)
  assert.equal(parseMediaQuery(q('limit=0')).limit, MEDIA_PAGE_SIZE)
  assert.equal(parseMediaQuery(q('limit=-5')).limit, MEDIA_PAGE_SIZE)
  assert.equal(parseMediaQuery(q('limit=abc')).limit, MEDIA_PAGE_SIZE)
  assert.equal(parseMediaQuery(q('limit=12.9')).limit, 12)
})

// buildMediaWhere ----------------------------------------------------------
test('buildMediaWhere: nur tenantId ohne Filter', () => {
  assert.deepEqual(buildMediaWhere('t1', {}), { tenantId: 't1' })
})

test('buildMediaWhere: type-Filter', () => {
  assert.deepEqual(buildMediaWhere('t1', { type: 'VIDEO' }), { tenantId: 't1', type: 'VIDEO' })
})

test('buildMediaWhere: search als case-insensitive contains', () => {
  assert.deepEqual(buildMediaWhere('t1', { search: 'logo' }), {
    tenantId: 't1', filename: { contains: 'logo', mode: 'insensitive' },
  })
})

test('buildMediaWhere: type + search kombiniert', () => {
  assert.deepEqual(buildMediaWhere('t1', { type: 'IMAGE', search: 'x' }), {
    tenantId: 't1', type: 'IMAGE', filename: { contains: 'x', mode: 'insensitive' },
  })
})

// paginate -----------------------------------------------------------------
const row = (id: string) => ({ id })

test('paginate: weniger als limit → kein nextCursor', () => {
  const rows = [row('a'), row('b')]
  assert.deepEqual(paginate(rows, 5), { items: rows, nextCursor: null })
})

test('paginate: genau limit → kein nextCursor', () => {
  const rows = [row('a'), row('b')]
  assert.deepEqual(paginate(rows, 2), { items: rows, nextCursor: null })
})

test('paginate: limit+1 → letztes abschneiden, nextCursor = letztes sichtbares id', () => {
  const rows = [row('a'), row('b'), row('c')] // limit 2, fetched 3
  const res = paginate(rows, 2)
  assert.deepEqual(res.items, [row('a'), row('b')])
  assert.equal(res.nextCursor, 'b')
})
