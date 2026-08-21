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

/**
 * Keyframes for pane `i` of `n`, as a (input, output) pair for useTransform.
 *
 * Progress 0..1 splits into (n - 1) equal cycles, one per handoff. Pane i
 * leaves during cycle i and arrives during cycle i-1, so the two windows never
 * overlap and at most one pane is ever in motion:
 *
 *   cycle    0 ─────────── midpoint ─────────── settled ──── 1
 *   outgoing 0% ────────► -100% ──── (parked off-screen left) ────►
 *   incoming (parked off-screen right) ──── 100% ────────► 0% ────►
 *
 * `lead` holds the FIRST pane still for that fraction of the runway before any
 * of it starts; the cycles are squeezed into what remains.
 */
export function paneKeyframes(
    i: number,
    n: number,
    midpoint: number,
    settled: number,
    lead: number = 0
): { input: number[]; output: string[] } {
    const len = 1 / Math.max(1, n - 1)
    // Squeeze the cycles into whatever runway is left after the lead-in hold.
    const at = (t: number) => lead + t * (1 - lead)

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
        const c = i - 1 // arrives during the previous cycle
        input.push(0)
        output.push("100%")
        push(at(c * len + len * midpoint), "100%")
        push(at(c * len + len * settled), "0%")
    } else {
        input.push(0)
        output.push("0%")
    }

    if (i < n - 1) {
        const c = i // leaves during its own cycle
        push(at(c * len), "0%") // holds until its cycle begins
        push(at(c * len + len * midpoint), "-100%")
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
