/**
 * Logic tests: money helpers (pure, node:test — no browser).
 * Run instructions: apps/ui-harness/README.md ("Logic tests").
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatMoney, MAX_AMOUNT, parseMoney, validateItemName } from '../../src/surfaces/cost-control/money.js';

test('formatMoney is deterministic and locale-free', () => {
  assert.equal(formatMoney(1234, 'USD'), 'USD 1,234');
  assert.equal(formatMoney(0, 'USD'), 'USD 0');
  assert.equal(formatMoney(999999, 'USD'), 'USD 999,999');
  assert.equal(formatMoney(1234.5, 'USD'), 'USD 1,234.50');
  assert.equal(formatMoney(1234.567, 'USD'), 'USD 1,234.57');
  assert.equal(formatMoney(Number.NaN, 'USD'), 'USD —');
  // Phase 6 parity: integer amounts render exactly like the old formatter.
  assert.equal(formatMoney(120, 'USD'), 'USD 120');
});

test('parseMoney accepts plain and grouped decimals', () => {
  assert.deepEqual(parseMoney('1250'), { ok: true, value: 1250 });
  assert.deepEqual(parseMoney('1,250'), { ok: true, value: 1250 });
  assert.deepEqual(parseMoney(' 1,250.40 '), { ok: true, value: 1250.4 });
  assert.deepEqual(parseMoney('0'), { ok: true, value: 0 });
  assert.deepEqual(parseMoney('0.05'), { ok: true, value: 0.05 });
});

test('parseMoney rejects invalid, signed, and excessive amounts with messages', () => {
  for (const input of ['', '   ', 'abc', '-5', '+5', '1.234', '12,34', '1,2345', '1e3', '1250.', '.5']) {
    const result = parseMoney(input);
    assert.equal(result.ok, false, `expected rejection for "${input}"`);
    if (!result.ok) assert.ok(result.error.length > 0);
  }
  const tooBig = parseMoney(String(MAX_AMOUNT + 1));
  assert.equal(tooBig.ok, false);
});

test('validateItemName requires a non-empty trimmed name', () => {
  assert.equal(validateItemName('Vendor invoice'), null);
  assert.equal(validateItemName('  ok  '), null);
  assert.ok(validateItemName('') !== null);
  assert.ok(validateItemName('   ') !== null);
  assert.ok(validateItemName('x'.repeat(301)) !== null);
});
