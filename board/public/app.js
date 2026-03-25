/* global marked */

const state = {
  issues: [],
  filter: { search: '', complexity: '', scope: '' },
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

// --- Render ---

const COLUMNS = ['backlog', 'progress', 'review', 'done']

function render() {
  const filtered = state.issues.filter(issue => {
    const { search, complexity, scope } = state.filter
    if (search && !issue.key.toLowerCase().includes(search) &&
        !issue.title.toLowerCase().includes(search)) return false
    if (complexity && issue.complexity !== complexity) return false
    if (scope && issue.scope !== scope) return false
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
  return `
    <div class="card" draggable="true" data-key="${issue.key}" data-column="${issue.column}">
      <div class="card-key">${issue.key}</div>
      <div class="card-title">${issue.title}</div>
      <div class="card-footer">
        <span class="badge" data-complexity="${issue.complexity}">${issue.complexity}</span>
        <div class="progress">
          <div class="progress-bar">
            <div class="progress-fill" style="width:${pct}%"></div>
          </div>
          <span class="progress-text">${issue.progress.checked}/${issue.progress.total}</span>
        </div>
      </div>
    </div>
  `
}

// --- Filters and theme toggle ---

document.getElementById('search').addEventListener('input', e => {
  state.filter.search = e.target.value.toLowerCase()
  render()
})

document.getElementById('filter-complexity').addEventListener('change', e => {
  state.filter.complexity = e.target.value
  render()
})

document.getElementById('filter-scope').addEventListener('change', e => {
  state.filter.scope = e.target.value
  render()
})

document.getElementById('theme-toggle').addEventListener('click', () => {
  state.theme = state.theme === 'light' ? 'dark' : 'light'
  document.documentElement.dataset.theme = state.theme
  localStorage.setItem('board-theme', state.theme)
})

// --- Drag & Drop ---

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

// --- Detail modal ---

const modal = document.getElementById('detail-modal')
const modalKey = document.getElementById('modal-key')
const modalTitle = document.getElementById('modal-title')
const modalBody = document.getElementById('modal-body')

document.addEventListener('click', async e => {
  const card = e.target.closest('.card')
  if (!card || e.target.closest('.badge')) return

  const key = card.dataset.key
  const issue = state.issues.find(i => i.key === key)
  if (!issue) return

  modalKey.textContent = issue.key
  modalTitle.textContent = issue.title
  modalBody.innerHTML = '<p class="loading">Laden...</p>'
  modal.showModal()

  const res = await fetch(`/api/issues/${key}/raw`)
  const md = await res.text()

  const body = md.replace(/^---\n[\s\S]*?\n---\n*/, '')
  modalBody.innerHTML = marked.parse(body)

  // Make ONLY Anforderungen checkboxes interactive.
  // The server-side toggleCheckbox() only operates on checkboxes in the
  // ## Anforderungen section, so we must match those indices exactly.
  const headings = modalBody.querySelectorAll('h2')
  let anforderungenSection = null
  for (const h of headings) {
    if (h.textContent.trim() === 'Anforderungen') {
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
modal.addEventListener('click', e => { if (e.target === modal) modal.close() })

// --- SSE live refresh ---

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
