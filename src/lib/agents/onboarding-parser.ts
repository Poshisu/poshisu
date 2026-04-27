import type Anthropic from "@anthropic-ai/sdk";
import { callAgent } from "@/lib/claude/client";
import { getPrompt } from "@/lib/claude/prompts";
import { isValidProfileMarkdown, profilePreservesSafety } from "@/lib/onboarding/profileTemplate";
import type { OnboardingAnswers } from "@/lib/onboarding/types";

const MODEL = "claude-haiku-4-5";

/**
 * Tool schema for the Onboarding Parser. Forces a single tool call with
 * exactly one string field — `profile_markdown`. Mirrors the contract in
 * `prompts/agents/ONBOARDING_PARSER.md`.
 */
const generateProfileTool: Anthropic.Tool = {
  name: "generate_profile",
  description:
    "Return the generated profile.md as a single markdown string. Must follow the canonical format from the system prompt exactly.",
  input_schema: {
    type: "object",
    properties: {
      profile_markdown: {
        type: "string",
        description: "The full body of profile.md, starting with '# Profile for {name}'.",
      },
    },
    required: ["profile_markdown"],
  },
};

/**
 * Call the Onboarding Parser agent to generate a profile.md from
 * structured onboarding answers.
 *
 * Throws on:
 *   - any error from callAgent (auth, rate limit, internal)
 *   - missing or non-string `profile_markdown` in the tool output
 *   - markdown that fails the structural validator (likely garbled output)
 *
 * The server action catches throws and falls back to the deterministic
 * template generator. Callers shouldn't try to recover here — surface the
 * failure and let the orchestrator decide.
 */
export async function generateProfileViaAgent(
  answers: OnboardingAnswers,
  ctx: { userId: string },
): Promise<string> {
  // Wrap the user-supplied JSON in explicit delimiters. The model sees
  // the JSON as data, not as instructions — a prompt-injection attempt in
  // a free-text field (name, dislikes, medications) is harder to disguise
  // as system intent when it's clearly bracketed inside a tagged region.
  const userContent = `<onboarding_answers>\n${JSON.stringify(answers)}\n</onboarding_answers>`;

  const result = await callAgent({
    agent: "onboarding-parser",
    model: MODEL,
    system: getPrompt("ONBOARDING_PARSER"),
    messages: [{ role: "user", content: userContent }],
    tools: [generateProfileTool],
    toolChoice: { type: "tool", name: "generate_profile" },
    cacheSystem: true,
    userId: ctx.userId,
    intent: "update_profile",
  });

  if (!result.toolUse || result.toolUse.name !== "generate_profile") {
    throw new Error("onboarding-parser: model did not return the generate_profile tool call");
  }
  const md = result.toolUse.input.profile_markdown;
  if (typeof md !== "string") {
    throw new Error("onboarding-parser: profile_markdown is missing or not a string");
  }
  if (!isValidProfileMarkdown(md)) {
    throw new Error("onboarding-parser: returned markdown failed structural validation");
  }
  // Final defence: the markdown must preserve every declared allergy and
  // condition. A prompt-injected output that strips the allergy section
  // structurally passes isValidProfileMarkdown but fails this check,
  // forcing the orchestrator into the deterministic template fallback.
  if (!profilePreservesSafety(md, answers)) {
    throw new Error("onboarding-parser: returned markdown does not preserve declared safety constraints");
  }
  return md;
}
