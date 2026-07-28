---
description: Issue document format, lifecycle, and conventions for the i:new/i:estimate/i:update/i:close/i:list workflow. Use when working with issue documents, Jira ticket analysis, effort estimation, or Definition of Done checks.
disable-model-invocation: true
---

# Issue Management

Lokales Issue-Tracking basierend auf Markdown-Dokumenten in `.claude/issues/`. Nicht committet, persistiert zwischen Sessions.

## Lifecycle

```
i:new  ──>  i:estimate (optional)  ──>  Implementation  ──>  i:close
              │                          │
              │                     i:update (as needed)
              │                          │
              └──────────────────────────┘
```

| Status | Bedeutung | Gesetzt durch |
|--------|-----------|---------------|
| `analysis` | Anforderungen erfasst, noch nicht bewertet | i:new |
| `estimated` | Aufwandsschätzung erstellt | i:estimate |
| `in-progress` | Implementierung läuft | i:new (nach Plan-Bestätigung) |
| `in-review` | Code-Review / QA läuft | manuell oder i:close (teilweise) |
| `done` | Alle Anforderungen erfüllt | i:close |

## Issue-Document-Format

### Frontmatter (YAML, exakt dieses Schema)

```yaml
---
key: <ISSUE-KEY>
title: <Ticket-Titel aus Jira oder Beschreibung>
status: analysis | estimated | in-progress | in-review | done
complexity: Low | Medium | High
scope: Small (< 4h) | Medium (4-16h) | Large (> 16h)
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
jira_synced: <YYYY-MM-DDTHH:MM:SS±HH:MM>
---
```

| Feld | Pflicht | Gesetzt durch | Beschreibung |
|------|---------|---------------|-------------|
| `key` | ja | i:new | Jira-Key in Großbuchstaben (z.B. `MWS-19`) |
| `title` | ja | i:new | Kurzer Ticket-Titel |
| `status` | ja | alle Commands | Aktueller Lifecycle-Status |
| `complexity` | ja | i:new | Technische Komplexität |
| `scope` | ja | i:new | Geschätzter Umfang |
| `created` | ja | i:new | Erstellungsdatum |
| `updated` | ja | alle Commands | Letzte Änderung (Datum) |
| `jira_synced` | nein | i:new, i:update | Zeitstempel des letzten Jira-Abgleichs. Fehlt bei manuell angelegten Issues. |

**Warum `jira_synced` getrennt von `updated`:** `updated` ist tagesgenau und wird auch durch lokale Änderungen (Checkbox, Breadcrumb) gesetzt. Für das Kommentar-Delta in i:update braucht es einen sekundengenauen Marker, der ausschließlich durch Jira-Abgleiche fortschreibt — sonst werden Kommentare vom selben Tag verpasst oder doppelt eingetragen.

### Body

```markdown

## Anforderungen
- [ ] Anforderung 1 (aus Beschreibung)
- [ ] Anforderung 2 (aus Akzeptanzkriterien)
- [ ] Anforderung 3 (implizit: a11y, responsive, etc.)

## Betroffene Bereiche
- `pfad/zur/datei.ts` — was sich hier ändert
- `pfad/zum/template.html` — was sich hier ändert

## Offene Fragen
(leer wenn geklärt)

## Entscheidungen
- <YYYY-MM-DD>: Entscheidung X weil Y

## Aufwandsschätzung
(ergänzt durch i:estimate)

## Umsetzungsplan
(ergänzt nach Bestätigung)

## Testschritte
(ergänzt durch i:new oder i:update)

## Erkenntnisse
(ergänzt während Umsetzung via i:update)

## Quellen
(ergänzt durch i:new und i:update — woher die Anforderungen stammen)
```

## Abschnitt-Konventionen

### Anforderungen
- Jede Anforderung als Checkbox (`- [ ]` / `- [x]`)
- Nachträge: `- [ ] Anforderung *(Nachtrag <YYYY-MM-DD>)*`
- Bugs: `- [ ] Bug: Beschreibung *(Testfeedback <YYYY-MM-DD>)*`
- Nachträge und Bugs zählen gleichwertig zur DoD

### Entscheidungen
- Format: `- <YYYY-MM-DD>: Entscheidung — Grund: Begründung`

### Testschritte
- Manuelle Testschritte als nummerierte Liste
- Format: `1. <Aktion> → <erwartetes Ergebnis>`
- Ergänzt durch i:new (aus Akzeptanzkriterien) oder i:update

