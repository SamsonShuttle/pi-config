import type { ExtensionAPI, Theme, ThemeColor } from "@earendil-works/pi-coding-agent";
import { VERSION } from "@earendil-works/pi-coding-agent";

type TuiHandle = { requestRender: () => void };

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
};

function visibleLength(line: string): number {
  return line.replace(/\x1b\[[0-9;]*m/g, "").length;
}

function center(line: string, width: number): string {
  const pad = Math.max(0, Math.floor((width - visibleLength(line)) / 2));
  return " ".repeat(pad) + line;
}

class AnimatedPiHeader {
  private frame = 0;
  private timer: ReturnType<typeof setInterval>;

  constructor(
    private tui: TuiHandle,
    private theme: Theme,
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
        "               ██               ",
        "              ████              ",
        "             ██████             ",
        "            ████████            ",
        "           ██████████           ",
        "          ████████████          ",
        "          ████████████          ",
        "          ████████████          ",
        "         ██████████████         ",
        "        ████ ██████ ████        ",
        "       ███   ██████   ███       ",
        "             ██████             ",
        "             ██████             ",
        "            π  PI  π            ",
        "           π π PI π π           ",
      ],
      [
        "               ██               ",
        "              ████              ",
        "             ██████             ",
        "            ████████            ",
        "           ██████████           ",
        "          ████████████          ",
        "          ████████████          ",
        "          ████████████          ",
        "         ██████████████         ",
        "        ████ ██████ ████        ",
        "       ███   ██████   ███       ",
        "             ██████             ",
        "            ████████            ",
        "           π  PI PI  π          ",
        "          π π π PI π π π        ",
      ],
      [
        "               ██               ",
        "              ████              ",
        "             ██████             ",
        "            ████████            ",
        "           ██████████           ",
        "          ████████████          ",
        "          ████████████          ",
        "          ████████████          ",
        "         ██████████████         ",
        "        ████ ██████ ████        ",
        "       ███   ██████   ███       ",
        "             ██████             ",
        "           ██████████           ",
        "          π PI π PI π           ",
        "         π π PI PI π π          ",
      ],
      [
        "               ██               ",
        "              ████              ",
        "             ██████             ",
        "            ████████            ",
        "           ██████████           ",
        "          ████████████          ",
        "          ████████████          ",
        "          ████████████          ",
        "         ██████████████         ",
        "        ████ ██████ ████        ",
        "       ███   ██████   ███       ",
        "             ██████             ",
        "          ████████████          ",
        "         π PI π PI PI π         ",
        "        π π PI π PI π π         ",
      ],
    ];

    const sparkleFrames = ["π", "∏", "π", "⋆", "π", "✦"];
    const spark = sparkleFrames[this.frame % sparkleFrames.length];
    const logo = frames[this.frame % frames.length];
    const colors = HEADER_STYLE.artColors;

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

  dispose() {
    clearInterval(this.timer);
  }
}

export default function customHeader(pi: ExtensionAPI) {
  let activeHeader: AnimatedPiHeader | undefined;

  pi.on("session_start", async (_event, ctx) => {
    if (!ctx.hasUI) return;

    ctx.ui.setHeader((tui, theme) => {
      activeHeader?.dispose();
      activeHeader = new AnimatedPiHeader(tui, theme);
      return activeHeader;
    });
  });

  pi.on("session_shutdown", async () => {
    activeHeader?.dispose();
    activeHeader = undefined;
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
