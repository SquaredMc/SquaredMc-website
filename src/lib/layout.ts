/**
 * layout.ts
 *
 * Layout constants shared between the hero, the scroll stage and the footer.
 * They live here rather than in a component file because those export only
 * components — mixing component and non-component exports breaks React Fast
 * Refresh for the file.
 */

/**
 * Fraction of the viewport kept clear at the TOP for the hero's floating
 * squares.
 *
 * Both the hero and the stage need the same value: the stage refuses to paint
 * over this strip, and the hero's `squaresCompressTo` confines the squares to
 * exactly it. Change it here and both follow.
 */
export const SQUARES_SLICE = 0.3

/**
 * Height of the fixed site footer, in px.
 *
 * The footer is page chrome — fixed to the bottom on every section, including
 * the hero — and it is opaque, so pane content passes behind it. Panes carry
 * this as bottom padding so their text still centres in the visible area
 * instead of being hidden under the bar.
 */
export const FOOTER_HEIGHT = 56
