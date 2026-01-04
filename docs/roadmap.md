# Implementation Roadmap

## Phase 1: Foundation ✅ COMPLETE

### 1.1 Monorepo Setup ✅
- [x] Initialize pnpm workspace
- [x] Create root package.json
- [x] Create pnpm-workspace.yaml
- [x] Create shared tsconfig.base.json
- [x] Create vitest.workspace.ts
- [x] Add .gitignore
- [x] Add .nvmrc (Node 20 LTS)

### 1.2 Core Package (`packages/core`) ✅
- [x] Package setup (package.json, tsconfig.json)
- [x] IR type definitions (`src/types/ir.ts`)
- [x] Token type definitions (included in ir.ts)
- [x] Validation type definitions (included in ir.ts)
- [x] AI adapter interface (`src/ai/adapter.ts`)
- [x] Claude provider implementation (`src/ai/providers/claude.ts`)
- [x] OpenAI provider implementation (`src/ai/providers/openai.ts`)
- [x] Color utilities (`src/utils/color.ts`)
  - RGB to CIELAB conversion
  - Delta-E calculation
  - Color clustering (k-means)
- [x] Spacing utilities (`src/utils/spacing.ts`)
  - Base-8 normalization
  - Scale mapping

### 1.3 Memory Package (`packages/memory`) ✅
- [x] Package setup (package.json, tsconfig.json)
- [x] Type definitions (`src/types.ts`)
- [x] Example retriever (`src/retriever.ts`)
- [x] Example indexer (`src/indexer.ts`)
- [x] Local store for user examples (`src/local-store.ts`)
- [x] Bundled examples loader (`src/bundled.ts`)
- [x] Unit tests (82 tests passing)

---

## Phase 2: Perception ✅ COMPLETE

### 2.1 Perception Package (`packages/perception`) ✅
- [x] Package setup
- [x] Contract tests defining expected API (17 tests)
- [x] Playwright browser management (`src/browser.ts`)
- [x] Full-page screenshot capture (`src/capture.ts`)
- [x] Boundary detection with AI (`src/boundaries.ts`)
- [x] Edge-snap algorithm (`src/edge-snap.ts`)
  - Sliding-window band comparison
  - Delta-E + variance scoring
  - Confidence-weighted search radius
- [x] Type definitions (`src/types.ts`)
- [x] Design documentation (`docs/perception.md`)
- [ ] Golden-file tests for sample screenshots (optional, for later)

---

## Phase 3: Intelligence

### 3.1 Intelligence Package (`packages/intelligence`)
- [x] Package setup
- [x] Contract tests defining expected API (18 tests)
- [ ] Main analyzer orchestrator (`src/analyzer.ts`)
- [ ] Color extraction (`src/extractors/color.ts`)
- [ ] Typography extraction (`src/extractors/typography.ts`)
- [ ] Spacing extraction (`src/extractors/spacing.ts`)
- [ ] Layout intent detection (`src/extractors/layout.ts`)
- [ ] Color normalization (`src/normalizers/color.ts`)
- [ ] Spacing normalization (`src/normalizers/spacing.ts`)
- [ ] IR builder (`src/ir-builder.ts`)
- [ ] AI prompt templates
- [ ] Make contract tests pass with real implementation
- [ ] Golden-file tests for IR output

---

## Phase 4: WordPress Generator

### 4.1 WP Generator Package (`packages/wp-generator`)
- [x] Package setup
- [x] Contract tests defining expected API (27 tests)
- [ ] Main generator orchestrator (`src/generator.ts`)
- [ ] theme.json generator (`src/theme-json.ts`)
- [ ] Block pattern base (`src/patterns/index.ts`)
- [ ] Hero pattern (`src/patterns/hero.ts`)
- [ ] Grid pattern (`src/patterns/grid.ts`)
- [ ] Columns pattern (`src/patterns/columns.ts`)
- [ ] Cards pattern (`src/patterns/cards.ts`)
- [ ] PHP template generator (`src/templates/index.ts`)
- [ ] Filesystem export (`src/export.ts`)
- [ ] Make contract tests pass with real implementation
- [ ] Golden-file tests for theme output

---

## Phase 5: Validation

### 5.1 Validation Package (`packages/validation`)
- [x] Package setup
- [x] Contract tests defining expected API (21 tests)
- [ ] Screenshot comparator (`src/comparator.ts`)
- [ ] Pixel diff metric (`src/metrics/pixel-diff.ts`)
- [ ] SSIM metric (`src/metrics/ssim.ts`)
- [ ] Section diff metric (`src/metrics/section-diff.ts`)
- [ ] Correction signal generator (`src/signals.ts`)
- [ ] Validation loop controller (`src/loop.ts`)
- [ ] WordPress test environment setup
- [ ] Make contract tests pass with real implementation
- [ ] E2E tests for full loop

---

## Phase 6: CLI

### 6.1 CLI Package (`packages/cli`)
- [x] Package setup
- [x] Contract tests defining expected API (45 tests)
- [x] Entry point stub (`src/index.ts`)
- [ ] Generate command (`src/commands/generate.ts`)
- [ ] Validate command (`src/commands/validate.ts`)
- [ ] Export command (`src/commands/export.ts`)
- [ ] Configuration loading (`src/config.ts`)
- [ ] Progress reporting (`src/progress.ts`)
- [ ] Error handling and user feedback
- [ ] Help text and documentation
- [ ] Make contract tests pass with real implementation

---

## Phase 7: Bedrock Integration

### 7.1 Bedrock Wrapper Package (`packages/bedrock-wrapper`)
- [x] Package setup
- [x] Contract tests defining expected API (17 tests)
- [ ] Filesystem wrapper (`src/wrapper.ts`)
- [ ] Composer.json template (`src/templates/composer.json`)
- [ ] .env.example template (`src/templates/.env.example`)
- [ ] Make contract tests pass with real implementation

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

### M1: Core Complete ✅ ACHIEVED
- [x] Core package with all types and utilities
- [x] AI adapter working with both providers (Claude + OpenAI)
- [x] **Deliverable**: Can construct IR manually and serialize
- [x] Memory package with cross-session learning
- [x] 182 tests passing (core: 100, memory: 82)

### M2: Perception Complete ✅ ACHIEVED
- [x] Full-page screenshots working (Playwright)
- [x] Section boundary detection (AI + edge-snap algorithm)
- [x] **Deliverable**: Can capture and segment any public URL
- [x] Design documentation complete

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
