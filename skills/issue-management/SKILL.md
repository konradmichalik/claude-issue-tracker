---
description: Issue document format, lifecycle, and conventions for the i:new/i:update/i:report/i:note workflow. Use when working with issue documents, tracker sync, or session breadcrumbs.
disable-model-invocation: true
---

# Issue Management

Lokales Issue-Tracking basierend auf Markdown-Dokumenten in `.issues/` (im Hauptverzeichnis, nicht committet, persistiert zwischen Sessions). Tracker-agnostisch: Jira, GitHub, Redmine oder gar kein Tracker.

Externer Zugriff (Fetch, Sync, Post, Attachments) läuft ausschließlich über `${CLAUDE_PLUGIN_ROOT}/bin/i` — Commands shellen nie direkt zu `jira`/`gh`/`curl`. Das CLI ist in `bin/i` und `lib/` dokumentiert; diese Datei beschreibt nur das Dokumentformat und die Konventionen, die das CLI nicht kennt.

## Lifecycle

```
i:new  ──>  Implementation  ──>  done (manuell oder via letztem i:update)
              │        │
    i:update (Delta)   i:report (Zwischenstand an den Tracker)
              │        │
              └────────┘
```

| Status | Bedeutung | Gesetzt durch |
|--------|-----------|---------------|
| `analysis` | Anforderungen erfasst, Implementierung noch nicht bestätigt | i:new |
| `in-progress` | Implementierung läuft | i:new (nach Plan-Bestätigung) |
| `in-review` | Code-Review / QA läuft | manuell |
| `done` | Alle Anforderungen erfüllt | manuell, nach `/i:report --close` oder eigener Prüfung |

Es gibt keinen separaten Schätz-Schritt und keinen `/i:close`-DoD-Check mehr — beides wurde in fünf Wochen Nutzung nie aufgerufen. Eine Aufwandsschätzung kann weiterhin im Abschnitt „Aufwandsschätzung" stehen, ist aber optional und hat keinen eigenen Lifecycle-Status.

## Ref-Auflösung

Jeder Command, der ein Issue referenziert, akzeptiert dieselbe Eingabeform, aufgelöst durch `bin/i ref <eingabe>`:

| Eingabe | Tracker | Dateiname |
|---|---|---|
| (leer) | — | aktives Issue: Branch → `branch:`-Feld → jüngstes `in-progress` |
| `VHWWEB-312` | jira | `VHWWEB-312.md` |
| `https://…atlassian.net/browse/X-1` | jira | `X-1.md` |
| `https://github.com/o/r/issues/9` | github | `GH-9.md` |
| `22` | github (aus `origin`-Remote) | `GH-22.md` |
| `https://forge.typo3.org/issues/110434` | redmine | `RM-110434.md` |
| freier Text | keiner (`none`) | `<slug>.md` |

`GH-` und `RM-` als Präfix, nicht die nackte Nummer — Dateinamen müssen greppbar bleiben, auch außerhalb dieses Repos (`bin/i recall GH-101`).

`tracker: none` ist ein gültiger, kein degradierter Zustand — freie Themen ohne Ticket sind ein regulärer Anwendungsfall.

## Issue-Document-Format

### Frontmatter (YAML, exakt dieses Schema)

```yaml
---
key: <KEY>
title: <Titel>
status: analysis | in-progress | in-review | done
tracker: jira | github | redmine | none
ref: <interne Referenz, z.B. Jira-Key oder owner/repo#nummer>
url: <Browse-URL, falls vorhanden>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
branch: <aktueller Branch>
reported: <YYYY-MM-DD, Datum des letzten i:report>
sessions:
  - <YYYY-MM-DD> <sessionId-kurz> <branch>
---
```

