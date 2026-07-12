import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseBlocks } from '../directiveParser'

test('parseBlocks: :::artists-grid::: parses to a single artists-grid block', () => {
  const blocks = parseBlocks(':::artists-grid\n:::')
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].type, 'artists-grid')
})

test('parseBlocks: :::upcoming-events::: parses to a single upcoming-events block', () => {
  const blocks = parseBlocks(':::upcoming-events\n:::')
  assert.equal(blocks.length, 1)
  assert.equal(blocks[0].type, 'upcoming-events')
})

test('parseBlocks: new directives coexist with surrounding markdown', () => {
  const blocks = parseBlocks('# Line-up\n\n:::artists-grid\n:::\n\nWeiter geht es.')
  const types = blocks.map((b) => b.type)
  assert.ok(types.includes('artists-grid'), 'has artists-grid block')
  assert.ok(types.includes('markdown'), 'keeps surrounding markdown')
})
