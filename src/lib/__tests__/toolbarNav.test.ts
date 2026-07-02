import assert from 'node:assert/strict'
import { nextToolbarIndex } from '@/lib/toolbarNav'

// ArrowRight / ArrowDown advance, wrapping at the end
assert.equal(nextToolbarIndex('ArrowRight', 0, 3), 1)
assert.equal(nextToolbarIndex('ArrowRight', 2, 3), 0) // wrap to first
assert.equal(nextToolbarIndex('ArrowDown', 1, 3), 2)  // Down is an alias for Right

// ArrowLeft / ArrowUp retreat, wrapping at the start
assert.equal(nextToolbarIndex('ArrowLeft', 1, 3), 0)
assert.equal(nextToolbarIndex('ArrowLeft', 0, 3), 2)  // wrap to last
assert.equal(nextToolbarIndex('ArrowUp', 2, 3), 1)    // Up is an alias for Left

// Home / End jump to the ends
assert.equal(nextToolbarIndex('Home', 2, 3), 0)
assert.equal(nextToolbarIndex('End', 0, 3), 2)

// Non-navigation keys return null (event passes through)
assert.equal(nextToolbarIndex('Enter', 0, 3), null)
assert.equal(nextToolbarIndex(' ', 0, 3), null)
assert.equal(nextToolbarIndex('a', 0, 3), null)

// Single-item toolbar: wrap keeps index at 0
assert.equal(nextToolbarIndex('ArrowRight', 0, 1), 0)
assert.equal(nextToolbarIndex('ArrowLeft', 0, 1), 0)
assert.equal(nextToolbarIndex('End', 0, 1), 0)

// Empty toolbar guard: never returns a bad index
assert.equal(nextToolbarIndex('ArrowRight', 0, 0), null)
assert.equal(nextToolbarIndex('Home', 0, 0), null)

console.log('✓ toolbarNav.test.ts — all assertions passed')
