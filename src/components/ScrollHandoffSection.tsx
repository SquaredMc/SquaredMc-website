/**
 * ScrollHandoffSection.tsx
 *
 * The piece Framer's native per-layer Scroll Animation panel couldn't do:
 * a true SEQUENTIAL handoff. In that panel each layer's animation runs across
 * the entire scroll range independently, so the outgoing and incoming content
 * always animate at the same time — there's no way to window one layer to the
 * first half of the range and the other to the second half.
 *
 * Here both layers read the same `scrollYProgress` and each maps it through
 * its own keyframe windows, so the intro is guaranteed to be fully gone before
 * the work content starts entering.
 *
 *   progress   0 ─────────── 0.45 ─────────── 0.9 ──── 1
 *   intro x    0% ────────► -100% ───── (parked off-screen left) ─────►
 *   work  x    (parked off-screen right) ──── 100% ────────► 0% ──────►
 *
 * Structure: an outer spacer with a real height (scrollDistance, default
 * 300vh) provides the scroll runway; inside it a `position: sticky; top: 0;
 * height: 100vh` frame stays pinned while that runway scrolls past.
 *
 * PACING KNOBS — all props, so you can retune without touching the animation
 * logic: scrollDistance, handoffMidpoint, workSettledAt, ease.
 */

import { useRef, type CSSProperties } from "react"
import {
    motion,
    useScroll,
    useTransform,
    useReducedMotion,
    cubicBezier,
} from "framer-motion"

/** A cubic-bezier control-point tuple, e.g. [0.16, 1, 0.3, 1]. */
export type BezierEase = [number, number, number, number]

// ── Defaults (tune these, not the transforms below) ──────────────────────────
/** How much scroll runway the pinned section gets. More = slower, longer handoff. */
const SCROLL_DISTANCE = "300vh"
/** Progress point where the intro has finished exiting AND the work starts entering. */
const HANDOFF_MIDPOINT = 0.45
/** Progress point where the work content has finished entering (it holds from here to 1). */
const WORK_SETTLED_AT = 0.9
/**
 * Easing applied within each keyframe segment. Default is undefined = linear,
 * i.e. the slide tracks the wheel 1:1, which is what a scrubbed animation
 * normally wants.
 *
 * Careful with this one: the easing is applied per SEGMENT, not across the
 * whole range. An aggressive ease-out like [0.16, 1, 0.3, 1] is ~95% complete
 * a fifth of the way through the section, so the intro would visually finish
 * leaving long before the 0.45 midpoint and the rest of that window would be
 * dead scroll. Keep it gentle (e.g. [0.4, 0, 0.6, 1]) if you add one.
 */
const EASE: BezierEase | undefined = undefined

export interface WorkItem {
    /** Small index/eyebrow shown above the title, e.g. "01". */
    index: string
    title: string
    blurb: string
    tag: string
}

/** Placeholder cards — swap for real case studies. See README "Open TODOs". */
const PLACEHOLDER_WORK: WorkItem[] = [
    {
        index: "01",
        title: "Project One",
        blurb: "Placeholder card. Real case-study content still to come.",
        tag: "Product",
    },
    {
        index: "02",
        title: "Project Two",
        blurb: "Placeholder card. Real case-study content still to come.",
        tag: "iOS",
    },
    {
        index: "03",
        title: "Project Three",
        blurb: "Placeholder card. Real case-study content still to come.",
        tag: "Design System",
    },
    {
        index: "04",
        title: "Project Four",
        blurb: "Placeholder card. Real case-study content still to come.",
        tag: "Web",
    },
]

export interface ScrollHandoffSectionProps {
    introLabel?: string
    introHeading?: string
    introParagraph?: string
    workLabel?: string
    workItems?: WorkItem[]
    /** Height of the outer spacer — the scroll runway. Default "300vh". */
    scrollDistance?: string
    /** Progress (0–1) at which the intro is fully gone and the work begins entering. Default 0.45. */
    handoffMidpoint?: number
    /** Progress (0–1) at which the work has fully arrived. Default 0.9. */
    workSettledAt?: number
    /**
     * Easing curve for both slides, as cubic-bezier control points. Omit for
     * linear (the default) — see the note on EASE above before setting this.
     */
    ease?: BezierEase
}

