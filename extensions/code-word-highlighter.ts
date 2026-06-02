// @ts-nocheck
/* eslint-disable */
/* prettier-ignore */
/**
 * Code Word Highlighter for pi
 *
 * Adds extra word-based coloring on top of pi's normal syntax highlighting.
 *
 * Important:
 * - This affects code shown by the built-in `read` tool.
 * - It does NOT currently recolor every assistant markdown code block.
 * - Put this file in ~/.pi/agent/extensions/ and run /reload.
 */

import type { ExtensionAPI, ReadToolDetails, Theme } from "@earendil-works/pi-coding-agent";
import {
  createReadTool,
  getLanguageFromPath,
  highlightCode,
} from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

const REACT_HOOKS =
  /\b(useState|useEffect|useCallback|useMemo|useRef|useReducer|useContext|useLayoutEffect|useImperativeHandle|useTransition|useDeferredValue|useId|useSyncExternalStore|useInsertionEffect)\b/g;
const PY_SPECIAL = /\b(self|cls)\b/g;
const PY_DECORATOR = /(@[A-Za-z_][A-Za-z0-9_.]*)/g;
const JSON_KEY = /("(?:\\.|[^"\\])+?")(?=\s*:)/g;
const YAML_KEY = /^(\s*)([A-Za-z_][A-Za-z0-9_-]*)(?=\s*:)/g;
const HTML_TAG = /(<\/?)([A-Za-z][A-Za-z0-9:-]*)(\b)/g;

type ReadArgs = {
  path: string;
  offset?: number;
  limit?: number;
};

function extraHighlight(
  line: string,
  lang: string | undefined,
  theme: Theme,
): string {
  switch (lang) {
    case "typescript":
    case "javascript":
      return line.replace(REACT_HOOKS, (match) => theme.fg("error", match));

    case "json":
      return line.replace(JSON_KEY, (match) => theme.fg("error", match));

    case "python":
      return line
        .replace(PY_DECORATOR, (match) => theme.fg("warning", match))
        .replace(PY_SPECIAL, (match) => theme.fg("error", match));

    case "html":
    case "xml":
      return line.replace(
        HTML_TAG,
        (_match, prefix: string, tag: string, suffix: string) => {
          return `${prefix}${theme.fg("error", tag)}${suffix}`;
        },
      );

    case "yaml":
      return line.replace(YAML_KEY, (_match, indent: string, key: string) => {
        return `${indent}${theme.fg("error", key)}`;
      });

    default:
      return line;
  }
}

function renderHighlightedCode(
  code: string,
  lang: string | undefined,
  theme: Theme,
): string[] {
  return highlightCode(code, lang).map((line) =>
    extraHighlight(line, lang, theme),
  );
}

export default function codeWordHighlighter(pi: ExtensionAPI) {
  const originalRead = createReadTool(process.cwd());

  // The read result details do not include the path, so remember the last read language.
  // Keep it stable across re-renders/expand toggles.
  let currentLanguage: string | undefined;

  pi.registerTool({
    name: "read",
    label: "read",
    description: originalRead.description,
    parameters: originalRead.parameters,

    async execute(toolCallId, params, signal, onUpdate) {
      return originalRead.execute(toolCallId, params, signal, onUpdate);
    },

    renderCall(args: ReadArgs, theme: Theme) {
      currentLanguage = getLanguageFromPath(args.path);

      let text =
        theme.fg("toolTitle", theme.bold("read ")) +
        theme.fg("accent", args.path);
      const parts: string[] = [];
      if (args.offset) parts.push(`offset=${args.offset}`);
      if (args.limit) parts.push(`limit=${args.limit}`);
      if (parts.length > 0) text += theme.fg("dim", ` (${parts.join(", ")})`);

      return new Text(text, 0, 0);
    },

    renderResult(result, { expanded, isPartial }, theme: Theme) {
      if (isPartial) return new Text(theme.fg("warning", "Reading..."), 0, 0);

      const content = result.content[0];
      if (content?.type === "image")
        return new Text(theme.fg("success", "Image loaded"), 0, 0);
      if (content?.type !== "text")
        return new Text(theme.fg("error", "No text content"), 0, 0);

      const details = result.details as ReadToolDetails | undefined;
      const lang = currentLanguage;
      const lines = renderHighlightedCode(content.text, lang, theme);
      const lineCount = lines.length;

      let text = theme.fg("success", `${lineCount} lines`);
      if (lang) text += theme.fg("dim", ` (${lang})`);
      if (details?.truncation?.truncated) {
        text += theme.fg(
          "warning",
          ` truncated from ${details.truncation.totalLines}`,
        );
      }

      if (!expanded) return new Text(text, 0, 0);

      const lineNumberWidth = String(lineCount).length;
      const previewLines = lines.slice(0, 60);
      for (let index = 0; index < previewLines.length; index++) {
        const lineNo = String(index + 1).padStart(lineNumberWidth, " ");
        text += `\n${theme.fg("dim", lineNo)} ${previewLines[index]}`;
      }
      if (lineCount > previewLines.length) {
        text += `\n${theme.fg("muted", `... ${lineCount - previewLines.length} more lines`)}`;
      }

      return new Text(text, 0, 0);
    },
  });
}
