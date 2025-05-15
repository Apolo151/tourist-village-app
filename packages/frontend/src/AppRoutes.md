# Required Route Updates for App.tsx

Add the following routes to your App.tsx file within your existing Routes component:

```jsx
<Route path="/utilities" element={<Utilities />} />
<Route path="/utilities/:id" element={<UtilityReadingDetails />} />
<Route path="/utilities/new" element={<UtilityReadingDetails />} />
```

Don't forget to import the components at the top of the file:

```jsx
import Utilities from './pages/Utilities';
import UtilityReadingDetails from './pages/UtilityReadingDetails';
```

Make sure these routes are protected by your admin-only route protection, as utility readings should only be accessible to administrators.

## Implementation Summary

The Utilities Reading feature has been completely reimplemented with the following components:

1. **Utilities.tsx**: Main page that lists all utility readings with filtering capabilities
   - Lists all utility readings
   - Filters by apartment or booking
   - Shows calculated bills when start and end readings are available
   - Provides links to add new readings or edit existing ones

2. **UtilityReadingDetails.tsx**: Page for creating and editing utility readings
   - Allows creating both start and end readings at once
   - Automatically sets the dates based on booking dates
   - Enforces validation to ensure dates are within booking dates
   - Calculates bills automatically based on usage and utility rates
   - Creates payment records when both start and end readings are available

3. **Types and Mock Data**: Updated to match the requirements
   - Modified UtilityReading type with readingType field
   - Updated mock data to use the new structure
   - Added proper date constraints and validation

## Features Implemented

- ✅ List all Utilities Readings with filtering
- ✅ "Add a new Reading" button
- ✅ All required fields (Start/End Reading, Utility Type, Dates, Apartment, Booking)
- ✅ Dates constrained to booking dates
- ✅ User ID storage for the reading creator
- ✅ Automatic bill calculation
- ✅ Bill added to user account with proper details
- ✅ Proper equation: (End Reading - Start Reading) * Utility Price 