import { execFileSync } from "node:child_process";
import type {
  ExtensionAPI,
  Theme,
  ThemeColor,
} from "@earendil-works/pi-coding-agent";
import { VERSION } from "@earendil-works/pi-coding-agent";

type TuiHandle = { requestRender: () => void };

type CodexQuota = {
  fiveHourLeft: number;
  weekLeft: number;
  fiveHourResetMinutes: number;
  weekResetHours: number;
};

// Change these once to recolor the whole header.
// These values point at colors in ~/.pi/agent/themes/my-theme.json.
//
// Header color mapping:
// - animationMs: animation speed. Lower = faster, higher = slower.
// - artColors: rocket/body pixel colors, cycles by line.
// - sparkleColor: animated π/∏/⋆/✦ symbols around the title.
// - titleColor: "SAMSON π" title text.
// - versionColor: small pi version text.
// - leftDotColor: left status dot before subtitle.
// - rightDotColor: right status dot before theme name.
// - subtitleColor: "custom coding terminal" and "atom one dark black".
// - helpColor: old/general help color.
// - tipKeyColor: highlighted command keys in the power tips.
// - tipTextColor: descriptions in the power tips.
// - quotaLabelColor: Codex quota labels.
// - quotaValueColor: Codex quota percentage/time values.
//
// Valid theme tokens include: accent, borderAccent, success, error,
// warning, muted, dim, text, toolTitle, mdHeading, syntaxKeyword, etc.
const HEADER_STYLE = {
  animationMs: 160,
  artColors: [
    "accent",
    "borderAccent",
    "accent",
    "borderAccent",
    "accent",
    "borderAccent",
  ] as ThemeColor[],
  sparkleColor: "warning" as ThemeColor,
  titleColor: "accent" as ThemeColor,
  versionColor: "dim" as ThemeColor,
  leftDotColor: "error" as ThemeColor,
  rightDotColor: "success" as ThemeColor,
  subtitleColor: "muted" as ThemeColor,
  helpColor: "dim" as ThemeColor,
  tipKeyColor: "warning" as ThemeColor,
  tipTextColor: "muted" as ThemeColor,
  quotaLabelColor: "warning" as ThemeColor,
  quotaValueColor: "success" as ThemeColor,
};

function visibleLength(line: string): number {
  return line.replace(/\x1b\[[0-9;]*m/g, "").length;
}

function center(line: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - visibleLength(line)) / 2));
  return " ".repeat(pad) + line;
}

function formatCodexQuota(quota: CodexQuota, theme: Theme): string {
  const label = (s: string) => theme.fg(HEADER_STYLE.quotaLabelColor, s);
  const value = (s: string) => theme.fg(HEADER_STYLE.quotaValueColor, s);
  const dim = (s: string) => theme.fg("dim", s);
  return `${label("Codex")} 5h ${value(`${quota.fiveHourLeft}% left`)} ${dim(`reset ${quota.fiveHourResetMinutes}m`)} • week ${value(`${quota.weekLeft}% left`)} ${dim(`reset ${quota.weekResetHours}h`)}`;
}

async function fetchCodexQuota(): Promise<CodexQuota | undefined> {
  try {
    // Node fetch gets blocked by ChatGPT's edge protection here. Python urllib works,
    // and this is still local-only UI data: it does not enter model context.
    const script = String.raw`
import json, pathlib, urllib.request
p = pathlib.Path.home() / ".codex" / "auth.json"
auth = json.loads(p.read_text())
token = auth.get("tokens", {}).get("access_token")
if not token:
    raise SystemExit("missing token")
req = urllib.request.Request(
    "https://chatgpt.com/backend-api/codex/usage",
    headers={
        "Authorization": "Bearer " + token,
        "Accept": "application/json",
        "User-Agent": "codex-cli/0.136.0",
    },
)
with urllib.request.urlopen(req, timeout=20) as r:
    print(r.read().decode("utf-8"))
`;
    const raw = execFileSync("python3", ["-c", script], {
      encoding: "utf8",
      timeout: 30000,
    });
    const data = JSON.parse(raw) as any;
    const primary = data?.rate_limit?.primary_window;
    const secondary = data?.rate_limit?.secondary_window;
    if (!primary || !secondary) return undefined;

    return {
      fiveHourLeft: Math.max(0, 100 - Math.round(primary.used_percent ?? 0)),
      weekLeft: Math.max(0, 100 - Math.round(secondary.used_percent ?? 0)),
      fiveHourResetMinutes: Math.max(
        0,
        Math.round((primary.reset_after_seconds ?? 0) / 60),
      ),
      weekResetHours: Math.max(
        0,
        Math.round((secondary.reset_after_seconds ?? 0) / 3600),
      ),
    };
  } catch {
    return undefined;
  }
}