### Erkenntnisse
- Format: `- <YYYY-MM-DD>: Erkenntnis`

### Quellen
Provenienz der Anforderungen — macht nachvollziehbar, woher eine Anforderung kommt, und erlaubt späteres Re-Sync. Format:

```markdown
## Quellen
- Jira: <ISSUE-KEY> — <browse-URL> (Status: <Jira-Status>, geholt <YYYY-MM-DD HH:MM>)
- Confluence: <Seitentitel> — Page-ID <id>, Version <n> (gelesen <YYYY-MM-DD>)
- Attachment: <dateiname> (<mimeType>) — `.claude/issues/attachments/<KEY>/<dateiname>`
```

Ein Parent/Epic, dessen Akzeptanzkriterien übernommen wurden, wird wie ein Ticket eingetragen (`- Jira: <PARENT-KEY> — …`). Verlinkte Tickets sind Kontext, keine Quelle — die gehören in „Betroffene Bereiche" oder „Erkenntnisse".

- Nur real genutzte Quellen eintragen — keine Platzhalter für nicht gelesene Seiten oder nicht geladene Attachments
- Confluence-Version mitschreiben: ändert sich die Seite später, ist die Abweichung erkennbar
- Attachment-Pfade sind relativ zum Hauptverzeichnis (siehe Worktree-Safety)

## Breadcrumbs (i:resume)

Session-Checkpoints im "Erkenntnisse"-Abschnitt. Format:

```
- <YYYY-MM-DD> HH:MM 🔖 <Zusammenfassung>
  - Erledigt: <was erledigt wurde>
  - In Arbeit: <aktueller Stand>
  - Nächster Schritt: <konkrete nächste Aktion>
```

Breadcrumbs überleben Context-Komprimierung und Session-Neustarts. Sie dienen als Wiederherstellungspunkt, damit die nächste Session nahtlos weiterarbeiten kann.

## Klassifizierung von Notizen (i:update)

| Typ | Ziel-Abschnitt | Format |
|-----|----------------|--------|
| Neue Anforderung | Anforderungen | `- [ ] <text> *(Nachtrag <date>)*` |
| Bug / Testfeedback | Anforderungen | `- [ ] Bug: <text> *(Testfeedback <date>)*` |
| Technische Erkenntnis | Erkenntnisse | `- <date>: <text>` |
| Entscheidung | Entscheidungen | `- <date>: <text> — Grund: <reason>` |

## Section-Aliase

Beim Lesen oder Migrieren werden folgende Section-Namen als äquivalent zu den kanonischen Namen behandelt (case-insensitive, ohne führende Emojis/Klammer-Zusätze):

| Variante | Kanonisch |
|---|---|
| `Anforderungen (DoD)`, `Anforderungen (Definition of Done)`, `Definition of Done` | `Anforderungen` |
| `Codebase-Analyse`, `Betroffene Codebereiche`, `Betroffene Bereiche/Dateien` | `Betroffene Bereiche` |
| `Fragen`, `Open Questions`, `Klärungsbedarf` | `Offene Fragen` |
| `Decisions`, `Entscheidungen & Annahmen` | `Entscheidungen` |
| `Schätzung`, `Aufwand`, `Estimation` | `Aufwandsschätzung` |
| `Plan`, `Implementierung`, `Vorgehen` | `Umsetzungsplan` |
| `Tests`, `Test Plan`, `Testing` | `Testschritte` |
| `Findings`, `Notizen`, `Ergebnisse` | `Erkenntnisse` |
| `Sources`, `Datenquellen`, `Referenzen` | `Quellen` |

Neue Issues sollen die kanonischen Namen verwenden. Aliase existieren nur, damit Legacy-Issues nicht doppelte Sections erhalten.

## Worktree-Safety

Issue-Dokumente liegen im Hauptverzeichnis, nicht im Worktree:

```bash
MAIN_DIR=$(git worktree list | head -1 | awk '{print $1}')
ISSUES_DIR="$MAIN_DIR/.claude/issues"
```

Immer `$ISSUES_DIR/<issue-key>.md` verwenden, nie relativ zum aktuellen Verzeichnis.

## Datenquellen & CLIs

Zentrale Stelle für alle externen Zugriffe. Commands verweisen hierauf statt eigene Varianten zu definieren.

