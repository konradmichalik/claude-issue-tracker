import { test } from 'node:test'
import assert from 'node:assert/strict'
import { renderReport } from '../lib/render.js'
import { localDate } from '../lib/date.js'

test('closing report uses the resolution heading with the local date', () => {
  const out = renderReport({ lang: 'en', kind: 'abschluss', done: ['a'], open: [], next: 'x' })
  assert.ok(out.startsWith(`**Resolution ${localDate()}**`))
})

test('a list is separated from its label by a blank line', () => {
  assert.match(renderReport({ done: ['a'], open: ['b'] }), /Erledigt\n\n- a\n\nOffen\n\n- b/)
})
