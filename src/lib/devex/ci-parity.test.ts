import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();
const packageJson = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8")) as {
  scripts: Record<string, string>;
};
const ciWorkflowPath = join(repoRoot, ".github/workflows/ci.yml");

function workflow(): string {
  expect(existsSync(ciWorkflowPath), ".github/workflows/ci.yml should exist").toBe(true);
  return readFileSync(ciWorkflowPath, "utf8");
}

function repoFile(path: string): string {
  const filePath = join(repoRoot, path);
  expect(existsSync(filePath), `${path} should exist`).toBe(true);
  return readFileSync(filePath, "utf8");
}

describe("CI parity gates", () => {
  it("exposes local scripts for every CI quality gate", () => {
    expect(packageJson.scripts).toMatchObject({
      lint: "eslint src",
      typecheck: "tsc --noEmit",
      test: "vitest run",
      build: "next build",
      "db:types:check": "node scripts/db-types-check.mjs check",
      "test:e2e:ci": expect.stringContaining("playwright test"),
      "test:e2e:smoke": expect.stringContaining("playwright test"),
      "ci:parity": expect.any(String),
    });

    expect(packageJson.scripts["test:e2e:ci"]).toContain("--project=chromium");
    expect(packageJson.scripts["test:e2e:smoke"]).toContain("--project=chromium");
    expect(packageJson.scripts["test:e2e:smoke"]).toContain("protected /chat redirects");

    const parity = packageJson.scripts["ci:parity"];
    for (const gate of [
      "supabase start",
      "supabase status -o env",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "pnpm run db:types:check",
      "pnpm run lint",
      "pnpm run typecheck",
      "pnpm run test",
      "pnpm run eval:prompts",
      "pnpm run build",
      "pnpm run test:e2e:ci",
    ]) {
      expect(parity).toContain(gate);
    }
  });

  it("strips quoted values emitted by Supabase env export before setting app env vars", () => {
    const yml = workflow();
    const parity = packageJson.scripts["ci:parity"];

    for (const source of [yml, parity]) {
      expect(source).toContain('s/^"//; s/"$//');
      expect(source).toContain("NEXT_PUBLIC_SUPABASE_URL=$api_url");
      expect(source).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$anon_key");
    }
  });

  it("runs the same required gates in GitHub Actions CI", () => {
    const yml = workflow();

    expect(yml).toContain("name: CI");
    expect(yml).toContain("pull_request:");
    expect(yml).toContain("push:");
    expect(yml).toContain("pnpm/action-setup");
    expect(yml).toContain("actions/setup-node");
    expect(yml).toContain("supabase/setup-cli");
    expect(yml).toContain("supabase start");
    expect(yml).toContain("supabase status -o env");
    expect(yml).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$anon_key");
    expect(yml).toContain("pnpm exec playwright install --with-deps chromium");

    for (const gate of [
      "pnpm run lint",
      "pnpm run typecheck",
      "pnpm run db:types:check",
      "pnpm run test",
      "pnpm run eval:prompts",
      "pnpm run build",
      "pnpm run test:e2e:ci",
    ]) {
      expect(yml).toContain(gate);
    }

    expect(yml).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(yml).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    expect(yml).toContain("PLAYWRIGHT_BASE_URL");
  });
});

describe("Vercel runbook parity", () => {
  it("documents preview and production env setup, smoke checks, and rollback notes", () => {
    const runbook = repoFile("RUNBOOK.md");
    const readme = repoFile("README.md");

    for (const required of [
      "## Vercel environment parity",
      "### Required Vercel environment matrix",
      "### Preview smoke checks",
      "### Production smoke checks",
      "### Vercel rollback notes",
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "ANTHROPIC_API_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_VAPID_PUBLIC_KEY",
      "VAPID_PRIVATE_KEY",
      "NEXT_PUBLIC_POSTHOG_KEY",
      "NEXT_PUBLIC_SENTRY_DSN",
    ]) {
      expect(runbook).toContain(required);
    }

    expect(runbook).toContain("Preview");
    expect(runbook).toContain("Production");
    expect(runbook).toContain("Redeploy");
    expect(runbook).toContain("rollback");
    expect(readme).toContain("Vercel env + runbook parity");
    expect(readme).toContain("RUNBOOK.md#vercel-environment-parity");
  });
});

describe("release rollback and incident checklist", () => {
  it("documents testable rollback paths, incident command, and post-incident evidence", () => {
    const runbook = repoFile("RUNBOOK.md");

    for (const required of [
      "## Release rollback and incident checklist",
      "### Severity and decision gates",
      "### App rollback checklist",
      "### Environment rollback checklist",
      "### Database forward-fix checklist",
      "### Prompt/agent rollback checklist",
      "### Incident command checklist",
      "### Post-incident evidence checklist",
      "rollback owner",
      "incident commander",
      "customer impact",
      "decision timestamp",
      "rollback target",
      "forward-fix migration",
      "post-incident follow-up",
    ]) {
      expect(runbook).toContain(required);
    }
  });
});

describe("closed beta launch readiness checklist", () => {
  it("documents beta scope, launch gates, feedback triage, and owner-blocked signoffs", () => {
    const checklist = repoFile("docs/BETA_LAUNCH_CHECKLIST.md");
    const tasks = repoFile("docs/TASKS.md");
    const buildPlan = repoFile("docs/BUILD_PLAN.md");
    const readme = repoFile("README.md");
    const mealLogAcceptance = repoFile("docs/MEAL_LOG_MVP_ACCEPTANCE.md");

    for (const required of [
      "# Closed Beta and Launch Checklist",
      "## Beta scope decision",
      "## Closed beta cohort plan",
      "## Feedback intake and triage",
      "## Launch gates",
      "## Go/no-go decision log",
      "## Deferred or explicitly out-of-scope for closed beta",
      "text meal logging",
      "image/camera meal logging",
      "audio/voice meal logging",
      "file-based meal logging",
      "chat quick-action chips",
      "blocker | major | minor",
      "owner-blocked",
      "go/no-go owner",
    ]) {
      expect(checklist).toContain(required);
    }

    for (const required of [
      "docs/BETA_LAUNCH_CHECKLIST.md",
      "Closed beta launch checklist is documented",
      "S7-T04A",
      "S7-T04B",
    ]) {
      expect(tasks).toContain(required);
    }

    expect(buildPlan).toContain("docs/BETA_LAUNCH_CHECKLIST.md");
    expect(readme).toContain("docs/BETA_LAUNCH_CHECKLIST.md");
    expect(mealLogAcceptance).toContain("## Closed beta scope override");
    expect(mealLogAcceptance).toContain("docs/BETA_LAUNCH_CHECKLIST.md");
    expect(mealLogAcceptance).toContain("text-first");
    expect(mealLogAcceptance).toContain("photo/image and voice/audio remain deferred");
  });
});
