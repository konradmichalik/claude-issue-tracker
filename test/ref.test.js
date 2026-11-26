import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseRef } from '../lib/ref.js'

test('GH- and RM- keys are not mistaken for Jira keys', () => {
  assert.equal(parseRef('GH-22').tracker, 'github')
  assert.equal(parseRef('RM-110434').tracker, 'redmine')
  assert.equal(parseRef('GH-22').needsContext, true)
})

test('owner/repo#n parses to GitHub', () => {
  const ref = parseRef('owner/repo#22')
  assert.deepEqual([ref.tracker, ref.key, ref.owner, ref.repo, ref.number], ['github', 'GH-22', 'owner', 'repo', 22])
})

test('<host>#n parses to Redmine for a known host', () => {
  const ref = parseRef('forge.typo3.org#110434')
  assert.deepEqual([ref.tracker, ref.key, ref.host], ['redmine', 'RM-110434', 'forge.typo3.org'])
})

test('the ref written to the frontmatter parses back to the same document', () => {
  for (const input of ['https://github.com/o/r/issues/7', 'https://forge.typo3.org/issues/9', 'PROJ-1']) {
    const first = parseRef(input)
    assert.equal(parseRef(first.ref).filename, first.filename)
  }
})

test('a Jira key still resolves to Jira', () => {
  assert.equal(parseRef('PROJ-312').tracker, 'jira')
})
