# Getting Started with Nourish — Step by Step

> This guide assumes you have a Mac, basic terminal comfort, and no engineering background beyond what you've learned from Claude. Every step is literal — copy-paste the commands.

---

## Phase A: Set up your machine (one-time, ~30 minutes)

### A1. Install the prerequisites

Open Terminal (Cmd + Space, type "Terminal", hit Enter).

```bash
# Install Homebrew (Mac package manager) — skip if you already have it
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js 20+ and pnpm
brew install node
npm install -g pnpm

# Install Git (usually already on Mac)
brew install git

# Install Claude Code
curl -fsSL https://claude.ai/install.sh | bash

# Install Supabase CLI
brew install supabase/tap/supabase

# Verify everything works
node --version    # should show v20+ or v22+
pnpm --version    # should show 9+
git --version     # should show 2.x
claude --version  # should show version number
supabase --version # should show 2.x
```

If any of these fail, google the error message or ask Claude in chat to help debug.

### A2. Set up your accounts

You need five accounts. All have free tiers.

| Service | URL | What you need from it |
|---|---|---|
| **GitHub** | github.com | Create an org called `nourish-health` (or similar). Create a private repo called `nourish`. |
| **Supabase** | supabase.com | Create a new project. Copy: Project URL, anon key, service role key. |
| **Anthropic** | console.anthropic.com | Create an API key. Add $20 credit to start. |
| **Vercel** | vercel.com | Sign up with your GitHub account. Don't create a project yet — we'll connect it later. |
| **ElevenLabs** | elevenlabs.com | You already have a creator subscription. Grab your API key from Developer settings. |

