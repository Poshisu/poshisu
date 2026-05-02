# Nourish — Build Plan

> **How to use this document.** Each phase is a sequence of Claude Code prompts. Open Claude Code in your project root, paste the prompt verbatim, let it work, review its output with the `code-reviewer` sub-agent, then move on. The prompts assume `CLAUDE.md` is already in the repo root.

---

## Phase 0 — Foundation (Week 1)

By the end of this phase, you have a deployed PWA shell with auth, database, CI, and observability working end to end. It does nothing useful yet. That's correct.

### Prompt 0.1 — Scaffold the Next.js project

```
Read CLAUDE.md first. Then scaffold the Nourish project from scratch.

Tasks:
1. Initialize a new Next.js project at the current directory using (pinning the version from `package.json` as the source of truth):
   pnpm dlx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --turbopack --import-alias "@/*"
2. Install these additional dependencies:
   - @supabase/ssr @supabase/supabase-js
   - @anthropic-ai/sdk
   - zod
   - recharts
   - lucide-react
   - class-variance-authority clsx tailwind-merge
   - date-fns
   - web-push
   - @elevenlabs/elevenlabs-js
   - posthog-js posthog-node
   - @sentry/nextjs
3. Install dev dependencies:
   - vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
   - @playwright/test
   - prettier prettier-plugin-tailwindcss
   - @types/web-push
4. Initialize shadcn/ui with: pnpm dlx shadcn@latest init
   - Style: New York
   - Base color: stone
   - CSS variables: yes
5. Add these shadcn components: button, input, card, dialog, tabs, badge, avatar, scroll-area, sheet, toast, progress, separator, label, textarea, switch, select.
6. Create the directory structure exactly as specified in CLAUDE.md under "Project structure".
7. Create .env.local.example with all variables documented in CLAUDE.md, with placeholder values and inline comments explaining each.
8. Create a comprehensive .gitignore that includes .env.local, .next, node_modules, playwright-report, test-results, coverage.
9. Add npm scripts to package.json:
   - "dev": "next dev --turbopack"
   - "build": "next build"
   - "start": "next start"
   - "lint": "next lint"
   - "typecheck": "tsc --noEmit"
   - "format": "prettier --write ."
   - "test": "vitest run"
   - "test:watch": "vitest"
   - "test:ui": "vitest --ui"
   - "test:e2e": "playwright test"
   - "eval:prompts": "tsx scripts/eval-prompts.ts"
   - "db:types": "supabase gen types typescript --local > src/types/database.ts"
10. Create vitest.config.ts and playwright.config.ts with sensible defaults.
11. Create a prettier config that includes the tailwind plugin.

After everything, run pnpm run typecheck and pnpm run lint to verify the scaffold is clean. Fix any issues. Show me the final tree.
```

### Prompt 0.2 — Supabase project setup

```
Read CLAUDE.md. We need to set up Supabase for local development and production.

Tasks:
1. Install the Supabase CLI as a dev dependency: pnpm add -D supabase
2. Run: pnpm supabase init (creates supabase/ directory)
3. Create supabase/migrations/0001_init.sql with the full initial schema. Use the schema in supabase/migrations/0001_init.sql (I will provide it; copy it from the project artifacts I am giving you).
4. Create src/lib/supabase/client.ts (browser client using @supabase/ssr createBrowserClient).
5. Create src/lib/supabase/server.ts (server client using @supabase/ssr createServerClient with cookie handling).
6. Create src/lib/supabase/middleware.ts that updates the session on every request.
7. Create src/middleware.ts at the project root that calls the supabase middleware and protects routes under /(app)/.
8. Generate types: pnpm db:types (will populate src/types/database.ts).
9. Test that the dev server starts cleanly: pnpm dev. Open http://localhost:3000.

Show me the file tree of supabase/ and src/lib/supabase/ when done.
```

### Prompt 0.3 — Auth pages

```
Read CLAUDE.md. Build the authentication pages.

Tasks:
1. Create app/(auth)/login/page.tsx — server component with a form that uses a server action to call supabase.auth.signInWithPassword. Email + password fields, "Sign in with Google" button, link to signup, link to magic link.
2. Create app/(auth)/signup/page.tsx — similar form, calls signUp. After signup, redirect to /onboarding.
3. Create app/(auth)/callback/route.ts — handles the OAuth callback by exchanging code for session.
4. Create app/(auth)/logout/route.ts — POST endpoint that signs out and redirects to /.
5. Style with shadcn Card, Input, Button, Label. Include error toasts.
6. Make sure all forms have proper labels for accessibility, are keyboard navigable, and have inline error display.
7. Write a Playwright test in tests/e2e/auth.spec.ts that tests the signup → login → logout flow against a Supabase local instance.
8. Run typecheck and lint. Fix any issues.

After done, ask the code-reviewer sub-agent to review the auth flow for security issues.
```

