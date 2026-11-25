/**
 * Fail when a diagnostic message does not say how to fix the problem.
 *
 * A message that only names the violation makes the reader search for the rule. An agent that
 * hits one either guesses or suppresses the rule to get green. A message that names the remedy
 * lets the reader fix it in one turn, which is the whole point of running the check.
 *
 * Good: "writes contact notes but never calls sanitizeNotesHtml(). Sanitize before every write."
 * Good: "Missing docs page at docs/api/errors/validation_error.mdx"
 * Bad:  "missing frontmatter"
 * Bad:  "is not a regular file."
 *
 * The remedy signal is one of: an inline-code token, a repository path or a filename with a
 * known extension, a shell command, a SCREAMING_CASE identifier, or an imperative verb.
 *
 * Two things are removed before the judgement. The string delimiters of the JavaScript literal,
 * because they are syntax and not text. And every `${...}` interpolation, because a value
 * inserted at run time cannot carry a remedy the author wrote.
 *
 * A message passed as an identifier, such as `check.add(message)`, cannot be read here. Those
 * sites still need a remedy; this check cannot see them.
 *
 * When the literal part of a message holds nothing but values, and the remedy is built in the
 * value, mark the line `diagnostic-message: remedy-in-value` with a note naming where. The marker
 * is a claim about code this check cannot read, so a reviewer has to accept it.
 *
 * Usage: node scripts/check/check-diagnostic-messages.mjs
 *        (pnpm run check:diagnostic-messages)
 */

import { readdirSync, readFileSync } from "node:fs";
import { dirname, join, relative, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createCheck } from "./check-report.mjs";

const PATTERN_5E5B2227605D_RE = /^["'`]/u;
const ZA_RE = /^[a-zA-Z_$][\w$]*\s*\+/u;
const MJS_GRIT_RE = /\.(?:mjs|grit)$/u;

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "../..");

/** Directories that hold diagnostics: the check scripts and the Biome plugins. */
const SCANNED_DIRS = ["scripts/check", "biome/plugins"];

/** This file describes bad messages, so it cannot satisfy its own rule. */
const SELF_PATH = "check-diagnostic-messages.mjs";

/**
 * The opt-out for a message whose remedy is built in an interpolated value. The note after the
 * colon names where the remedy lives, so a reviewer can check the claim.
 */
const REMEDY_IN_VALUE = /diagnostic-message:\s*remedy-in-value\s+(?<group1>\S.*)/u;

/**
 * An imperative verb at the start of the message or of any clause. The clause anchor keeps a noun
 * such as "Update" mid-sentence from counting by accident.
 */
const REMEDY_VERB = new RegExp(
  `(?:^|[.!?]\\s+|,\\s+so\\s+|;\\s+)(${
    "use|add|move|run|pass|replace|wrap|keep|put|open|set|name|import|export|call|read|write|" +
    "regenerate|sanitize|load|delete|remove|rename|update|extract|split|reuse|return|await|" +
    "validate|translate|merge|apply|choose|select|store|send|copy|follow|install|restore|fix|" +
    "prefer|declare|cap|limit|check|switch|document|make|give|point|match|align|revert|commit|" +
    "stage|raise|tighten|correct|shorten|extend|include|omit|say|drop|strip|escape|encode|" +
    "decode|sort|filter|join|fill"
  })\\b`,
  "iu",
);

/** A modal that states the required end state, which is a remedy phrased as a constraint. */
const REMEDY_MODAL = /\b(?:must|expected|is required|are required|has to|have to)\b/iu;

