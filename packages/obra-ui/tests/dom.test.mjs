import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cx, debounce } from '../dist/utilities/dom.js';

test('cx joins only truthy parts', () => {
  assert.equal(cx('a', false, 'b', null, undefined, 'c'), 'a b c');
});

test('debounce collapses rapid calls', async () => {
  let calls = 0;
  const fn = debounce(() => { calls++; }, 20);
  fn(); fn(); fn();
  assert.equal(calls, 0);
  await new Promise((r) => setTimeout(r, 40));
  assert.equal(calls, 1);
});
