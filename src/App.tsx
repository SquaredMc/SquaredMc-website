import SquaredMcIntroHero from "./components/SquaredMcIntroHero"
import HeroCopy from "./components/HeroCopy"
import ScrollHandoffSection, {
    TextPane,
    ContactPane,
} from "./components/ScrollHandoffSection"
import { SQUARES_SLICE, FOOTER_HEIGHT } from "./lib/layout"

export default function App() {
    return (
        <>
            {/* Animated hero. Everything below it is plain content — the hero's
                scroll-shrink reads window.scrollY and needs that content to
                exist for there to be anything to scroll through. */}
            <SquaredMcIntroHero
                // Work and About are parked until there's real content behind
                // them. Contact scrolls to the contact pane — see paneAnchors.
                navItems={[{ label: "Contact", href: "#contact" }]}
                squaresCompressTo={SQUARES_SLICE}
            />

            {/* One pinned stage for all the copy. Panes hand off horizontally;
                nothing scrolls vertically past anything else.

                The Selected Work rail is parked, not deleted — `WorkPane` and
                `PLACEHOLDER_WORK` are still there. Drop <WorkPane /> back into
                this array to bring it back. */}
            <ScrollHandoffSection
                squaresSlice={SQUARES_SLICE}
                paneAnchors={[undefined, undefined, undefined, "contact"]}
                panes={[
                    <HeroCopy key="intro" />,
                    <TextPane
                        key="what"
                        label="What we do"
                        heading="We build the version we wish existed."
                        paragraph="Every project starts the same way — something we use every day gets in its own way, and nobody has fixed it properly. So we do."
                    />,
                    // Heading-only, so it lands in the identical type style
                    // as the other section headers.
                    <TextPane
                        key="soon"
                        heading="Watch this space, more information coming soon!"
                    />,
                    <ContactPane key="contact" />,
                ]}
            />

            {/* Fixed page chrome: on screen for every section, hero included.
                Opaque and above the stage panel (z 30), so pane content slides
                behind it rather than over it. Panes carry FOOTER_HEIGHT as
                bottom padding so their text still clears the bar. */}
            <footer
                style={{
                    position: "fixed",
                    left: 0,
                    right: 0,
                    bottom: 0,
                    height: FOOTER_HEIGHT,
                    zIndex: 40,
                    display: "flex",
                    alignItems: "center",
                    backgroundColor: "#000",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    color: "rgba(255,255,255,0.35)",
                    padding: "0 28px",
                    fontSize: 11,
                    letterSpacing: "0.18em",
                    textTransform: "uppercase",
                    fontFamily: "'Space Grotesk', system-ui, sans-serif",
                }}
            >
                <div style={{ maxWidth: 1180, margin: "0 auto", width: "100%" }}>
                    SquaredMc — {new Date().getFullYear()}
                </div>
            </footer>
        </>
    )
}
