# Workshop day checklist

## The morning of

- [ ] Open `index.html?test=1` on the venue wifi, on the machine you will share the
      link from. A green strip at the bottom reading `all 13 checks passed` means the page is
      healthy. A red strip names what broke.
- [ ] Load the hosted URL on a phone as well as a laptop. The page is one 1.0 MB file — it loads
      once and then works offline, but the first load on bad wifi is the slow moment.
- [ ] Click through all four demos once yourself. In particular: click `+ 10 chat turns` four times
      in section 2 and confirm you see turns go struck-through. That eviction is the moment the
      whole page is built around.
- [ ] If you have not opened the page since it was last edited, check it once in Chrome, Firefox,
      and Safari, at projector width (1280 px) and at phone width. The layout is fluid and the
      demos are plain DOM, so this rarely surprises — but it is cheap the day before and expensive
      in the room.

## Known limitations, so nothing surprises you

- Token counts come from `cl100k_base`, a published tokenizer. Claude's exact tokenizer is not
  public. Counts are within a few percent and every effect shown is real for Claude too. Section 1
  says this on the page, so you can point at it rather than explaining from memory.
- Section 4 shows a published research curve, not a live model, because no recorded run was
  captured. It says so on screen. To replace it with real measured answers, see below.
- Section 4's advanced panel can call the API live with a viewer's own key. It is collapsed by
  default and the key is never stored. Do not use it on a shared machine.

## Regenerating the numbers

- [ ] `npm run record:run` — replaces the research curve in section 4 with a real recorded run.
      Needs `ANTHROPIC_API_KEY` set. Costs three requests of roughly 25,000 tokens each. Re-run it
      if the existing recording is more than a few months old.
- [ ] `npm run build:vocab` — regenerates the embedded tokenizer. Only needed if the vocabulary
      itself must change; it rewrites the page in place.
- [ ] `npm test` — 15 checks over the page's own logic. Run after either of the above.

Everything that goes stale — prices, window size, model name, the reserve and system-prompt
estimates — lives in the `CONFIG` block near the top of the page's `<script>`. Edit it with any
text editor; there is no build step.