type HeaderFrame = string[];

const INVADER_WIDTH = 12;
const INVADER_HEIGHT = 4;
const HEADER_FRAME_WIDTH = 62;
const HEADER_FRAME_HEIGHT = 10;
const CANNON_Y = 8;
const CANNON_START_X = 30;
const ALIEN_BASE_X = [4, 23, 42] as const;
const ALIEN_SWAY = [0, 1, 2, 3, 4, 5, 4, 3, 2, 1, 0, -1, -2, -3, -4, -5, -4, -3, -2, -1] as const;

const ALIEN_SPRITE = [
  "  ███████.  ",
  "  █ ███ █   ",
  "███████████.",
  "  █ █ █ █   ",
] as const;

const PI_BLOCK_SPRITE = [
  "    ππππ    ",
  "  ππ π ππ   ",
  "πππππππππππ.",
  "  π π π π   ",
] as const;

const PI_CODE_SPRITE = [
  "███████. ██.     ███████. ███████. █████.   ███████.",
  "██.  ██. ██.     ██.      ██.  ██  ██.  ██  ██      ",
  "███████. ██.     ██.      ██.  ██  ██.  ██. ███████.",
  "██.      ██.     ██.      ██.  ██  ██.  ██. ██      ",
  "██.      ██.     ███████. ███████  █████.   ███████.",
] as const;

function alienShift(step: number): number {
  return ALIEN_SWAY[((step % ALIEN_SWAY.length) + ALIEN_SWAY.length) % ALIEN_SWAY.length]!;
}

function drawHeaderText(grid: string[][], x: number, y: number, text: string) {
  if (y < 0 || y >= HEADER_FRAME_HEIGHT) return;
  for (let i = 0; i < text.length; i++) {
    const xx = x + i;
    if (xx >= 0 && xx < HEADER_FRAME_WIDTH && text[i] !== " ") {
      grid[y]![xx] = text[i]!;
    }
  }
}

function drawHeaderSprite(grid: string[][], x: number, y: number, sprite: readonly string[]) {
  for (let row = 0; row < sprite.length; row++) {
    drawHeaderText(grid, x, y + row, sprite[row]!);
  }
}

function getPiCodeCells() {
  const spriteWidth = Math.max(...PI_CODE_SPRITE.map((line) => line.length));
  const startX = Math.floor((HEADER_FRAME_WIDTH - spriteWidth) / 2);
  const startY = 2;
  const centerX = startX + Math.floor(spriteWidth / 2);
  const centerY = startY + Math.floor(PI_CODE_SPRITE.length / 2);
  const cells: { x: number; y: number; char: string; rank: number }[] = [];

  for (let y = 0; y < PI_CODE_SPRITE.length; y++) {
    const line = PI_CODE_SPRITE[y]!;
    for (let x = 0; x < line.length; x++) {
      const char = line[x]!;
      if (char === " ") continue;
      const gx = startX + x;
      const gy = startY + y;
      const dx = gx - centerX;
      const dy = gy - centerY;
      const radius = Math.max(Math.abs(dx), Math.abs(dy));
      const angle = Math.atan2(dy, dx);
      // Radius first, angle second gives a center-out spiral-ish reveal.
      const rank = radius * 1000 + ((angle + Math.PI * 2.5) % (Math.PI * 2)) * 100;
      cells.push({ x: gx, y: gy, char, rank });
    }
  }

  return cells.sort((a, b) => a.rank - b.rank);
}

const PI_CODE_CELLS = getPiCodeCells();

function drawPiCodeReveal(grid: string[][], revealCount: number) {
  for (const cell of PI_CODE_CELLS.slice(0, revealCount)) {
    drawHeaderText(grid, cell.x, cell.y, cell.char);
  }
}

