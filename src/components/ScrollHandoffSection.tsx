/**
 * ScrollHandoffSection.tsx
 *
 * The pinned content stage. Every text block on the page lives in here and
 * hands off HORIZONTALLY — nothing scrolls vertically past another block.
 *
 * TWO THINGS THIS SOLVES
 *
 * 1. The squares slice. The stage's content panel starts `squaresSlice` down
 *    the viewport, so the top strip is never painted over and the hero's
 *    floating squares stay visible — and pushable — for the whole page. The
 *    hero's own `squaresCompressTo` should be given the SAME fraction so the
 *    squares are confined to exactly the strip that stays uncovered.
 *
 *    The "scroll stops at 70vh" behaviour falls out of the sticky mechanics on
 *    its own: the panel rides up with the page until the frame pins at top: 0,
 *    at which point the panel's top edge is sitting at `squaresSlice` and goes
 *    no further. From then on scroll drives horizontal handoffs instead.
 *
 * 2. True SEQUENTIAL handoff — the thing Framer's per-layer Scroll Animation
 *    panel couldn't do. There, every layer's animation runs across the entire
 *    scroll range independently, so outgoing and incoming content always moved
 *    at the same time. Here every pane reads the same `scrollYProgress` and
 *    maps it through its own keyframe window, so a pane is guaranteed to be
 *    fully gone before the next one starts arriving.
 *
 * THE HANDOFF WINDOWS
 *
 * Progress 0..1 is split into (paneCount - 1) equal cycles, one per handoff.
 * Within each cycle the outgoing pane exits by `handoffMidpoint` and the
 * incoming pane arrives between `handoffMidpoint` and `paneSettledAt`:
 *
 *   cycle    0 ─────────── 0.45 ─────────── 0.9 ──── 1
 *   outgoing 0% ────────► -100% ──── (parked off-screen left) ────►
 *   incoming (parked off-screen right) ──── 100% ────────► 0% ────►
 *
 * PACING KNOBS — all props, so pacing is tunable without touching the
 * animation logic: scrollPerHandoff, handoffMidpoint, paneSettledAt, ease.
 */

import { useRef, type CSSProperties, type ReactNode } from "react"
import {
    paneKeyframes,
    stageRunway,
    PLACEHOLDER_WORK,
    type BezierEase,
    type WorkItem,
} from "../lib/handoff"
import { FOOTER_HEIGHT } from "../lib/layout"
import {
    motion,
    useScroll,
    useTransform,
    useReducedMotion,
    cubicBezier,
    type MotionValue,
} from "framer-motion"

// ── Defaults (tune these, not the transforms below) ──────────────────────────
/** Fraction of viewport height left clear at the top for the hero squares. */
const SQUARES_SLICE = 0.3
/** Scroll runway per handoff, in vh. More = slower, longer handoffs. */
const SCROLL_PER_HANDOFF = 180
/**
 * vh of scroll each pane sits still before the next handoff starts.
 *
 * Every pane gets this, not just the first. The rests used to fall out of the
 * tail of each handoff window, which gave the middle panes almost no stop —
 * they slid in and kept going, so you could scroll straight past them without
 * the text ever settling.
 */
const SCROLL_PER_HOLD = 70
/** Point within a cycle where the outgoing pane is gone and the next starts. */
const HANDOFF_MIDPOINT = 0.45
/** Point within a cycle where the incoming pane has fully arrived. */
const PANE_SETTLED_AT = 0.9
/**
 * Easing applied within each keyframe segment. Default is undefined = linear,
 * i.e. the slide tracks the wheel 1:1, which is what a scrubbed animation
 * normally wants.
 *
 * Careful with this one: the easing is applied per SEGMENT, not across the
 * whole range. An aggressive ease-out like [0.16, 1, 0.3, 1] is ~95% complete
 * a fifth of the way through a cycle, so the outgoing pane would visually
 * finish leaving long before the midpoint and the rest of that window would be
 * dead scroll. Keep it gentle (e.g. [0.4, 0, 0.6, 1]) if you add one.
 */
const EASE: BezierEase | undefined = undefined

export interface ScrollHandoffSectionProps {
    /** The content panes, in order. Each fills the panel and slides in turn. */
    panes: ReactNode[]
    /** Fraction of viewport height kept clear at the top. Default 0.3. */
    squaresSlice?: number
    /** Scroll runway per handoff, in vh. Default 180. */
    scrollPerHandoff?: number
    /** vh of scroll each pane sits still. Default 70. */
    scrollPerHold?: number
    /** Point in a cycle (0-1) where the outgoing pane is gone. Default 0.45. */
    handoffMidpoint?: number
    /** Point in a cycle (0-1) where the incoming pane has arrived. Default 0.9. */
    paneSettledAt?: number
    /** Easing curve. Omit for linear — see the note on EASE above. */
    ease?: BezierEase
    /**
     * Optional anchor id per pane, index-aligned with `panes`.
     *
     * The panes live inside a pinned frame, so a normal `#id` on a pane would
     * jump to the frame rather than to the scroll position where that pane is
     * on screen. Instead the stage drops a zero-size anchor into the outer
     * spacer at the scroll offset where the pane begins its rest, so `#id`
     * lands with that pane settled.
     */
    paneAnchors?: (string | undefined)[]
}

