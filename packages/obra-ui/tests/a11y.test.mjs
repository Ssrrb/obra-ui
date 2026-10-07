import { test } from 'node:test';
import assert from 'node:assert/strict';
import { rovingIndex } from '../dist/foundations/a11y.js';

test('rovingIndex moves forward and wraps (horizontal)', () => {
  assert.equal(rovingIndex('ArrowRight', 0, 3, 'horizontal'), 1);
  assert.equal(rovingIndex('ArrowRight', 2, 3, 'horizontal'), 0); // wrap
});

test('rovingIndex moves backward and wraps', () => {
  assert.equal(rovingIndex('ArrowLeft', 0, 3, 'horizontal'), 2);
  assert.equal(rovingIndex('ArrowUp', 1, 3, 'vertical'), 0);
});

test('rovingIndex Home/End', () => {
  assert.equal(rovingIndex('Home', 2, 5, 'both'), 0);
  assert.equal(rovingIndex('End', 0, 5, 'both'), 4);
});

test('rovingIndex does not wrap when disabled', () => {
  assert.equal(rovingIndex('ArrowRight', 2, 3, 'horizontal', false), 2);
  assert.equal(rovingIndex('ArrowLeft', 0, 3, 'horizontal', false), 0);
});

test('rovingIndex ignores unrelated keys', () => {
  assert.equal(rovingIndex('a', 0, 3, 'both'), -1);
});

test('vertical direction ignores horizontal arrows', () => {
  assert.equal(rovingIndex('ArrowRight', 0, 3, 'vertical'), -1);
});