function makeSpaceInvaderFrame(
  step: number,
  alive: readonly boolean[],
  cannonX: number,
  options: { bulletY?: number; explodeIndex?: number; piBlock?: boolean; piCodeReveal?: number } = {},
): HeaderFrame {
  const grid = Array.from({ length: HEADER_FRAME_HEIGHT }, () =>
    Array.from({ length: HEADER_FRAME_WIDTH }, () => " "),
  );
  const shift = alienShift(step);

  if (options.piCodeReveal !== undefined) {
    drawPiCodeReveal(grid, options.piCodeReveal);
  } else if (options.piBlock) {
    drawHeaderSprite(
      grid,
      Math.floor((HEADER_FRAME_WIDTH - INVADER_WIDTH) / 2),
      0,
      PI_BLOCK_SPRITE,
    );
  } else {
    for (let index = 0; index < ALIEN_BASE_X.length; index++) {
      const x = ALIEN_BASE_X[index]! + shift;
      if (options.explodeIndex === index) {
        drawHeaderSprite(grid, x, 0, PI_BLOCK_SPRITE);
      } else if (alive[index]) {
        drawHeaderSprite(grid, x, 0, ALIEN_SPRITE);
      }
    }
  }

  if (options.bulletY !== undefined) {
    drawHeaderText(grid, cannonX, options.bulletY, "|");
  }

  if (options.piCodeReveal === undefined) {
    drawHeaderText(grid, cannonX, CANNON_Y, "π");
  }
  return grid.map((row) => row.join(""));
}

function targetCenter(step: number, targetIndex: number): number {
  return ALIEN_BASE_X[targetIndex]! + alienShift(step) + Math.floor(INVADER_WIDTH / 2);
}

function buildSpaceInvaderFrames(): HeaderFrame[] {
  const frames: HeaderFrame[] = [];
  let step = 0;
  let cannonX = CANNON_START_X;
  const alive = [true, true, true];

  const add = (options: { bulletY?: number; explodeIndex?: number; piBlock?: boolean; piCodeReveal?: number } = {}) => {
    frames.push(makeSpaceInvaderFrame(step, alive, cannonX, options));
    step++;
  };

  add();

  for (const target of [0, 2, 1]) {
    // Move π one space per frame until it sits under the current target.
    for (let guard = 0; guard < 90 && cannonX !== targetCenter(step, target); guard++) {
      cannonX += Math.sign(targetCenter(step, target) - cannonX);
      add();
    }

    // Fire upward one row per frame.
    for (let y = CANNON_Y - 1; y >= INVADER_HEIGHT - 1; y--) {
      add({ bulletY: y });
    }

    // Impact: the target briefly turns into a π-sized block, then disappears.
    add({ explodeIndex: target });
    add({ explodeIndex: target });
    alive[target] = false;
    add();
  }

  // Victory: after the middle invader is destroyed, reveal the PI CODE wordmark
  // from the center outward in a spiral-ish order.
  cannonX = CANNON_START_X;
  for (let reveal = 0; reveal <= PI_CODE_CELLS.length; reveal += 8) {
    add({ piCodeReveal: reveal });
  }
  add({ piCodeReveal: PI_CODE_CELLS.length });
  add({ piCodeReveal: PI_CODE_CELLS.length });

  // Make the loop seamless: the final frame is identical to frame 0.
  frames.push(makeSpaceInvaderFrame(0, [true, true, true], CANNON_START_X));
  return frames;
}

const SPACE_INVADER_FRAMES = buildSpaceInvaderFrames();

class AnimatedPiHeader {
  private frame = 0;
  private timer: ReturnType<typeof setInterval>;

  constructor(
    private tui: TuiHandle,
    private theme: Theme,
    private getQuota: () => CodexQuota | undefined,
  ) {
    this.timer = setInterval(() => {
      this.frame++;
      this.tui.requestRender();
    }, HEADER_STYLE.animationMs);
  }

