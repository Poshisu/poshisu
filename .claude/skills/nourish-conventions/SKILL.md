# Skill: Nourish Project Conventions

> Load this skill whenever you're writing code in the Nourish repository. It supplements the conventions in CLAUDE.md with implementation-level patterns specific to this codebase.

---

## File naming

| Kind | Convention | Example |
|---|---|---|
| React component | PascalCase, one per file | `MealCard.tsx` |
| Utility / lib | camelCase | `loadMemoryContext.ts` |
| Types-only file | camelCase with `.types.ts` or inline | `database.ts` |
| API route | `route.ts` in App Router folder | `src/app/api/chat/route.ts` |
| Server action | `actions.ts` in the page folder | `src/app/(onboarding)/actions.ts` |
| Test | same name with `.test.ts` suffix | `router.test.ts` |
| Migration | `NNNN_snake_case.sql` | `0007_add_streaks.sql` |
| Agent prompt | UPPER_SNAKE_CASE.md | `NUTRITION_ESTIMATOR.md` |
| Sub-agent | kebab-case.md | `code-reviewer.md` |

## Import order

```ts
// 1. React / Next.js
import { useState } from 'react';
import { redirect } from 'next/navigation';

// 2. Third-party
import { z } from 'zod';
import Anthropic from '@anthropic-ai/sdk';

// 3. Internal libs (aliased @/)
import { callAgent } from '@/lib/claude/client';
import { loadMemoryContext } from '@/lib/memory/reader';

// 4. Internal components
import { MealCard } from '@/components/meals/MealCard';

// 5. Types
import type { MealEstimate } from '@/lib/agents/nutrition';

// 6. Styles (rare — Tailwind means almost no CSS imports)
```

## Server vs client components

**Default to server components.** Only add `"use client"` when you need:
- `useState`, `useEffect`, `useRef`, `useContext`
- Event handlers (`onClick`, `onChange`, `onSubmit`)
- Browser APIs (`navigator`, `window`, `MediaRecorder`)
- Third-party client-only libs (Recharts, PostHog browser)

Pattern for mixing:

```tsx
// app/(app)/chat/page.tsx — SERVER component
import { createServerClient } from '@/lib/supabase/server';
import { ChatRoot } from '@/components/chat/ChatRoot';

export default async function ChatPage() {
  const supabase = await createServerClient();
  const { data: messages } = await supabase
    .from('messages')
    .select('*')
    .order('created_at', { ascending: true })
    .limit(50);

  return <ChatRoot initialMessages={messages ?? []} />;
}

// components/chat/ChatRoot.tsx — CLIENT component
"use client";
import { useState } from 'react';
// ...
```

## API route pattern

```ts
// src/app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { z } from 'zod';

const chatSchema = z.object({
  content: z.string().min(1).max(5000),
  photo_url: z.string().url().optional(),
  voice_url: z.string().url().optional(),
});

export async function POST(req: NextRequest) {
  const supabase = await createServerClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const parsed = chatSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  // ... business logic ...

  return NextResponse.json({ data: result });
}
```

## Agent call pattern

Every agent call goes through the shared client:

```ts
import { callAgent } from '@/lib/claude/client';

const result = await callAgent({
  agent: 'nutrition-estimator',
  model: 'claude-sonnet-4-6',
  system: getPrompt('NUTRITION_ESTIMATOR'), // loaded at startup, cached
  messages: [{ role: 'user', content: composedUserMessage }],
  tools: [logMealEstimateTool],
  toolChoice: { type: 'tool', name: 'log_meal_estimate' },
  userId: user.id,
  cacheSystem: true, // enable prompt caching
});
```

The `callAgent` wrapper:
- Adds `cache_control` to system messages when `cacheSystem` is true
- Retries once on 529 (overloaded)
- Logs to `agent_traces` with PII-redacted request/response
- Parses tool_use responses into typed objects
- Throws typed errors for downstream handling

## Error handling

```ts
// In API routes — catch at the top, return structured errors
try {
  // ...
} catch (error) {
  console.error('[api/chat]', error);
  Sentry.captureException(error);
  return NextResponse.json(
    { error: 'Something went wrong. Please try again.' },
    { status: 500 },
  );
}

// In agent code — let errors propagate, the orchestrator catches them
// and returns a user-friendly message

// In components — use error boundaries for render errors,
// try/catch for async operations, toast for user-facing messages
```

## Supabase query pattern

```ts
// Always destructure { data, error } and check error
const { data: meals, error } = await supabase
  .from('meals')
  .select('id, items, kcal_lead, logged_at')
  .eq('user_id', userId)
  .gte('logged_at', startOfDay)
  .order('logged_at', { ascending: false });

if (error) throw new DatabaseError('Failed to load meals', error);
```

## Commit messages

Conventional commits, imperative mood, present tense:
- `feat: add voice transcription to chat input`
- `fix: correct calorie range for deep-fried items`
- `docs: update IFCT reference with Bengali dishes`
- `test: add allergen detection test cases`
- `refactor: extract memory loading into shared util`
- `chore: update @anthropic-ai/sdk to 0.31.0`

## When in doubt

1. Read CLAUDE.md.
2. Look at existing code for the pattern.
3. Write a test first, then the implementation.
4. Ask the `code-reviewer` sub-agent to check before committing.
