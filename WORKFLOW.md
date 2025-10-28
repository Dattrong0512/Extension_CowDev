# DevCow Extension - Complete Workflow Update

## Summary of Latest Changes

Based on the actual Trulioo interface screenshots, I've updated the extension to follow the exact workflow:

### ✅ Fixed & Added Features

#### 1. **Fixed LastName Field Selector**
- **Was**: `#textarea-field-lastName` (wrong capitalization)
- **Now**: `#textarea-field-LastName` (correct - capital N)

#### 2. **Added "Run A Test Transaction" Checkbox Click**
- **Selector**: `input[type="checkbox"].regular-checkbox`
- **Action**: Automatically clicks the checkbox before submitting
- **Timing**: Waits 500ms after checkbox click for it to register

#### 3. **Fixed Verification Flow**
- **Step 1**: Fill all form fields
- **Step 2**: Click "Run A Test Transaction" checkbox
- **Step 3**: Wait 500ms
- **Step 4**: Click "#verification-button" (Verify button)
- **Step 5**: Wait 2 seconds for verification to complete
- **Step 6**: Extract transaction ID from the results

#### 4. **Improved Transaction ID Extraction**
- **Primary Method**: Look for `span.label` containing "Transaction ID:"
- Then find adjacent `span.value` element with the actual ID
- **Example HTML**: 
  ```html
  <span class="label">Transaction ID:</span>
  <span class="value" data-hj-suppress="true">c308ae3c-a97a-4c45-b5ff-60d65f235231</span>
  ```
- **Fallback Methods**:
  - Search in parent/row elements
  - Check input fields
  - Regex pattern matching in page text

#### 5. **Enhanced Debug Page Interaction**
- **Input Field Detection**:
  - Looks for placeholder containing "TransactionRecordID"
  - Falls back to any text input near the Lookup button
  - Searches within form elements
- **Better Value Setting**:
  - Clears existing value first
  - Sets the transaction ID
  - Focuses the input
  - Triggers: input, change, keydown, keyup events
- **Lookup Button**:
  - Waits 1 second before clicking
  - Ensures all events are processed

## Complete Workflow (5 Test Cases)

### For Each Test Case:

1. **Tab Opens** → Interface URL loaded
2. **Country Selection** → Clicks "Change Country" → Selects Netherlands/Portugal
3. **Wait** → 2 seconds for country to apply
4. **Form Filling** → All fields filled with random data
5. **Test Field Override** → Specific field uses test case value
6. **Checkbox Click** → "Run A Test Transaction" checkbox checked
7. **Wait** → 500ms for checkbox to register
8. **Verify Click** → "#verification-button" clicked
9. **Wait** → 2 seconds for verification
10. **Extract ID** → Transaction ID copied from `span.value`
11. **Store ID** → Sent to background script

### After All 5 Test Cases Complete:

12. **Wait** → 10 seconds (total)
13. **Debug Tabs Open** → 5 tabs, one for each transaction
14. **For Each Debug Tab**:
    - Wait 1 second for page load
    - Find transaction ID input field
    - Paste the transaction ID
    - Trigger all necessary events
    - Click "Lookup" button after 1 second
    - Results displayed

## Key Selectors Reference

### Form Page:
- Country button: `.change-country-button` or button text
- Country picker: `.country-picker` or `div[class*="country"]`
- FirstName: `#textarea-field-FirstName`
- **LastName: `#textarea-field-LastName`** ⚠️ Capital N!
- Test checkbox: `input[type="checkbox"].regular-checkbox`
- Verify button: `#verification-button`
- Transaction ID label: `span.label` (contains "Transaction ID:")
- Transaction ID value: `span.value` (adjacent to label)

### Debug Page:
- Input field: `input[type="text"]` (first one or with TransactionRecordID placeholder)
- Lookup button: `input[type="submit"][value="Lookup"]`

## Timing Summary

| Action | Wait Time | Reason |
|--------|-----------|--------|
| After country selection | 2000ms | Country picker to close and apply |
| After page update | 2000ms | Page to refresh with new country |
| After checkbox click | 500ms | Checkbox state to register |
| After verify click | 2000ms | Verification to complete |
| All tabs opened | 10000ms | All submissions to finish |
| Debug page load | 1000ms | Page to fully load |
| Before lookup click | 1000ms | Input events to process |
| Between tab opens | 2000ms | Browser to handle each tab |

## Expected Console Output

```
========== TEST CASE 1 ==========
Country: Netherlands
Field to test: EmailAddress
Test value: test@example.com
Step 1: Selecting country...
Clicking change country button...
Country picker opened
Found 15 options in country picker
Checking option: "Netherlands"
Found matching country: Netherlands
Clicking radio button for country
Country selection completed
Waiting for page to update after country change...
Step 2: Generating random data...
Form filled with data: {firstName: "Alex", lastName: "Chen", ...}
Step 5: Clicking "Run A Test Transaction" checkbox...
Test transaction checkbox clicked
Step 6: Clicking verify button...
Verify button found, clicking...
Waiting 2 seconds for verification...
Step 8: Extracting transaction ID...
Looking for transaction ID...
Transaction ID found in span.value: c308ae3c-a97a-4c45-b5ff-60d65f235231

========== DEBUGGING TRANSACTION ==========
Transaction ID: c308ae3c-a97a-4c45-b5ff-60d65f235231
Found debug input field
Transaction ID "c308ae3c-a97a-4c45-b5ff-60d65f235231" pasted into debug field
Found Lookup button, clicking in 1 second...
Lookup button clicked!
```

## Testing Checklist

Before running:
- [ ] Extension loaded in Chrome
- [ ] Interface URL is correct
- [ ] Debug URL is correct
- [ ] Country selected (Netherlands or Portugal)
- [ ] Field to test selected
- [ ] At least one test case value entered

During execution:
- [ ] 5 tabs open with 2-second delays
- [ ] Country is selected in each tab
- [ ] All form fields are filled
- [ ] Test checkbox is clicked
- [ ] Verify button is clicked
- [ ] Transaction IDs are captured
- [ ] After 10 seconds, debug tabs open
- [ ] Transaction IDs are pasted
- [ ] Lookup is clicked automatically

Expected results:
- [ ] 5 form submission tabs
- [ ] 5 debug tabs showing verification results
- [ ] All transaction IDs match
- [ ] No errors in console

## Troubleshooting

**If LastName field is not filled:**
- Check if selector is `#textarea-field-LastName` (capital N)
- Look in console for "Element not found" warnings

**If checkbox is not clicked:**
- Verify checkbox selector: `input[type="checkbox"].regular-checkbox`
- Check if it's already checked (extension checks before clicking)

**If transaction ID is not found:**
- Look for "Looking for transaction ID..." in console
- Check if verification completed (2-second wait)
- Verify `span.label` and `span.value` exist on results page

**If debug lookup fails:**
- Check if transaction ID was pasted (console log)
- Verify input field placeholder contains "TransactionRecordID"
- Ensure Lookup button has correct value attribute

## Files Modified

1. ✅ `content.js` - Main changes:
   - Fixed LastName selector
   - Added checkbox click before verify
   - Changed to async function with proper waits
   - Improved transaction ID extraction
   - Enhanced debug input handling

2. ✅ `instruction.md` - Updated:
   - Documented LastName selector fix
   - Added checkbox click step
   - Updated timing specifications
   - Improved debug flow description
