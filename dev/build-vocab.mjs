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
