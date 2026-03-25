---
description: Issue document format, lifecycle, and conventions for the i:req/i:aws/i:note/i:dod/i:issues workflow. Use when working with issue documents, Jira ticket analysis, effort estimation, or Definition of Done checks.
disable-model-invocation: true
---

# Issue Management

Lokales Issue-Tracking basierend auf Markdown-Dokumenten in `.claude/issues/`. Nicht committet, persistiert zwischen Sessions.

## Lifecycle

```
i:req  ──>  i:aws (optional)  ──>  Implementation  ──>  i:dod
              │                          │
              │                     i:note (as needed)
              │                          │
              └──────────────────────────┘
```

| Status | Bedeutung | Gesetzt durch |
|--------|-----------|---------------|
| `analysis` | Anforderungen erfasst, noch nicht bewertet | i:req |
| `estimated` | Aufwandsschätzung erstellt | i:aws |
| `in-progress` | Implementierung läuft | i:req (nach Plan-Bestätigung) |
| `in-review` | Code-Review / QA läuft | manuell oder i:dod (teilweise) |
| `done` | Alle Anforderungen erfüllt | i:dod |

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
---
```

| Feld | Pflicht | Gesetzt durch | Beschreibung |
|------|---------|---------------|-------------|
| `key` | ja | i:req | Jira-Key in Großbuchstaben (z.B. `MWS-19`) |
| `title` | ja | i:req | Kurzer Ticket-Titel |
| `status` | ja | alle Commands | Aktueller Lifecycle-Status |
| `complexity` | ja | i:req | Technische Komplexität |
| `scope` | ja | i:req | Geschätzter Umfang |
| `created` | ja | i:req | Erstellungsdatum |
| `updated` | ja | alle Commands | Letzte Änderung |

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
(ergänzt durch i:aws)

## Umsetzungsplan
(ergänzt nach Bestätigung)

## Erkenntnisse
(ergänzt während Umsetzung via i:note)
```

## Abschnitt-Konventionen

### Anforderungen
- Jede Anforderung als Checkbox (`- [ ]` / `- [x]`)
- Nachträge: `- [ ] Anforderung *(Nachtrag <YYYY-MM-DD>)*`
- Bugs: `- [ ] Bug: Beschreibung *(Testfeedback <YYYY-MM-DD>)*`
- Nachträge und Bugs zählen gleichwertig zur DoD

### Entscheidungen
- Format: `- <YYYY-MM-DD>: Entscheidung — Grund: Begründung`

### Erkenntnisse
- Format: `- <YYYY-MM-DD>: Erkenntnis`

## Breadcrumbs (i:breadcrumb)

Session-Checkpoints im "Erkenntnisse"-Abschnitt. Format:

```
- <YYYY-MM-DD> HH:MM 🔖 <Zusammenfassung>
  - Erledigt: <was erledigt wurde>
  - In Arbeit: <aktueller Stand>
  - Nächster Schritt: <konkrete nächste Aktion>
```

Breadcrumbs überleben Context-Komprimierung und Session-Neustarts. Sie dienen als Wiederherstellungspunkt, damit die nächste Session nahtlos weiterarbeiten kann.

## Klassifizierung von Notizen (i:note)

| Typ | Ziel-Abschnitt | Format |
|-----|----------------|--------|
| Neue Anforderung | Anforderungen | `- [ ] <text> *(Nachtrag <date>)*` |
| Bug / Testfeedback | Anforderungen | `- [ ] Bug: <text> *(Testfeedback <date>)*` |
| Technische Erkenntnis | Erkenntnisse | `- <date>: <text>` |
| Entscheidung | Entscheidungen | `- <date>: <text> — Grund: <reason>` |

## Worktree-Safety

Issue-Dokumente liegen im Hauptverzeichnis, nicht im Worktree:

```bash
MAIN_DIR=$(git worktree list | head -1 | awk '{print $1}')
ISSUES_DIR="$MAIN_DIR/.claude/issues"
```

Immer `$ISSUES_DIR/<issue-key>.md` verwenden, nie relativ zum aktuellen Verzeichnis.

## Gemeinsame Regeln

- **Sprache**: Deutsche Ausgabe (Issue-Dokumente und Bestätigungen)
- **Pfad**: `.claude/issues/<ISSUE-KEY>.md` — Großbuchstaben wie im Jira-Key
- **Nicht committen**: `.claude/issues/` ist lokal, nicht Teil des Repos
- **Immer persistieren**: Jede Änderung sofort in die Datei schreiben
- **Append-only**: Bestehende Inhalte nie überschreiben, nur ergänzen (Ausnahme: Checkbox-Status, Frontmatter)
- **Scannable**: Bullet Points statt Prosa, Checkboxen für Anforderungen
- **Bilder sind Anforderungen**: Screenshots/Mockups auf visuelle Requirements, States und Edge Cases analysieren
- **Keine Erfindungen**: Bei unzureichenden Infos nachfragen statt Scope erfinden

## CLI-Ausgabe (i:issues)

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
