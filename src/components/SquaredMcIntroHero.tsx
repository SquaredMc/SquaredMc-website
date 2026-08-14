/**
 * SquaredMcIntroHero.tsx
 *
 * Ported out of Framer (was a Code Component) into this standalone Vite app.
 * The only things changed in the port: the `framer` import and the
 * `addPropertyControls` block at the bottom are gone, and each former property
 * control is now a normal React prop carrying the same default. The animation
 * logic, physics constants and timings below are untouched from the tuned
 * Framer version — see README "Open TODOs" before changing any of them.
 *
 * NOTE ON THE FILENAME: in Framer this file existed under two spellings at
 * different points (`SquaredMcIntroHero.tsx` and `SquareMcIntroHero.tsx`,
 * missing the "d"). `SquaredMcIntroHero.tsx` is the one canonical name here.
 *
 * WHAT THIS IS
 * The self-contained interactive hero layer: the logo intro-draw animation,
 * the cursor "liquid pixel-push" hover distortion on the logo, the 72
 * floating background squares with cursor-push physics, and the
 * scroll-driven shrink/fade of the logo into a small sticky header mark.
 *
 * WHAT THIS DELIBERATELY LEAVES OUT
 * - The real page copy/headline/paragraph that goes below the hero — that's
 *   marketing content, not interaction. It lives in `HeroCopy.tsx`.
 * - The nav LINK TARGETS are still just hrefs (`#` by default) — pass real
 *   ones via the `navItems` prop.
 *
 * THE SCROLL-SHRINK MECHANISM
 * The logo-shrinks-into-header behavior below is driven purely by
 * window.scrollY — it does nothing on its own until there's real page
 * content below this component tall enough to actually scroll past 1
 * viewport height. Render any section below this component (with an opaque
 * background) and the effect kicks in automatically — no wiring needed
 * between the two.
 *
 * The floating squares compress into the top portion of the viewport
 * (squaresCompressTo, default the top 33%) over that same scroll range, in
 * lockstep with the logo shrinking and the header fading in — all three are
 * driven by the same scroll-progress value, so there's nothing to
 * coordinate by hand between this component and whatever section comes
 * below it. Just give that next section a real height (e.g. 50vh+) so
 * there's scroll distance to move through.
 *
 * v2 changes: logo size is pure CSS (min(px, vmin, vw)) instead of a JS
 * window.innerWidth calc (rendered oversized on narrow frames). Scroll-shrink
 * timing and squares-compress target are exposed as props so they're tunable
 * without touching code.
 */

import { useState, useMemo, useEffect, useRef } from "react"

// ── Border ──────────────────────────────────────────────────────────────────
const BORDER_PATH = "M290 10H10V290H290V10ZM300 300H0V0H300V300Z"
const P = 1160
const FZ = 80
const BDR = 3.2

const BORDER_FADE = [
    { step: 20, op: 0.15 },
    { step: 40, op: 0.35 },
    { step: 60, op: 0.6 },
    { step: 80, op: 0.85 },
]

