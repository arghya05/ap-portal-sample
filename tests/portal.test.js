'use strict';
const test = require('node:test');
const assert = require('node:assert');
const portal = require('ap_portal');

test('formats amounts with two decimals', () => {
  assert.strictEqual(portal.formatAmount(12), '12.00');
  assert.strictEqual(portal.formatAmount(undefined), '0.00');
});

test('renders every bucket in order', () => {
  const html = portal.renderAgingSummary({ current: 10, '90+': 5 });
  assert.ok(html.startsWith('<table class="aging-summary">'));
  assert.ok(html.indexOf('Current') < html.indexOf('Over 90 days'));
  assert.ok(html.includes('<td class="amount">5.00</td>'));
});

// FEAT-ZD-48600 / STORY-07: renderOverdueRisk (AC-07.1 to AC-07.10). Synthetic data only.
const HEADER = '<tr><th>Invoice</th><th>Vendor</th><th>Days overdue</th><th>Amount</th></tr>';
const row = (overrides) => ({ id: 'SYN-INV-001', vendor: 'Synthetic Vendor A', days: 31, amount: '15.00', risk: 'high', ...overrides });
const AMOUNT_ERROR = { name: 'TypeError', message: 'amount must be a decimal string with at most two decimals' };
const DAYS_ERROR = { name: 'TypeError', message: 'days must be an integer' };
const ROWS_ERROR = { name: 'TypeError', message: 'rows must be an array of overdue rows' };

test('AC-07.1: renders the overdue risk table with one row per input row in the given order', () => {
  // Fewer days first, the reverse of the ap_aging sort, so any re-sort would change the output.
  const html = portal.renderOverdueRisk([
    row({ id: 'SYN-INV-001', vendor: 'Synthetic Vendor A', days: 31, amount: '15.00', risk: 'high' }),
    row({ id: 'SYN-INV-002', vendor: 'Synthetic Vendor B', days: 42, amount: '1250.00', risk: 'medium' }),
  ]);
  assert.strictEqual(html, '<table class="overdue-risk">' + HEADER
    + '<tr class="risk-high"><td>SYN-INV-001</td><td>Synthetic Vendor A</td><td>31</td><td class="amount">15.00</td></tr>'
    + '<tr class="risk-medium"><td>SYN-INV-002</td><td>Synthetic Vendor B</td><td>42</td><td class="amount">1250.00</td></tr>'
    + '</table>');
});

test('AC-07.2: header row has the four headings, no row class and no thead or tbody', () => {
  const html = portal.renderOverdueRisk([row()]);
  assert.ok(html.startsWith(`<table class="overdue-risk">${HEADER}`));
  assert.ok(html.includes('Days overdue'));
  assert.ok(!html.includes('Late'));
  assert.ok(!html.includes('<thead') && !html.includes('<tbody'));
});

test('AC-07.3: each known risk value becomes its row class', () => {
  for (const risk of ['high', 'medium', 'low', 'unknown']) {
    assert.ok(portal.renderOverdueRisk([row({ risk })]).includes(`<tr class="risk-${risk}">`), risk);
  }
});

test('AC-07.4: no rows renders an empty string', () => {
  assert.strictEqual(portal.renderOverdueRisk([]), '');
  assert.strictEqual(portal.renderOverdueRisk(), '');
  assert.strictEqual(portal.renderOverdueRisk(undefined), '');
  assert.strictEqual(portal.renderOverdueRisk(null), '');
});

test('AC-07.5: two-decimal amount strings are shown unchanged, beyond Number precision', () => {
  const big = '12345678901234567890.12';
  assert.notStrictEqual(Number(big).toFixed(2), big);
  for (const amount of ['1250.00', '15.00', big]) {
    assert.ok(portal.renderOverdueRisk([row({ amount })]).includes(`<td class="amount">${amount}</td>`), amount);
  }
});

test('AC-07.6: shorter amount strings are padded to two decimals as strings', () => {
  assert.ok(portal.renderOverdueRisk([row({ amount: '980.5' })]).includes('<td class="amount">980.50</td>'));
  assert.ok(portal.renderOverdueRisk([row({ amount: '980' })]).includes('<td class="amount">980.00</td>'));
});

test('AC-07.7: id and vendor text is HTML-escaped', () => {
  const html = portal.renderOverdueRisk([row({ id: 'SYN-INV-<1>', vendor: 'Synthetic "Vendor" & \'Co\' <b>' })]);
  assert.ok(html.includes('<td>SYN-INV-&lt;1&gt;</td>'));
  assert.ok(html.includes('<td>Synthetic &quot;Vendor&quot; &amp; &#39;Co&#39; &lt;b&gt;</td>'));
  assert.ok(!html.includes('<b>'));
});

test('AC-07.8: an unexpected risk value renders as risk-unknown', () => {
  for (const risk of ['critical', 'HIGH', '', undefined, null, '"><script>']) {
    const html = portal.renderOverdueRisk([row({ risk })]);
    assert.ok(html.includes('<tr class="risk-unknown">'), String(risk));
    assert.ok(!html.includes('<script>'));
  }
});

test('AC-07.9: no risk column, risk text or row action', () => {
  const html = portal.renderOverdueRisk([row({ risk: 'high' }), row({ id: 'SYN-INV-003', risk: 'low' })]);
  const text = html.replace(/<[^>]*>/g, ' ');
  assert.ok(!/risk|high|low/i.test(text));
  assert.strictEqual((html.match(/<th>/g) || []).length, 4);
  assert.ok(!/<(button|a|input|form)\b/i.test(html));
  assert.ok(!/\b(pay|post|approve|chase)\b/i.test(text));
});

test('AC-07.10: renderOverdueRisk is exported next to the unchanged exports; helpers stay private', () => {
  assert.deepStrictEqual(Object.keys(portal).sort(),
    ['LABELS', 'VERSION', 'formatAmount', 'renderAgingSummary', 'renderOverdueRisk']);
  assert.strictEqual(typeof portal.renderOverdueRisk, 'function');
});

test('rows that are not an array throw TypeError', () => {
  for (const rows of ['SYN-INV-001', 42, {}, { length: 1 }, true]) {
    assert.throws(() => portal.renderOverdueRisk(rows), ROWS_ERROR);
  }
});

test('days that are not an integer throw TypeError', () => {
  for (const days of [30.5, '31', undefined, null, NaN, Infinity]) {
    assert.throws(() => portal.renderOverdueRisk([row({ days })]), DAYS_ERROR);
  }
});

test('amounts that are not a decimal string with at most two decimals throw TypeError', () => {
  for (const amount of ['1e3', '1.25e3', '1,250.00', '1250.001', '', '.50', '12.', 'abc', ' 15.00', 1250, null, undefined]) {
    assert.throws(() => portal.renderOverdueRisk([row({ amount })]), AMOUNT_ERROR);
  }
});
