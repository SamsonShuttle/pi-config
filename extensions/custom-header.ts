import { execFileSync } from "node:child_process";
import type { ExtensionAPI, Theme, ThemeColor } from "@earendil-works/pi-coding-agent";
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
  animationMs: 500,
  artColors: ["accent", "borderAccent", "accent", "borderAccent", "accent", "borderAccent"] as ThemeColor[],
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
    const raw = execFileSync("python3", ["-c", script], { encoding: "utf8", timeout: 30000 });
    const data = JSON.parse(raw) as any;
    const primary = data?.rate_limit?.primary_window;
    const secondary = data?.rate_limit?.secondary_window;
    if (!primary || !secondary) return undefined;

    return {
      fiveHourLeft: Math.max(0, 100 - Math.round(primary.used_percent ?? 0)),
      weekLeft: Math.max(0, 100 - Math.round(secondary.used_percent ?? 0)),
      fiveHourResetMinutes: Math.max(0, Math.round((primary.reset_after_seconds ?? 0) / 60)),
      weekResetHours: Math.max(0, Math.round((secondary.reset_after_seconds ?? 0) / 3600)),
    };
  } catch {
    return undefined;
  }
}

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

    // Big math π symbol. Each frame is the same symbol with tiny pixel/sparkle changes.
    // const frames = [
    //   [
    //     "   ███████████████   ",
    //     "      ███     ███    ",
    //     "      ███     ███    ",
    //     "      ███     ███    ",
    //     "      ███     ███    ",
    //     "     ████     ████   ",
    //   ],
    //   [
    //     " ✦ ███████████████   ",
    //     "      ▓██     ██▓    ",
    //     "      ▓██     ██▓    ",
    //     "      ▓██     ██▓    ",
    //     "      ▓██     ██▓    ",
    //     "     ▓███     ███▓ ✦ ",
    //   ],
    //   [
    //     "   ▒█████████████▒   ",
    //     "      ███  ∙  ███    ",
    //     "      ███     ███    ",
    //     "      ███     ███    ",
    //     "   ∙  ███     ███    ",
    //     "     ████     ████   ",
    //   ],
    //   [
    //     "   ███████████████ ✧ ",
    //     "      ███     ███    ",
    //     "      ███     ███    ",
    //     "      ███  ∙  ███    ",
    //     "      ███     ███    ",
    //     " ✧  ████     ████    ",
    //   ],
    // ];

    const frames = [
      [
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "                         ",
        "                         ",
        "                         ",
        "            │            ",
        "            π            ",
      ],
      [
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "                         ",
        "            │            ",
        "            │            ",
        "            π            ",
      ],
      [
        "                         ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "            │            ",
        "            │            ",
        "            π            ",
      ],
      [
        "                         ",
        "                         ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "            │            ",
        "            π            ",
      ],
      [
        "                         ",
        "                         ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "            *            ",
        "            π            ",
      ],
      [
        "                         ",
        "                         ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "           ***           ",
        "            π            ",
      ],
      [
        "                         ",
        "                         ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "          * * *          ",
        "            π            ",
      ],
      [
        "                         ",
        "                         ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "          BOOM           ",
        "                         ",
        "            π            ",
      ],
      [
        "                         ",
        "                         ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "                         ",
        "  ▄█▄             ▄█▄  ",
        "  ███             ███  ",
        "  ▀ ▀             ▀ ▀  ",
        "            │            ",
        "            π            ",
      ],
      [
        "                         ",
        "                         ",
        "                         ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "                         ",
        "  ▄█▄             ▄█▄  ",
        "  ███             ███  ",
        "            │            ",
        "            π            ",
      ],
      [
        "                         ",
        "                         ",
        "                         ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "                         ",
        "  ▄█▄             ▄█▄  ",
        "          BOOM           ",
        "                         ",
        "            π            ",
      ],
      [
        "                         ",
        "                         ",
        "                         ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "                         ",
        "                         ",
        "                         ",
        "            │            ",
        "            π            ",
      ],
      [
        "                         ",
        "                         ",
        "                         ",
        "                         ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "                         ",
        "            │            ",
        "            │            ",
        "            π            ",
      ],
      [
        "                         ",
        "                         ",
        "                         ",
        "                         ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "            │            ",
        "            │            ",
        "            │            ",
        "            π            ",
      ],
      [
        "                         ",
        "                         ",
        "                         ",
        "                         ",
        "                         ",
        "  ▄█▄     ▄█▄     ▄█▄  ",
        "  ███     ███     ███  ",
        "  ▀ ▀     ▀ ▀     ▀ ▀  ",
        "            *            ",
        "           ***           ",
        "            *            ",
        "            π            ",
      ],
      [
        "                         ",
        "                         ",
        "                         ",
        "                         ",
        "                         ",
        "  ▄█▄             ▄█▄  ",
        "  ███    BOOM     ███  ",
        "  ▀ ▀             ▀ ▀  ",
        "                         ",
        "                         ",
        "                         ",
        "            π            ",
      ],
    ];

    const sparkleFrames = ["π", "∏", "π", "⋆", "π", "✦"];
    const spark = sparkleFrames[this.frame % sparkleFrames.length];
    const logo = frames[this.frame % frames.length];
    const colors = HEADER_STYLE.artColors;
    const quota = this.getQuota();

    return [
      "",
      ...logo.map((line, i) => center(bold(color(colors[i % colors.length]!, line)), width)),
      "",
      center(
        `${color(HEADER_STYLE.sparkleColor, spark)} ${bold(color(HEADER_STYLE.titleColor, "SAMSON π"))} ${color(HEADER_STYLE.versionColor, `v${VERSION}`)} ${color(HEADER_STYLE.sparkleColor, spark)}`,
        width,
      ),
      center(
        `${color(HEADER_STYLE.leftDotColor, "●")} ${color(HEADER_STYLE.subtitleColor, "custom coding terminal")} ${color(HEADER_STYLE.rightDotColor, "●")} ${color(HEADER_STYLE.subtitleColor, "atom one dark black")}`,
        width,
      ),
      center(quota ? formatCodexQuota(quota, this.theme) : color(HEADER_STYLE.versionColor, "Codex quota loading/unavailable"), width),
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
        ctx.ui.setStatus("codex-quota", ctx.ui.theme.fg("dim", "Codex quota unavailable"));
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