| Feld | Pflicht | Gesetzt durch | Beschreibung |
|------|---------|---------------|-------------|
| `key` | ja | i:new | Eindeutiger Schlüssel, Großbuchstaben |
| `title` | ja | i:new | Kurzer Titel |
| `status` | ja | alle Commands | Aktueller Lifecycle-Status |
| `tracker` | ja | i:new | `jira`, `github`, `redmine` oder `none` |
| `ref` | nein | i:new | Interne Referenz für `bin/i`, z.B. `owner/repo#9` |
| `url` | nein | i:new | Browse-URL, falls beim Fetch bekannt |
| `created` | ja | i:new | Erstellungsdatum |
| `updated` | ja | alle Commands | Letzte inhaltliche Änderung |
| `branch` | nein | i:new | Aktueller Arbeits-Branch — einzige Verknüpfung bei GitHub, wo die Issue-Nummer nicht im Branchnamen steht |
| `reported` | nein | i:report | Datum der letzten Zwischenstandsmeldung — verhindert doppelte Reports |
| `sessions` | nein | i:new, SessionStart-Hook | Liste `<datum> <sessionId> <branch>`, eine Zeile pro Claude-Code-Session an diesem Issue |

**Entfallen gegenüber der Vorversion:** `complexity`, `scope` (keine Konsumenten mehr), `jira_synced` (ersetzt durch den Sync-Cache in `.issues/.cache/`, der über Kommentar-IDs vergleicht statt über einen Zeitstempel — funktioniert dadurch tracker-übergreifend und hat kein Same-Day-Problem).

### Body

```markdown

## Zusammenfassung
2-4 Sätze: was ist das, warum ist es relevant, aktueller Stand.

## Anforderungen
- [ ] Anforderung 1

## Betroffene Bereiche
- `pfad/zur/datei.ts` — was sich hier ändert

## Offene Fragen

## Entscheidungen

## Erkenntnisse

## Quellen
```

**Nur befüllte Abschnitte anlegen.** `Zusammenfassung`, `Anforderungen`, `Betroffene Bereiche`, `Offene Fragen`, `Entscheidungen`, `Erkenntnisse`, `Quellen` sind kanonisch, wenn sie Inhalt haben. `Aufwandsschätzung`, `Umsetzungsplan`, `Testschritte`, `Risiken` sind optional und entstehen erst, wenn ein Command tatsächlich etwas hineinschreibt — eine leere Überschrift wird nie erzeugt.

## Abschnitt-Konventionen

### Zusammenfassung
Wird von i:new einmal geschrieben, danach nicht mehr automatisch verändert. Bei größeren Kurswechseln (i:update mit Entscheidung, die den Rahmen ändert) ergänzt, nie ersetzt.

### Anforderungen
- Jede Anforderung als Checkbox (`- [ ]` / `- [x]`)
- Nachträge: `- [ ] Anforderung *(Nachtrag <date>)*`
- Bugs: `- [ ] Bug: Beschreibung *(Testfeedback <date>)*`
- **Nur nach Verifikation abhaken.** Ein `- [x]` behauptet, dass die Anforderung geprüft erfüllt ist — nicht, dass Code dafür geschrieben wurde. `bin/i status` und `/i:report` lesen den Haken als Tatsachenbehauptung.
- **Text einer Anforderung wird nie umformuliert, gekürzt oder gelöscht.** Nur der Status wechselt zwischen `[ ]` und `[x]`. Eine geänderte oder präzisierte Anforderung ist ein Nachtrag, keine Korrektur der ursprünglichen Zeile — sonst verliert `/i:report` die Grundlage für „was war vorher offen".
- Checkboxen sind die einzige Quelle für den Fortschritt, den `bin/i status`, `bin/i list` und `/i:report` anzeigen. Kein separates Prozent-Feld, kein Board — die Liste selbst ist der Zähler.

### Entscheidungen
Format: `- <date>: Entscheidung — Grund: Begründung`

### Erkenntnisse
Format: `- <date>: Erkenntnis`. Enthält auch Breadcrumbs (siehe unten) und die von `i:update`/`i:report` übernommenen Sync-Funde.

### Quellen
Provenienz der Anforderungen. Format:

```markdown
## Quellen
- Jira: <KEY> — <url> (Status: <status>, geholt <date>)
- Confluence: <Seitentitel> — Page-ID <id>, Version <n> (gelesen <date>)
- Attachment: <dateiname> (<mime>) — `.issues/attachments/<KEY>/<dateiname>`
```

