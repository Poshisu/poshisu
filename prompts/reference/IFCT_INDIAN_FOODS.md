# IFCT Indian Food Reference (v2: with critical micronutrients)

> This file is loaded into the agent context as cached reference data. The code pipeline uses the `ifct_foods` Postgres table for actual lookup, but this file helps the identification agent understand what foods exist and how to name them for best fuzzy-match performance.

---

## Tracked nutrients

| Nutrient | Why it matters | Daily target (adult) | Common Indian deficiency? |
|---|---|---|---|
| **Calories (kcal)** | Energy balance | Varies by goal | — |
| **Protein (g)** | Muscle, satiety, repair | 0.8-1.2g per kg bodyweight | Yes — especially vegetarians |
| **Carbs (g)** | Energy, fiber source | ~45-55% of calories | No — often over-consumed |
| **Fat (g)** | Hormones, absorption | ~25-30% of calories | No |
| **Fiber (g)** | Gut health, blood sugar | 25-35g | Yes — processed food diets |
| **B12 (mcg)** | Nerves, red blood cells | 2.4 mcg | **Very common** in vegetarians |
| **Calcium (mg)** | Bones, muscles, nerves | 1000 mg | **Very common** across India |
| **Vitamin D (mcg)** | Calcium absorption, immunity | 15 mcg (600 IU) | **Extremely common** — 70-90% of Indians |
| **Potassium (mg)** | Heart, blood pressure, muscles | 2600-3400 mg | Common — processed food replaces whole food |
| **Omega-3 (g)** | Heart, brain, inflammation | 1.1-1.6g ALA or 250-500mg EPA+DHA | **Very common** — low fish intake |

## Why these five micros

These five were chosen because they represent the most prevalent and impactful nutrient deficiencies in the Indian population. Vitamin D deficiency affects up to 90% of urban Indians. B12 deficiency is near-universal among vegetarians (60%+ of the population). Calcium intake is well below RDA for most Indians. Potassium is under-consumed when processed food replaces whole grains and vegetables. Omega-3 is chronically low in populations with limited fish consumption.

Tracking these five — even approximately — gives users far more actionable insight than tracking calories alone.

---

## Key food sources for tracked micronutrients

### B12 (critical for vegetarians — 60%+ of Indian users)
- **Rich sources:** Eggs (1.1 mcg/egg), paneer (0.8/100g), curd (0.4/100g), milk (0.5/100g), fish (2-5/100g), chicken liver (16/100g)
- **Absent from:** All plant foods unless fortified
- **Coaching note:** For vegetarian users, flag when daily B12 intake is consistently low. Suggest dairy, eggs (if acceptable), or fortified foods.

### Calcium
- **Rich sources:** Milk (125mg/100ml), curd (149mg/100g), paneer (208mg/100g), ragi/finger millet (344mg/100g), sesame seeds (975mg/100g), amaranth leaves (397mg/100g), dried figs (162mg/100g)
- **Moderate:** Dal (40-55mg/100g), green leafy vegetables (varies widely)
- **Low:** Rice, wheat, most fruits
- **Coaching note:** Ragi is a calcium powerhouse — suggest ragi dosa or ragi porridge for users with low calcium.

### Vitamin D
- **Rich sources:** Fatty fish (salmon 11mcg/100g, mackerel 8mcg/100g), egg yolk (1.8mcg/yolk), fortified milk, mushrooms exposed to UV
- **Reality:** Almost impossible to meet through Indian diet alone. Most Indians are deficient.
- **Coaching note:** Flag this as a gap, suggest sunlight exposure and consider supplementation discussion with doctor. Don't pretend food alone will fix it.

### Potassium
- **Rich sources:** Banana (358mg/100g), coconut water (250mg/250ml), potato (421mg/100g), sweet potato (337mg/100g), spinach (558mg/100g), dal/legumes (280-400mg/100g), tomato (237mg/100g), curd (234mg/100g)
- **Moderate:** Most vegetables and fruits
- **Low:** Rice, refined wheat, oil
- **Coaching note:** Indian vegetarian diets are often adequate if they include enough dal, vegetables, and fruit. Processed food reduces potassium.

