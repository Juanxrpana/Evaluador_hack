---
name: Evaluador de Propuestas
description: Ranking explicado y dictámenes auditables para propuestas de laboratorio.
colors:
  calibration-lime: '#d7f36b'
  bench-graphite: '#080a09'
  panel-graphite: '#101412'
  line-graphite: '#232a26'
  ink-dark: '#edf2ee'
  muted-dark: '#93a098'
  revision-amber: '#e8b45e'
  compliance-green: '#8fd8a9'
  discard-red: '#ef918b'
  info-blue: '#9fbcf0'
  room-paper: '#f2f4ef'
  ink-paper: '#0f1511'
  print-paper: '#ffffff'
  print-ink: '#000000'
  amber-ink: '#1a1206'
typography:
  display:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: 'clamp(2rem, 4.6vw, 3.3rem)'
    fontWeight: 700
    lineHeight: 0.98
    letterSpacing: '-0.045em'
  headline:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.95rem'
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: '-0.01em'
  section:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.1rem'
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: '-0.02em'
  body:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: '0em'
  body-sm:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.9rem'
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: '0em'
  small:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.86rem'
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: '0em'
  meta:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.8rem'
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: '0em'
  label:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.72rem'
    fontWeight: 650
    lineHeight: 1.4
    letterSpacing: '0.05em'
  micro:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '0.66rem'
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: '0.05em'
  data:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1rem'
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: '-0.01em'
  title:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.25rem'
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: '-0.03em'
  readout-sm:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.35rem'
    fontWeight: 700
    lineHeight: 1
    letterSpacing: '-0.03em'
  readout:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.6rem'
    fontWeight: 700
    lineHeight: 1
    letterSpacing: '-0.04em'
  figure:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.9rem'
    fontWeight: 700
    lineHeight: 1
    letterSpacing: '-0.05em'
  readout-md:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.7rem'
    fontWeight: 700
    lineHeight: 1
    letterSpacing: '-0.03em'
  readout-lg:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '1.8rem'
    fontWeight: 700
    lineHeight: 1
    letterSpacing: '-0.04em'
  display-xs:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '2.4rem'
    fontWeight: 700
    lineHeight: 1
    letterSpacing: '-0.045em'
  display-sm:
    fontFamily: 'Archivo, ui-sans-serif, system-ui, sans-serif'
    fontSize: '2.6rem'
    fontWeight: 700
    lineHeight: 1
    letterSpacing: '-0.05em'
rounded:
  stamp: '4px'
  micro: '6px'
  control: '7px'
  sm: '8px'
  md: '9px'
  lg: '12px'
  pill: '999px'
spacing:
  xs: '4px'
  sm: '8px'
  md: '16px'
  lg: '24px'
  xl: '40px'
components:
  button-primary:
    backgroundColor: '{colors.calibration-lime}'
    textColor: '{colors.bench-graphite}'
    rounded: '{rounded.md}'
    padding: '9px 15px'
  button-primary-hover:
    backgroundColor: '{colors.calibration-lime}'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.ink-dark}'
    rounded: '{rounded.md}'
    padding: '9px 15px'
  segment-active:
    backgroundColor: '{colors.calibration-lime}'
    textColor: '{colors.bench-graphite}'
    rounded: '7px'
    padding: '6px 13px'
  panel:
    backgroundColor: '{colors.panel-graphite}'
    textColor: '{colors.ink-dark}'
    rounded: '{rounded.lg}'
    padding: '18px 20px'
  input:
    backgroundColor: '{colors.bench-graphite}'
    textColor: '{colors.ink-dark}'
    rounded: '{rounded.sm}'
    padding: '11px 13px'
---

# Design System: Evaluador de Propuestas

## Overview

**Creative North Star: "El acta de medición"**

The interface behaves like a laboratory record that happens to be interactive: a dark instrument panel for reading results, a paper-light mode for printing and daylight review, and a strict separation between what the system calculated and what a person decided. Numbers are the loudest element on the page; colour is a label, never the message.

The system is deliberately quiet. Surfaces are flat and border-led, the grid is structural rather than decorative, and the only saturated gesture is a calibration-lime action. That restraint is what makes the project, provider and document records feel like records instead of a dashboard skin; the same language will carry the ranking, the review and the dictamen when their endpoints land.

