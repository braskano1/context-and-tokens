# บริบทกับโทเค็น — Context & Tokens

An interactive workshop page, in Thai, that teaches non-technical people what tokens and the
context window actually are — by letting them push the things around rather than reading about them.

Built for subscription users of Claude and ChatGPT: PMs, writers, ops staff. No API knowledge
assumed, nothing to install, no account needed.

**[context-and-tokens.html](context-and-tokens.html)** is the whole thing. One self-contained file,
about 1 MB, most of which is an embedded BPE vocabulary. Open it from disk or host it anywhere; it
makes no network calls.

## What's in it

Eight slides, one screen each, in a snap-scrolling deck:

1. **โทเค็น (token) คืออะไร** — a live tokenizer. Type anything and watch it split into chunks. The
   presets make the point fast: a common Thai word is often one opaque chunk, a rare one shatters,
   and the same sentence costs about 6.5× more tokens in Thai than in English.
2. **หน้าต่างบริบท (context window)** — a proportional bar you drive one turn at a time. Question,
   thinking, answer — and then the thinking vanishes, because it does not carry forward.
3. **2.1 พอหน้าต่างเต็ม จะเกิดอะไรขึ้น** — compaction: hundreds of old turns collapsing into one
   small summary so the conversation can continue.
4. **ทำไมยิ่งคุยยิ่งช้าและกินโควตาเร็ว** — every turn re-reads the whole conversation. One long chat
   does 2.4× the work of the same task split across three.
5. **จุดที่มันพลาด** — recall by position, from published research, labelled as approximate.
6. **ส่งต่องาน (handoff) ไปแชทใหม่** — carrying what matters into a fresh chat, and choosing what
   to leave behind.
7. **สี่ข้อที่ควรจำ** — the four rules the whole deck argues for.

Every animation has both an auto-play and a `ถัดไป` button, so you can step through one beat at a
time or let it run.

## Running it

Just open `context-and-tokens.html` in a browser. That is the supported path, and it works offline.

For a local URL instead:

```bash
npm run serve     # http://localhost:8123/context-and-tokens.html
```

## Checking it before a workshop

```bash
npm test          # 15 unit tests over the page's own logic
```

Then open `context-and-tokens.html?test=1`. A green strip at the bottom reading
`ผ่านทั้งหมด 14 รายการ` means the tokenizer decoded and the demos' arithmetic is sound. A red strip
names what broke.

See [docs/workshop-checklist.md](docs/workshop-checklist.md) for the morning-of routine.

## Honesty notes

The page is meant to survive being challenged by someone sharp in the room, so:

- Token counts come from `cl100k_base`, a published tokenizer standing in for Claude's own, which
  is not public. Counts are within a few percent and every effect shown holds for Claude too. The
  page says so in section 1.
- Section 5's recall curve is from Liu et al., *Lost in the Middle* (2023), labelled approximate,
  read off a published chart. No live model is called.
- The compaction figures are illustrative and say so; real summaries land in the low thousands of
  tokens and vary by tool.
- Everything else on screen — token counts, window arithmetic, per-turn processing totals — is
  computed live from the same functions the tests cover.

## Development

`dev/` holds tooling that is never shipped to attendees:

| | |
|---|---|
| `dev/build-vocab.mjs` | downloads the BPE vocabulary, embeds it, and computes ground-truth test vectors |
| `dev/record-run.mjs` | records a real lost-in-the-middle run against the API to replace section 5's research curve |
| `dev/serve.mjs` | dependency-free static server |
| `dev/tests/` | extracts the page's inline logic block and tests it in Node, without a browser |

Numbers that go stale — model name, window size, prices — live in the `CONFIG` block near the top
of the page's `<script>`. There is no build step; edit the file and reload.
