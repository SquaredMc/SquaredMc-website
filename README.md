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

Ported directly out of Framer, where it was a Code Component. The only changes
made in the port: the `framer` import and the `addPropertyControls` block were
removed, and each property control became a normal React prop carrying the same
default value. **The animation logic, physics constants and timings were not
touched** — they were tuned through a lot of small iterations, so treat the
numbers in that file as deliberate.

It covers: the logo intro-draw (border wipe → letter-pixel cascade), the cursor
"liquid pixel-push" distortion on the logo letters, the 72 floating background
squares with cursor-push physics, and the scroll-driven shrink of the logo into
a sticky header mark.

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

Deploys to **GitHub Pages** on every push to `main`, via
[`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

**Why Pages over Vercel here:** Vercel was the default preference, but linking a
Vercel project needs an interactive OAuth login or a personal access token that
wasn't available when this was set up. Pages was wireable end-to-end from the
repo alone. The tradeoff is real and worth knowing:

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
- **Three spec/source discrepancies were left as the source has them** — the
  ported code is the tuned version, so it won:
  1. The **logo border** is a single static SVG path. The written spec
     described it rebuilt as ~116 individual 10px blocks sharing the letters'
     push/spring physics; the source doesn't do that, so neither does this.
  2. **Background square opacity** ranges are `0.04–0.35` (white) and
     `0.04–0.52` (colored). The spec said both should be `0.04–0.28`.
  3. The **letter cascade** uses randomized per-pixel delays
     (`LETTERS_START + random(1.1) + random(0.45)`), not the spec's fixed
     "250ms reveal, 100ms stagger, letter *n* starts at 600 + n×100ms".

  Say the word on any of these and they're quick changes.
