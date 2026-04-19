# Skill: Indian Food Estimation

> Load this skill when working on the Nutrition Estimator agent, the IFCT reference data, the meal templates, or any code that converts food descriptions into nutritional estimates. It codifies the domain knowledge that makes Nourish's estimates credible for Indian cuisine.

---

## Why Indian food is hard

1. **No standardized portions.** A "cup of rice" varies from 100g to 250g depending on the household.
2. **Preparation variance.** The same dish cooked at home vs a restaurant can differ by 50%+ in calories, mostly due to oil and ghee.
3. **Regional variation.** "Sambar" in Tamil Nadu ≠ "sambar" in Karnataka. "Dal" means different things in every state.
4. **Hidden calories.** Tarka (tempering) adds 50-100 kcal. Restaurant gravies use cashew paste and cream. Naan is brushed with ghee.
5. **Combo meals.** Indians eat thalis with 5-8 items. Estimating each item separately and summing is more accurate than estimating the meal as a whole.
6. **Seasonal and festival variation.** Navratri fasting food, Diwali sweets, Ramzan iftar — calorie patterns shift dramatically.

## Estimation heuristics

### Portion heuristics

| Container | Volume | Typical use |
|---|---|---|
| Standard katori (small bowl) | 150ml | Dal, sambar, sabzi, curd |
| Large katori | 200ml | Rajma, chole, curry |
| Standard plate | 22cm | Individual meal |
| Thali plate | 28cm | Full thali with sections |
| Cup (Indian household) | 200ml | Tea, coffee, milk |
| Glass (Indian household) | 250ml | Water, lassi, buttermilk |
| Spoon (Indian household) | ~7ml | Oil, ghee, sugar |

### Rice estimation from plate

| Description | Cooked weight | Kcal |
|---|---|---|
| "Small helping" / "little rice" | ~80g | ~105 |
| "Normal" / "1 cup" | ~150g | ~195 |
| "Full plate" / "lots of rice" | ~250g | ~325 |
| "Biryani plate" (heaped) | ~300g | ~390 (plus gravy/meat) |

### Roti/bread counting

| Item | Raw dough | Cooked kcal | Notes |
|---|---|---|---|
| Phulka (no oil) | ~25g | ~70 | Lightest |
| Roti (thin, no oil) | ~35g | ~90 | Standard home |
| Chapati (slight oil) | ~35g | ~100 | With ghee: +45 |
| Paratha (plain) | ~60g | ~180 | Layered with oil |
| Stuffed paratha | ~100g | ~230 | Aloo/paneer filling |
| Tandoori roti | ~60g | ~170 | Restaurant, thicker |
| Naan | ~90g | ~260 | Butter naan: ~310 |
| Puri | ~25g | ~90 | Deep fried |
| Bhatura | ~80g | ~300 | Deep fried, large |

### Oil assumptions by context

| Context | Oil per serving of sabzi | Notes |
|---|---|---|
| Health-conscious home | 1 tsp (~45 kcal) | User says "light oil" |
| Average home cooking | 1.5-2 tsp (~70-90 kcal) | Default if unknown |
| Rich home cooking | 2-3 tsp (~90-135 kcal) | "Generously cooked" |
| Dhaba/restaurant | 3-5 tsp (~135-225 kcal) | Always assume heavy |
| Street food | Variable, often deep-fried | Use deep-fry calculations |

### Cooking method multipliers

| Method | Calorie impact vs base | Example |
|---|---|---|
| Steamed / boiled | 1x (baseline) | Idli, plain rice, boiled egg |
| Dry-roasted | 1x-1.1x | Roasted papad, roasted peanuts |
| Sautéed / tempered | 1.2x-1.4x | Sabzi with tarka |
| Shallow-fried / pan-fried | 1.4x-1.6x | Egg bhurji, tawa paneer |
| Deep-fried | 1.8x-2.5x | Samosa, pakora, puri |
| Gravy (cream-based) | +150-300 kcal to base | Butter chicken, paneer butter masala |

### Restaurant vs home multiplier

When the user says "restaurant" or "from outside" or names a restaurant or delivery app:
- **Gravies:** Multiply home estimate by 1.3-1.5x
- **Fried items:** Same as home (already calorie-dense)
- **Rice dishes (biryani, pulao):** Multiply by 1.2-1.3x
- **Rotis/naans:** Add 45-80 kcal for ghee brushing
- **Drinks:** Café drinks are 2-3x home versions

## Handling ambiguity

### "I had dal rice"

