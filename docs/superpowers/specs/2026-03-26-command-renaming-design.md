# Command Renaming Design

Rename aller Issue-Tracker-Commands zu intuitiveren, aktionsbasierten Namen. Hybridansatz: Rename jetzt als Commands, Migration zu Skills als Folgeschritt.

## Command-Mapping

| Neu | Alt | Aktion |
|-----|-----|--------|
| `i:new` | `i:req` | Neue Datei, alte löschen |
| `i:update` | `i:note` | Neue Datei, alte löschen |
| `i:resume` | `i:breadcrumb` + Teil von `i:req` | Neue Datei, alte löschen |
| `i:close` | `i:dod` | Neue Datei, alte löschen |
| `i:estimate` | `i:aws` | Neue Datei, alte löschen |
| `i:list` | `i:issues` | Neue Datei, alte löschen |
| `i:board` | `i:board` | Unverändert |

## Verhaltensänderungen

### i:new (ehem. i:req)

- Argument: `<issue-key> [description]`
- Prüft ob `.claude/issues/<issue-key>.md` existiert
- Falls ja: Abbruch mit Hinweis auf `i:resume`
- Falls nein: Workflow wie bisheriges `i:req` (Jira-Fetch oder manuell, Analyse, Scope-Assessment, Speichern)
- Keine Doppelrolle mehr (neues vs. bestehendes Issue)

### i:update (ehem. i:note)

- Argument: `<issue-key> [info]`
- Mit `[info]`: Wie bisheriges `i:note` — klassifizieren, in richtigen Abschnitt eintragen
- Ohne `[info]`: Jira-Sync — `jira issue view <issue-key> --plain --comments 10`, neue Kommentare seit letztem `updated`-Datum ins Dokument mergen (Abschnitt "Erkenntnisse"), User informieren was sich geändert hat. Append-only — bestehende Einträge werden nicht verändert.
- Issue-Dokument muss existieren, sonst Verweis auf `i:new`

### i:resume (ehem. i:breadcrumb + Teil von i:req)

- Argument: `<issue-key> [checkpoint]`
- Ohne `[checkpoint]`: Liest Issue-Dokument, zeigt letzten Breadcrumb + Status + offene Anforderungen, fragt "Was möchtest du tun?" (weiterarbeiten, schätzen, updaten)
- Mit `[checkpoint]`: Schreibt Breadcrumb ins Issue-Dokument (Format wie bisheriges `i:breadcrumb`: Timestamp + Erledigt/In Arbeit/Nächster Schritt)
- Leichtgewichtiger Einstiegspunkt — keine automatische Analyse
- Issue-Dokument muss existieren, sonst Verweis auf `i:new`

### i:close (ehem. i:dod)

- Funktional identisch mit `i:dod`, nur neuer Name
- Alle internen Verweise auf alte Commandnamen ersetzen (`i:req` → `i:new`, `i:note` → `i:update`, etc.)

### i:estimate (ehem. i:aws)

- Funktional identisch mit `i:aws`, nur neuer Name
- Alle internen Verweise auf alte Commandnamen ersetzen (`i:req` → `i:new`, `i:note` → `i:update`, etc.)

### i:list (ehem. i:issues)

- Funktional identisch mit `i:issues`, nur neuer Name
- Alle internen Verweise auf alte Commandnamen ersetzen (`i:req` → `i:new`, `i:note` → `i:update`, etc.)

### i:board

- Unverändert

## Dokumentationsanpassungen

### CLAUDE.md

- Command-Tabelle: neue Namen und aktualisierte Beschreibungen
- Repository Structure: Dateinamen in der Baumansicht
- Lifecycle-Diagramm: neue Commandnamen
- Status-Tabelle: "Set by" aktualisieren

### i-issue-management/SKILL.md

- Frontmatter `description`: alte Commandnamen ersetzen
- Lifecycle-Diagramm: alle Commandnamen ersetzen
- Status-Tabelle: "Gesetzt durch" aktualisieren
- Frontmatter-Feld-Tabelle: "Gesetzt durch" aktualisieren (`i:req` → `i:new`)
- Abschnitt-Konventionen: Verweise aktualisieren
- Breadcrumb-Abschnitt: `i:breadcrumb` → `i:resume`
- Klassifizierung von Notizen: `i:note` → `i:update`
- CLI-Ausgabe-Überschrift: `i:issues` → `i:list`
- Gemeinsame Regeln: alle alten Commandnamen ersetzen

### Board

- Prüfen ob Commandnamen im UI oder Server referenziert werden
- Falls ja: ersetzen. Falls nein: keine Änderung an `i:board.md` oder Board-Code

## Scope-Abgrenzung

- Kein Umbau von Commands zu Skills (Folgeschritt)
- Keine neuen Features über die beschriebenen Verhaltensänderungen hinaus
- Kein neuer Code im Board
