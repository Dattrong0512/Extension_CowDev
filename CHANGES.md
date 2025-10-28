# DevCow Extension - Recent Updates

## Summary of Changes

### 1. Country Selection Feature Added
- **New Dropdown in UI**: Added country selector with Netherlands and Portugal options
- **Automated Country Selection**: Extension now clicks the "change-country-button" and selects the appropriate country from the country picker modal before filling the form

### 2. Dropdown Field Testing Logic
- **Smart Field Filling**: Dropdown fields (Gender, State/Province) are only filled with random data if they are NOT the field being tested
- **Test Case Priority**: When testing a dropdown field, the extension uses the test case value instead of random data

### 3. Updated Files

#### `instruction.md`
- Added country selection requirement
- Updated UI specification to include country selector
- Added detailed country selection process in content.js section
- Clarified dropdown field handling rules

#### `popup.html`
- Added country selector dropdown with Netherlands and Portugal options
- Added Gender and State Province as testable fields

#### `popup.js`
- Collects country value from the UI
- Passes country to background script in config

#### `background.js`
- Passes country parameter to content script

#### `content.js`
- **New Function**: `selectCountry(country)` - Handles automated country selection:
  1. Clicks `.change-country-button`
  2. Waits for `.country-picker` modal to appear
  3. Finds and clicks the radio button for the selected country
  4. Waits for selection to be applied
  
- **Updated Logic**: Dropdown fields are now conditionally filled:
  - If the field is being tested → use test case value
  - If the field is NOT being tested → use random value
  
- **Added Support**: Gender and StateProvince can now be tested as fields

## How It Works Now

### User Workflow:
1. Select country (Netherlands or Portugal)
2. Select field to test (includes Gender and State Province now)
3. Enter test case values
4. Provide URLs
5. Click "Generate Tests"

### Extension Behavior:
1. Opens tab with interface URL
2. **Clicks change-country-button**
3. **Selects country from country-picker modal**
4. Fills form with random data
5. For the tested field: uses the test case value
6. For dropdown fields NOT being tested: uses random values
7. Submits form
8. Extracts transaction ID
9. Opens debug tab after 10 seconds

## Testing Notes

### For Dropdown Fields:
- When testing Gender: Enter valid values like "M" or "F" in test cases
- When testing State Province: Enter valid state codes in test cases
- All other fields will be filled with random data automatically

### Country Selection:
- The extension looks for radio buttons inside `.country-picker`
- It matches the country name in the label text
- Default timeout: 1 second for picker to open, 1 second for selection to apply

## Troubleshooting

If country selection fails:
1. Check that `.change-country-button` selector is correct
2. Verify `.country-picker` modal class name
3. Ensure radio buttons are inside the country picker
4. Check console logs for detailed country selection process
