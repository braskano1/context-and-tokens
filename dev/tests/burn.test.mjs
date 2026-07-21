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
