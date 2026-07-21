import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLogic } from './load-logic.mjs';

test('logic block is extractable and exports sum', () => {
  const logic = loadLogic();
  assert.equal(typeof logic.sum, 'function');
  assert.equal(logic.sum([1, 2, 3]), 6);
});
