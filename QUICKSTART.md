# DevCow Extension - Quick Start Guide

## 🚀 How to Use

### 1. Load the Extension
1. Open Chrome: `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked"
4. Select: `c:\Users\trong\OneDrive\Desktop\Extension`

### 2. Configure Test Cases
1. Click the DevCow extension icon
2. **Select Country**: Netherlands or Portugal
3. **Select Field to Test**: Email, Phone, Postal Code, Gender, or State Province
4. **Enter Test Cases**: Up to 5 different values to test
5. **Interface URL**: Your form page URL
6. **Debug URL**: Your debug/lookup page URL

### 3. Run Tests
Click **"Generate Tests"** button

### 4. What Happens
```
🔄 Opening 5 tabs (2 seconds between each)
   ↓
🌍 Selecting country (Netherlands/Portugal)
   ↓
📝 Filling form with random data
   ↓
✅ Clicking "Run A Test Transaction" checkbox
   ↓
🔘 Clicking Verify button
   ↓
⏱️ Waiting 2 seconds
   ↓
📋 Copying Transaction ID
   ↓
⏳ Waiting 10 seconds total
   ↓
🐛 Opening 5 debug tabs
   ↓
📌 Pasting Transaction IDs
   ↓
🔍 Clicking Lookup buttons
   ↓
✅ Done! Review results
```

## 📝 Example Configuration

**Country:** Netherlands

**Field to Test:** Email Address

**Test Cases:**
- test1@example.com
- test2@example.com
- test3@example.com
- test4@example.com
- test5@example.com

**Interface URL:** http://192.168.1.253:44333/verification

**Debug URL:** http://192.168.1.253:44333/debug

## 🎯 Expected Results

After execution, you should have:
- **5 verification tabs** - Each showing "VERIFIED" status with a Transaction ID
- **5 debug tabs** - Each showing the details for one Transaction ID

## ⚠️ Important Notes

### Field Selectors Must Match
The form fields must use these exact IDs:
- `#textarea-field-FirstName`
- `#textarea-field-LastName` ⚠️ Capital "N"
- `#number-range-field-DayOfBirth`
- `#number-range-field-MonthOfBirth`
- `#number-range-field-YearOfBirth`
- `#textarea-field-HouseNumber`
- `#textarea-field-City`
- `#option-field-StateProvince`
- `#textarea-field-PostalCode`
- `#textarea-field-Telephone`
- `#textarea-field-CellNumber`
- `#option-field-Gender`
- `#textarea-field-EmailAddress`

### Required Page Elements
- Country button: Must have class `.change-country-button` or text "Change Country"
- Test checkbox: Must be `input[type="checkbox"].regular-checkbox`
- Verify button: Must have ID `#verification-button`
- Transaction ID: Must appear in `<span class="value">` after verification

## 🔍 Debugging

### Open Browser Console
Press `F12` and look for these messages:
- `========== TEST CASE 1 ==========`
- `Country selection completed`
- `Form filled with data:`
- `Test transaction checkbox clicked`
- `Transaction ID found in span.value:`
- `========== DEBUGGING TRANSACTION ==========`
- `Lookup button clicked!`

### Common Issues

**Country not changing:**
- Check console for "Change country button not found"
- Verify the button selector or text

**LastName not filled:**
- Selector must be `#textarea-field-LastName` (capital N)

**Checkbox not clicking:**
- Verify selector: `input[type="checkbox"].regular-checkbox`

**Transaction ID not captured:**
- Wait the full 2 seconds after verify
- Check if `span.value` exists on success page

**Debug lookup not working:**
- Ensure debug URL is correct
- Check if input field has "TransactionRecordID" in placeholder

## 📊 Timing Breakdown

| Phase | Duration | Notes |
|-------|----------|-------|
| Open tab | Instant | New tab created |
| Page load | ~1-2s | Automatic |
| Country select | 4s | 2s wait + 2s page update |
| Form fill | ~500ms | All fields |
| Checkbox + Verify | 500ms | Checkbox registration |
| Verification | 2s | Processing |
| Extract ID | Instant | From span.value |
| **Per Tab Total** | ~8-10s | |
| Between tabs | 2s | Delay before next |
| **5 Tabs Total** | ~45-55s | Including delays |
| Debug wait | 10s | After all submissions |
| Debug execution | 2s per tab | 10s total for 5 tabs |
| **Grand Total** | ~65-75s | Complete workflow |

## ✅ Success Indicators

You'll know it's working when:
1. ✅ Extension icon shows no errors
2. ✅ 5 form tabs open sequentially
3. ✅ Each tab shows selected country (e.g., "NETHERLANDS")
4. ✅ All form fields are filled
5. ✅ "Run A Test Transaction" is checked
6. ✅ "VERIFIED" status appears
7. ✅ Transaction IDs are visible in results
8. ✅ After 10s, 5 debug tabs open
9. ✅ Transaction IDs appear in debug input fields
10. ✅ Debug results load automatically

## 🆘 Support

If something doesn't work:
1. Check browser console (F12) for errors
2. Verify all URLs are accessible
3. Ensure form field IDs match exactly
4. Check that country names match (Netherlands/Portugal)
5. Review console logs for detailed execution flow

## 📄 Related Files

- `WORKFLOW.md` - Complete technical workflow documentation
- `FIXES.md` - Bug fixes and troubleshooting
- `CHANGES.md` - Recent changes and updates
- `README.md` - General extension information
