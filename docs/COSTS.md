# Nourish — Cost Model (v2)

> All prices verified April 2026. Numbers are honest — the unoptimized cost, the realistic optimized cost, and the levers to get there.

---

## Model pricing (per million tokens, USD)

| Model | Input | Output | Cache read (90% off) |
|---|---|---|---|
| Claude Haiku 4.5 | $1.00 | $5.00 | $0.10 |
| Claude Sonnet 4.6 | $3.00 | $15.00 | $0.30 |
| Claude Opus 4.6 | $5.00 | $25.00 | $0.50 |

## Per-interaction cost (with hybrid pipeline)

The hybrid pipeline reduces LLM cost per meal log significantly: the LLM only does identification (Stage 1) and presentation (Stage 6). Lookup, math, safety, and micronutrient flagging are code.

### Meal log

| Step | Model | Input tokens | Output tokens | Cost |
|---|---|---|---|---|
| Router | Haiku | ~500 | ~100 | $0.001 |
| Identification (Stage 1) | Sonnet | ~2,500 (cached system) + ~500 user | ~400 | $0.008 |
| Stages 2-5 | Code | — | — | $0.000 |
| Presentation (Stage 6) | Haiku | ~300 | ~150 | $0.001 |
| **Total per meal log** | | | | **~$0.010** |

This is down from ~$0.016 in v1 because the LLM no longer does calorie math.

### Recommendation ("what should I eat?")

| Step | Model | Cost |
|---|---|---|
| Router | Haiku | $0.001 |
| Coach | Sonnet | $0.027 |
| **Total** | | **~$0.028** |

### Nudge | Haiku | $0.001

### Memory consolidation (daily) | Sonnet | $0.018

### Weekly summary | Sonnet | $0.035

## Monthly cost per active user

Assumptions: 2.5 meals/day × 25 days, 2 recommendations/week, 3 nudges/day, daily consolidation, weekly + monthly summaries, voice transcription 15x/month.

| Activity | Monthly events | Cost each | Monthly |
|---|---|---|---|
| Meal logs | 62.5 | $0.010 | $0.63 |
| Recommendations | 8 | $0.028 | $0.22 |
| Nudges | 75 | $0.001 | $0.08 |
| Memory consolidation | 25 | $0.018 | $0.45 |
| Weekly summaries | 4 | $0.035 | $0.14 |
| Monthly summary | 1 | $0.060 | $0.06 |
| Voice transcription | 15 | $0.004 | $0.06 |
| **Unoptimized total** | | | **$1.64** |

### With optimization levers

| Lever | Savings |
|---|---|
| Prompt caching (90% on ~60% of input) | -$0.25 |
| Batch API for background jobs (50% off consolidation + summaries) | -$0.32 |
| Skip consolidation on inactive days | -$0.10 |
| **Realistic optimized total** | **~$0.97/user/month** |

## Infrastructure (monthly)

| Service | 100 users | 1,000 users | 5,000 users |
|---|---|---|---|
| Supabase | $0 | $25 | $25 |
| Vercel | $0 | $20 | $20 |
| ElevenLabs STT | $0 | $0 | $0 |
| Domain + misc | $2 | $2 | $2 |
| **Infra total** | **$7** | **$87** | **$197** |

## Total cost at scale (realistic optimized)

| DAU | LLM | Infra | Total | Per-user |
|---|---|---|---|---|
| 100 | $97 | $7 | $104 | $1.04 |
| 1,000 | $970 | $87 | $1,057 | $1.06 |
| 5,000 | $4,850 | $197 | $5,047 | $1.01 |

## Break-even

| Pricing | Gross margin | Users needed for ramen profitability ($500/mo) |
|---|---|---|
| ₹199/month (~$2.40) | 56% | ~370 paying users |
| ₹499/month (~$6.00) | 83% | ~100 paying users |

## What the v1 cost doc got wrong

The original doc stated a "$0.30 per user ceiling" — that was aspirational and unrealistic for the current architecture. The honest floor is ~$1.00/user/month with realistic optimizations. Getting below $0.50 would require: fine-tuning a smaller model for identification, aggressive result caching (same meal = skip the LLM entirely), and reducing consolidation frequency to every 3 days instead of daily. Those are Phase 2 optimizations, not MVP.

## Monitoring

Track weekly:
1. Total API spend (Anthropic dashboard)
2. Cost per active user (spend / DAU)
3. Tokens per meal log (from agent_traces — should be ~3,500 total)
4. Cache hit rate (target: >60%)
5. Model distribution (% Haiku vs Sonnet)

Alert on: daily spend > 2x trailing 7-day average, any user > $5/day.
