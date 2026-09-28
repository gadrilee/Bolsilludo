# PLAN — Design System (Spec 00b)

## Architecture

We will create a lightweight Node.js package in `packages/design-tokens`:
1. It will consume `specs/00b-design-system/brand/tokens.json`.
2. It will contain a `validate-contrast.js` script to parse the `contrast-validation` section of the tokens and calculate relative luminance/contrast ratio to ensure WCAG AA compliance.
3. It will contain a script to generate `theme.css` (CSS custom properties) from the tokens.

## Stack
- Node.js scripts (no external heavy dependencies for validation, just standard math).
- CSS Variables (`--bol-*`).

## Validation
- We use the WCAG 2.x contrast formula: `(L1 + 0.05) / (L2 + 0.05)`.
- Pass criteria: Ratio >= 4.5 for normal text, >= 3.0 for large text/icons. We use the ratios defined in the tokens.
