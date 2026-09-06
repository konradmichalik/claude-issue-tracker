import { execFileSync } from 'node:child_process'

function assertHost(host) {
  if (!/^[\w.-]+$/.test(host)) throw new Error(`Ungültiger Redmine-Host: ${host}`)
}

export function fetchRedmine(host, number) {
  assertHost(host)
  if (!/^\d+$/.test(String(number))) throw new Error(`Ungültige Redmine-Nummer: ${number}`)
  const url = `https://${host}/issues/${number}.json`
  const out = execFileSync('curl', ['-fsSL', url], { encoding: 'utf-8' })
  return JSON.parse(out)
}
