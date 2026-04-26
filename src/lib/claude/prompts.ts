import fs from "node:fs";
import path from "node:path";

/**
 * Loads agent system prompts from `prompts/agents/<NAME>.md` at runtime.
 *
 * Prompts are cached on first read — they're shipped as static files in the
 * Vercel deployment and don't change between requests. Cache is per-process,
 * so the first request after a cold start pays the disk read; everything
 * after is in-memory.
 *
 * Convention: prompt files are UPPER_SNAKE_CASE.md (per CLAUDE.md). The
 * `name` arg matches the filename without the `.md` extension.
 */
const cache = new Map<string, string>();

const PROMPTS_DIR = path.join(process.cwd(), "prompts", "agents");

export function getPrompt(name: string): string {
  const cached = cache.get(name);
  if (cached !== undefined) return cached;

  const filePath = path.join(PROMPTS_DIR, `${name}.md`);
  const content = fs.readFileSync(filePath, "utf-8");
  cache.set(name, content);
  return content;
}

/**
 * Resets the in-process prompt cache. Test-only.
 */
export function _resetPromptCacheForTests(): void {
  cache.clear();
}
