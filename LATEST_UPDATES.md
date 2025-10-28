# DevCow Extension - Latest Updates (Sandbox & UI Improvements)

## Summary of New Features

### ✅ 1. FirstName Sandbox Selector
**Added dropdown to control sandbox behavior**

The extension now includes a FirstName selector that determines how the sandbox processes the verification:

- **allMatch** - All data sources match
- **allMatchC** - All match with C variant
- **allMatchA** - All match with A variant  
- **error500** - Trigger server error
- **error200** - Trigger 200 response error
- **allDSMissing** - All data sources missing

This value is automatically used as the FirstName in all form submissions, allowing you to test different sandbox scenarios.

### ✅ 2. URL Dropdowns with Defaults
**No more typing URLs repeatedly**

Both Interface URL and Debug URL are now dropdowns with default values:

**Interface URL:**
- Default: `https://192.168.1.253:44333/verification`
- Option to select "Custom URL..." and enter your own

**Debug URL:**
- Default: `https://192.168.1.253:44331/GDCDebug/DebugRecordTransaction`
- Option to select "Custom URL..." and enter your own

When you select "Custom URL...", a text input appears below for you to enter a custom URL.

### ✅ 3. Accordion Auto-Expand on Debug Page
**Automatically shows debug details**

After clicking the Lookup button on the debug page, the extension now:
1. Waits 2 seconds for results to load
2. Finds accordion headers (with class `ui-accordion-header`)
3. Automatically clicks them to expand the details
4. Shows the full debug information

This saves you from manually clicking each accordion to see the verification details.

### ✅ 4. Improved Popup Size
**Better visibility and usability**

- Width increased from 400px to 450px
- Minimum height set to 500px
- More space for all the new controls

## Updated Workflow

### User Configuration:
1. **Country**: Select Netherlands or Portugal
2. **FirstName (Sandbox)**: Select sandbox behavior (allMatch, error500, etc.)
3. **Field to Test**: Select which field gets the test case values
4. **Test Cases**: Enter 1-5 test values
5. **Interface URL**: Use default or select custom
6. **Debug URL**: Use default or select custom
7. Click **"Generate Tests"**

### Extension Execution:
```
For each test case (1-5):
  1. Open tab with Interface URL
  2. Select country (Netherlands/Portugal)
  3. Fill form with random data
  4. Set FirstName = sandbox value (e.g., "allMatch")
  5. Override tested field with test case value
  6. Click "Run A Test Transaction" checkbox
  7. Click Verify button
  8. Wait 2 seconds
  9. Extract Transaction ID
  
After 10 seconds:
  10. Open 5 debug tabs
  11. For each debug tab:
      - Paste Transaction ID
      - Click Lookup button
      - Wait 2 seconds
      - Auto-expand accordion sections
      - Show full debug details
```

## UI Layout

```
┌─────────────────────────────────────────┐
│  🐮 DevCow Test Case Generator          │
├─────────────────────────────────────────┤
│  Country:                               │
│  [Netherlands ▼]                        │
│                                         │
│  FirstName (Sandbox):                   │
│  [allMatch ▼]                          │
│                                         │
│  Field to Test:                         │
│  [(None) ▼]                            │
│                                         │
│  Test Case Values:                      │
│  [Test Case 1________________]          │
│  [Test Case 2________________]          │
│  [Test Case 3________________]          │
│  [Test Case 4________________]          │
│  [Test Case 5________________]          │
│                                         │
│  Interface URL:                         │
│  [https://192.168...verification ▼]     │
│                                         │
│  Debug URL:                             │
│  [https://192.168...DebugRecord... ▼]   │
│                                         │
│  [      Generate Tests      ]          │
│                                         │
│  Status: Starting tests...              │
└─────────────────────────────────────────┘
```

## Configuration Examples

### Example 1: Test Email with allMatch Sandbox
- Country: Netherlands
- FirstName (Sandbox): **allMatch**
- Field to Test: Email Address
- Test Cases: 
  - test1@example.com
  - test2@example.com
  - test3@example.com
- Interface URL: (default)
- Debug URL: (default)

### Example 2: Test with Error Simulation
- Country: Portugal
- FirstName (Sandbox): **error500**
- Field to Test: Cell Number
- Test Cases:
  - 1234567890
  - 0987654321
- Interface URL: (default)
- Debug URL: (default)

