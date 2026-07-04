import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  INDEXNOW_KEY,
  indexNowEnabled,
  toAbsoluteUrls,
  buildIndexNowBody,
} from '../indexnow'

test('indexNowEnabled: prod https host only', () => {
  assert.equal(indexNowEnabled('https://e-ventschau.de'), true)
  assert.equal(indexNowEnabled('http://e-ventschau.de'), false)
  assert.equal(indexNowEnabled('http://localhost:3000'), false)
  assert.equal(indexNowEnabled('https://localhost'), false)
})

test('toAbsoluteUrls: prefixes site, dedupes, drops off-host', () => {
  const out = toAbsoluteUrls(
    ['/events/x', '/events/x', '/kuenstler', '', 'https://evil.com/x'],
    'https://e-ventschau.de',
  )
  assert.deepEqual(out, [
    'https://e-ventschau.de/events/x',
    'https://e-ventschau.de/kuenstler',
  ])
})

test('buildIndexNowBody: host, key, keyLocation, urlList', () => {
  const body = buildIndexNowBody(['https://e-ventschau.de/'], 'https://e-ventschau.de', 'ABCkey123')
  assert.equal(body.host, 'e-ventschau.de')
  assert.equal(body.key, 'ABCkey123')
  assert.equal(body.keyLocation, 'https://e-ventschau.de/ABCkey123.txt')
  assert.deepEqual(body.urlList, ['https://e-ventschau.de/'])
})

test('key is valid and the hosted file matches it', () => {
  assert.match(INDEXNOW_KEY, /^[A-Za-z0-9-]{8,128}$/)
  const file = readFileSync(join(process.cwd(), 'public', `${INDEXNOW_KEY}.txt`), 'utf8')
  assert.equal(file.trim(), INDEXNOW_KEY)
})
