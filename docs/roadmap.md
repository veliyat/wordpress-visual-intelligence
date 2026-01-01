# Implementation Roadmap

## Phase 1: Foundation

### 1.1 Monorepo Setup
- [ ] Initialize pnpm workspace
- [ ] Create root package.json
- [ ] Create pnpm-workspace.yaml
- [ ] Create shared tsconfig.base.json
- [ ] Create vitest.workspace.ts
- [ ] Add .gitignore
- [ ] Add .nvmrc (Node 20 LTS)

### 1.2 Core Package (`packages/core`)
- [ ] Package setup (package.json, tsconfig.json)
- [ ] IR type definitions (`src/types/ir.ts`)
- [ ] Token type definitions (`src/types/tokens.ts`)
- [ ] Validation type definitions (`src/types/validation.ts`)
- [ ] AI adapter interface (`src/ai/adapter.ts`)
- [ ] Claude provider implementation (`src/ai/providers/claude.ts`)
- [ ] OpenAI provider implementation (`src/ai/providers/openai.ts`)
- [ ] Color utilities (`src/utils/color.ts`)
  - RGB to CIELAB conversion
  - Delta-E calculation
  - Color clustering (k-means)
- [ ] Spacing utilities (`src/utils/spacing.ts`)
  - Base-8 normalization
  - Scale mapping

---

## Phase 2: Perception

### 2.1 Perception Package (`packages/perception`)
- [ ] Package setup
- [ ] Playwright configuration
- [ ] Full-page screenshot capture (`src/capture.ts`)
- [ ] Viewport management (`src/viewport.ts`)
- [ ] Section boundary detection (`src/section-detection.ts`)
- [ ] Image preprocessing (`src/preprocessing.ts`)
- [ ] Unit tests for capture functions
- [ ] Golden-file tests for sample screenshots

---

## Phase 3: Intelligence

### 3.1 Intelligence Package (`packages/intelligence`)
- [ ] Package setup
- [ ] Main analyzer orchestrator (`src/analyzer.ts`)
- [ ] Color extraction (`src/extractors/color.ts`)
- [ ] Typography extraction (`src/extractors/typography.ts`)
- [ ] Spacing extraction (`src/extractors/spacing.ts`)
- [ ] Layout intent detection (`src/extractors/layout.ts`)
- [ ] Color normalization (`src/normalizers/color.ts`)
- [ ] Spacing normalization (`src/normalizers/spacing.ts`)
- [ ] IR builder (`src/ir-builder.ts`)
- [ ] AI prompt templates
- [ ] Unit tests for normalizers
- [ ] Golden-file tests for IR output

---

## Phase 4: WordPress Generator

### 4.1 WP Generator Package (`packages/wp-generator`)
- [ ] Package setup
- [ ] Main generator orchestrator (`src/generator.ts`)
- [ ] theme.json generator (`src/theme-json.ts`)
- [ ] Block pattern base (`src/patterns/index.ts`)
- [ ] Hero pattern (`src/patterns/hero.ts`)
- [ ] Grid pattern (`src/patterns/grid.ts`)
- [ ] Columns pattern (`src/patterns/columns.ts`)
- [ ] Cards pattern (`src/patterns/cards.ts`)
- [ ] PHP template generator (`src/templates/index.ts`)
- [ ] Filesystem export (`src/export.ts`)
- [ ] Unit tests for generators
- [ ] Golden-file tests for theme output

---

## Phase 5: Validation

### 5.1 Validation Package (`packages/validation`)
- [ ] Package setup
- [ ] Screenshot comparator (`src/comparator.ts`)
- [ ] Pixel diff metric (`src/metrics/pixel-diff.ts`)
- [ ] SSIM metric (`src/metrics/ssim.ts`)
- [ ] Section diff metric (`src/metrics/section-diff.ts`)
- [ ] Correction signal generator (`src/signals.ts`)
- [ ] Validation loop controller (`src/loop.ts`)
- [ ] WordPress test environment setup
- [ ] Integration tests for comparison
- [ ] E2E tests for full loop

---

## Phase 6: CLI

### 6.1 CLI Package (`packages/cli`)
- [ ] Package setup
- [ ] Entry point (`src/index.ts`)
- [ ] Generate command (`src/commands/generate.ts`)
- [ ] Validate command (`src/commands/validate.ts`)
- [ ] Export command (`src/commands/export.ts`)
- [ ] Configuration loading (`src/config.ts`)
- [ ] Progress reporting (`src/progress.ts`)
- [ ] Error handling and user feedback
- [ ] Help text and documentation
- [ ] E2E tests for CLI commands

---

## Phase 7: Bedrock Integration

### 7.1 Bedrock Wrapper Package (`packages/bedrock-wrapper`)
- [ ] Package setup
- [ ] Filesystem wrapper (`src/wrapper.ts`)
- [ ] Composer.json template (`src/templates/composer.json`)
- [ ] .env.example template (`src/templates/.env.example`)
- [ ] Integration tests

---

## Phase 8: Polish & Documentation

### 8.1 Testing & Quality
- [ ] Full E2E test suite
- [ ] Performance benchmarks
- [ ] Error message review
- [ ] Edge case handling

### 8.2 Documentation
- [ ] API documentation
- [ ] Usage examples
- [ ] Contributing guide
- [ ] Troubleshooting guide

---

## Milestones

### M1: Core Complete
- Core package with all types and utilities
- AI adapter working with both providers
- **Deliverable**: Can construct IR manually and serialize

### M2: Perception Complete
- Full-page screenshots working
- Section detection functional
- **Deliverable**: Can capture and segment any public URL

### M3: Intelligence Complete
- AI analysis producing structured output
- Token normalization working
- **Deliverable**: Can produce valid UIBlueprint from URL

### M4: Generator Complete
- WordPress theme output working
- All basic patterns implemented
- **Deliverable**: Can generate installable WordPress theme

### M5: Validation Complete
- Visual comparison working
- Correction loop functional
- **Deliverable**: Can iteratively improve theme quality

### M6: MVP Complete
- CLI fully functional
- All packages integrated
- Basic test coverage
- **Deliverable**: Usable open-source tool

---

## Technical Debt Tracking

As implementation progresses, track technical debt here:

| Item | Package | Priority | Notes |
|------|---------|----------|-------|
| - | - | - | - |

---

## Decision Log

Track key decisions made during implementation:

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-01-01 | Use pnpm workspaces | Fast, disk-efficient, excellent monorepo support |
| 2026-01-01 | Support both Claude and OpenAI | Flexibility for users, avoid vendor lock-in |
| 2026-01-01 | Use tsup for builds | Zero-config, fast, great for libraries |
| 2026-01-01 | Vitest + Playwright + Golden files | Comprehensive testing strategy for all levels |