### Prompt 0.4 — PWA configuration and shell layout

```
Read CLAUDE.md. Make the app a proper installable PWA.

Tasks:
1. Create src/app/manifest.ts that exports a Web App Manifest with:
   - name: "Nourish — your AI health coach"
   - short_name: "Nourish"
   - description from PRD section 1
   - start_url: "/chat"
   - display: "standalone"
   - background_color: "#fafaf9" (matches stone-50)
   - theme_color: "#0a0a0a"
   - icons: 192x192, 512x512, maskable variants
   - shortcuts: "Log a meal" → /chat, "Today" → /today
2. Create public/icons/ directory and add placeholder icon files (we'll replace with real ones later, but the manifest should reference them).
3. Add Web Push service worker at public/sw.js that handles push events and notification clicks (open app to /chat).
4. Register the service worker in a client component <ServiceWorkerRegister /> mounted in app/(app)/layout.tsx.
5. Build app/(app)/layout.tsx — the authenticated app shell:
   - Protected route (redirects to /login if no session)
   - Bottom tab bar on mobile (Chat / Today / Trends / Me)
   - Side nav on desktop (md+)
   - Toaster mounted globally
   - PostHog and Sentry providers
6. Build placeholder pages for chat, today, trends, profile that just render their name. We'll fill them in later.
7. Add HTML <head> meta tags: theme-color, apple-mobile-web-app-capable, viewport-fit=cover, status bar style.
8. Verify with Lighthouse PWA audit that the app passes the installability checks.

Run typecheck, lint, and the e2e auth test. Fix any issues.
```

### Prompt 0.5 — Observability and CI

```
Read CLAUDE.md. Wire up observability and continuous integration.

Tasks:
1. Initialize Sentry: pnpm dlx @sentry/wizard@latest -i nextjs. Configure for the installed Next.js App Router version defined in `package.json`. Set DSN from env.
2. Initialize PostHog in src/lib/analytics/posthog.ts with a server client and a browser provider component. Mount the provider in app/(app)/layout.tsx.
3. Define a typed event helper: src/lib/analytics/events.ts with functions like trackSignup, trackOnboardingComplete, trackMealLogged, trackNudgeReceived, trackNudgeResponded, trackRecommendationRequested. Each function takes typed properties.
4. Create .github/workflows/ci.yml that runs on every PR:
   - Install pnpm and Node 20
   - pnpm install --frozen-lockfile
   - pnpm run lint
   - pnpm run typecheck
   - pnpm run test
   - pnpm run build
5. Create .github/workflows/e2e.yml that runs Playwright on every PR against a local Supabase instance.
6. Create a deployment.md doc with the steps to deploy to Vercel and connect Supabase.

Run all checks locally to make sure they pass. Push to a feature branch and verify CI runs (manually if needed).
```

---

## Phase 1 — Onboarding (Week 2)


### Phase 1 implementation note (2026-05-01)

> **Pivot note:** Nourish has pivoted to a **chat-first onboarding** strategy.
>
> - Prompts in Phase 1 that assume a long wizard (`1.1`, `1.2`, and parts of `1.4`) are now **superseded for primary flow** and should be treated as historical context.
> - The active execution path should prioritize conversational onboarding checkpoints and progressive profiling inside chat.
> - Keep the original wizard prompts only as fallback references until `docs/TASKS.md` marks them permanently retired.


> **Update (May 1, 2026): Direction changed from a step-by-step onboarding wizard to a chat-first onboarding flow.**
> The prompts below capture the **original wizard plan** and are retained for historical context only.
> **Superseded prompts:** `Prompt 1.1 — Onboarding wizard UI` and `Prompt 1.2 — Onboarding question definitions` are superseded by the chat-first approach.
> Source of truth for current onboarding implementation work: `docs/TASKS.md` task **DOCS-ONBOARD-CHAT-001**.

By the end of this phase, a new user can sign up, complete a 6-question mandatory onboarding, and have a generated `profile.md` saved to their memory.

### Phase 1 onboarding product-spec contract (effective May 1, 2026)

