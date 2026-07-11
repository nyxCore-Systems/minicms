import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseVideoUrl,
  embedUrl,
  youtubeThumb,
  detectStandaloneVideo,
} from '../videoEmbed'

test('parseVideoUrl: youtu.be short link with tracking query', () => {
  assert.deepEqual(parseVideoUrl('https://youtu.be/Xf-uUy5pdUI?si=gb63tfPwOF4KNmw0'), {
    kind: 'youtube',
    id: 'Xf-uUy5pdUI',
  })
})

test('parseVideoUrl: youtube.com/watch?v= form', () => {
  assert.deepEqual(parseVideoUrl('https://www.youtube.com/watch?v=Xf-uUy5pdUI&t=30'), {
    kind: 'youtube',
    id: 'Xf-uUy5pdUI',
  })
})

test('parseVideoUrl: /embed/ and /shorts/ forms', () => {
  assert.deepEqual(parseVideoUrl('https://www.youtube.com/embed/Xf-uUy5pdUI'), { kind: 'youtube', id: 'Xf-uUy5pdUI' })
  assert.deepEqual(parseVideoUrl('https://www.youtube.com/shorts/Xf-uUy5pdUI'), { kind: 'youtube', id: 'Xf-uUy5pdUI' })
})

test('parseVideoUrl: bare 11-char id is accepted as youtube', () => {
  assert.deepEqual(parseVideoUrl('Xf-uUy5pdUI'), { kind: 'youtube', id: 'Xf-uUy5pdUI' })
})

test('parseVideoUrl: vimeo numeric forms', () => {
  assert.deepEqual(parseVideoUrl('https://vimeo.com/123456789'), { kind: 'vimeo', id: '123456789' })
  assert.deepEqual(parseVideoUrl('https://player.vimeo.com/video/123456789'), { kind: 'vimeo', id: '123456789' })
})

test('parseVideoUrl: rejects a channel URL (not a video)', () => {
  assert.equal(parseVideoUrl('https://www.youtube.com/channel/UCsXVk37bltHxD1rDPwtNM8Q'), null)
  assert.equal(parseVideoUrl('https://www.youtube-nocookie.com/channel/UCsXVk37bltHxD1rDPwtNM8Q'), null)
})

test('parseVideoUrl: rejects a 24-char channel id on youtu.be (not 11 chars)', () => {
  assert.equal(parseVideoUrl('https://youtu.be/UCsXVk37bltHxD1rDPwtNM8Q'), null)
})

test('parseVideoUrl: rejects junk', () => {
  assert.equal(parseVideoUrl(''), null)
  assert.equal(parseVideoUrl('hello world'), null)
  assert.equal(parseVideoUrl('https://example.com/foo'), null)
})

test('embedUrl: youtube uses nocookie embed, vimeo uses player', () => {
  assert.equal(embedUrl({ kind: 'youtube', id: 'Xf-uUy5pdUI' }), 'https://www.youtube-nocookie.com/embed/Xf-uUy5pdUI')
  assert.equal(embedUrl({ kind: 'vimeo', id: '123456789' }), 'https://player.vimeo.com/video/123456789')
})

test('youtubeThumb: predictable hqdefault URL', () => {
  assert.equal(youtubeThumb('Xf-uUy5pdUI'), 'https://img.youtube.com/vi/Xf-uUy5pdUI/hqdefault.jpg')
})

test('detectStandaloneVideo: a bare URL alone in a paragraph embeds', () => {
  assert.deepEqual(detectStandaloneVideo('https://youtu.be/Xf-uUy5pdUI?si=abc'), { kind: 'youtube', id: 'Xf-uUy5pdUI' })
  assert.deepEqual(detectStandaloneVideo('  https://vimeo.com/123456789  '), { kind: 'vimeo', id: '123456789' })
})

test('detectStandaloneVideo: a URL surrounded by prose stays a link (null)', () => {
  assert.equal(detectStandaloneVideo('Check this https://youtu.be/Xf-uUy5pdUI out'), null)
})

test('detectStandaloneVideo: custom link text (non-URL) is not embedded', () => {
  assert.equal(detectStandaloneVideo('watch here'), null)
  assert.equal(detectStandaloneVideo(''), null)
  assert.equal(detectStandaloneVideo('   '), null)
})
