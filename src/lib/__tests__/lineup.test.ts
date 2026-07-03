import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  resolveLineupCategories, orderSlots, LINEUP_DEFAULT_CATEGORIES, CATEGORY_LABELS, type LineupSlot,
} from '../lineup'

const slot = (id: string, category = 'musik'): LineupSlot => ({
  appearanceId: id, category, categoryLabel: CATEGORY_LABELS[category] ?? category,
  name: id, image: null, slug: id, genres: [], origin: null, excerpt: null, meta: '',
})

// resolveLineupCategories --------------------------------------------------
test('resolveLineupCategories: leer/undefined → Default (alle außer break)', () => {
  assert.deepEqual(resolveLineupCategories(undefined), LINEUP_DEFAULT_CATEGORIES)
  assert.deepEqual(resolveLineupCategories([]), LINEUP_DEFAULT_CATEGORIES)
  assert.ok(!LINEUP_DEFAULT_CATEGORIES.includes('break'))
})

test('resolveLineupCategories: filtert unbekannte Werte, behält gültige Reihenfolge', () => {
  assert.deepEqual(resolveLineupCategories(['film', 'quatsch', 'break']), ['film', 'break'])
})

test('resolveLineupCategories: nur-ungültig → Default', () => {
  assert.deepEqual(resolveLineupCategories(['quatsch']), LINEUP_DEFAULT_CATEGORIES)
})

// orderSlots ---------------------------------------------------------------
test('orderSlots: leere Order → Eingangsreihenfolge unverändert', () => {
  const input = [slot('a'), slot('b'), slot('c')]
  assert.deepEqual(orderSlots(input, []).map((s) => s.appearanceId), ['a', 'b', 'c'])
})

test('orderSlots: gespeicherte Order zuerst, neue Slots hinten in Eingangsreihenfolge', () => {
  const input = [slot('a'), slot('b'), slot('c'), slot('d')] // (Tag,Zeit)-Reihenfolge
  const out = orderSlots(input, ['c', 'a']).map((s) => s.appearanceId)
  assert.deepEqual(out, ['c', 'a', 'b', 'd'])
})

test('orderSlots: nicht mehr existierende ids in Order werden ignoriert', () => {
  const input = [slot('a'), slot('b')]
  assert.deepEqual(orderSlots(input, ['x', 'b', 'a']).map((s) => s.appearanceId), ['b', 'a'])
})
