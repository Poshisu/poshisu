# Nourish — Product Requirements Document

**Version:** 1.0 (MVP)
**Last updated:** May 1, 2026
**Owner:** Founder/PM

---

## 1. Vision

Make preventive health feel effortless by giving every person an AI nutrition coach that knows them deeply, nudges them gently, and gets smarter every day. Start with food logging — the hardest unsolved problem in consumer health — and expand from there.

## 2. Problem statement

In India, food logging is broken. The leading apps (HealthifyMe, Healthify Smart, MyFitnessPal) suffer from three systemic failures:

1. **Friction:** Manual search-and-select for every meal kills habit formation. Median 30-day retention in the category is under 15%.
2. **Inaccuracy on Indian food:** Global food databases don't represent regional dishes, cooking methods, or portion conventions. Calorie estimates are off by 30-50% on common meals.
3. **No real coaching:** Existing apps are loggers, not coaches. They tell you what you ate, not what to eat next, and they don't adapt to your specific patterns or constraints.

## 3. Target user

**Primary:** Urban Indian adults aged 25-45, who are health-aware, smartphone-native, possibly managing a metabolic condition (diabetes, PCOS, hypertension, prediabetes), and frustrated by existing apps.

**Personas:**
- **Aarti, 34, Bengaluru, software engineer.** PCOS, wants to lose 8 kg. Eats out 4 days a week. Has tried HealthifyMe twice, abandoned both times because logging her South Indian breakfasts was painful.
- **Rohit, 41, Mumbai, marketing director.** Type 2 diabetes diagnosed last year. Doctor told him to "watch carbs." Has no idea what that actually means meal-by-meal. Wants a coach, not a tracker.
- **Priya, 28, Delhi, designer.** Generally healthy, wants to optimize energy and sleep. Interested in protein and micronutrients. Will pay for quality.

## 4. MVP scope (what we are shipping)

### In scope
1. **PWA with chat-first UI** — installable on iOS and Android, works offline for viewing logs.
2. **Conversational onboarding** — collects baseline profile, medical conditions, goals, eating patterns, and preferences. Progressive disclosure: 6 mandatory questions upfront, the rest surfaced as the agent learns.
3. **Multimodal meal logging** — text, photo, voice. Returns structured nutritional estimates with ranges.
4. **Layered memory system** — profile, patterns, current context, daily logs, weekly/monthly summaries.
5. **Proactive nudges** — meal-time check-ins, hydration reminders, end-of-day summary, with frequency caps and smart escalation rules.
6. **Today view** — running totals, logged meals, daily radar chart.
7. **Trends view** — weekly and monthly views with line charts and spider charts.
8. **Memory inspector** — user can see and edit what the agent remembers about them.
9. **"What should I eat next?" recommendations** — contextual, considers profile, today's intake, and constraints.
10. **Web Push notifications** — for nudges when the app isn't open.
11. **Medical safety guardrails** — agent never suggests foods conflicting with declared conditions or allergies.

### Out of scope (Phase 2+)
- Wearable integration (Apple Health, Google Fit, Oura, Whoop)
- Diagnostic test integration (lab booking, result parsing)
- Mental wellness pillar
- Native iOS/Android apps (PWA wrapper later)
- Swiggy/Zomato order parsing (designed for, but not built)
- WhatsApp interface (designed for, but not built)
- Payments and subscriptions
- Community features
- Practitioner referrals

## 5. Success metrics

| Metric | Target (90 days post-launch) |
|---|---|
| Activation (completed onboarding + 1 meal logged) | 60% of signups |
| Day-7 retention | 40% |
| Day-30 retention | 25% |
| Avg meals logged per active user per day | 2.5 |
| User-reported nutrition estimate accuracy (1-5 scale) | 4.0+ |
| Time from "send food photo" to "estimate received" (p50) | < 12 seconds |
| Nudge engagement rate (responded within 60 min) | 30% |

## 6. Functional requirements

### 6.1 Authentication
- Email/password and Google OAuth via Supabase Auth.
- Magic link email backup.
- Session persists 30 days.
- Logout clears all client state.