Ein Parent/Epic, dessen Akzeptanzkriterien übernommen wurden, wird wie ein Ticket eingetragen. Verlinkte Tickets sind Kontext, keine Quelle — die gehören in „Betroffene Bereiche" oder „Erkenntnisse".

## Breadcrumbs (i:note)

Session-Checkpoints im „Erkenntnisse"-Abschnitt:

```
- <date> HH:MM 🔖 <Zusammenfassung>
  - Erledigt: <was erledigt wurde>
  - In Arbeit: <aktueller Stand>
  - Nächster Schritt: <konkrete nächste Aktion>
```

Überleben Context-Komprimierung und Session-Neustarts. Der SessionStart-Hook liest den letzten Breadcrumb, `/i:note` schreibt ihn.

## Klassifizierung von Notizen (i:update)

| Typ | Ziel-Abschnitt | Format |
|-----|----------------|--------|
| Neue Anforderung | Anforderungen | `- [ ] <text> *(Nachtrag <date>)*` |
| Bug / Testfeedback | Anforderungen | `- [ ] Bug: <text> *(Testfeedback <date>)*` |
| Technische Erkenntnis | Erkenntnisse | `- <date>: <text>` |
| Entscheidung | Entscheidungen | `- <date>: <text> — Grund: <reason>` |

## Report-Templates (i:report)

```
**Zwischenstand <Datum>**          **Status update <date>**       (deutsch, jira/redmine)   (englisch, github)

Erledigt                            Done
- ...                                - ...

Offen                                Open
- ...                                - ...

Nächster Schritt: ...                Next: ...
```

Sprache folgt dem Tracker: `jira`/`redmine` → deutsch, `github` → englisch, `none` → Sprache des Repos, im Zweifel nachfragen. Gerendert über `bin/i report-template --lang <de|en> --kind <fortschritt|abschluss> --json <datei>`.

**Erledigt/Offen kommen aus den Anforderungen, nicht aus freier Formulierung.** `Erledigt` = abgehakte Checkboxen (`- [x]`), `Offen` = nicht abgehakte, inklusive Nachträge und Testfeedback. Neue `Entscheidungen` oder `Erkenntnisse` seit dem letzten Report ergänzen `Erledigt` als zusätzliche Zeilen, ersetzen die Checkbox-Liste aber nicht. Das macht den Report zu einer Momentaufnahme des tatsächlichen Standes statt einer Nacherzählung — und gibt den Checkboxen den Konsumenten, den sie sonst nicht hätten.

## Section-Aliase

Beim Lesen werden folgende Namen als äquivalent zu den kanonischen behandelt (case-insensitive, ohne führende Emojis/Klammer-Zusätze). Neue Issues verwenden nur die kanonischen Namen — Aliase existieren, damit Alt-Dokumente nicht doppelte Sections erhalten.

| Variante | Kanonisch |
|---|---|
| `Anforderungen (DoD)`, `Definition of Done` | `Anforderungen` |
| `Codebase-Analyse`, `Betroffene Codebereiche` | `Betroffene Bereiche` |
| `Fragen`, `Open Questions`, `Klärungsbedarf` | `Offene Fragen` |
| `Decisions`, `Entscheidungen & Annahmen` | `Entscheidungen` |
| `Schätzung`, `Aufwand`, `Estimation`, `Assessment`, `Scope Assessment` | `Aufwandsschätzung` |
| `Plan`, `Implementierung`, `Implementierungsplan`, `Vorgehen` | `Umsetzungsplan` |
| `Tests`, `Test Plan`, `Testing` | `Testschritte` |
| `Findings`, `Notizen`, `Ergebnisse` | `Erkenntnisse` |
| `Sources`, `Datenquellen`, `Referenzen` | `Quellen` |

## Anhänge

