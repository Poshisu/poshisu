import fs from "fs";
import path from "path";

const promptCache = new Map<string, string>();

export function loadPrompt(name: string): string {
  if (promptCache.has(name)) return promptCache.get(name)!;
  const filePath = path.join(process.cwd(), "prompts", "agents", `${name}.md`);
  const content = fs.readFileSync(filePath, "utf-8");
  promptCache.set(name, content);
  return content;
}
