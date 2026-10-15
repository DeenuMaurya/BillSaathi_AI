import Decimal from 'decimal.js';

/**
 * Decimal-safe money handling.
 *
 * WHY THIS MODULE EXISTS
 *
 * Storing money as PostgreSQL `numeric(14,2)` is necessary but not sufficient.
 * PostgREST serialises `numeric` as an *unquoted JSON number*, so by the time a
 * row reaches JavaScript, `JSON.parse` has already turned it into a float64 --
 * and 0.01 has no exact binary representation. Summing a few hundred invoice
 * lines in plain JS arithmetic therefore drifts, and reconciliation balances
 * that must agree to the paisa stop agreeing.
 *
 * Two rules follow, and both are load-bearing:
 *
 *   1. Select money columns as text (`amount::text`) so the exact decimal
 *      string survives the trip, and parse it here.
 *   2. Never apply a bare `+ - * /` to a currency value anywhere in the app.
 *      Use this module.
 *
 * Authoritative balance arithmetic additionally happens inside SQL (see the
 * reconciliation RPC in migration 0009), because only the database can hold a
 * row lock while it checks. This module covers validation, presentation and
 * non-authoritative client-side totals.
 *
 * Reference: docs/DATABASE.md section 5, docs/SECURITY.md section 7.
 */

/** Scale of `numeric(14,2)`: two decimal places, i.e. paisa. */
export const MONEY_SCALE = 2;

/**
 * Largest value storable in `numeric(14,2)` -- precision 14 minus scale 2
 * leaves 12 integer digits. Checked explicitly so an out-of-range amount is
 * rejected with a clear message instead of a raw database error.
 */
export const MAX_STORABLE_MONEY = '999999999999.99';

/** Rounding applied at the storage and display boundary. */
const MONEY_ROUNDING = Decimal.ROUND_HALF_UP;

/**
 * Input precision cap. OCR and spreadsheets routinely produce more than two
 * decimal places; those are accepted here and rounded at the boundary rather
 * than rejected, but a value with absurd precision is a parsing failure.
 */
const MONEY_PATTERN = /^-?\d{1,12}(\.\d{1,6})?$/;

export type MoneyInput = string | number | Decimal;

/** Thrown when a value cannot be interpreted as money. Safe to surface. */
export class MoneyParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MoneyParseError';
  }
}

/**
 * Strips the decorations that real-world money strings arrive with: rupee
 * symbol, thousands separators (including the Indian 1,23,456.78 grouping,
 * which this handles because every comma is simply removed) and whitespace.
 */
function normalizeMoneyString(raw: string): string {
  return raw
    .trim()
    .replace(/^(?:INR|Rs\.?|₹)\s*/i, '')
    .replace(/,/g, '')
    .replace(/\s+/g, '');
}

/**
 * Parses untrusted input into a Decimal. Throws MoneyParseError on failure.
 *
 * Accepts `number` for the sake of literals in code and legacy JSON payloads,
 * but see the module note: a float that has already been through arithmetic may
 * arrive pre-corrupted, and no parser can recover the intended value.
 */
export function toMoney(input: MoneyInput): Decimal {
  if (input instanceof Decimal) {
    if (!input.isFinite()) {
      throw new MoneyParseError('Amount must be a finite number.');
    }
    return input;
  }

  if (typeof input === 'number') {
    if (!Number.isFinite(input)) {
      throw new MoneyParseError('Amount must be a finite number.');
    }
    // String(number) yields the shortest round-tripping decimal form, which is
    // the closest honest reading of the float we were handed.
    return toMoney(String(input));
  }

  const normalized = normalizeMoneyString(input);

  if (normalized === '') {
    throw new MoneyParseError('Amount is required.');
  }

  if (!MONEY_PATTERN.test(normalized)) {
    throw new MoneyParseError(
      'Amount must be a number with up to 12 digits and 6 decimal places.',
    );
  }

  return new Decimal(normalized);
}

