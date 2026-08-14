/**
 * HeroCopy.tsx
 *
 * Plain marketing content that sits directly below the animated hero. This is
 * deliberately NOT part of SquaredMcIntroHero — it's editable copy, not
 * interaction, so it stays as ordinary markup you can change without touching
 * any animation logic.
 *
 * It also supplies the scroll distance the hero needs: the hero's
 * shrink/header/squares-compress behavior is driven by window.scrollY and does
 * nothing until there's real content below it to scroll through.
 *
 * Opaque background + a z-index above the hero's fixed layers (logo is 20,
 * squares are 2) is what makes this section cover them as it scrolls up.
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
        <section
            style={{
                position: "relative",
                zIndex: 30,
                backgroundColor: "#000",
                color: "#fff",
                minHeight: "70vh",
                display: "flex",
                alignItems: "center",
                padding: "18vh 28px",
                fontFamily: "'Space Grotesk', system-ui, sans-serif",
            }}
        >
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
                        margin: "28px 0 0",
                        fontSize: "clamp(32px, 6vw, 64px)",
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
                        margin: "40px 0",
                    }}
                />

                <p
                    style={{
                        margin: 0,
                        maxWidth: 620,
                        fontSize: "clamp(15px, 2vw, 18px)",
                        lineHeight: 1.65,
                        color: "rgba(255,255,255,0.62)",
                    }}
                >
                    {paragraph}
                </p>
            </div>
        </section>
    )
}
