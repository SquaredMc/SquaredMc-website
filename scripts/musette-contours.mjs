// Writes the contour-line backgrounds in public/musette/assets/ with the
// Musette app's own ring maths (App/DesignSystem/Motif/ContourGeometry.swift
// in SquaredMc/Training-side-kick), so the site's rings are the app's shapes,
// drawn at the app's stroke widths (Stroke/contour 1px, contour-accent 1.5px)
// and at 1 CSS px per unit: the CSS shows them at their natural size.
//
//   node scripts/musette-contours.mjs public/musette/assets
//
// Each SVG is sized to hold its rings whole, so no line ever stops at the
// edge of the image: rings end where they close, or at the edge of the box
// they're drawn in. Change the fields in FIELDS, not the output.

import { writeFileSync } from "node:fs"
import { join } from "node:path"

const outDir = process.argv[2]
if (!outDir) {
    console.error("usage: node scripts/musette-contours.mjs <output directory>")
    process.exit(1)
}

// Semantic/color/contour/on-hero and on-hero-accent, the same in light and dark.
const QUIET = { colour: "#F5FAF7", opacity: 0.16, width: 1 }
const ACCENT = { colour: "#B6A7FF", opacity: 0.55, width: 1.5 }

// anchor "centre": the summit is the middle of the image, so centring the
// image centres the rings. anchor "corner": the summit is `inset` px
// from the image's top-right corner, and rings past that corner are cut by
// it, for a background at `right top`.
const FIELDS = [
    {
        // Behind the hero phone and the beta invite card. The icon's seed and
        // wobble. The rings drift away from the hero text (downhill points
        // right), and stop short of it, so that side stays flat pine.
        file: "contours-field.svg",
        geometry: { seed: 5, rings: 16, spacing: 32, innerRadius: 24, wobble: 0.2, downhill: 0.3, samples: 96 },
        accentRing: 10,
        anchor: "centre",
    },
    {
        // ContourGeometry.pickCardCorner, with PickCard's accent ring.
        file: "contours-card.svg",
        geometry: { seed: 7, rings: 11, spacing: 14, innerRadius: 8, wobble: 0.2, downhill: 2.5, samples: 96 },
        accentRing: 4,
        anchor: "corner",
        inset: { x: 22, y: 8 },
    },
    {
        // ContourGeometry.compactCorner, as on the widget.
        file: "contours-widget.svg",
        geometry: { seed: 11, rings: 7, spacing: 11, innerRadius: 5, wobble: 0.2, downhill: 2.4, samples: 96 },
        accentRing: 2,
        anchor: "corner",
        inset: { x: 0, y: 0 },
    },
]

