# wp-morph

A CLI-first, open-source devtool that reconstructs visually accurate WordPress sites by reasoning about design intent, not HTML structure.

## What This Is

- **Visual-first reconstruction**: Analyzes rendered UI, not source code
- **Intermediate Representation (IR)**: Captures design intent as a stable, semantic blueprint
- **Validation loop**: Iteratively improves output through visual comparison
- **WordPress native**: Generates Gutenberg-based themes with proper design tokens

## What This Is NOT

- Not a site scraper
- Not a one-shot AI generator
- Not SaaS-first

## Core Concept

```
Most tools:  HTML → WordPress (brittle)
This system: Rendered UI → IR (Design Intent) → WordPress (robust)
```

The generator consumes **intent**, not markup, making it universal across source technologies.

## Architecture

```
packages/
├── core/              # Shared types, AI adapter, utilities
├── perception/        # Playwright screenshot capture
├── intelligence/      # IR construction & token normalization
├── validation/        # Visual diff & correction signals
├── wp-generator/      # WordPress theme output
├── bedrock-wrapper/   # Optional Bedrock filesystem wrapper
└── cli/               # Canonical interface
```

## The Intermediate Representation (IR)

The IR (UI Blueprint) is the brain of the system. Core properties:

- **Semantic**: Captures design intent, not DOM structure
- **Tokenized**: No raw colors or spacing values
- **Layout-intent driven**: e.g., "3-column grid", not CSS primitives
- **Stable**: Works across HTML, React, Vue, etc.
- **Mappable**: Directly translates to WordPress blocks

## MVP Scope

### Inputs
- Public website URL
- Desktop viewport only (mobile out of scope for MVP)

### Outputs
- Gutenberg-based WordPress theme
  - `theme.json` with design tokens
  - Block patterns
  - Minimal PHP templates
- Export formats:
  - Standard `wp-content` theme
  - Bedrock-ready project wrapper

## CLI Usage (Planned)

```bash
# Generate WordPress theme from URL
wp-morph generate https://example.com --output ./my-theme

# With options
wp-morph generate https://example.com \
  --format bedrock \
  --max-iterations 5 \
  --threshold 0.92 \
  --provider claude

# Validate generated theme against original
wp-morph validate https://example.com ./my-theme

# Export from saved IR
wp-morph export ./blueprint.json --format vanilla
```

## Technology Stack

- **Runtime**: Node.js
- **Language**: TypeScript (strict mode)
- **Monorepo**: pnpm workspaces
- **Build**: tsup
- **Testing**: Vitest (unit), Playwright (E2E/visual), Golden-file (IR snapshots)
- **AI Providers**: Claude API, OpenAI API (configurable)
- **Screenshots**: Playwright

## Key Design Decisions

1. **AI for intent, code for normalization**: AI detects layout intent; color clustering and spacing normalization are deterministic algorithms

2. **Tokens are mandatory**: All colors, spacing, typography must be tokenized. No raw values in output.

3. **Sections are first-class**: Content organized by visual sections for targeted validation and corrections

4. **Structured correction signals**: AI receives JSON feedback, not images, during refinement passes

5. **CLI is canonical**: All functionality via CLI first. Any future UI is a thin wrapper.

## Development Status

**Current**: Planning phase - architecture defined, implementation pending

See [docs/architecture.md](docs/architecture.md) for detailed technical specification.

## License

Open source. Fork it. Build on it. Make it better.

## Contributing

This project explicitly welcomes:
- Maintainers
- Forks
- SaaS layers built on top

See [CLAUDE.md](CLAUDE.md) for AI-assisted development context.
