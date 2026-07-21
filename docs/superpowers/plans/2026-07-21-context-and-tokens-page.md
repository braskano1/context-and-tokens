# Context & Tokens Workshop Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build `context-and-tokens.html` — one self-contained page that lets non-technical workshop attendees see tokens, the context window, per-turn resend cost, and lost-in-the-middle degradation.

**Architecture:** Everything the attendee loads is one HTML file with inline CSS and one inline `<script>`. Inside that script, all DOM-free logic lives between `/* LOGIC:START */` and `/* LOGIC:END */` markers so a Node test runner can extract and unit-test it without a browser. Dev-time Node scripts (never shipped) download the BPE vocabulary, gzip+base64 it, compute ground-truth test vectors with `js-tiktoken`, and inject all of it into the HTML between comment markers.

**Tech Stack:** Vanilla HTML/CSS/JS (no framework, no bundler). Node 20+ for dev scripts and `node --test`. Dev-only deps: `js-tiktoken` (ground truth), `@anthropic-ai/sdk` (recording the demo-4 run). Browser APIs used: `DecompressionStream`, `TextEncoder`, `matchAll` with unicode property escapes.

**Spec:** `docs/superpowers/specs/2026-07-21-context-and-tokens-workshop-page-design.md`

---

## File Structure

| Path | Responsibility |
|---|---|
| `context-and-tokens.html` | The entire shipped artifact: markup, CSS, CONFIG, logic block, UI modules. |
| `dev/build-vocab.mjs` | Downloads `cl100k_base.tiktoken`, gzips + base64s it, computes test vectors with `js-tiktoken`, injects both into the HTML between markers. |
| `dev/record-run.mjs` | Runs the lost-in-the-middle experiment against the Anthropic API once, injects results into the HTML. |
| `dev/tests/load-logic.mjs` | Extracts the LOGIC block from the HTML and evaluates it for Node tests. |
| `dev/tests/tokenizer.test.mjs` | Tokenizer correctness against injected vectors. |
| `dev/tests/window.test.mjs` | `packContext` arithmetic and eviction. |
| `dev/tests/burn.test.mjs` | `burnSeries` / `splitChats` arithmetic. |
| `package.json` | Dev deps and scripts only. Not needed to view the page. |

Everything the attendee needs is `context-and-tokens.html` alone. `dev/` exists so the numbers in the page can be regenerated and trusted.

---

### Task 1: Scaffolding and a test harness that can see into the HTML

