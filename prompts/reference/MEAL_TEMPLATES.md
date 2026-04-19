# Common Indian Meal Templates

> Reference data for the Nutrition Estimator. When a user describes a meal vaguely, match it to one of these templates and adjust based on their specifics. These are realistic averages for adult portions.

---

## Breakfast templates

### South Indian breakfast — idli + sambar + chutney
- 2 idlis + 1 katori sambar + 2 tbsp coconut chutney
- ~310 kcal, 9g P, 55g C, 6g F, 5g fiber

### Idli-vada combo
- 2 idlis + 1 medu vada + 1 katori sambar + chutney
- ~440 kcal, 13g P, 70g C, 12g F, 7g fiber

### Masala dosa with sambar and chutney
- 1 masala dosa + 1 katori sambar + chutney
- ~480 kcal, 11g P, 70g C, 17g F, 6g fiber

### Plain dosa
- 1 plain dosa + sambar + chutney
- ~310 kcal, 8g P, 55g C, 7g F, 4g fiber

### Poha plate
- 1 plate of poha (~150g) + chai with sugar
- ~400 kcal, 6g P, 60g C, 12g F, 3g fiber

### Upma plate
- 1 plate upma (~150g) + chai
- ~380 kcal, 7g P, 50g C, 13g F, 3g fiber

### Aloo paratha breakfast
- 1 aloo paratha with ghee + curd + pickle
- ~330 kcal, 9g P, 40g C, 14g F, 4g fiber

### 2 parathas + sabzi + curd
- 2 plain parathas + 1 katori sabzi + curd
- ~590 kcal, 16g P, 65g C, 25g F, 7g fiber

### Bread, eggs, chai
- 2 slices bread + 2 egg omelette + chai
- ~440 kcal, 18g P, 35g C, 22g F, 3g fiber

### Cornflakes/oats with milk
- 1 bowl oats with milk + 1 banana
- ~290 kcal, 11g P, 50g C, 5g F, 6g fiber

---

## Lunch templates (standard veg thali)

### North Indian thali (home)
- 2 rotis + 1 katori dal + 1 katori sabzi + rice (small) + curd + salad + papad
- ~720 kcal, 22g P, 110g C, 18g F, 12g fiber

### South Indian meals (home)
- Rice + sambar + rasam + 1 sabzi + curd + papad + pickle
- ~680 kcal, 18g P, 115g C, 12g F, 8g fiber

### Bengali fish lunch
- Rice + dal + 1 fish curry + 1 sabzi
- ~750 kcal, 30g P, 100g C, 18g F, 6g fiber

### Punjabi dhaba lunch
- 2 tandoori rotis + dal makhani + paneer butter masala + rice + salad
- ~1100 kcal, 32g P, 120g C, 50g F, 14g fiber

### Office tiffin (light)
- 2 rotis + 1 sabzi + small rice + dal
- ~520 kcal, 16g P, 80g C, 12g F, 9g fiber

### Rajma chawal
- 1 katori rajma + 1.5 cups rice
- ~620 kcal, 18g P, 105g C, 9g F, 12g fiber

### Chole bhature
- 2 bhature + 1 katori chole + onions
- ~950 kcal, 22g P, 110g C, 42g F, 12g fiber

### Biryani lunch (chicken, restaurant)
- 1 plate chicken biryani + raita + salad
- ~720 kcal, 28g P, 75g C, 30g F, 4g fiber

---

## Dinner templates

### Light home dinner — khichdi
- 1 katori moong dal khichdi + curd + papad
- ~440 kcal, 14g P, 65g C, 12g F, 8g fiber

### Roti + sabzi + dal dinner
- 2 rotis + 1 katori sabzi + 1 katori dal + salad
- ~520 kcal, 17g P, 70g C, 16g F, 11g fiber

### Restaurant Chinese (Indo-Chinese)
- 1 plate chicken fried rice + 2 manchurian
- ~870 kcal, 25g P, 100g C, 38g F, 4g fiber

### Pizza (medium veg)
- 4 slices medium veg pizza
- ~840 kcal, 30g P, 110g C, 28g F, 6g fiber

### Pasta dinner
- 1 plate pasta in red sauce
- ~520 kcal, 18g P, 75g C, 14g F, 6g fiber

---

## Snack templates

### Evening chai + biscuits
- 1 cup chai + 4 marie biscuits
- ~190 kcal, 4g P, 30g C, 6g F, 1g fiber

### Samosa snack
- 1 samosa + chai + chutney
- ~290 kcal, 7g P, 35g C, 14g F, 3g fiber

### Bhel puri
- 1 plate bhel puri (street style)
- ~320 kcal, 8g P, 50g C, 10g F, 5g fiber

### Pani puri
- 6 pieces pani puri (street)
- ~280 kcal, 6g P, 50g C, 6g F, 4g fiber

### Fruit snack
- 1 apple + 10 almonds
- ~140 kcal, 3g P, 22g C, 6g F, 5g fiber

---

## Drinks (commonly under-logged)

| Drink | Avg kcal | Notes |
|---|---|---|
| 1 cup chai with sugar | ~115 | Most users have 2-4/day |
| 1 cup filter coffee with sugar/milk | ~105 | |
| 1 glass sweet lassi | ~275 | Heavy |
| 1 glass nimbu pani (sweet) | ~95 | |
| 1 glass coconut water | ~50 | |
| 1 glass packaged juice | ~140 | |
| 1 can soft drink | ~140 | |
| 1 cappuccino (cafe) | ~140 | |
| 1 latte (cafe) | ~190 | |
| 1 frappe (cafe) | ~340 | |

---

## Heuristics for matching

When the user describes a meal, match against these templates:

1. **Find the closest single-line description.**
2. **Adjust for any specifics they mentioned** (extra rotis, no rice, with ghee, etc.).
3. **Adjust for restaurant vs home** (multiply by 1.3-1.5 if restaurant unless it's already a restaurant template).
4. **Adjust for portion qualifiers** ("small," "huge," "just a little"): ±25% per qualifier.
5. **Apply ranges** of ±15% for known patterns, ±25% for moderate uncertainty, ±40% for high uncertainty.
