/**
 * HeroCopy.tsx
 *
 * The opening marketing copy. This is deliberately NOT part of
 * SquaredMcIntroHero — it's editable copy, not interaction, so it stays as
 * ordinary markup you can change without touching any animation logic.
 *
 * It renders as the FIRST PANE of ScrollHandoffSection rather than as its own
 * section. It used to be a full-height block that scrolled vertically past the
 * hero; now it slides out horizontally to the next pane like every other text
 * block on the page, and the stage supplies its own background and layout.
 */

export interface HeroCopyProps {
    label?: string
    heading?: string
    paragraph?: string
}

export default function HeroCopy({
    label = "SquaredMc",
    heading = "Building products we actually want to use.",
    paragraph = "SquaredMc is a small, independent product studio. We spot the everyday problems that off-the-shelf apps get wrong, then build the version we wish existed.",
}: HeroCopyProps) {
    return (
        <div style={{ maxWidth: 820, margin: "0 auto", width: "100%" }}>
            <p
                style={{
                    margin: 0,
                    fontSize: 11,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.45)",
                }}
            >
                {label}
            </p>

            <h1
                style={{
                    margin: "24px 0 0",
                    fontSize: "clamp(28px, 5vw, 56px)",
                    lineHeight: 1.08,
                    letterSpacing: "-0.02em",
                    fontWeight: 500,
                }}
            >
                {heading}
            </h1>

            <hr
                style={{
                    border: 0,
                    borderTop: "1px solid rgba(255,255,255,0.14)",
                    margin: "28px 0",
                }}
            />

            <p
                style={{
                    margin: 0,
                    maxWidth: 620,
                    fontSize: "clamp(15px, 2vw, 18px)",
                    lineHeight: 1.6,
                    color: "rgba(255,255,255,0.62)",
                }}
            >
                {paragraph}
            </p>
        </div>
    )
}
