# wp-morph

An AI-powered, CLI-first devtool for WordPress—build from visual references, optimize existing sites, develop plugins, and more.

## The Problem

You have a design—a live site, a mockup, a Figma export rendered in a browser. You need it as a WordPress theme. Current options:

1. **Manual rebuild**: Hours of block editor work, eyeballing spacing and colors
2. **Site scrapers**: Copy HTML that breaks on first edit
3. **AI generators**: Describe what you want in words and hope for the best

None of these start from what you actually have: **a visual reference**.

## What wp-morph Does

wp-morph takes a rendered UI and reconstructs it as a native WordPress theme by reasoning about **design intent**, not HTML structure.

```
Your design (URL/screenshot) → AI analyzes visual intent → WordPress theme
                                        ↑                         ↓
                                        └── Validation loop ──────┘
```

- **Input**: An existing visual design (URL, screenshot, rendered mockup)
- **Output**: A portable, Gutenberg-based WordPress theme with proper design tokens
- **Process**: Iterative refinement until output matches source (target: 92%+ similarity)

## Use Cases

**Theme Reconstruction**
- Implement a client design as a WordPress theme
- Migrate an existing site to WordPress
- Reproduce a visual reference with structural fidelity

**Site Optimization**
- Analyze an existing WordPress site and optimize performance
- Refactor themes for better maintainability
- Audit and improve accessibility

**Plugin Development**
- Build custom plugins for existing WordPress sites
- Extend functionality based on site requirements

**General WordPress Development**
- AI-assisted development with WordPress-specific context
- Works from visual references, existing codebases, or descriptions

## What This Is NOT

- **Not a site scraper**: Doesn't blindly copy HTML; reasons about intent
- **Not one-shot**: Uses a validation loop to iteratively improve accuracy
- **Not SaaS-first**: Open-source CLI tool that produces portable artifacts

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
├── memory/            # Cross-session learning & example retrieval
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

### Interactive Mode

```bash
# Start interactive session
wp-morph

wp-morph> generate theme from https://example.com
Analyzing... Found 5 sections.
Generated theme at ./theme-output

wp-morph> make the hero section taller
Updated hero padding. Regenerating...

wp-morph> validate
Similarity: 94% ✓

wp-morph> exit
```

### Non-Interactive Mode

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

**Current**: Early implementation phase

| Package | Status |
|---------|--------|
| `core` | ✅ Implemented - IR types, color/spacing utilities (100 tests) |
| `memory` | ✅ Implemented - Local/bundled example retrieval (82 tests) |
| `perception` | 📋 Contract tests defined, implementation pending |
| `intelligence` | 📋 Contract tests defined, implementation pending |
| `validation` | 📋 Contract tests defined, implementation pending |
| `wp-generator` | 📋 Contract tests defined, implementation pending |
| `bedrock-wrapper` | 📋 Contract tests defined, implementation pending |
| `cli` | 📋 Contract tests defined, implementation pending |

All 327 tests passing.

See [docs/architecture.md](docs/architecture.md) for detailed technical specification.

## License

Open source. Fork it. Build on it. Make it better.

## Contributing

This project explicitly welcomes:
- Maintainers
- Forks
- SaaS layers built on top

See [CLAUDE.md](CLAUDE.md) for AI-assisted development context.
