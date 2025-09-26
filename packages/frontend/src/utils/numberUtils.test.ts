import { formatNumber, formatCurrency, parseNumberToFixed, getNumericInputProps } from './numberUtils';

describe('numberUtils', () => {
  describe('formatNumber', () => {
    it('should format numbers with 2 decimal places by default', () => {
      expect(formatNumber(1234.5678)).toBe('1,234.57');
      expect(formatNumber(1234)).toBe('1,234.00');
      expect(formatNumber(1234.5)).toBe('1,234.50');
    });

    it('should handle zero correctly', () => {
      expect(formatNumber(0)).toBe('0.00');
    });

    it('should handle negative numbers correctly', () => {
      expect(formatNumber(-1234.56)).toBe('-1,234.56');
    });

    it('should handle custom fraction digits', () => {
      expect(formatNumber(1234.5678, { minimumFractionDigits: 3, maximumFractionDigits: 3 })).toBe('1,234.568');
    });

    it('should handle undefined or null values', () => {
      expect(formatNumber(undefined as unknown as number)).toBe('');
      expect(formatNumber(null as unknown as number)).toBe('');
    });
  });

  describe('formatCurrency', () => {
    it('should format currency with 2 decimal places by default', () => {
      expect(formatCurrency(1234.5678, 'EGP')).toBe('1,234.57 EGP');
      expect(formatCurrency(1234, 'GBP')).toBe('1,234.00 GBP');
    });

    it('should handle zero correctly', () => {
      expect(formatCurrency(0, 'EGP')).toBe('0.00 EGP');
    });

    it('should handle undefined or null values', () => {
      expect(formatCurrency(undefined as unknown as number, 'EGP')).toBe('');
      expect(formatCurrency(null as unknown as number, 'EGP')).toBe('');
    });
  });

  describe('parseNumberToFixed', () => {
    it('should parse string to number with 2 decimal places', () => {
      expect(parseNumberToFixed('1234.5678')).toBe(1234.57);
      expect(parseNumberToFixed('1234')).toBe(1234);
      expect(parseNumberToFixed('1234.5')).toBe(1234.5);
    });

    it('should handle invalid input', () => {
      expect(parseNumberToFixed('abc')).toBe(0);
      expect(parseNumberToFixed('')).toBe(0);
    });
  });

  describe('getNumericInputProps', () => {
    it('should return input props with step 0.01', () => {
      expect(getNumericInputProps()).toEqual({ step: 0.01 });
    });

    it('should include min value when provided', () => {
      expect(getNumericInputProps(5)).toEqual({ step: 0.01, min: 5 });
    });

    it('should include max value when provided', () => {
      expect(getNumericInputProps(undefined, 10)).toEqual({ step: 0.01, max: 10 });
    });

    it('should include both min and max when provided', () => {
      expect(getNumericInputProps(5, 10)).toEqual({ step: 0.01, min: 5, max: 10 });
    });
  });
});
