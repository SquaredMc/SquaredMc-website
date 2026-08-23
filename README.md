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
  lib/
    handoff.ts                     pure keyframe maths + placeholder work data
    layout.ts                      SQUARES_SLICE, FOOTER_HEIGHT
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
(`HeroCopy`), a "What we do" `TextPane`, a heading-only "Watch this space"
`TextPane`, and a `ContactPane`.

`TextPane` takes `label` and `paragraph` as optional, so passing `heading`
alone gives a heading-only pane in the identical type style as every other
section header — the style is defined once and reused rather than copied.

#### The squares slice

The stage's content panel starts `squaresSlice` (default `0.3`) down the
viewport and the shell paints no background of its own, so the top 30% is never
covered and the hero's floating squares stay visible — and pushable — for the
whole page.

`src/lib/layout.ts` owns the fraction as a single `SQUARES_SLICE` constant, used
by **both** components: the stage won't paint over that strip, and the hero's
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

The timeline alternates **hold** and **handoff** phases, both measured in vh of
scroll:

```
hold 0 │ handoff 0 │ hold 1 │ handoff 1 │ hold 2
├──────┼───────────┼────────┼───────────┼──────┤
pane 0 │  0 ──► 1  │ pane 1 │  1 ──► 2  │ pane 2
```

Within one handoff the outgoing pane exits over `[0, handoffMidpoint]` and the
incoming one arrives over `[handoffMidpoint, paneSettledAt]`. Verified against
the real `paneKeyframes` output for the current 4 panes: inputs are monotonic
and **never more than one pane is in motion** at any progress.

#### Every pane gets a real stop

Rests used to be derived from the tail of each handoff window — whatever was
left after `paneSettledAt`. That gave the first pane a decent hold but left the
middle ones with about 18vh, so they slid in and kept going and you could scroll
straight past them without the text ever settling.

`scrollPerHold` now buys each pane an explicit rest phase of its own:

| pane | rest |
| --- | --- |
| intro | 70vh |
| what we do | 88vh |
| watch this space | 88vh |
| contact | 88vh |

The middle and last panes get a little more than `scrollPerHold` because the
tail of the handoff that delivers them — the `1 - paneSettledAt` remainder — is
also time at rest. The first pane has no arriving handoff, so it gets exactly
its hold.

#### Pacing knobs

All props: `squaresSlice` (0.3), `scrollPerHandoff` (180vh), `scrollPerHold`
(70vh), `handoffMidpoint` (0.45), `paneSettledAt` (0.9), `ease`.

Total stage height is `100vh + (panes x scrollPerHold) + ((panes - 1) x
scrollPerHandoff)` — **920vh** for the current four. Every pane added costs
another 250vh; trim `scrollPerHandoff` if the page starts feeling long.

#### Nav links and `paneAnchors`

The panes live inside a pinned frame, so a plain `#id` on a pane would jump to
the frame rather than to the scroll position where that pane is on screen.
`paneAnchors` takes an id per pane and drops a zero-size anchor into the outer
spacer at `i * (scrollPerHold + scrollPerHandoff)` — the start of that pane's
hold phase, which is after it has finished arriving.

For the contact pane that puts the anchor at 750vh of an 820vh runway, i.e.
progress 0.915, where the pane measures exactly `0%` — fully settled. The jump
is instant rather than smooth, because `index.css` deliberately keeps
`scroll-behavior: auto`.

The **header logo mark** is a back-to-top link — click it from anywhere and you
return to the full-size logo at the top of the page. It's an `<a>` whose click
handler calls `preventDefault()` then `scrollTo({ top: 0 })`, so the `#` never
reaches the URL. Also instant: easing ~900vh back up would scrub the entire
pane handoff sequence in reverse on the way. Unlike the big hero logo — which
isn't clickable and uses the default cursor — this one gets `cursor: pointer`.

**On `ease`:** it defaults to linear on purpose. framer-motion applies easing
per keyframe *segment*, not across the whole range, so an aggressive ease-out
like `[0.16, 1, 0.3, 1]` is ~95% complete a fifth of the way through a cycle —
the outgoing pane visually finishes leaving long before the midpoint and the
rest of that window becomes dead scroll. Keep any easing gentle.

## The fixed footer

The footer is page chrome, not the end of the document: `position: fixed` to
the bottom, on screen for every section including the hero. It's opaque `#000`
at `z-index: 40`, above the stage's content panel (`z-index: 30`), so pane
content slides **behind** it rather than over it — verified by hit-testing the
footer band, which returns the footer while the pane underneath still extends
to the full viewport height.

Panes carry `FOOTER_HEIGHT` as bottom padding so their text centres in the
visible area instead of disappearing under the bar. The pane itself is not
shortened; only its content is inset.

It was slimmed from ~108px to `FOOTER_HEIGHT` (56px) when it became persistent
— the old height was fine for a block at the end of a scrolling page, but eats
too much viewport as a permanent bar. It now sits close to the 64px header.

## Touch and mobile

Touch originally did **nothing** here. Only `mousemove`, `mouseenter` and
`mouseleave` were bound, and mobile browsers don't fire `mousemove` during a
drag, so neither the logo distortion nor the square push ever ran on a phone.

Both now work from one code path:

