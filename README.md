# SquaredMc

The SquaredMc marketing site (squaredmc.com), rebuilt outside Framer as a
standalone Vite + React + TypeScript app so it can be worked on from anywhere —
including an iPad via Claude Code — with no dependency on the Framer editor.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

Other scripts:

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Typecheck (`tsc -b`) then production build to `dist/` |
| `npm run preview` | Serve the built `dist/` locally |
| `npm run lint` | oxlint |

## Structure

```
src/
  App.tsx                          page composition
  index.css                        reset + work-rail scrollbar
  components/
    SquaredMcIntroHero.tsx         animated hero (ported from Framer)
    HeroCopy.tsx                   plain marketing copy below the hero
    ScrollHandoffSection.tsx       scroll-pinned sequential handoff
```

### `SquaredMcIntroHero.tsx`

Ported directly out of Framer, where it was a Code Component. Changed in the
port: the `framer` import and the `addPropertyControls` block were removed, and
each property control became a normal React prop carrying the same default
value. **Every physics constant and animation timing is the tuned Framer
value** — they were arrived at through a lot of small iterations, so treat the
numbers in that file as deliberate.

It covers: the logo intro-draw (border wipe → letter-pixel cascade), the cursor
"liquid pixel-push" distortion on the logo letters *and* the logo border, the
72 floating background squares with cursor-push physics, and the scroll-driven
shrink of the logo into a sticky header mark.

