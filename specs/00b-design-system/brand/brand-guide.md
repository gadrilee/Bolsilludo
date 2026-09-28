# Brand Guide — Bolsilludo
> Version 1.0.0 | Iteration I0 | Canonical reference: `specs/00b-design-system/`

---

## Logo

### Concept

Letter **B** in an emerald gradient with a dark **pocket** holding a **gold coin**.

### Files in this folder

| File | Description | Use when |
|---|---|---|
| `logo-color.svg` | **Primary** — emerald gradient + navy pocket + gold coin | Most uses (dark bg preferred) |
| `logo-white.svg` | Monochrome white | Dark solid backgrounds, overlays |
| `logo-navy.svg` | Monochrome navy `#0B2046` | Light backgrounds, print |
| `icon-maskable.svg` | 512×512 maskable/PWA icon | App icon, home screen, PWA manifest |
| `logo-reference.png` | Reference PNG (260×322) — **do not use in production** | Concept reference only |
| `tokens.json` | Design tokens (W3C format) | Single source of truth |

### Minimum clear space

> 1× the height of the coin (approx. 16px at standard size) on all sides.

### Prohibited uses

- Do not recolor the B with any color outside the palette
- Do not place the color logo on a light background without the navy variant
- Do not add drop shadows, outlines, or glow to the SVG
- Do not distort or rotate
- Do not use `logo-reference.png` in production (wrong coin color `#F8B21E` vs `#F4C13A`)

---

## Palette

| Token | CSS var | Hex | Role |
|---|---|---|---|
| `navy-900` | `--bol-navy-900` | `#0B2046` | Deep bg (dark), main text (light) |
| `emerald-500` | `--bol-emerald-500` | `#16B78C` | Primary bright |
| `green-700` | `--bol-green-700` | `#0B7A5A` | Primary dark (hover, light-theme links) |
| `gold-400` | `--bol-gold-400` | `#F4C13A` | Accent: goals, coin, achievements |
| `emerald-300` | `--bol-emerald-300` | `#5AEFBD` | Logo gradient highlight only |
| `navy-800` | `--bol-navy-800` | `#12305F` | Elevated surface |
| `navy-700` | `--bol-navy-700` | `#1B3F73` | Borders/dividers |
| `ink-muted` | `--bol-ink-muted` | `#A9B8D3` | Secondary text (dark) |
| `ink-muted-l` | `--bol-ink-muted-l` | `#4B5D7E` | Secondary text (light) |
| `gold-700` | `--bol-gold-700` | `#7A5800` | Gold text on light bg |
| `danger-d` | `--bol-danger-d` | `#FF6B70` | Danger indicator (dark theme) |
| `danger-l` | `--bol-danger-l` | `#C62F35` | Danger indicator (light theme) |

**Never hardcode these hex values in components** — always use the CSS custom property (P13).

---

## Themes

### Dark (default)

```css
:root {
  --bg:           #0B2046;
  --surface-1:    #12305F;
  --text:         #FFFFFF;
  --text-muted:   #A9B8D3;
  --primary:      #16B78C;
  --on-primary:   #0B2046;   /* ← navy text on emerald button, WCAG 6.25:1 */
  --accent:       #F4C13A;
  --danger:       #FF6B70;
  --glass-bg:     rgba(255,255,255,.08);
  --glass-border: rgba(255,255,255,.18);
  --glass-blur:   20px;
}
```

### Light

```css
:root[data-theme="light"] {
  --bg:           #F6F8FB;
  --surface-1:    #FFFFFF;
  --text:         #0B2046;
  --text-muted:   #4B5D7E;
  --primary:      #0B7A5A;
  --on-primary:   #FFFFFF;
  --accent:       #7A5800;
  --danger:       #C62F35;
  --glass-bg:     rgba(255,255,255,.62);
  --glass-border: rgba(11,32,70,.12);
}
```

---

## Contrast rules (WCAG 2.2)

| Pair | Ratio | Status | Rule |
|---|---:|---|---|
| White on `#0B2046` | 16.04 | ✅ AAA | All text on dark |
| `#16B78C` on `#0B2046` | 6.25 | ✅ AA | Icons + text on dark |
| `#F4C13A` on `#0B2046` | 9.57 | ✅ AAA | Accent on dark |
| `#0B2046` on `#16B78C` | 6.25 | ✅ AA | **Primary button text (dark navy, NOT white)** |
| `#0B7A5A` on white | 5.32 | ✅ AA | Links on light |
| White on `#0B7A5A` | 5.32 | ✅ AA | Primary button (light) |
| `#16B78C` on white | 2.57 | ❌ Fail | Decorative fill only, never text |
| `#F4C13A` on white | 1.68 | ❌ Fail | Never as text/icon on light |
| White on `#16B78C` | 2.57 | ❌ Fail | Prohibited |

A contrast test runs in CI against all token pairs (section 0.5.3, P10).

---

## Semantic indicators

| Emoji | Meaning | Token |
|---|---|---|
| 🔴 | Critical / overspending | `--danger` |
| 🟠 | Warning / attention | `--accent` (gold) |
| 🟢 | Healthy / on track | `--primary` (emerald) |
| 🔵 | Info | `--text-muted` (navy/ink) |

---

## Typography

| Role | Font | Fallback |
|---|---|---|
| Display / headings | Outfit | Inter, system-ui |
| Body | Inter | system-ui, sans-serif |
| Monospace / numbers | JetBrains Mono | Fira Code, monospace |

---

## Motion

| Token | Value |
|---|---|
| `--dur-fast` | 150ms |
| `--dur-base` | 250ms |
| `--dur-slow` | 350ms |

Always respect `prefers-reduced-motion: reduce` → instant switch + short fade.

---

## Three mandatory visual styles

### 1. Liquid Glass UI
- Use on: dashboard cards, quick actions, bottom sheets, panels, notifications, goal cards, agent dock
- **Do not use on**: dense tables, critical warnings, accounting detail, audit level (Level 4)
- Recipe: `--glass-bg` + `backdrop-filter: blur(--glass-blur) saturate(140%)` + `1px --glass-border` + subtle specular gradient
- Max 3 glass layers visible at once
- Fallbacks: opaque `--surface-1` if `backdrop-filter` unsupported; opaque + strong border if `prefers-contrast: more`

### 2. Depth-Based Interface
| Level | Screen | Surface | Transition |
|---|---|---|---|
| 1 | Dashboard | Glass | base |
| 2 | Category/Account | Glass + more opaque | shared element expand |
| 3 | Transaction | Almost opaque | sheet from below, bg scale 0.97 |
| 4 | Audit/Detail | **Opaque** | panel, no blur |

### 3. Agentic UX
- Intent bar → draft proposal → impact preview → approval → applied
- State: `DRAFT → PROPOSED → APPROVED → APPLIED` (or `REJECTED / EXPIRED`)
- Every AI action shows: "What I observed · Which rule · What I propose · Impact"
- Always reversible; always auditable

---

*Generated: 2026-09-28 · Iteration I0 · See `tokens.json` for machine-readable values*
