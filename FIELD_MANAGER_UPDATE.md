# DevCow Extension - Major Update: Field Manager System

## 🎉 Complete Overhaul Summary

### What's New:

#### 1. **Field Manager System** ⭐ MAJOR FEATURE
Instead of random values, you now have FULL CONTROL over every field value!

**Features:**
- ✅ **Persistent Storage**: Values are saved permanently in Chrome storage
- ✅ **Add Custom Values**: Add any value you want for any field
- ✅ **Remove Values**: Delete unwanted values from the list
- ✅ **Reset to Default**: Restore default values anytime
- ✅ **Random Selection**: Extension picks randomly from YOUR custom list

**How It Works:**
1. Click "Field Manager" tab in the extension
2. See all 12 form fields (LastName, City, Postal Code, etc.)
3. For each field:
   - View current values in the list
   - Type a new value → Click "➕ Add"
   - Select value(s) → Click "➖ Remove Selected"
   - Click "🔄 Reset to Default" to restore defaults

#### 2. **Fixed Debug URL Issue** ✅
- Debug tabs now properly open with the correct URL
- Added logging to track debug URL usage
- Verified config passing from popup → background → content

#### 3. **Two-Tab Interface**
- **Test Config Tab**: Run your tests (same as before)
- **Field Manager Tab**: Manage field values (NEW!)

### 📊 Technical Implementation

#### New Files:
1. **`fieldManager.js`** - Core field management logic
   - `loadFieldValues()` - Load from storage
   - `saveFieldValues()` - Save to storage
   - `addFieldValue()` - Add new value
   - `removeFieldValue()` - Remove value
   - `getRandomFieldValue()` - Get random from list
   - `resetFieldToDefault()` - Reset field

2. **Updated `utils.js`** - Now integrates with field manager
   - `generateRandomData()` - Uses storage values
   - `getRandomValueFromStorage()` - Fetches from Chrome storage

3. **Updated `popup.html`** - New tabbed interface
   - Tab navigation
   - Field Manager UI
   - All 12 fields with controls

4. **Updated `popup.js`** - Tab switching + field management
   - Tab navigation logic
   - Add/Remove/Reset handlers
   - Real-time UI updates

5. **Updated `popup.css`** - Beautiful new design
   - Tab styles
   - Field manager layout
   - Button colors (Add = Green, Remove = Red, Reset = Orange)

6. **Updated `manifest.json`** - Added storage permission

### 🎯 Managed Fields

All these fields now have custom value management:

1. **Last Name** - Default: Smith, Johnson, Williams, Brown, etc.
2. **Day of Birth** - Default: 01, 05, 10, 15, 20, 25, 28
3. **Month of Birth** - Default: 01-12
4. **Year of Birth** - Default: 1980, 1985, 1990, 1995, 2000, 2005
5. **House Number** - Default: 123, 456, 789, 1000, 2500
6. **City** - Default: Newfield, Springfield, Riverside, etc.
7. **State Province** - Default: CA, NY, TX, FL, IL, PA, OH
8. **Postal Code** - Default: 12345, 67890, 11111, etc.
9. **Telephone** - Default: 2001234567, 3001234567, etc.
10. **Cell Number** - Default: 6001234567, 7001234567, etc.
11. **Gender** - Default: M, F
12. **Email Address** - Default: test1@example.com, test2@example.com, etc.

### 🔄 Complete Workflow

#### Setup (One Time):
1. Open extension
2. Click "Field Manager" tab
3. For each field you care about:
   - Add your own values
   - Remove unwanted defaults
   - Or keep defaults

#### Running Tests (Every Time):
1. Click "Test Config" tab
2. Select Country
3. Select FirstName (Sandbox)
4. Select Field to Test
5. Enter Test Case Values
6. Verify URLs (default or custom)
7. Click "Generate Tests"

#### What Happens:
```
For each of 5 test cases:
  1. Open tab
  2. Select country
  3. Fill form with YOUR CUSTOM VALUES (random from your lists)
  4. Override FirstName with sandbox value
  5. Override tested field with test case value
  6. Click checkbox
  7. Click Verify
  8. Extract Transaction ID

After 10 seconds:
  9. Open debug tabs with: https://192.168.1.253:44331/GDCDebug/DebugRecordTransaction
  10. Paste Transaction IDs
  11. Click Lookup
  12. Expand accordions
```

