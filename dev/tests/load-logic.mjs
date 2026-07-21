import { readFileSync } from 'node:fs';

const HTML = new URL('../../context-and-tokens.html', import.meta.url);

export function loadLogic() {
  const html = readFileSync(HTML, 'utf8');
  const match = html.match(/\/\* LOGIC:START \*\/([\s\S]*?)\/\* LOGIC:END \*\//);
  if (!match) throw new Error('LOGIC block not found in context-and-tokens.html');
  let factory;
  try {
    factory = new Function(`${match[1]}
    return { VOCAB_B64, TEST_VECTORS, RECORDED_RUN, sum };`);
  } catch (err) {
    throw new Error('LOGIC block in context-and-tokens.html has a syntax error', { cause: err });
  }
  return factory();
}
