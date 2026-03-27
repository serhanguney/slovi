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
```

## Architecture

### Database Design

Uses PostgreSQL via Supabase with JSON columns for flexible storage:

- `root_words` table: word metadata + `declension_table` JSON (stores all declension/conjugation forms)
- `declension_scores` table: `error_map` and `success_map` JSON objects for per-form proficiency tracking

### Core Features

1. **Dictionary** - Search with fuzzy matching and diacritic tolerance, view declensions/conjugations, example sentences
2. **Practice Quizzes** - Easy mode (multiple choice) and Hard mode (fill-in-the-blank), SM-2 spaced repetition
3. **Progress Tracking** - Per-form proficiency scores, review scheduling

### Key Design Decisions

- JSON storage in PostgreSQL instead of normalized relational tables for declension data
- Two practice difficulty levels: recognition (easy) vs. recall (hard)
- Per-form tracking (each declension/conjugation form tracked separately)

## Code Quality

- **TypeScript**: Strict mode enabled with `noUnusedLocals` and `noUnusedParameters`
- **Pre-commit hooks**: Husky + lint-staged automatically runs ESLint and Prettier on staged files
- **Formatting**: Single quotes, 2-space indent, 100 char width, trailing commas (ES5)

do not type cast
do not disable eslint warnings
use `type` not `interface` for all TypeScript type definitions
use `const Component = () => {}` for all React components, never `function Component() {}`
use arrow functions instead of `function() {}`

## Styling

- **Theme tokens only**: Never use hardcoded values in Tailwind classes. Always use semantic theme tokens defined in `src/index.css` — e.g. `text-foreground` not `text-[#1A1A1A]`, `bg-primary` not `bg-[#FFE59A]`, `text-caption` not `text-[11px]`, `gap-2.5` not `gap-[10px]`
- **Canonical classes**: Follow Tailwind IntelliSense suggestions — prefer named utilities over arbitrary values whenever an equivalent exists (e.g. `h-13` not `h-[52px]`, `rounded-2xl` not `rounded-[12px]`, `h-dvh` not `h-[100dvh]`)
- **Semantic HTML**: Use the correct HTML element for the content — `<p>` for paragraphs, `<h1>`–`<h3>` for headings, `<strong>` for bold emphasis, `<em>` for italic emphasis, `<button>` for actions, `<a>` for navigation. Do not use `<span>` or `<div>` where a more specific element exists

## Documentation

Detailed planning docs are in `/docs/`:

- `ANALYSIS.md` - Requirements and design questions
- `PLANNING.md` - Database schema and feature specs
- `MIGRATION.md` - SQL setup scripts
- `WORD_GENERATION.md` - AI word generation workflow with n8n