**Write down these values** — you'll need them in Step B3:
- `NEXT_PUBLIC_SUPABASE_URL` — your Supabase project URL (looks like `https://xxxxx.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — the anon/publishable key
- `SUPABASE_SERVICE_ROLE_KEY` — the service role key (keep this secret)
- `ANTHROPIC_API_KEY` — your Claude API key
- `ELEVENLABS_API_KEY` — your ElevenLabs API key (for Scribe v2 voice transcription)

### A3. Configure Git

```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

If you haven't set up SSH keys for GitHub, the easiest way:
```bash
# Generate an SSH key
ssh-keygen -t ed25519 -C "your-email@example.com"
# Hit Enter for default location, set a passphrase if you want

# Copy the public key
cat ~/.ssh/id_ed25519.pub
# Copy the output, go to GitHub → Settings → SSH Keys → Add New → paste it
```

---

## Phase B: Set up the Nourish project (~15 minutes)

### B1. Create the project directory and extract the artifacts

```bash
# Go to your projects folder (or wherever you keep code)
cd ~/Projects  # or ~/Desktop, or wherever

# Create the nourish directory
mkdir nourish
cd nourish

# Extract the tarball (adjust path to wherever you downloaded it)
tar -xzf ~/Downloads/nourish-project-artifacts.tar.gz --strip-components=1

# Verify you see CLAUDE.md, docs/, prompts/, supabase/, .claude/
ls
```

You should see: `CLAUDE.md`, `README.md`, `docs/`, `prompts/`, `supabase/`, `.claude/`

### B2. Initialize Git and push to GitHub

```bash
git init
git add .
git commit -m "chore: initial project artifacts — prompts, schema, skills, sub-agents"
git branch -M main
git remote add origin git@github.com:nourish-health/nourish.git  # use YOUR org/repo name
git push -u origin main
```

### B3. Create the environment file

```bash
# Copy the example file
cp .env.local.example .env.local

# Open it in a text editor and fill in your actual values
# On Mac you can use:
open -e .env.local
# Or use VS Code if you have it:
# code .env.local
```

Fill in the values from Step A2. **Never commit this file** — it's already in `.gitignore`.

### B4. Link your Supabase project for local development

```bash
# Login to Supabase CLI
supabase login

# Link to your remote project (it will ask for your project ref and database password)
supabase link --project-ref YOUR_PROJECT_REF
# The project ref is the part of your URL: https://XXXXX.supabase.co → XXXXX is the ref

# Apply the database migrations to your remote project
supabase db push

# Apply the seed data
supabase db seed
```

---

## Phase C: Start building with Claude Code (~6-8 weeks)

### C1. Open Claude Code

You have two options — use whichever you prefer:

**Option A: Claude Code desktop app (recommended for you)**
Open the Claude Code app → Open Project → navigate to your `nourish` folder → select it. The app gives you a visual interface, file diffs, and conversation management. Everything works the same as the CLI but friendlier.

**Option B: CLI**
```bash
cd ~/Projects/nourish
claude
```

Either way, Claude Code will automatically read `CLAUDE.md` from the project root. It now knows the entire project.

### C2. Run your first build prompt

Open `docs/BUILD_PLAN.md` in a separate window (any text editor, or read it on GitHub).

Find **Phase 0, Prompt 0.1** — it starts with "Read CLAUDE.md first. Then scaffold the Nourish project from scratch."

**Copy the entire prompt text** (everything between the triple backtick code fences) and **paste it into Claude Code**.

Claude Code will:
1. Read CLAUDE.md for context
2. Run `create-next-app` to scaffold the project
3. Install all dependencies
4. Set up shadcn/ui
5. Create the directory structure
6. Verify everything compiles

**This will take 3-5 minutes.** Watch the output. If something fails, Claude Code will usually fix it automatically. If not, describe the error and it'll troubleshoot.

### C3. Verify it works

After Prompt 0.1 completes, ask Claude Code:

> "Run the dev server and verify everything compiles"

Or open a separate terminal (Cmd+T) and run:
```bash
cd ~/Projects/nourish
pnpm dev
```

Open `http://localhost:3000` in your browser. You should see a placeholder page. That's correct — you just scaffolded an empty shell.

### C4. Commit and push

You can ask Claude Code to do this directly:

> "Commit everything with message 'feat: scaffold Next.js project with dependencies and structure' and push to origin"

Or in terminal:
```bash
git add .
git commit -m "feat: scaffold Next.js project with dependencies and structure"
git push
```

### C5. Continue through the build plan

Repeat this cycle for each prompt in `docs/BUILD_PLAN.md`:

```
1. Open BUILD_PLAN.md
2. Find the next prompt
3. Copy-paste it into Claude Code
4. Watch it build
5. Test it (pnpm dev, open browser, try the feature)
6. Review it (ask: "Use the code-reviewer agent to review what we just built")
7. Commit and push:
     git add .
     git commit -m "feat: <description of what this prompt built>"
     git push
8. Move to the next prompt
```

### C6. The order matters

The prompts are designed to be run in sequence. Don't skip:

| Phase | Prompts | What you get after |
|---|---|---|
| 0: Foundation | 0.1 → 0.5 | Running PWA with auth, DB, CI, observability |
| 1: Onboarding | 1.1 → 1.4 | Users can sign up and complete onboarding |
| 2: Chat & Logging | 2.1 → 2.5 | Users can log meals by text/photo/voice |
| 3: Memory | 3.1 → 3.4 | Agent remembers things about each user |
| 4: Trends | 4.1 → 4.3 | Users see charts and insights |
| 5: Nudges | 5.1 → 5.3 | App proactively checks in with users |
| 6: Polish | 6.1 → 6.4 | Empty states, accessibility, privacy, beta-ready |

**After Phase 2 you have enough to dogfood.** You can start logging your own meals and seeing if the estimates are reasonable. This is when the real iteration starts.

---

## Phase D: Deploy to production (~30 minutes, do this after Phase 0)

### D1. Connect Vercel to GitHub

1. Go to vercel.com → New Project
2. Import your `nourish-health/nourish` repo from GitHub
3. Framework: Next.js (auto-detected)
4. Root directory: `./` (default)
5. Add environment variables (same as `.env.local` but for production)
6. Deploy

Vercel will auto-deploy on every push to `main`.

### D2. Set up your custom domain (optional)

In Vercel → Project Settings → Domains → Add your domain. Follow the DNS instructions.

---

## Phase E: Dogfooding and iteration (ongoing)

### E1. Be your own first user

After Phase 2 is built:
1. Sign up on your deployed app
2. Complete onboarding with your real information
3. Log every meal for a week
4. Note what's wrong:
   - Did it identify the food correctly?
   - Was the portion estimate reasonable?
   - Did it ask good clarifying questions?
   - Did safety checks fire when they should?
   - Was the UI easy to use on your phone?

### E2. Fix what's broken

The most common things to iterate on:
- **Agent prompts:** If identification is wrong, add examples to `NUTRITION_ESTIMATOR.md`
- **IFCT data:** If a food is missing, add it to `supabase/seed.sql` and the IFCT reference
- **Multiplier tables:** If restaurant estimates are too high/low, adjust `cooking_multipliers` or `source_multipliers`
- **UI issues:** Describe the problem to Claude Code, it'll fix it

### E3. Run the prompt eval harness

After any prompt change:
```bash
pnpm run eval:prompts
```

This runs your agent against test cases and reports accuracy. Don't merge prompt changes that regress.

### E4. Recruit 10 beta users

After 1-2 weeks of dogfooding:
1. Fix the top 5 issues you found
2. Recruit 10 friends/family who are health-conscious
3. Onboard them personally (watch them use it, take notes)
4. Set up a WhatsApp group or feedback channel
5. Iterate weekly based on their feedback

---

## Quick reference: commands you'll use daily

| What | Command |
|---|---|
| Start dev server | `pnpm dev` |
| Open Claude Code | `claude` |
| Run all tests | `pnpm test` |
| Run linter | `pnpm lint` |
| Run type checker | `pnpm typecheck` |
| Run prompt eval | `pnpm run eval:prompts` |
| Apply DB migrations | `supabase db push` |
| Regenerate types | `pnpm db:types` |
| Commit and push | `git add . && git commit -m "..." && git push` |
| Deploy | Push to `main` — Vercel auto-deploys |

---

## When things break

### "Claude Code isn't reading my project files"
Make sure you're running `claude` from the project root directory (where `CLAUDE.md` lives).

### "pnpm dev fails with errors"
Run `pnpm install` to make sure dependencies are installed. Then `pnpm typecheck` to see the exact error.

### "Supabase migration fails"
Check `supabase db push` output. Usually a syntax error in SQL. Fix the migration file and re-push. If you need to start over: `supabase db reset` (warning: deletes all data).

### "The agent gives bad estimates"
This is expected at first. The solution is always: add a better example to the agent prompt, add the food to IFCT, or adjust the multiplier tables. Then run `pnpm run eval:prompts` to verify.

### "I'm stuck and nothing works"
Open Claude chat (not Claude Code) and describe what happened. Paste the error message. Claude will help you debug.

---

## What the sub-agents do (and when to use them)

You don't need to manually call these most of the time — Claude Code delegates to them automatically. But you can invoke them explicitly:

| Say this in Claude Code | What happens |
|---|---|
| "Use the code-reviewer agent to review this" | Security, performance, a11y check |
| "Use the test-writer agent to add tests" | Writes Vitest/Playwright tests |
| "Use the prompt-evaluator agent" | Runs the eval harness |
| "Use the db-migration agent to add a table" | Creates a safe SQL migration |
| "Use the accessibility-auditor agent" | WCAG 2.2 AA audit |
| "Use the security-reviewer agent" | Full security review |

---

## Timeline reality check

| Week | What you should have |
|---|---|
| 1 | Running app shell, auth works, deployed to Vercel |
| 2 | Onboarding flow works, users get a profile |
| 3-4 | Chat works, can log meals, sees estimates |
| 4 | **Start dogfooding here.** Log your own meals daily. |
| 5 | Memory system works, agent gets smarter over time |
| 6 | Today view and trends charts work |
| 7 | Nudges working, push notifications on phone |
| 8+ | Polish, accessibility, recruit 10 beta users |

The most important thing is to get to Week 4 and start using it yourself. Real usage reveals real problems that no amount of planning can anticipate.

Good luck. Build the thing.
