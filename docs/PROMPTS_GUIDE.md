# Nourish — Prompts Guide

> How to write, test, and iterate on the system prompts that power every Nourish agent. This is the most important document for long-term product quality.

---

## The prompt is the product

For an AI-native app, the system prompts are equivalent to the codebase. They determine:
- Whether the agent understands the user's meal description correctly
- Whether the calorie estimate is in the right ballpark
- Whether the agent catches an allergen conflict
- Whether the nudge feels helpful or annoying
- Whether the recommendation is useful or generic

Treat prompt changes with the same rigor as code changes: test before, test after, review the diff.

## Where the prompts live

```
prompts/
├── agents/
│   ├── SAFETY_RULES.md          # Loaded by every user-facing agent
│   ├── ROUTER.md                # Intent classification
│   ├── NUTRITION_ESTIMATOR.md   # Meal estimation (most critical)
│   ├── COACH.md                 # Insights and recommendations
│   ├── MEMORY_CONSOLIDATOR.md   # Background memory updates
│   ├── NUDGE_GENERATOR.md       # Push notification messages
│   └── ONBOARDING_PARSER.md     # Questionnaire → profile.md
└── reference/
    ├── IFCT_INDIAN_FOODS.md     # Nutritional data tables
    ├── MEAL_TEMPLATES.md        # Common meal patterns
    └── CONDITION_GUIDELINES.md  # Diet rules per medical condition
```

## How prompts are loaded at runtime

```ts
// src/lib/claude/prompts.ts
// Loads all .md files from prompts/agents/ and prompts/reference/ at startup.
// Exposes getPrompt(name: string): string

// In agent code:
const systemPrompt = getPrompt('NUTRITION_ESTIMATOR');
const safetyRules = getPrompt('SAFETY_RULES');
const ifctRef = getPrompt('IFCT_INDIAN_FOODS');

// Composed into the API call with caching:
system: [
  { type: 'text', text: systemPrompt + '\n\n' + safetyRules, cache_control: { type: 'ephemeral' } },
  { type: 'text', text: ifctRef, cache_control: { type: 'ephemeral' } },
  { type: 'text', text: userMemoryContext }, // NOT cached (per-user)
]
```

## Iteration workflow

### 1. Identify the problem

Where to look:
- **agent_traces table:** Every LLM call is logged. Search by user_id, agent, or time range.
- **User feedback:** "That estimate was way off" → find the trace → see what went wrong.
- **Eval harness:** `pnpm run eval:prompts` shows which test cases are failing.
- **Your own testing:** Log your own meals and see if the estimates are reasonable.

### 2. Classify the problem

| Category | Fix location | Example |
|---|---|---|
| Misunderstood input | Add an example to the prompt | "My usual chai" not recognized |
| Wrong nutritional data | Update IFCT or MEAL_TEMPLATES | Biryani calorie estimate too low |
| Safety miss | Update SAFETY_RULES.md and add test | Peanut allergy not flagged in pad thai |
| Poor tone | Adjust the "Tone" section | Nudge felt preachy |
| Wrong structure | Tighten the tool schema | Output missing a required field |
| Too many questions | Add a rule or example | Agent asked 3 questions in one turn |

### 3. Make the change

**Small changes only.** Don't rewrite the entire prompt to fix one issue. Change one thing:
- Add one example (most common fix)
- Add one rule to the Hard Rules section
- Add one step to the process
- Add one entry to the reference data
- Tighten one constraint in the tool schema

### 4. Test locally

```bash
# Run the full eval for the changed agent
pnpm run eval:prompts -- --agent=nutrition-estimator

# Or run a single test case
pnpm run eval:prompts -- --agent=nutrition-estimator --case=14
```

### 5. Compare to baseline

The eval outputs a comparison:

```
nutrition-estimator: 87% (baseline: 84%) → +3% ✅
  Improved: #14 (vague biryani), #22 (thali photo)
  Regressed: none
  Safety: 10/10 ✅
```

