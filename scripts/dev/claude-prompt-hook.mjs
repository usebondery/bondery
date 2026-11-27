/**
 * Claude Code UserPromptSubmit hook: when a prompt mentions the changelog, tell the agent to
 * load the `bondery-changelog` skill before touching `docs/changelog/`.
 *
 * Prints a `hookSpecificOutput.additionalContext` JSON object on stdout. Always exits 0: a
 * prompt hook must never block the session, so unreadable stdin or a non-match is a no-op.
 */
import { readFileSync } from "node:fs";

const CHANGELOG_PATTERN = /\bchangelog\b/i;

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8") || "{}");
  } catch {
    return;
  }
  const prompt = typeof input.prompt === "string" ? input.prompt : "";
  if (!CHANGELOG_PATTERN.test(prompt)) {
    return;
  }
  process.stdout.write(
    `${JSON.stringify({
      hookSpecificOutput: {
        additionalContext:
          "The user's prompt mentions the changelog. Invoke the `bondery-changelog` skill before editing anything under `docs/changelog/`.",
        hookEventName: "UserPromptSubmit",
      },
    })}\n`,
  );
}

main();