`bin/i attach <ref> --dest .issues/attachments/<key>` lädt `image/*` und `application/pdf` bis 10 MB, authentifiziert über `~/.netrc` (kein Token in Kommandozeile, Environment oder Config). Größere oder andere Dateitypen werden nur im Abschnitt „Quellen" verlinkt, nicht geladen. Jedes geladene Bild wird mit `Read` angesehen und auf visuelle Anforderungen, States und Edge Cases geprüft — nie an den User delegiert, solange der Download möglich ist.

## Confluence

`confluence read "<url>" --format markdown` einmal pro verlinkter Seite, Metadaten via `confluence info "<url>" --json` (`.version` ist eine Zahl, kein Objekt). Nur lesend. Widersprüche zwischen Ticket und Seite sind eine offene Frage, keine eigene Entscheidung.

## Sessions

`sessions:` im Frontmatter verknüpft ein Issue mit jeder Claude-Code-Session, die daran gearbeitet hat — geschrieben von `i:new` (erste Session) und vom SessionStart-Hook (jede Folgesession auf demselben Branch). `bin/i sessions <ref>` listet sie, `claude --resume <id>` nimmt eine wieder auf.

Für Kontext, der nie ins Dokument geschrieben wurde: `bin/i recall <key>` durchsucht alle lokalen Transcripts (`~/.claude/projects/**/*.jsonl`) nach dem Key und gibt Fundstellen mit Datum, Session und Kontextzeile aus.

## Stop-Hook

Beim Sessionende prüft `bin/i check-note`: aktives Issue vorhanden, Working Tree schmutzig, aber „Erkenntnisse" hat heute noch keinen Eintrag → die Session wird einmal mit der Bitte um `/i:note` zurückgehalten. Danach still, entweder weil der Eintrag jetzt existiert (löst die Bedingung auf) oder weil für diese Session schon einmal nachgefragt wurde (`.issues/.cache/.stop-nag/`, pro Session-ID). Blockt nie zweimal hintereinander.

## Übersicht

`bin/i list` — Tabelle aller Issues (Key, Status, Tracker, Anforderungen-Zähler, zuletzt aktualisiert), sortiert nach `updated`. Kostet keinen Modellturn, lohnt sich vor `/i:new`, um zu sehen, was schon läuft.

## Worktree-Safety

`.issues/` liegt im Hauptverzeichnis, nicht im Worktree. `bin/i` löst das selbst über `git rev-parse --path-format=absolute --git-common-dir` auf — kein Command muss das selbst parsen.

## Gemeinsame Regeln

- **Sprache**: siehe „Report-Templates" für Tracker-Kommunikation; für das Dokument selbst siehe `i:new` Schritt 6.
- **Pfad**: `.issues/<filename>` — siehe Ref-Auflösung für das Namensschema
- **Nicht committen**: `.issues/` ist lokal, doppelt abgesichert — global über `~/.gitignore` (diese Maschine) und im Projekt selbst über dessen eigene `.gitignore` (jeder, der das Repo klont). `bin/i migrate-once --apply` schreibt beide.
- **Immer persistieren**: jede Änderung sofort in die Datei schreiben
- **Append-only**: bestehende Inhalte nie überschreiben, nur ergänzen (Ausnahme: Checkbox-Status, Frontmatter)
- **Keine leeren Abschnitte**: eine Überschrift ohne Inhalt wird nicht geschrieben
- **Bilder sind Anforderungen**: siehe „Anhänge"
- **Quellen belegen**: jede externe Quelle gehört in den Abschnitt „Quellen"
- **Keine Erfindungen**: bei unzureichenden Infos nachfragen statt Scope erfinden
- **Nie still degradieren**: was nicht geholt werden konnte, gehört sichtbar in die Ausgabe
- **Nicht jede Aufgabe braucht ein Issue**: Ein aktives Issue verpflichtet nicht dazu, jede Session-Erkenntnis dort zu verorten. Bei themenfremden Aufgaben (Quick Fix, Exploration, Arbeit ohne Tracker-Bezug) kein Issue erzwingen und keine Erkenntnisse an ein unpassendes Issue hängen — einfach ohne Issue-Zuordnung arbeiten.
