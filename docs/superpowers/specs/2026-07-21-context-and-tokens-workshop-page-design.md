# Context & Tokens — Workshop Page Design

**Date:** 2026-07-21
**Status:** Approved

## Purpose

A single self-contained web page that lets non-technical AI users see and feel what tokens and
the context window are. Attendees open it on their own laptops during a workshop and experiment
unguided. Success: an attendee leaves able to explain why a long chat "forgets", why it slows
down, why it burns their usage limit faster, and what to do about it.

## Audience and usage

- Non-technical users of Claude / ChatGPT — PMs, writers, ops. Subscription users, not API callers.
- Each attendee on their own laptop, self-guided, from a URL the presenter shares.
- Presenter can still call out section numbers from the front.

## Delivery

One file: `context-and-tokens.html`. Hosted by the presenter (GitHub Pages, intranet, or opened
from disk). No build step, no server. The page makes no network
calls at all unless a user opts into the advanced live panel in demo 4, so it works offline and
over `file://`. Roughly 1.0 MB because the tokenizer vocabulary is embedded.

## Architecture

- Structure: `<header>` + four `<section>` demos + takeaway strip + footer. Single vertical
  scroll — the reading order is the argument. Scroll-spy progress dots for orientation.
- A `CONFIG` object at the top of the inline `<script>` holds every value that can go stale:
  model names, context window size, price aside, quota assumptions, and the recorded-run data.
  Each entry carries the date it was captured. Editing the page's numbers means editing one block.
- Each demo is an independent module — `initTokenizer(root)`, `initWindow(root)`, `initBurn(root)`,
  `initHaystack(root)`. They share exactly one dependency: `tokenize(text) -> number[]`.
  Replacing the tokenizer touches nothing else.
- Tokenizer: real BPE (`cl100k_base` — chosen over `o200k_base` because its ranks file inlines to
  about 1.0 MB instead of 3 MB, with the same teaching value), vocabulary embedded as base64 + gzip and decoded once at
  load via `DecompressionStream`. Brief loading state, then every demo is live.
- No CDN scripts, no web fonts, no analytics.

## The four demos

### 1. What is a token? (tokenizer playground)

Large textarea, prefilled. Typing updates live: token chips in alternating colors, plus token
count, character count, and characters-per-token.

Preset buttons load canned strings that each make one point:

- `strawberry` — the split explains why the model miscounts letters
- emoji, and a long number like `1234567890`
- the same sentence in English and in Arabic or Thai — three to four times the tokens for the
  same meaning, so the same idea consumes far more of the window
- a code snippet, and whitespace-heavy text

Takeaway line: the model never sees letters, only these chunks.

### 2. The window (context meter)

A fixed bar representing the 200K-token window, filled with stacked segments: system prompt,
attached files, chat history, and space reserved for the reply.

Controls attach canned artifacts ("50-page PDF", "spreadsheet", "long email") and add chat turns.
When the bar overfills, the oldest turns visibly slide out and grey. Label: this is what "it
forgot what I said" means. A paste-your-own box measures the attendee's real text against the
window.

### 3. Why it gets slow and eats your limit (resend / burn)

A turn-by-turn bar chart. Every turn reprocesses everything before it plus the new message, so
turn 1 is small and turn 30 is huge. Two runs sit side by side: one long chat versus the same work
split across three fresh chats, with cumulative totals compared.

A collapsed aside gives the API-rate dollar equivalent for perspective, dated.

Takeaways: start a new chat when the topic changes; attach the document once, not every turn.

### 4. Where it breaks (lost in the middle)

A fact is buried at 10%, 50%, and 90% through a long document. Clicking a position shows the
actual answer recorded from that run, alongside a recall-versus-position curve. Everything is
labeled "recorded run, <model>, <date>" — nothing is presented as live that is not.

A collapsed advanced panel lets a user paste their own API key to run it live. The key is held in
memory only, never written to storage, never sent anywhere except the Anthropic API, and cleared
on reload. The panel carries a plain warning and is off by default.

### Closing takeaway strip

Four rules of thumb: new chat per topic; put the question first; attach once; shorter beats longer.

## Data and accuracy

**Tokenizer fidelity.** Claude's exact tokenizer is not published. The page bundles `cl100k_base`,
a real published BPE, and says so plainly: a close stand-in, counts accurate within a few percent,
individual splits illustrative. Every phenomenon demonstrated — subword chunks, other languages
costing more, emoji — holds for Claude as well.

**Recorded run.** The burial experiment is run against the API before the workshop; answers and
the recall curve are stored in `CONFIG.recordedRun` with model and date. If API access is
unavailable, the page falls back to the published research curve, cited.

## Failure modes

- Very large paste: input debounced at 120 ms and capped near 200K characters, with a note that
  this already exceeds the window.
- Vocabulary decode failure on an old browser: automatic fallback to a heuristic counter plus a
  visible banner stating counts are now approximate. The page never blanks.
- Live API panel: errors displayed verbatim; no retry loop; no key persistence.

## Verification

- `?test=1` runs in-page assertions — known strings to known token counts, window arithmetic, burn
  arithmetic — and prints a pass/fail strip. Run before the workshop; a broken vocabulary shows up
  immediately.
- Manual checklist: Chrome, Safari, Firefox; `file://` and hosted; 1280 px projector width; phone
  width.

## Out of scope

Dark/light toggle, saving or sharing state, UI translation, analytics.
