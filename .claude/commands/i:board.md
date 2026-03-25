# i:board

Open the Kanban board in the browser.

## Workflow

1. Resolve the board directory:
   - Check `~/.claude/board/server.js` (installed via symlink)
   - Fallback: check `board/server.js` relative to the repo root

2. Start the server:
   ```bash
   node <board-dir>/server.js
   ```

3. The server opens the browser automatically and prints the URL.

4. Tell the user: `Board gestartet. Zum Beenden Ctrl+C im Terminal drücken.`

## Rules

- Server runs in the foreground — user stops it with Ctrl+C
- If already running (port in use), inform the user and open the URL