// SplitMix64, as in ContourGeometry.swift, so a seed draws the same rings.
function splitMix64(seed) {
    let state = BigInt.asUintN(64, BigInt(seed))
    const next = () => {
        state = BigInt.asUintN(64, state + 0x9e3779b97f4a7c15n)
        let z = state
        z = BigInt.asUintN(64, (z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n)
        z = BigInt.asUintN(64, (z ^ (z >> 27n)) * 0x94d049bb133111ebn)
        return z ^ (z >> 31n)
    }
    return { unit: (lower, upper) => lower + (upper - lower) * (Number(next() >> 11n) / 2 ** 53) }
}

// ContourGeometry.ring, with the summit at (0, 0).
function ring(g, index) {
    const rng = splitMix64(g.seed)
    const wobble = Math.min(Math.max(g.wobble, 0), 0.25)
    const shared = [2, 3, 4, 5].map((k) => ({ k, amplitude: rng.unit(0.4, 1) / k, phase: rng.unit(0, 2 * Math.PI) }))
    const sharedPeak = shared.reduce((sum, h) => sum + h.amplitude, 0)
    let drift = []
    for (let i = 0; i <= Math.max(index, 0); i++) {
        drift = [1, 2, 3].map((k) => ({ k, amplitude: rng.unit(0.2, 1), phase: rng.unit(0, 2 * Math.PI) }))
    }
    const driftPeak = drift.reduce((sum, h) => sum + h.amplitude, 0)

    const base = g.innerRadius + index * g.spacing
    const shift = index * g.spacing * 0.3
    const cx = Math.cos(g.downhill) * shift
    const cy = Math.sin(g.downhill) * shift
    return Array.from({ length: g.samples }, (_, step) => {
        const theta = (step / g.samples) * 2 * Math.PI
        const f = (shared.reduce((sum, h) => sum + h.amplitude * Math.sin(h.k * theta + h.phase), 0) / sharedPeak) * wobble
        const d = drift.reduce((sum, h) => sum + h.amplitude * Math.sin(h.k * theta + h.phase), 0) / driftPeak
        const radius = Math.max(1, base * (1 + f) + 0.2 * g.spacing * d)
        return { x: cx + radius * Math.cos(theta), y: cy + radius * Math.sin(theta) }
    })
}

const num = (v) => String(Math.round(v * 10) / 10)

// ContourGeometry.smoothClosedPath (Catmull-Rom), as SVG path data.
function pathData(points, dx, dy) {
    const n = points.length
    const p = (i) => points[(i + n) % n]
    let d = `M${num(p(0).x + dx)} ${num(p(0).y + dy)}`
    for (let i = 0; i < n; i++) {
        const [p0, p1, p2, p3] = [p(i - 1), p(i), p(i + 1), p(i + 2)]
        d += `C${num(p1.x + (p2.x - p0.x) / 6 + dx)} ${num(p1.y + (p2.y - p0.y) / 6 + dy)} `
        d += `${num(p2.x - (p3.x - p1.x) / 6 + dx)} ${num(p2.y - (p3.y - p1.y) / 6 + dy)} `
        d += `${num(p2.x + dx)} ${num(p2.y + dy)}`
    }
    return d + "Z"
}

for (const field of FIELDS) {
    const rings = Array.from({ length: field.geometry.rings }, (_, i) => ring(field.geometry, i))
    const all = rings.flat()
    // Half a stroke of room so the outermost ring isn't shaved.
    const pad = ACCENT.width
    const left = -Math.min(...all.map((pt) => pt.x)) + pad
    const right = Math.max(...all.map((pt) => pt.x)) + pad
    const up = -Math.min(...all.map((pt) => pt.y)) + pad
    const down = Math.max(...all.map((pt) => pt.y)) + pad

    let width, height, dx, dy
    if (field.anchor === "centre") {
        width = 2 * Math.ceil(Math.max(left, right))
        height = 2 * Math.ceil(Math.max(up, down))
        ;[dx, dy] = [width / 2, height / 2]
    } else {
        width = Math.ceil(field.inset.x + left)
        height = Math.ceil(field.inset.y + down)
        ;[dx, dy] = [width - field.inset.x, field.inset.y]
    }

    const quiet = rings.filter((_, i) => i !== field.accentRing).map((r) => `<path d="${pathData(r, dx, dy)}"/>`)
    const accent = pathData(rings[field.accentRing], dx, dy)
    const svg = [
        `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`,
        `<!-- Written by scripts/musette-contours.mjs; edit that, not this. -->`,
        `<g fill="none" stroke="${QUIET.colour}" stroke-opacity="${QUIET.opacity}" stroke-width="${QUIET.width}">`,
        ...quiet,
        `</g>`,
        `<path d="${accent}" fill="none" stroke="${ACCENT.colour}" stroke-opacity="${ACCENT.opacity}" stroke-width="${ACCENT.width}" stroke-linecap="round"/>`,
        `</svg>`,
        "",
    ].join("\n")
    writeFileSync(join(outDir, field.file), svg)
    console.log(`${field.file}: ${width}x${height}, summit at ${dx},${dy}, ${(svg.length / 1024).toFixed(0)} KB`)
}
