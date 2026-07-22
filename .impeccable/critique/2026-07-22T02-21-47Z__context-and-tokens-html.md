---
target: context-and-tokens.html
total_score: 31
p0_count: 1
p1_count: 3
timestamp: 2026-07-22T02-21-47Z
slug: context-and-tokens-html
---
Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Play's 3.2s run has no progress signal beyond ticking totals |
| 2 | Match System / Real World | 4 | Plain Thai, real artifacts, each English term introduced once |
| 3 | User Control and Freedom | 3 | Reset is all-or-nothing; no way to remove one attachment or turn |
| 4 | Consistency and Standards | 3 | Play and Run look identical in weight to a preset tag |
| 5 | Error Prevention | 3 | Truncation caps and merge guard present; API run fires with no confirm |
| 6 | Recognition Rather Than Recall | 4 | Task labels sit above their bars; turn chips carry their own cost |
| 7 | Flexibility and Efficiency | 3 | Presets and +10 turns serve first-timers; nothing for power users, correctly |
| 8 | Aesthetic and Minimalist Design | 2 | Four of six slides sit 40-85% empty at rest |
| 9 | Error Recovery | 3 | Tokenizer fallback exemplary; API errors surface a raw HTTP status |
| 10 | Help and Documentation | 3 | Self-documenting inline; a phone reader alone gets no onboarding for the key panel |
| **Total** | | **31/40** | **Good** |

## Anti-Patterns Verdict

Not AI slop. Real client-side BPE tokenizer with a passing self-test, dated prices, cited research curve labelled approximate, computed totals. No gradient text, glass, card grids, tracked eyebrows, or overflow at any breakpoint.

Deterministic scan: 2 CSS rules flagged, 22 elements hit.
- side-tab (4 elements): `.takeaway { border-left: 3px solid var(--accent) }` — the one genuinely banned pattern present.
- layout-transition (6 elements): `transition: width` on bar segments — false positive; the bar is the content.
- line-length (14 elements): ~107 characters per line against a 75ch ceiling. Real.
- single-font (1): false positive; one family is correct for a product surface.

## What's Working

1. Demo 2's eviction is the emotional peak — "it forgot what I said" becomes concrete in one click.
2. Honesty is load-bearing: failure path degrades to labelled estimates, self-test exists and passes, every approximation names its source.
3. Demo 3's synchronised task groups let the gap grow in front of the viewer.

## Priority Issues

**[P0] No aria-live regions.** Token count, characters, ratio, window summary, burn totals all update silently. The product thesis is understanding-through-manipulation; a blind attendee gets the manipulation and none of the understanding. Fix: aria-live="polite" on the stat and summary nodes; suppress or batch announcements during play. Command: /impeccable audit

**[P1] Data that exists only in title tooltips.** Chip IDs, segment counts, per-turn column values, recall percentages — hover-only on non-focusable elements. A segment under 6% width hides its visible label, making the tooltip the only place the number exists. Fix: visible labels, a readout region, or focusable elements with accessible names. Command: /impeccable audit

**[P1] The scroll-hint pill overlaps content on phones.** At 375x812 it loads visible over slide 1's ratio stat and chip row, despite intending never to appear below the snap breakpoint. Initial-state race; a resize clears it. Fix: width guard in refresh() plus re-validation after layout settles. Command: /impeccable adapt

**[P1] Touch targets under 44px.** Every button 42px tall at phone width; key input 37px; icon buttons 21x28 and 20x32. Command: /impeccable adapt

**[P2] Contrast failure against the project's own stated bar.** History segment label computes 4.14:1 against a committed 4.5:1; attachment segment thin at 4.73:1. Body 15.4:1 and muted 7.2:1 are comfortable. Command: /impeccable polish

## Persona Red Flags

**Jordan (first-timer)**: first thing on screen is a row of replacement-character chips with the explanation below them. Preset buttons keep no selected state.

**Sam (accessibility-dependent)**: keyboard reach and focus rings are fine — native elements, nothing suppressing outlines. But the page is reachable without being perceivable.

**Nid (phone revisit that evening)**: walks into the stuck pill over the numbers she returned for, and meets the API-key panel with no presenter. Warning copy is honest but styled like every other caption.

## Minor Observations

- Partial-token note explains Thai only; the same dashed chips appear for emoji.
- Demo 3's charts are drawn at rest, so Play has no functional reason to be discovered, and is styled like a filter tag.
- Closing slide is ~80% empty with no send-off — the most expensive empty space on the page.
- Heading numbers read as scaffolding but earn their place as position signals.

## Questions to Consider

- If the charts are already drawn, what is Play for?
- Should the closing rules slide be interactive, so the deck ends on a click?
- Should the self-test's verification be visible to the audience rather than hidden behind ?test=1?
- Is the empty space at rest a decision or the residue of cut content?
