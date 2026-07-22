import { readFileSync } from 'node:fs';

const HTML = new URL('../../index.html', import.meta.url);

export function loadLogic() {
  const html = readFileSync(HTML, 'utf8');
  const match = html.match(/\/\* LOGIC:START \*\/([\s\S]*?)\/\* LOGIC:END \*\//);
  if (!match) throw new Error('LOGIC block not found in index.html');
  let factory;
  try {
    factory = new Function(`${match[1]}
    return { VOCAB_B64, TEST_VECTORS, RECORDED_RUN, sum,
      loadRanks, encode, encodeDetailed, heuristicCount, buildRanks, bpeMerge, packContext,
      burnSeries, splitChats };`);
  } catch (err) {
    throw new Error('LOGIC block in index.html has a syntax error', { cause: err });
  }
  return factory();
}