- **Mandatory fields before completion:** first name, age range, sex, height/weight, primary goal, medical conditions, allergies/intolerances, dietary preference.
- **Optional progressive fields:** wake/sleep window, meal timing windows, cuisine/staples, cooking context, oil usage, portion confidence, hydration baseline, budget/access constraints.
- **Completion rule:** mark onboarding complete only after all mandatory fields validate + consent and safety acknowledgments accepted + successful `profile.md` memory write.
- **Exact consent copy:** "I consent to Nourish using my health and meal information to personalize coaching. I understand Nourish is not a medical provider and does not replace professional advice."
- **Exact safety copy:** "Safety check: I will not rely on Nourish for emergency or urgent medical decisions. If I feel unwell or unsafe, I will contact a licensed clinician or local emergency services."
- **Phase 1 explicit non-goals:** no diagnosis/treatment/medication advice, no wearable sync, no Swiggy/Zomato integration, no multilingual onboarding, no WhatsApp onboarding.
- **Required onboarding UX states:**
  - Loading: "Saving your profile…"
  - Empty: "Tell me a bit about this so I can personalize your plan."
  - Error: "I couldn't save that yet. Please try again." (+ Retry)
  - Success: "You're all set — your personalized coaching is ready."

### Prompt 1.1 — Onboarding wizard UI

```
Read CLAUDE.md and docs/ONBOARDING_FLOW.md. Build the onboarding wizard.

Tasks:
1. Create app/(onboarding)/layout.tsx — minimal shell, no nav, with a progress bar.
2. Create app/(onboarding)/page.tsx — entry point that checks if onboarding is complete and redirects.
3. Build a multi-step wizard at app/(onboarding)/wizard/page.tsx as a client component using useState for the form state.
   - Use the question definitions from src/lib/onboarding/questions.ts (see Prompt 1.2).
   - Render one question per step with smooth transitions.
   - Show progress as "Step X of 6" and a progress bar.
   - Validate each step before allowing "Next".
   - "Back" returns without losing state.
   - On final step, show a "Review your profile" screen with everything the user entered, then a confirm button.
4. Use shadcn primitives: Card for each step, Input/Textarea/Select/RadioGroup as needed, Button for nav.
5. Make the wizard work on mobile and desktop. Animations should be subtle (200ms transitions).
6. On confirm, call the server action createProfile() (built in Prompt 1.3).
7. Write Vitest tests for the question validation logic.
8. Write a Playwright test for the full wizard happy path.

Ensure accessibility: labels, aria-describedby for errors, focus management between steps.
```

### Prompt 1.2 — Onboarding question definitions

```
Read CLAUDE.md and docs/ONBOARDING_FLOW.md. Define the structured questions.

Tasks:
1. Create src/lib/onboarding/questions.ts that exports a typed Question[] array with the 6 mandatory questions and 8 progressive questions.
2. Each Question has: id, kind (single|multi|text|number|composite), label, helpText, validation (Zod schema), and an optional dependsOn for conditional questions.
3. Create src/lib/onboarding/types.ts with the OnboardingAnswers type (a discriminated union or a typed record).
4. Create src/lib/onboarding/contextual.ts that defines which progressive questions are surfaced after which events:
   - "variance" → after 5 meals logged, compare them
   - "oil_prep_preference" → after first meal that has unclear oil context
   - "portion_awareness" → after first meal where user corrected the agent's portion estimate
   - "hydration_target" → after first time the user logs water
   - "snack_pattern" → after first 7 days
5. Write Vitest tests for the validation schemas with valid and invalid inputs.

The questions and their order must match docs/ONBOARDING_FLOW.md exactly.
```

### Prompt 1.3 — Profile generator (Onboarding Parser agent)

```
Read CLAUDE.md and prompts/agents/ONBOARDING_PARSER.md. Build the profile generation pipeline.

Tasks:
1. Create src/lib/claude/client.ts — a thin wrapper around the Anthropic SDK with:
   - createClient() that returns a singleton SDK instance
   - callAgent({ agent, system, messages, model, tools? }) — handles caching, retries, error handling, and trace logging
   - Loads system prompts from prompts/agents/*.md at startup, with cache_control set on system messages
2. Create src/lib/claude/prompts.ts — loads all prompt files into memory at startup and exposes getPrompt(name).
3. Create src/lib/agents/onboarding-parser.ts — the agent function:
   - Input: structured OnboardingAnswers
   - Output: a generated profile.md string
   - Uses Claude Haiku
   - Calls callAgent with the system prompt from prompts/agents/ONBOARDING_PARSER.md
4. Create src/app/(onboarding)/actions.ts — a server action createProfile(answers):
   - Validates the answers with Zod
   - Calls onboarding-parser to generate profile.md
   - Inserts a row into memories table (layer='profile', key='main')
   - Inserts an empty patterns row
   - Marks the user as onboarded (in users table)
   - Tracks the onboarding_complete event in PostHog
   - Redirects to /chat
5. Write Vitest tests for the parser using mocked Claude responses.
6. Run the typecheck and lint.

The profile.md generated should follow the exact format specified in prompts/agents/ONBOARDING_PARSER.md.
```

