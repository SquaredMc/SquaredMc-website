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
    HeroCopy.tsx                   opening marketing copy (first stage pane)
    ScrollHandoffSection.tsx       pinned stage, horizontal pane handoff
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

The pinned content stage. **Every text block on the page lives in here and hands
off horizontally — nothing scrolls vertically past anything else.** `App.tsx`
passes it an ordered `panes` array; it currently holds the opening copy
(`HeroCopy`), a "What we do" `TextPane`, and the `WorkPane` cards.

#### The squares slice

The stage's content panel starts `squaresSlice` (default `0.3`) down the
viewport and the shell paints no background of its own, so the top 30% is never
covered and the hero's floating squares stay visible — and pushable — for the
whole page.

`App.tsx` owns the fraction as a single `SQUARES_SLICE` constant and passes it to
**both** components: the stage won't paint over that strip, and the hero's
`squaresCompressTo` confines the squares to exactly it. They have to match, so
change it in one place.

The "scroll stops at 70vh" behaviour falls out of the sticky mechanics rather
than any scroll maths — the panel rides up with the page until the frame pins at
`top: 0`, at which point its top edge is at 30vh and it goes no further:

| scrollY | panel top |
| --- | --- |
| 0 | 130vh |
| 360 | 80vh |
| 720 | **30vh — pinned** |
| 2000 | 30vh |
| 3600 | 30vh |

#### Sequential handoff

This is the thing Framer's per-layer Scroll Animation panel couldn't do. There,
every layer's animation runs across the *entire* scroll range independently, so
outgoing and incoming content always moved together. Here every pane reads the
same `scrollYProgress` and maps it through its own keyframe window.

Progress splits into (paneCount - 1) equal cycles, one per handoff. Within a
cycle the outgoing pane exits by `handoffMidpoint` and the incoming one arrives
between `handoffMidpoint` and `paneSettledAt`. Measured from the real
`paneKeyframes` output for the current 3 panes:

| progress | intro | what we do | work |
| --- | --- | --- | --- |
| 0 – 0.12 | 0% (resting) | 100% parked | 100% parked |
| 0.20 | -40% leaving | 100% parked | 100% parked |
| 0.32 | -100% gone | 100% parked | 100% parked |
| 0.44 | -100% | 38% arriving | 100% parked |
| 0.52 | -100% | 0% (resting) | 100% parked |
| 0.62 | -100% | -30% leaving | 100% parked |
| 0.76 | -100% | -100% gone | 100% parked |
| 0.88 | -100% | -100% | 38% arriving |
| 0.96 – 1 | -100% | -100% | 0% (resting) |

Never more than one pane in motion at a time.

#### `leadHold`

The first pane rests for `leadHold` (default `0.12`) of the runway before it
starts leaving. Without it the opening copy begins sliding out the instant the
frame pins — it finishes rising into place and immediately leaves, so it never
rests anywhere readable. The remaining cycles are squeezed into the leftover
runway, so the handoff structure is unchanged.

#### Pacing knobs

All props: `squaresSlice` (0.3), `scrollPerHandoff` (200vh each, so total stage
height is `100 + (panes-1) * 200` vh), `handoffMidpoint` (0.45),
`paneSettledAt` (0.9), `leadHold` (0.12), `ease`.

**On `ease`:** it defaults to linear on purpose. framer-motion applies easing
per keyframe *segment*, not across the whole range, so an aggressive ease-out
like `[0.16, 1, 0.3, 1]` is ~95% complete a fifth of the way through a cycle —
the outgoing pane visually finishes leaving long before the midpoint and the
rest of that window becomes dead scroll. Keep any easing gentle.

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
- **All three spec/source discrepancies are now resolved in favour of the
  spec.** The border is pushable blocks rather than a static shape (see below),
  the background squares share one opacity range (`SQUARE_OPACITY_MIN/MAX`,
  `0.04–0.28`, previously white `0.04–0.35` and colored `0.04–0.52`), and the
  letter cascade is a fixed reading-order sweep rather than a random scatter
  (see below).

## The letter cascade

The letters reveal in reading order of the 3x3 grid — **S Q U / A R E / D M C**
— not the authoring order `LETTER_DATA` happens to be in (S E R C M D A U Q).
Each letter is looked up by id via `LETTER_READING_ORDER`.

| | value |
| --- | --- |
| Stagger between letter starts | `LETTER_STAGGER` = 100ms |
| Reveal window per letter | `LETTER_REVEAL` = 250ms |
| Per-block snap | `BLOCK_DUR` = 90ms |
| Total span | 1.05s |

Consecutive letters overlap, since each takes 250ms but starts only 100ms after
the last. Within a letter the pixels snap on one after another across the 250ms
window in raster order (top row first, left to right) — that is the "pixel-block
wipe, not a smooth fade" the spec asks for. Keep `BLOCK_DUR` well under
`LETTER_REVEAL`, or the blocks overlap so heavily the wipe reads as a fade again.

The whole thing is deterministic now. It used to be
`LETTERS_START + random(1.1) + random(0.45)` per pixel, which scattered the
letters in randomly with no reading order at all.

### The anchor

`LETTERS_START` is the one place this departs from the spec's literal numbers.
The spec says letter *n* starts at `600 + n*100`ms, but 600ms is its assumed
border-draw duration — it means "letters start once the border has finished".
The border here takes `BDR` (3.2s), so the anchor tracks `BDR` and the cascade
structure is unchanged; the last letter finishes 1.05s later, exactly as the
spec's 1650ms figure implies. Two one-line alternatives are noted in the source:

- `0.6` — the spec's literal absolute times, letters start mid-draw
- `BDR * 0.56` — the previous behaviour, letters overlap the border draw

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