// ── Letter pixel squares ─────────────────────────────────────────────────────
const LETTER_DATA: { id: string; squares: string[] }[] = [
    {
        id: "S",
        squares: [
            "15.67% 73.33% 81%    23.33%",
            "15.67% 76.67% 81%    20%",
            "15.67% 80%    81%    16.67%",
            "19%    83.33% 77.67% 13.33%",
            "22.33% 80%    74.33% 16.67%",
            "22.33% 76.67% 74.33% 20%",
            "25.67% 73.33% 71%    23.33%",
            "29%    76.67% 67.67% 20%",
            "29%    80%    67.67% 16.67%",
            "29%    83.33% 67.67% 13.33%",
        ],
    },
    {
        id: "E",
        squares: [
            "42.33% 21.67% 54.33% 75%",
            "45.67% 21.67% 51%    75%",
            "49%    21.67% 47.67% 75%",
            "49%    18.33% 47.67% 78.33%",
            "49%    15%    47.67% 81.67%",
            "52.33% 21.67% 44.33% 75%",
            "55.67% 21.67% 41%    75%",
            "55.67% 18.33% 41%    78.33%",
            "55.67% 15%    41%    81.67%",
            "42.33% 18.33% 54.33% 78.33%",
            "42.33% 15%    54.33% 81.67%",
        ],
    },
    {
        id: "R",
        squares: [
            "42.33% 53.67% 54.33% 43%",
            "42.33% 50.33% 54.33% 46.33%",
            "42.33% 47%    54.33% 49.67%",
            "45.67% 43.67% 51%    53%",
            "49%    47%    47.67% 49.67%",
            "52.33% 47%    44.33% 49.67%",
            "55.67% 43.67% 41%    53%",
            "49%    50.33% 47.67% 46.33%",
            "45.67% 53.67% 51%    43%",
            "49%    53.67% 47.67% 43%",
            "52.33% 53.67% 44.33% 43%",
            "55.67% 53.67% 41%    43%",
        ],
    },
    {
        id: "C",
        squares: [
            "79%    23.33% 17.67% 73.33%",
            "75.67% 23.33% 21%    73.33%",
            "72.33% 23.33% 24.33% 73.33%",
            "69%    20%    27.67% 76.67%",
            "69%    16.67% 27.67% 80%",
            "72.33% 13.33% 24.33% 83.33%",
            "79%    13.33% 17.67% 83.33%",
            "82.33% 20%    14.33% 76.67%",
            "82.33% 16.67% 14.33% 80%",
        ],
    },
    {
        id: "M",
        squares: [
            "69%    54.67% 27.67% 42%",
            "72.33% 54.67% 24.33% 42%",
            "72.33% 51.33% 24.33% 45.33%",
            "75.67% 48%    21%    48.67%",
            "72.33% 44.67% 24.33% 52%",
            "69%    41.33% 27.67% 55.33%",
            "72.33% 41.33% 24.33% 55.33%",
            "75.67% 41.33% 21%    55.33%",
            "79%    41.33% 17.67% 55.33%",
            "82.33% 41.33% 14.33% 55.33%",
            "75.67% 54.67% 21%    42%",
            "79%    54.67% 17.67% 42%",
            "82.33% 54.67% 14.33% 42%",
        ],
    },
    {
        id: "D",
        squares: [
            "69%    82.33% 27.67% 14.33%",
            "69%    79%    27.67% 17.67%",
            "69%    75.67% 27.67% 21%",
            "72.33% 72.33% 24.33% 24.33%",
            "75.67% 72.33% 21%    24.33%",
            "79%    72.33% 17.67% 24.33%",
            "82.33% 75.67% 14.33% 21%",
            "82.33% 79%    14.33% 17.67%",
            "82.33% 82.33% 14.33% 14.33%",
            "79%    82.33% 17.67% 14.33%",
            "75.67% 82.33% 21%    14.33%",
            "72.33% 82.33% 24.33% 14.33%",
        ],
    },
    {
        id: "A",
        squares: [
            "42.33% 79%    54.33% 17.67%",
            "49%    79%    47.67% 17.67%",
            "42.33% 75.67% 54.33% 21%",
            "49%    75.67% 47.67% 21%",
            "45.67% 82.33% 51%    14.33%",
            "45.67% 72.33% 51%    24.33%",
            "49%    82.33% 47.67% 14.33%",
            "49%    72.33% 47.67% 24.33%",
            "52.33% 82.33% 44.33% 14.33%",
            "52.33% 72.33% 44.33% 24.33%",
            "55.67% 82.33% 41%    14.33%",
            "55.67% 72.33% 41%    24.33%",
        ],
    },
    {
        id: "U",
        squares: [
            "15.67% 23.33% 81%    73.33%",
            "15.67% 13.33% 81%    83.33%",
            "19%    13.33% 77.67% 83.33%",
            "22.33% 13.33% 74.33% 83.33%",
            "25.67% 13.33% 71%    83.33%",
            "19%    23.33% 77.67% 73.33%",
            "22.33% 23.33% 74.33% 73.33%",
            "25.67% 23.33% 71%    73.33%",
            "29%    20%    67.67% 76.67%",
            "29%    16.67% 67.67% 80%",
        ],
    },
    {
        id: "Q",
        squares: [
            "15.67% 50.33% 81%    46.33%",
            "29%    50.33% 67.67% 46.33%",
            "15.67% 47%    81%    49.67%",
            "29%    47%    67.67% 49.67%",
            "32.33% 43.67% 64.33% 53%",
            "19%    43.67% 77.67% 53%",
            "22.33% 43.67% 74.33% 53%",
            "25.67% 43.67% 71%    53%",
            "25.67% 53.67% 71%    43%",
            "22.33% 53.67% 74.33% 43%",
            "19%    53.67% 77.67% 43%",
        ],
    },
]