### Prompt 1.4 — Profile review screen

```
Read CLAUDE.md. Build the profile review screen that the user sees after generation.

Tasks:
1. After the wizard completes, instead of immediately redirecting to /chat, redirect to /onboarding/review.
2. /onboarding/review fetches the just-created profile.md and renders it as readable HTML using react-markdown.
3. Provide an "Edit" mode that lets the user modify the markdown directly in a textarea, with a "Save changes" button.
4. Provide a "Looks good, let's start" button that marks onboarding fully complete and redirects to /chat.
5. Include a small explanation: "This is what I'll remember about you. You can change it any time from your profile."

Make it feel trustworthy. The user should walk away thinking "oh, this app actually knows me."
```

---

## Phase 2 — Chat & Meal Logging (Weeks 3-4)

By the end of this phase, a user can chat with the agent, send a photo/voice/text of a meal, and get back a structured nutritional estimate that gets saved to their meals.

### Prompt 2.1 — Chat UI shell

```
Read CLAUDE.md. Build the chat UI.

Tasks:
1. Create src/components/chat/ChatThread.tsx — the message list. Auto-scrolls to bottom on new messages. Shows date dividers. Supports text, image, meal-card, nudge, and system message types.
2. Create src/components/chat/ChatInput.tsx — the input bar. Has:
   - Multiline text input (autosize, max 6 lines)
   - Send button (disabled until text entered or media attached)
   - Quick-action chips above the input: 📷 Photo, 🎤 Voice, 💧 Water, ❓ Ask
   - Attachment preview area when a photo is staged
3. Create src/components/chat/MealCard.tsx — the confirmation card for a logged meal. Shows:
   - Dish name(s)
   - Calorie range (e.g., "550-650 kcal")
   - Macro chips (P/C/F/Fiber)
   - Confidence indicator
   - "Looks right" button (saves) and "Correct it" button (opens edit dialog)
4. Create src/components/chat/VoiceRecorder.tsx — uses MediaRecorder API, shows a waveform animation while recording, max 60 sec, returns a Blob.
5. Create src/components/chat/PhotoCapture.tsx — opens camera or file picker, compresses to max 1600px before upload.
6. Build app/(app)/chat/page.tsx that ties it all together. Server component that fetches the user's recent messages and renders a client component <ChatRoot> with them.
7. Use Supabase Realtime to subscribe to new messages for this user, so nudges appear live.
8. Style: clean, mobile-first, generous tap targets, accessible colors.

Write Storybook-style component tests with Vitest + Testing Library for each component. Run pnpm test.
```

### Prompt 2.2 — Chat API route (orchestrator entry)

```
Read CLAUDE.md and docs/ARCHITECTURE.md (Request flow section). Build /api/chat.

Tasks:
1. Create src/app/api/chat/route.ts — POST handler that:
   - Authenticates the user (via supabase server client)
   - Validates the request body with Zod (text? photo_url? voice_url?)
   - Inserts the user message into messages table immediately
   - Calls orchestrator.handleMessage(userId, msg)
   - Returns the agent response and appends it to messages
   - Streams the response if possible (Anthropic supports streaming)
2. Create src/lib/agents/orchestrator.ts:
   - handleMessage(userId, msg): the main entry point
   - Step 1: load minimal context (user id, profile summary)
   - Step 2: call router.classify(msg) → intent
   - Step 3: switch on intent and call the appropriate specialist
   - Step 4: log the trace
   - Step 5: return the final response
3. Create src/lib/agents/router.ts — the Router agent. Uses Haiku, returns a typed Intent.
4. Set up rate limiting middleware: src/lib/rate-limit.ts using a Postgres-backed rate_limits table, with limits of 60 req/hour for /api/chat per user.
5. Add the rate_limits table to a new migration: supabase/migrations/0005_rate_limits.sql
6. Write integration tests for the chat API route using Vitest with mocked Claude responses.

Make sure errors are caught and surfaced as user-friendly toast messages, never raw stack traces.
```

### Prompt 2.3 — Hybrid Nutrition Pipeline