- **Drag** — `touchstart` / `touchmove` are registered **passive**, which is
  what makes this work: passive listeners keep firing while the browser scrolls
  the page, so the squares part around your finger as you scroll. Pointer
  Events would not do this — the browser fires `pointercancel` the moment it
  claims the gesture for scrolling.
- **Tap** — sets `impulse`, giving one frame at `TAP_IMPULSE` (6x) the normal
  force, so a stationary tap still shoves things. A hovering cursor pushes
  every frame and accumulates velocity; a tap gets one frame, so it has to be
  worth several.
- **Lift** — `touchend` / `touchcancel` clear the pointer so everything springs
  back.

Touch has no enter/leave, so `isOverLogo` is hit-tested against the logo rect
on every move. Mouse goes through the same path rather than keeping two ways of
deciding the same thing.

### The parked-cursor bug this fixed

`cursorX` / `cursorY` start at `0, 0` and the square push was gated only on
`!isOverLogo`. That meant the physics treated the **viewport's top-left corner
as a permanently parked cursor**, shoving every square within `PUSH_RADIUS`
(160px) of it away — forever. A first mouse move hid it on desktop; on touch
nothing ever corrected it, and it carved a visible hole out of the corner. It
got worse once the squares compressed into the top 30%, because the corner sits
inside that slice.

`hasPointer` now gates the push, so nothing moves until a real pointer has
actually been seen.

### `dvh`, not `vh`

The hero, the pinned frame, the stage container and the anchor offsets are all
in `dvh`. On iOS Safari `100vh` is the URL-bar-*hidden* height, so a vh-sized
pinned frame runs past the fold while the bar is showing.

All four have to use the **same** unit. Mixing them would leave the real runway
different from the one the anchor offsets were computed against, and the nav
anchors would stop landing on a settled pane. Verified at 375x812: hero and
frame 812px, stage 7470px (920dvh), contact anchor 6090px (750dvh), anchor
progress still exactly 0.915.

## Reduced motion

`prefers-reduced-motion: reduce` is respected throughout:

- The hero skips the boot sequence and renders the fully-revealed end state,
  with no RAF loop running (no cursor physics, no drift).
- The handoff section drops the pinning and scrubbing entirely — the two panes
  just stack as ordinary sections.
- `index.css` clamps any remaining animation/transition durations.

## Deployment

The site is served from **https://squaredmc.com/**, redeployed on every push to
`main` via [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml).

`squaredmc.github.io/SquaredMc-website/` is the fallback URL. Once the custom
domain is active GitHub redirects it there, but the build works at either
address — see Base path below.

### Custom domain

Two pieces have to agree:

1. **`public/CNAME`** contains `squaredmc.com`. Vite copies it into `dist/`, so
   it rides along in the published artifact. For an Actions-based Pages deploy
   the file has to be *in the artifact* — otherwise GitHub drops the custom
   domain on every deploy.
2. **DNS** on squaredmc.com, which is managed at the registrar, not here.

DNS records (from GitHub's docs):

| Type | Name | Value |
| --- | --- | --- |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |
| CNAME | `www` | `squaredmc.github.io` |

Optional IPv6, as AAAA records on `@`: `2606:50c0:8000::153`,
`2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153`.

The `www` CNAME points at `squaredmc.github.io` — **without** the repository
name. Once DNS resolves, turn on *Enforce HTTPS* in the repo's Pages settings;
GitHub provisions the certificate, which can take up to an hour.

### Base path

`vite.config.ts` uses `base: './'` — relative asset URLs, so one build serves
correctly from both `squaredmc.com/` and
`squaredmc.github.io/SquaredMc-website/`.

It used to be an absolute base fed by a `VITE_BASE` env var in the workflow,
which pinned the build to one URL shape and had to change in lockstep with the
domain. Relative is safe here because the site is a single page with no
client-side router — nested routes are where `./` bites, and there aren't any.

### Pages vs Vercel

Vercel was the original preference, but linking a project needs an interactive
OAuth login or a token that wasn't available at setup. Pages was wireable
end-to-end from the repo alone.

> **Note:** Pages doesn't serve private repos on GitHub's free plan, so this
> repo is **public**. Making it private again means moving to Vercel or paying
> for the org — Pages will stop serving it.

| | GitHub Pages | Vercel |
| --- | --- | --- |
| Setup | Already done, no external account | Needs a Vercel account linked to the repo |
| Preview deploys per PR | No | Yes, automatic |
| Custom domain | Supported (CNAME file + DNS) | Supported, simpler |
| Build config | The workflow file | Zero-config, detects Vite |

**To switch to Vercel later:** import the repo at vercel.com/new — it detects
Vite with no configuration. Then delete `.github/workflows/deploy.yml` and move
the domain's DNS to Vercel. `base: './'` needs no change.

## Open TODOs

- **Selected Work is parked, not deleted.** The rail was replaced with a
  "Watch this space, more information coming soon!" pane. `WorkPane`,
  `PLACEHOLDER_WORK` and the `.work-rail` styles are all still in the tree —
  put `<WorkPane />` back into the `panes` array in `App.tsx` to restore it,
  then swap the four placeholder cards for real case studies via the
  `workItems` prop or by editing `PLACEHOLDER_WORK`.
- **Work and About nav links are parked.** The header is down to a single
  Contact link, which resolves to the contact pane via `paneAnchors`. Add the
  other two back to `navItems` in `App.tsx` once there's content behind them.
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
