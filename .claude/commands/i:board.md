# i:board

Open the Kanban board in the browser.

## Arguments

- `stop` (optional) — Stop a running board server

## Workflow

### Start (no arguments)

1. Check if a board server is already running:
   ```bash
   PID=$(pgrep -f "issue-board")
   ```
   If running, find the port and open it:
   ```bash
   PORT=$(lsof -p $PID -iTCP -sTCP:LISTEN -P -n | awk 'NR>1{print $9}' | cut -d: -f2 | head -1)
   open "http://localhost:$PORT"
   ```
   Tell the user: `Board läuft bereits auf http://localhost:$PORT` — then stop.

2. Start the server in the background:
   ```bash
   PROJECT_DIR=$(git worktree list | head -1 | awk '{print $1}') issue-board &
   ```

3. The server opens the browser automatically and prints the URL.

4. Tell the user: `Board gestartet. Zum Beenden: /i:board stop`

### Stop (`/i:board stop`)

1. Find and stop the board server:
   ```bash
   pkill -f "issue-board"
   ```

2. Confirm: `Board gestoppt.`
   If no server was running: `Kein Board-Server aktiv.`

## Rules

- Server runs in the background so the conversation can continue
- Only one instance at a time — reuse if already running