### Omega-3 (ALA from plants, EPA/DHA from fish)
- **Rich plant sources (ALA):** Flaxseed (22.8g/100g), chia seeds (17.5g/100g), walnuts (9.1g/100g), mustard oil (5.9g/100ml)
- **Rich fish sources (EPA+DHA):** Salmon (2.3g/100g), mackerel (2.6g/100g), sardines (1.5g/100g), hilsa/ilish (1.8g/100g)
- **Coaching note:** Mustard oil (common in Bengali and Eastern Indian cooking) is one of the best plant sources. Flag it positively when detected.

---

## Food tables (per 100g unless noted)

### Cereals & grains

| Food | kcal | P | C | F | Fiber | B12 | Ca | VitD | K | Ω3 | Serving |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Rice, white, cooked | 130 | 2.7 | 28 | 0.3 | 0.4 | 0 | 10 | 0 | 35 | 0 | 1 cup ≈ 150g |
| Roti / chapati | 264 | 8.0 | 50 | 3.7 | 6.0 | 0 | 48 | 0 | 120 | 0 | 1 medium ≈ 35g |
| Idli | 135 | 4.0 | 28 | 0.5 | 0.8 | 0 | 16 | 0 | 45 | 0 | 1 piece ≈ 50g |
| Plain dosa | 168 | 4.5 | 29 | 3.7 | 1.2 | 0 | 18 | 0 | 60 | 0 | 1 piece ≈ 80g |
| Poha | 190 | 3.5 | 38 | 3.0 | 1.5 | 0 | 12 | 0 | 50 | 0 | 1 plate ≈ 150g |
| Ragi (finger millet) | 328 | 7.3 | 72 | 1.3 | 3.6 | 0 | 344 | 0 | 408 | 0 | — |
| Puri | 355 | 7.5 | 45 | 16.5 | 2.5 | 0 | 20 | 0 | 80 | 0 | 1 piece ≈ 25g |
| Naan, plain | 290 | 9.0 | 50 | 5.5 | 2.0 | 0 | 35 | 0 | 90 | 0 | 1 piece ≈ 90g |

### Pulses & legumes (cooked, per 100g)

| Food | kcal | P | C | F | Fiber | B12 | Ca | VitD | K | Ω3 | Serving |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Toor dal | 116 | 7.0 | 20 | 0.8 | 4.5 | 0 | 55 | 0 | 280 | 0 | 1 katori ≈ 150ml |
| Moong dal | 105 | 7.5 | 18 | 0.5 | 3.0 | 0 | 38 | 0 | 260 | 0 | 1 katori |
| Rajma curry | 140 | 8.5 | 23 | 1.5 | 7.0 | 0 | 50 | 0 | 405 | 0.1 | 1 katori ≈ 200g |
| Chole | 164 | 9.0 | 27 | 2.5 | 7.5 | 0 | 49 | 0 | 291 | 0.1 | 1 katori |
| Sambar | 85 | 4.5 | 12 | 2.5 | 3.0 | 0 | 35 | 0 | 180 | 0 | 1 katori ≈ 200g |

### Dairy

| Food | kcal | P | C | F | Fiber | B12 | Ca | VitD | K | Ω3 | Serving |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Paneer | 265 | 18.3 | 1.2 | 20.8 | 0 | 0.8 | 208 | 0 | 100 | 0.1 | 25g cube |
| Curd, full fat | 60 | 3.1 | 4.7 | 3.3 | 0 | 0.4 | 149 | 0 | 234 | 0.04 | 1 katori ≈ 100g |
| Milk, whole | 67 | 3.3 | 4.8 | 4.1 | 0 | 0.5 | 125 | 1.0 | 150 | 0.05 | 1 glass ≈ 200ml |
| Ghee | 900 | 0 | 0 | 100 | 0 | 0 | 0 | 0 | 0 | 0.3 | 1 tsp ≈ 5g |
| Chai (sugar, milk) | 75 | 1.5 | 11 | 2.5 | 0 | 0.2 | 50 | 0.3 | 60 | 0 | 1 cup ≈ 150ml |

### Eggs & non-veg