  render(width: number): string[] {
    const color = (token: ThemeColor, s: string) => this.theme.fg(token, s);
    const bold = (s: string) => this.theme.bold(s);
    const colorInvaderLine = (line: string) => {
      let out = line;
      out = out.replace(/BOOM/g, color("error", "BOOM"));
      out = out.replace(/[│|*]+/g, (m) => color("warning", m));
      out = out.replace(/π/g, color("accent", "π"));
      out = out.replace(/[▄█▀]+/g, (m) => color("success", m));
      return out;
    };

    const sparkleFrames = ["π", "∏", "π", "⋆", "π", "✦"];
    const spark = sparkleFrames[this.frame % sparkleFrames.length];
    const logo = SPACE_INVADER_FRAMES[this.frame % SPACE_INVADER_FRAMES.length]!;
    const quota = this.getQuota();

    return [
      "",
      center(
        `${color("success", "SCORE<π>")} ${color("text", "0001978")}   ${color("warning", "HI-SCORE")} ${color("text", "0031415")}   ${color("success", "LIVES")} ${color("accent", "πππ")}`,
        width,
      ),
      center(
        bold(color("accent", "PI INVADERS")) + color("dim", `  v${VERSION}`),
        width,
      ),
      "",
      ...logo.map((line) => center(bold(colorInvaderLine(line)), width)),
      "",
      center(
        `${color(HEADER_STYLE.sparkleColor, spark)} ${bold(color(HEADER_STYLE.titleColor, "SAMSON π DEFENSE"))} ${color(HEADER_STYLE.sparkleColor, spark)}`,
        width,
      ),
      center(
        `${color(HEADER_STYLE.leftDotColor, "●")} ${color(HEADER_STYLE.subtitleColor, "custom coding terminal")} ${color(HEADER_STYLE.rightDotColor, "●")} ${color(HEADER_STYLE.subtitleColor, "atom one dark black")}`,
        width,
      ),
      center(
        quota
          ? formatCodexQuota(quota, this.theme)
          : color(HEADER_STYLE.versionColor, "Codex quota loading/unavailable"),
        width,
      ),
      center(
        `${color(HEADER_STYLE.tipKeyColor, "@file")} ${color(HEADER_STYLE.tipTextColor, "attach/read files")}  ${color(HEADER_STYLE.tipKeyColor, "!cmd")} ${color(HEADER_STYLE.tipTextColor, "run shell + share output")}  ${color(HEADER_STYLE.tipKeyColor, "!!cmd")} ${color(HEADER_STYLE.tipTextColor, "run shell private")}`,
        width,
      ),
      center(
        `${color(HEADER_STYLE.tipKeyColor, "Shift+Enter")} ${color(HEADER_STYLE.tipTextColor, "multiline")}  ${color(HEADER_STYLE.tipKeyColor, "Tab")} ${color(HEADER_STYLE.tipTextColor, "path complete")}  ${color(HEADER_STYLE.tipKeyColor, "Ctrl+G")} ${color(HEADER_STYLE.tipTextColor, "external editor")}`,
        width,
      ),
      "",
    ];
  }

  invalidate() {}

  requestRender() {
    this.tui.requestRender();
  }

  dispose() {
    clearInterval(this.timer);
  }
}

export default function customHeader(pi: ExtensionAPI) {
  let activeHeader: AnimatedPiHeader | undefined;
  let quota: CodexQuota | undefined;
  let quotaTimer: ReturnType<typeof setInterval> | undefined;

  pi.on("session_start", async (_event, ctx) => {
    if (!ctx.hasUI) return;

    const updateQuota = async () => {
      quota = await fetchCodexQuota();
      if (quota) {
        ctx.ui.setStatus("codex-quota", formatCodexQuota(quota, ctx.ui.theme));
      } else {
        ctx.ui.setStatus(
          "codex-quota",
          ctx.ui.theme.fg("dim", "Codex quota unavailable"),
        );
      }
      activeHeader?.invalidate();
      activeHeader?.requestRender();
    };

    ctx.ui.setHeader((tui, theme) => {
      activeHeader?.dispose();
      activeHeader = new AnimatedPiHeader(tui, theme, () => quota);
      return activeHeader;
    });

    await updateQuota();
    quotaTimer = setInterval(updateQuota, 5 * 60 * 1000);
  });

  pi.on("session_shutdown", async () => {
    activeHeader?.dispose();
    activeHeader = undefined;
    if (quotaTimer) clearInterval(quotaTimer);
    quotaTimer = undefined;
    quota = undefined;
  });

  pi.registerCommand("builtin-header", {
    description: "Restore built-in pi header",
    handler: async (_args, ctx) => {
      activeHeader?.dispose();
      activeHeader = undefined;
      ctx.ui.setHeader(undefined);
      ctx.ui.notify("Restored built-in header", "info");
    },
  });
}
