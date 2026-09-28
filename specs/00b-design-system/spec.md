# SPEC 00b — Design System & Platform UX

## Goal
Establish the single source of truth for Bolsilludo's visual identity, typography, motion, and core UX principles. Enforce these via code (tokens) and automated tests (contrast).

## Scope
- `packages/design-tokens`: The package containing `tokens.json` and generating CSS variables.
- Contrast validation script.
- Integration of the three core visual styles:
  1. Liquid Glass UI
  2. Depth-Based Interface
  3. Agentic UX

## Non-goals
- Building the actual React components (this belongs to `packages/ui`).
- Defining the layout of specific product pages.

## Business Rules (Constitution)
- **P10 Accessibility**: Must meet WCAG 2.2 AA. Contrast must be validated.
- **P13 Brand Tokens SSoT**: Hardcoded hex colors are prohibited. All UI must use the design system tokens.
- **P14 Universal CalcInput**: Money fields must use a calculator.
- **P15 Agentic UX**: UI must support draft/proposed/applied states.

## Acceptance Criteria
- `tokens.json` exists and defines all colors, themes, glass, depth, typography, radius, and motion.
- A script automatically parses `tokens.json` and verifies that all contrast pairs specified in `"contrast-validation"` pass their WCAG 2.2 AA requirements.
- The `design-tokens` package exposes CSS variables that can be consumed by the frontend application.
