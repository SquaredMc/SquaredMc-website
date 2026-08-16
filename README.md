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

One deliberate change from the Framer source: the border is now made of
pushable blocks rather than a static path — see
[Interactive logo border](#interactive-logo-border).

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
- **Two spec/source discrepancies are still left as the source has them** — the
  ported code is the tuned version, so it won:
  1. **Background square opacity** ranges are `0.04–0.35` (white) and
     `0.04–0.52` (colored). The spec said both should be `0.04–0.28`.
  2. The **letter cascade** uses randomized per-pixel delays
     (`LETTERS_START + random(1.1) + random(0.45)`), not the spec's fixed
     "250ms reveal, 100ms stagger, letter *n* starts at 600 + n×100ms".

  Say the word on either and they're quick changes.

  A third discrepancy — the border being a static shape rather than pushable
  blocks — has since been **resolved in favour of the spec**; see below.

## Interactive logo border

The border was a single static SVG fill path in the Framer source, so the
cursor passed straight through it while the letters reacted. It's now built
from **116 individual 10-unit blocks** on the same grid the letters sit on:
30 across the top, 30 across the bottom, and 28 down each side.

Letters and border blocks share one physics list (`PHYS_LIST`), one offsets
array and one integration loop, so they're pushed and spring back identically —
same `PIX_PUSH_RADIUS` / `PIX_PUSH_FORCE` / `PIX_SPRING_K` / `PIX_DAMP`
constants, no separate tuning.

The boot sequence is unchanged. The clockwise draw-in wipe is still the stroked
paths (`_bm_` / `_bfl*_`); only the solid fill was replaced, and the blocks fade
in on exactly the `_bfill_` timing that path used.

One rendering detail: each block is drawn `BORDER_BLEED` (0.25 units) larger
than its cell in every direction, so neighbours overlap by 0.5 units at rest.
Without it, 116 abutting rects show faint antialiasing seams where the old
single path was solid. The bleed is symmetric, so block centres — and therefore
the physics — are unaffected.

The small 44px header mark still uses the static `BORDER_PATH`; it isn't
interactive and doesn't need 116 nodes.