### Preflight

Vor dem ersten externen Zugriff prüfen — nie annehmen, dass ein CLI vorhanden oder authentifiziert ist:

```bash
command -v jira >/dev/null && jira me >/dev/null 2>&1 && echo "jira: ok"
command -v confluence >/dev/null && confluence spaces -l 1 --json >/dev/null 2>&1 && echo "confluence: ok"
```

| Ergebnis | Verhalten |
|---|---|
| `jira` fehlt oder nicht authentifiziert | Einmalig melden, User um manuelle Ticket-Beschreibung bitten. Nie abbrechen, wenn der User Text mitgeliefert hat. |
| `confluence` fehlt oder nicht konfiguriert | Confluence-Schritte überspringen, gefundene Links als offene Quellen im Abschnitt „Quellen" notieren. Kein Abbruch. |

Degradation ist immer erlaubt, stilles Weglassen nicht: was nicht geholt werden konnte, gehört sichtbar in die Ausgabe.

### Jira lesen — `--raw` als Basis

`--plain` rendert nur Text und verliert Attachments, Parent, Links und Subtasks. Deshalb **immer beides**: `--raw` für Struktur, `--plain` für den lesbaren Fließtext.

Die Kommentaranzahl wird aus dem Payload abgeleitet, nicht geraten — so ist stille Truncation ausgeschlossen:

```bash
TMP=$(mktemp -d)
jira issue view <KEY> --raw > "$TMP/issue.json"
N=$(jq -r '.fields.comment.total // 0' "$TMP/issue.json")
jira issue view <KEY> --plain --comments "$((N > 0 ? N : 1))"
```

Auswertung des JSON (jeweils ein Aspekt pro Aufruf, damit die Ausgabe klein bleibt):

```bash
# Kernfelder inkl. Jira-Status
jq -c '.fields | {status: .status.name, type: .issuetype.name, parent: .parent.key,
  labels, components: [.components[].name], due: .duedate}' "$TMP/issue.json"

# Attachments (Bilder/Mockups sind Anforderungen)
jq -r '.fields.attachment[]? | [.filename, .mimeType, (.size|tostring), .content] | @tsv' "$TMP/issue.json"

# Kontext-Graph: Parent/Epic, verlinkte Tickets, Subtasks
jq -c '.fields | {parent: .parent.key,
  links: [.issuelinks[]? | {type: (.type.outward // .type.inward), key: (.outwardIssue.key // .inwardIssue.key)}],
  subtasks: [.subtasks[]?.key]}' "$TMP/issue.json"

# Confluence- und sonstige Links aus der ADF-Beschreibung und den Kommentaren
jq -r '[.. | objects | (.attrs?.href // .attrs?.url // empty)] | unique | .[]' "$TMP/issue.json" \
  | grep -Ei '/wiki/(spaces|display)|pageId=' | sort -u
```

### Attachments herunterladen

Ziel: `$ISSUES_DIR/attachments/<KEY>/`. Authentifizierung über `~/.netrc` — so landet kein Token in Kommandozeile, Environment oder Config.

```bash
DEST="$ISSUES_DIR/attachments/<KEY>"; mkdir -p "$DEST"
curl -fsSL --netrc -o "$DEST/<dateiname>" "<content-URL>"
```

- Nur `image/*` und `application/pdf` laden — die kann Claude mit `Read` auswerten
- Größenlimit 10 MB pro Datei; größere nur im Abschnitt „Quellen" listen, nicht laden
- Geladene Bilder **immer mit `Read` ansehen** und daraus visuelle Anforderungen, States und Edge Cases ableiten
- Schlägt der Download fehl (kein `.netrc`-Eintrag, 403), einmal melden und den User bitten, die Bilder direkt in den Chat zu geben

### Confluence lesen

Tickets verlinken häufig Specs, Konzepte oder Styleguides. Diese Seiten sind Anforderungsquelle, nicht Beiwerk.

```bash
confluence read "<page-URL-oder-ID>" --format markdown     # Inhalt
confluence search "<Ticket-Key oder Feature>" --limit 5     # verwandte Specs

# Metadaten für den Quellen-Eintrag (--json steht hinter dem Subcommand)
confluence info "<page-URL-oder-ID>" --json | jq -c '{title, id, version, spaceKey, url}'
```