type SvgRect = { x: number; y: number; w: number; h: number }
function insetToSvgRect(inset: string): SvgRect {
    const [top, right, bottom, left] = inset
        .trim()
        .split(/\s+/)
        .map((p) => parseFloat(p))
    return {
        x: (left / 100) * 300,
        y: (top / 100) * 300,
        w: ((100 - right - left) / 100) * 300,
        h: ((100 - bottom - top) / 100) * 300,
    }
}
const PIXEL_LIST: SvgRect[] = LETTER_DATA.flatMap((l) =>
    l.squares.map(insetToSvgRect)
)

// ── Timing ───────────────────────────────────────────────────────────────────
const LETTERS_START = BDR * 0.56
const LETTER_SPREAD = 1.1
const BLOCK_EXTRA = 0.45
const BLOCK_DUR = 0.55

// Logo box reaches full opacity quickly, independent of the slower border
// draw / letter cascade — so it visibly "appears" well before it's finished
// drawing itself in.
const LOGO_FADE_DUR = 0.8

// ── Background square physics ────────────────────────────────────────────────
const PUSH_RADIUS = 160
const PUSH_STRENGTH = 22
const DAMPING = 0.93
const ROT_DAMPING = 0.95
const DRIFT_FORCE = 0.014
const DRIFT_TURN = 0.035

// ── Letter pixel spring physics ──────────────────────────────────────────────
const PIX_PUSH_RADIUS = 48
const PIX_PUSH_FORCE = 7
const PIX_SPRING_K = 0.12
const PIX_DAMP = 0.82

type FSquare = {
    id: number
    size: number
    x: number
    y: number
    op: number
    color: string
    sw: number
}
type BgPhysics = {
    ox: number
    oy: number
    vx: number
    vy: number
    rot: number
    vrot: number
    driftAngle: number
}
type PixPhysics = { ox: number; oy: number; vx: number; vy: number }

const ss = (t: number) => t * t * (3 - 2 * t)

function usePrefersReducedMotion() {
    const [reduced, setReduced] = useState(false)
    useEffect(() => {
        const mq = window.matchMedia("(prefers-reduced-motion: reduce)")
        setReduced(mq.matches)
        const listener = (e: MediaQueryListEvent) => setReduced(e.matches)
        mq.addEventListener("change", listener)
        return () => mq.removeEventListener("change", listener)
    }, [])
    return reduced
}

export interface NavItem {
    label: string
    href: string
}

export interface SquaredMcIntroHeroProps {
    /** Header nav links. Was the "Nav Items" property control. */
    navItems?: NavItem[]
    /** Scroll pixels until the logo reaches its smallest size and squares finish compressing. */
    scrollShrinkDistance?: number
    /** Scroll position (px) where the sticky header starts fading in. */
    headerFadeStart?: number
    /** Scroll position (px) where the sticky header is fully visible. */
    headerFadeEnd?: number
    /** Fraction of viewport height the floating squares are confined to once fully scrolled (0.33 = top third). */
    squaresCompressTo?: number
    /** How many white background squares to generate. */
    whiteSquareCount?: number
    /** How many colored (R/G/B) background squares to generate. */
    coloredSquareCount?: number
    /** Seconds after load before the background squares start fading in — keep this after the logo has visibly appeared. */
    squaresRevealDelay?: number
    /** Seconds for the squares to fade from 0 to full opacity once they start appearing. */
    squaresRevealDuration?: number
}

