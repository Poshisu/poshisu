# Nourish — Onboarding Flow

The onboarding question set is split into **mandatory** (asked upfront, must complete to use the app) and **progressive** (surfaced contextually as the agent learns from real interactions).

## Design principles

1. **Onboarding is a conversation, not a form.** Each step is one focused question with helpful context.
2. **Mandatory is short.** Six questions only. Anything else is asked when there's a natural moment.
3. **Show the value immediately.** After mandatory onboarding, the user gets to chat. The first interaction should feel personalized.
4. **Progressive disclosure works backwards.** Instead of asking "how oily do you usually eat?" upfront, the agent learns this from the first few meal logs and asks only when ambiguity matters.
5. **Always editable.** Anything captured can be changed later in the profile/memory inspector.

---

## Mandatory questions (6 steps, ~4 minutes)

### Step 1 — Basics

> "Let's start with the basics. What should I call you?"

- **name** (text, required)
- **age** (number, 13-100, required)
- **gender** (select: female, male, non-binary, prefer not to say, required)

### Step 2 — Body

> "These help me set realistic targets for you. You can update them anytime."

- **height_cm** (number, 100-250, required)
- **weight_kg** (number, 25-250, required)
- **city** (text, optional — used later for time zones and local food context)

### Step 3 — Goal

> "What's the main thing you're hoping to get from this?"

- **primary_goal** (single select, required):
  - Lose weight
  - Gain weight / build muscle
  - Maintain weight, eat better
  - Manage a health condition
  - General wellness and energy
- **goal_target** (number, conditional on weight loss/gain — target weight in kg)
- **goal_timeline_weeks** (number, conditional — how many weeks to target)

### Step 4 — Medical (the most important one)

> "Do you have any health conditions I should know about? This helps me give you safer guidance."

- **conditions** (multi-select, required — empty list is fine):
  - Type 2 diabetes
  - Type 1 diabetes
  - Prediabetes
  - PCOS / PCOD
  - Hypertension
  - High cholesterol
  - Thyroid (hypo/hyper)
  - Fatty liver
  - IBS / GERD
  - Kidney disease
  - Pregnancy / breastfeeding
  - Other (text)
- **medications_affecting_diet** (text, optional — e.g., metformin, statins, blood thinners)

### Step 5 — Allergies and hard nos

> "Any foods you can't or don't eat?"

- **dietary_pattern** (single select, required):
  - Vegetarian
  - Vegetarian + eggs
  - Non-vegetarian
  - Vegan
  - Jain
  - Pescetarian
  - No restrictions
- **allergies** (multi-select with "add custom"):
  - Peanuts
  - Tree nuts
  - Dairy
  - Eggs
  - Wheat / gluten
  - Soy
  - Shellfish
  - Fish
  - Sesame
  - Other (text input, multiple)
- **dislikes** (text, optional — "things you'd rather not have suggested")

### Step 6 — How you eat

> "Last one. Tell me a bit about how you usually eat."

