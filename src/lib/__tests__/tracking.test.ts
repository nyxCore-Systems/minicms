import { test } from 'node:test'
import assert from 'node:assert/strict'
import { shouldSkipTracking } from '../tracking'

test('anonymous visitor (no token) is tracked', () => {
  assert.equal(shouldSkipTracking(null), false)
  assert.equal(shouldSkipTracking(undefined), false)
})

test('logged-in ADMIN is not tracked', () => {
  assert.equal(shouldSkipTracking({ role: 'ADMIN' }), true)
})

test('logged-in EDITOR is not tracked', () => {
  assert.equal(shouldSkipTracking({ role: 'EDITOR' }), true)
})

test('a token without a staff role is still tracked', () => {
  assert.equal(shouldSkipTracking({ role: 'SUBSCRIBER' }), false)
  assert.equal(shouldSkipTracking({ role: undefined }), false)
  assert.equal(shouldSkipTracking({}), false)
})
