# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Slovi is a Czech language learning application built with React 19 + TypeScript + Vite, using Supabase for database (PostgreSQL) and authentication. The app features a dictionary with declension/conjugation support, practice quizzes with spaced repetition (SM-2), and progress tracking.

## Commands

```bash
pnpm dev              # Start dev server with HMR
pnpm build            # TypeScript check + Vite production build
pnpm lint             # Run ESLint
pnpm lint:fix         # Run ESLint with auto-fix
pnpm format           # Format with Prettier
pnpm format:check     # Check formatting without writing
pnpm knip             # Find unused code and dependencies
pnpm update-types     # Regenerate src/api/schema.ts from the live Supabase schema
```

**Database schema**: Always run `pnpm update-types` after writing SQL migrations to regenerate `src/api/schema.ts`. Never manually modify `src/api/schema.ts`.

## Architecture

### Database Design

Normalized PostgreSQL schema via Supabase:

- `root_words` — word metadata (in_czech, in_english, word_type, frequency_rank)
- `word_forms` — one row per inflected form, linked to `root_words` and `word_form_types`
- `word_form_types` — grammatical categories (case, tense, mood…) with educational explanations
- `example_sentences` — one or more sentences per `word_form`
- `user_word_progress` — per `(profile_id, word_form_id, mode)`: correct, incorrect, last_practiced_at
- `practice_attempts` — immutable log; one row per answer; source for analytics and gains
- `practice_box` — words pinned by the user for priority inclusion in sessions
- `blocked_words` — words excluded from all sessions

### Core Features

1. **Dictionary** - Fuzzy + diacritic-tolerant search across all `word_forms`, declension tables, example sentences
2. **Practice Quizzes** - Case Understanding (identify case), Form Recall (type the form), Simple Vocabulary (4-option pick), Aspect Choice (imperfective vs perfective in a contrast sentence, from `aspect_examples`), plus Case Study (one word from the dictionary)
3. **Progress Tracking** - Per-form per-mode accuracy, weekly gains, known word count, level system
4. **Chat (Czech coach)** - `/chat`: freestyle Czech chat with slovi-agent's coach (`src/features/coach/`). The reply streams from `POST /coach/chat` (NDJSON) with the user's Supabase token; mistakes come back as correction cards and are stored in `writing_submissions` / `writing_errors` (read here through RLS). Needs `VITE_SLOVI_AGENT_URL`, and the user on slovi-agent's `COACH_USER_IDS`.

### Key Design Decisions

- Normalized relational schema (not JSON) for `word_forms` — enables indexed fuzzy search across all forms
- Three distinct practice modes tracked separately in `user_word_progress` — per-mode rows, not per-mode columns
- All session building is server-side RPC — the frontend never queries the word pool directly
- `practice_attempts` and `user_word_progress` are always updated atomically in `record_practice_answer`

## Algorithm Skills

The practice algorithm is non-trivial and diverges from the planning docs in several places. Before making any changes to SQL functions or practice logic, load the relevant skill doc:

| Skill            | File                              | When to load                                                       |
| ---------------- | --------------------------------- | ------------------------------------------------------------------ |
| ARS Algorithm    | `docs/skills/ars-algorithm.md`    | Priority formula, fading rule, priority thresholds                 |
| Session Building | `docs/skills/session-building.md` | How sessions are constructed, slot allocation, eligibility filters |
| Known Word       | `docs/skills/known-word.md`       | Known/fading/dusty definitions, `known_word_threshold()`           |
| RPC Functions    | `docs/skills/rpc-functions.md`    | Live function signatures, atomicity rules, tables written          |
| Code Patterns    | `docs/skills/code-patterns.md`    | JS/TS/React/react-query/Supabase patterns with examples and WHY    |

**Note:** `docs/PLANNING.md` and `docs/PRACTICE.md` are planning artifacts — parts are outdated. The SQL in `database/migrations/` and these skill docs are the authoritative source of truth for how the algorithm works.

## Code Quality

- **TypeScript**: Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- **Pre-commit hooks**: Husky + lint-staged automatically runs ESLint and Prettier on staged files
- **Formatting**: Single quotes, 2-space indent, 100 char width, trailing commas (ES5)

**Rules (enforced by ESLint — do not disable):**

- Arrow functions only — never `function` declarations or `function` expressions
- No `for` / `for...of` / `for...in` loops — use `map`, `filter`, `reduce`, `forEach`
- No type casts (`as X`) — use type predicates, Zod, or `??` fallback instead
- No non-null assertions (`!`) — use `?? fallback` or guard with an `if` check
- `type` not `interface` for all TypeScript type definitions
- `prefer-const` — never define a `let` that isn't reassigned
- No mutation of function parameters or their properties

**Rules (not mechanically enforced — apply by judgment):**

- Avoid mutations on local variables too; prefer immutable transforms with spread/reduce
- Avoid `let x; x = value` deferred assignment — use ternary, IIFE, or early return instead
- Never touch `src/api/schema.ts` — always run `pnpm update-types` after SQL migrations
- Use Zod to narrow DB string types to enums at the query boundary
- react-query: one file per hook, always destructure the return value
- React: assess whether a reusable component exists before writing new inline JSX

See `docs/skills/code-patterns.md` for examples and reasoning behind each rule.

## Styling

- **Theme tokens only**: Never use hardcoded values in Tailwind classes. Always use semantic theme tokens defined in `src/index.css` — e.g. `text-foreground` not `text-[#1A1A1A]`, `bg-primary` not `bg-[#FFE59A]`, `text-caption` not `text-[11px]`, `gap-2.5` not `gap-[10px]`
- **Canonical classes**: Follow Tailwind IntelliSense suggestions — prefer named utilities over arbitrary values whenever an equivalent exists (e.g. `h-13` not `h-[52px]`, `rounded-2xl` not `rounded-[12px]`, `h-dvh` not `h-[100dvh]`)
- **Semantic HTML**: Use the correct HTML element for the content — `<p>` for paragraphs, `<h1>`–`<h3>` for headings, `<strong>` for bold emphasis, `<em>` for italic emphasis, `<button>` for actions, `<a>` for navigation. Do not use `<span>` or `<div>` where a more specific element exists
- **No `<span>` for typography**: Never wrap text in a `<span>` purely to apply styles. Use `<p>`, `<h1>`–`<h3>`, `<strong>`, `<em>`, or other semantic elements instead. `<span>` is only acceptable as an inline wrapper inside a larger text node (e.g. to highlight one word within a sentence)
- **Route paths**: Never hardcode route strings (e.g. `"/word/123"`). Always use the `paths` helper from `@/features/routes/paths`

## Documentation

Planning docs in `/docs/` (treat as historical context, not current spec):

- `ANALYSIS.md` - Requirements and design questions
- `PLANNING.md` - Original database schema proposal (partially superseded)
- `PRACTICE.md` - Practice algorithm spec (partially superseded by migrations)
- `MIGRATION.md` - SQL setup scripts
- `WORD_GENERATION.md` - AI word generation workflow with n8n

Operational skill docs in `/docs/skills/` (authoritative for current algorithm):

- `ars-algorithm.md` - ARS priority formula, fading override, priority thresholds
- `session-building.md` - Session construction, slot allocation, eligibility filters
- `known-word.md` - Known/fading/dusty definitions, `known_word_threshold()`
- `rpc-functions.md` - Live function signatures, atomicity rules
