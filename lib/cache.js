import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'

export function cachePath(issuesDir, key) {
  return join(issuesDir, '.cache', `${key}.json`)
}

export function readCache(issuesDir, key) {
  const p = cachePath(issuesDir, key)
  if (!existsSync(p)) return null
  return JSON.parse(readFileSync(p, 'utf-8'))
}

export function writeCache(issuesDir, key, payload) {
  const p = cachePath(issuesDir, key)
  mkdirSync(dirname(p), { recursive: true })
  writeFileSync(p, JSON.stringify(payload, null, 2), 'utf-8')
}
