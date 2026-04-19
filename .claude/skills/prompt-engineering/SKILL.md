# Skill: Prompt Engineering for Nourish Agents

> Load this skill when writing, editing, or evaluating system prompts for any Nourish agent. It codifies the patterns that produce reliable, high-quality agent outputs.

---

## Prompt structure

Every Nourish agent prompt follows the same structure:

```markdown
# {Agent Name} Agent — System Prompt

> **Role:** One-sentence description.

You MUST also load and obey: `prompts/agents/SAFETY_RULES.md`.

---

## Who you are
Character, expertise, and constraints.

## Your context
What data you receive and from where.

## What you do
Step-by-step instructions. Numbered for clarity.

## Output format
Tool schema and structured output specification.

## Examples
3-5 worked examples covering happy path, edge case, safety.

## Hard rules
Numbered list of non-negotiable behaviors.
```

## Key principles

### 1. Tools over prose

Every agent returns its output via a tool call, never freeform text. This gives us:
- **Schema validation** — we can check the output before showing it to the user
- **Structured data** — downstream code can parse it reliably
- **Deterministic parsing** — no regex-on-prose fragility

Always define tools with explicit `input_schema` and use `tool_choice: { type: 'tool', name: '...' }` to force it.

### 2. Context is king, but less is more

Each agent gets only the memory layers it needs:

| Agent | Loads |
|---|---|
| Router | user name, timezone, previous intent |
| Nutrition Estimator | profile, patterns, context, semantic, recent 3 days |
| Coach | profile, patterns, context, semantic, 7-30 days, targets |
| Memory Consolidator | yesterday's log, current patterns, semantic |
| Nudge Generator | name, nudge tone, today's logging state |

Loading unnecessary context wastes tokens and money. Cache the stable parts.

### 3. Safety rules are injected, not hoped for

The `SAFETY_RULES.md` file is appended to every user-facing agent's system prompt. We don't rely on the LLM "remembering" to check allergies — we structurally require it in the tool schema (e.g., `safety_flags` is a required output field).

### 4. Examples are the most powerful prompt engineering tool

Each prompt includes 3-5 worked examples that show the agent:
- How to reason through the problem
- What the correct output looks like
- How to handle edge cases
- What NOT to do (via contrast with the correct approach)

When the agent is performing poorly on a category of input, the first thing to try is adding an example for that category.

### 5. One question per turn

Agents that need clarification ask exactly one question. Never two. Never a compound question. This is enforced in the hard rules of each prompt and in the tool schema (`clarifying_question` is a single nullable string).

### 6. Confidence drives behavior

The Nutrition Estimator returns a `confidence` score (0-1). The orchestrator uses this to decide:
- **≥ 0.7:** Show the estimate with a confirm button
- **0.5-0.7:** Show the estimate but highlight the uncertainty ("rough estimate")
- **< 0.5:** Ask the clarifying question instead of showing an estimate

This threshold is tunable in code, not in the prompt.

## How to iterate on prompts

### Step 1: Identify the failure

Run `pnpm run eval:prompts` and find which test cases are failing. Or identify a real-world input that produces a bad output.

### Step 2: Diagnose

Examine the full agent output (check `agent_traces`). Is the problem:
- **Understanding:** The agent misunderstood the input → fix context loading or add an example
- **Knowledge:** The agent doesn't know a food/term → add to IFCT or semantic dictionary
- **Reasoning:** The agent's logic is wrong → add explicit step in "What you do" section
- **Format:** The output is malformed → tighten the tool schema
- **Safety:** A flag was missed → add to SAFETY_RULES.md and add a test case

### Step 3: Make the smallest possible change

Don't rewrite the prompt. Change one thing:
- Add an example (most common, most effective)
- Add a rule to the "Hard rules" list
- Add a step to the "What you do" section
- Tighten a constraint in the tool schema
- Add reference data to the IFCT or MEAL_TEMPLATES file

### Step 4: Evaluate

Run `pnpm run eval:prompts -- --agent=<name>` to verify:
- The failing case now passes
- No existing cases regressed
- Safety-critical cases all still pass

### Step 5: Update the baseline

If the eval improves by ≥2%, update `tests/prompts/baseline.json` and commit with:
```
docs: update nutrition-estimator baseline (84% → 87%)
```

## Prompt caching strategy

Anthropic's prompt caching saves 90% on cached input tokens. We cache:

1. **System prompt** (the agent's .md file): ~2-4k tokens, stable between deployments
2. **IFCT reference data**: ~3k tokens, stable
3. **Safety rules**: ~2k tokens, stable

These are set with `cache_control: { type: 'ephemeral' }` on the system message content blocks. The user-specific memory (profile, patterns, etc.) goes in a separate content block WITHOUT cache_control, because it changes per user.

```ts
system: [
  {
    type: 'text',
    text: systemPrompt,       // agent prompt — cached
    cache_control: { type: 'ephemeral' },
  },
  {
    type: 'text',
    text: ifctReference,       // IFCT data — cached
    cache_control: { type: 'ephemeral' },
  },
  {
    type: 'text',
    text: userMemoryContext,    // per-user — NOT cached
  },
],
```

Cache TTL is 5 minutes. If the same system prompt + IFCT are used within 5 min (very likely with multiple users), subsequent calls pay only 10% of the input cost for those blocks.

## Anti-patterns

### Don't

- **Ask the LLM to output JSON without a tool schema.** It will hallucinate fields, omit required ones, or wrap it in markdown. Use tools.
- **Include instructions in the user message.** System prompt is for instructions. User message is for user input. Mixing them reduces cache hit rates.
- **Make the prompt enormous.** Each additional token of system prompt costs money on every call. Keep prompts under 4k tokens. Use reference files (IFCT, CONDITION_GUIDELINES) for data, not inline in the prompt.
- **Rely on "be careful" or "double check."** These vague instructions don't work. Instead, add explicit steps: "Step 6: Check each item against the user's allergies list."
- **Skip examples.** A prompt without examples is an untested prompt. Add at least 3.
- **Change the prompt without running eval.** The eval exists for a reason.

## Model selection for prompting

| Agent | Model | Why | Token budget (output) |
|---|---|---|---|
| Router | Haiku 4.5 | Classification is bounded. Speed matters. | 200 max |
| Nutrition Estimator | Sonnet 4.6 | Vision, accuracy, complex reasoning | 1500 max |
| Coach | Sonnet 4.6 | Analytical, needs to reference data | 2000 max |
| Memory Consolidator | Sonnet 4.6 | Pattern extraction from unstructured text | 1500 max |
| Weekly Synthesis | Opus 4.6 | Worth the 1.67x premium for monthly depth | 2000 max |
| Nudge Generator | Haiku 4.5 | Short output, speed matters for batch dispatch | 200 max |
| Onboarding Parser | Haiku 4.5 | Structured extraction, no reasoning needed | 1000 max |

Set `max_tokens` explicitly to prevent runaway costs on malformed outputs.