### 6.2 Onboarding
- 6 mandatory questions on first session: name, age, gender, height/weight, primary goal, medical conditions, allergies.
- 8 progressive questions surfaced over the first week as conversational asks during normal interactions.
- Generates a `profile.md` for the user at the end of mandatory onboarding.
- User sees and can edit their generated profile before confirming.


### 6.2.1 Phase 1 onboarding spec (chat-first, mandatory for launch)

**Mandatory onboarding fields (must be captured before user is marked onboarded):**
1. First name (preferred display name).
2. Age range (`18-24`, `25-34`, `35-44`, `45-54`, `55+`).
3. Sex (`female`, `male`, `intersex`, `prefer_not_to_say`) for nutrition calculations where relevant.
4. Height + weight (metric with unit normalization).
5. Primary goal (`fat_loss`, `glucose_control`, `maintenance`, `muscle_gain`, `energy`).
6. Medical conditions (multi-select + free text fallback).
7. Allergies/intolerances (multi-select + free text fallback).
8. Dietary preference (`veg`, `eggetarian`, `non_veg`, `vegan`, `jain`, `other`).

**Optional progressive fields (collected after activation through normal chat):**
- Typical wake/sleep time window.
- Typical meal timing window (breakfast/lunch/dinner slots).
- Cuisine and staple preference (regional patterns).
- Cooking context (home-cooked, office cafeteria, delivery-heavy).
- Oil/ghee usage pattern for home food.
- Portion confidence level (`low`, `medium`, `high`).
- Hydration baseline and water reminder preference.
- Budget/access constraints (e.g., can order food vs must cook).

**Completion rule for onboarding (Phase 1):**
- Onboarding status changes to `complete` only when:
  - all mandatory fields validate,
  - consent + safety acknowledgment are accepted, and
  - at least one successful `profile.md` memory write is confirmed.
- If any step fails (validation or memory write), status remains `in_progress` and user returns to the missing checkpoint in chat.

**Exact user-facing consent copy (must match app UI):**
> "I consent to Nourish using my health and meal information to personalize coaching. I understand Nourish is not a medical provider and does not replace professional advice."

**Exact user-facing safety copy (must match app UI):**
> "Safety check: I will not rely on Nourish for emergency or urgent medical decisions. If I feel unwell or unsafe, I will contact a licensed clinician or local emergency services."

**Phase 1 explicit non-goals (not in launch scope):**
- No diagnosis, treatment planning, medication dosing, or emergency triage.
- No wearable ingestion (Apple Health, Google Fit, Oura, Whoop).
- No external ordering integrations (Swiggy/Zomato).
- No multilingual onboarding (English-only in Phase 1).
- No proactive voice calls or WhatsApp bot onboarding.

**Required UX states for onboarding checkpoints:**
- **Loading:** "Saving your profile…" with disabled actions and visible progress.
- **Empty (no answer yet):** "Tell me a bit about this so I can personalize your plan."
- **Error (recoverable):** "I couldn't save that yet. Please try again." + `Retry` action.
- **Success:** "You're all set — your personalized coaching is ready." + continue CTA to chat.

### 6.3 Meal logging
- **Photo:** User uploads or captures a photo. Agent identifies dishes, estimates portions and macros. Returns within 15 seconds.
- **Voice:** User records a voice note (max 60 sec). Transcribed by ElevenLabs Scribe v2, then parsed by Claude.
- **Text:** Free-form typing. Agent extracts meal items.
- **Quick re-log:** "Same as yesterday's lunch" or tap a previous meal to log again.
- **Confirmation flow:** Agent shows estimate as a card. User can confirm, edit, or correct.
- **Ranges over points:** All estimates are presented as ranges (e.g., 550-650 kcal) unless the user has high-confidence portion data.

### 6.4 Memory
- **profile.md** (stable): basic info, conditions, goals, preferences.
- **patterns.md** (slow-evolving): observed habits, typical meals, language quirks.
- **current_context.md** (transient): travel, special diet phases, holiday mode.
- **daily/YYYY-MM-DD.md** (granular): every meal, water, mood notes, conversation snippets.
- **weekly/YYYY-WW.md** and **monthly/YYYY-MM.md** (aggregations).
- All memory is markdown stored in a Postgres table with versioning.
- Background consolidator runs daily and weekly to update patterns and produce summaries.

