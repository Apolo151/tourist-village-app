# Example Users Excel File

This Excel file (`example-users.xlsx`) contains 120 sample user records for testing the bulk import functionality in the Tourist Village management system.

## File Structure

The file contains the following columns:
- `name` - Full name of the user
- `email` - Email address
- `password` - Password for the user account
- `phone_number` - Phone number
- `role` - User role (super_admin, admin, owner, renter)
- `is_active` - Account status (TRUE/FALSE)
- `village_ids` - Comma-separated list of village IDs (for admin users)
- `passport_number` - Passport number
- `passport_expiry_date` - Passport expiry date in YYYY-MM-DD format
- `address` - User's address
- `next_of_kin_name` - Name of next of kin
- `next_of_kin_phone` - Phone number of next of kin
- `next_of_kin_email` - Email address of next of kin
- `next_of_kin_address` - Address of next of kin
- `next_of_kin_will` - Will details

## User Distribution

The file contains a mix of valid and invalid user records to test different import scenarios:

### Valid Users (80)
- Records 1-80: Complete valid user records with various combinations of optional fields

### Invalid Users (40)
- Records 81-90: Missing email (required field)
- Records 91-95: Missing name (required field)
- Records 96-100: Missing role (required field)
- Records 101-105: Invalid email format
- Records 106-110: Invalid phone number format
- Records 111-115: Invalid role value
- Records 116-120: Invalid village_ids format

## Usage

This file can be used to test the bulk user import functionality in the Tourist Village management system. When importing this file, you should expect:

1. The valid users (1-80) to be imported successfully
2. The invalid users (81-120) to generate appropriate error messages

## Regenerating the File

If you need to regenerate this file with different data, you can run:

```
node generate-example-users.js
```

This will create a new `example-users.xlsx` file with 120 randomly generated user records following the same distribution of valid and invalid records.
