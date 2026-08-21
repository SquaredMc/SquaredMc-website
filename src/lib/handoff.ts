/**
 * handoff.ts
 *
 * Pure, render-free pieces of the scroll stage. These live outside
 * ScrollHandoffSection.tsx so that file exports only components — mixing
 * component and non-component exports in one module breaks React Fast Refresh.
 * Keeping the keyframe maths here also makes it directly testable without
 * rendering anything.
 */

/** A cubic-bezier control-point tuple, e.g. [0.16, 1, 0.3, 1]. */
export type BezierEase = [number, number, number, number]

/** Scroll runway the stage needs, in vh, excluding the 100vh frame itself. */
export function stageRunway(n: number, hold: number, handoff: number): number {
    return n * hold + Math.max(0, n - 1) * handoff
}

export interface HandoffTiming {
    /** vh of scroll each pane sits still. */
    hold: number
    /** vh of scroll each handoff takes. */
    handoff: number
    /** Point within a handoff (0-1) where the outgoing pane is gone. */
    midpoint: number
    /** Point within a handoff (0-1) where the incoming pane has arrived. */
    settled: number
}

/**
 * Keyframes for pane `i` of `n`, as an (input, output) pair for useTransform.
 *
 * The timeline alternates HOLD and HANDOFF phases, measured in vh of scroll:
 *
 *   hold 0 │ handoff 0 │ hold 1 │ handoff 1 │ hold 2
 *   ├──────┼───────────┼────────┼───────────┼──────┤
 *   pane 0 │ 0 ──► 1   │ pane 1 │ 1 ──► 2   │ pane 2
 *
 * Every pane gets a real rest, including the middle ones. An earlier version
 * derived rests from the tail of each handoff window instead, which left the
 * middle panes with almost no stop — you could scroll straight past them.
 *
 * Within one handoff the outgoing pane exits over [0, midpoint] and the
 * incoming pane arrives over [midpoint, settled], so the two never overlap and
 * at most one pane is ever in motion.
 */
export function paneKeyframes(
    i: number,
    n: number,
    { hold, handoff, midpoint, settled }: HandoffTiming
): { input: number[]; output: string[] } {
    const total = stageRunway(n, hold, handoff)
    const unit = hold + handoff // one hold plus the handoff that follows it
    const at = (vh: number) => vh / total // vh position -> 0..1 progress

    const input: number[] = []
    const output: string[] = []
    const push = (t: number, v: string) => {
        // Drop any stop that isn't strictly increasing — useTransform requires
        // a monotonic input range, and the first pane would otherwise emit a
        // duplicate leading 0.
        if (input.length > 0 && t <= input[input.length - 1]) return
        input.push(t)
        output.push(v)
    }

    if (i > 0) {
        // Arrives during the handoff that follows the previous pane's hold.
        const start = (i - 1) * unit + hold
        input.push(0)
        output.push("100%")
        push(at(start + handoff * midpoint), "100%")
        push(at(start + handoff * settled), "0%")
    } else {
        input.push(0)
        output.push("0%")
    }

    if (i < n - 1) {
        // Rests through its own hold, then leaves during the next handoff.
        const start = i * unit + hold
        push(at(start), "0%")
        push(at(start + handoff * midpoint), "-100%")
        push(1, "-100%")
    } else {
        push(1, "0%")
    }

    return { input, output }
}

export interface WorkItem {
    /** Small index/eyebrow shown above the title, e.g. "01". */
    index: string
    title: string
    blurb: string
    tag: string
}

/** Placeholder cards — swap for real case studies. See README "Open TODOs". */
export const PLACEHOLDER_WORK: WorkItem[] = [
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
