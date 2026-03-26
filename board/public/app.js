/* global marked */

// ── State ──

const state = {
  issues: [],
  filter: { search: '' },
  theme: localStorage.getItem('board-theme') ||
    (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
}

document.documentElement.dataset.theme = state.theme

async function fetchIssues() {
  const res = await fetch('/api/issues')
  state.issues = await res.json()
  render()
}

fetchIssues()

fetch('/api/project').then(r => r.json()).then(({ name }) => {
  document.getElementById('project-name').textContent = name
  document.title = `Issue Board — ${name}`
})

// ── Helpers ──

function relativeTime(dateStr) {
  if (!dateStr) return ''
  const now = new Date()
  const then = new Date(dateStr + 'T00:00:00')
  const diffMs = now - then
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m`
  if (diffHours < 24) return `${diffHours}h`
  if (diffDays < 30) return `${diffDays}d`
  return dateStr
}

const clockIcon = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>'

const checkSquareIcon = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>'

// ── Render ──

const COLUMNS = ['backlog', 'progress', 'review', 'done']

function render() {
  const filtered = state.issues.filter(issue => {
    const { search } = state.filter
    if (search && !issue.key.toLowerCase().includes(search) &&
        !issue.title.toLowerCase().includes(search)) return false
    return true
  })

  for (const col of COLUMNS) {
    const container = document.querySelector(`[data-drop="${col}"]`)
    const issues = filtered.filter(i => i.column === col)
    container.innerHTML = issues.map(cardHTML).join('')
    document.querySelector(`[data-count="${col}"]`).textContent = issues.length
  }
}

function cardHTML(issue) {
  const pct = issue.progress.total > 0
    ? Math.round((issue.progress.checked / issue.progress.total) * 100)
    : 0
  const time = relativeTime(issue.updated)

  return `
    <div class="card" draggable="true" data-key="${issue.key}" data-column="${issue.column}">
      <div class="card-top">
        <span class="card-key">${issue.key}</span>
        <span class="card-time">${clockIcon} ${time}</span>
      </div>
      <div class="card-title">${issue.title}</div>
      <div class="card-footer">
        <span class="badge" data-complexity="${issue.complexity}">${issue.complexity}</span>
        <div class="card-progress">
          ${checkSquareIcon}
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
          <span class="progress-text">${issue.progress.checked}/${issue.progress.total}</span>
        </div>
      </div>
    </div>
  `
}

// ── Search & Theme ──

document.getElementById('search').addEventListener('input', e => {
  state.filter.search = e.target.value.toLowerCase()
  render()
})

document.getElementById('theme-toggle').addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light'
  document.documentElement.dataset.theme = state.theme
  localStorage.setItem('board-theme', state.theme)
})

// ── Drag & Drop ──

document.addEventListener('dragstart', e => {
  const card = e.target.closest('.card')
  if (!card) return
  card.classList.add('dragging')
  e.dataTransfer.setData('text/plain', card.dataset.key)
  e.dataTransfer.effectAllowed = 'move'
})

document.addEventListener('dragend', e => {
  const card = e.target.closest('.card')
  if (card) card.classList.remove('dragging')
  document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'))
})

for (const drop of document.querySelectorAll('[data-drop]')) {
  drop.addEventListener('dragover', e => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    drop.classList.add('drag-over')
  })

  drop.addEventListener('dragleave', () => {
    drop.classList.remove('drag-over')
  })

  drop.addEventListener('drop', async e => {
    e.preventDefault()
    drop.classList.remove('drag-over')
    const key = e.dataTransfer.getData('text/plain')
    const column = drop.dataset.drop

    const issue = state.issues.find(i => i.key === key)
    if (!issue || issue.column === column) return
    const prevColumn = issue.column
    const prevStatus = issue.status
    issue.column = column
    render()

    try {
      const res = await fetch(`/api/issues/${key}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ column })
      })
      if (!res.ok) throw new Error('Failed')
    } catch {
      issue.column = prevColumn
      issue.status = prevStatus
      render()
    }
  })
}

// ── Detail Modal ──

