function today() {
  return new Date().toISOString().slice(0, 10)
}

function bullets(items) {
  if (!items || !items.length) return '- —'
  return items.map(i => `- ${i}`).join('\n')
}

const TEMPLATES = {
  de: {
    fortschritt: 'Zwischenstand',
    abschluss: 'Abschluss',
    done: 'Erledigt', open: 'Offen', next: 'Nächster Schritt'
  },
  en: {
    fortschritt: 'Status update',
    abschluss: 'Resolution',
    done: 'Done', open: 'Open', next: 'Next'
  }
}

export function renderReport({ lang = 'de', kind = 'fortschritt', done = [], open = [], next = '' }) {
  const t = TEMPLATES[lang] || TEMPLATES.de
  const heading = t[kind] || t.fortschritt
  return [
    `**${heading} ${today()}**`,
    '',
    t.done,
    bullets(done),
    '',
    t.open,
    bullets(open),
    '',
    `${t.next}: ${next || '—'}`
  ].join('\n')
}
