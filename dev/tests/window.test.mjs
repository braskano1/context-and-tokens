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
