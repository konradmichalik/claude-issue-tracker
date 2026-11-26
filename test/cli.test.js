import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'

const bin = new URL('../bin/i', import.meta.url).pathname
const fixture = readFileSync(new URL('./fixtures/issue.md', import.meta.url), 'utf-8')

function project() {
  const dir = mkdtempSync(join(tmpdir(), 'i-test-'))
  mkdirSync(join(dir, '.issues'))
  writeFileSync(join(dir, '.issues', 'PROJ-312.md'), fixture)
  return dir
}

const run = (cwd, ...args) => spawnSync('node', [bin, ...args], { cwd, encoding: 'utf-8' })

test('status prints the breadcrumb with its child lines and stops at the next item', () => {
  const out = run(project(), 'status').stdout
  assert.match(out, /🔖 Stand\n  - Erledigt: a\n  - Nächster Schritt: b tun/)
  assert.doesNotMatch(out, /Weiterer Eintrag/)
})

test('init creates .issues/.gitignore with *', () => {
  const dir = mkdtempSync(join(tmpdir(), 'i-test-'))
  run(dir, 'init')
  assert.equal(readFileSync(join(dir, '.issues', '.gitignore'), 'utf-8'), '*\n')
})

test('post rejects a flag the tracker does not support before posting', () => {
  const dir = project()
  const result = run(dir, 'post', 'PROJ-312', '-f', join(dir, 'x.md'), '--close')
  assert.equal(result.status, 1)
  assert.match(result.stderr, /--close gilt nur für GitHub/)
})

test('report-template accepts the english kind names and rejects unknown ones', () => {
  const dir = project()
  writeFileSync(join(dir, 'r.json'), '{"done":["a"]}')
  assert.match(run(dir, 'report-template', '--lang', 'en', '--kind', 'closing', '--json', join(dir, 'r.json')).stdout, /Resolution/)
  assert.equal(run(dir, 'report-template', '--kind', 'nope', '--json', join(dir, 'r.json')).status, 1)
})

test('GH-<n> resolves through the document ref for tracker operations, and fails clearly without one', () => {
  const dir = project()
  writeFileSync(join(dir, '.issues', 'GH-22.md'), '---\nkey: GH-22\nref: owner/repo#22\n---\n')
  mkdirSync(join(dir, '.issues', '.cache'))
  writeFileSync(join(dir, '.issues', '.cache', 'GH-22.json'), '{"attachments":[]}')
  assert.equal(run(dir, 'attach', 'GH-22', '--dest', join(dir, 'att')).status, 0)
  const missing = run(dir, 'attach', 'GH-99', '--dest', join(dir, 'att'))
  assert.equal(missing.status, 1)
  assert.match(missing.stderr, /Repo oder Host unbekannt/)
})

test('local operations work on a legacy GH-<n> document that has no ref', () => {
  const dir = project()
  writeFileSync(join(dir, '.issues', 'GH-22.md'), '---\nkey: GH-22\n---\n## Zusammenfassung\nx\n')
  assert.equal(run(dir, 'sessions', 'GH-22').status, 0)
  assert.equal(run(dir, 'set', 'GH-22', 'status=done').status, 0)
})

test('guard asks for every post and move, and lets only move --start through', () => {
  const decide = command => spawnSync('node', [bin, 'guard'], { input: JSON.stringify({ tool_input: { command } }), encoding: 'utf-8' }).stdout
  assert.match(decide('${CLAUDE_PLUGIN_ROOT}/bin/i post "PROJ-1" -f /tmp/x'), /"permissionDecision":"ask"/)
  assert.match(decide('"/p/bin/i" move PROJ-1 "In Arbeit"'), /"permissionDecision":"ask"/)
  assert.match(decide('echo x && /p/bin/i post PROJ-1 -f f'), /"ask"/)
  assert.equal(decide('/p/bin/i move PROJ-1 "In Arbeit" --start'), '')
  assert.equal(decide('/p/bin/i fetch PROJ-1'), '')
  assert.equal(decide('/p/bin/i move PROJ-1 x --start; /p/bin/i post PROJ-1 -f f') === '', false)
})

test('guard does not honor --start inside a comment, a quoted argument or after a line continuation', () => {
  const decide = command => spawnSync('node', [bin, 'guard'], { input: JSON.stringify({ tool_input: { command } }), encoding: 'utf-8' }).stdout
  assert.match(decide('/p/bin/i move PROJ-1 Done # --start'), /"ask"/)
  assert.match(decide('/p/bin/i move PROJ-1 "Done --start"'), /"ask"/)
  assert.match(decide('/p/bin/i \\\npost PROJ-1 -f f'), /"ask"/)
  assert.equal(decide('/p/bin/i move PROJ-1 "In Arbeit" --start'), '')
})