export default function SquaredMcIntroHero({
    navItems = [
        { label: "Work", href: "#" },
        { label: "About", href: "#" },
        { label: "Contact", href: "#" },
    ],
    scrollShrinkDistance = 500,
    headerFadeStart = 260,
    headerFadeEnd = 440,
    squaresCompressTo = 0.33,
    squaresRevealDelay = 0.8, // seconds after mount before squares start fading in
    squaresRevealDuration = 1.3, // seconds for squares to reach full opacity
    whiteSquareCount = 42, // 12 original + half of the 60 colored ones converted
    coloredSquareCount = 30, // 60 halved — total stays 72, same as before
}: SquaredMcIntroHeroProps) {
    const [animKey] = useState(0)
    const prefersReducedMotion = usePrefersReducedMotion()

    const logoRef = useRef<HTMLDivElement>(null)
    const bgRef = useRef<HTMLDivElement>(null)
    const headerRef = useRef<HTMLElement>(null)

    const sqRefs = useRef<(HTMLDivElement | null)[]>([])
    const bgPhysRef = useRef<BgPhysics[]>([])

    const pixRefs = useRef<(SVGRectElement | null)[]>([])
    const pixPhysRef = useRef<PixPhysics[]>([])

    const rafRef = useRef<number>(0)
    const intRef = useRef({
        isOverLogo: false,
        cursorX: 0,
        cursorY: 0,
        shrink: 0,
    })

    // ── Background squares: white + colored, spread across full screen ───────
    // Border thickness (sw) is randomized for every square now — previously
    // only the colored ones varied in thickness, white squares were a fixed
    // 1px, which is why they all looked the same weight.
    const fSquares = useMemo<FSquare[]>(() => {
        const rnd = (a: number, b: number) => a + Math.random() * (b - a)
        const pick = <T,>(arr: T[]) =>
            arr[Math.floor(Math.random() * arr.length)]
        const rgbPrimaries = ["255,0,0", "0,255,0", "0,0,255"]
        const swOptions = [0.5, 0.75, 1, 1.5, 2, 2.5, 3]

        const whites = Array.from({ length: whiteSquareCount }, (_, i) => ({
            id: i,
            size: rnd(32, 190),
            x: rnd(3, 91),
            y: rnd(2, 91),
            op: rnd(0.04, 0.35),
            color: "255,255,255",
            sw: pick(swOptions),
        }))

        const rgbs = Array.from({ length: coloredSquareCount }, (_, i) => ({
            id: whiteSquareCount + i,
            size: rnd(18, 200),
            x: rnd(2, 90),
            y: rnd(2, 90),
            op: rnd(0.04, 0.52),
            color: pick(rgbPrimaries),
            sw: pick(swOptions),
        }))

        return [...whites, ...rgbs]
    }, [whiteSquareCount, coloredSquareCount])

    if (bgPhysRef.current.length !== fSquares.length) {
        bgPhysRef.current = fSquares.map(() => ({
            ox: 0,
            oy: 0,
            vx: (Math.random() - 0.5) * 0.4,
            vy: (Math.random() - 0.5) * 0.4,
            rot: (Math.random() - 0.5) * 60,
            vrot: (Math.random() - 0.5) * 0.3,
            driftAngle: Math.random() * Math.PI * 2,
        }))
    }

    if (pixPhysRef.current.length !== PIXEL_LIST.length) {
        pixPhysRef.current = PIXEL_LIST.map(() => ({
            ox: 0,
            oy: 0,
            vx: 0,
            vy: 0,
        }))
    }

    // ── Scroll → direct DOM (no re-renders) ──────────────────────────────────
    useEffect(() => {
        function update() {
            const scroll = window.scrollY
            const shrink = Math.min(1, scroll / scrollShrinkDistance)
            const rawFade = Math.max(
                0,
                Math.min(
                    1,
                    (scroll - headerFadeStart) /
                        (headerFadeEnd - headerFadeStart)
                )
            )
            const fadeProg = ss(rawFade)

            intRef.current.shrink = shrink // read by the square-physics RAF loop below

            if (logoRef.current) {
                const scale = 1 - 0.55 * shrink
                logoRef.current.style.transform = `translate(-50%,-50%) scale(${scale.toFixed(4)})`
                logoRef.current.style.opacity = (1 - fadeProg).toFixed(3)
                logoRef.current.style.pointerEvents =
                    fadeProg > 0.9 ? "none" : "auto"
            }
            if (bgRef.current) {
                // Squares stay crisp — only fade gently after content fully covers them
                bgRef.current.style.opacity = Math.max(
                    0,
                    1 - shrink * 0.5
                ).toFixed(3)
            }
            if (headerRef.current) {
                headerRef.current.style.opacity = fadeProg.toFixed(3)
                headerRef.current.style.pointerEvents =
                    fadeProg > 0.1 ? "auto" : "none"
            }
        }

        // Squares start at opacity 0 (see JSX below) and only get their first
        // real opacity value once this delay elapses — combined with the CSS
        // transition set here, that's what makes them fade in smoothly *after*
        // the logo has already appeared, instead of popping in at the same
        // instant as everything else. Reduced-motion users skip straight to
        // the settled state.
        if (bgRef.current) {
            bgRef.current.style.transition = `opacity ${squaresRevealDuration}s ease-out`
        }

        let revealTimer: number | undefined
        if (prefersReducedMotion) {
            update()
        } else {
            revealTimer = window.setTimeout(update, squaresRevealDelay * 1000)
        }

        window.addEventListener("scroll", update, { passive: true })
        window.addEventListener("resize", update)
        return () => {
            if (revealTimer) window.clearTimeout(revealTimer)
            window.removeEventListener("scroll", update)
            window.removeEventListener("resize", update)
        }
    }, [
        scrollShrinkDistance,
        headerFadeStart,
        headerFadeEnd,
        squaresRevealDelay,
        squaresRevealDuration,
        prefersReducedMotion,
    ])

    // ── Main RAF: pixel spring + square physics ───────────────────────────────
    useEffect(() => {
        if (prefersReducedMotion) return // no continuous motion for reduced-motion users
        const int = intRef.current

        function tick() {
            const W = window.innerWidth
            const H = window.innerHeight

            // ── Letter pixel spring ──────────────────────────────────────────────
            const logoEl = logoRef.current
            if (logoEl) {
                const lr = logoEl.getBoundingClientRect()
                const toCss = lr.width / 300
                const toSvg = 300 / lr.width
                const csx = (int.cursorX - lr.left) * toSvg
                const csy = (int.cursorY - lr.top) * toSvg

                const pixPhys = pixPhysRef.current
                for (let i = 0; i < PIXEL_LIST.length; i++) {
                    const r = PIXEL_LIST[i]
                    const p = pixPhys[i]
                    if (!p) continue

                    if (int.isOverLogo) {
                        const dx = r.x + r.w / 2 + p.ox - csx
                        const dy = r.y + r.h / 2 + p.oy - csy
                        const dist = Math.sqrt(dx * dx + dy * dy)
                        if (dist < PIX_PUSH_RADIUS && dist > 0.5) {
                            const t = 1 - dist / PIX_PUSH_RADIUS
                            const f = PIX_PUSH_FORCE * t * t
                            p.vx += f * (dx / dist)
                            p.vy += f * (dy / dist)
                        }
                    }

                    p.vx += (0 - p.ox) * PIX_SPRING_K
                    p.vy += (0 - p.oy) * PIX_SPRING_K
                    p.vx *= PIX_DAMP
                    p.vy *= PIX_DAMP
                    p.ox += p.vx
                    p.oy += p.vy

                    const el = pixRefs.current[i]
                    if (el)
                        el.style.transform = `translate(${(p.ox * toCss).toFixed(2)}px,${(p.oy * toCss).toFixed(2)}px)`
                }
            }

            // ── Background square physics ────────────────────────────────────────
            // Bottom wall compresses from the full viewport height (shrink=0) up
            // to squaresCompressTo * H (shrink=1) — i.e. as the user scrolls and
            // the logo shrinks into the header, the squares' allowed floating
            // area shrinks in lockstep, pushing them up into the top portion of
            // the screen using the same bounce logic that already existed.
            const bottomWall = H * (1 - (1 - squaresCompressTo) * int.shrink)

            const bgPhys = bgPhysRef.current
            for (let i = 0; i < fSquares.length; i++) {
                const sq = fSquares[i]
                const ph = bgPhys[i]
                if (!ph) continue

                const bx = (sq.x / 100) * W
                const by = (sq.y / 100) * H
                const cx = bx + sq.size / 2 + ph.ox
                const cy = by + sq.size / 2 + ph.oy

                if (!int.isOverLogo) {
                    const dx = cx - int.cursorX
                    const dy = cy - int.cursorY
                    const dist = Math.sqrt(dx * dx + dy * dy)
                    if (dist < PUSH_RADIUS && dist > 1) {
                        const t = 1 - dist / PUSH_RADIUS
                        const f = PUSH_STRENGTH * t * t
                        ph.vx += f * (dx / dist)
                        ph.vy += f * (dy / dist)
                        ph.vrot += f * 0.1 * (i % 2 === 0 ? 1 : -1)
                    }
                }

                ph.driftAngle += (Math.random() - 0.5) * DRIFT_TURN
                ph.vx += DRIFT_FORCE * Math.cos(ph.driftAngle)
                ph.vy += DRIFT_FORCE * Math.sin(ph.driftAngle)
                ph.vx *= DAMPING
                ph.vy *= DAMPING
                ph.vrot *= ROT_DAMPING
                ph.ox += ph.vx
                ph.oy += ph.vy
                ph.rot += ph.vrot

                // Bounce off viewport edges (bottom wall compresses on scroll — see above)
                const ax = bx + ph.ox
                const ay = by + ph.oy
                if (ax < 0) {
                    ph.ox = -bx
                    ph.vx = Math.abs(ph.vx) * 0.6
                }
                if (ax + sq.size > W) {
                    ph.ox = W - sq.size - bx
                    ph.vx = -Math.abs(ph.vx) * 0.6
                }
                if (ay < 0) {
                    ph.oy = -by
                    ph.vy = Math.abs(ph.vy) * 0.6
                }
                if (ay + sq.size > bottomWall) {
                    ph.oy = bottomWall - sq.size - by
                    ph.vy = -Math.abs(ph.vy) * 0.6
                }

                const el = sqRefs.current[i]
                if (el)
                    el.style.transform = `translate(${ph.ox.toFixed(1)}px,${ph.oy.toFixed(1)}px) rotate(${ph.rot.toFixed(1)}deg)`
            }

            rafRef.current = requestAnimationFrame(tick)
        }

        rafRef.current = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(rafRef.current)
    }, [fSquares, prefersReducedMotion, squaresCompressTo])

    // ── Mouse tracking ────────────────────────────────────────────────────────
    useEffect(() => {
        if (prefersReducedMotion) return
        const int = intRef.current
        const onMove = (e: MouseEvent) => {
            int.cursorX = e.clientX
            int.cursorY = e.clientY
        }
        const logoEl = logoRef.current
        const onEnter = () => {
            int.isOverLogo = true
        }
        const onLeave = () => {
            int.isOverLogo = false
        }
        window.addEventListener("mousemove", onMove, { passive: true })
        logoEl?.addEventListener("mouseenter", onEnter)
        logoEl?.addEventListener("mouseleave", onLeave)
        return () => {
            window.removeEventListener("mousemove", onMove)
            logoEl?.removeEventListener("mouseenter", onEnter)
            logoEl?.removeEventListener("mouseleave", onLeave)
        }
    }, [prefersReducedMotion])

    // ── Letter appear delays (computed once on mount — no replay interaction) ─
    const delays = useMemo(() => {
        return PIXEL_LIST.map(() => {
            const base = LETTERS_START + Math.random() * LETTER_SPREAD
            return base + Math.random() * BLOCK_EXTRA
        })
    }, [])

    return (
        <div
            style={{
                position: "relative",
                width: "100%",
                height: "100vh",
                backgroundColor: "#000",
                color: "#fff",
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
                overflow: "hidden",
            }}
        >
            {!prefersReducedMotion && (
                <style>{`
          @keyframes _bdraw { from{stroke-dashoffset:${P + FZ}} to{stroke-dashoffset:${FZ}} }
          @keyframes _bout  { to{opacity:0} }
          @keyframes _bfin  { to{opacity:1} }
          ${BORDER_FADE.map(
              (l, i) =>
                  `@keyframes _bfl${i}{from{stroke-dashoffset:${l.step}}to{stroke-dashoffset:${l.step - P}}}`
          ).join("")}
          @keyframes _sqapp { 0%{opacity:0} 15%{opacity:.06} 40%{opacity:.35} 72%{opacity:.72} 100%{opacity:1} }
          @keyframes _logofade_${animKey}  { from{opacity:0} to{opacity:1} }
          @keyframes _logoscale_${animKey} { from{transform:scale(0.9)} to{transform:scale(1)} }
          ._bm_${animKey} {
            stroke-dasharray: ${P}; stroke-dashoffset: ${P + FZ};
            animation: _bdraw ${BDR}s linear forwards, _bout .3s ${BDR}s forwards;
          }
          ._bfill_${animKey} { opacity: 0; animation: _bfin .3s ${BDR}s forwards; }
          ${BORDER_FADE.map(
              (l, i) => `
            ._bfl${i}_${animKey} {
              stroke-dasharray: 20 ${P - 20}; stroke-dashoffset: ${l.step}; opacity: ${l.op};
              animation: _bfl${i} ${BDR}s linear forwards, _bout .3s ${BDR}s forwards;
            }
          `
          ).join("")}
        `}</style>
            )}

            {/* ── Sticky header — fades in as logo fades out ───────────────────── */}
            <header
                ref={headerRef}
                style={{
                    position: "fixed",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 64,
                    backgroundColor: "rgba(0,0,0,0.88)",
                    backdropFilter: "blur(16px)",
                    WebkitBackdropFilter: "blur(16px)",
                    borderBottom: "1px solid rgba(255,255,255,0.08)",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 28px",
                    gap: 16,
                    zIndex: 40,
                    opacity: prefersReducedMotion ? 1 : 0,
                    pointerEvents: "none",
                }}
            >
                <div
                    style={{
                        position: "relative",
                        width: 44,
                        height: 44,
                        flexShrink: 0,
                        backgroundColor: "#000",
                    }}
                >
                    <svg
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                        }}
                        viewBox="0 0 300 300"
                        fill="none"
                    >
                        <path d={BORDER_PATH} fill="white" fillRule="evenodd" />
                    </svg>
                    {LETTER_DATA.map((letter) =>
                        letter.squares.map((inset, si) => (
                            <div
                                key={`h-${letter.id}-${si}`}
                                style={{
                                    position: "absolute",
                                    backgroundColor: "white",
                                    inset,
                                }}
                            />
                        ))
                    )}
                </div>
                <nav style={{ display: "flex", gap: 28, marginLeft: "auto" }}>
                    {navItems.map((item) => (
                        <a
                            key={item.label}
                            href={item.href}
                            style={{
                                color: "rgba(255,255,255,0.5)",
                                fontSize: 11,
                                letterSpacing: "0.15em",
                                textTransform: "uppercase",
                                textDecoration: "none",
                            }}
                        >
                            {item.label}
                        </a>
                    ))}
                </nav>
            </header>

            {/* Floating squares — full viewport, physics-driven. Starts invisible;
          fades in on a delay set in the scroll effect above, so it appears
          after the logo rather than at the same instant as everything else. */}
            <div
                ref={bgRef}
                style={{
                    position: "fixed",
                    inset: 0,
                    zIndex: 2,
                    pointerEvents: "none",
                    opacity: prefersReducedMotion ? undefined : 0,
                }}
            >
                {fSquares.map((sq, i) => (
                    <div
                        key={sq.id}
                        ref={(el) => {
                            sqRefs.current[i] = el
                        }}
                        style={{
                            position: "absolute",
                            left: `${sq.x}%`,
                            top: `${sq.y}%`,
                            width: sq.size,
                            height: sq.size,
                            border: `${sq.sw}px solid rgba(${sq.color},${sq.op.toFixed(2)})`,
                            willChange: "transform",
                        }}
                    />
                ))}
            </div>

            {/* Logo — fixed center, shrinks + fades to header on scroll.
          Sized with pure CSS min(px, vmin, vw) — vw cap is what keeps this
          from overflowing narrow/phone frames; a JS window.innerWidth-based
          calc previously rendered oversized. Don't reintroduce that. */}
            <div
                ref={logoRef}
                style={{
                    position: "fixed",
                    left: "50%",
                    top: "50%",
                    width: "min(460px, 82vmin, 86vw)",
                    height: "min(460px, 82vmin, 86vw)",
                    transform: "translate(-50%,-50%)",
                    zIndex: 20,
                    cursor: "crosshair",
                }}
            >
                <div
                    style={{
                        position: "relative",
                        width: "100%",
                        height: "100%",
                        backgroundColor: "#000",
                        boxShadow:
                            "0 0 60px 20px rgba(255,255,255,0.09), 0 0 160px 60px rgba(255,255,255,0.05), 0 0 300px 100px rgba(255,255,255,0.025)",
                        transformOrigin: "center center",
                        // Opacity reaches 1 quickly (LOGO_FADE_DUR) so the logo visibly
                        // "appears" well before the slower scale settle / border draw /
                        // letter cascade (BDR and beyond) have finished — the drawing
                        // keeps going after it's already fully opaque, not before.
                        animation: prefersReducedMotion
                            ? undefined
                            : `_logofade_${animKey} ${LOGO_FADE_DUR}s ease-out forwards, _logoscale_${animKey} ${BDR}s cubic-bezier(0.16,1,0.3,1) forwards`,
                    }}
                >
                    <svg
                        style={{
                            position: "absolute",
                            inset: 0,
                            width: "100%",
                            height: "100%",
                            overflow: "visible",
                        }}
                        viewBox="0 0 300 300"
                        fill="none"
                    >
                        <path
                            d={BORDER_PATH}
                            fill="white"
                            fillRule="evenodd"
                            className={
                                prefersReducedMotion
                                    ? undefined
                                    : `_bfill_${animKey}`
                            }
                            opacity={prefersReducedMotion ? 1 : undefined}
                        />
                        {!prefersReducedMotion && (
                            <>
                                <path
                                    d="M5,5 L295,5 L295,295 L5,295 Z"
                                    fill="none"
                                    stroke="white"
                                    strokeWidth="10"
                                    strokeLinejoin="miter"
                                    className={`_bm_${animKey}`}
                                />
                                {BORDER_FADE.map((_, i) => (
                                    <path
                                        key={i}
                                        d="M5,5 L295,5 L295,295 L5,295 Z"
                                        fill="none"
                                        stroke="white"
                                        strokeWidth="10"
                                        strokeLinejoin="miter"
                                        className={`_bfl${i}_${animKey}`}
                                    />
                                ))}
                            </>
                        )}
                        {PIXEL_LIST.map((r, idx) => (
                            <rect
                                key={idx}
                                ref={(el) => {
                                    pixRefs.current[idx] = el
                                }}
                                x={r.x}
                                y={r.y}
                                width={r.w}
                                height={r.h}
                                fill="white"
                                style={{
                                    opacity: prefersReducedMotion ? 1 : 0,
                                    animation: prefersReducedMotion
                                        ? undefined
                                        : `_sqapp ${BLOCK_DUR}s ease-out ${(delays[idx] ?? LETTERS_START).toFixed(3)}s both`,
                                }}
                            />
                        ))}
                    </svg>
                </div>
            </div>
        </div>
    )
}