### Example 3: Custom URLs
- Country: Netherlands
- FirstName (Sandbox): **allMatchC**
- Field to Test: Postal Code
- Test Cases: 12345
- Interface URL: **Custom URL...** → `https://myserver.com/verify`
- Debug URL: **Custom URL...** → `https://myserver.com/debug`

## Technical Details

### FirstName Override
The `firstName` value from the dropdown is now:
1. Passed from `popup.js` → `background.js` → `content.js`
2. Overrides the random firstName in `randomData.firstName = firstName`
3. Used for ALL test cases (not randomized per test)

### URL Dropdown Logic
```javascript
// In popup.js
interfaceUrlSelect.addEventListener('change', function() {
  if (this.value === 'custom') {
    interfaceUrlCustom.style.display = 'block';  // Show custom input
  } else {
    interfaceUrlCustom.style.display = 'none';   // Hide custom input
  }
});

// When generating tests
let interfaceUrl = interfaceUrlSelect.value;
if (interfaceUrl === 'custom') {
  interfaceUrl = interfaceUrlCustom.value;  // Use custom value
}
```

### Accordion Expansion
```javascript
function expandDebugAccordion() {
  // Find all accordion headers
  const accordionHeaders = document.querySelectorAll('.ui-accordion-header');
  
  for (const header of accordionHeaders) {
    // Check if collapsed
    if (header.getAttribute('aria-expanded') !== 'true') {
      header.click();  // Expand it
    }
  }
}

// Called 2 seconds after Lookup button click
setTimeout(() => {
  expandDebugAccordion();
}, 2000);
```

## Files Modified

### 1. `popup.html`
- Added FirstName (Sandbox) dropdown
- Changed Interface URL to dropdown with default
- Changed Debug URL to dropdown with default
- Added hidden custom URL input fields

### 2. `popup.js`
- Added URL dropdown change handlers
- Reads firstName from dropdown
- Handles custom URL vs dropdown URL logic
- Passes firstName in config object

### 3. `popup.css`
- Increased popup width to 450px
- Added minimum height of 500px

### 4. `background.js`
- Passes firstName to content script

### 5. `content.js`
- Receives firstName in config
- Overrides randomData.firstName with config value
- Added `expandDebugAccordion()` function
- Calls accordion expansion after lookup

### 6. `manifest.json`
- Added default_title for better UX

## Sandbox Value Reference

| FirstName Value | Behavior |
|----------------|----------|
| **allMatch** | All verification sources match successfully |
| **allMatchC** | All match with C-type variant |
| **allMatchA** | All match with A-type variant |
| **error500** | Simulates server error (500) |
| **error200** | Returns 200 but with error content |
| **allDSMissing** | All data sources return missing/no data |

Use these to test how your system handles different verification scenarios.

## Note About Popup Staying Open

Chrome extensions have a default behavior where popups close when you:
- Click outside the popup
- Click on another tab
- Press Escape

Unfortunately, this is a browser limitation and cannot be changed via the extension code. However:
- The popup stays open while tests are running
- You can click the extension icon again to reopen it
- The status is maintained in the background script

**Workaround**: If you need to keep it open:
1. Right-click the extension icon
2. Select "Inspect popup"
3. The DevTools window keeps the popup open permanently

## Testing the New Features

1. **Load/Reload Extension** in Chrome
2. **Click Extension Icon**
3. **Verify Defaults**:
   - Country: Netherlands (or Portugal)
   - FirstName: allMatch
   - Interface URL: Default selected
   - Debug URL: Default selected
4. **Try Custom URL**:
   - Select "Custom URL..." from dropdown
   - Input field appears
   - Enter custom URL
5. **Run Tests** and check console:
   - Should see: `FirstName (Sandbox): allMatch`
   - Should see accordion expansion logs after lookup

## Expected Console Output

```
========== TEST CASE 1 ==========
Country: Netherlands
FirstName (Sandbox): allMatch
Field to test: EmailAddress
Test value: test@example.com
...
Form filled with data: {firstName: "allMatch", lastName: "Chen", ...}
...
========== DEBUGGING TRANSACTION ==========
Transaction ID: c308ae3c-a97a-4c45-b5ff-60d65f235231
...
Lookup button clicked!
Attempting to expand debug accordion...
Found 3 accordion headers
Clicking accordion header: Affiliyads Consumer - Global...
Accordion expansion attempted
```

Enjoy the improved workflow! 🐮🚀
