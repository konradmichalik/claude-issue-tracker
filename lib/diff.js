function lineDiff(prevText, nextText) {
  const prevLines = (prevText || '').split('\n')
  const nextLines = (nextText || '').split('\n')
  const remaining = new Map()
  for (const l of prevLines) remaining.set(l, (remaining.get(l) || 0) + 1)
  const added = []
  for (const l of nextLines) {
    if (remaining.get(l) > 0) remaining.set(l, remaining.get(l) - 1)
    else added.push(l)
  }
  const removed = []
  for (const l of prevLines) {
    if (remaining.get(l) > 0) { remaining.set(l, remaining.get(l) - 1); removed.push(l) }
  }
  const blank = l => l.trim() === ''
  return { added: added.filter(l => !blank(l)), removed: removed.filter(l => !blank(l)) }
}

function attachmentId(a) {
  return a.id != null ? `id:${a.id}` : `name:${a.filename}`
}

export function diffPayloads(prev, next) {
  if (!prev) return { first: true }

  const changes = []
  if (prev.state !== next.state) changes.push({ field: 'status', from: prev.state, to: next.state })
  if ((prev.title || '') !== (next.title || '')) changes.push({ field: 'title', from: prev.title || '', to: next.title || '' })

  if ((prev.body || '') !== (next.body || '')) {
    changes.push({ field: 'description', ...lineDiff(prev.body, next.body) })
  }

  const prevLabels = new Set(prev.labels || [])
  const nextLabels = new Set(next.labels || [])
  const addedLabels = [...nextLabels].filter(l => !prevLabels.has(l))
  const removedLabels = [...prevLabels].filter(l => !nextLabels.has(l))
  if (addedLabels.length || removedLabels.length) {
    changes.push({ field: 'labels', added: addedLabels, removed: removedLabels })
  }

  const prevComments = new Map((prev.comments || []).map(c => [String(c.id), c]))
  const newComments = []
  const editedComments = []
  for (const c of next.comments || []) {
    const before = prevComments.get(String(c.id))
    if (!before) newComments.push(c)
    else if ((before.body || '') !== (c.body || '')) editedComments.push(c)
  }

  const prevAttachments = new Set((prev.attachments || []).map(attachmentId))
  const newAttachments = (next.attachments || []).filter(a => !prevAttachments.has(attachmentId(a)))

  return {
    first: false,
    changed: changes.length > 0 || newComments.length > 0 || editedComments.length > 0 || newAttachments.length > 0,
    changes,
    newComments,
    editedComments,
    newAttachments
  }
}

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const MAX_DIFF_LINES = 20

function diffLines(prefix, lines, indent) {
  const shown = lines.slice(0, MAX_DIFF_LINES).map(l => `${indent}${prefix} ${l}`)
  if (lines.length > MAX_DIFF_LINES) shown.push(`${indent}${prefix} … ${lines.length - MAX_DIFF_LINES} weitere Zeilen`)
  return shown
}

function commentLines(c, indent) {
  const [first, ...rest] = (c.body || '').split('\n')
  return [`${indent}${c.author}   ${fmtDate(c.created)}`, `${indent}  ${first}`, ...rest.map(l => `${indent}  ${l}`)]
}

export function renderDiff(key, since, diff) {
  if (diff.first) return `${key}   noch kein vorheriger Sync-Stand — nichts zu vergleichen.`
  if (!diff.changed) return `${key}   keine Änderung seit ${since || 'dem letzten Sync'}.`

  const lines = [`${key}   geändert seit ${since || 'dem letzten Sync'}`, '']
  for (const c of diff.changes) {
    if (c.field === 'status') lines.push(`  status        ${c.from} → ${c.to}`)
    if (c.field === 'title') lines.push(`  title         "${c.from}" → "${c.to}"`)
    if (c.field === 'description') {
      lines.push('  description   geändert')
      lines.push(...diffLines('-', c.removed, '                '), ...diffLines('+', c.added, '                '))
    }
    if (c.field === 'labels') {
      const added = c.added.map(l => `+${l}`).join(', ')
      const removed = c.removed.map(l => `-${l}`).join(', ')
      lines.push(`  labels        ${[added, removed].filter(Boolean).join('  ')}`)
    }
  }
  if (diff.newComments.length) {
    lines.push(`  comments      ${diff.newComments.length} neu`)
    for (const c of diff.newComments) lines.push(...commentLines(c, '                '))
  }
  if (diff.editedComments.length) {
    lines.push(`  comments      ${diff.editedComments.length} bearbeitet`)
    for (const c of diff.editedComments) lines.push(...commentLines(c, '                '))
  }
  if (diff.newAttachments.length) {
    lines.push(`  attachments   ${diff.newAttachments.length} neu`)
    for (const a of diff.newAttachments) lines.push(`                ${a.filename} (${Math.round((a.size || 0) / 1024)} KB)`)
  }
  return lines.join('\n')
}
