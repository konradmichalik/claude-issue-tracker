import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { watch, existsSync, mkdirSync } from 'node:fs'
import express from 'express'
import open from 'open'
import {
  parseAllIssues, updateStatus, toggleCheckbox,
  readRaw, resolveIssuesDir, COLUMN_TO_STATUS
} from './lib/issues.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const app = express()
const PORT = process.env.BOARD_PORT || 0

app.use(express.json())
app.use(express.static(join(__dirname, 'public')))

app.get('/api/issues', (req, res) => {
  try {
    res.json(parseAllIssues())
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/issues/:key/status', (req, res) => {
  try {
    const { column } = req.body
    const newStatus = COLUMN_TO_STATUS[column]
    if (!newStatus) return res.status(400).json({ error: 'Invalid column' })
    updateStatus(req.params.key, newStatus)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.put('/api/issues/:key/checkbox', (req, res) => {
  try {
    const { index, checked } = req.body
    toggleCheckbox(req.params.key, index, checked)
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

app.get('/api/issues/:key/raw', (req, res) => {
  try {
    res.type('text/plain').send(readRaw(req.params.key))
  } catch (err) {
    res.status(404).json({ error: err.message })
  }
})

const clients = new Set()

app.get('/events', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive'
  })
  res.write('data: connected\n\n')
  clients.add(res)
  req.on('close', () => clients.delete(res))
})

function broadcast() {
  for (const client of clients) {
    client.write('data: reload\n\n')
  }
}

const issuesDir = resolveIssuesDir()
if (!existsSync(issuesDir)) mkdirSync(issuesDir, { recursive: true })

let debounceTimer
watch(issuesDir, () => {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(broadcast, 200)
})

const server = app.listen(PORT, () => {
  const addr = server.address()
  const url = `http://localhost:${addr.port}`
  console.log(`Issue Board running at ${url}`)
  console.log(`Watching: ${issuesDir}`)
  console.log('Press Ctrl+C to stop.')
  open(url).catch(() => {})
})
