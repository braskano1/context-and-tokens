import { readFileSync, writeFileSync } from 'node:fs';
import Anthropic from '@anthropic-ai/sdk';

const HTML_PATH = new URL('../index.html', import.meta.url);
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

function replaceOrThrow(html, pattern, replacement, markerName) {
  if (!pattern.test(html)) {
    throw new Error(`injection failed: marker ${markerName} not found in index.html`);
  }
  return html.replace(pattern, replacement);
}

let html = readFileSync(HTML_PATH, 'utf8');
html = replaceOrThrow(
  html,
  /const RECORDED_RUN = [\s\S]*?\/\* RUN:INJECTED \*\//,
  `const RECORDED_RUN = ${JSON.stringify(payload)}; /* RUN:INJECTED */`,
  'RUN:INJECTED'
);
writeFileSync(HTML_PATH, html);
console.log('injected recorded run');
