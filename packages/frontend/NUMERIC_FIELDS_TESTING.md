# Numeric Fields Testing Plan

This document outlines the testing plan for the standardization of numeric fields to 2 decimal places across the application.

## Testing Strategy

### 1. Unit Tests

- Run the unit tests for the `numberUtils.ts` utility functions:
  ```bash
  cd packages/frontend
  npm test -- src/utils/numberUtils.test.ts
  ```

### 2. Manual Testing

#### Utility Reading Module

1. **Create Utility Reading**
   - Navigate to Create Utility Reading page
   - Enter water/electricity readings with decimal values
   - Verify that input fields properly handle 2 decimal places
   - Submit the form and verify the displayed values have 2 decimal places

2. **Utility Reading Details**
   - View an existing utility reading
   - Verify all numeric values (consumption, costs, totals) display with 2 decimal places

#### Service Requests Module

1. **Create Service Request**
   - Navigate to Create Service Request page
   - Enter custom cost with decimal values
   - Verify that input fields properly handle 2 decimal places
   - Submit the form and verify the displayed values have 2 decimal places

2. **Service Request Details**
   - View an existing service request
   - Verify cost displays with 2 decimal places
   - Edit the cost and verify input field handles 2 decimal places properly

#### Payments and Invoices

1. **Payment Details**
   - View payment details
   - Verify all monetary amounts display with 2 decimal places

2. **Invoice Details**
   - View invoice details
   - Verify all monetary amounts (totals, balances) display with 2 decimal places

### 3. Edge Cases

Test the following edge cases:

1. **Zero Values**
   - Create entries with zero values
   - Verify they display as "0.00"

2. **Large Numbers**
   - Test with large monetary values (e.g., 1,000,000+)
   - Verify proper formatting with commas and 2 decimal places

3. **Small Decimal Values**
   - Test with small decimal values (e.g., 0.001)
   - Verify rounding to 2 decimal places works correctly

4. **Negative Values**
   - Test with negative values where applicable
   - Verify they display with proper negative sign and 2 decimal places

## Test Results Documentation

For each test case, document:

1. Page/component tested
2. Input values used
3. Expected output
4. Actual output
5. Pass/Fail status

## Regression Testing

After implementing the changes, verify that:

1. All calculations still work correctly
2. Form submissions handle numeric values properly
3. API requests/responses are not affected by the formatting changes
4. No visual layout issues are introduced by the standardized formatting

## Automated Testing

Consider adding additional automated tests for:

1. Component rendering with numeric values
2. Form submission with numeric inputs
3. API response handling for numeric values
