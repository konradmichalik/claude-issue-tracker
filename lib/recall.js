import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'

function extractText(content) {
  if (typeof content === 'string') return content
  if (Array.isArray(content)) return content.map(b => (b.type === 'text' ? b.text : '')).join(' ')
  return ''
}

export function recall(key, { limit = 20 } = {}) {
  const root = join(homedir(), '.claude', 'projects')
  let files
  try {
    files = execFileSync('grep', ['-rlF', '--include=*.jsonl', key, root], { encoding: 'utf-8', maxBuffer: 1024 * 1024 * 20 })
      .split('\n').filter(Boolean)
  } catch {
    return []
  }

  const hits = []
  for (const file of files) {
    let lines
    try {
      lines = readFileSync(file, 'utf-8').split('\n').filter(Boolean)
    } catch { continue }
    for (const line of lines) {
      if (!line.includes(key)) continue
      let entry
      try { entry = JSON.parse(line) } catch { continue }
      const text = extractText(entry.message?.content)
      if (!text.includes(key)) continue
      const idx = text.indexOf(key)
      const snippet = text.slice(Math.max(0, idx - 40), idx + 80).replace(/\s+/g, ' ').trim()
      hits.push({
        timestamp: entry.timestamp,
        sessionId: (entry.sessionId || '').slice(0, 8),
        project: (entry.cwd || '').split('/').pop(),
        snippet
      })
      break
    }
    if (hits.length >= limit) break
  }
  return hits.sort((a, b) => (a.timestamp || '').localeCompare(b.timestamp || ''))
}