export default function ScrollHandoffSection({
    introLabel = "What we do",
    introHeading = "We build the version we wish existed.",
    introParagraph = "Every project starts the same way — something we use every day gets in its own way, and nobody has fixed it properly. So we do.",
    workLabel = "Selected work",
    workItems = PLACEHOLDER_WORK,
    scrollDistance = SCROLL_DISTANCE,
    handoffMidpoint = HANDOFF_MIDPOINT,
    workSettledAt = WORK_SETTLED_AT,
    ease = EASE,
}: ScrollHandoffSectionProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const prefersReducedMotion = useReducedMotion()

    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"],
    })

    const easeFn = ease ? cubicBezier(...ease) : undefined

    // Intro copy: exits left, fully gone by the midpoint, then stays gone.
    const introX = useTransform(
        scrollYProgress,
        [0, handoffMidpoint, 1],
        ["0%", "-100%", "-100%"],
        { ease: easeFn }
    )

    // Work content: parked off-screen right until the midpoint, then enters.
    const workX = useTransform(
        scrollYProgress,
        [0, handoffMidpoint, workSettledAt, 1],
        ["100%", "100%", "0%", "0%"],
        { ease: easeFn }
    )

    // Reduced motion: no pinning, no scrubbing — both blocks just stack and
    // read as ordinary sections.
    if (prefersReducedMotion) {
        return (
            // The ref is still attached here even though nothing reads the
            // scroll progress in this branch — useScroll was already called
            // above and warns if its target ref never resolves to an element.
            <div ref={containerRef} style={shell}>
                <div style={{ ...pane, position: "relative", padding: "12vh 28px" }}>
                    <IntroPane
                        label={introLabel}
                        heading={introHeading}
                        paragraph={introParagraph}
                    />
                </div>
                <div style={{ ...pane, position: "relative", padding: "12vh 28px" }}>
                    <WorkPane label={workLabel} items={workItems} />
                </div>
            </div>
        )
    }

    return (
        <div ref={containerRef} style={{ ...shell, height: scrollDistance }}>
            <div
                style={{
                    position: "sticky",
                    top: 0,
                    height: "100vh",
                    overflow: "hidden",
                }}
            >
                <motion.div style={{ ...pane, x: introX }}>
                    <IntroPane
                        label={introLabel}
                        heading={introHeading}
                        paragraph={introParagraph}
                    />
                </motion.div>

                <motion.div style={{ ...pane, x: workX }}>
                    <WorkPane label={workLabel} items={workItems} />
                </motion.div>
            </div>
        </div>
    )
}

// ── Panes ────────────────────────────────────────────────────────────────────

function IntroPane({
    label,
    heading,
    paragraph,
}: {
    label: string
    heading: string
    paragraph: string
}) {
    return (
        <div style={{ maxWidth: 760, width: "100%", margin: "0 auto" }}>
            <p style={eyebrow}>{label}</p>
            <h2
                style={{
                    margin: "24px 0 0",
                    fontSize: "clamp(28px, 5vw, 54px)",
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                    fontWeight: 500,
                }}
            >
                {heading}
            </h2>
            <p
                style={{
                    margin: "28px 0 0",
                    maxWidth: 560,
                    fontSize: "clamp(15px, 2vw, 18px)",
                    lineHeight: 1.65,
                    color: "rgba(255,255,255,0.62)",
                }}
            >
                {paragraph}
            </p>
        </div>
    )
}

function WorkPane({ label, items }: { label: string; items: WorkItem[] }) {
    return (
        <div style={{ width: "100%", maxWidth: 1180, margin: "0 auto" }}>
            <p style={eyebrow}>{label}</p>
            <div
                className="work-rail"
                style={{
                    display: "flex",
                    gap: 20,
                    marginTop: 32,
                    overflowX: "auto",
                    paddingBottom: 12,
                }}
            >
                {items.map((item) => (
                    <article
                        key={item.index}
                        style={{
                            flex: "0 0 clamp(220px, 26vw, 280px)",
                            minHeight: 320,
                            border: "1px solid rgba(255,255,255,0.14)",
                            padding: 24,
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
                                fontSize: 22,
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

const shell: CSSProperties = {
    position: "relative",
    zIndex: 30,
    backgroundColor: "#000",
    color: "#fff",
    fontFamily: "'Space Grotesk', system-ui, sans-serif",
}

// `rotate`/`scale`/`translate`/`transition` are omitted because framer-motion's
// MotionStyle redefines them; spreading a plain CSSProperties that still
// declares them into a motion.div's style fails to typecheck.
const pane: Omit<
    CSSProperties,
    "rotate" | "scale" | "translate" | "transition"
> = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    padding: "0 28px",
}

const eyebrow: CSSProperties = {
    margin: 0,
    fontSize: 11,
    letterSpacing: "0.22em",
    textTransform: "uppercase",
    color: "rgba(255,255,255,0.45)",
}
