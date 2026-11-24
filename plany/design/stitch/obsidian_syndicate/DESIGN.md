---
name: Obsidian Syndicate
colors:
  surface: '#161120'
  surface-dim: '#161120'
  surface-bright: '#3c3647'
  surface-container-lowest: '#110c1a'
  surface-container-low: '#1e1928'
  surface-container: '#221d2d'
  surface-container-high: '#2d2738'
  surface-container-highest: '#383243'
  on-surface: '#e9def5'
  on-surface-variant: '#d3c5ac'
  inverse-surface: '#e9def5'
  inverse-on-surface: '#332e3e'
  outline: '#9c8f79'
  outline-variant: '#4f4633'
  surface-tint: '#f9bd22'
  primary: '#ffe1a7'
  on-primary: '#402d00'
  primary-container: '#fbbf24'
  on-primary-container: '#6c4f00'
  inverse-primary: '#795900'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#f2ddff'
  on-tertiary: '#490080'
  tertiary-container: '#dfbaff'
  on-tertiary-container: '#7819c7'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#ffdf9f'
  primary-fixed-dim: '#f9bd22'
  on-primary-fixed: '#261a00'
  on-primary-fixed-variant: '#5c4300'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#f0dbff'
  tertiary-fixed-dim: '#ddb7ff'
  on-tertiary-fixed: '#2c0051'
  on-tertiary-fixed-variant: '#6900b3'
  background: '#161120'
  on-background: '#e9def5'
  surface-variant: '#383243'
typography:
  headline-xl:
    fontFamily: Space Grotesk
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Space Grotesk
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-lg:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 18px
  label-numeric:
    fontFamily: JetBrains Mono
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-data-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-caps:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '600'
    lineHeight: 14px
    letterSpacing: 0.08em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-lg: 1.5rem
  margin: 1rem
  margin-md: 1.5rem
  margin-lg: 2.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
  space-2xl: 2rem
---

## Brand & Style

This design system merges the rigorous density of institutional financial terminals with the electric focus of competitive gaming dashboards. Crafted for high-stakes portfolio managers, digital asset traders, and strategy simulation players, the UI establishes an atmosphere of nocturnal mastery, precise execution, and measured risk.

The visual style blends **Dark Terminal Modernism** with **Glassmorphic Precision**:
- High-density information layouts utilizing strict modularity and fine structural lines.
- Deep, atmospheric midnight-plum backdrops that eliminate eye fatigue during extended nocturnal sessions.
- Laser-focused neon amber and gold kinetic highlights to direct cognitive flow toward actions, gains, and yield opportunities.
- Cyber-emerald status accents signaling real-time performance, positive alpha, and secure transaction confirmation.

## Colors

The palette relies on a tonal hierarchy rooted in rich, deep violet-slate tones instead of standard neutral grays.

### Surface Tones
- **Base Canvas (`#120d1c`):** Deepest midnight plum for root screen backgrounds.
- **Surface Layer 1 (`#1a1427`):** Recessed panels, module chassis, and navigation rails.
- **Surface Layer 2 (`#231b34`):** Cards, raised tiles, data tables, and input containers.
- **Surface Hover / Highlight (`#2e2444`):** Interactive state for table rows, hovered cards, and tooltips.
- **Border / Keyline (`#392d52`):** Primary boundary stroke for cards, dividers, and structural grids.
- **Border Muted (`#2b213f`):** Subdued inner card separators and row dividers.

### Accents & Telemetry
- **Primary Accent (`#fbbf24` / `#f59e0b` / `#eab308`):** Kinetic amber-gold used for primary call-to-actions, active telemetry states, currency gains, and focal highlights.
- **Positive / Alpha Green (`#10b981` / `#34d399`):** Cyber-emerald for upward trends, net yields, active network status, and confirmed trades.
- **Negative / Risk Red (`#f43f5e`):** Sharp crimson for liquidations, losses, stops, and alerts.
- **Neutral Foreground Text:**
  - High Contrast (`#f8fafc`): Key values, primary titles, critical metrics.
  - Medium Contrast (`#cbd5e1`): Body copy, labels, column headers.
  - Subdued / Trace (`#94a3b8` / `#6b5b88`): Secondary metadata, unit badges, disabled actions.

## Typography

Typography balances futuristic authority with tabular precision.
- **Space Grotesk** anchors high-level headings, asset valuations, and modal banners. Its angled geometry mirrors technical precision.
- **Geist** drives contextual body copy, descriptions, notes, and instructions with clean neutrality and tight spatial efficiency.
- **JetBrains Mono** governs all ticker symbols, numerical tables, timestamps, percentages, orderbook metrics, and code/terminal snippets to prevent column alignment shifting under real-time streaming updates.

## Layout & Spacing

