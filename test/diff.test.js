import { test } from 'node:test'
import assert from 'node:assert/strict'
import { diffPayloads, renderDiff } from '../lib/diff.js'

const base = {
  title: 'T', state: 'open', body: 'a\nb', labels: [],
  comments: [{ id: 1, author: 'x', created: '2026-01-01', body: 'hello' }],
  attachments: [{ id: 5, filename: 'a.png' }]
}

test('a rewritten description with the same line count shows the changed lines', () => {
  const out = renderDiff('K-1', '', diffPayloads(base, { ...base, body: 'a\nc' }))
  assert.match(out, /- b/)
  assert.match(out, /\+ c/)
})

test('an edited comment surfaces', () => {
  const next = { ...base, comments: [{ ...base.comments[0], body: 'changed' }] }
  assert.equal(diffPayloads(base, next).editedComments.length, 1)
})

test('a title change is reported', () => {
  assert.match(renderDiff('K-1', '', diffPayloads(base, { ...base, title: 'U' })), /"T" → "U"/)
})

test('a new attachment with an existing filename is detected by id', () => {
  const next = { ...base, attachments: [...base.attachments, { id: 6, filename: 'a.png' }] }
  assert.equal(diffPayloads(base, next).newAttachments.length, 1)
})

test('new comments are printed in full', () => {
  const long = 'x'.repeat(300)
  const next = { ...base, comments: [...base.comments, { id: 2, author: 'y', created: '2026-01-02', body: long }] }
  assert.ok(renderDiff('K-1', '', diffPayloads(base, next)).includes(long))
})

test('identical payloads report no change', () => {
  assert.equal(diffPayloads(base, base).changed, false)
})