If any safety-critical case fails, stop. Fix it before anything else.

### 6. Commit

```bash
git add prompts/agents/NUTRITION_ESTIMATOR.md tests/prompts/baseline.json
git commit -m "feat(prompts): improve biryani estimation with portion question

- Added example for vague biryani description
- Added rule: always ask veg/non-veg and portion for biryani
- Eval: nutrition-estimator 84% → 87% (+3%)
- Safety: 10/10"
```

## Writing good examples

Examples are the most effective prompt engineering tool. A good example:

1. **Shows the input exactly as a user would type it** — including typos, Hinglish, casual tone.
2. **Shows the reasoning** — not just the output, but why the agent chose that output.
3. **Shows the complete tool call** — every field, not just the ones that matter for this example.
4. **Covers a different scenario** from existing examples — don't duplicate.
5. **Includes a negative case** where relevant — "In this case, the agent does NOT ask a question because..."

### Template for a new example

```markdown
### Example N — {scenario name}

**Input:** {exact user message, possibly with [photo] or [voice transcript] marker}

**Process:**
- Identify: {what items were identified and how}
- Lookup: {what reference data was used}
- Portion: {how portions were estimated}
- Prep context: {oil, cooking method assumptions}
- Safety: {any flags triggered}

**Output (tool call):**
```json
{complete tool call output}
```
```

## The eval harness

### Test case format

```json
{
  "id": "NE-014",
  "name": "Vague biryani description",
  "category": "edge_case",
  "criticality": "normal",
  "agent": "nutrition-estimator",
  "input": {
    "message": "had biryani from outside",
    "photo_url": null,
    "voice_transcript": null
  },
  "context": {
    "profile_snippet": "Non-veg, moderate oil, midpoint estimation, no conditions",
    "patterns_snippet": "Usually has chicken biryani when ordering, 1 plate"
  },
  "expected": {
    "items_contain": ["biryani"],
    "kcal_range": [500, 1000],
    "should_ask_clarification": true,
    "safety_flags": [],
    "confidence_max": 0.6
  }
}
```

### Scoring

| Criterion | Weight | How scored |
|---|---|---|
| Items identified correctly | 25% | Set intersection with expected items |
| Calorie range overlaps with expected | 25% | Range overlap percentage |
| Clarification decision correct | 20% | Boolean match |
| Safety flags correct | 20% | Set match (false negative = 0 points) |
| Confidence appropriate | 10% | Within 0.15 of expected max |

**Safety cases have a separate pass/fail gate.** A safety miss (false negative on allergen, condition, or ED) fails the case regardless of other scores.

## Prompt versioning

Every prompt file has a version marker in its git history. When making significant changes:

1. Note the version in the commit message.
2. Update `tests/prompts/baseline.json` with the new scores.
3. The `agent_traces` table records `prompt_version` for every call — use this to A/B compare.

## Cost awareness

Every token in the system prompt costs money on every call. At 10,000 calls/day:
- 1 extra token in a Haiku prompt = $0.01/day
- 1 extra token in a Sonnet prompt = $0.03/day
- 100 extra tokens (a paragraph) = $3/day on Sonnet

This doesn't mean write terse prompts — clarity is worth tokens. But it means:
- Don't repeat yourself in the prompt
- Use reference files (IFCT, MEAL_TEMPLATES) for data, not inline
- Prune examples that no longer teach anything new
- Measure token counts when making changes

## When to upgrade models

If an agent is consistently underperforming even after prompt iteration:

1. First try: add better examples (free, often sufficient).
2. Second try: add explicit reasoning steps.
3. Third try: upgrade the model one tier (e.g., Haiku → Sonnet for routing).
4. Last resort: use extended thinking (adds output tokens but improves reasoning).

Document the model upgrade with before/after eval numbers. The cost increase must be justified by a measurable quality improvement.
