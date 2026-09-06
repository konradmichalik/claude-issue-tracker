import { execFileSync } from 'node:child_process'

function assertKey(key) {
  if (!/^[A-Z][A-Z0-9]*-\d+$/.test(key)) throw new Error(`Ungültiger Jira-Key: ${key}`)
}

export function fetchJira(key) {
  assertKey(key)
  const out = execFileSync('jira', ['issue', 'view', key, '--raw'], { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 20 })
  return JSON.parse(out)
}

export function postJiraComment(key, bodyFilePath) {
  assertKey(key)
  execFileSync('jira', ['issue', 'comment', 'add', key, '-T', bodyFilePath, '--no-input'], { stdio: 'inherit' })
}

export function moveJiraStatus(key, state, comment) {
  assertKey(key)
  const args = ['issue', 'move', key, state]
  if (comment) args.push('--comment', comment)
  execFileSync('jira', args, { stdio: 'inherit' })
}

export function preflightJira() {
  try {
    execFileSync('jira', ['me'], { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}
