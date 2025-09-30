# Frontend Refactoring Plan - Visitor Components

## Current Task: Refactor BulkInvite.jsx

### Steps for BulkInvite.jsx Refactoring:
1. **Replace manual useState with useApiForm hook**
   - Remove manual form state management (form, loading, error, result)
   - Integrate useApiForm hook with bulkInvite API function
   - Set up proper validation function for form fields
   - Configure success action for consistent messaging

2. **Replace manual form with ApiForm component**
   - Wrap form fields with ApiForm component
   - Use ApiFormSubmit and ApiFormReset for buttons
   - Remove manual handleSubmit function
   - Integrate CSV parsing logic with form state

3. **Replace manual result display with ApiResult component**
   - Remove manual error and success display logic
   - Use ApiResult to handle loading, error, and success states
   - Customize result display for bulk invite specific data (invite link, guest count, etc.)

4. **Replace inline styles with UI components**
   - Replace inline style objects with Tailwind classes
   - Use Card, Button, Input, Badge components from UI library
   - Maintain existing layout and visual design

5. **Integrate CSV parsing with new state management**
   - Adapt CSV parsing logic to work with useApiForm state
   - Update form validation to include CSV-specific checks
   - Ensure CSV preview and error display works with new components

6. **Update error handling and success messaging**
   - Use consistent error mapping from errorMapper utilities
   - Ensure success messages are properly mapped
   - Maintain existing error display for CSV validation issues

7. **Test and verify functionality**
   - Ensure all existing features work after refactoring
   - Verify form submission, validation, and error handling
   - Check CSV upload and parsing functionality
   - Confirm success state display and link copying

### Next Components to Refactor:
- GeneratePass.jsx
- GuestInvite.jsx
- Register.js
- VisitorHistory.jsx
- ScanQR.jsx

### Notes:
- Maintain backward compatibility and existing functionality
- Preserve user experience and visual design
- Ensure consistent error handling across all components
- Use established patterns from useApiForm, ApiForm, and ApiResult
