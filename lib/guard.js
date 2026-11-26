// Decides whether a Bash command writes to a tracker. Fetched ticket content is
// untrusted text in the model's context, so "never post without approval" cannot
// rest on prose alone: the PreToolUse hook turns every such call into a
// permission prompt, whatever the allowlists say.
const WRITE_CALL = /bin\/i["']?\s+(post|move)\b([^;&|\n]*)/g

// Splits the arguments the way a shell would for our purpose: quotes group, an
// unquoted `#` starts a comment. A flag only counts when it is a bare token, so
// `move K-1 Done # --start` and `move K-1 "Done --start"` stay unexempted.
function bareTokens(rest) {
  const tokens = []
  let current = ''
  let quote = null
  let quoted = false
  const flush = () => { if (current !== '' || quoted) tokens.push({ text: current, quoted }); current = ''; quoted = false }
  for (let i = 0; i < rest.length; i++) {
    const ch = rest[i]
    if (quote) {
      if (ch === quote) quote = null
      else current += ch
    } else if (ch === '"' || ch === "'") { quote = ch; quoted = true }
    else if (ch === '\\') { current += rest[++i] ?? ''; quoted = true }
    else if (/\s/.test(ch)) flush()
    else if (ch === '#' && current === '' && !quoted) break
    else current += ch
  }
  flush()
  return tokens
}

// `move ... --start` is the status move of /i:new: user-triggered, reversible,
// and its result is shown. Everything else that writes needs a confirmation.
export function needsConfirmation(command) {
  // A backslash-newline joins lines, so it must not end the argument list early.
  const joined = String(command || '').replace(/\\\n/g, ' ')
  for (const [, sub, rest] of joined.matchAll(WRITE_CALL)) {
    if (sub === 'post') return sub
    if (!bareTokens(rest).some(t => t.text === '--start' && !t.quoted)) return sub
  }
  return null
}

export function guardDecision(payload) {
  const command = payload?.tool_input?.command
  const sub = needsConfirmation(command)
  if (!sub) return null
  const what = sub === 'post' ? 'Kommentar oder Statusänderung im Tracker posten' : 'Ticketstatus im Tracker ändern'
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'ask',
      permissionDecisionReason: `${what}: für Tracker-Schreibzugriffe ist eine ausdrückliche Bestätigung nötig.`
    }
  }
}