**Files:**
- Create: `package.json`
- Create: `context-and-tokens.html`
- Create: `dev/tests/load-logic.mjs`
- Create: `dev/tests/harness.test.mjs`
- Modify: `.gitignore`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "context-and-tokens",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test \"dev/tests/**/*.test.mjs\"",
    "build:vocab": "node dev/build-vocab.mjs",
    "record:run": "node dev/record-run.mjs"
  },
  "devDependencies": {
    "js-tiktoken": "^1.0.15",
    "@anthropic-ai/sdk": "^0.32.1"
  }
}
```

- [ ] **Step 2: Add `node_modules` to `.gitignore`**

Append to `.gitignore` (it already contains `.superpowers/`):

```
node_modules/
```

- [ ] **Step 3: Install dev deps**

Run: `npm install`
Expected: `added N packages`, and `node_modules/js-tiktoken` exists.

- [ ] **Step 4: Create the page skeleton with markers**

Create `context-and-tokens.html`:

```html
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Context &amp; Tokens</title>
<style>
  :root { --bg:#0f1115; --fg:#e8e8ea; --muted:#9aa0aa; --accent:#7aa2f7; --warn:#e0af68; --pane:#171a21; --line:#2a2f3a; }
  * { box-sizing: border-box; }
  body { margin:0; background:var(--bg); color:var(--fg); font:16px/1.6 system-ui, sans-serif; }
  main { max-width: 900px; margin: 0 auto; padding: 24px 20px 120px; }
  h1 { font-size: clamp(28px, 5vw, 44px); line-height:1.15; margin:.6em 0 .2em; }
  h2 { font-size: clamp(22px, 3.5vw, 32px); margin-top: 2.4em; }
  section { border-top:1px solid var(--line); padding-top: 8px; }
  .muted { color: var(--muted); }
  #status { padding:10px 14px; background:var(--pane); border:1px solid var(--line); border-radius:8px; }
</style>
</head>
<body>
<main>
  <h1>Context &amp; Tokens</h1>
  <p class="muted">Four things to try. Scroll top to bottom.</p>
  <div id="status">Loading the tokenizer…</div>

  <section id="s1"><h2>1. What is a token?</h2><div class="mount"></div></section>
  <section id="s2"><h2>2. The window</h2><div class="mount"></div></section>
  <section id="s3"><h2>3. Why it slows down and eats your limit</h2><div class="mount"></div></section>
  <section id="s4"><h2>4. Where it breaks</h2><div class="mount"></div></section>
</main>

<script>
/* LOGIC:START */
const VOCAB_B64 = ""; /* VOCAB:INJECTED */
const TEST_VECTORS = []; /* VECTORS:INJECTED */
const RECORDED_RUN = null; /* RUN:INJECTED */
/* LOGIC:END */

document.getElementById('status').textContent = 'Skeleton loaded.';
</script>
</body>
</html>
```

- [ ] **Step 5: Write the logic loader**

Create `dev/tests/load-logic.mjs`:

```js
import { readFileSync } from 'node:fs';

const HTML = new URL('../../context-and-tokens.html', import.meta.url);

export function loadLogic() {
  const html = readFileSync(HTML, 'utf8');
  const match = html.match(/\/\* LOGIC:START \*\/([\s\S]*?)\/\* LOGIC:END \*\//);
  if (!match) throw new Error('LOGIC block not found in context-and-tokens.html');
  const factory = new Function(`${match[1]}
    return { VOCAB_B64, TEST_VECTORS, RECORDED_RUN, sum };`);
  return factory();
}
```

The export list at the end grows as later tasks add functions to the LOGIC block. Each task that
adds one says so explicitly.

- [ ] **Step 6: Write the first harness test**

Create `dev/tests/harness.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic } from './load-logic.mjs';

test('logic block is extractable and exports sum', () => {
  const logic = loadLogic();
  assert.equal(typeof logic.sum, 'function');
  assert.equal(logic.sum([1, 2, 3]), 6);
});
```

- [ ] **Step 7: Run tests, watch them fail**

Run: `npm test`
Expected: FAIL — `ReferenceError: sum is not defined`, thrown while evaluating the extracted block.
This proves the loader really is executing the page's own code rather than a copy.

- [ ] **Step 8: Add `sum` to the LOGIC block**

In `context-and-tokens.html`, add above `/* LOGIC:END */`:

```js
function sum(xs) { return xs.reduce((a, b) => a + b, 0); }
```

- [ ] **Step 9: Run tests, watch them pass**

Run: `npm test`
Expected: PASS, `1 pass 0 fail`.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json .gitignore context-and-tokens.html dev/tests/
git commit -m "feat: page skeleton and node test harness reading the inline logic block"
```

---

### Task 2: Embed the BPE vocabulary and ground-truth vectors

**Files:**
- Create: `dev/build-vocab.mjs`
- Modify: `context-and-tokens.html` (injected regions only)

- [ ] **Step 1: Write the build script**

Create `dev/build-vocab.mjs`:

```js
import { readFileSync, writeFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import { Tiktoken } from 'js-tiktoken/lite';
import cl100k from 'js-tiktoken/ranks/cl100k_base';

const RANKS_URL = 'https://openaipublic.blob.core.windows.net/encodings/cl100k_base.tiktoken';
const HTML_PATH = new URL('../context-and-tokens.html', import.meta.url);

const SAMPLES = [
  'hello world',
  'strawberry',
  ' strawberry',
  'Strawberry jam, 1234567890 jars.',
  'The quick brown fox jumps over the lazy dog.',
  'هذه جملة عربية قصيرة.',
  'ประโยคภาษาไทยสั้น ๆ',
  '🍓🍓 emoji burn tokens 🍓',
  'function add(a, b) {\n  return a + b;\n}\n',
  'trailing   spaces   and\n\nnewlines\n'
];

const res = await fetch(RANKS_URL);
if (!res.ok) throw new Error(`ranks download failed: ${res.status}`);
const ranksText = await res.text();

const b64 = gzipSync(Buffer.from(ranksText, 'utf8')).toString('base64');

const enc = new Tiktoken(cl100k);
const vectors = SAMPLES.map(text => ({ text, ids: enc.encode(text) }));

let html = readFileSync(HTML_PATH, 'utf8');
html = html.replace(
  /const VOCAB_B64 = [\s\S]*?\/\* VOCAB:INJECTED \*\//,
  `const VOCAB_B64 = "${b64}"; /* VOCAB:INJECTED */`
);
html = html.replace(
  /const TEST_VECTORS = [\s\S]*?\/\* VECTORS:INJECTED \*\//,
  `const TEST_VECTORS = ${JSON.stringify(vectors)}; /* VECTORS:INJECTED */`
);
writeFileSync(HTML_PATH, html);

console.log(`vocab: ${(b64.length / 1e6).toFixed(2)} MB base64, ${vectors.length} test vectors`);
```

- [ ] **Step 2: Run it**

Run: `npm run build:vocab`
Expected: `vocab: ~1.5 MB base64, 10 test vectors`.

- [ ] **Step 3: Verify the page still parses**

Run: `npm test`
Expected: PASS (harness test still green — it only reads `sum`).

- [ ] **Step 4: Sanity-check the injected size**

Run: `node -e "console.log((require('fs').statSync('context-and-tokens.html').size/1e6).toFixed(2)+' MB')"`
Expected: roughly `1.5` to `1.7` MB. If it is under 0.1 MB, injection silently failed — re-check the regexes.

- [ ] **Step 5: Commit**

```bash
git add dev/build-vocab.mjs context-and-tokens.html
git commit -m "feat: embed cl100k_base vocabulary and ground-truth test vectors"
```

---

### Task 3: The tokenizer

**Files:**
- Modify: `context-and-tokens.html` (LOGIC block)
- Modify: `dev/tests/load-logic.mjs`
- Create: `dev/tests/tokenizer.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `dev/tests/tokenizer.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic } from './load-logic.mjs';

const logic = loadLogic();

test('vocabulary decodes to a full rank table', async () => {
  const ranks = await logic.loadRanks();
  assert.ok(ranks.size > 99000, `expected ~100k ranks, got ${ranks.size}`);
});

test('encodes every ground-truth vector exactly', async () => {
  const ranks = await logic.loadRanks();
  for (const v of logic.TEST_VECTORS) {
    assert.deepEqual(logic.encode(ranks, v.text), v.ids, `mismatch for: ${JSON.stringify(v.text)}`);
  }
});

test('detailed encoding pairs ids with display text', async () => {
  const ranks = await logic.loadRanks();
  const detailed = logic.encodeDetailed(ranks, 'hello world');
  assert.equal(detailed.length, 2);
  assert.equal(detailed.map(t => t.text).join(''), 'hello world');
});