```
Read CLAUDE.md, prompts/agents/NUTRITION_ESTIMATOR.md, prompts/agents/SAFETY_RULES.md, and prompts/reference/IFCT_INDIAN_FOODS.md.

The nutrition system is a HYBRID PIPELINE. The LLM does identification (Stage 1). Code does the math (Stages 2-5). Optionally the LLM formats the result (Stage 6).

Tasks:
1. STAGE 1 — Create src/lib/agents/nutrition.ts:
   - Function: identifyMeal({ userId, input, photoUrl?, voiceTranscript? }) → MealIdentification
   - Loads compact memory context (semantic dictionary, profile summary, user features)
   - Calls Claude Sonnet with vision if photo present
   - Uses tool_use with the identify_meal tool schema from NUTRITION_ESTIMATOR.md
   - Returns structured item list with cooking methods, portions, source
   - If confidence < 0.5 and clarifying_question present, return question to user

2. STAGE 2 — Create src/lib/nutrition/lookup.ts:
   - fuzzyLookup(itemName, aliases): queries ifct_foods table using pg_trgm similarity
   - Returns base per-100g values including macros AND micronutrients (B12, calcium, vitamin D, potassium, omega-3)
   - Falls back to category-level estimates if no close match found

3. STAGE 3 — Create src/lib/nutrition/calculator.ts:
   - computeNutrition(items, userId): the main pipeline orchestrator
   - For each item: lookup base values → apply portion → apply cooking_multiplier → apply source_multiplier → apply user portion_bias from user_features
   - Compute ranges using estimation_preference (conservative/midpoint/liberal)
   - Returns complete MealEstimate with macros AND tracked micronutrients

4. Create src/lib/nutrition/multipliers.ts:
   - loadCookingMultipliers(): reads cooking_multipliers table (cache in memory)
   - loadSourceMultipliers(): reads source_multipliers table (cache in memory)
   - applyMultipliers(baseValues, cookingMethod, source): pure function

5. Create src/lib/nutrition/calibration.ts:
   - getUserCalibration(userId): reads user_features.portion_bias and correction_log
   - recordCorrection(userId, mealId, field, original, corrected): writes to correction_log and updates portion_bias

6. STAGE 4 — Create src/lib/nutrition/micros.ts:
   - flagMicronutrients(mealEstimate, dailyTargets): checks each of 5 tracked micros
   - Returns flags like "rich:calcium", "low:b12" based on % of daily target
   - Daily targets: B12=2.4mcg, Calcium=1000mg, VitD=15mcg, Potassium=3000mg, Omega3=1.6g

7. STAGE 5 — Create src/lib/safety/check.ts:
   - checkAllergens(items, userAllergies): returns allergen flags
   - checkConditions(items, userConditions): returns condition flags
   - This is deterministic code, not LLM

8. Create src/lib/nutrition/pipeline.ts:
   - runPipeline(identification, userId): orchestrates stages 2-5
   - Returns the complete MealEstimate ready for saving

9. Save the meal to the meals table only after the user confirms via the Meal Card.

10. Write extensive Vitest tests for EACH stage independently:
    - Lookup: correct fuzzy matching, fallback behavior
    - Calculator: multiplier math, range computation
    - Calibration: correction tracking, bias adjustment
    - Micros: flagging thresholds
    - Safety: allergen detection, condition flagging
    - Pipeline: end-to-end with mocked lookup data
    - These tests do NOT require mocking Claude — only Stage 1 does.

Run pnpm run eval:prompts to baseline the identification agent.
```

### Prompt 2.4 — Voice transcription

```
Read CLAUDE.md. Wire up voice transcription via ElevenLabs Scribe v2.

Tasks:
1. Create src/lib/voice/transcribe.ts:
   - transcribe(audioBlob): calls ElevenLabs Scribe v2 model, returns text
   - Uses the Hinglish-friendly model parameters
   - Handles short and long audio
2. Create src/app/api/voice/transcribe/route.ts — POST endpoint that accepts an audio file, uploads it to Supabase Storage temporarily, calls ElevenLabs Scribe v2, returns the transcript.
3. The ChatInput voice flow:
   - Record audio (max 60s) → upload → transcribe → show transcript in input → user can edit before sending
4. Test with real recordings of meal descriptions in Indian English and Hinglish.
5. Add error handling: if transcription fails, fall back to letting the user type.
```

### Prompt 2.5 — Meal CRUD and Today view

