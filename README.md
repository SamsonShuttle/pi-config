# Samson Pi Setup

Personal Pi coding-agent configuration: theme, animated header, and custom syntax/read rendering.

## What this repo tracks

- `themes/my-theme.json` - Atom One Dark / black VS Code-style Pi theme
- `extensions/custom-header.ts` - animated terminal startup header
- `extensions/code-word-highlighter.ts` - extra code coloring for `read` output
- `settings.json` - selected theme/model defaults

This repo intentionally ignores:

- `auth.json` - credentials / tokens
- `sessions/` - conversation history
- `bin/` - Pi-managed helper binaries

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
git clone <YOUR_GITHUB_REPO_URL> ~/.pi/agent
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

Auth is **not** stored in this repo. On a new laptop, run:

```text
/login
```

or set provider API keys in your shell, for example:

```bash
export ANTHROPIC_API_KEY="..."
```

## Theme

The active theme is:

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

## Animated header

Header extension:

```text
extensions/custom-header.ts
```

At the top of that file, edit `HEADER_STYLE` to change animation speed and which theme colors are used:

```ts
const HEADER_STYLE = {
  animationMs: 500,
  artColors: ["accent", "borderAccent"],
  sparkleColor: "warning",
  titleColor: "accent",
  versionColor: "dim",
  leftDotColor: "error",
  rightDotColor: "success",
  subtitleColor: "muted",
  helpColor: "dim",
  tipKeyColor: "warning",
  tipTextColor: "muted",
};
```

Reload after edits:

```text
/reload
```

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

```bash
cd ~/.pi/agent
git status
git add themes extensions settings.json README.md .gitignore
git commit -m "Update pi config"
git push
```