/**
 * One pane. This is a component rather than inline JSX so that useTransform is
 * called once per pane instance — calling it in a .map() would break the rules
 * of hooks the moment the pane count changed.
 */
function Pane({
    progress,
    input,
    output,
    ease,
    children,
}: {
    progress: MotionValue<number>
    input: number[]
    output: string[]
    ease?: (t: number) => number
    children: ReactNode
}) {
    const x = useTransform(progress, input, output, ease ? { ease } : undefined)
    return <motion.div style={{ ...paneStyle, x }}>{children}</motion.div>
}

export default function ScrollHandoffSection({
    panes,
    squaresSlice = SQUARES_SLICE,
    scrollPerHandoff = SCROLL_PER_HANDOFF,
    scrollPerHold = SCROLL_PER_HOLD,
    handoffMidpoint = HANDOFF_MIDPOINT,
    paneSettledAt = PANE_SETTLED_AT,
    ease = EASE,
    paneAnchors,
}: ScrollHandoffSectionProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const prefersReducedMotion = useReducedMotion()

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    })

    const easeFn = ease ? cubicBezier(...ease) : undefined

    // Reduced motion: no pinning, no scrubbing, no squares slice to preserve —
    // the panes just stack and read as ordinary sections.
    if (prefersReducedMotion) {
        return (
            // The ref stays attached even though nothing reads the progress in
            // this branch — useScroll was already called above and warns if its
            // target ref never resolves to an element.
            <div
                ref={containerRef}
                style={{
                    backgroundColor: "#000",
                    // Nothing is pinned in this branch, so the last section
                    // would otherwise end underneath the fixed footer.
                    paddingBottom: FOOTER_HEIGHT,
                }}
            >
                {panes.map((p, i) => (
                    <section
                        key={i}
                        id={paneAnchors?.[i]}
                        style={{
                            ...paneStyle,
                            position: "relative",
                            padding: `12vh 28px`,
                        }}
                    >
                        {p}
                    </section>
                ))}
            </div>
        )
    }

    // 100dvh for the frame itself, plus the runway. The frame pins for
    // (height - 100dvh), which is exactly the runway.
    //
    // dvh everywhere in here, not vh: on iOS Safari 100vh is the
    // URL-bar-hidden height, so a vh-sized frame runs past the fold while the
    // bar is showing. The container height, the frame and the anchor offsets
    // all have to use the SAME unit — mixing them would leave the real runway
    // different from the one the anchor offsets were computed against, and the
    // nav anchors would stop landing on a settled pane.
    const timing = {
        hold: scrollPerHold,
        handoff: scrollPerHandoff,
        midpoint: handoffMidpoint,
        settled: paneSettledAt,
    }
    const height = `${100 + stageRunway(panes.length, scrollPerHold, scrollPerHandoff)}dvh`

    return (
        // No background on the shell — painting it here would cover the squares
        // in the top slice. Only the content panel below is opaque.
        <div ref={containerRef} style={{ position: "relative", height }}>
            {/* Scroll anchors. Pane i rests over
                [i * (hold + handoff), + hold], so an anchor at the start of
                that window scrolls to the pane fully settled. */}
            {paneAnchors?.map((id, i) =>
                id ? (
                    <span
                        key={id}
                        id={id}
                        aria-hidden="true"
                        style={{
                            position: "absolute",
                            top: `${i * (scrollPerHold + scrollPerHandoff)}dvh`,
                            left: 0,
                            width: 1,
                            height: 1,
                        }}
                    />
                ) : null
            )}
            <div style={{ position: "sticky", top: 0, height: "100dvh" }}>
                {/* Content panel: starts `squaresSlice` down so the strip above
                    it stays clear for the hero's floating squares. */}
                <div
                    style={{
                        position: "absolute",
                        top: `${squaresSlice * 100}%`,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 30,
                        backgroundColor: "#000",
                        color: "#fff",
                        overflow: "hidden",
                        fontFamily:
                            "'Space Grotesk', system-ui, sans-serif",
                    }}
                >
                    {panes.map((p, i) => {
                        const { input, output } = paneKeyframes(
                            i,
                            panes.length,
                            timing
                        )
                        return (
                            <Pane
                                key={i}
                                progress={scrollYProgress}
                                input={input}
                                output={output}
                                ease={easeFn}
                            >
                                {p}
                            </Pane>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}

// ── Built-in panes ───────────────────────────────────────────────────────────

/**
 * A text pane. Only `heading` is required — passing just that gives a
 * heading-only pane in the identical type style as every other section header,
 * which is the point: the style lives in one place.
 */
export function TextPane({
    label,
    heading,
    paragraph,
}: {
    label?: string
    heading: string
    paragraph?: string
}) {
    return (
        <div style={{ maxWidth: 760, width: "100%", margin: "0 auto" }}>
            {label && <p style={eyebrow}>{label}</p>}
            <h2
                style={{
                    margin: label ? "24px 0 0" : 0,
                    fontSize: "clamp(26px, 4.4vw, 48px)",
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                    fontWeight: 500,
                }}
            >
                {heading}
            </h2>
            {paragraph && (
                <p
                    style={{
                        margin: "24px 0 0",
                        // 600, not 560: at 560 the "What we do" copy broke to
                        // three lines with "do." stranded alone on the last
                        // one. The extra 40px pulls it up to two (570 + 553).
                        maxWidth: 600,
                        fontSize: "clamp(15px, 2vw, 18px)",
                        lineHeight: 1.6,
                        color: "rgba(255,255,255,0.62)",
                        // Safety net at other widths. Note it did NOT fix the
                        // case above on its own — Chrome still left a 57px last
                        // line — so the measure is doing the real work.
                        textWrap: "pretty",
                    }}
                >
                    {paragraph}
                </p>
            )}
        </div>
    )
}

/**
 * Contact pane: a blurb plus the address as a real `mailto:` link, in the same
 * heading type style as every other section.
 */
export function ContactPane({
    label = "Contact",
    heading = "Say hello.",
    paragraph = "Got an everyday problem that off-the-shelf software gets wrong? Or just want to hear what we're building? Drop us a line — we read everything.",
    email = "hello@squaredmc.com",
}: {
    label?: string
    heading?: string
    paragraph?: string
    email?: string
}) {
    return (
        <div style={{ maxWidth: 760, width: "100%", margin: "0 auto" }}>
            <p style={eyebrow}>{label}</p>
            <h2
                style={{
                    margin: "24px 0 0",
                    fontSize: "clamp(26px, 4.4vw, 48px)",
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                    fontWeight: 500,
                }}
            >
                {heading}
            </h2>
            <p
                style={{
                    margin: "24px 0 0",
                    maxWidth: 560,
                    fontSize: "clamp(15px, 2vw, 18px)",
                    lineHeight: 1.6,
                    color: "rgba(255,255,255,0.62)",
                    textWrap: "pretty",
                }}
            >
                {paragraph}
            </p>
            <a
                href={`mailto:${email}`}
                style={{
                    display: "inline-block",
                    marginTop: 28,
                    fontSize: "clamp(18px, 2.6vw, 26px)",
                    letterSpacing: "-0.01em",
                    fontWeight: 500,
                    color: "#fff",
                    textDecoration: "none",
                    borderBottom: "1px solid rgba(255,255,255,0.35)",
                    paddingBottom: 4,
                }}
            >
                {email}
            </a>
        </div>
    )
}

export function WorkPane({
    label = "Selected work",
    items = PLACEHOLDER_WORK,
}: {
    label?: string
    items?: WorkItem[]
}) {
    return (
        <div style={{ width: "100%", maxWidth: 1180, margin: "0 auto" }}>
            <p style={eyebrow}>{label}</p>
            <div
                className="work-rail"
                style={{
                    display: "flex",
                    gap: 20,
                    marginTop: 28,
                    overflowX: "auto",
                    paddingBottom: 12,
                }}
            >
                {items.map((item) => (
                    <article
                        key={item.index}
                        style={{
                            flex: "0 0 clamp(210px, 24vw, 270px)",
                            minHeight: 280,
                            border: "1px solid rgba(255,255,255,0.14)",
                            padding: 22,
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                        }}
                    >
                        <span
                            style={{
                                fontSize: 11,
                                letterSpacing: "0.18em",
                                color: "rgba(255,255,255,0.35)",
                            }}
                        >
                            {item.index}
                        </span>
                        <h3
                            style={{
                                margin: 0,
                                fontSize: 21,
                                fontWeight: 500,
                                letterSpacing: "-0.01em",
                            }}
                        >
                            {item.title}
                        </h3>
                        <p
                            style={{
                                margin: 0,
                                fontSize: 14,
                                lineHeight: 1.6,
                                color: "rgba(255,255,255,0.55)",
                            }}
                        >
                            {item.blurb}
                        </p>
                        <span
                            style={{
                                marginTop: "auto",
                                fontSize: 11,
                                letterSpacing: "0.18em",
                                textTransform: "uppercase",
                                color: "rgba(255,255,255,0.4)",
                            }}
                        >
                            {item.tag}
                        </span>
                    </article>
                ))}
            </div>
        </div>
    )
}

// ── Shared style objects ─────────────────────────────────────────────────────

// `rotate`/`scale`/`translate`/`transition` are omitted because framer-motion's
// MotionStyle redefines them; spreading a plain CSSProperties that still
// declares them into a motion.div's style fails to typecheck.
const paneStyle: Omit<
    CSSProperties,
    "rotate" | "scale" | "translate" | "transition"
> = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    // Bottom padding clears the fixed footer. The pane itself still extends
    // the full height and slides behind the bar — this only keeps the text
    // centred in the part you can actually see.
    padding: `0 28px ${FOOTER_HEIGHT}px`,
}

const eyebrow: CSSProperties = {
    margin: 0,
    fontSize: 11,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.45)",
}