```
Read CLAUDE.md. Build meal storage and the Today view.

Tasks:
1. Create src/app/api/meals/route.ts:
   - GET: list meals for the user, with date range filter
   - POST: create a meal (called by orchestrator after user confirms)
   - PATCH /api/meals/[id]: update a meal (corrections)
   - DELETE /api/meals/[id]: delete a meal
2. All routes enforce auth and RLS.
3. Create src/lib/nutrition/targets.ts — computeTargets(profile): returns daily targets for kcal, protein, carbs, fat, fiber, water based on profile (goal, weight, activity).
4. Create src/components/charts/DailyRadarChart.tsx — uses Recharts RadarChart with 6 axes:
   - Protein (% of target)
   - Fiber (% of target)
   - Hydration (% of target)
   - Calorie balance (closeness to target)
   - Diversity (variety of food groups today)
   - Consistency (logged meals vs typical pattern)
5. Build app/(app)/today/page.tsx:
   - Date selector
   - Running totals as Card components
   - List of meals as MealCard components
   - DailyRadarChart at the top
   - Empty state when no meals logged
6. Use server components for data fetching, client components for interactivity.
7. Realtime subscription for meal updates.
8. Write Playwright e2e: signup → onboarding → log a text meal → see it appear in Today.
```

---

## Phase 3 — Memory System (Week 5)

By the end of this phase, the agent has persistent layered memory that grows over time and is used for context in every interaction.

### Prompt 3.1 — Memory tables and writers

```
Read CLAUDE.md and docs/ARCHITECTURE.md (Memory architecture section).

Tasks:
1. Create supabase/migrations/0002_memory_system.sql with the memories and memories_history tables, RLS policies, indexes, and the audit trigger.
2. Create src/lib/memory/types.ts with MemoryLayer enum and Memory type.
3. Create src/lib/memory/writer.ts:
   - upsertMemory(userId, layer, key, content): updates or inserts, triggers history snapshot
   - appendToDailyLog(userId, date, content): appends to today's daily memory
   - setCurrentContext(userId, content, expiresAt?): sets current_context, with optional expiration
   - clearCurrentContext(userId)
   - addSemanticMapping(userId, term, expansion): adds a row to the semantic dictionary
4. Create src/lib/memory/reader.ts:
   - loadMemoryContext(userId, options): returns a composed markdown string
   - loadDailyLog(userId, date)
   - loadWeeklySummary(userId, weekKey)
   - loadMonthlySummary(userId, monthKey)
   - loadSemanticDictionary(userId)
5. Update orchestrator and nutrition agent to use loadMemoryContext for context loading.
6. Write Vitest tests for the writers and readers.
```

### Prompt 3.2 — Memory Consolidator agent (background)

```
Read CLAUDE.md and prompts/agents/MEMORY_CONSOLIDATOR.md.

Tasks:
1. Create supabase/functions/memory-consolidator/index.ts — Edge Function that runs daily at 02:00 IST.
2. Logic:
   - For each user with activity in the last 24h:
     - Load yesterday's daily log
     - Load current patterns.md
     - Call the Memory Consolidator agent (Sonnet) with yesterday's log + current patterns
     - Agent returns: { updated_patterns: string, semantic_additions?: SemanticEntry[], context_changes?: ... }
     - Apply updates via memory writer
   - Log success/failures to a job_runs table
3. Schedule the function with pg_cron in a new migration.
4. Create src/lib/agents/memory-consolidator.ts (the wrapper called from the Edge Function).
5. Write tests with mocked Claude responses for various scenarios:
   - First day (empty patterns)
   - Pattern reinforcement
   - Pattern shift detection
   - Travel context detection
6. Add a manual trigger endpoint /api/admin/run-consolidator (auth required) for testing.
```

### Prompt 3.3 — Semantic dictionary

```
Read CLAUDE.md.

Tasks:
1. Add the semantic dictionary as part of the memories table (layer='semantic'), with each entry as a key-value pair stored as JSON in content.
2. Create src/lib/memory/semantic.ts:
   - getSemanticDictionary(userId): Map<string, string>
   - addEntry(userId, term, expansion)
   - resolveTerms(userId, text): replaces terms in user input with their expansions for agent context
3. Update the Nutrition Estimator to:
   - Receive the resolved text (with semantic expansions)
   - When it asks a clarifying question and the user answers, detect new terminology and add it to the dictionary via tool call
4. Add a tool the Nutrition Estimator can call: add_semantic_mapping(term, expansion) which is intercepted by the agent runner and applied to the dictionary.
5. Write tests covering semantic resolution and dictionary growth over time.
```

### Prompt 3.4 — Memory inspector UI

