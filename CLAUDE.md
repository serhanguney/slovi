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

## Documentation

Detailed planning docs are in `/docs/`:

- `ANALYSIS.md` - Requirements and design questions
- `PLANNING.md` - Database schema and feature specs
- `MIGRATION.md` - SQL setup scripts
- `WORD_GENERATION.md` - AI word generation workflow with n8n
