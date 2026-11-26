import { readFileSync, writeFileSync, existsSync, mkdirSync, copyFileSync } from 'node:fs'
import { join, dirname } from 'node:path'

export function cachePath(issuesDir, key) {
  return join(issuesDir, '.cache', `${key}.json`)
}

export function readCache(issuesDir, key) {
  const p = cachePath(issuesDir, key)
  if (!existsSync(p)) return null
  return JSON.parse(readFileSync(p, 'utf-8'))
}

// keepPrevious leaves one generation behind as <key>.prev.json: a sync that is
// not followed by a document update would otherwise lose its delta for good.
export function writeCache(issuesDir, key, payload, { keepPrevious = false } = {}) {
  const p = cachePath(issuesDir, key)
  mkdirSync(dirname(p), { recursive: true })
  if (keepPrevious && existsSync(p)) copyFileSync(p, p.replace(/\.json$/, '.prev.json'))
  writeFileSync(p, JSON.stringify(payload, null, 2), 'utf-8')
}
