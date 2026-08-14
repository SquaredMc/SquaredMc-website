import SquaredMcIntroHero from "./components/SquaredMcIntroHero"
import HeroCopy from "./components/HeroCopy"
import ScrollHandoffSection from "./components/ScrollHandoffSection"

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
            />

            <HeroCopy />

            <div id="work">
                <ScrollHandoffSection />
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