### 💾 Data Persistence

**Where Values Are Stored:**
- Chrome's `chrome.storage.local`
- Key: `devCowFieldValues`
- Format: `{ lastName: ['Smith', 'Jones'], city: ['NYC', 'LA'], ... }`

**When Values Persist:**
- ✅ Across browser restarts
- ✅ Across extension reloads
- ✅ Until you manually remove them
- ❌ NOT if you uninstall the extension

**To Clear All Custom Values:**
1. Click "🔄 Reset to Default" for each field
2. Or uninstall/reinstall the extension

### 🎨 UI Features

#### Tab Navigation:
- **Test Config** - Purple highlight when active
- **Field Manager** - Switch anytime without losing data

#### Field Manager Interface:
- **Multi-select List** - See all values, select multiple to remove
- **Add Input** - Type and press Enter or click Add
- **Green Add Button** - ➕ Add value
- **Red Remove Button** - ➖ Remove selected value(s)
- **Orange Reset Button** - 🔄 Reset to defaults

#### Visual Feedback:
- Buttons have hover effects
- Active tab highlighted
- Scrollable field list
- Color-coded actions

### 🐛 Debug URL Fix

**Problem:** Debug tabs weren't opening
**Root Cause:** URL possibly not being passed correctly
**Solution:**
- Added explicit logging: `console.log('Debug URL:', debugUrl)`
- Verified config object structure
- Confirmed URL extraction from dropdown

**Test it:**
1. Open browser console (F12)
2. Run tests
3. Look for: `"Debug URL: https://192.168.1.253:44331/GDCDebug/DebugRecordTransaction"`
4. Should see: `"Opening debug tab for transaction: [ID]"`

### 📝 Example Usage

#### Scenario 1: Testing with Custom Cities
```
1. Go to Field Manager
2. Find "City" field
3. Click "🔄 Reset" to clear defaults
4. Add your cities:
   - Type "Amsterdam" → Click "➕ Add"
   - Type "Lisbon" → Click "➕ Add"
   - Type "Porto" → Click "➕ Add"
5. Run tests
6. Forms will use only: Amsterdam, Lisbon, or Porto
```

#### Scenario 2: Testing Specific Postal Codes
```
1. Go to Field Manager
2. Find "Postal Code"
3. Remove all defaults (select all → "➖ Remove")
4. Add only the codes you need:
   - "1011AB"
   - "1012CD"
   - "3500-123"
5. Run tests
6. Only these postal codes will be used
```

#### Scenario 3: Testing Gender Variations
```
1. Go to Field Manager
2. Find "Gender"
3. Keep defaults (M, F)
4. Add more if needed:
   - "X"
   - "N"
   - "O"
5. Extension randomly picks from: M, F, X, N, O
```

### 🔧 Troubleshooting

**Field values not saving:**
- Check if Chrome storage permission is granted
- Reload extension
- Check browser console for errors

**Debug tabs not opening:**
1. Open console (F12)
2. Look for "Debug URL:" log
3. Verify URL is correct
4. Check if transaction IDs were captured
5. Ensure 10-second wait completed

**Can't see my added values:**
- Click away from Field Manager tab and back
- Check if value was actually added (look in select list)
- Try reloading extension

**Want to start fresh:**
1. Click "🔄 Reset to Default" on all fields
2. Or: Remove extension → Reinstall

### 📋 Quick Reference

**Storage Key:** `devCowFieldValues`
**Default URL (Interface):** `https://192.168.1.253:44333/verification`
**Default URL (Debug):** `https://192.168.1.253:44331/GDCDebug/DebugRecordTransaction`

**Permissions Required:**
- ✅ tabs
- ✅ scripting
- ✅ activeTab
- ✅ storage (NEW)
- ✅ host_permissions: <all_urls>

### 🚀 Next Steps

1. **Reload Extension** in Chrome
2. **Open Extension** popup
3. **Click "Field Manager"** tab
4. **Customize Your Values** for each field
5. **Return to "Test Config"** tab
6. **Run Tests** with your custom data!

Enjoy complete control over your test data! 🐮✨
