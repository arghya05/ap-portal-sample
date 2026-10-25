# ap_portal

AP portal view helpers (Node). Run CI: `node ci.mjs`

## Functions

| Function | Returns |
|---|---|
| `renderAgingSummary(buckets)` | `<table class="aging-summary">` with one row per aging bucket |
| `formatAmount(value)` | Two-decimal text used by the aging summary |
| `renderOverdueRisk(rows)` | `<table class="overdue-risk">` of overdue invoices, one `risk-high`/`risk-medium`/`risk-low`/`risk-unknown` row per CT-1 row; `''` when there are no rows |

`renderOverdueRisk` takes the parsed CT-1 JSON from ap_aging (`{id, vendor, days, amount, risk}` rows). It escapes `id` and `vendor`, keeps `amount` as a string (never a float) and throws `TypeError` on a contract violation. See [docs/ap_portal.md](docs/ap_portal.md) for inputs, outputs, errors and examples.
