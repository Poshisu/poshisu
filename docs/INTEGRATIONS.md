# Nourish — Future Integrations

> These are designed-for but not built in MVP. The architecture supports them cleanly. Here are light plans for each.

---

## 1. Swiggy / Zomato order parsing

### The hook

When a user says "I ordered paneer butter masala from Punjab Grill on Swiggy," we want to enrich the estimate by looking up the actual dish description and portion from the restaurant's listing.

### Architecture

```
User: "Ordered chicken biryani from Paradise, Hyderabad on Swiggy"
  ↓
Router → intent: log_meal (with restaurant context)
  ↓
Nutrition Estimator detects: { source: 'swiggy', restaurant: 'Paradise', dish: 'chicken biryani', city: 'Hyderabad' }
  ↓
Tool call: fetch_restaurant_dish(source, restaurant, dish)
  ↓
Firecrawl / scraping service:
  - Search Swiggy for "Paradise Hyderabad"
  - Find the menu item "Chicken Biryani"
  - Extract: description, price, serving size, any nutritional info
  ↓
Returns structured dish info to Nutrition Estimator
  ↓
Agent uses dish description + price (as a portion-size proxy) + IFCT baseline to produce a tighter estimate
```

### Implementation plan

1. **Add a tool** to the Nutrition Estimator: `fetch_restaurant_dish(platform, restaurant_name, dish_name, city?)` — returns dish description, price, serving description, and any nutritional info.
2. **Firecrawl integration:** Use Firecrawl API to scrape the dish page. Cache results for 7 days (menus don't change often).
3. **Fallback:** If the scrape fails, proceed with the IFCT baseline estimate and a wider range.
4. **Price as a portion proxy:** A ₹250 biryani serving is likely smaller than a ₹450 one.
5. **Table:** `restaurant_dishes` cache table with TTL.

### Estimated effort: 2-3 days

### Dependencies
- Firecrawl API account (~$50/month at moderate usage)
- OR a custom scraper running on a Supabase Edge Function
- Swiggy/Zomato don't have official public APIs, so scraping TOS should be reviewed

### Risk
- Swiggy/Zomato may block scraping. Firecrawl handles anti-bot measures but it's a cat-and-mouse game.
- Menu items change. Cache aggressively but invalidate on user report.

---

## 2. WhatsApp interface

### The hook

Many Indian users are more comfortable on WhatsApp than on a web app. A WhatsApp interface lets them log meals by sending a text, photo, or voice note to a number, just like texting a friend.

### Architecture

```
User sends WhatsApp message (text/photo/voice)
  ↓
WhatsApp Business API (via BSP: Gupshup, Twilio, or Meta Cloud API)
  ↓
Webhook → /api/whatsapp/webhook (Next.js route handler)
  ↓
Validate webhook signature
  ↓
Convert to internal message format:
  - Text → as-is
  - Photo → download, upload to Supabase Storage, get URL
  - Voice → download, transcribe via ElevenLabs Scribe v2, get transcript
  ↓
Call orchestrator.handleMessage(userId, msg) — SAME function as PWA chat
  ↓
Get response from orchestrator
  ↓
Send response back via WhatsApp API
  ↓
Also write to messages table (so it appears in PWA chat history)
```

### Implementation plan

1. **Register a WhatsApp Business number** through a BSP (Gupshup is cheapest for India; Meta Cloud API is free but requires a verified business).
2. **Create webhook handler** at `/api/whatsapp/webhook`:
   - Verify signature
   - Parse incoming message types (text, image, audio)
   - Map WhatsApp user to Nourish user (by phone number lookup)
   - Download media, upload to our storage
   - Call the same orchestrator
3. **Response formatting:** WhatsApp doesn't support rich cards like the PWA. Format MealCard responses as plain text with key numbers.
4. **Onboarding via WhatsApp:** Simplified flow — ask questions one at a time in conversation.
5. **Linking accounts:** User can link their WhatsApp to their PWA account via a one-time code.

### Estimated effort: 1-2 weeks

### Dependencies
- Business registration (for BSP)
- BSP account (Gupshup: ~₹500/month + per-message costs; Meta Cloud API: free for first 1000 conversations/month)
- WhatsApp Business phone number

### Why we deferred it
- BSP requires a registered business entity (the user doesn't have one yet)
- The PWA is a better experience for the MVP (richer UI, charts, memory inspector)
- Adding WhatsApp later is an integration task, not an architecture change

---

## 3. Wearable integration

### The hook

Activity data (steps, exercise, heart rate) and sleep data make nutrition coaching dramatically more useful. A user who ran 5 km today can be told "you burned ~400 extra kcal — your body can handle a bigger dinner."

### Target platforms (priority order)

1. **Apple Health** (via HealthKit on iOS)
2. **Google Fit** (via Google Fit API on Android)
3. **Oura Ring** (via Oura API)
4. **Fitbit** (via Fitbit Web API)
5. **Whoop** (via Whoop API)

### Architecture

```
Wearable device → platform (Apple Health / Google Fit / Oura / etc.)
  ↓
Platform SDK/API
  ↓
Nourish sync endpoint: /api/health/sync
  ↓
Store in: health_data table (user_id, source, data_type, value, recorded_at)
  ↓
Available to Coach agent for context
  ↓
Coach can say: "You walked 8,000 steps today — a good activity day.
Your dinner can be a bit more generous."
```

### Implementation plan

1. **Database:** Add `health_data` table with `(user_id, source, data_type, value, unit, recorded_at)`.
2. **Apple Health:** Requires a native iOS app (or Capacitor wrapper) to access HealthKit. Read: steps, active energy, sleep, heart rate. Sync daily.
3. **Google Fit:** REST API with OAuth. Read same data types. Sync daily.
4. **Oura/Fitbit/Whoop:** REST APIs with OAuth. Each has its own auth flow and data format.
5. **Sync worker:** Edge Function that runs every 6 hours, fetches new data for each connected user, stores in `health_data`.
6. **Coach integration:** Load today's activity summary into the Coach agent's context when generating recommendations or end-of-day summaries.

### Estimated effort: 1-2 weeks per platform

### Why we deferred it
- Requires a native app wrapper for Apple Health (the most important platform)
- Each platform has its own OAuth dance and data format
- The core nutrition coaching needs to be solid before layering in activity data
- Can add enormous value in Phase 2 — especially for "what should I eat" recommendations

### Data model sketch

```sql
create table public.health_data (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.users(id) on delete cascade,
  source      text not null, -- 'apple_health', 'google_fit', 'oura', 'fitbit', 'whoop', 'manual'
  data_type   text not null, -- 'steps', 'active_energy_kcal', 'sleep_hours', 'resting_hr', 'exercise_minutes'
  value       numeric not null,
  unit        text not null, -- 'count', 'kcal', 'hours', 'bpm', 'minutes'
  recorded_at timestamptz not null,
  synced_at   timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

create index health_data_user_type_date on public.health_data(user_id, data_type, recorded_at desc);

alter table public.health_data enable row level security;
create policy "health_data_own" on public.health_data
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
```

---

## Integration priority (recommended)

| Phase | Integration | Value | Effort | Prerequisite |
|---|---|---|---|---|
| MVP+1 | Swiggy/Zomato scraping | High (many users order in) | Low (2-3 days) | Firecrawl account |
| MVP+2 | WhatsApp interface | High (reach) | Medium (1-2 weeks) | Business registration |
| MVP+3 | Google Fit | Medium-high | Medium (1 week) | OAuth setup |
| MVP+4 | Apple Health | High (iOS users) | Medium (needs Capacitor) | Native wrapper |
| MVP+5 | Oura/Fitbit/Whoop | Medium | Low per platform (1 week each) | OAuth per vendor |
