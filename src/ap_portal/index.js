'use strict';
// AP portal view helpers: render the aging summary returned by the ap_aging service as HTML.
const VERSION = '2.3.0';
const LABELS = { current: 'Current', '1-30': '1-30 days', '31-60': '31-60 days', '61-90': '61-90 days', '90+': 'Over 90 days' };

function formatAmount(value) {
  return Number(value || 0).toFixed(2);
}

function renderAgingSummary(buckets) {
  const rows = Object.keys(LABELS).map((k) => `<tr><td>${LABELS[k]}</td><td class="amount">${formatAmount(buckets[k])}</td></tr>`);
  return `<table class="aging-summary">${rows.join('')}</table>`;
}

// FEAT-ZD-48600 / STORY-07: overdue risk table (SC-1) rendered from the CT-1 rows that ap_aging serialises.
// Allow-list of row risk values; anything else renders as risk-unknown.
const RISK_CLASSES = ['high', 'medium', 'low', 'unknown'];
// Column headings, in order. Always "Days overdue", never "Late".
const OVERDUE_HEADINGS = ['Invoice', 'Vendor', 'Days overdue', 'Amount'];
// HTML entity for each character escapeHtml replaces.
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
// CT-1 amount: optional minus, digits, then at most two decimals. No exponent, no thousands separator.
const DECIMAL_STRING = /^-?\d+(\.\d{1,2})?$/;

// Escape &, <, >, " and ' so feed text cannot inject markup.
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPES[ch]);
}

// Two-decimal display done on the string only, so no amount ever passes through a binary float
// (D-2026-044). Never uses Number(), parseFloat or formatAmount. "980.5" -> "980.50", "980" -> "980.00".
// Throws TypeError for a non-string or a string with an exponent, separator or more than two decimals.
function toTwoDecimalString(value) {
  if (typeof value !== 'string' || !DECIMAL_STRING.test(value)) {
    throw new TypeError('amount must be a decimal string with at most two decimals');
  }
  const [whole, fraction = ''] = value.split('.');
  return `${whole}.${fraction.padEnd(2, '0')}`;
}

// Row class for a risk value: 'risk-<risk>' for a known value, else 'risk-unknown'.
function riskClass(risk) {
  return RISK_CLASSES.includes(risk) ? `risk-${risk}` : 'risk-unknown';
}

// Render CT-1 rows ({id, vendor, days, amount, risk}) as <table class="overdue-risk">.
// Returns '' when rows is undefined, null or []. Rows keep the given order (ap_aging sorts them).
// Risk is shown only as the row class; there is no risk text and no row action (advisory only).
// Throws TypeError when rows is not an array, days is not an integer or amount is not a decimal string.
function renderOverdueRisk(rows) {
  if (rows === undefined || rows === null) return '';
  if (!Array.isArray(rows)) throw new TypeError('rows must be an array of overdue rows');
  if (rows.length === 0) return '';
  const header = `<tr>${OVERDUE_HEADINGS.map((h) => `<th>${h}</th>`).join('')}</tr>`;
  const body = rows.map((row) => {
    if (!Number.isInteger(row.days)) throw new TypeError('days must be an integer');
    return `<tr class="${riskClass(row.risk)}"><td>${escapeHtml(row.id)}</td><td>${escapeHtml(row.vendor)}</td>`
      + `<td>${row.days}</td><td class="amount">${toTwoDecimalString(row.amount)}</td></tr>`;
  });
  return `<table class="overdue-risk">${header}${body.join('')}</table>`;
}

module.exports = { VERSION, LABELS, formatAmount, renderAgingSummary, renderOverdueRisk };
