# CLAUDE.md - AI Development Context

This file provides context for Claude Code when working on this project.

## Project Identity

**wp-morph** is an open-source, CLI-first devtool that reconstructs visually accurate WordPress sites by reasoning about design intent through an Intermediate Representation (IR).

### Non-Negotiables

1. **The IR is sacred**: The Intermediate Representation is a first-class artifact, not a temporary data structure
2. **Visual validation loop**: Quality is enforced through iteration, not guessed
3. **CLI is canonical**: All functionality must work via CLI; any UI is a thin wrapper
4. **Tokens only**: No raw colors, spacing, or typography values in output

### What This Project Is NOT

- Not a site scraper
- Not a one-shot AI generator
- Not SaaS-first
- Not optimizing for pixel-perfect matches (structural/perceptual similarity is the goal)

## Architecture Overview

```
Rendered UI → IR (Design Intent) → WordPress
             ↑                    ↓
             └── Validation Loop ─┘
```

### Package Structure

| Package | Purpose |
|---------|---------|
| `packages/core` | Shared types, AI adapter, utilities |
| `packages/perception` | Playwright screenshots |
| `packages/intelligence` | IR construction, token normalization |
| `packages/validation` | Visual diff, correction signals |
| `packages/wp-generator` | WordPress theme output |
| `packages/bedrock-wrapper` | Bedrock filesystem wrapper |
| `packages/memory` | Example storage, retrieval, cross-session learning |
| `packages/cli` | CLI interface |

## Technology Stack

- **Monorepo**: pnpm workspaces
- **Language**: TypeScript (strict mode)
- **Build**: tsup
- **Testing**: Vitest + Playwright + Golden-file snapshots
- **AI**: Claude API + OpenAI API (adapter pattern)

## Key Types (IR Schema)

```typescript
// The core IR structure
interface UIBlueprint {
  meta: PageMeta;
  tokens: DesignTokens;
  sections: Section[];
}

interface DesignTokens {
  colors: ColorToken[];      // Semantic: primary, surface, text
  spacing: SpacingScale;     // xs, sm, md, lg, xl (base-8)
  typography: TypographyScale;
}

interface Section {
  id: string;
  intent: LayoutIntent;      // 'hero' | 'grid' | 'two-column' | etc.
  elements: Element[];
  boundingBox: BoundingBox;
}

// Correction signals for validation loop
interface CorrectionSignal {
  sectionId: string;
  issue: 'vertical-spacing' | 'horizontal-spacing' | 'color-mismatch' | 'typography' | 'layout';
  delta: string;
  confidence: number;
  suggestion?: string;
}
```

## Implementation Guidelines

### AI vs Code Responsibilities

We deliberately split work between AI and deterministic code:

| Task | Owner | Rationale |
|------|-------|-----------|
| Detect layout intent | AI | Requires semantic understanding ("is this a hero?") |
| Identify sections | AI | Visual boundary detection needs interpretation |
| Extract elements | AI | Classifying content types requires context |
| Name color tokens | AI | Semantic naming ("primary" vs "accent") |
| Generate corrections | AI | Understanding what's wrong and suggesting fixes |
| Color clustering | Code | Math is deterministic, precise (Delta-E < 2.0) |
| Spacing normalization | Code | Rounding to base-8 is pure arithmetic |
| Color space conversion | Code | CIELAB conversion is a formula |
| Visual metrics (SSIM) | Code | Pixel comparison is mathematical |

**Why this split?**
- **Precision**: Code gives identical output for identical input
- **Cost**: No API tokens for mathematical operations
- **Speed**: No network latency for color math
- **Testability**: Pure functions are easy to unit test
- **AI for ambiguity**: AI handles "what does this mean?" questions

**Implementation location**:
- Code utilities: `packages/core/src/utils/` (color.ts, spacing.ts)
- AI integration: `packages/intelligence/src/` (uses AI adapter from core)

### Token Normalization Rules

**Colors**:
1. Convert all colors to CIELAB
2. Cluster using k-means
3. Merge colors with Delta-E < 2.0
4. Assign semantic roles (primary, text, surface) by usage context

**Spacing**:
1. Extract all spacing values
2. Normalize to base-8 scale
3. Emit `{ xs, sm, md, lg, xl }` tokens
4. No literal values in output

### Validation Loop

```
Original → Screenshot
Generated → Screenshot
Compare → Metrics (pixel diff, SSIM, bounding boxes)
Generate → Correction Signals (JSON)
AI → Targeted fixes
Repeat until: similarity >= 92% OR plateau OR max iterations
```

### Cross-Session Learning

The system improves over time without fine-tuning the LLM:

```
┌─────────────────────────────────────────┐
│  Retriever                              │
│  ┌──────────────┐  ┌──────────────────┐ │
│  │ Local memory │ → │ Bundled examples │ │
│  │ (private)    │   │ (ships w/ pkg)   │ │
│  └──────────────┘   └──────────────────┘ │
└─────────────────────────────────────────┘
```

- **Bundled examples**: Curated IR→WordPress mappings, versioned with releases
- **Local memory**: User's successful conversions, never leaves their machine
- **Retrieval**: During IR construction, fetch similar past examples as few-shot context
- **Contribution**: Opt-in `wp-morph export-example --anonymize` for community PRs

See `docs/architecture.md` → `packages/memory` for full spec.

### WordPress Output

**Vanilla theme**:
```
my-theme/
├── theme.json       # Design tokens
├── style.css        # Header only
├── functions.php    # Pattern registration
├── patterns/        # Block patterns
└── templates/       # Block templates
```

**Bedrock wrapper**: Same theme, different filesystem structure

## File Conventions

- All packages use `src/` for source, `dist/` for output
- Tests in `__tests__/` or `*.test.ts` adjacent to source
- Golden files in `__fixtures__/`
- Shared types in `packages/core/src/types/`

## Commands (Planned)

```bash
# Development
pnpm install          # Install dependencies
pnpm build            # Build all packages
pnpm test             # Run all tests
pnpm test:unit        # Unit tests only
pnpm test:e2e         # E2E tests only

# CLI
pnpm cli generate <url>    # Generate theme
pnpm cli validate <url> <path>  # Validate output
```

## Development Priorities

When implementing features, prioritize in this order:

1. **Correctness**: Does it produce valid WordPress output?
2. **IR fidelity**: Does the IR accurately capture design intent?
3. **Validation accuracy**: Do corrections improve output?
4. **Performance**: Only after the above are solid

## What to Avoid

- Over-engineering for hypothetical requirements
- Adding features beyond current scope
- Breaking changes to IR schema without migration path
- Storing raw values instead of tokens
- AI calls where deterministic code suffices

## Quick Reference

| Concept | Location |
|---------|----------|
| IR types | `packages/core/src/types/ir.ts` |
| AI adapter | `packages/core/src/ai/adapter.ts` |
| Color utils | `packages/core/src/utils/color.ts` |
| Screenshot capture | `packages/perception/src/capture.ts` |
| IR builder | `packages/intelligence/src/ir-builder.ts` |
| Validation loop | `packages/validation/src/loop.ts` |
| Theme generator | `packages/wp-generator/src/generator.ts` |
| Example retriever | `packages/memory/src/retriever.ts` |
| CLI entry | `packages/cli/src/index.ts` |

## Context for Future Sessions

When resuming work:
1. Check `docs/architecture.md` for detailed specs
2. Review this file for conventions
3. Check TODO comments in code for pending work
4. Run `pnpm test` to verify current state
