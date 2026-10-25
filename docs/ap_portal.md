# ap_portal module overview

`src/ap_portal/index.js` holds pure view helpers. Each takes plain values and returns an HTML string. There is no I/O, no stylesheet and no transport layer in this repository: the caller passes in already parsed data and places the returned HTML on its page.

| Export | Kind | Purpose |
|---|---|---|
| `VERSION` | string | Package version (kept in step with `package.json`) |
| `LABELS` | object | Aging bucket key → display label |
| `formatAmount(value)` | function | Two-decimal text for the aging summary (unchanged) |
| `renderAgingSummary(buckets)` | function | Aging summary table (unchanged) |
| `renderOverdueRisk(rows)` | function | Overdue risk table SC-1 (FEAT-ZD-48600, STORY-07) |

## renderAgingSummary(buckets)

- **Input:** an object of aging bucket totals keyed by `current`, `1-30`, `31-60`, `61-90`, `90+`.
- **Output:** `<table class="aging-summary">` with one row per bucket in `LABELS` order. The amount cell has `class="amount"`.

## renderOverdueRisk(rows)

Renders the unpaid invoices that are more than 30 days past due, each row marked with its vendor's risk level. The risk level is advisory only. It appears as the row class and nowhere else: there is no Risk column, no risk text and no row action.

**Signature:** `renderOverdueRisk(rows) -> string`

**Input:** `rows` is the parsed CT-1 payload from ap_aging (`overdue_rows_to_json`), an array of objects:

| Field | Type | Rendered as |
|---|---|---|
| `id` | string | Invoice cell, HTML-escaped |
| `vendor` | string | Vendor cell, HTML-escaped |
| `days` | integer | Days overdue cell |
| `amount` | decimal string, at most two decimals | Amount cell (`class="amount"`), padded to two decimals as a string |
| `risk` | `high`, `medium`, `low` or `unknown` | Row class `risk-<risk>`; any other value gives `risk-unknown` |

**Output:**

- `''` when `rows` is `undefined`, `null` or `[]` (no table, header or message).
- Otherwise `<table class="overdue-risk">`, then a header row `<tr><th>Invoice</th><th>Vendor</th><th>Days overdue</th><th>Amount</th></tr>`, then one `<tr class="risk-…">` per row in the order given, then `</table>`. The rows are not re-sorted: ap_aging already sorts them by days descending, then id ascending.

**Errors (contract violations are raised, not hidden):**

| Case | Result |
|---|---|
| `rows` is present but not an array (for example the unparsed JSON string) | `TypeError` |
| `days` is not an integer | `TypeError` |
| `amount` is not a string, or has an exponent, a thousands separator or more than two decimals (`1250`, `"1e3"`, `"1,250.00"`, `"1.234"`) | `TypeError` |

**Money rule:** amounts are never converted to a JavaScript number. The function does not call `Number()`, `parseFloat` or `formatAmount`, so a CT-1 amount string is shown digit for digit (decision D-2026-044).

**Escaping:** `&`, `<`, `>`, `"` and `'` in `id` and `vendor` become `&amp;`, `&lt;`, `&gt;`, `&quot;` and `&#39;`.

**Example** (synthetic data):

```js
const { renderOverdueRisk } = require('ap_portal');

const rows = JSON.parse(payload); // CT-1 string from ap_aging overdue_rows_to_json
// [{"id": "SYN-INV-004", "vendor": "Synthetic Vendor A", "days": 75, "amount": "1250.00", "risk": "high"},
//  {"id": "SYN-INV-002", "vendor": "Synthetic Vendor B", "days": 42, "amount": "980.5", "risk": "medium"}]
renderOverdueRisk(rows);
// '<table class="overdue-risk"><tr><th>Invoice</th><th>Vendor</th><th>Days overdue</th><th>Amount</th></tr>'
// + '<tr class="risk-high"><td>SYN-INV-004</td><td>Synthetic Vendor A</td><td>75</td><td class="amount">1250.00</td></tr>'
// + '<tr class="risk-medium"><td>SYN-INV-002</td><td>Synthetic Vendor B</td><td>42</td><td class="amount">980.50</td></tr>'
// + '</table>'

renderOverdueRisk([]); // ''
```

**Styling:** the component emits only the class hooks `overdue-risk`, `risk-high`, `risk-medium`, `risk-low`, `risk-unknown` and `amount`. It sets no inline style. The design library does not yet define any tokens for these classes.

### Private helpers (not exported)

| Helper | Behaviour |
|---|---|
| `escapeHtml(value)` | `String(value)` with the five HTML characters escaped |
| `toTwoDecimalString(value)` | Checks `value` against `^-?\d+(\.\d{1,2})?$` and pads the fraction to two digits as a string; otherwise `TypeError` |
| `riskClass(risk)` | `'risk-' + risk` for a value in `RISK_CLASSES`, else `'risk-unknown'` |

Constants: `RISK_CLASSES = ['high', 'medium', 'low', 'unknown']`, `OVERDUE_HEADINGS = ['Invoice', 'Vendor', 'Days overdue', 'Amount']`.
