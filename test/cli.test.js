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

test('GH-<n> resolves through the document ref, and fails clearly without one', () => {
  const dir = project()
  writeFileSync(join(dir, '.issues', 'GH-22.md'), '---\nkey: GH-22\nref: owner/repo#22\n---\n')
  assert.equal(run(dir, 'sessions', 'GH-22').status, 0)
  const missing = run(dir, 'sessions', 'GH-99')
  assert.equal(missing.status, 1)
  assert.match(missing.stderr, /Repo oder Host unbekannt/)
  assert.ok(existsSync(join(dir, '.issues')))
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
