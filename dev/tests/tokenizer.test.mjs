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
