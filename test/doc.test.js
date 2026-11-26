import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { parseFrontmatter, getSection, parseRequirements, CANONICAL_SECTIONS } from '../lib/doc.js'

const fixture = readFileSync(new URL('./fixtures/issue.md', import.meta.url), 'utf-8')

test('fixture: frontmatter and every canonical section with content are found', () => {
  const fm = parseFrontmatter(fixture)
  assert.equal(fm.key, 'PROJ-312')
  assert.deepEqual(fm.sessions, ['2026-09-06 491b05d1 PROJ-312-sortierung'])
  for (const name of ['Zusammenfassung', 'Anforderungen', 'Betroffene Bereiche', 'Risiken', 'Erkenntnisse']) {
    assert.ok(getSection(fixture, name), `${name} missing`)
  }
  assert.ok(CANONICAL_SECTIONS.includes('Risiken'))
})

test('canonical section names match case-insensitively', () => {
  assert.equal(getSection('## anforderungen\n- [ ] a', 'Anforderungen'), '- [ ] a')
})

test('[x] and [X] both count as checked', () => {
  const reqs = parseRequirements('## Anforderungen\n- [x] a\n- [X] b\n- [ ] c')
  assert.deepEqual(reqs.map(r => r.checked), [true, true, false])
})

test('a heading inside a fenced code block does not end the section', () => {
  const doc = '## Erkenntnisse\n- eintrag\n```md\n## Kein Abschnitt\n```\n- danach\n\n## Quellen\nx'
  assert.equal(getSection(doc, 'Erkenntnisse'), '- eintrag\n```md\n## Kein Abschnitt\n```\n- danach')
})

test('an inline empty list parses as an empty list', () => {
  assert.deepEqual(parseFrontmatter('---\nsessions: []\n---\n').sessions, [])
})