const modal = document.getElementById('detail-modal')
const modalKey = document.getElementById('modal-key')
const modalTitle = document.getElementById('modal-title')
const modalBody = document.getElementById('modal-body')
const modalUpdated = document.getElementById('modal-updated')
const modalComplexity = document.getElementById('modal-complexity')
const modalProgressFill = document.getElementById('modal-progress-fill')
const modalProgressText = document.getElementById('modal-progress-text')

document.addEventListener('click', async e => {
  const card = e.target.closest('.card')
  if (!card || e.target.closest('.badge')) return

  const key = card.dataset.key
  const issue = state.issues.find(i => i.key === key)
  if (!issue) return

  // Populate header
  modalKey.textContent = issue.key
  modalTitle.textContent = issue.title
  modalUpdated.textContent = `Updated ${relativeTime(issue.updated)} ago`
  modalComplexity.textContent = issue.complexity
  modalComplexity.dataset.complexity = issue.complexity

  // Progress
  const pct = issue.progress.total > 0
    ? Math.round((issue.progress.checked / issue.progress.total) * 100)
    : 0
  modalProgressFill.style.width = `${pct}%`
  modalProgressText.textContent = `${issue.progress.checked}/${issue.progress.total}`

  modalBody.innerHTML = '<p class="loading">Laden...</p>'
  modal.showModal()

  const res = await fetch(`/api/issues/${key}/raw`)
  const md = await res.text()

  // Strip frontmatter and first heading (already shown in modal header)
  const body = md
    .replace(/^---\n[\s\S]*?\n---\n*/, '')
    .replace(/^#[^\n]*\n+/, '')
    .replace(/^\*\*?Status:\*?\*?[^\n]*\n*/m, '')
    .replace(/^Status:[^\n]*\n*/m, '')
  modalBody.innerHTML = marked.parse(body)

  // Make ONLY Anforderungen checkboxes interactive
  const headings = modalBody.querySelectorAll('h2')
  let anforderungenSection = null
  for (const h of headings) {
    if (h.textContent.trim().startsWith('Anforderungen')) {
      anforderungenSection = h.nextElementSibling
      break
    }
  }

  if (anforderungenSection) {
    const checkboxes = anforderungenSection.querySelectorAll('input[type="checkbox"]')
    checkboxes.forEach((cb, idx) => {
      cb.disabled = false
      cb.addEventListener('change', async () => {
        await fetch(`/api/issues/${key}/checkbox`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ index: idx, checked: cb.checked })
        })
      })
    })
  }
})

document.getElementById('modal-close').addEventListener('click', () => modal.close())
document.getElementById('modal-close-btn').addEventListener('click', () => modal.close())
modal.addEventListener('click', e => { if (e.target === modal) modal.close() })

// ── Add Issue Modal ──

const addModal = document.getElementById('add-modal')
const addForm = document.getElementById('add-issue-form')
const addColumnInput = document.getElementById('add-column')

for (const btn of document.querySelectorAll('.add-issue-btn')) {
  btn.addEventListener('click', () => {
    addForm.reset()
    addColumnInput.value = btn.dataset.addColumn
    addModal.showModal()
    document.getElementById('add-key').focus()
  })
}

document.querySelector('.add-modal-close').addEventListener('click', () => addModal.close())
addModal.addEventListener('click', e => { if (e.target === addModal) addModal.close() })

addForm.addEventListener('submit', async e => {
  e.preventDefault()
  const key = document.getElementById('add-key').value.trim().toUpperCase()
  const title = document.getElementById('add-title').value.trim()
  const complexity = document.getElementById('add-complexity').value
  const scope = document.getElementById('add-scope').value
  const column = addColumnInput.value

  const body = { key, title, complexity, scope, column }

  try {
    const res = await fetch('/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!res.ok) {
      const err = await res.json()
      alert(err.error || 'Failed to create issue')
      return
    }
    addModal.close()
    await fetchIssues()
  } catch {
    alert('Failed to create issue')
  }
})

// ── SSE live refresh ──

function connectSSE() {
  const es = new EventSource('/events')
  es.onmessage = (e) => {
    if (e.data === 'reload') fetchIssues()
  }
  es.onerror = () => {
    es.close()
    setTimeout(connectSSE, 3000)
  }
}

connectSSE()
