# Slovi

A Czech language learning app with dictionary, practice quizzes, and progress tracking.

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **Backend:** Supabase (PostgreSQL, Auth)
- **Styling:** TBD

## Documentation

- [ANALYSIS.md](./docs/ANALYSIS.md) - Original app analysis and requirements
- [PLANNING.md](./docs/PLANNING.md) - Database structure planning and design decisions
- [MIGRATION.md](./docs/MIGRATION.md) - Database setup and SQL scripts
- [WORD_GENERATION.md](./docs/WORD_GENERATION.md) - AI-powered word generation workflow

## Features (Planned)

### Dictionary

- Search Czech words with fuzzy matching and diacritic tolerance
- View all word forms (declensions, conjugations)
- Example sentences with grammatical explanations
- Word families and verb aspect pairs

### Practice

- Easy mode: Multiple choice recognition
- Hard mode: Written recall
- Spaced repetition (SM-2 algorithm)

### Progress Tracking

- Individual attempt tracking
- Per-form proficiency scores
- Review scheduling

## Development

```bash
# Install dependencies
pnpm install

# Start dev server
pnpm dev

# Build for production
pnpm build

# Lint and format
pnpm lint
pnpm format

# Check for unused code/dependencies
pnpm knip
```

## Database Setup

See [MIGRATION.md](./docs/MIGRATION.md) for complete SQL setup instructions.
