# Excel Import Guide for User Management

This guide explains how to use the Excel import feature for bulk user creation in the Tourist Village management system.

## Overview

The Excel import feature allows administrators to add multiple users at once by uploading an Excel file (.xlsx, .xls) or CSV file containing user data. This is particularly useful when you need to add a large number of users (e.g., 400-500) to the system.

## Excel File Structure

The Excel file must contain the following **required** columns:

- `name` - Full name of the user
- `email` - Email address (must be unique)
- `role` - Must be one of: super_admin, admin, owner, renter

The following columns are **optional**:

- `password` - If not provided, a random password will be generated
- `phone_number` - Phone number
- `is_active` - TRUE/FALSE, defaults to TRUE
- `village_ids` - Comma-separated list of village IDs (for admin users only)
- `passport_number` - User's passport number
- `passport_expiry_date` - In YYYY-MM-DD format
- `address` - User's address
- `next_of_kin_name` - Name of next of kin
- `next_of_kin_phone` - Phone number of next of kin
- `next_of_kin_email` - Email address of next of kin
- `next_of_kin_address` - Address of next of kin
- `next_of_kin_will` - Will details

## How to Import Users

1. Navigate to the Users Management page
2. Click on the "Import Users" button next to the "Add User" button
3. In the dialog that appears, click "Download Template" to get a pre-formatted Excel template
4. Fill in the template with your user data
5. Return to the Import Users dialog and either:
   - Click on the dashed area to select your file
   - Drag and drop your file onto the dashed area
6. Click the "Import" button to start the import process
7. Wait for the import to complete
8. Review the results, including any errors that may have occurred

## Import Rules and Validations

- Email addresses must be unique across all users
- Role must be one of the predefined values: super_admin, admin, owner, renter
- If `is_active` is provided, it must be either TRUE or FALSE
- If `village_ids` is provided for admin users, it must be a comma-separated list of valid village IDs
- If `passport_expiry_date` is provided, it must be in YYYY-MM-DD format
- The maximum file size allowed is 10MB
- Only .xlsx, .xls, and .csv file formats are supported

## Handling Import Errors

If any errors occur during the import process, they will be displayed in the results section of the dialog. The errors will include:

- The row number where the error occurred
- The email address of the user that could not be imported
- A description of the error

Users that could not be imported due to errors will be skipped, but the import process will continue for the remaining users.

## Best Practices

- Always download the latest template to ensure you have the correct format
- Keep the file size reasonable (under 10MB) for better performance
- If you have a very large number of users (1000+), consider splitting them into multiple files
- Verify all required fields are filled in before uploading
- For admin users, ensure the village_ids are correct and exist in the system
- After import, verify that all users were created successfully

## Troubleshooting

If you encounter issues with the import process:

1. Check that your Excel file follows the required format
2. Ensure all required fields are provided
3. Verify that email addresses are unique
4. Check for any special characters that might cause parsing issues
5. Make sure the file is not corrupted or password-protected

For further assistance, contact the system administrator.
