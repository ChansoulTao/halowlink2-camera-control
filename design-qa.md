# Signal-First Dashboard Design QA

## Comparison inputs

- Source visual: `/Users/taochangshuo/.codex/generated_images/019fc115-6223-7150-952b-80216df2c881/exec-1f15c6b3-ba4a-4106-9509-d353c5fe2964.png`
- Implementation screenshot: `/tmp/halowlink-signal-first-final-v2-1194x834.png`
- Full-frame side-by-side comparison: `/tmp/halowlink-design-comparison-final.png`
- Focused chart comparison: `/tmp/halowlink-design-chart-focus.png`
- Viewport: 1194 × 834 CSS pixels
- Screenshot: 1194 × 834 physical pixels
- Browser density: 1×
- State: AP mode, dark theme, two online Clients, two automatically matched pinned Cameras, Pinned-only device filter, monitor mode off

The full frame and chart crop were compared side by side at the same 1194 × 834 target viewport. The focused crop was required because correctly proportioned chart labels and numerals were a specific user-reported failure mode.

## Findings and fixes

1. **P1 · Chart typography and geometry** — The old fixed 600-pixel drawing surface was being CSS-scaled, which visibly narrowed and blurred axis numerals. The chart now derives its backing-store dimensions from its actual CSS bounds and device pixel ratio, then draws every grid line, label, outage band, and series in live coordinates. The focused comparison confirms normal-width, legible numerals with no horizontal transform.
2. **P1 · 834-pixel iPad overflow** — The first responsive pass left the Live Link and Devices tables wider than the portrait iPad content area. Live Link rows now become two-level metric rows below 900 pixels; lower-priority Device columns collapse at that breakpoint. Final measured client width equals scroll width for both sections.
3. **P1 · Mobile overlap** — The inherited desktop grid positions collided at 390 pixels. Mobile rows now reset every explicit grid position and use a two-column semantic card layout. No text, switch, status, or metric overlaps remain.
4. **P2 · Selected-design density** — The initial build placed the Devices table too far below the first viewport. The short-landscape rules now use a 164-pixel Live Link panel and 269-pixel chart panel; both Camera rows are visible in Devices at 1194 × 834, matching the selected operations-board hierarchy.
5. **P2 · Camera naming** — Live Link, chart legends, recovery metrics, and connection assignments use the automatically matched Camera profile name. The tested Pin/Unpin flow updates both the Live Link table and Client-to-Camera connection section immediately.
6. **P2 · Icons and controls** — Text glyphs were replaced in the redesigned AP surface with official Iconoir assets. Focus rings, semantic table headings, control labels, canvas descriptions, reduced-motion navigation behavior, and 44-pixel mobile touch targets were added.

## Responsive verification

| Viewport | Result |
| --- | --- |
| 1194 × 834 | Two-column operations board; root 1158/1158 px client/scroll width; Live Link 869/869; Devices 863/863. |
| 1024 × 768 | Sidebar becomes a top summary; main 986/986 px; Live Link 926/926 with no clipping. |
| 834 × 1194 | Live Link changes to two-level rows; Live Link 736/736; Devices 736/736. |
| 390 × 844 | Semantic two-column Client cards and Device cards; root 370/370; chart 323 × 215 with matching backing store. |

## Interaction verification

- Monitor mode hides configuration-only sections while keeping Live Link and signal history visible.
- AP indicator-light switch updates its visual state, value text, `aria-pressed`, and accessible label immediately.
- Per-Client remote light switches update independently.
- All, Pinned, and Hidden filters render the expected device sets.
- Device search filters rows as text is entered.
- Unpinning a Camera immediately removes its automatic link; re-pinning immediately restores the Camera name in Live Link and connection assignments.
- Browser console produced no errors or warnings during the final responsive and interaction passes.

## Accepted data-driven differences

- The selected source visual contains one example Client; the implementation intentionally shows two realistic Client/Camera pairs to validate multi-Client density.
- A freshly loaded preview initially labels the chart span in seconds. The production chart naturally expands to the full five-minute window as real samples accumulate.

final result: passed
