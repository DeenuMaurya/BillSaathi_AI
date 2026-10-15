import { describe, expect, it } from 'vitest';
import Decimal from 'decimal.js';
import {
  MAX_STORABLE_MONEY,
  MoneyParseError,
  addMoney,
  assertNonNegative,
  assertStorable,
  compareMoney,
  formatINR,
  isNegativeMoney,
  isZeroMoney,
  subtractMoney,
  sumMoney,
  toDbMoney,
  toMoney,
  tryToMoney,
  withinTolerance,
} from '@/lib/money';

describe('float drift — the reason this module exists', () => {
  it('adds 0.1 + 0.2 to exactly 0.30', () => {
    // Plain JS gives 0.30000000000000004.
    expect(0.1 + 0.2).not.toBe(0.3);
    expect(toDbMoney(addMoney('0.10', '0.20'))).toBe('0.30');
  });

  it('sums one hundred paisa to exactly 1.00', () => {
    const paise = Array.from({ length: 100 }, () => '0.01');
    expect(toDbMoney(sumMoney(paise))).toBe('1.00');
  });

  it('keeps a large invoice total exact where float64 would drift', () => {
    // Near the numeric(14,2) ceiling, a float64 can no longer represent
    // hundredths exactly.
    const total = addMoney('99999999999.99', '0.01');
    expect(toDbMoney(total)).toBe('100000000000.00');
  });

  it('subtracts without residue', () => {
    expect(toDbMoney(subtractMoney('1000.00', '999.99'))).toBe('0.01');
  });

  it('agrees on equality for values a float comparison would split', () => {
    const viaSum = sumMoney(['0.07', '0.07', '0.07']);
    expect(compareMoney(viaSum, '0.21')).toBe(0);
  });
});

describe('toMoney parsing', () => {
  it('accepts a plain decimal string', () => {
    expect(toMoney('1234.56').toFixed(2)).toBe('1234.56');
  });

  it('strips Indian digit grouping', () => {
    expect(toDbMoney(toMoney('1,23,456.78'))).toBe('123456.78');
  });

  it('strips currency decorations', () => {
    expect(toDbMoney(toMoney('₹ 1,000.50'))).toBe('1000.50');
    expect(toDbMoney(toMoney('Rs. 2500'))).toBe('2500.00');
    expect(toDbMoney(toMoney('INR 99.99'))).toBe('99.99');
  });

  it('accepts a Decimal unchanged', () => {
    expect(toDbMoney(toMoney(new Decimal('42.10')))).toBe('42.10');
  });

  it('accepts extra input precision and rounds only at the boundary', () => {
    // OCR and spreadsheets produce these; they must not be rejected.
    expect(toDbMoney(toMoney('10.004'))).toBe('10.00');
    expect(toDbMoney(toMoney('10.005'))).toBe('10.01');
  });

  it('rejects values that are not money', () => {
    for (const bad of ['', '   ', 'abc', '1.2.3', '12-34', '1e5', '--5', '₹']) {
      expect(() => toMoney(bad)).toThrow(MoneyParseError);
    }
  });

  it('rejects non-finite numbers', () => {
    expect(() => toMoney(Number.NaN)).toThrow(MoneyParseError);
    expect(() => toMoney(Number.POSITIVE_INFINITY)).toThrow(MoneyParseError);
  });

  it('rejects more than twelve integer digits', () => {
    expect(() => toMoney('1234567890123')).toThrow(MoneyParseError);
  });

  it('tryToMoney returns null instead of throwing', () => {
    expect(tryToMoney('nonsense')).toBeNull();
    expect(tryToMoney(null)).toBeNull();
    expect(tryToMoney(undefined)).toBeNull();
    expect(tryToMoney('5.00')).not.toBeNull();
  });
});

describe('rounding', () => {
  it('rounds half away from zero', () => {
    expect(toDbMoney('0.005')).toBe('0.01');
    expect(toDbMoney('0.015')).toBe('0.02');
    expect(toDbMoney('-0.005')).toBe('-0.01');
  });
});

describe('range and sign guards', () => {
  it('accepts the maximum storable value', () => {
    expect(toDbMoney(assertStorable(MAX_STORABLE_MONEY))).toBe('999999999999.99');
  });

  it('rejects a value beyond numeric(14,2)', () => {
    expect(() => assertStorable('1000000000000.00')).toThrow(MoneyParseError);
  });

  it('allows negative amounts by default, for credit notes', () => {
    // docs/DATABASE.md is explicit that not every total is positive.
    expect(isNegativeMoney(toMoney('-500.00'))).toBe(true);
    expect(toDbMoney('-500.00')).toBe('-500.00');
  });

  it('rejects negatives only where a field requires it', () => {
    expect(() => assertNonNegative('-1.00', 'Taxable amount')).toThrow(
      /Taxable amount cannot be negative/,
    );
    expect(toDbMoney(assertNonNegative('0.00'))).toBe('0.00');
  });

  it('identifies zero', () => {
    expect(isZeroMoney('0')).toBe(true);
    expect(isZeroMoney('0.00')).toBe(true);
    expect(isZeroMoney('0.01')).toBe(false);
  });
});

describe('comparison', () => {
  it('orders values correctly', () => {
    expect(compareMoney('1.00', '2.00')).toBe(-1);
    expect(compareMoney('2.00', '1.00')).toBe(1);
    expect(compareMoney('2.00', '2.000')).toBe(0);
  });
});

describe('withinTolerance — GST round-off handling', () => {
  it('accepts a one-rupee round-off, as real invoices carry', () => {
    const components = sumMoney(['1000.00', '90.00', '90.00', '0.00', '0.00']);
    // Printed total is 1181 against components of 1180.
    expect(withinTolerance(components, '1181.00')).toBe(true);
  });

  it('flags a mismatch beyond tolerance', () => {
    expect(withinTolerance('1180.00', '1280.00')).toBe(false);
  });

  it('honours an explicit tolerance', () => {
    expect(withinTolerance('100.00', '100.50', '0.25')).toBe(false);
    expect(withinTolerance('100.00', '100.20', '0.25')).toBe(true);
  });
});

describe('formatINR', () => {
  it('uses Indian digit grouping', () => {
    // en-IN groups as 1,23,456.78 rather than 123,456.78.
    const formatted = formatINR('123456.78', { withSymbol: false });
    expect(formatted).toBe('1,23,456.78');
  });

  it('includes the rupee symbol by default', () => {
    expect(formatINR('1000.00')).toContain('1,000.00');
    expect(formatINR('1000.00')).toMatch(/₹/);
  });

  it('always shows two decimal places', () => {
    expect(formatINR('5', { withSymbol: false })).toBe('5.00');
  });
});