| Food | kcal | P | C | F | Fiber | B12 | Ca | VitD | K | Ω3 | Serving |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Egg, whole, boiled | 155 | 12.6 | 1.1 | 10.6 | 0 | 1.1 | 56 | 1.8 | 126 | 0.1 | 1 large ≈ 50g |
| Chicken breast | 165 | 31.0 | 0 | 3.6 | 0 | 0.3 | 15 | 0.1 | 256 | 0.1 | per 100g |
| Fish (rohu/katla) | 130 | 23.0 | 0 | 4.0 | 0 | 2.5 | 50 | 3.0 | 300 | 0.3 | per 100g |
| Hilsa/Ilish | 310 | 22.0 | 0 | 25.0 | 0 | 5.0 | 60 | 4.5 | 350 | 1.8 | per 100g |
| Mackerel (bangda) | 205 | 20.0 | 0 | 14.0 | 0 | 8.7 | 12 | 8.0 | 314 | 2.6 | per 100g |

### Micronutrient powerhouses (the foods to flag positively)

| Food | Star nutrient | Amount per serving | Notes |
|---|---|---|---|
| Ragi/finger millet | Calcium | 344mg/100g | Ragi dosa, ragi porridge — suggest to calcium-deficient users |
| Flaxseed | Omega-3 (ALA) | 22.8g/100g | 1 tbsp daily = significant omega-3 boost |
| Sesame seeds | Calcium | 975mg/100g | In chutney, til laddu, garnish |
| Hilsa/Ilish fish | B12, Omega-3, Vitamin D | B12: 5mcg, Ω3: 1.8g/100g | Bengali staple — flag positively |
| Mackerel (bangda) | B12, Vitamin D, Omega-3 | B12: 8.7mcg, D: 8mcg/100g | Coastal Indian fish |
| Amaranth leaves | Calcium, Potassium | Ca: 397mg, K: 610mg/100g | Common South Indian green |
| Eggs | B12, Vitamin D | B12: 1.1mcg, D: 1.8mcg/egg | Most accessible B12 for vegetarians+egg |
| Mushrooms (UV-exposed) | Vitamin D | Up to 10mcg/100g if sun-dried | Rare food source of vitamin D |
| Walnuts (akhrot) | Omega-3 (ALA) | 9.1g/100g | 5-6 walnuts ≈ 1g ALA |
| Mustard oil | Omega-3 (ALA) | 5.9g/100ml | Common in Bengali/Eastern Indian cooking |

---

## How the code pipeline uses this data

1. **Stage 2 (Lookup):** The identification agent returns item names. The code fuzzy-matches against the `ifct_foods` Postgres table (which has the same data in structured form). If no match, fall back to generic category estimates.

2. **Stage 3 (Adjustment):** Multiply base values by `cooking_multipliers` and `source_multipliers` tables. Apply user `portion_bias` from `user_features`. Compute ranges.

3. **Stage 4 (Micronutrient flagging):** For each of the 5 tracked micros, check if the meal is:
   - **Rich** (>25% of daily target in one meal) → flag as `rich:calcium`, etc.
   - **Notable source** (>10% of daily target) → mention it positively in the response
   - If the user's daily total is trending low over the past 7 days, mention it in insights

4. **The radar chart axes** (Today view) now include:
   - Calorie balance, Protein, Fiber, Hydration (same as before)
   - Replace "Diversity" and "Consistency" with: **Micronutrient coverage** (how many of the 5 tracked micros are at >50% of target) and **Dietary variety** (food group diversity)

---

## Heuristics (unchanged from v1)

- **Plate sizes:** Standard Indian thali ≈ 28cm. Small steel plate ≈ 22cm.
- **Katori:** Standard ≈ 150ml. Restaurant 100-200ml.
- **Roti weight:** 30-40g dough → 80-110 kcal.
- **Restaurant vs home:** Gravies 30-50% higher in calories from oil/butter/cream.
- **Tea/coffee:** Home chai 75-115 kcal. Café latte 190 kcal. Café frappe 340 kcal.
- **Hidden ghee:** Dhaba rotis often have ghee. Ask if uncertain.
- **Fried disambiguation:** Pan-fried ≈ 50% the oil of deep-fried.
