# DevCow Chrome Extension

A Chrome extension for automated web form testing with multiple test cases.

## Features

- **Sequential Test Execution**: Opens 5 tabs with 2-second delays between each
- **Smart Form Filling**: Auto-fills forms with randomized data
- **Custom Field Testing**: Test specific fields (Email, Phone, Postal Code, etc.) with custom values
- **Transaction Tracking**: Captures and stores transaction IDs after form submission
- **Auto Debug**: Opens debug tabs after 10-second delay to validate transactions

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked"
4. Select the `Extension` folder containing this extension
5. The DevCow icon should appear in your extensions toolbar

## Usage

1. Click the DevCow extension icon to open the popup
2. Select the field you want to test from the dropdown
3. Enter up to 5 test case values
4. Provide the form interface URL and debug URL
5. Click "Generate Tests"
6. The extension will:
   - Open 5 tabs (2 seconds apart)
   - Fill each form with random data + your test value
   - Submit the forms
   - Extract transaction IDs
   - Wait 10 seconds
   - Open debug tabs for validation

## File Structure

```
/Extension
├── manifest.json         # Extension configuration
├── popup.html           # UI interface
├── popup.css            # UI styling
├── popup.js             # UI logic
├── background.js        # Tab orchestration
├── content.js           # Page interaction
├── utils.js             # Random data generation
└── /icons               # Extension icons
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

## Notes

- You need to add your own icon images (icon16.png, icon48.png, icon128.png) to the `icons` folder
- The extension requires host permissions for the websites you're testing
- Ensure your form uses the expected field selectors (see content.js)
- If you leave some test case values blank, the extension will now auto-fill those with valid random values so all 5 debug tabs receive Transaction IDs.

## Created with AI
This extension was generated based on detailed specifications for automated testing workflows.