/** An inline-code token: the identifier, path, or command the reader should use. */
const INLINE_CODE = /`[^`\n]+`/u;

/** A repository path, or a filename with an extension a reader can open. */
const REPO_PATH =
  /(?:^|[\s(:])(?:apps|packages|docs|scripts|biome|deploy|llm-plugins|\.agents)\/|\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs|json|jsonc|mdx|md|yaml|yml|prisma|sql|sh|grit|css|html)\b/u;

/** A command the reader can run. */
const COMMAND = /\b(?:pnpm|node|git|docker|turbo)\s+[\w:.-]/u;

/** A module constant, such as DEV_URLS or UPLOAD_LIMITS, which names the place to change. */
const CONSTANT = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+\b/u;

/** A camelCase symbol, such as allowedDevOrigins, which names the place to change. */
const CAMEL_SYMBOL = /\b[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*\b/u;

/** A function or method call, such as sanitizeNotesHtml(), which names what to call. */
const SYMBOL_CALL = /\b[A-Za-z_$][\w$.]*\(\)/u;

/**
 * Calls whose first argument is a diagnostic message shown to a reader.
 *
 * `fail(` covers scripts that report through `console.error` and `exit` instead of `createCheck`.
 */
const CALLEES = ["check.add(", "fail("];

/**
 * True when the argument is a literal message. A bare identifier or a call result is skipped,
 * because its text is not in this file.
 *
 * @param {string} argument
 */
function isLiteralMessage(argument) {
  return PATTERN_5E5B2227605D_RE.test(argument) || ZA_RE.test(argument);
}

function repoPath(filePath) {
  return relative(repoRoot, filePath).split(sep).join("/");
}

function main() {
  const check = createCheck("check-diagnostic-messages");
  let scanned = 0;
  let judged = 0;
  let declared = 0;

  for (const dir of SCANNED_DIRS) {
    for (const entry of readdirSync(join(repoRoot, dir))) {
      if (!MJS_GRIT_RE.test(entry) || entry.includes(SELF_PATH) || entry.endsWith(".test.mjs")) {
        continue;
      }
      scanned += 1;
      const filePath = join(repoRoot, dir, entry);
      const source = readFileSync(filePath, "utf8");
      const lines = source.split("\n");
      for (const { line, text } of findMessages(source, filePath)) {
        if (isRemedyInValue(lines, line)) {
          declared += 1;
          continue;
        }
        judged += 1;
        if (!hasRemedy(text)) {
          const preview = text.length > 100 ? `${text.slice(0, 100)}…` : text;
          check.add(
            `${repoPath(filePath)}:${line}: diagnostic does not say how to fix it: "${preview}"
      Name the function, file, command, or value the reader should change. Put an identifier or path in backticks so it reads as code. If the remedy is built in an interpolated value, mark the line with a note naming where.`,
          );
        }
      }
    }
  }

  const suffix = declared > 0 ? `, ${declared} declared remedy-in-value` : "";
  check.ok(`${judged} diagnostic messages judged in ${scanned} files${suffix}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}

/**
 * True when the message tells the reader what to do.
 *
 * @param {string} message literal text, with interpolations removed
 * @returns {boolean}
 */
export function hasRemedy(message) {
  return (
    INLINE_CODE.test(message) ||
    REPO_PATH.test(message) ||
    COMMAND.test(message) ||
    CONSTANT.test(message) ||
    CAMEL_SYMBOL.test(message) ||
    SYMBOL_CALL.test(message) ||
    REMEDY_VERB.test(message) ||
    REMEDY_MODAL.test(message)
  );
}

/**
 * The text a message shows, with syntax and interpolations removed.
 *
 * Reads only the inside of each quoted segment, so the delimiters of the JavaScript literal do
 * not count as inline code. Escapes stay literal. A `${...}` expression becomes one placeholder
 * character, so `a${x}b` still reads as one contiguous sentence.
 *
 * @param {string} argument first-argument source text
 * @returns {string} display text
 */
