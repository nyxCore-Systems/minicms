import assert from 'node:assert/strict'
import { markdownToPlate } from '@/components/admin/editor/serialization/markdownToPlate'
import {
  plateValueFor,
  markdownFrom,
  sectionContentToValue,
  valueToSectionContent,
  type ContentEditorValue,
} from '@/lib/contentEditor'

// plateValueFor: a non-empty mirror is preferred verbatim (lossless rehydration)
{
  const mirror = markdownToPlate('# Aus JSON')
  assert.deepEqual(plateValueFor('# Aus Markdown', mirror), mirror)
}
// plateValueFor: null mirror -> derive from markdown
{
  assert.deepEqual(plateValueFor('# Hallo', null), markdownToPlate('# Hallo'))
}
// plateValueFor: empty-array mirror (legacy record) -> derive from markdown
{
  assert.deepEqual(plateValueFor('# Hallo', []), markdownToPlate('# Hallo'))
}
// markdownFrom: round-trips a derived tree back to identical markdown (P0-lossless)
{
  const md = '# Titel\n\nAbsatz mit **fett** und *kursiv*.'
  assert.equal(markdownFrom(markdownToPlate(md)), md)
}
// markdownFrom: empty tree -> empty string
{
  assert.equal(markdownFrom([]), '')
}
// sectionContentToValue: full triple blob passes through unchanged
{
  const tree = markdownToPlate('# X')
  assert.deepEqual(
    sectionContentToValue({ markdown: '# X', contentJson: tree, editorMode: 'wysiwyg' }),
    { markdown: '# X', contentJson: tree, editorMode: 'wysiwyg' },
  )
}
// sectionContentToValue: legacy { markdown } blob -> safe defaults
{
  assert.deepEqual(
    sectionContentToValue({ markdown: 'alt' }),
    { markdown: 'alt', contentJson: [], editorMode: 'markdown' },
  )
}
// sectionContentToValue: null / non-object blob -> empty defaults
{
  const expected = { markdown: '', contentJson: [], editorMode: 'markdown' }
  assert.deepEqual(sectionContentToValue(null), expected)
  assert.deepEqual(sectionContentToValue(undefined), expected)
  assert.deepEqual(sectionContentToValue('nope'), expected)
}
// sectionContentToValue: invalid editorMode -> 'markdown'
{
  assert.equal(sectionContentToValue({ markdown: 'x', editorMode: 'bogus' }).editorMode, 'markdown')
}
// valueToSectionContent: null contentJson normalized to []
{
  const v = { markdown: 'x', contentJson: null, editorMode: 'wysiwyg' } as unknown as ContentEditorValue
  assert.deepEqual(valueToSectionContent(v), { markdown: 'x', contentJson: [], editorMode: 'wysiwyg' })
}
// valueToSectionContent: invalid editorMode -> 'markdown'; missing markdown -> ''
{
  const v = { markdown: undefined, contentJson: [], editorMode: 'bogus' } as unknown as ContentEditorValue
  assert.deepEqual(valueToSectionContent(v), { markdown: '', contentJson: [], editorMode: 'markdown' })
}

console.log('✓ contentEditor.test.ts — all assertions passed')