test('heuristic fallback lands within 25% of the real count', async () => {
  const ranks = await logic.loadRanks();
  const text = 'The quick brown fox jumps over the lazy dog. '.repeat(20);
  const real = logic.encode(ranks, text).length;
  const approx = logic.heuristicCount(text);
  assert.ok(Math.abs(approx - real) / real < 0.25, `real ${real}, approx ${approx}`);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- --test-name-pattern=token`
Expected: FAIL — `logic.loadRanks is not a function`.

- [ ] **Step 3: Implement the tokenizer inside the LOGIC block**

In `context-and-tokens.html`, insert after `function sum(...)`:

```js
const CL100K_PAT = /'(?:[sSdDmMtT]|[lL][lL]|[vV][eE]|[rR][eE])| ?\p{L}+| ?\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;
const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder('utf-8', { fatal: false });

function bytesKey(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function base64ToBytes(b64) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function gunzipToText(bytes) {
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip'));
  return await new Response(stream).text();
}

function buildRanks(text) {
  const ranks = new Map();
  for (const line of text.split('\n')) {
    if (!line) continue;
    const sp = line.indexOf(' ');
    ranks.set(bytesKey(base64ToBytes(line.slice(0, sp))), Number(line.slice(sp + 1)));
  }
  return ranks;
}

let ranksPromise = null;
function loadRanks() {
  if (!ranksPromise) {
    ranksPromise = gunzipToText(base64ToBytes(VOCAB_B64)).then(buildRanks);
  }
  return ranksPromise;
}

function bpeMerge(ranks, bytes) {
  let parts = Array.from(bytes, b => [b]);
  while (parts.length > 1) {
    let bestRank = Infinity, bestIdx = -1;
    for (let i = 0; i < parts.length - 1; i++) {
      const rank = ranks.get(bytesKey(parts[i].concat(parts[i + 1])));
      if (rank !== undefined && rank < bestRank) { bestRank = rank; bestIdx = i; }
    }
    if (bestIdx === -1) break;
    parts.splice(bestIdx, 2, parts[bestIdx].concat(parts[bestIdx + 1]));
  }
  return parts.map(p => ({ id: ranks.get(bytesKey(p)), bytes: p }));
}

function pieces(ranks, text) {
  const out = [];
  for (const match of text.matchAll(CL100K_PAT)) {
    const bytes = TEXT_ENCODER.encode(match[0]);
    const direct = ranks.get(bytesKey(bytes));
    if (direct !== undefined) { out.push({ id: direct, bytes: Array.from(bytes) }); continue; }
    for (const piece of bpeMerge(ranks, bytes)) out.push(piece);
  }
  return out;
}

function encode(ranks, text) {
  return pieces(ranks, text).map(p => p.id);
}

function encodeDetailed(ranks, text) {
  return pieces(ranks, text).map(p => ({
    id: p.id,
    text: TEXT_DECODER.decode(new Uint8Array(p.bytes))
  }));
}

function heuristicCount(text) {
  return Math.max(1, Math.round(text.length / 3.8));
}
```

- [ ] **Step 4: Export the new functions to the test loader**

In `dev/tests/load-logic.mjs`, change the return list to:

```js
    return { VOCAB_B64, TEST_VECTORS, RECORDED_RUN, sum,
      loadRanks, encode, encodeDetailed, heuristicCount, buildRanks, bpeMerge };
```

- [ ] **Step 5: Run the tests**

Run: `npm test`
Expected: PASS, 5 passing.

If the vector test fails on the emoji or Thai sample, the pretokenizer regex is the suspect — print
the failing `match[0]` values and compare against `js-tiktoken`'s split before touching the merge loop.

- [ ] **Step 6: Commit**

```bash
git add context-and-tokens.html dev/tests/
git commit -m "feat: real cl100k BPE tokenizer verified against js-tiktoken vectors"
```

---

### Task 4: Page shell — CONFIG, loading state, scroll dots, fallback banner

**Files:**
- Modify: `context-and-tokens.html`

- [ ] **Step 1: Add CONFIG above the LOGIC block**

```js
const CONFIG = {
  captured: '2026-07-21',
  model: 'Claude Opus 4.8',
  windowTokens: 200000,
  systemPromptTokens: 1200,
  replyReserveTokens: 8000,
  attachments: [
    { label: '50-page PDF', tokens: 37000 },
    { label: 'Spreadsheet export', tokens: 21000 },
    { label: 'Long email thread', tokens: 4200 }
  ],
  apiRates: { inputPerMTok: 5, outputPerMTok: 25, note: 'API list price, captured 2026-07-21' }
};
```

- [ ] **Step 2: Add the boot sequence below the LOGIC block**

```js
const statusEl = document.getElementById('status');
let RANKS = null;
let APPROXIMATE = false;

async function boot() {
  try {
    RANKS = await loadRanks();
    statusEl.remove();
  } catch (err) {
    APPROXIMATE = true;
    statusEl.innerHTML = '<strong>Heads up:</strong> your browser could not unpack the tokenizer, ' +
      'so counts on this page are estimates rather than exact. Everything still works.';
    statusEl.style.borderColor = 'var(--warn)';
  }
  countTokens = APPROXIMATE
    ? (text) => heuristicCount(text)
    : (text) => encode(RANKS, text).length;
  initTokenizer(document.querySelector('#s1 .mount'));
  initWindow(document.querySelector('#s2 .mount'));
  initBurn(document.querySelector('#s3 .mount'));
  initHaystack(document.querySelector('#s4 .mount'));
  if (new URLSearchParams(location.search).get('test') === '1') runSelfTest();
}

let countTokens = () => 0;
```

Leave `initTokenizer`, `initWindow`, `initBurn`, `initHaystack`, and `runSelfTest` as one-line stubs
(`function initWindow(root) { root.textContent = 'todo'; }`) for now — later tasks replace each one.
Call `boot()` at the end of the script.

- [ ] **Step 3: Verify in a browser**

Run: `start context-and-tokens.html` (Windows) and watch the loading line disappear within a second or two.
Expected: four sections, each showing `todo`, no console errors.

- [ ] **Step 4: Verify the fallback path**

Temporarily change `loadRanks` to `throw new Error('boom')` at its first line, reload, confirm the amber
"counts are estimates" banner appears and the page still renders. Revert the change.

- [ ] **Step 5: Commit**

```bash
git add context-and-tokens.html
git commit -m "feat: page shell with CONFIG, tokenizer boot, and approximate-count fallback"
```

---

### Task 5: Demo 1 — tokenizer playground

**Files:**
- Modify: `context-and-tokens.html`

- [ ] **Step 1: Add markup and styles**

Add to the `<style>` block:

```css
  textarea { width:100%; min-height:120px; background:var(--pane); color:var(--fg); border:1px solid var(--line); border-radius:8px; padding:12px; font:inherit; }
  .chips { display:flex; flex-wrap:wrap; gap:2px; margin:12px 0; }
  .chip { padding:2px 4px; border-radius:4px; font:14px/1.4 ui-monospace, monospace; white-space:pre-wrap; }
  .chip:nth-child(odd) { background:#2b3550; }
  .chip:nth-child(even) { background:#38304a; }
  .stats { display:flex; gap:20px; flex-wrap:wrap; font-variant-numeric:tabular-nums; }
  .stats b { font-size:22px; }
  .presets { display:flex; flex-wrap:wrap; gap:8px; margin:10px 0; }
  button { background:var(--pane); color:var(--fg); border:1px solid var(--line); border-radius:999px; padding:6px 12px; font:inherit; cursor:pointer; }
  button:hover { border-color:var(--accent); }
  .takeaway { border-left:3px solid var(--accent); padding-left:12px; margin:16px 0; }
```

- [ ] **Step 2: Implement `initTokenizer`**

```js
const PRESETS = [
  { label: 'strawberry', text: 'How many r\'s are in strawberry?' },
  { label: 'emoji', text: 'Ship it 🍓🚀 — emoji are expensive 🎉' },
  { label: 'numbers', text: 'Invoice 1234567890 for 42 units at 19.99' },
  { label: 'same idea, Arabic', text: 'This sentence costs far less in English.\nهذه الجملة نفسها تكلف ضعف عدد الرموز تقريبًا.' },
  { label: 'code', text: 'function add(a, b) {\n  return a + b;\n}\n' },
  { label: 'whitespace', text: 'lots     of      spaces\n\n\nand blank lines' }
];

function initTokenizer(root) {
  root.innerHTML = `
    <p>Type anything. The model never sees your letters — it sees these chunks.</p>
    <div class="presets"></div>
    <textarea id="tk-input">Tokens are the unit models actually read.</textarea>
    <div class="stats">
      <div><b id="tk-tokens">0</b><br><span class="muted">tokens</span></div>
      <div><b id="tk-chars">0</b><br><span class="muted">characters</span></div>
      <div><b id="tk-ratio">0</b><br><span class="muted">characters per token</span></div>
    </div>
    <div class="chips" id="tk-chips"></div>
    <p class="takeaway">This is why it miscounts letters in a word, and why the same sentence in
    another language can cost three times as much of your context.</p>`;

  const input = root.querySelector('#tk-input');
  const chips = root.querySelector('#tk-chips');

  const presetBar = root.querySelector('.presets');
  for (const preset of PRESETS) {
    const b = document.createElement('button');
    b.textContent = preset.label;
    b.onclick = () => { input.value = preset.text; render(); };
    presetBar.append(b);
  }

  function render() {
    const text = input.value.slice(0, 20000);
    const count = countTokens(text);
    root.querySelector('#tk-tokens').textContent = count.toLocaleString();
    root.querySelector('#tk-chars').textContent = text.length.toLocaleString();
    root.querySelector('#tk-ratio').textContent = count ? (text.length / count).toFixed(1) : '0';
    chips.textContent = '';
    if (APPROXIMATE) { chips.innerHTML = '<span class="muted">Chunk view needs the tokenizer, which did not load.</span>'; return; }
    for (const tok of encodeDetailed(RANKS, text).slice(0, 1200)) {
      const el = document.createElement('span');
      el.className = 'chip';
      el.textContent = tok.text.replace(/\n/g, '\\n');
      el.title = `id ${tok.id}`;
      chips.append(el);
    }
  }

  let timer;
  input.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(render, 120); });
  render();
}
```

- [ ] **Step 3: Verify by hand**

Reload the page. Click `strawberry` — confirm `strawberry` splits into more than one chip (this is the
whole point of the demo). Click `same idea, Arabic` and confirm the Arabic line produces visibly more
chips than the English line above it.

- [ ] **Step 4: Commit**

```bash
git add context-and-tokens.html
git commit -m "feat: tokenizer playground with gotcha presets"
```

---

### Task 6: Demo 2 — the context window meter

**Files:**
- Modify: `context-and-tokens.html` (LOGIC block + UI)
- Modify: `dev/tests/load-logic.mjs`
- Create: `dev/tests/window.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `dev/tests/window.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic } from './load-logic.mjs';

const { packContext } = loadLogic();

const base = { windowTokens: 1000, systemTokens: 100, replyReserve: 200, attachments: [], turns: [] };

test('everything fits when there is room', () => {
  const r = packContext({ ...base, turns: [50, 50, 50] });
  assert.equal(r.dropped.length, 0);
  assert.equal(r.usedTokens, 100 + 150);
  assert.equal(r.freeTokens, 1000 - 200 - 250);
});

test('oldest turns are evicted first when the window overflows', () => {
  const r = packContext({ ...base, turns: [300, 300, 300] });
  assert.deepEqual(r.dropped, [0]);
  assert.deepEqual(r.kept, [1, 2]);
  assert.ok(r.usedTokens <= 1000 - 200);
});

test('an attachment can evict history on its own', () => {
  const r = packContext({ ...base, attachments: [600], turns: [100, 100] });
  assert.deepEqual(r.dropped, [0]);
});

test('an attachment larger than the window is reported, not silently dropped', () => {
  const r = packContext({ ...base, attachments: [5000] });
  assert.equal(r.overflow, true);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- --test-name-pattern=window`
Expected: FAIL — `packContext is not a function`.

- [ ] **Step 3: Implement `packContext` in the LOGIC block**

```js
function packContext({ windowTokens, systemTokens, replyReserve, attachments, turns }) {
  const attachmentTokens = sum(attachments);
  const fixed = systemTokens + attachmentTokens;
  const budget = windowTokens - replyReserve - fixed;
  const kept = [];
  const dropped = [];
  let historyTokens = 0;
  for (let i = turns.length - 1; i >= 0; i--) {
    if (budget > 0 && historyTokens + turns[i] <= budget) {
      historyTokens += turns[i];
      kept.unshift(i);
    } else {
      dropped.unshift(i);
    }
  }
  return {
    attachmentTokens,
    historyTokens,
    usedTokens: fixed + historyTokens,
    freeTokens: Math.max(0, budget - historyTokens),
    kept,
    dropped,
    overflow: budget < 0
  };
}
```

- [ ] **Step 4: Export it and run the tests**

Add `packContext` to the return list in `dev/tests/load-logic.mjs`.

Run: `npm test`
Expected: PASS, 9 passing.

- [ ] **Step 5: Implement `initWindow`**

Add to `<style>`:

```css
  .bar { display:flex; height:44px; border:1px solid var(--line); border-radius:8px; overflow:hidden; margin:14px 0; }
  .seg { display:flex; align-items:center; justify-content:center; font-size:12px; overflow:hidden; white-space:nowrap; transition: width .35s ease; }
  .seg-sys { background:#3d5a80; } .seg-att { background:#8a5a44; } .seg-hist { background:#4f7942; } .seg-reply { background:#5c4b8a; } .seg-free { background:#20242d; }
  .turnlist { display:flex; flex-wrap:wrap; gap:6px; }
  .turn { padding:4px 8px; border:1px solid var(--line); border-radius:6px; font-size:13px; }
  .turn.gone { opacity:.35; text-decoration: line-through; }
```

```js
function initWindow(root) {
  const state = { attachments: [], turns: [], pasted: 0 };

  root.innerHTML = `
    <p>Everything the model can hold at once — ${CONFIG.windowTokens.toLocaleString()} tokens for
    ${CONFIG.model}. It all shares one bar.</p>
    <div class="bar" id="w-bar"></div>
    <div class="presets" id="w-controls">
      <button data-act="turn">+ chat turn</button>
      <button data-act="reset">reset</button>
    </div>
    <p class="muted" id="w-summary"></p>
    <div class="turnlist" id="w-turns"></div>
    <p>Paste your own text to see it measured against the window:</p>
    <textarea id="w-paste" placeholder="Paste an email, a report, anything."></textarea>
    <p class="takeaway" id="w-takeaway">When the bar is full, the oldest turns fall out of it.
    That is what "it forgot what I said" actually means.</p>`;

  const controls = root.querySelector('#w-controls');
  for (const att of CONFIG.attachments) {
    const b = document.createElement('button');
    b.textContent = `+ ${att.label}`;
    b.onclick = () => { state.attachments.push(att.tokens); render(); };
    controls.prepend(b);
  }
  controls.querySelector('[data-act="turn"]').onclick = () => {
    state.turns.push(900 + Math.round(state.turns.length * 260));
    render();
  };
  controls.querySelector('[data-act="reset"]').onclick = () => {
    state.attachments = []; state.turns = []; render();
  };

  const paste = root.querySelector('#w-paste');
  let timer;
  paste.addEventListener('input', () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      const text = paste.value.slice(0, 200000);
      if (paste.value.length > 200000) {
        paste.value = text;
      }
      state.pasted = text ? countTokens(text) : 0;
      render();
    }, 120);
  });

  function render() {
    const attachments = state.pasted ? [...state.attachments, state.pasted] : state.attachments;
    const r = packContext({
      windowTokens: CONFIG.windowTokens,
      systemTokens: CONFIG.systemPromptTokens,
      replyReserve: CONFIG.replyReserveTokens,
      attachments,
      turns: state.turns
    });
    const segs = [
      ['seg-sys', CONFIG.systemPromptTokens, 'instructions'],
      ['seg-att', r.attachmentTokens, 'attached'],
      ['seg-hist', r.historyTokens, 'chat history'],
      ['seg-free', r.freeTokens, 'free'],
      ['seg-reply', CONFIG.replyReserveTokens, 'room to reply']
    ];
    const bar = root.querySelector('#w-bar');
    bar.textContent = '';
    for (const [cls, tokens, label] of segs) {
      const el = document.createElement('div');
      el.className = `seg ${cls}`;
      el.style.width = `${Math.max(0, tokens / CONFIG.windowTokens) * 100}%`;
      el.textContent = tokens > CONFIG.windowTokens * 0.06 ? label : '';
      el.title = `${label}: ${tokens.toLocaleString()} tokens`;
      bar.append(el);
    }
    root.querySelector('#w-summary').textContent = r.overflow
      ? 'That attachment alone is bigger than the whole window — nothing else fits.'
      : `${r.usedTokens.toLocaleString()} of ${CONFIG.windowTokens.toLocaleString()} tokens used · ${r.dropped.length} turn(s) pushed out`;
    const list = root.querySelector('#w-turns');
    list.textContent = '';
    state.turns.forEach((tokens, i) => {
      const el = document.createElement('span');
      el.className = 'turn' + (r.dropped.includes(i) ? ' gone' : '');
      el.textContent = `turn ${i + 1} · ${tokens.toLocaleString()}`;
      list.append(el);
    });
  }

  render();
}
```

- [ ] **Step 6: Verify by hand**

Reload. Add the 50-page PDF twice plus several chat turns, and confirm early turns become struck
through and greyed while the bar stays full-width.

- [ ] **Step 7: Commit**

```bash
git add context-and-tokens.html dev/tests/
git commit -m "feat: context window meter with eviction of oldest turns"
```

---

### Task 7: Demo 3 — resend and quota burn

**Files:**
- Modify: `context-and-tokens.html` (LOGIC block + UI)
- Modify: `dev/tests/load-logic.mjs`
- Create: `dev/tests/burn.test.mjs`

- [ ] **Step 1: Write the failing test**

Create `dev/tests/burn.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic } from './load-logic.mjs';

const { burnSeries, splitChats } = loadLogic();

const turns = Array.from({ length: 4 }, () => ({ in: 100, out: 200 }));

test('turn one only processes the baseline plus its own message', () => {
  const s = burnSeries({ baseTokens: 500, turns });
  assert.equal(s[0].processed, 600);
});

test('each later turn re-processes everything before it', () => {
  const s = burnSeries({ baseTokens: 500, turns });
  assert.equal(s[1].processed, 500 + 300 + 100);
  assert.equal(s[3].processed, 500 + 900 + 100);
});

test('cumulative total is the running sum of processed tokens', () => {
  const s = burnSeries({ baseTokens: 0, turns });
  assert.equal(s.at(-1).cumulative, s.reduce((a, t) => a + t.processed, 0));
});

test('splitting the same work into fresh chats processes strictly less', () => {
  const long = burnSeries({ baseTokens: 500, turns }).at(-1).cumulative;
  const split = splitChats({ baseTokens: 500, turns, chatLength: 2 }).at(-1).cumulative;
  assert.ok(split < long, `split ${split} should be below long ${long}`);
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npm test -- --test-name-pattern=turn`
Expected: FAIL — `burnSeries is not a function`.

- [ ] **Step 3: Implement both functions in the LOGIC block**

```js
function burnSeries({ baseTokens, turns }) {
  const series = [];
  let history = 0;
  let cumulative = 0;
  for (const turn of turns) {
    const processed = baseTokens + history + turn.in;
    cumulative += processed;
    series.push({ processed, cumulative });
    history += turn.in + turn.out;
  }
  return series;
}

function splitChats({ baseTokens, turns, chatLength }) {
  const series = [];
  let cumulative = 0;
  for (let start = 0; start < turns.length; start += chatLength) {
    const chunk = turns.slice(start, start + chatLength);
    for (const point of burnSeries({ baseTokens, turns: chunk })) {
      cumulative += point.processed;
      series.push({ processed: point.processed, cumulative });
    }
  }
  return series;
}
```

- [ ] **Step 4: Export and run the tests**

Add `burnSeries, splitChats` to the return list in `dev/tests/load-logic.mjs`.

Run: `npm test`
Expected: PASS, 13 passing.

- [ ] **Step 5: Implement `initBurn`**

Add to `<style>`:

```css
  .cols { display:flex; align-items:flex-end; gap:4px; height:160px; margin:12px 0; }
  .col { flex:1; background:var(--accent); border-radius:3px 3px 0 0; min-height:2px; }
  .col.alt { background:#7a9c7a; }
  .split2 { display:grid; grid-template-columns:1fr 1fr; gap:20px; }
  @media (max-width:640px) { .split2 { grid-template-columns:1fr; } }
  details { margin:12px 0; }
```

```js
function initBurn(root) {
  const TURNS = 20;
  const turns = Array.from({ length: TURNS }, () => ({ in: 220, out: 520 }));
  const baseTokens = CONFIG.systemPromptTokens + CONFIG.attachments[0].tokens;

  const long = burnSeries({ baseTokens, turns });
  const split = splitChats({ baseTokens, turns, chatLength: 7 });

  const dollars = (tokens) => (tokens / 1e6 * CONFIG.apiRates.inputPerMTok).toFixed(2);

  root.innerHTML = `
    <p>Every time you hit send, the model re-reads the whole conversation. Turn 20 is not the same
    size as turn 1 — it carries all nineteen turns before it.</p>
    <div class="split2">
      <div>
        <h3>One long chat</h3>
        <div class="cols" id="b-long"></div>
        <p class="muted">Total processed: <b>${long.at(-1).cumulative.toLocaleString()}</b> tokens</p>
      </div>
      <div>
        <h3>Same work, a fresh chat every 7 turns</h3>
        <div class="cols" id="b-split"></div>
        <p class="muted">Total processed: <b>${split.at(-1).cumulative.toLocaleString()}</b> tokens</p>
      </div>
    </div>
    <p>That is <b>${(long.at(-1).cumulative / split.at(-1).cumulative).toFixed(1)}×</b> more work for
    the same conversation — which is why a long chat gets slower and eats your usage limit faster.</p>
    <details>
      <summary>If you were paying API rates instead of a subscription</summary>
      <p class="muted">Long chat ≈ $${dollars(long.at(-1).cumulative)} versus
      $${dollars(split.at(-1).cumulative)} split. ${CONFIG.apiRates.note}.</p>
    </details>
    <p class="takeaway">Start a new chat when the topic changes. Attach the document once, in the
    chat that needs it.</p>`;

  const peak = long.at(-1).processed;
  const draw = (id, series, cls) => {
    const box = root.querySelector(id);
    for (const point of series) {
      const col = document.createElement('div');
      col.className = `col ${cls}`;
      col.style.height = `${(point.processed / peak) * 100}%`;
      col.title = `${point.processed.toLocaleString()} tokens processed this turn`;
      box.append(col);
    }
  };
  draw('#b-long', long, '');
  draw('#b-split', split, 'alt');
}
```

- [ ] **Step 6: Verify by hand**

Reload. The left chart should climb steadily; the right should saw-tooth back down every seven bars.
Both charts share the same vertical scale — confirm the right one never exceeds the left.

- [ ] **Step 7: Commit**

```bash
git add context-and-tokens.html dev/tests/
git commit -m "feat: per-turn resend chart comparing one long chat against split chats"
```

---

### Task 8: Demo 4 — lost in the middle

**Files:**
- Create: `dev/record-run.mjs`
- Modify: `context-and-tokens.html`

- [ ] **Step 1: Write the recording script**

Create `dev/record-run.mjs`:

```js
import { readFileSync, writeFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

const HTML_PATH = new URL('../context-and-tokens.html', import.meta.url);
const MODEL = 'claude-opus-4-8';
const DEPTHS = [0.1, 0.5, 0.9];
const NEEDLE = 'The access code for the Rotterdam warehouse is PELICAN-4471.';
const QUESTION = 'What is the access code for the Rotterdam warehouse? Answer with the code only.';

const filler = ('Quarterly logistics review. Freight volumes held steady across the northern corridor, ' +
  'with modest gains in refrigerated capacity and no material change to insurance exposure. ').repeat(600);

function documentWithNeedleAt(depth) {
  const cut = Math.floor(filler.length * depth);
  return filler.slice(0, cut) + '\n\n' + NEEDLE + '\n\n' + filler.slice(cut);
}

const client = new Anthropic();
const results = [];

for (const depth of DEPTHS) {
  const doc = documentWithNeedleAt(depth);
  const res = await client.messages.create({
    model: MODEL,
    max_tokens: 100,
    messages: [{ role: 'user', content: `${doc}\n\n${QUESTION}` }]
  });
  const answer = res.content.map(b => (b.type === 'text' ? b.text : '')).join('').trim();
  results.push({
    depth,
    answer,
    correct: answer.includes('PELICAN-4471'),
    inputTokens: res.usage.input_tokens
  });
  console.log(`depth ${depth}: ${answer}`);
}

const payload = {
  model: MODEL,
  capturedAt: new Date().toISOString().slice(0, 10),
  needle: NEEDLE,
  question: QUESTION,
  results
};

let html = readFileSync(HTML_PATH, 'utf8');
html = html.replace(
  /const RECORDED_RUN = [\s\S]*?\/\* RUN:INJECTED \*\//,
  `const RECORDED_RUN = ${JSON.stringify(payload)}; /* RUN:INJECTED */`
);
writeFileSync(HTML_PATH, html);
console.log('injected recorded run');
```

- [ ] **Step 2: Run it if API access is available**

Run: `$env:ANTHROPIC_API_KEY="sk-..."; npm run record:run`
Expected: three lines printed, then `injected recorded run`.

If no API access exists, skip this step — the next step's fallback covers it. Do not fabricate results.

- [ ] **Step 3: Implement `initHaystack` with a literature fallback**

```js
const LITERATURE_CURVE = {
  source: 'Liu et al., "Lost in the Middle: How Language Models Use Long Contexts" (2023)',
  points: [
    { depth: 0.0, accuracy: 0.75 },
    { depth: 0.25, accuracy: 0.56 },
    { depth: 0.5, accuracy: 0.52 },
    { depth: 0.75, accuracy: 0.58 },
    { depth: 1.0, accuracy: 0.72 }
  ]
};

function initHaystack(root) {
  if (!RECORDED_RUN) {
    root.innerHTML = `
      <p>Where a fact sits inside a long document changes how reliably the model finds it. Facts near
      the start or the end are recalled well; facts buried in the middle are recalled worst.</p>
      <div class="cols" id="h-curve"></div>
      <p class="muted">Accuracy by position, from published research: ${LITERATURE_CURVE.source}.
      No live model was called.</p>
      <p class="takeaway">Put your actual question first, and keep the material short enough that
      the answer is not buried.</p>`;
    const box = root.querySelector('#h-curve');
    for (const p of LITERATURE_CURVE.points) {
      const col = document.createElement('div');
      col.className = 'col';
      col.style.height = `${p.accuracy * 100}%`;
      col.title = `${Math.round(p.depth * 100)}% through the document: ${Math.round(p.accuracy * 100)}% recall`;
      box.append(col);
    }
    return;
  }

  root.innerHTML = `
    <p>One fact was hidden inside a long report, at three different depths, and the same question was
    asked each time.</p>
    <p class="muted">Recorded run · ${RECORDED_RUN.model} · ${RECORDED_RUN.capturedAt} ·
    ${RECORDED_RUN.results[0].inputTokens.toLocaleString()} input tokens per run. Not live.</p>
    <div class="presets" id="h-buttons"></div>
    <p><b>Question:</b> ${RECORDED_RUN.question}</p>
    <div id="h-answer" class="muted">Pick a position above.</div>
    <p class="takeaway">Put your actual question first, and keep the material short enough that the
    answer is not buried.</p>`;

  const answerEl = root.querySelector('#h-answer');
  for (const r of RECORDED_RUN.results) {
    const b = document.createElement('button');
    b.textContent = `buried ${Math.round(r.depth * 100)}% in`;
    b.onclick = () => {
      answerEl.innerHTML = `<b>${r.correct ? '✓ found it' : '✗ missed it'}</b><br>
        <span class="muted">Model answered:</span> ${r.answer.replace(/</g, '&lt;')}`;
    };
    root.querySelector('#h-buttons').append(b);
  }
}
```

- [ ] **Step 4: Verify by hand**

Reload. If a run was recorded, clicking each depth shows that run's real answer with a date label.
If not, the research curve renders with its citation. Neither path may claim to be live.

- [ ] **Step 5: Commit**

```bash
git add dev/record-run.mjs context-and-tokens.html
git commit -m "feat: lost-in-the-middle demo from a recorded run with research fallback"
```

---

### Task 8b: Optional live re-run panel (advanced, collapsed by default)

**Files:**
- Modify: `context-and-tokens.html`

This is the "paste your own key" path from the spec. It is collapsed, off by default, and never
required — the recorded run is what the room sees.

- [ ] **Step 1: Append the panel inside `initHaystack`**

Add just before the closing `}` of `initHaystack`, in both branches (extract into a helper called
from each):

```js
function appendLivePanel(root) {
  const wrap = document.createElement('details');
  wrap.innerHTML = `
    <summary>Advanced: re-run this live with your own API key</summary>
    <p class="muted"><b>Only do this on your own machine.</b> The key stays in this tab's memory,
    is never saved and never leaves your browser except in the request to Anthropic. Reloading the
    page clears it. Do not paste a shared or production key on a workshop laptop.</p>
    <input id="h-key" type="password" placeholder="sk-ant-..." autocomplete="off"
           style="width:100%;padding:10px;background:var(--pane);color:var(--fg);border:1px solid var(--line);border-radius:8px">
    <div class="presets"><button id="h-run">run all three depths</button></div>
    <div id="h-live" class="muted"></div>`;
  root.append(wrap);

  const out = wrap.querySelector('#h-live');
  wrap.querySelector('#h-run').onclick = async () => {
    const key = wrap.querySelector('#h-key').value.trim();
    if (!key) { out.textContent = 'Paste a key first.'; return; }
    out.textContent = 'Running…';
    const lines = [];
    for (const depth of [0.1, 0.5, 0.9]) {
      const doc = LIVE_FILLER.slice(0, Math.floor(LIVE_FILLER.length * depth)) +
        `\n\n${LIVE_NEEDLE}\n\n` + LIVE_FILLER.slice(Math.floor(LIVE_FILLER.length * depth));
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: 'claude-opus-4-8',
            max_tokens: 100,
            messages: [{ role: 'user', content: `${doc}\n\n${LIVE_QUESTION}` }]
          })
        });
        const json = await res.json();
        const answer = res.ok
          ? json.content.map(b => b.text || '').join('').trim()
          : `error ${res.status}: ${json.error?.message || 'request failed'}`;
        lines.push(`${Math.round(depth * 100)}% in → ${answer}`);
      } catch (err) {
        lines.push(`${Math.round(depth * 100)}% in → request failed: ${err.message}`);
      }
      out.textContent = lines.join('\n');
    }
  };
}
```

Add these constants next to `LITERATURE_CURVE`:

```js
const LIVE_NEEDLE = 'The access code for the Rotterdam warehouse is PELICAN-4471.';
const LIVE_QUESTION = 'What is the access code for the Rotterdam warehouse? Answer with the code only.';
const LIVE_FILLER = ('Quarterly logistics review. Freight volumes held steady across the northern ' +
  'corridor, with modest gains in refrigerated capacity and no material change to insurance exposure. ').repeat(600);
```

- [ ] **Step 2: Verify**

Reload, expand the panel, click run with an empty key — expect `Paste a key first.` Then click with a
deliberately wrong key — expect a visible `error 401` line rather than a silent failure.

- [ ] **Step 3: Confirm the key is not persisted**

In devtools, check `localStorage` and `sessionStorage` are empty after a run, and that reloading
clears the input.

- [ ] **Step 4: Commit**

```bash
git add context-and-tokens.html
git commit -m "feat: optional collapsed live re-run panel for demo 4"
```

---

### Task 9: In-page self-test, takeaways, and projector polish

**Files:**
- Modify: `context-and-tokens.html`

- [ ] **Step 1: Implement `runSelfTest`**

```js
function runSelfTest() {
  const checks = [];
  const ok = (name, pass, detail = '') => checks.push({ name, pass, detail });

  if (APPROXIMATE) {
    ok('tokenizer loaded', false, 'running in approximate mode');
  } else {
    ok('rank table size', RANKS.size > 99000, `${RANKS.size} ranks`);
    for (const v of TEST_VECTORS) {
      const got = encode(RANKS, v.text);
      ok(`vector ${JSON.stringify(v.text.slice(0, 24))}`,
         got.length === v.ids.length && got.every((id, i) => id === v.ids[i]));
    }
  }
  const packed = packContext({ windowTokens: 1000, systemTokens: 100, replyReserve: 200, attachments: [], turns: [300, 300, 300] });
  ok('window evicts oldest turn', packed.dropped.length === 1 && packed.dropped[0] === 0);
  const burn = burnSeries({ baseTokens: 0, turns: [{ in: 100, out: 200 }, { in: 100, out: 200 }] });
  ok('burn grows per turn', burn[1].processed > burn[0].processed);

  const failed = checks.filter(c => !c.pass);
  const strip = document.createElement('div');
  strip.style.cssText = 'position:fixed;left:0;right:0;bottom:0;padding:10px 16px;font:14px ui-monospace,monospace;' +
    `background:${failed.length ? '#5a1e1e' : '#1e4620'};color:#fff;z-index:9`;
  strip.textContent = failed.length
    ? `${failed.length} FAILED: ${failed.map(f => f.name).join(', ')}`
    : `all ${checks.length} checks passed`;
  document.body.append(strip);
}
```

- [ ] **Step 2: Verify the self-test**

Run: open `context-and-tokens.html?test=1`
Expected: a green strip pinned to the bottom reading `all N checks passed`.

- [ ] **Step 3: Add the takeaway strip and scroll dots**

Add before `</main>`:

```html
  <section id="s5"><h2>Four rules of thumb</h2>
    <ol>
      <li><b>New chat per topic.</b> Old turns are dead weight the model re-reads every time.</li>
      <li><b>Put the question first.</b> Buried questions get worse answers.</li>
      <li><b>Attach once.</b> Re-pasting the same document multiplies what gets processed.</li>
      <li><b>Shorter beats longer.</b> A tight prompt is faster, cheaper, and more accurate.</li>
    </ol>
  </section>
```

Add to `<style>`:

```css
  #dots { position:fixed; right:14px; top:50%; transform:translateY(-50%); display:flex; flex-direction:column; gap:10px; z-index:8; }
  #dots a { width:10px; height:10px; border-radius:50%; background:var(--line); }
  #dots a.on { background:var(--accent); }
  @media (max-width:760px) { #dots { display:none; } }
```

Add before `boot()`:

```js
const dots = document.createElement('nav');
dots.id = 'dots';
for (const s of document.querySelectorAll('section')) {
  const a = document.createElement('a');
  a.href = `#${s.id}`;
  a.title = s.querySelector('h2').textContent;
  dots.append(a);
}
document.body.append(dots);
const sections = [...document.querySelectorAll('section')];
const spy = new IntersectionObserver(entries => {
  for (const e of entries) {
    const i = sections.indexOf(e.target);
    if (i >= 0) dots.children[i].classList.toggle('on', e.isIntersecting);
  }
}, { rootMargin: '-40% 0px -40% 0px' });
sections.forEach(s => spy.observe(s));
```

- [ ] **Step 4: Commit**

```bash
git add context-and-tokens.html
git commit -m "feat: in-page self-test, takeaway rules, and scroll position dots"
```

---

### Task 10: Final verification pass

**Files:**
- Modify: `context-and-tokens.html` (fixes only)
- Create: `docs/workshop-checklist.md`

- [ ] **Step 1: Run the full unit suite**

Run: `npm test`
Expected: PASS, all tests green, 0 failures.

- [ ] **Step 2: Run the browser checklist**

Open `context-and-tokens.html?test=1` and confirm in each of Chrome, Firefox, and Edge:

1. Green self-test strip.
2. Section 1: `strawberry` preset splits into multiple chips.
3. Section 2: adding two PDFs plus turns visibly strikes through the oldest turns.
4. Section 3: right-hand chart saw-tooths and its total is lower than the left.
5. Section 4: recorded-run label shows a model and date, or the research citation shows.
6. No console errors.

Then confirm at 1280 px width (projector) and at 390 px width (phone) that no text is clipped and the
bar and charts still read clearly.

- [ ] **Step 3: Confirm it works from disk with no server**

Run: `start context-and-tokens.html` and repeat checks 1–3 above.
Expected: identical behaviour — this is the `file://` path an attendee may use.

- [ ] **Step 4: Write the workshop-day checklist**

Create `docs/workshop-checklist.md`:

```markdown
# Workshop day checklist

- [ ] Open `context-and-tokens.html?test=1` on the venue wifi. Green strip = the page is healthy.
- [ ] Confirm the hosted URL loads on a phone as well as a laptop.
- [ ] Re-run `npm run record:run` if the recorded run in section 4 is more than a few months old.
- [ ] Re-run `npm run build:vocab` only if the tokenizer needs regenerating; it rewrites the page in place.
- [ ] Numbers that go stale (prices, window size, model name) all live in the `CONFIG` block near the
      top of the page's `<script>`.
```

- [ ] **Step 5: Commit**

```bash
git add docs/workshop-checklist.md context-and-tokens.html
git commit -m "docs: workshop day checklist and final verification fixes"
```

---

## Self-Review Notes

Spec coverage checked task by task: story-scroll layout (Tasks 4, 9), tokenizer playground with
gotchas (Task 5), context meter with eviction and paste-your-own (Task 6), resend/quota burn with
collapsed dollar aside (Task 7), recorded lost-in-the-middle with honest labelling (Task 8),
`CONFIG` block for stale values (Task 4), `?test=1` harness and manual checklist (Tasks 9, 10),
debounce and paste cap (Tasks 5, 6), decode-failure fallback banner (Task 4).

The optional paste-your-own-API-key panel is Task 8b — collapsed, off by default, key held in memory
only. The recorded run from `dev/record-run.mjs` remains what the room actually sees; the live panel
is for one curious person on their own machine.

**Ordering note:** Tasks 1–3 must run in order (harness → vocabulary → tokenizer). Tasks 5–8 depend
only on Task 4 and each other's absence, so they can be worked in any order or in parallel.