`.version` ist eine **Zahl**, kein Objekt — `.version.number` bricht die jq-Pipeline ab und führt zum stillen Plain-Text-Fallback.

- **Nur lesend** arbeiten. `CONFLUENCE_READ_ONLY=true` setzen, wenn die Umgebung es erlaubt — die Commands dieses Trackers schreiben nie nach Confluence.
- Verlinkte Seiten **einmal** lesen, dann in „Quellen" mit Page-ID und Version festhalten
- Untergeordnete Seiten nur bei Bedarf (`confluence children <id>`) — nicht ganze Bäume einlesen
- Widersprüche zwischen Ticket und Confluence-Seite sind kein Detail: als offene Frage melden, nicht selbst entscheiden

### Jira schreiben

Schreibende Zugriffe verändern für das ganze Team sichtbare Tickets. Regeln:

- **Nie ohne explizite Bestätigung** — Vorschau des exakten Textes zeigen, dann fragen
- **Nie automatisch als Nebeneffekt** eines lesenden Commands
- Bei Fehlschlag (fehlende Berechtigung, ungültige Transition) den lokalen Stand behalten und den Fehler melden — niemals stillschweigend überspringen

```bash
# Kommentar (Body aus Datei — vermeidet Shell-Quoting-Probleme bei Wiki-Markup)
jira issue comment add <KEY> -T "$TMP/comment.txt" --no-input

# Statuswechsel (STATE muss exakt dem Jira-Workflow entsprechen)
jira issue move <KEY> "<STATE>" --comment "<optionaler Kommentar>"
```

Vor einem Statuswechsel den aktuellen Jira-Status aus `--raw` lesen. Ist der Zielstatus unbekannt oder die Transition nicht erlaubt, die verfügbaren Optionen erfragen statt zu raten.

## Gemeinsame Regeln

- **Sprache**: Deutsche Ausgabe (Issue-Dokumente und Bestätigungen)
- **Pfad**: `.claude/issues/<ISSUE-KEY>.md` — Großbuchstaben wie im Jira-Key
- **Nicht committen**: `.claude/issues/` ist lokal, nicht Teil des Repos
- **Immer persistieren**: Jede Änderung sofort in die Datei schreiben
- **Append-only**: Bestehende Inhalte nie überschreiben, nur ergänzen (Ausnahme: Checkbox-Status, Frontmatter)
- **Scannable**: Bullet Points statt Prosa, Checkboxen für Anforderungen
- **Bilder sind Anforderungen**: Attachments laden (siehe „Datenquellen & CLIs"), mit `Read` ansehen und auf visuelle Requirements, States und Edge Cases analysieren — nicht an den User delegieren, solange der Download möglich ist
- **Quellen belegen**: Jede externe Quelle (Ticket, Parent, Confluence-Seite, Attachment) gehört in den Abschnitt „Quellen"
- **Keine Erfindungen**: Bei unzureichenden Infos nachfragen statt Scope erfinden
- **Nie still degradieren**: Was nicht geholt werden konnte (Attachment, Confluence-Seite, Kommentare jenseits des Payloads), gehört sichtbar in die Ausgabe

## CLI-Ausgabe (i:list)

```
┌──────────────────────────────────────────────────────────────┐
│  Issue Documents                                             │
├──────────┬────────────────┬───────────────┬──────────────────┤
│ Issue    │ Status         │ Anforderungen │ Aktualisiert     │
├──────────┼────────────────┼───────────────┼──────────────────┤
│ VBDI-255 │ in-progress    │ ████░░  4/6   │ 2026-03-15       │
│ VBDI-312 │ analysis       │ ░░░░░░  0/4   │ 2026-03-17       │
│ PROJ-100 │ done           │ ██████  7/7   │ 2026-03-10       │
├──────────┴────────────────┴───────────────┴──────────────────┤
│  3 Issues: 1 in-progress, 1 analysis, 1 done                 │
└──────────────────────────────────────────────────────────────┘
```

### Status-Indikatoren

| Status | Indikator |
|--------|-----------|
| `analysis` | `analysis` |
| `estimated` | `estimated` |
| `in-progress` | `in-progress` |
| `in-review` | `in-review` |
| `done` | `done` |

### Progress-Bar

6 Zeichen breit, proportional zu erledigten Anforderungen:

- `██████` = 100% (alle erledigt)
- `████░░` = ~67%
- `░░░░░░` = 0%