### 6.5 Semantic dictionary
- Per-user mapping of how they refer to things ("my usual chai" → "tea with full-fat milk and 1 tsp sugar").
- Built incrementally as the agent asks clarifying questions and the user answers.
- Read into context for every meal logging interaction.

### 6.6 Nudges
- Configurable schedule based on onboarding answers (typical meal times).
- Default: morning hydration, breakfast/lunch/dinner check-ins, evening summary. **Maximum 5 nudges per day.**
- **Frequency cap:** Never more than 1 nudge per 90 minutes.
- **Escalation:** If a nudge is ignored, the next one is softer, not louder.
- **Quiet hours:** No nudges between 22:00 and 07:00 user-local time (configurable).
- **Web Push** for delivery when app isn't open. In-chat fallback for missed nudges.

### 6.7 Today view
- Date selector (today by default).
- Running totals: kcal, protein, carbs, fat, fiber, water.
- Targets vs actual, color-coded.
- Logged meals as cards, tappable to edit/delete.
- Daily radar chart with 6 axes: protein, fiber, hydration, micros, balance, consistency.

### 6.8 Trends view
- Week / Month / 3-Month tabs.
- Line charts for daily kcal, macro ratios, water.
- Radar chart for the period (averaged).
- Insight cards: "You hit your protein goal 5 of 7 days last week," "Lunch is your most consistent meal."
- Streaks and consistency metric.

### 6.9 Profile / Memory Inspector
- View `profile.md` rendered.
- View `patterns.md` rendered with edit per-line.
- View `current_context.md` with set/clear button.
- "Forget this about me" button per item.
- Update goals, conditions, allergies.
- Configure nudge preferences and quiet hours.

### 6.10 "What should I eat next?"
- Available in chat as a quick-action chip and as an explicit question.
- Considers: today's intake so far, daily targets, profile constraints, current context, time of day, and any user-stated input (e.g., "I have paneer and tomatoes at home" or "I want to order from Punjab Grill").
- Returns 2-3 options with rough nutritional impact and reasoning.

## 7. Non-functional requirements

- **Performance:** Chat response p50 < 4 seconds for text, < 12 seconds for image. Page load < 2 seconds.
- **Accessibility:** WCAG 2.2 AA. Screen reader friendly. Keyboard navigable. Color contrast verified.
- **PWA:** Installable, works offline for viewing past data, push notifications.
- **Security:** RLS on all tables. No PII in logs. HTTPS only. CSP headers.
- **Privacy:** DPDP Act compliant. User can export and delete all their data.
- **Reliability:** 99.5% uptime SLA from Vercel + Supabase. Graceful degradation when LLM is slow.
- **Cost ceiling:** < $0.30 per active user per month at 1,000 DAU.

## 8. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Nutrition estimates inaccurate for Indian food | Curated IFCT reference, prompt-engineered with regional variations, user feedback loop, ranges instead of points |
| LLM cost runs away | Aggressive Haiku routing, prompt caching, per-user daily token budgets, alerting |
| User abandons after Day 1 | Strong activation flow, immediate value from first meal log, smart nudges, "what should I eat" hook |
| Medical liability from a bad recommendation | Hard safety rules in code + prompts, clear ToS, never claim to provide medical advice, escalate to professional when patterns warrant |
| Privacy breach | RLS everywhere, audit logging, encrypted at rest, no third-party data sharing, DPDP compliance |
| Vendor lock-in | Standard protocols, exportable data, no proprietary formats |

## 9. Open questions

1. Should we charge from day one or stay free during beta? **Decision: free during beta, monetize at 1k DAU.**
2. Multilingual support (Hindi, Tamil, etc.)? **Decision: English-only for MVP, add Hindi in Phase 2.**
3. Should the memory inspector be a Phase 1 feature or Phase 2? **Decision: Phase 1 — it's a trust differentiator.**
4. How do we handle "I don't know what I ate" (vague meal descriptions)? **Decision: Agent asks 1-2 clarifying questions, then commits to a wider range.**
