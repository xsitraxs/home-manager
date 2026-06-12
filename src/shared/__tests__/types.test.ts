import { describe, it, expect } from 'vitest';
import { validateString, validateNumber, validateId, safeInt } from '../types';

describe('validateString', () => {
  it('rejects non-string input', () => {
    expect(() => validateString(123)).toThrow('Expected string');
    expect(() => validateString(null)).toThrow('Expected string');
    expect(() => validateString(undefined)).toThrow('Expected string');
    expect(() => validateString({})).toThrow('Expected string');
  });

  it('rejects empty string', () => {
    expect(() => validateString('')).toThrow('String cannot be empty');
  });

  it('rejects whitespace-only string', () => {
    expect(() => validateString('   ')).toThrow('String cannot be empty');
  });

  it('trims whitespace', () => {
    expect(validateString('  hello  ')).toBe('hello');
  });

  it('rejects string exceeding maxLength', () => {
    expect(() => validateString('a'.repeat(51), 50)).toThrow('String exceeds 50 chars');
  });

  it('accepts string at exact maxLength', () => {
    expect(validateString('a'.repeat(50), 50)).toBe('a'.repeat(50));
  });

  it('uses default maxLength of 100', () => {
    expect(validateString('a'.repeat(100))).toBe('a'.repeat(100));
    expect(() => validateString('a'.repeat(101))).toThrow('String exceeds 100 chars');
  });

  it('accepts valid string', () => {
    expect(validateString('Мыть посуду')).toBe('Мыть посуду');
  });
});

describe('validateNumber', () => {
  it('rejects NaN', () => {
    expect(() => validateNumber('abc', 0, 100)).toThrow('Expected finite number');
    expect(() => validateNumber(NaN, 0, 100)).toThrow('Expected finite number');
  });

  it('rejects Infinity', () => {
    expect(() => validateNumber(Infinity, 0, 100)).toThrow('Expected finite number');
    expect(() => validateNumber(-Infinity, 0, 100)).toThrow('Expected finite number');
  });

  it('rejects value below min', () => {
    expect(() => validateNumber(0, 1, 100)).toThrow('Number must be between 1 and 100');
  });

  it('rejects value above max', () => {
    expect(() => validateNumber(101, 1, 100)).toThrow('Number must be between 1 and 100');
  });

  it('accepts exact min boundary', () => {
    expect(validateNumber(1, 1, 100)).toBe(1);
  });

  it('accepts exact max boundary', () => {
    expect(validateNumber(100, 1, 100)).toBe(100);
  });

  it('accepts string-encoded number', () => {
    expect(validateNumber('42', 0, 100)).toBe(42);
  });

  it('accepts valid number', () => {
    expect(validateNumber(50, 0, 100)).toBe(50);
  });
});

describe('validateId', () => {
  it('rejects zero', () => {
    expect(() => validateId(0)).toThrow();
  });

  it('rejects negative numbers', () => {
    expect(() => validateId(-1)).toThrow();
  });

  it('rejects non-numeric input', () => {
    expect(() => validateId('abc')).toThrow();
  });

  it('accepts exactly 1', () => {
    expect(validateId(1)).toBe(1);
  });

  it('accepts large valid ID', () => {
    expect(validateId(999999)).toBe(999999);
  });
});

describe('safeInt', () => {
  it('returns fallback for undefined', () => {
    expect(safeInt(undefined, 42)).toBe(42);
  });

  it('returns fallback for empty string', () => {
    expect(safeInt('', 42)).toBe(42);
  });

  it('returns fallback for non-numeric string', () => {
    expect(safeInt('abc', 42)).toBe(42);
  });

  it('parses valid numeric string', () => {
    expect(safeInt('100', 42)).toBe(100);
  });

  it('parses "0" as valid', () => {
    expect(safeInt('0', 42)).toBe(0);
  });

  it('parses float string via parseInt', () => {
    expect(safeInt('3.14', 42)).toBe(3);
  });

  it('parses negative string', () => {
    expect(safeInt('-5', 42)).toBe(-5);
  });
});
