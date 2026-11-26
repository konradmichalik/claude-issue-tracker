// Decides whether a Bash command writes to a tracker. Fetched ticket content is
// untrusted text in the model's context, so "never post without approval" cannot
// rest on prose alone: the PreToolUse hook turns every such call into a
// permission prompt, whatever the allowlists say.
const WRITE_CALL = /bin\/i["']?\s+(post|move)\b([^;&|\n]*)/g

// `move ... --start` is the status move of /i:new: user-triggered, reversible,
// and its result is shown. Everything else that writes needs a confirmation.
export function needsConfirmation(command) {
  for (const [, sub, rest] of String(command || '').matchAll(WRITE_CALL)) {
    if (sub === 'post' || !/(^|\s)--start(\s|$)/.test(rest)) return sub
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