export function literalText(argument) {
  let result = "";
  let index = 0;
  while (index < argument.length) {
    const quote = argument[index];
    if (quote !== '"' && quote !== "'" && quote !== "`") {
      index += 1;
      continue;
    }
    index += 1;
    let depth = 0;
    while (index < argument.length) {
      const char = argument[index];
      if (char === "\\") {
        const next = argument[index + 1] ?? "";
        if (depth === 0) {
          result += next;
        }
        index += 2;
        continue;
      }
      if (depth === 0 && char === quote) {
        index += 1;
        break;
      }
      if (quote === "`" && char === "$" && argument[index + 1] === "{") {
        depth += 1;
        index += 2;
        continue;
      }
      if (depth > 0) {
        if (char === "{") {
          depth += 1;
        } else if (char === "}") {
          depth -= 1;
          if (depth === 0) {
            result += "\u0000";
          }
        }
        index += 1;
        continue;
      }
      result += char;
      index += 1;
    }
  }
  return result;
}

/**
 * The first-argument text of every `callee` call in a source file.
 *
 * Balanced scanning, not a regex: an argument may hold nested parentheses, arrays, objects,
 * and template literals containing braces.
 *
 * @param {string} source
 * @param {string} callee
 * @returns {{ argument: string, offset: number }[]}
 */
export function extractArguments(source, callee) {
  const found = [];
  let index = 0;
  while (index < source.length) {
    const start = source.indexOf(callee, index);
    if (start === -1) {
      break;
    }
    let cursor = start + callee.length;
    let depth = 1;
    const stack = [];
    let mode = "code";
    let argument = "";
    while (cursor < source.length) {
      const char = source[cursor];
      const next = source[cursor + 1];

      if (mode === "code") {
        if (char === '"' || char === "'" || char === "`") {
          mode = char;
          argument += char;
          cursor += 1;
          continue;
        }
        if (char === "/" && next === "/") {
          while (cursor < source.length && source[cursor] !== "\n") {
            cursor += 1;
          }
          continue;
        }
        if (char === "(" || char === "[" || char === "{") {
          stack.push(char);
          depth += 1;
        } else if (char === ")" || char === "]" || char === "}") {
          stack.pop();
          depth -= 1;
          if (depth === 0) {
            break;
          }
        } else if (char === "," && depth === 1) {
          break;
        }
      } else if (char === "\\") {
        argument += char + (next ?? "");
        cursor += 2;
        continue;
      } else if (char === mode) {
        mode = "code";
      }
      argument += char;
      cursor += 1;
    }
    found.push({ argument: argument.trim(), offset: start });
    index = cursor + 1;
  }
  return found;
}

/**
 * Every literal diagnostic message in one file, with its line number.
 *
 * @param {string} source
 * @param {string} path
 * @returns {{ line: number, text: string }[]}
 */
export function findMessages(source, path) {
  if (path.endsWith(".grit")) {
    return [...source.matchAll(/message="(?<group1>[^"]*)"/gu)].map((match) => ({
      line: source.slice(0, match.index).split("\n").length,
      text: match[1],
    }));
  }

  const messages = [];
  const seen = new Set();
  for (const callee of CALLEES) {
    for (const { argument, offset } of extractArguments(source, callee)) {
      if (seen.has(offset) || !isLiteralMessage(argument)) {
        continue;
      }
      seen.add(offset);
      messages.push({
        line: source.slice(0, offset).split("\n").length,
        text: literalText(argument).replace(/\s+/gu, " ").trim(),
      });
    }
  }
  return messages;
}

/**
 * True when the call that owns this diagnostic carries the marker. The marker may sit on the
 * message line, the line above it, or the closing line of a multi-line call.
 *
 * @param {string[]} lines file split on newlines
 * @param {number} lineNumber 1-based line of the diagnostic
 * @returns {boolean}
 */
export function isRemedyInValue(lines, lineNumber) {
  const candidates = [
    lines[lineNumber - 2] ?? "",
    lines[lineNumber - 1] ?? "",
    lines[lineNumber] ?? "",
    lines[lineNumber + 1] ?? "",
  ];
  return candidates.some((line) => REMEDY_IN_VALUE.test(line));
}
