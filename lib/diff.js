export function diffPayloads(prev, next) {
  if (!prev) return { first: true }

  const changes = []
  if (prev.state !== next.state) changes.push({ field: 'status', from: prev.state, to: next.state })

  const prevLines = (prev.body || '').split('\n').length
  const nextLines = (next.body || '').split('\n').length
  if ((prev.body || '') !== (next.body || '')) {
    changes.push({ field: 'description', delta: nextLines - prevLines })
  }

  const prevLabels = new Set(prev.labels || [])
  const nextLabels = new Set(next.labels || [])
  const addedLabels = [...nextLabels].filter(l => !prevLabels.has(l))
  const removedLabels = [...prevLabels].filter(l => !nextLabels.has(l))
  if (addedLabels.length || removedLabels.length) {
    changes.push({ field: 'labels', added: addedLabels, removed: removedLabels })
  }

  const prevCommentIds = new Set((prev.comments || []).map(c => String(c.id)))
  const newComments = (next.comments || []).filter(c => !prevCommentIds.has(String(c.id)))

  const prevAttFiles = new Set((prev.attachments || []).map(a => a.filename))
  const newAttachments = (next.attachments || []).filter(a => !prevAttFiles.has(a.filename))

  return {
    first: false,
    changed: changes.length > 0 || newComments.length > 0 || newAttachments.length > 0,
    changes,
    newComments,
    newAttachments
  }
}

function fmtDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}. ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function truncate(text, n = 90) {
  const oneLine = (text || '').replace(/\s+/g, ' ').trim()
  return oneLine.length > n ? `${oneLine.slice(0, n)}…` : oneLine
}

export function renderDiff(key, since, diff) {
  if (diff.first) return `${key}   noch kein vorheriger Sync-Stand — nichts zu vergleichen.`
  if (!diff.changed) return `${key}   keine Änderung seit ${since || 'dem letzten Sync'}.`

  const lines = [`${key}   geändert seit ${since || 'dem letzten Sync'}`, '']
  for (const c of diff.changes) {
    if (c.field === 'status') lines.push(`  status        ${c.from} → ${c.to}`)
    if (c.field === 'description') lines.push(`  description   geändert (${c.delta >= 0 ? '+' : ''}${c.delta} Zeilen)`)
    if (c.field === 'labels') {
      const added = c.added.map(l => `+${l}`).join(', ')
      const removed = c.removed.map(l => `-${l}`).join(', ')
      lines.push(`  labels        ${[added, removed].filter(Boolean).join('  ')}`)
    }
  }
  if (diff.newComments.length) {
    lines.push(`  comments      ${diff.newComments.length} neu`)
    for (const c of diff.newComments) lines.push(`                  ${c.author}   ${fmtDate(c.created)}  "${truncate(c.body)}"`)
  }
  if (diff.newAttachments.length) {
    lines.push(`  attachments   ${diff.newAttachments.length} neu`)
    for (const a of diff.newAttachments) lines.push(`                  ${a.filename} (${Math.round((a.size || 0) / 1024)} KB)`)
  }
  return lines.join('\n')
}
