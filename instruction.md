# Project Specification: DevCow Chrome Extension (Revised for Gemini)

## 1. Summary

**Project Name:** DevCow

**Purpose:** You are tasked with generating the code for a Chrome extension named "DevCow." Its purpose is to automate web form testing. A user will define a specific field to test (e.g., "Email Address"), provide up to five different values for that field, and the extension will handle the rest. It must **sequentially open five browser tabs with a 2-second delay between each opening**. In each tab, it will auto-fill the form with random data but will use one of the specific user-provided test values for the designated field. After submitting, it will find and copy a "Transaction ID." Finally, after a **10-second wait**, it will open corresponding debug tabs to validate each transaction.

---

## 2. File & Folder Structure

Please generate the code based on the following standard Chrome extension structure. Ensure the `manifest.json` file includes the necessary permissions: `"tabs"`, `"scripting"`, and host permissions (`"host_permissions"`) for the websites the extension will interact with.

```
/DevCow-extension
|
|-- manifest.json         # Extension configuration file
|-- /icons
|   |-- icon16.png
|   |-- icon48.png
|   |-- icon128.png
|
|-- popup.html            # The HTML for the sidebar UI
|-- popup.css             # Styles for the sidebar UI
|-- popup.js              # Logic for the sidebar UI
|
|-- background.js         # Background script to manage tabs and state
|-- content.js            # Injected into web pages to fill forms
|-- utils.js              # Helper functions for generating random data
```

---

## 3. Detailed Feature Implementation

### 3.1. Sidebar UI (`popup.html`, `popup.css`)

The popup's UI should be clean and functional.

1.  **Title:** "DevCow Test Case Generator"
2.  **Country Selector:** A `<select>` element with the ID `country-selector`. Options: Netherlands, Portugal.
3.  **Field Selector:** A `<select>` element with the ID `field-to-test`. Options: (None), Cell Number, Telephone, Postal Code, Email Address.
4.  **Test Case Inputs:** Five text `<input>` fields with IDs `test-case-1` through `test-case-5`.
5.  **URL Inputs:** Two text `<input>` fields with IDs `interface-url` and `debug-url`.
6.  **Action Button:** A `<button>` with the ID `generate-tests-btn` and text "Generate Tests".
7.  **Status Display:** A paragraph `<p>` element with ID `status-display` for progress updates.

---

### 3.2. UI Logic (`popup.js`)

This script handles all user interaction within the popup.

-   Add a `click` event listener to the `#generate-tests-btn`.
-   When clicked, it must:
    1.  **Prevent multiple clicks:** Immediately disable the `#generate-tests-btn`.
    2.  **Update status:** Change the text of `#status-display` to "Starting tests...".
    3.  **Gather data:** Read all values from the inputs.
    4.  **Send to background:** Package the data into a configuration object and send it to `background.js` using `chrome.runtime.sendMessage({ action: "START_TESTS", config: { ... } });`.

---

### 3.3. Core Logic (`background.js`)

This script is the orchestrator. It must use an `async` function to manage the timed sequence.

-   **Global State:** Maintain a global array to store results: `let transactionResults = [];`.
-   **Message Listeners:**
    1.  Create a listener for the **`START_TESTS`** message from `popup.js`. When it arrives, clear the `transactionResults` array and call an `async` function like `runTestSequence(message.config)`.
    2.  Create a listener for the **`FORM_SUBMITTED`** message from `content.js`. This listener will add the received transaction ID to the `transactionResults` array.
-   **`async function runTestSequence(config)`:**
    1.  **Define a `sleep` helper:** `const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));`.
    2.  **Part 1: Open Form Tabs Sequentially**
        -   Loop through the 5 test cases.
        -   In each iteration, create a new tab, inject `content.js`, and send it the `FILL_FORM` message.
        -   At the end of each iteration, `await sleep(2000);` to pause for **2 seconds**.
    3.  **Part 2: Wait for Submissions**
        -   After the loop, `await sleep(10000);`. This **10-second** delay is crucial.
    4.  **Part 3: Open Debug Tabs**
        -   After the delay, iterate through the `transactionResults` array.
        -   For each result, create a debug tab, inject `content.js`, and send it the `DEBUG_TRANSACTION` message.

