# Samson Pi Setup

Public, portable Pi coding-agent configuration: Atom One Dark-style theme, arcade Space Invaders header, Codex quota/status display, custom syntax/read rendering, and git helper commands.

Repo: <https://github.com/SamsonShuttle/pi-config>

## File map

| File | What it does |
| --- | --- |
| `settings.json` | Pi global defaults: provider/model/thinking level/theme. JSON cannot contain comments, so it is documented here. |
| `themes/my-theme.json` | Custom Atom One Dark / black high-contrast terminal theme. JSON cannot contain comments, so it is documented here. |
| `extensions/custom-header.ts` | Animated `PI INVADERS` header, Codex quota footer/status, arcade score line, and power-tip text. |
| `extensions/code-word-highlighter.ts` | Replaces Pi's `read` tool renderer to add extra highlighting for React hooks, JSON/YAML keys, Python decorators, etc. |
| `extensions/pi-config-git.ts` | Adds `/pi-config-status` and `/pi-config-push` commands for this config repo. |
| `.gitignore` | Prevents credentials, sessions, cache, tmp, and Pi-managed binaries from being committed. |

## Security / what not to publish

This repo intentionally tracks only curated config. Do **not** publish the whole `~/.pi` or `~/.codex` folders.

Never commit:

```text
~/.pi/auth.json
~/.pi/agent/auth.json
~/.pi/agent/sessions/
~/.pi/agent/cache/
~/.pi/agent/tmp/
~/.pi/agent/bin/
~/.codex/auth.json
~/.codex/*.sqlite
~/.codex/logs/
```

The Codex quota extension reads `~/.codex/auth.json` locally at runtime, but that file is not stored in this repo.

## Install Pi on a new laptop

Pi is installed with npm:

```bash
npm install -g --ignore-scripts @earendil-works/pi-coding-agent
```

Start Pi once so it creates the config folder:

```bash
pi
```

Then quit Pi.

## Install this setup on another machine

Clone this repo into Pi's config folder:

```bash
rm -rf ~/.pi/agent
mkdir -p ~/.pi
git clone https://github.com/SamsonShuttle/pi-config ~/.pi/agent
```

Then start Pi:

```bash
pi
```

Inside Pi, run:

```text
/reload
```

## Login / auth

Auth is **not** stored in this repo. On a new laptop, run inside Pi:

```text
/login
```

For Codex quota display, also make sure the Codex CLI is logged in:

```bash
codex login
```

If quota becomes unavailable for a long time, Codex auth may be stale:

```bash
codex logout
codex login
```

## Theme

The active theme is selected in `settings.json`:

```json
{
  "theme": "my-theme"
}
```

Theme file:

```text
themes/my-theme.json
```

To edit colors, change values in `themes/my-theme.json`, then run:

```text
/reload
```

## Animated header and Codex quota

Header extension:

```text
extensions/custom-header.ts
```

Main tweak sections:

- `HEADER_STYLE` - global UI colors and base animation speed
- `SPACE_INVADER_ANIMATION` - stage timing for movement, shots, impacts, and final reveal
- `ALIEN_SPRITE` / `PI_BLOCK_SPRITE` / `PI_CODE_SPRITE` - terminal art strings
- `CODEX_QUOTA_REFRESH_MS` - quota refresh cooldown

Current quota behavior:

- no quota fetch on startup
- no background polling timer
- refreshes only after a submitted prompt
- refreshes only if at least 10 minutes passed since last refresh
- manual refresh command is available:

```text
/codex-quota-refresh
```

The arcade score line uses Codex quota percentages:

- `SCORE<π>` = 5-hour used percentage
- `HI-SCORE` = weekly used percentage

The endpoint currently exposes quota percentages/reset windows, not raw token counts.

To restore the built-in header in a Pi session:

```text
/builtin-header
```

## Code word highlighter

Extension:

```text
extensions/code-word-highlighter.ts
```

This adds extra highlighting on top of normal Pi syntax colors for `read` tool output:

- TS/JS/JSX/TSX React hooks like `useState`, `useCallback`, `useEffect` -> red
- JSON/YAML keys -> red
- Python `self` / `cls` -> red
- Python decorators -> warning/yellow
- HTML/XML tag names -> red

Note: this affects `read` tool output, not every assistant markdown code block.

## Git helper commands

Extension:

```text
extensions/pi-config-git.ts
```

Commands:

```text
/pi-config-status
/pi-config-push Add a useful commit message
```

`/pi-config-push` stages the curated config files only:

```text
themes extensions settings.json README.md .gitignore
```

## Useful Pi input tips

- `@file` - attach/read project files with fuzzy search
- `!command` - run shell and share output with the model
- `!!command` - run shell privately, output is not sent to the model
- `Shift+Enter` - multiline input
- `Tab` - path completion
- `Ctrl+G` - open prompt in `$VISUAL` / `$EDITOR`

Recommended VS Code external editor setup:

```bash
echo 'export VISUAL="code --wait"' >> ~/.zshrc
source ~/.zshrc
```

## Update this repo after changes

Manual git flow:

```bash
cd ~/.pi/agent
git status
git add themes extensions settings.json README.md .gitignore
git commit -m "Update pi config"
git push
```

Or use the Pi command:

```text
/pi-config-push Update pi config
```