/** Non-throwing variant. Returns null when the value is not valid money. */
export function tryToMoney(input: MoneyInput | null | undefined): Decimal | null {
  if (input === null || input === undefined) return null;

  try {
    return toMoney(input);
  } catch {
    return null;
  }
}

export function addMoney(a: MoneyInput, b: MoneyInput): Decimal {
  return toMoney(a).plus(toMoney(b));
}

export function subtractMoney(a: MoneyInput, b: MoneyInput): Decimal {
  return toMoney(a).minus(toMoney(b));
}

/** Sums a list at full intermediate precision; rounds only at the boundary. */
export function sumMoney(values: readonly MoneyInput[]): Decimal {
  return values.reduce<Decimal>((total, value) => total.plus(toMoney(value)), new Decimal(0));
}

/** Returns -1, 0 or 1. Use instead of `<` / `===` on money values. */
export function compareMoney(a: MoneyInput, b: MoneyInput): -1 | 0 | 1 {
  return toMoney(a).cmp(toMoney(b)) as -1 | 0 | 1;
}

export function isZeroMoney(value: MoneyInput): boolean {
  return toMoney(value).isZero();
}

export function isNegativeMoney(value: MoneyInput): boolean {
  return toMoney(value).isNegative();
}

/**
 * Rejects negative amounts.
 *
 * Applied per field rather than globally: docs/DATABASE.md is explicit that
 * credit notes and corrections legitimately carry negative totals, so a blanket
 * non-negative rule across every money column would be wrong.
 */
export function assertNonNegative(value: MoneyInput, fieldName = 'Amount'): Decimal {
  const amount = toMoney(value);

  if (amount.isNegative()) {
    throw new MoneyParseError(`${fieldName} cannot be negative.`);
  }

  return amount;
}

/** Rejects amounts outside the range `numeric(14,2)` can hold. */
export function assertStorable(value: MoneyInput, fieldName = 'Amount'): Decimal {
  const amount = toMoney(value);

  if (amount.abs().greaterThan(new Decimal(MAX_STORABLE_MONEY))) {
    throw new MoneyParseError(`${fieldName} exceeds the maximum supported value.`);
  }

  return amount;
}

/**
 * Serialises for the database: a fixed two-decimal string, never a float.
 *
 * Passing the string form to PostgreSQL means the value we computed is the
 * value that gets stored, with no float64 round trip in between.
 */
export function toDbMoney(value: MoneyInput): string {
  return assertStorable(value).toFixed(MONEY_SCALE, MONEY_ROUNDING);
}

/**
 * Formats for display using Indian digit grouping (1,23,456.78).
 *
 * Intl receives an already-rounded fixed-point string, so the float conversion
 * on the last line cannot introduce drift into a displayed figure.
 */
export function formatINR(
  value: MoneyInput,
  options: { withSymbol?: boolean } = {},
): string {
  const { withSymbol = true } = options;
  const fixed = toDbMoney(value);

  return new Intl.NumberFormat('en-IN', {
    style: withSymbol ? 'currency' : 'decimal',
    currency: 'INR',
    minimumFractionDigits: MONEY_SCALE,
    maximumFractionDigits: MONEY_SCALE,
  }).format(Number(fixed));
}

/**
 * True when |a - b| <= tolerance.
 *
 * Needed because real GST invoices carry explicit round-off lines, so
 * `taxable + cgst + sgst + igst + cess` frequently misses `total` by a rupee or
 * less. The review UI warns on a mismatch; it must never silently "correct" a
 * figure, which would amount to inventing a value (docs/SECURITY.md section 6).
 */
export function withinTolerance(
  a: MoneyInput,
  b: MoneyInput,
  tolerance: MoneyInput = '1.00',
): boolean {
  return toMoney(a).minus(toMoney(b)).abs().lessThanOrEqualTo(toMoney(tolerance));
}
