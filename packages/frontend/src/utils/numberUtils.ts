/**
 * Format a number with 2 decimal places
 * @param value The number to format
 * @param options Additional formatting options
 * @returns Formatted string with 2 decimal places
 */
export function formatNumber(value: number, options: {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  locale?: string;
} = {}): string {
  if (value === undefined || value === null) {
    return '';
  }
  
  const {
    minimumFractionDigits = 2,
    maximumFractionDigits = 2,
    locale = 'en-US'
  } = options;
  
  return value.toLocaleString(locale, {
    minimumFractionDigits,
    maximumFractionDigits
  });
}

/**
 * Format a currency value with 2 decimal places
 * @param amount The amount to format
 * @param currency The currency code (EGP, GBP, etc.)
 * @param options Additional formatting options
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number, currency: string, options: {
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
  locale?: string;
} = {}): string {
  if (amount === undefined || amount === null) {
    return '';
  }
  
  return `${formatNumber(amount, options)} ${currency}`;
}

/**
 * Parse a string to a number with 2 decimal places precision
 * @param value The string value to parse
 * @returns Number with 2 decimal places precision
 */
export function parseNumberToFixed(value: string): number {
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : Number(parsed.toFixed(2));
}

/**
 * Get input props configuration for numeric inputs with 2 decimal places
 * @param min Minimum value (optional)
 * @param max Maximum value (optional)
 * @returns Input props object for TextField
 */
export function getNumericInputProps(min?: number, max?: number) {
  const props: any = { 
    step: 0.01,
  };
  
  if (min !== undefined) props.min = min;
  if (max !== undefined) props.max = max;
  
  return props;
}