This is the most common input and also the most ambiguous. What it could mean:
- 1 katori plain dal + 1 cup rice = ~330 kcal
- 1 katori dal tadka + 2 cups rice + ghee = ~600 kcal
- A full thali-style meal with dal, rice, sabzi, roti = ~700+ kcal

**Strategy:** If the user has patterns, use them. If not, assume a moderate "dal rice lunch" = 1 katori dal tadka + 1.5 cups rice ≈ 450-550 kcal. If confidence is below 0.6, ask: "Was that just dal and rice, or a fuller meal with sabzi and roti too?"

### "I had biryani"

| Qualifier | Estimate range |
|---|---|
| "Veg biryani, home" | 400-550 kcal |
| "Chicken biryani, restaurant, full plate" | 600-900 kcal |
| "Hyderabadi dum biryani" | 700-1100 kcal |
| "Biryani from outside" (no qualifier) | 500-1000 kcal → ASK |

**Strategy:** Biryani variance is too high to estimate blind. Ask one question: "Veg or non-veg? And roughly quarter, half, or full plate?"

### "I had a thali"

Decompose into components. A standard thali usually has:
- 2 rotis or 1 portion rice (~200 kcal)
- 1 katori dal (~175 kcal)
- 1 katori sabzi (~165 kcal)
- 1 small salad + papad (~60 kcal)
- Optional: curd, pickle, sweet

**Range:** 600-900 kcal for a typical home/office thali. Restaurant thalis: 800-1200.

### Fried vs not-fried disambiguation

When the user says "fried," determine:
- **Pan-fried (tawa):** bhindi sabzi, egg bhurji, tawa paneer — moderate oil
- **Shallow-fried:** cutlets, tikkis, some parathas — moderate-high oil
- **Deep-fried (tel mein):** samosa, pakora, puri, bhatura, vada — high oil

If ambiguous, ask: "Pan-fried or deep-fried?"

## Photo estimation guide

When analyzing a meal photo:

1. **Identify the plate.** Standard 22cm? Thali 28cm? Bowl? Banana leaf?
2. **Identify each item.** Work clockwise from the top of the photo.
3. **Estimate relative portions.** Item fills 1/4 of the plate? That's roughly one katori.
4. **Look for visual cues:**
   - Oily sheen on sabzi = generous oil
   - Visible ghee on roti = add 45 kcal per roti
   - Cream swirl on dal/curry = restaurant-style
   - Color of rice (yellow = biryani/pulao with fat, white = plain)
   - Garnish (fried onions on biryani = add 50 kcal)
5. **Check the hand/utensil for scale** if present.
6. **Default to moderate portions** if the photo is ambiguous. Err on the conservative side for the low end, liberal for the high end.

## Common mistakes to avoid

1. **Using Western food databases for Indian food.** MyFitnessPal's "dal" entry is often wrong for Indian dal. Trust the IFCT reference.
2. **Ignoring tarka.** Every dal and sambar has a tempering step with oil, mustard seeds, curry leaves, etc. This adds 50-100 kcal that doesn't show up in "plain cooked dal" data.
3. **Treating rotis as equal.** A home phulka (70 kcal) and a restaurant butter naan (310 kcal) are both "bread" but they're 4x apart.
4. **Forgetting chutneys and accompaniments.** Coconut chutney (50 kcal), pickle (20 kcal), raita (60 kcal), papad (45-90 kcal) — they add up.
5. **Guessing South Indian food with North Indian assumptions.** South Indian portions are often smaller per item (idli = 70 kcal vs roti = 90 kcal) but meals may have more items.
6. **Over-estimating salad.** Plain Indian salad (cucumber, tomato, onion, lemon) is 15-30 kcal. It's not a significant calorie source.
7. **Under-estimating sweets.** Indian sweets are extremely calorie-dense. One gulab jamun = 150 kcal. One laddu = 180 kcal. Festival meals can add 500+ kcal from sweets alone.

## Maintaining the IFCT reference

The `prompts/reference/IFCT_INDIAN_FOODS.md` file is the primary reference. When adding new entries:

1. Source from the IFCT 2017 database (Indian Council of Medical Research).
2. Cross-reference with USDA for non-Indian items.
3. Include per-100g values AND typical serving sizes.
4. Add regional tags where relevant.
5. Include cooking notes (preparation, oil usage, common variations).
6. Test the agent with the new entries before committing.

The `supabase/seed.sql` file has a parallel set of entries in the `ifct_foods` table for fuzzy-search lookups. Keep both in sync.