**Key Characteristics:**

- Dark graphite ground with a single lime action voice; light mode is a paper counterpart, not an afterthought.
- Tabular numerals, explicit units, and absolute dates; money always reads `Bs 172.800,00`.
- Status is a text badge with a dot; the same information survives without colour.
- Rectangular panels, hairline rules, 8–12px corners; no shadowed card stack.
- One authored motion: a short rise for page content and a 180ms lift on controls.

## Colors

A graphite instrument palette with one lime calibration signal and four functional state hues.

### Primary

- **Calibration Lime** (#d7f36b): primary buttons, the active ranking segment, focus rings, and the active navigation underline. In light mode it is replaced by **Deep Forest** (#1d4d2f) so the same role keeps AA contrast on paper.

### Neutral

- **Bench Graphite** (#080a09): page ground in dark mode; the surface behind every readout.
- **Panel Graphite** (#101412): panels, sticky header, and control wells.
- **Line Graphite** (#232a26): dividers, table rules, and field borders.
- **Instrument Ink** (#edf2ee): primary text on dark.
- **Instrument Muted** (#93a098): ledes, labels, and secondary metadata.
- **Room Paper** (#f2f4ef) / **Paper Ink** (#0f1511): the light-mode ground and text pair.
- **Print Paper** (#ffffff) / **Print Ink** (#000000): the print-only pair inside `@media print`; never used on screen.
- **Amber Ink** (#1a1206): text on the amber review-count pill, where white would fail contrast.

### Secondary

- **Revision Amber** (#e8b45e): proposals that need a human decision, excluded-proposal notices, and unverified-rate stamps.
- **Compliance Green** (#8fd8a9): adjudicable states and confirmed checks.
- **Discard Red** (#ef918b): proposals outside the ranking and destructive confirmations.
- **Reference Blue** (#9fbcf0): processing states (`leyendo`, `verificando`, `calculando`).

### Named Rules

**The One Voice Rule.** Lime appears only on the primary action, the selected segment, the focus ring, and the active nav underline. It should not exceed roughly 10% of any screen; its rarity is the signal.

**The Readout Rule.** Every number carries its unit and its moment. `Bs 172.800,00` and `27 nov 2026, 14:31` are complete; `172800` and `hoy` are not.

**The Text-Not-Colour Rule.** A state is always written (`Requiere revisión`, `Fuera del ranking`); colour only reinforces it. A user who cannot see the hue must still get the answer.

## Typography

**Display Font:** Archivo (variable, self-hosted; `ui-sans-serif` fallback)
**Body Font:** Archivo (same family, 400–700)
**Data Font:** Archivo with `font-variant-numeric: tabular-nums`; hashes and IDs use the system mono stack.

**Character:** A workhorse grotesque with tight, confident display settings and calm body text. The family is the same everywhere; hierarchy comes from size, weight, and tracking rather than a second face.

### Hierarchy

- **Display** (700, `clamp(2rem, 4.6vw, 3.3rem)`, 0.98): page titles only; max two lines at 390px.
- **Headline** (700, 0.95rem, 1.3): panel titles and section labels.
- **Title** (700, 1.25rem, 1.2): dictamen section titles and compact headings.
- **Body** (400, 1rem, 1.6): ledes and prose; measure capped at 68ch.
- **Body small** (400, 0.9rem, 1.55): long helper copy and document prose.
- **Small** (600, 0.86rem, 1.45): list rows, field labels, and inline metadata.
- **Meta** (400, 0.8rem, 1.45): footnotes, dates, and secondary metadata.
- **Label** (650, 0.72rem, 0.05em, uppercase): readout labels, table headers, and status metadata.
- **Micro** (700, 0.66rem, 0.05em, uppercase): chips, stamps, and badges.
- **Data** (650–700, tabular, 1rem–1.9rem): money, positions, deltas, and dates.

### Named Rules

**The Tabular Rule.** Any figure that sits in a column, changes after a review, or is compared with another figure uses tabular numerals.

**The No-Eyebrow Rule.** App surfaces do not use a kicker above the heading; the heading carries its own weight.

## Layout

The app is a single `1180px` max-width column with a sticky top bar. Content uses a `24px` base rhythm (`gap: clamp(1.1rem, 2.5vw, 1.6rem)`), generous top padding, and a `4rem` bottom close. Grids are structural: three equal readout cells for project counts, four for proposal summary, two columns for home, detail, and review.

- **Desktop:** brand + project chip + centered nav + actions in one sticky row; 3/4-cell readouts; ledger rows with five columns.
- **≤980px:** project chip hides; readout--four becomes 2×2; home/detail/review become one column.
- **≤760px:** nav drops to a second scrollable row; readouts become one column; ledger rows become a 2-column stack (position rail + content); page actions become full-width stacked buttons.
- **≤420px:** nav and icon controls compress; labels remain intact.

The ledger and readout are the signature structures: a position rail, a vendor identity block, a tabular total, a delta against the first place, and a state badge.

## Elevation & Depth

Flat by default. Depth is carried by a one-step tonal shift (`--surface` on `--bg`), a hairline border, and spacing, not by stacked shadows. The only shadows are the soft glow under a hovered primary button (`0 8px 24px` at 24% accent) and the toast-free result panel's tinted background.

**The Flat-By-Default Rule.** A panel at rest has no shadow. Hover may lift a control by 1px; nothing floats above the page.

## Shapes

Rectangles with small, consistent corners: `4px` for print stamps, `6px` for tiny inline surfaces, `7px` for the segment control, `8px` for inputs and small buttons, `9px` for controls, `12px` for panels and the ledger, `999px` only for status badges, chips, and the project chip. Borders are one device pixel and always full-perimeter. No clipped corners, no side stripes, no glass.

## Components

### Buttons

- **Shape:** 9px radius, 40px minimum height, 1px border.
- **Primary:** lime fill, graphite text; used once per action group.
- **Hover / Focus:** 1px lift, soft accent glow; `:focus-visible` is a 2px lime outline with 3px offset.
- **Ghost:** transparent with a line border; hover fills the panel tone.
- **Danger ghost:** red text and border tint; hover adds a 9% red wash.

### Segment

- **Style:** a recessed track with a 7px-radius active pill; the active pill is lime in dark mode and deep forest in light mode.
- **State:** `aria-pressed` mirrors the visual selection; the ranking copy changes with it.

### Badges and Chips

- **Style:** pill, 1px tinted border, 8–11% tinted fill, dot plus text.
- **States:** green (adjudicable), amber (revision), red (outside), blue (processing), neutral (queued).
- **Movement chips:** `Nuevo`, `Subió`, `Bajó` appear only in the adjusted ranking.

### Panels

- **Corner:** 12px; **background:** panel graphite; **border:** line graphite; **padding:** 18–20px.
- **Head:** title left, quiet meta or action right; no nested cards.

### Inputs and Notes

- **Style:** 8px radius, dark well, 1px line border; focus shifts the border to the accent and adds a translucent ring.
- **Error:** red text below the field, never only a red border.

### Navigation

- **Style:** 13px/600 labels on a transparent row; hover fills the panel tone; active gets a 1px lime underline and the panel tone.
- **Mobile:** second row, horizontal scroll without a visible scrollbar; the review count rides as an amber pill.

### Dictamen

A paper-like sheet inside the app: a stamped `Borrador para firma`, six numbered sections, and a closing non-adjudication sentence. It has its own print stylesheet: white ground, no chrome, no navigation.

## Do's and Don'ts

### Do:

- **Do** show the count of excluded or pending items beside the list it affects, with a link to the reason.
- **Do** keep money, dates, and rates in explicit Spanish formats.
- **Do** use the lime voice once per screen; let the readouts carry the hierarchy.
- **Do** keep the dark theme as the default and preserve the light theme as a full peer.
- **Do** use text plus colour for every state, and keep touch targets at least 44px.

### Don't:

- **Don't** use a decorative grid-line background; the layout grid is structure, not wallpaper.
- **Don't** put an eyebrow above a demo page heading.
- **Don't** use gradient text, glass, or a side accent stripe on a panel.
- **Don't** show the model's confidence as a percentage or let it justify a discard.
- **Don't** call the ranking "definitivo", the winner "ganadora", or the total "TCO".
- **Don't** use colour alone to distinguish a business rule from a technical failure.