- **typical_meal_times** (composite — 4 time pickers with checkboxes for whether they're typical):
  - breakfast (default 08:00, checked)
  - lunch (default 13:00, checked)
  - dinner (default 20:00, checked)
  - snacks (default 17:00, unchecked by default)
- **eating_context** (single select):
  - Mostly cook at home
  - Mix of home and ordering
  - Mostly order in or eat out
  - It varies a lot
- **estimation_preference** (single select, with helpful explainer text):
  - Conservative (lower estimates — better for tracking weight loss)
  - Midpoint (best guess)
  - Liberal (higher estimates — better if you want safety margin)

---

## Progressive questions (asked contextually over the first 1-2 weeks)

These are NOT in the wizard. They are surfaced by the agent at natural moments. Each has a trigger condition.

### P1 — Variance

**Trigger:** After 5 meals are logged, the consolidator detects whether the user's meals are repetitive or varied.

**How it's asked:** Not asked at all in most cases. The agent observes: if 3 of the last 5 breakfasts are the same dish, set `meal_variance: 'low'` automatically. If breakfasts span 5 different dishes, set `meal_variance: 'high'`. If unclear, the agent may ask conversationally: *"I've noticed you've had quite different meals over the last few days. Is that typical for you, or unusual?"*

**Captures:** `meal_variance` (low / medium / high)

### P2 — Oil and prep preferences

**Trigger:** First meal logged where the agent's estimate has high uncertainty about oil content (e.g., a sabzi from a restaurant where the oil amount is ambiguous).

**How it's asked:** *"For dishes you cook at home, would you say you use light, moderate, or generous amounts of oil and ghee? This helps me get closer to the truth."*

**Captures:** `home_cooking_oil_preference` (light / moderate / generous), `restaurant_oil_assumption` (light / moderate / heavy / variable)

### P3 — Portion awareness

**Trigger:** First time the user corrects the agent's portion estimate by a large margin (e.g., the agent says "1 cup of rice" and the user says "more like 2 cups").

**How it's asked:** *"Thanks for the correction! Just to calibrate — how confident do you feel estimating portion sizes in general? It helps me know when to ask vs assume."*

**Captures:** `portion_confidence` (not confident / somewhat / very confident)

### P4 — Hydration tracking

**Trigger:** First time the user mentions water (or after Day 3 if they haven't).

**How it's asked:** *"Want me to track your water intake too? I can remind you a few times a day if it'd help. Roughly how much water do you usually drink?"*

**Captures:** `track_hydration` (boolean), `daily_water_target_ml` (number)

### P5 — Snack pattern

**Trigger:** End of Day 7.

**How it's asked:** *"I've noticed you sometimes [eat / don't eat] between meals. Do you usually snack? It helps me time my check-ins better."*

**Captures:** `snacks_typical` (yes / no / sometimes), `typical_snack_times` (list of times)

### P6 — Beverage habits

**Trigger:** First time the user logs a beverage with sugar, OR proactively after first 3 days.

**How it's asked:** *"Quick one — your chai/coffee, do you take it with sugar? And how many cups a day, roughly?"*

**Captures:** `beverages` (structured: chai/coffee with sugar/milk type/cups per day)

### P7 — Eating out frequency

**Trigger:** When the user mentions ordering or eating out, OR after Day 5.

**How it's asked:** *"Roughly how often do you eat out or order in during a typical week?"*

**Captures:** `eat_out_per_week` (number)

### P8 — Nudge tone preference

**Trigger:** After the first nudge interaction (when the user responds or doesn't).

**How it's asked:** *"Quick check — do you prefer my nudges to be more 'gentle reminder' or more 'direct accountability'? You can change this anytime."*

**Captures:** `nudge_tone` (gentle / friendly / direct)

---

## After mandatory onboarding

1. The structured answers are sent to the **Onboarding Parser** agent (Haiku).
2. The agent generates a `profile.md` in the canonical format (see `prompts/agents/ONBOARDING_PARSER.md`).
3. The user is shown the generated profile with an "Edit" option.
4. Once confirmed, the profile is saved to the `memories` table.
5. An empty `patterns.md` is created.
6. The user is dropped into the chat with an opening message from the agent that references something specific from their profile to feel personal:

> "Hey Aarti! I've got your profile set up. With your PCOS goal, I'll especially watch your protein and fiber, and I'll keep an eye out for refined carbs. Want to start by logging what you had for lunch today? You can send a photo, voice note, or just type it."

---

## Profile data shape (what the parser receives)

```ts
type OnboardingAnswers = {
  // Step 1
  name: string;
  age: number;
  gender: 'female' | 'male' | 'non-binary' | 'prefer-not-to-say';

  // Step 2
  height_cm: number;
  weight_kg: number;
  city?: string;

  // Step 3
  primary_goal: 'lose-weight' | 'gain-weight' | 'maintain' | 'manage-condition' | 'wellness';
  goal_target_kg?: number;
  goal_timeline_weeks?: number;

  // Step 4
  conditions: Condition[]; // typed enum
  conditions_other?: string;
  medications?: string;

  // Step 5
  dietary_pattern: 'veg' | 'veg-egg' | 'non-veg' | 'vegan' | 'jain' | 'pescetarian' | 'none';
  allergies: string[]; // standardised + custom
  dislikes?: string;

  // Step 6
  meal_times: {
    breakfast?: string; // "HH:mm"
    lunch?: string;
    dinner?: string;
    snacks?: string;
  };
  eating_context: 'home' | 'mixed' | 'out' | 'varies';
  estimation_preference: 'conservative' | 'midpoint' | 'liberal';
};
```