```
Read CLAUDE.md. Build the memory inspector in the profile page.

Tasks:
1. Build app/(app)/profile/page.tsx with sections:
   - Account (email, name, plan)
   - Profile (rendered from profile.md, with edit button)
   - Patterns (rendered from patterns.md, with edit-in-place per line)
   - Current context (display, set, clear)
   - Semantic dictionary (table of term → expansion, with delete buttons)
   - Goals & conditions (structured edit form that updates profile.md)
   - Nudge preferences (frequency, quiet hours, enabled categories)
   - Privacy (export my data, delete my account)
2. Create src/app/api/memory/route.ts for read/write operations.
3. Use server actions for mutations.
4. The memory inspector is the trust feature. Make it beautiful and obvious.
5. Add a "Forget this" button next to each pattern line that removes it from patterns.md.
6. Add an audit log view: "Last updated by [user/system] on [date]".
```

---

## Phase 4 — Trends & Analytics (Week 6)

### Prompt 4.1 — Trends views and charts

```
Read CLAUDE.md. Build the trends view.

Tasks:
1. Build app/(app)/trends/page.tsx with tabs for Week / Month / 3-Month.
2. Create src/components/charts/CalorieLineChart.tsx using Recharts LineChart.
3. Create src/components/charts/MacroStackedBar.tsx for macro distribution over time.
4. Create src/components/charts/PeriodRadarChart.tsx — averages over the period.
5. Create src/components/trends/InsightCards.tsx — fetches insights from the Coach agent (see 4.2).
6. Create src/components/trends/StreakCard.tsx — current streak, longest streak, consistency %.
7. Add materialized views in supabase/migrations/0004_analytics_views.sql for fast aggregation queries.
8. All data fetching server-side. Charts hydrated client-side.
9. Mobile-first responsive layouts.

Make this the screen the user wants to share with their friends.
```

### Prompt 4.2 — Coach agent and insight generation

```
Read CLAUDE.md and prompts/agents/COACH.md.

Tasks:
1. Create src/lib/agents/coach.ts — the Coach & Insights agent.
2. Functions:
   - generateInsights(userId, period): returns 3-5 insight cards for the trends view
   - generateRecommendation(userId, context?): the "what should I eat next" handler
   - answerQuestion(userId, question): general history/coaching questions
3. Uses Sonnet with full memory context loaded.
4. The recommendation function:
   - Loads profile, patterns, current context, today's logged meals, daily targets
   - Loads weekly summary if relevant
   - Considers any user-provided constraints in the question (e.g., "I have eggs and bread")
   - Returns 2-3 options with kcal/macro impact and reasoning
   - Applies safety checks (allergies, conditions)
5. Hook the recommendation into chat as a quick-action chip and as an explicit intent the Router classifies.
6. Add /api/recommendations/route.ts for explicit calls.
7. Write tests for various scenarios.
```

### Prompt 4.3 — Weekly and monthly summary jobs

```
Read CLAUDE.md.

Tasks:
1. Create supabase/functions/weekly-summary/index.ts — runs Sunday 22:00 IST.
2. For each active user:
   - Aggregate the past 7 days of meals
   - Compute totals, averages, streaks, target hit rates
   - Call the Coach agent with this data to generate a narrative weekly summary
   - Save to memories layer='weekly' key='YYYY-Www'
   - Optionally send a Web Push notification "Your weekly summary is ready"
3. Same for monthly on the 1st of each month at 02:00 IST.
4. Schedule with pg_cron.
5. Display in trends view.
```

---

## Phase 5 — Nudge System (Week 7)

### Prompt 5.1 — Nudge tables, scheduler, and policy

```
Read CLAUDE.md and prompts/agents/NUDGE_GENERATOR.md.

Tasks:
1. Create supabase/migrations/0003_nudge_system.sql with:
   - nudge_schedules table (per-user config)
   - nudge_queue table (pending nudges to send)
   - nudge_history table (sent nudges with engagement)
2. Create src/lib/nudges/policy.ts:
   - decideNudge(user, context): returns Nudge | null
   - Implements: max 5/day, max 1 per 90 min, quiet hours, escalation rules (softer not louder)
3. Create src/lib/nudges/scheduler.ts:
   - selectUsersToNudge(now): returns users due for evaluation
4. Create supabase/functions/nudge-dispatcher/index.ts — runs every 15 min via pg_cron:
   - For each user due:
     - Load context
     - Apply policy → maybe a nudge
     - If yes: call Nudge Generator → message text
     - Insert into messages table with type='nudge'
     - Send Web Push to user devices
     - Log to nudge_history
5. Write extensive tests for the policy logic.
```

