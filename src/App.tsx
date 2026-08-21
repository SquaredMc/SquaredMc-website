import SquaredMcIntroHero from "./components/SquaredMcIntroHero"
import HeroCopy from "./components/HeroCopy"
import ScrollHandoffSection, {
    TextPane,
    WorkPane,
} from "./components/ScrollHandoffSection"

/**
 * Fraction of the viewport kept clear at the top for the hero's floating
 * squares. Both components need the SAME value: the hero confines the squares
 * to this strip as you scroll, and the stage refuses to paint over it — so the
 * squares stay visible and pushable for the whole page. Change it in one place.
 */
const SQUARES_SLICE = 0.3

export default function App() {
    return (
        <>
            {/* Animated hero. Everything below it is plain content — the hero's
                scroll-shrink reads window.scrollY and needs that content to
                exist for there to be anything to scroll through. */}
            <SquaredMcIntroHero
                navItems={[
                    { label: "Work", href: "#work" },
                    { label: "About", href: "#about" },
                    { label: "Contact", href: "#contact" },
                ]}
                squaresCompressTo={SQUARES_SLICE}
            />

            {/* One pinned stage for all the copy. Panes hand off horizontally;
                nothing scrolls vertically past anything else. */}
            <div id="work">
                <ScrollHandoffSection
                    squaresSlice={SQUARES_SLICE}
                    panes={[
                        <HeroCopy key="intro" />,
                        <TextPane
                            key="what"
                            label="What we do"
                            heading="We build the version we wish existed."
                            paragraph="Every project starts the same way — something we use every day gets in its own way, and nobody has fixed it properly. So we do."
                        />,
                        <WorkPane key="work" />,
                    ]}
                />
            </div>

            <footer
                style={{
                    position: "relative",
                    zIndex: 30,
                    backgroundColor: "#000",
                    color: "rgba(255,255,255,0.35)",
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                    padding: "48px 28px",
                    fontSize: 12,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    fontFamily: "'Space Grotesk', system-ui, sans-serif",
                }}
            >
                <div style={{ maxWidth: 1180, margin: "0 auto" }}>
                    SquaredMc — {new Date().getFullYear()}
                </div>
            </footer>
        </>
    )
}
