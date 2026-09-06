import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { homedir } from 'node:os'

const DEFAULT_REDMINE_HOSTS = ['forge.typo3.org']

function loadRedmineHosts() {
  const cfg = join(homedir(), '.config', 'i', 'trackers.json')
  if (existsSync(cfg)) {
    try {
      const parsed = JSON.parse(readFileSync(cfg, 'utf-8'))
      if (Array.isArray(parsed.redmineHosts)) return parsed.redmineHosts
    } catch { /* fall through to default */ }
  }
  return DEFAULT_REDMINE_HOSTS
}

const TRANSLITERATION = { ä: 'ae', ö: 'oe', ü: 'ue', ß: 'ss' }

function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[äöüß]/g, ch => TRANSLITERATION[ch])
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 48)
    .replace(/-+$/, '') || 'notiz'
}

export function resolveOriginRepo(cwd = process.cwd()) {
  const url = execFileSync('git', ['remote', 'get-url', 'origin'], { encoding: 'utf-8', cwd }).trim()
  const m = url.match(/github\.com[:/]([\w.-]+)\/([\w.-]+?)(\.git)?$/)
  if (!m) throw new Error(`origin remote ist keine GitHub-URL: ${url}`)
  return { owner: m[1], repo: m[2] }
}

export function parseRef(input, { cwd = process.cwd() } = {}) {
  const raw = (input || '').trim()

  if (!raw) {
    return { tracker: null, key: null, ref: null, url: null, filename: null }
  }

  let m = raw.match(/^https?:\/\/([^/]+)\.atlassian\.net\/browse\/([A-Z][A-Z0-9]*-\d+)/i)
  if (m) {
    const key = m[2].toUpperCase()
    return { tracker: 'jira', key, ref: key, url: raw, filename: `${key}.md` }
  }

  m = raw.match(/^[A-Z][A-Z0-9]*-\d+$/)
  if (m) {
    const key = raw.toUpperCase()
    return { tracker: 'jira', key, ref: key, url: null, filename: `${key}.md` }
  }

  m = raw.match(/github\.com\/([\w.-]+)\/([\w.-]+)\/issues\/(\d+)/)
  if (m) {
    const [, owner, repo, number] = m
    return {
      tracker: 'github', key: `GH-${number}`, ref: `${owner}/${repo}#${number}`,
      url: raw, filename: `GH-${number}.md`, owner, repo, number: Number(number)
    }
  }

  for (const host of loadRedmineHosts()) {
    const re = new RegExp(`${host.replace(/\./g, '\\.')}/issues/(\\d+)`)
    m = raw.match(re)
    if (m) {
      const number = m[1]
      return { tracker: 'redmine', key: `RM-${number}`, ref: `${host}#${number}`, url: raw, filename: `RM-${number}.md`, host, number: Number(number) }
    }
  }

  m = raw.match(/^\d+$/)
  if (m) {
    const { owner, repo } = resolveOriginRepo(cwd)
    const number = m[0]
    return {
      tracker: 'github', key: `GH-${number}`, ref: `${owner}/${repo}#${number}`,
      url: `https://github.com/${owner}/${repo}/issues/${number}`, filename: `GH-${number}.md`, owner, repo, number: Number(number)
    }
  }

  return { tracker: 'none', key: null, ref: raw, url: null, filename: `${slugify(raw)}.md` }
}