Layouts follow a high-density, multi-pane command-center paradigm.
- **Grid Architecture:** Desktop views employ an edge-to-edge 12-column fluid grid or pinned horizontal workbenches (Left: Command/Watchlist, Center: Core Telemetry/Simulation Canvas, Right: Orderbook/Action Rails).
- **Responsive Adaptations:**
  - **Desktop (>= 1280px):** 12-column layout with `gutter-lg` (1.5rem) and `margin-lg` (2.5rem). Multi-pane split view with dockable tool panels.
  - **Tablet (768px - 1279px):** 8-column layout with `gutter` (1rem) and `margin-md` (1.5rem). Collapsible telemetry drawers and prioritized horizontal scrolling card rails.
  - **Mobile (< 768px):** 4-column stacked layout with `gutter` (0.75rem) and `margin` (1rem). Segmented tab controls replace simultaneous multi-pane docks.

## Elevation & Depth

Visual hierarchy uses **tonal layer nesting** accented with **neon ambient illumination** and subtle glass overlays:
- **Base Canvas:** Solid `#120d1c` provides absolute darkness.
- **Level 1 (Docked Containers):** `#1a1427` bounded by 1px border of `#392d52`.
- **Level 2 (Active Cards & Modules):** `#231b34` with an ultra-subtle inset top highlight (`inset 0 1px 0 rgba(255, 255, 255, 0.05)`).
- **Level 3 (Modals, Overlays, Floating HUDs):** `#1a1427` with 90% opacity, `backdrop-filter: blur(16px)`, a crisp 1px stroke of `#392d52`, and an ambient diffused drop shadow: `0 16px 40px -8px rgba(0, 0, 0, 0.75), 0 0 24px -4px rgba(251, 191, 36, 0.08)`.
- **Active Glow Elevation:** High-tier alerts, selected trade cards, or winning leaderboard nodes feature a focused perimeter aura: `box-shadow: 0 0 16px rgba(251, 191, 36, 0.25)`.

## Shapes

The interface embraces a **Soft / Technical Terminal** aesthetic:
- Default components (buttons, text inputs, badges, data rows) use **0.25rem (4px)** radii to preserve crisp instrument lines and maximize screen real estate.
- Structural modules and parent dashboard cards use **0.5rem (8px)** (`rounded-lg`).
- Floating HUD dialogs and popovers use **0.75rem (12px)** (`rounded-xl`).
- Micro status indicators, radio buttons, and avatar markers retain full circularity (`rounded-full`).

## Components

### Buttons
- **Primary Action (Execute/Invest/Claim):** Background `#fbbf24`, text `#120d1c` in `Space Grotesk` Bold. On hover, background shifts to `#f59e0b` with a subtle gold emission: `box-shadow: 0 0 12px rgba(251, 191, 36, 0.4)`. On active, scales down to 0.98.
- **Secondary (Terminal Control):** Background `#231b34`, text `#f8fafc`, 1px border `#392d52`. Hover shifts background to `#2e2444` and border to `#fbbf24`.
- **Destructive / Stop-Loss:** Background `rgba(244, 63, 94, 0.12)`, border `rgba(244, 63, 94, 0.4)`, text `#f43f5e`. Hover fills to solid `#f43f5e` with text `#ffffff`.

### Data Cards & Panels
- **Structure:** Background `#231b34`, 1px solid border `#392d52`, 4px inner padding rhythm.
- **Header:** Features an uppercase category tag in `label-caps` (`#94a3b8`) paired with actionable icon buttons or status pips.
- **Stat Metric Cards:** Large numeral in `headline-lg` (`Space Grotesk`) alongside a micro sparkline and dynamic delta badge.

### Status Chips & Badges
- **Positive Yield Badge:** Background `rgba(16, 185, 129, 0.12)`, border `1px solid rgba(16, 185, 129, 0.3)`, text `#10b981`, mono font. Includes a 4px pulsating green indicator light.
- **Staked / Tier Badge:** Background `rgba(251, 191, 36, 0.12)`, border `1px solid rgba(251, 191, 36, 0.35)`, text `#fbbf24`.

### Input Fields
- **Terminal Input:** Background `#161022`, border `1px solid #392d52`, text `#f8fafc`, font `JetBrains Mono`.
- **Focus State:** Border transitions to `#fbbf24` with a 1px ring `rgba(251, 191, 36, 0.2)`. Placeholder text colored in `#6b5b88`.
- **Currency/Amount Suffix:** Right-aligned locked mono label (`e.g., USD, GOLD, CR`) rendered in `#94a3b8`.

### Checkboxes & Segmented Toggles
- **Checkbox:** 16x16px square, 3px border radius, background `#161022`, border `#392d52`. Checked state: background `#fbbf24`, border `#fbbf24`, icon dark `#120d1c`.
- **Segmented Timeframe Selector:** Pill-less segmented rail. Background `#161022` with a 1px border `#392d52`. Active item receives background `#2e2444`, text `#fbbf24`, and an accent gold baseline.

### Specialized Gaming-Finance Components
- **Orderbook Ladder:** Alternating row highlights with depth bars rendered as translucent horizontal progress fills: green (`rgba(16, 185, 129, 0.15)`) for bids, crimson (`rgba(244, 63, 94, 0.15)`) for asks.
- **Leaderboard Ticker:** Dense row-level module showing guild/user rank, avatar badge, portfolio net worth in mono font, and real-time rank delta arrows.