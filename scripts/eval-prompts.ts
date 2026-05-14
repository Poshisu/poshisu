import {
  evaluatePromptSuite,
  getFailedPromptEvalCases,
  getFailedPromptEvalSuites,
  summarizePromptEvalRun,
} from "../src/lib/evals/prompt-evals";

async function main() {
  const run = await evaluatePromptSuite();
  console.log(summarizePromptEvalRun(run));

  if (!run.overall.passed) {
    const suiteFailures = getFailedPromptEvalSuites(run);
    if (suiteFailures.length > 0) {
      console.error("\nFailed prompt eval suites:");
      for (const failure of suiteFailures) {
        console.error(`- ${failure}`);
      }
    }

    const caseFailures = getFailedPromptEvalCases(run);
    if (caseFailures.length > 0) {
      console.error("\nFailed prompt eval cases:");
      for (const failure of caseFailures) {
        console.error(`- ${failure}`);
      }
    }

    process.exit(1);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
