// Stage 1 ADF→Markdown: paragraphs, headings, lists, code, links, mentions, hard breaks.
// Tables and panels get a visible placeholder — see README "ADF Stage 2" for the upgrade trigger.
function adfInline(node) {
  if (!node) return ''
  if (node.type === 'text') {
    let text = node.text || ''
    for (const mark of node.marks || []) {
      if (mark.type === 'strong') text = `**${text}**`
      if (mark.type === 'em') text = `*${text}*`
      if (mark.type === 'code') text = `\`${text}\``
      if (mark.type === 'link') text = `[${text}](${mark.attrs?.href || ''})`
    }
    return text
  }
  if (node.type === 'hardBreak') return '\n'
  if (node.type === 'mention') return `@${node.attrs?.text || node.attrs?.id || ''}`
  if (node.type === 'inlineCard') return node.attrs?.url || ''
  return (node.content || []).map(adfInline).join('')
}

export function adfToMarkdown(node, depth = 0) {
  if (!node) return ''
  if (node.type === 'doc') return (node.content || []).map(n => adfToMarkdown(n, depth)).join('\n\n').trim()
  if (node.type === 'paragraph') return (node.content || []).map(adfInline).join('')
  if (node.type === 'heading') {
    const level = node.attrs?.level || 2
    return `${'#'.repeat(level)} ${(node.content || []).map(adfInline).join('')}`
  }
  if (node.type === 'bulletList') {
    return (node.content || []).map(li => `- ${adfToMarkdown(li, depth + 1)}`).join('\n')
  }
  if (node.type === 'orderedList') {
    return (node.content || []).map((li, i) => `${i + 1}. ${adfToMarkdown(li, depth + 1)}`).join('\n')
  }
  if (node.type === 'listItem') {
    return (node.content || []).map(n => adfToMarkdown(n, depth)).join(' ')
  }
  if (node.type === 'codeBlock') {
    const lang = node.attrs?.language || ''
    const text = (node.content || []).map(adfInline).join('')
    return `\`\`\`${lang}\n${text}\n\`\`\``
  }
  if (node.type === 'blockquote') {
    return (node.content || []).map(n => `> ${adfToMarkdown(n, depth)}`).join('\n')
  }
  if (node.type === 'rule') return '---'
  if (node.type === 'mediaSingle' || node.type === 'media') {
    return '*[Anhang — siehe Attachments]*'
  }
  if (node.type === 'table') {
    return '*[Tabelle nicht dargestellt — siehe Jira-Ticket direkt]*'
  }
  if (node.type === 'panel') {
    const body = (node.content || []).map(n => adfToMarkdown(n, depth)).join('\n\n')
    return `> **${(node.attrs?.panelType || 'Hinweis').toUpperCase()}**: ${body}`
  }
  return (node.content || []).map(n => adfToMarkdown(n, depth)).join('\n\n')
}

function textFromMaybeAdf(value) {
  if (!value) return ''
  if (typeof value === 'string') return value
  return adfToMarkdown(value)
}

export function normalizeJira(raw) {
  const f = raw.fields || {}
  let origin = null
  try { origin = new URL(raw.self).origin } catch { /* no self URL */ }
  const key = raw.key
  return {
    tracker: 'jira',
    key,
    ref: key,
    url: origin ? `${origin}/browse/${key}` : null,
    title: f.summary || '',
    state: f.status?.name || '',
    type: f.issuetype?.name || '',
    author: f.reporter?.displayName || '',
    created: f.created || '',
    updated: f.updated || '',
    body: textFromMaybeAdf(f.description),
    labels: f.labels || [],
    parent: f.parent?.key || null,
    children: (f.subtasks || []).map(s => s.key),
    links: (f.issuelinks || []).map(l => ({
      type: l.type?.outward || l.type?.inward || '',
      key: l.outwardIssue?.key || l.inwardIssue?.key || ''
    })),
    comments: (f.comment?.comments || []).map(c => ({
      id: c.id,
      author: c.author?.displayName || '',
      created: c.created,
      body: textFromMaybeAdf(c.body)
    })),
    attachments: (f.attachment || []).map(a => ({
      filename: a.filename, mime: a.mimeType, size: a.size, url: a.content
    })),
    fetched_at: new Date().toISOString()
  }
}

export function normalizeGithub(gh, ref) {
  return {
    tracker: 'github',
    key: `GH-${gh.number}`,
    ref,
    url: gh.url,
    title: gh.title || '',
    state: gh.state || '',
    type: (gh.labels || []).some(l => l.name === 'bug') ? 'Bug' : 'Feature',
    author: gh.author?.login || '',
    created: gh.createdAt || '',
    updated: gh.updatedAt || '',
    body: gh.body || '',
    labels: (gh.labels || []).map(l => l.name),
    parent: null,
    children: [],
    links: [],
    comments: (gh.comments || []).map(c => ({
      id: c.id ?? c.url, author: c.author?.login || '', created: c.createdAt, body: c.body || ''
    })),
    attachments: [],
    fetched_at: new Date().toISOString()
  }
}

export function normalizeRedmine(rm, host, number) {
  const issue = rm.issue || {}
  return {
    tracker: 'redmine',
    key: `RM-${number}`,
    ref: `${host}#${number}`,
    url: `https://${host}/issues/${number}`,
    title: issue.subject || '',
    state: issue.status?.name || '',
    type: issue.tracker?.name || '',
    author: issue.author?.name || '',
    created: issue.created_on || '',
    updated: issue.updated_on || '',
    body: issue.description || '',
    labels: [],
    parent: issue.parent?.id ? String(issue.parent.id) : null,
    children: [],
    links: [],
    comments: (issue.journals || []).filter(j => j.notes).map(j => ({
      id: j.id, author: j.user?.name || '', created: j.created_on, body: j.notes
    })),
    attachments: (issue.attachments || []).map(a => ({
      filename: a.filename, mime: a.content_type, size: a.filesize, url: a.content_url
    })),
    fetched_at: new Date().toISOString()
  }
}