Deliberate changes from the Framer source: the border is now made of pushable
blocks rather than a static path, both letters and border render on a finer
block grid, every block carries a bleed so the seams between blocks don't show,
and the logo's outer glow (a three-layer white `box-shadow`) has been removed —
see [The logo block grid](#the-logo-block-grid).

Two things worth knowing:

- **Filename.** In Framer this file existed under two spellings at different
  points — `SquaredMcIntroHero.tsx` and `SquareMcIntroHero.tsx` (missing the
  "d"). `SquaredMcIntroHero.tsx` is the single canonical name here.
- **Logo sizing is pure CSS** — `min(460px, 82vmin, 86vw)`. It used to be a JS
  `window.innerWidth` calculation, which rendered oversized on narrow
  viewports. Don't reintroduce that; verified at 375px wide, the logo lands at
  307.5px with no horizontal overflow.

The scroll-shrink reads `window.scrollY` directly and does nothing on its own —
it needs real content below it to scroll through. `HeroCopy` and
`ScrollHandoffSection` provide that.

### `ScrollHandoffSection.tsx`

The piece Framer's native per-layer Scroll Animation panel couldn't do. In that
panel every layer's animation runs across the *entire* scroll range
independently, so outgoing and incoming content always animate at the same
time. There's no way to window one layer to the first half of the range and the
other to the second half.

Here both panes read the same `scrollYProgress` and each maps it through its own
keyframe windows, so the handoff is genuinely sequential:

```
progress   0 ─────────── 0.45 ─────────── 0.9 ──── 1
intro x    0% ────────► -100% ──── (parked off-screen left) ────►
work  x    (parked off-screen right) ──── 100% ────────► 0% ────►
```

Measured in the browser to confirm there's no overlap:

| progress | intro pane | work pane |
| --- | --- | --- |
| 0.22 | `translateX(-48.9%)` | `translateX(100%)` — parked |
| 0.44 | `translateX(-97.8%)` | `translateX(100%)` — still parked |
| 0.68 | `translateX(-100%)` — parked | `translateX(48.9%)` — entering |
| 0.92 | `translateX(-100%)` — parked | settled at 0 |

Pacing knobs are all props — `scrollDistance` (default `300vh`),
`handoffMidpoint` (`0.45`), `workSettledAt` (`0.9`), `ease`.

**On `ease`:** it defaults to linear on purpose. framer-motion applies easing
per keyframe *segment*, not across the whole range, so an aggressive ease-out
like `[0.16, 1, 0.3, 1]` is ~95% complete a fifth of the way in — the intro
visually finishes leaving long before the 0.45 midpoint and the rest of that
window becomes dead scroll. Keep any easing gentle.

## Reduced motion

`prefers-reduced-motion: reduce` is respected throughout:

- The hero skips the boot sequence and renders the fully-revealed end state,
  with no RAF loop running (no cursor physics, no drift).
- The handoff section drops the pinning and scrubbing entirely — the two panes
  just stack as ordinary sections.
- `index.css` clamps any remaining animation/transition durations.

## Deployment

Live at **https://squaredmc.github.io/SquaredMc-website/**, redeployed on every
push to `main` via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

**Why Pages over Vercel here:** Vercel was the default preference, but linking a
Vercel project needs an interactive OAuth login or a personal access token that
wasn't available when this was set up. Pages was wireable end-to-end from the
repo alone.

> **Note:** Pages doesn't serve private repos on GitHub's free plan, so this
> repo was switched to **public** to publish. If it needs to go private again,
> the site has to move to Vercel (or the org needs a paid plan) — Pages will
> stop serving it.

The tradeoff between the two is worth knowing:

| | GitHub Pages | Vercel |
| --- | --- | --- |
| Setup | Already done, no external account | Needs a Vercel account linked to the repo |
| Preview deploys per PR | No | Yes, automatic |
| Custom domain | Supported (needs a `CNAME` file + DNS) | Supported, simpler |
| Build config | The workflow file | Zero-config, detects Vite |

**To switch to Vercel later:** import the repo at vercel.com/new — it detects
Vite with no configuration. Then delete `.github/workflows/deploy.yml`, and drop
the `VITE_BASE` env var so `base` returns to `/` (Vercel serves from the domain
root, not a subpath).

### Base path

`vite.config.ts` reads `base` from `VITE_BASE`, defaulting to `/`. The Pages
workflow sets it to `/SquaredMc-website/` because Pages serves the repo from
that subpath. If you attach a custom domain like squaredmc.com, remove that env
var from the workflow so assets resolve from the root again.

## Open TODOs

- **Real Work-section content.** `ScrollHandoffSection` ships four placeholder
  cards ("Project One" … "Project Four"). Swap them via the `workItems` prop or
  by editing `PLACEHOLDER_WORK`.
- **Nav link targets.** `navItems` in `App.tsx` currently points at `#work`,
  `#about`, `#contact`. Only `#work` resolves to a real element — About and
  Contact sections don't exist yet.
- **One spec/source discrepancy is still left as the source has it:** the
  **letter cascade** uses randomized per-pixel delays (`LETTERS_START +
  random(1.1) + random(0.45)`), not the spec's fixed "250ms reveal, 100ms
  stagger, letter *n* starts at 600 + n×100ms". Say the word and it's a quick
  change.

  Two others have since been **resolved in favour of the spec**: the border is
  now pushable blocks rather than a static shape (see below), and the
  background squares now share one opacity range (`SQUARE_OPACITY_MIN/MAX`,
  `0.04–0.28`). They previously differed — white `0.04–0.35`, colored
  `0.04–0.52` — which let the colored squares read noticeably hotter than the
  white ones. Square counts are unchanged at 42 white / 30 colored.

## The logo block grid

Both the letter glyphs and the border frame were authored on a **10-unit grid**
(the glyph inset percentages step in 3.33% of the 300-unit viewBox, and the
frame is a 300x300 square minus a 280x280 one). They're rendered at
`BLOCK_UNIT`, currently **5**, which splits every authored block into a 2x2
cluster:

| | authored (10 units) | rendered (`BLOCK_UNIT` = 5) |
| --- | --- | --- |
| Letters | 100 blocks | 400 blocks |
| Border | 116 blocks | 464 blocks |
| **Total** | **216** | **864** |

The logo is pixel-identical at rest — the subdivision only buys finer-grained
cursor distortion. Note this is a 2D subdivision: halving `BLOCK_UNIT`
**quadruples** the block count, it doesn't double it. Measured cost of writing
all 864 transforms is ~0.5ms per frame, well inside a 16ms budget, but that
scaling is worth remembering before going to 2.5.

### Cursor interaction

The border was a single static SVG fill path in the Framer source, so the
cursor passed straight through it while the letters reacted. Letters and border
blocks now share one physics list (`PHYS_LIST`), one offsets array and one
integration loop, so they're pushed and spring back identically — same
`PIX_PUSH_RADIUS` / `PIX_PUSH_FORCE` / `PIX_SPRING_K` / `PIX_DAMP` constants,
no separate tuning.

### Seams

Every block is drawn `BLOCK_BLEED` (0.25 units) larger than its cell in every
direction, so neighbours overlap by 0.5 units at rest. Without it, abutting
rects show faint antialiasing seams — a grid of thin dark lines across the
letters and border where solid white is intended. The bleed is symmetric, so
block centres, and therefore the physics, are unaffected.

### Boot sequence

Unchanged by any of the above. The clockwise draw-in wipe is still the stroked
paths (`_bm_` / `_bfl*_`); only the solid fill was replaced, and the border
blocks fade in on exactly the `_bfill_` timing that path used.

The letter cascade animates per **authored** pixel, not per sub-block — each
block carries a `parent` index and looks up its delay from that, so all four
pieces of an authored pixel still appear together. Subdividing therefore
doesn't change how the letters read as they draw in.

The small 44px header mark still uses the static `BORDER_PATH`; it isn't
interactive and doesn't need 864 nodes.