---

### 3.4. Page Interaction (`content.js`)

This script must be robust.

-   Listen for messages (`FILL_FORM` and `DEBUG_TRANSACTION`) from `background.js`.
-   **If `action` is `FILL_FORM`:**
    1.  **First, handle country selection:**
        -   Click the "Change Country" button (look for `.change-country-button` or button with "Change Country" text)
        -   Wait for the country picker modal/dialog to appear
        -   Find all `<label>` elements within the country picker
        -   Match the label text with the selected country (Netherlands or Portugal)
        -   Click the radio button associated with that label
        -   Trigger change/click events on the radio button
        -   Wait 2 seconds for the country selection to be applied and modal to close
    2.  Get random data from `utils.js` and override the specific field being tested.
    3.  **Safely fill fields:** For each field, check if the element exists before setting its value. Use these selectors:
        -   **FirstName:** `#textarea-field-FirstName`
        -   **LastName:** `#textarea-field-LastName` (NOTE: capital N in LastName)
        -   **DayOfBirth:** `#number-range-field-DayOfBirth`
        -   **MonthOfBirth:** `#number-range-field-MonthOfBirth`
        -   **YearOfBirth:** `#number-range-field-YearOfBirth`
        -   **HouseNumber:** `#textarea-field-HouseNumber`
        -   **City:** `#textarea-field-City`
        -   **State Province:** `#option-field-StateProvince`
        -   **Postal Code:** `#textarea-field-PostalCode`
        -   **Telephone:** `#textarea-field-Telephone`
        -   **Cell Number:** `#textarea-field-CellNumber`
        -   **Gender:** `#option-field-Gender`
        -   **Email Address:** `#textarea-field-EmailAddress`
    4.  **IMPORTANT:** Only fill dropdown fields (like State/Province, Gender) if they match the field being tested. All other fields should be filled with random data.
    5.  **Click the "Run A Test Transaction" checkbox:** Find `input[type="checkbox"].regular-checkbox` and click it if not already checked.
    6.  **Wait 500ms** for the checkbox to register.
    7.  Click the submit button: `#verification-button`.
    8.  **Wait 2 seconds** for the verification to complete.
    9.  **Extract the transaction ID:**
        -   Look for `span.label` elements containing "Transaction ID:"
        -   Find the adjacent `span.value` element
        -   Extract the transaction ID from the value span
        -   Fallback methods: check input fields, search page text with regex
    10. Send the ID back to `background.js` in a `FORM_SUBMITTED` message.
-   **If `action` is `DEBUG_TRANSACTION`:**
    1.  Wait 1 second for the page to fully load.
    2.  Find the transaction ID input field (text input with placeholder containing "TransactionRecordID" or the first text input on the page).
    3.  Clear any existing value and paste the `transactionId` into the input field.
    4.  Trigger input, change, keydown, and keyup events to ensure reactive forms detect the value.
    5.  Find the Lookup button: `input[type="submit"][value="Lookup"]`.
    6.  Wait 1 second, then click the Lookup button to perform the debug search.

---

### 3.5. Data Generation (`utils.js`)

This file should contain a function to generate realistic, randomized data.

```javascript
function generateRandomData() {
  const randomNum = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const now = Date.now();

  return {
    firstName: "Alex", // Use a list of random names
    lastName: "Chen", // Use a list of random names
    day: String(randomNum(1, 28)).padStart(2, '0'),
    month: String(randomNum(1, 12)).padStart(2, '0'),
    year: String(randomNum(1980, 2005)),
    houseNumber: String(randomNum(1, 999)),
    streetName: "Oak Avenue", // Use a list of street names
    city: "Newfield", // Use a list of cities
    state: "CA", // Use a valid state code for the dropdown
    postalCode: String(randomNum(10000, 99999)),
    telephone: String(randomNum(2000000000, 9999999999)),
    cellNumber: String(randomNum(2000000000, 9999999999)),
    gender: "F", // Use a valid value like M or F
    email: `testuser.${now}@example.com`,
  };
}
```