### Prompt 5.2 — Web Push subscription and delivery

```
Read CLAUDE.md.

Tasks:
1. Generate VAPID keys and add them to .env.local.example with instructions.
2. Create src/lib/push/vapid.ts that loads keys from env.
3. Create src/lib/push/send.ts using the web-push library:
   - sendNotification(subscription, payload)
   - sendToUser(userId, payload): looks up all subscriptions for the user
4. Create src/app/api/push/subscribe/route.ts — POST endpoint to register a push subscription.
5. Create src/app/api/push/unsubscribe/route.ts.
6. Create push_subscriptions table in a migration.
7. In the chat page, prompt the user to enable notifications on first visit (with a friendly explanation).
8. Service worker (public/sw.js) handles incoming pushes and notification clicks.
9. Test on mobile Chrome and iOS Safari (16.4+).
```

### Prompt 5.3 — Nudge Generator agent

```
Read CLAUDE.md and prompts/agents/NUDGE_GENERATOR.md.

Tasks:
1. Create src/lib/agents/nudge.ts.
2. Function: generateNudge({ user, kind, context }): returns a short nudge message (max 2 sentences) appropriate to kind.
3. Kinds: meal_check_in, hydration_reminder, end_of_day_summary, missed_log_followup, encouragement, gentle_reminder.
4. Uses Haiku.
5. Personalizes with user name, current context, and tone preferences.
6. Tests with mocked responses for each kind.
```

---

## Phase 6 — Beta Polish (Week 8+)

### Prompt 6.1 — Empty states, loading states, error handling

```
Read CLAUDE.md.

Audit every page and component. For each:
- Empty state with a helpful message and clear next action
- Loading skeleton matching the final layout
- Error state with retry option
- Offline state where applicable

Tasks:
1. Use shadcn Skeleton for loading states.
2. Create src/components/ui/EmptyState.tsx and src/components/ui/ErrorState.tsx.
3. Wire them into chat, today, trends, profile pages.
4. Test offline mode by toggling network in DevTools.
5. Add an offline indicator banner.
```

### Prompt 6.2 — Accessibility audit

```
Read CLAUDE.md. Run a full accessibility audit.

Use the accessibility-auditor sub-agent to scan the entire app. Address every finding:
- All interactive elements have accessible names
- Color contrast meets WCAG AA
- Focus visible everywhere
- Keyboard navigation works for the full chat flow
- Screen reader announces new chat messages
- Form errors are announced
- ARIA roles and live regions used appropriately

Run automated checks with @axe-core/playwright in CI.
```

### Prompt 6.3 — Prompt evaluation harness

```
Read CLAUDE.md.

Tasks:
1. Create scripts/eval-prompts.ts that runs each agent against a fixed test set.
2. Create tests/prompts/nutrition-estimator.json with 30 test cases covering:
   - Common Indian meals (10)
   - Edge cases: ambiguous, mixed-language, very small/large portions (10)
   - Safety checks: allergens and contraindications (10)
3. Each test case has: input, expected items (set), expected calorie range, expected confidence level, expected safety flags.
4. The eval script runs each case, scores accuracy, and outputs a markdown report.
5. CI runs the eval on every PR that touches prompts/agents/ and fails if accuracy drops by more than 5%.
6. Add a baseline.json that captures the current scores.
```

### Prompt 6.4 — Privacy, data export, account deletion

```
Read CLAUDE.md.

Tasks:
1. Add a "Privacy" section in the profile page.
2. Export my data: generates a JSON file with all user data (profile, meals, memories, logs) and downloads it.
3. Delete my account: 2-step confirmation, then deletes the user from auth.users (RLS cascade handles the rest).
4. Update the privacy policy and terms (placeholder docs).
5. Add a cookie/consent banner if needed for analytics.
6. DPDP compliance checklist documented in docs/PRIVACY.md.
```

---

## After Phase 6: launch checklist

- [ ] All tests passing (unit, e2e, prompts)
- [ ] Lighthouse PWA score 100
- [ ] Lighthouse accessibility 100
- [ ] Sentry receiving events
- [ ] PostHog receiving events
- [ ] Web Push working on iOS and Android
- [ ] Privacy policy live
- [ ] Terms of service live
- [ ] DPDP compliance verified
- [ ] Backup strategy documented
- [ ] Incident response runbook documented
- [ ] 10 beta users recruited and onboarded
- [ ] Feedback channel active (email or in-app)
