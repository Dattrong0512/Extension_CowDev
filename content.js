// Listen for messages from background script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'FILL_FORM') {
    fillFormAndSubmit(message);
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'DEBUG_TRANSACTION') {
    debugTransaction(message.transactionId);
    sendResponse({ success: true });
    return true;
  }

  if (message.action === 'SCRAPE_SELECT_OPTIONS') {
    try {
      const selId = message.selectId || '';
      let selector = selId;
      if (selector && !selector.startsWith('#') && !selector.startsWith('.')) selector = `#${selector}`;
      const el = document.querySelector(selector);
      if (!el || el.tagName !== 'SELECT') {
        sendResponse({ success: false, error: 'SELECT_NOT_FOUND', options: [] });
        return true;
      }
      // Collect visible labels for options (not the value attribute)
      // Rationale: For dropdowns like State, users expect 'Johor', 'Kedah', ...
      // rather than coded values like '01', '02'.
      const raw = Array.from(el.options || []).map(o => {
        const text = ((o.textContent || o.label || '')).trim();
        const value = (o.value || '').trim();
        // Prefer the human-readable text; fall back to value if text is empty
        return text || value;
      });
      // Filter empties/placeholders and dedupe while preserving order
      const seen = new Set();
      const options = raw.filter(v => {
        if (!v) return false;
        const t = String(v).trim();
        if (t === '') return false;
        const lower = t.toLowerCase();
        if (lower === 'not selected' || lower === 'select' || lower === 'please select') return false;
        if (seen.has(t)) return false;
        seen.add(t);
        return true;
      });
      sendResponse({ success: true, options });
    } catch (e) {
      sendResponse({ success: false, error: String(e), options: [] });
    }
    return true;
  }

  // Allow background to ask for the latest Transaction ID again (re-check/poll)
  if (message.action === 'GET_TRANSACTION') {
    (async () => {
      try {
        const timeoutMs = typeof message.timeoutMs === 'number' ? message.timeoutMs : 20000;
        const intervalMs = typeof message.intervalMs === 'number' ? message.intervalMs : 800;
        const txn = await extractTransactionId('', '', message.testCaseNumber || 0, message.runId || '', { timeoutMs, intervalMs, silent: true });
        // In silent mode, we only return the value to the background script
        // If extractTransactionId returned 'NOT_FOUND', send as such
        sendResponse({ success: true, transactionId: txn });
      } catch (e) {
        sendResponse({ success: false, error: String(e) });
      }
    })();
    return true;
  }
});

// Function to fill form with random data and submit
async function fillFormAndSubmit(config) {
  const { country, sandboxFieldKey, sandboxValue, fieldToTest, testCaseValue, testCaseNumber, runTestTransaction, runId } = config;
  
  console.log(`========== TEST CASE ${testCaseNumber} ==========`);
  console.log(`Country: ${country}`);
  console.log(`Sandbox: ${sandboxFieldKey} = ${sandboxValue}`);
  console.log(`Field to test: ${fieldToTest}`);
  console.log(`Test value: ${testCaseValue}`);
  console.log(`Run Test Transaction: ${runTestTransaction}`);
  
  // Step 1: Handle country selection first
  console.log('Step 1: Selecting country...');
  await selectCountry(country);
  
  // Wait a bit longer for the page to update after country change
  console.log('Waiting for page to update after country change...');
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Step 2: Generate random data
  console.log('Step 2: Generating random data...');
  const randomData = await generateRandomData();
  
  console.log('Generated data:', randomData);
  
  // Step 3: Apply Sandbox override into data model (only for well-known keys)
  try {
    if (sandboxFieldKey && sandboxFieldKey in randomData) {
      randomData[sandboxFieldKey] = sandboxValue;
    }
  } catch (_) {}
  
  // Step 4: Override the specific field being tested with the test case value
  // IMPORTANT: If the provided test case value is empty, do NOT override the generated value.
  // This guarantees we still submit valid data and obtain a Transaction ID for all 5 cases.
  const hasExplicitTestCase = (typeof testCaseValue === 'string') ? (testCaseValue.trim() !== '') : (testCaseValue != null && testCaseValue !== '');
  switch(fieldToTest) {
    case 'CellNumber':
      if (hasExplicitTestCase) randomData.cellNumber = testCaseValue;
      break;
    case 'Telephone':
      if (hasExplicitTestCase) randomData.telephone = testCaseValue;
      break;
    case 'PostalCode':
      if (hasExplicitTestCase) randomData.postalCode = testCaseValue;
      break;
    case 'EmailAddress':
      if (hasExplicitTestCase) randomData.email = testCaseValue;
      break;
    case 'Gender':
      if (hasExplicitTestCase) randomData.gender = testCaseValue;
      break;
    case 'StateProvince':
      if (hasExplicitTestCase) randomData.state = testCaseValue;
      break;
  }
  
  // Step 4: Fill form fields safely
  // Fill all text fields
  safeSetValue('#textarea-field-FirstName', randomData.firstName);
  safeSetValue('#textarea-field-LastName', randomData.lastName);
  safeSetValue('#number-range-field-DayOfBirth', randomData.day);
  safeSetValue('#number-range-field-MonthOfBirth', randomData.month);
  safeSetValue('#number-range-field-YearOfBirth', randomData.year);
  safeSetValue('#textarea-field-HouseNumber', randomData.houseNumber);
  safeSetValue('#textarea-field-StreetName', randomData.streetName);
  safeSetValue('#textarea-field-City', randomData.city);
  safeSetValue('#textarea-field-PostalCode', randomData.postalCode);
  safeSetValue('#textarea-field-Telephone', randomData.telephone);
  safeSetValue('#textarea-field-CellNumber', randomData.cellNumber);
  safeSetValue('#textarea-field-EmailAddress', randomData.email);
  
  // Only fill dropdown fields if they are NOT the field being tested
  if (fieldToTest !== 'StateProvince') {
    // For State Province, pick a random option from the DOM select list
    await setSelectRandom('#option-field-StateProvince');
  } else {
    // If StateProvince is being tested:
    if (hasExplicitTestCase) {
      // try to set by value or visible text
      await setSelectByTextOrValue('#option-field-StateProvince', testCaseValue);
    } else {
      // no explicit value provided -> keep it valid by selecting a random option
      console.warn(`Test Case ${testCaseNumber}: No explicit State/Province provided; using random option`);
      await setSelectRandom('#option-field-StateProvince');
    }
  }
  
  if (fieldToTest !== 'Gender') {
    safeSetValue('#option-field-Gender', randomData.gender);
  } else {
    // If Gender is being tested
    if (hasExplicitTestCase) {
      // use the explicit test case value
      safeSetValue('#option-field-Gender', testCaseValue);
    } else {
      // no explicit value provided -> keep generated random gender
      console.warn(`Test Case ${testCaseNumber}: No explicit Gender provided; using random value`);
      safeSetValue('#option-field-Gender', randomData.gender);
    }
  }

  // Step 4b: Apply any custom DOM fields the user added via Field Manager
  try {
    await applyCustomDomFields();
  } catch (e) {
    console.warn('applyCustomDomFields error', e);
  }

  // Step 4c: Ensure the chosen Sandbox field is set on the actual DOM (overrides any earlier random fill)
  try {
    await applySandboxOverrideToDom(sandboxFieldKey, sandboxValue);
  } catch (e) {
    console.warn('applySandboxOverrideToDom error', e);
  }
  
  console.log('Form filled with data:', randomData);

  // Step 5: Optionally click the "Run a test transaction" checkbox on the web page
  console.log('========================================');
  console.log('STEP 5: HANDLE "RUN A TEST TRANSACTION" CHECKBOX');
  console.log('========================================');

  // Only attempt to check it if the user enabled this option in the popup
  if (runTestTransaction) {
    // Wait for page widgets to stabilize
    await new Promise(resolve => setTimeout(resolve, 1500));

    const checkboxElement = findRunTestTransactionCheckbox();

    if (checkboxElement) {
      console.log('→ Target checkbox found. State before:', {
        checked: checkboxElement.checked,
        disabled: checkboxElement.disabled,
        visible: checkboxElement.offsetParent !== null
      });

      checkboxElement.scrollIntoView({ behavior: 'instant', block: 'center' });

      // Prefer native click so bound listeners run, then assert checked
      try {
        checkboxElement.click();
      } catch (_) {
        // Fallback to programmatic state + events
        checkboxElement.checked = true;
      }

      // Fire common events to satisfy reactive frameworks
      checkboxElement.dispatchEvent(new Event('input', { bubbles: true }));
      checkboxElement.dispatchEvent(new Event('change', { bubbles: true }));

      // Verify and, if needed, force the state
      await new Promise(resolve => setTimeout(resolve, 300));
      if (!checkboxElement.checked) {
        console.warn('Checkbox not checked after click; forcing checked=true');
        checkboxElement.checked = true;
        checkboxElement.dispatchEvent(new Event('change', { bubbles: true }));
      }

      console.log('✓ Checkbox state after:', { checked: checkboxElement.checked });
    } else {
      console.error('❌ Could not locate the "Run a test transaction" checkbox.');
      // Log helpful diagnostics without dumping the entire DOM
      const total = document.querySelectorAll('input[type="checkbox"]').length;
      console.log(`Diagnostics: page has ${total} checkbox inputs.`);
    }
  } else {
    console.log('Skipping checkbox: user disabled "Run a test transaction" in popup.');
  }
  
  // Additional wait before verify
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Step 6: Click verify button (robust)
  console.log('Step 6: Clicking verify button...');
  const didClick = await clickVerifyButtonRobust();
  if (!didClick) {
    console.error('Verify button not found or could not be clicked!');
    // Still report back so background can account for this test case
    chrome.runtime.sendMessage({
      action: 'FORM_SUBMITTED',
      transactionId: 'NOT_FOUND',
      fieldTested: fieldToTest,
      testCase: testCaseValue,
      testCaseNumber,
      runId
    });
    return;
  }

  // Step 7: Wait 2 seconds for verification to complete
  console.log('Waiting 2 seconds for verification...');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Step 8: Extract transaction ID
  console.log('Step 8: Extracting transaction ID...');
  // Be robust: poll the page for up to 30s until the Transaction ID appears
  await extractTransactionId(fieldToTest, testCaseValue, testCaseNumber, runId, { timeoutMs: 30000, intervalMs: 800, silent: false });
}

// Map of built-in field keys to their DOM selectors on the interface
const BUILTIN_FIELD_SELECTORS = {
  firstName: '#textarea-field-FirstName',
  lastName: '#textarea-field-LastName',
  day: '#number-range-field-DayOfBirth',
  month: '#number-range-field-MonthOfBirth',
  year: '#number-range-field-YearOfBirth',
  houseNumber: '#textarea-field-HouseNumber',
  streetName: '#textarea-field-StreetName',
  city: '#textarea-field-City',
  postalCode: '#textarea-field-PostalCode',
  telephone: '#textarea-field-Telephone',
  cellNumber: '#textarea-field-CellNumber',
  gender: '#option-field-Gender',
  state: '#option-field-StateProvince',
  email: '#textarea-field-EmailAddress',
  emailAddress: '#textarea-field-EmailAddress',
  stateProvince: '#option-field-StateProvince'
};

async function applySandboxOverrideToDom(fieldKey, value) {
  if (!fieldKey) return;
  // 1) If built-in mapping exists, use it
  const sel = BUILTIN_FIELD_SELECTORS[fieldKey];
  if (sel) {
    await safeSetValue(sel, value);
    return;
  }
  // 2) Otherwise, try custom fields (stored by Field Manager)
  const CUSTOM_FIELDS_KEY = 'devCowCustomFields';
  const fields = await new Promise(resolve => {
    chrome.storage.local.get([CUSTOM_FIELDS_KEY], (res) => resolve(res[CUSTOM_FIELDS_KEY] || {}));
  });
  const meta = fields[fieldKey];
  if (meta && meta.selector) {
    const el = findElementFlexible(meta.selector, meta.label || fieldKey);
    if (el) {
      await safeSetValue(el, value);
      return;
    }
  }
  // 3) Last resort: try by label text
  const fallback = findElementFlexible(`#${fieldKey}`, fieldKey);
  if (fallback) await safeSetValue(fallback, value);
}

// Load custom DOM fields and fill them with a random stored value
async function applyCustomDomFields() {
  const CUSTOM_FIELDS_KEY = 'devCowCustomFields';
  const FIELD_STORAGE_KEY = 'devCowFieldValues';

  const customFields = await new Promise(resolve => {
    chrome.storage.local.get([CUSTOM_FIELDS_KEY], (res) => resolve(res[CUSTOM_FIELDS_KEY] || {}));
  });
  if (!customFields || Object.keys(customFields).length === 0) return;

  // Load all values once
  const allValues = await new Promise(resolve => {
    chrome.storage.local.get([FIELD_STORAGE_KEY], (res) => resolve(res[FIELD_STORAGE_KEY] || {}));
  });

  for (const [key, meta] of Object.entries(customFields)) {
    const label = (meta && meta.label) || key;
    const selector = (meta && meta.selector) || '';
    if (!selector) continue; // can't fill without selector
    const values = allValues[key] || [];
    if (!Array.isArray(values) || values.length === 0) continue;
    const value = values[Math.floor(Math.random() * values.length)];

    // Try to resolve element flexibly (by selector/id/placeholder/label text)
    const sel = selector && (selector.startsWith('#') || selector.startsWith('.') || selector.includes('[') || selector.includes(' '))
      ? selector
      : `#${selector}`;
    const el = findElementFlexible(sel, label);
    if (el) {
      console.log(`Filling custom field "${label}" (${sel}) with value:`, value);
      await safeSetValue(el, value);
    } else {
      console.warn(`Custom field target not found for "${label}" using ${sel}`);
    }
  }
}

// Function to select country from the country picker
async function selectCountry(country) {
  console.log(`Selecting country: ${country}`);
  
  return new Promise((resolve) => {
    // Step 1: Find and click the "Change Country" button - try multiple selectors
    let changeCountryButton = document.querySelector('.change-country-button');
    
    // If not found, try looking for button by text content
    if (!changeCountryButton) {
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('Change Country') || btn.textContent.includes('change-country')) {
          changeCountryButton = btn;
          break;
        }
      }
    }
    
    if (!changeCountryButton) {
      console.error('Change country button not found!');
      resolve();
      return;
    }
    
    console.log('Clicking change country button...');
    changeCountryButton.click();
    
    // Step 2: Wait for country picker modal/dialog to appear
    setTimeout(() => {
      // Try multiple selectors for the country picker
      let countryPicker = document.querySelector('.country-picker');
      if (!countryPicker) {
        countryPicker = document.querySelector('div[class*="country"]');
      }
      
      if (!countryPicker) {
        console.error('Country picker not found!');
        resolve();
        return;
      }
      
      console.log('Country picker opened');
      
      // Step 3: Find the country in the list
      // Look for all radio buttons or labels with country names
      const labels = countryPicker.querySelectorAll('label');
      console.log(`Found ${labels.length} options in country picker`);
      
      let countryFound = false;
      
      for (const label of labels) {
        const labelText = label.textContent.trim();
        console.log(`Checking option: "${labelText}"`);
        
        // Check if this label matches the country we want
        if (labelText === country || labelText.includes(country)) {
          console.log(`Found matching country: ${country}`);
          
          // Find the radio input within or near this label
          let radio = label.querySelector('input[type="radio"]');
          if (!radio) {
            // Radio might be a sibling
            radio = label.previousElementSibling;
            if (!radio || radio.type !== 'radio') {
              radio = label.nextElementSibling;
            }
          }
          
          if (radio) {
            console.log('Clicking radio button for country');
            radio.click();
            
            // Trigger change event
            radio.dispatchEvent(new Event('change', { bubbles: true }));
            radio.dispatchEvent(new Event('click', { bubbles: true }));
            
            countryFound = true;
            
            // Wait for country selection to be applied and modal to close
            setTimeout(() => {
              console.log('Country selection completed');
              resolve();
            }, 2000);
            break;
          } else {
            // If no radio found, try clicking the label itself
            console.log('No radio found, clicking label');
            label.click();
            countryFound = true;
            setTimeout(() => {
              resolve();
            }, 2000);
            break;
          }
        }
      }
      
      if (!countryFound) {
        console.warn(`Country "${country}" not found in picker. Using default.`);
        resolve();
      }
    }, 1500);
  });
}

// Helper function to safely set field values
async function safeSetValue(targetOrSelector, value) {
  const element = typeof targetOrSelector === 'string' ? document.querySelector(targetOrSelector) : targetOrSelector;
  if (!element) { console.warn(`Element not found: ${targetOrSelector}`); return; }

  const dispatchAll = (el) => {
    try { el.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
    try { el.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
    try { el.dispatchEvent(new Event('blur', { bubbles: true })); } catch (_) {}
  };

  if (element.tagName === 'SELECT') {
    const options = Array.from(element.options || []);
    let matched = options.find(o => o.value == value);
    if (!matched) {
      const want = String(value || '').trim().toLowerCase();
      matched = options.find(o => (o.textContent || '').trim().toLowerCase() === want) ||
                options.find(o => (o.textContent || '').toLowerCase().includes(want));
    }
    if (matched) element.value = matched.value; else element.value = value;
    dispatchAll(element);
    return;
  }

  const tag = element.tagName;
  const type = (element.type || '').toLowerCase();
  try {
    if (tag === 'INPUT') {
      // Use native setter so React/Vue listeners fire
      const proto = type === 'checkbox' ? window.HTMLInputElement.prototype : window.HTMLInputElement.prototype;
      const setter = Object.getOwnPropertyDescriptor(proto, 'value') && Object.getOwnPropertyDescriptor(proto, 'value').set;
      if (setter) setter.call(element, value);
      else element.value = value;
      if (type === 'checkbox') element.checked = !!value;
      dispatchAll(element);
    } else if (tag === 'TEXTAREA') {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      if (setter) setter.call(element, value); else element.value = value;
      dispatchAll(element);
    } else if (element.isContentEditable) {
      element.textContent = value;
      dispatchAll(element);
    } else {
      // Fallback for uncommon controls
      element.value = value;
      dispatchAll(element);
    }
  } catch (e) {
    console.warn('safeSetValue error:', e);
  }
}

// Flexible element finder: accepts CSS selector or raw id, with fallback to label/placeholder/aria-label
function findElementFlexible(selectorOrId, labelHint = '') {
  const norm = (s) => (s || '').toString().trim();
  const trySelector = (sel) => {
    try { return document.querySelector(sel); } catch (_) { return null; }
  };

  // 1) If looks like a selector (#, ., [), try directly
  let el = null;
  if (/^[#.\[]/.test(selectorOrId) || selectorOrId.includes(' ')) {
    el = trySelector(selectorOrId);
    if (el) return el;
  }

  // 2) Try by id (raw)
  const rawId = selectorOrId.replace(/^#/, '').trim();
  if (rawId) {
    el = document.getElementById(rawId);
    if (el) return el;
  }

  // 3) Fallback by placeholder/name/aria-label using label text or id text
  const hint = norm(labelHint || rawId || selectorOrId).toLowerCase();
  if (hint) {
    const candidates = Array.from(document.querySelectorAll('input, textarea, select, [contenteditable="true"]'));
    el = candidates.find(c => {
      const txt = `${c.getAttribute('placeholder') || ''} ${c.getAttribute('aria-label') || ''} ${c.name || ''}`.toLowerCase();
      return txt.includes(hint);
    });
    if (el) return el;

    // 4) Label text -> control
    const labels = Array.from(document.querySelectorAll('label'));
    const labelEl = labels.find(l => (l.textContent || '').trim().toLowerCase().includes(hint));
    if (labelEl) {
      if (labelEl.control) return labelEl.control;
      const forId = labelEl.getAttribute('for');
      if (forId) {
        const byFor = document.getElementById(forId);
        if (byFor) return byFor;
      }
      const nested = labelEl.querySelector('input, textarea, select, [contenteditable="true"]');
      if (nested) return nested;
    }
  }

  return null;
}

// Robust finder for the Verify button (supports id, text, value, and same-origin iframes)
function findVerifyButton() {
  const matchButton = (root) => {
    const byId = root.querySelector('#verification-button');
    if (byId) return byId;
    const candidates = Array.from(root.querySelectorAll('button, input[type="button"], input[type="submit"], a[role="button"]'));
    const isVerifyText = (el) => /\bverify\b/i.test((el.textContent || el.value || '').trim());
    return candidates.find(isVerifyText) || null;
  };

  // Try main document
  let btn = matchButton(document);
  if (btn) return btn;

  // Try same-origin iframes
  const iframes = Array.from(document.querySelectorAll('iframe'));
  for (const f of iframes) {
    try {
      const doc = f.contentDocument || f.contentWindow?.document;
      if (!doc) continue;
      btn = matchButton(doc);
      if (btn) return btn;
    } catch (_) {
      // Cross-origin, skip
    }
  }
  return null;
}

// Attempts to click the Verify button reliably by waiting for it to appear and become enabled.
// Returns true if a click (or form submit fallback) was triggered, else false.
async function clickVerifyButtonRobust(timeoutMs = 8000) {
  const start = Date.now();
  const wait = (ms) => new Promise(r => setTimeout(r, ms));

  const isEnabled = (btn) => !(
    !btn || btn.disabled || btn.getAttribute('disabled') !== null || btn.getAttribute('aria-disabled') === 'true'
  );
  const isVisible = (el) => {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return rect && rect.width > 0 && rect.height > 0;
  };

  while (Date.now() - start < timeoutMs) {
    const btn = findVerifyButton();
    if (btn) {
      try { btn.scrollIntoView({ behavior: 'instant', block: 'center' }); } catch (_) {}
      if (!isVisible(btn)) { await wait(150); }
      if (!isEnabled(btn)) { await wait(200); continue; }
      try { btn.click(); } catch (_) { btn.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
      return true;
    }
    await wait(250);
  }

  // Fallback: try submitting the nearest form
  try {
    const altBtn = findVerifyButton();
    const form = altBtn ? altBtn.closest('form') : document.querySelector('form');
    if (form) {
      if (typeof form.requestSubmit === 'function') form.requestSubmit(); else form.submit();
      return true;
    }
  } catch (_) {}
  return false;
}

// Helpers for selects
async function setSelectByTextOrValue(selector, desired) {
  const el = document.querySelector(selector);
  if (!el || el.tagName !== 'SELECT') { safeSetValue(selector, desired); return; }
  const options = Array.from(el.options || []);
  // Prefer exact value match
  let opt = options.find(o => o.value == desired);
  if (!opt) {
    // Try by trimmed visible text
    const want = String(desired || '').trim().toLowerCase();
    opt = options.find(o => (o.textContent || '').trim().toLowerCase() === want);
  }
  if (!opt && desired) {
    // Try contains text (fallback)
    const want = String(desired).trim().toLowerCase();
    opt = options.find(o => (o.textContent || '').toLowerCase().includes(want));
  }
  if (opt) el.value = opt.value;
  // dispatch events regardless so listeners fire
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

async function setSelectRandom(selector, predicate) {
  const el = document.querySelector(selector);
  if (!el || el.tagName !== 'SELECT') return;
  const options = Array.from(el.options || []);
  // Filter out placeholders like 'Not Selected' and empty values
  const usable = options.filter(o => {
    const text = (o.textContent || '').trim().toLowerCase();
    const val = (o.value || '').trim();
    if (!val && !text) return false;
    if (text.includes('not selected')) return false;
    if (typeof predicate === 'function') return predicate(o);
    return true;
  });
  if (usable.length === 0) return;
  const pick = usable[Math.floor(Math.random() * usable.length)];
  el.value = pick.value;
  el.dispatchEvent(new Event('change', { bubbles: true }));
  el.dispatchEvent(new Event('input', { bubbles: true }));
}

// Heuristic finder for the "Run a test transaction" checkbox on various UIs
function findRunTestTransactionCheckbox() {
  // 1) Obvious ids/names/title/aria-label matches
  const checkboxes = Array.from(document.querySelectorAll('input[type="checkbox"]'));
  const match = (s) => (s || '').toString().toLowerCase();
  const textMatches = (t) => /run\s*a\s*test\s*transaction/.test(match(t));

  // Try attribute-based match first
  let target = checkboxes.find(cb => {
    const mId = match(cb.id);
    const mName = match(cb.name);
    const mTitle = match(cb.title);
    const mAria = match(cb.getAttribute('aria-label'));
    return (
      mId.includes('test') && mId.includes('transaction') ||
      mName.includes('test') && mName.includes('transaction') ||
      textMatches(mTitle) ||
      textMatches(mAria)
    );
  });

  if (target) return target;

  // 2) Label with text "Run a test transaction" (case-insensitive), using 'for' linkage or nesting
  const labels = Array.from(document.querySelectorAll('label'));
  for (const label of labels) {
    if (textMatches(label.textContent)) {
      // If label is linked to a control
      if (label.control && label.control.type === 'checkbox') return label.control;
      const forId = label.getAttribute('for');
      if (forId) {
        const byFor = document.getElementById(forId);
        if (byFor && byFor.type === 'checkbox') return byFor;
      }
      // Or nested checkbox within label
      const nested = label.querySelector('input[type="checkbox"]');
      if (nested) return nested;
    }
  }

  // 3) Class-based legacy selector used previously
  const legacy = document.querySelector('input[type="checkbox"].regular-checkbox');
  if (legacy) return legacy;

  // 4) If the page has exactly one checkbox, assume it's the one
  if (checkboxes.length === 1) return checkboxes[0];

  // Not found confidently
  return null;
}

// Helper: expand accordion sections by header visible text
function expandAccordionSectionByText(text) {
  try {
    const headers = Array.from(document.querySelectorAll('h3, .ui-accordion-header, .accordion-header'));
    for (const h of headers) {
      const t = (h.textContent || '').trim();
      if (!t) continue;
      // Normalize spacing and casing for comparison
      if (t.replace(/\s+/g, ' ').toLowerCase().includes(text.toLowerCase())) {
        // If the header appears collapsed, try to click it
        // Many accordions hide content with aria-expanded or classes
        const aria = h.getAttribute && h.getAttribute('aria-expanded');
        if (aria === 'false' || h.className.match(/collapsed|ui-accordion-header-collapsed/i)) {
          h.scrollIntoView({ behavior: 'instant', block: 'center' });
          try { h.click(); } catch (_) { h.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
        } else if (aria === null) {
          // If no aria attribute, still attempt to click if content is hidden
          try { h.click(); } catch (_) { h.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
        }
        // Also attempt to expand nearby toggles (a caret button etc.)
        const toggle = h.querySelector('button, .toggle, .ui-accordion-header-icon');
        if (toggle) {
          try { toggle.click(); } catch (_) { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
        }
      }
    }
  } catch (e) { console.warn('expandAccordionSectionByText error', e); }
}

// Attach listener for Lookup button clicks and expand after results load
function attachLookupExpandListener() {
  // Try known selectors first
  const selectors = [
    'input[type="submit"][value="Lookup"]',
    'input[type="button"][value="Lookup"]',
    'button[type="submit"]',
    'button[value="Lookup"]',
    'input[value="Lookup"]',
    '#lookup-button',
    'a.lookup'
  ];

  // Helper to bind to an element
  const bind = (el) => {
    if (!el) return false;
    // Avoid double-binding
    if (el.__lookupBound) return true;
    el.addEventListener('click', () => {
      // Mark intent in session storage so we can auto-expand after navigation
      try { sessionStorage.setItem('cowdev_expand_after_lookup', '1'); } catch (_) {}
      // Give the page time to render results after lookup, then run robust expander
      setTimeout(() => {
        try { expandDebugAccordion(); } catch (e) { console.warn('expandDebugAccordion error after Lookup click', e); }
      }, 5000);
    });
    el.__lookupBound = true;
    return true;
  };

  // Query by selectors
  for (const sel of selectors) {
    try {
      const nodes = Array.from(document.querySelectorAll(sel));
      for (const n of nodes) if (bind(n)) return;
    } catch (e) { /* selector might be invalid like :contains in querySelectorAll */ }
  }

  // Fallback: find input/button with text 'Lookup'
  const buttons = Array.from(document.querySelectorAll('input[type="submit"], input[type="button"], button, a'));
  for (const b of buttons) {
    if ((b.value || b.textContent || '').trim().toLowerCase().includes('lookup')) {
      bind(b);
      return;
    }
  }

  // If not found, observe the DOM for additions and bind when available
  const observer = new MutationObserver((mutations, obs) => {
    for (const m of mutations) {
      for (const node of Array.from(m.addedNodes || [])) {
        if (!(node instanceof Element)) continue;
        if ((node.textContent || '').toLowerCase().includes('lookup')) {
          if (bind(node)) { obs.disconnect(); return; }
        }
        const btn = node.querySelector && node.querySelector('input[type="submit"], input[type="button"], button, a');
        if (btn && (btn.value || btn.textContent || '').toLowerCase().includes('lookup')) {
          if (bind(btn)) { obs.disconnect(); return; }
        }
      }
    }
  });
  observer.observe(document.documentElement || document.body, { childList: true, subtree: true });
}

// If a Lookup just occurred (navigation), keep trying to expand until it works
function maybeStartPostLookupWatcher() {
  let flag = '0';
  try { flag = sessionStorage.getItem('cowdev_expand_after_lookup') || '0'; } catch (_) {}
  if (flag !== '1') return;

  const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const isHeaderExpandedQuick = (header) => {
    if (!header) return false;
    const aria = header.getAttribute('aria-expanded');
    if (aria === 'true') return true;
    const panel = header.nextElementSibling;
    if (panel) {
      const cs = window.getComputedStyle(panel);
      if (cs && cs.display !== 'none' && cs.visibility !== 'hidden' && panel.clientHeight > 0) return true;
    }
    return false;
  };

  const bothExpanded = () => {
    const headers = Array.from(document.querySelectorAll('h3.ui-accordion-header, .ui-accordion-header, h3, .accordion-header'));
    const getByText = (needle) => headers.find(h => normalize(h.textContent).includes(needle));
    const hr = getByText('human readable');
    const dr = getByText('debug raw datasource response') || getByText('debug raw datasource responses') || getByText('debug raw');
    return !!(hr && isHeaderExpandedQuick(hr) && dr && isHeaderExpandedQuick(dr));
  };

  let attempts = 0;
  const maxAttempts = 15; // ~15 attempts with intervals below

  const tryExpand = () => {
    attempts++;
    console.log(`Post-lookup expand attempt ${attempts}/${maxAttempts}`);
    try { expandDebugAccordion(); } catch (e) { console.warn('expandDebugAccordion error (post-lookup watcher)', e); }
    // verify a bit later
    setTimeout(() => {
      if (bothExpanded()) {
        console.log('✅ Post-lookup: target accordions expanded');
        try { sessionStorage.removeItem('cowdev_expand_after_lookup'); } catch (_) {}
        return; // stop attempting
      }
      if (attempts < maxAttempts) {
        setTimeout(tryExpand, 800);
      } else {
        console.warn('❌ Post-lookup: failed to expand accordions after max retries');
        try { sessionStorage.removeItem('cowdev_expand_after_lookup'); } catch (_) {}
      }
    }, 1200);
  };

  // Start after a short delay to allow DOM to appear
  setTimeout(tryExpand, 1200);

  // Also watch the DOM; when headers appear, trigger another attempt
  const obs = new MutationObserver(() => {
    if (bothExpanded()) {
      try { sessionStorage.removeItem('cowdev_expand_after_lookup'); } catch (_) {}
      obs.disconnect();
      return;
    }
  });
  try { obs.observe(document.documentElement || document.body, { childList: true, subtree: true }); } catch (_) {}
}

// Initialize listener soon after script load
setTimeout(() => { try { attachLookupExpandListener(); } catch (e) { console.warn('attachLookupExpandListener failed', e); } }, 1000);
setTimeout(() => { try { maybeStartPostLookupWatcher(); } catch (e) { console.warn('maybeStartPostLookupWatcher failed', e); } }, 1200);
// As a safety net, even if we didn't click Lookup, attempt to auto-expand on debug pages
setTimeout(() => { try { maybeAlwaysExpandOnDebugPage(); } catch (e) { console.warn('maybeAlwaysExpandOnDebugPage failed', e); } }, 2000);

function maybeAlwaysExpandOnDebugPage() {
  // Detect the Debug page via URL or DOM hints
  const href = (location && location.href) || '';
  const likelyDebug = /GCDebug\/DebugRecordTransaction/i.test(href) || document.getElementById('debugform');
  if (!likelyDebug) return;

  const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const isHeaderExpandedQuick = (header) => {
    if (!header) return false;
    const aria = header.getAttribute('aria-expanded');
    if (aria === 'true') return true;
    const panel = header.nextElementSibling;
    if (panel) {
      const cs = window.getComputedStyle(panel);
      if (cs && cs.display !== 'none' && cs.visibility !== 'hidden' && panel.clientHeight > 0) return true;
    }
    return false;
  };

  const headers = () => Array.from(document.querySelectorAll('h3.ui-accordion-header, .ui-accordion-header, h3, .accordion-header'));
  const findHeader = (needle) => headers().find(h => normalize(h.textContent).includes(needle));

  const bothExpanded = () => {
    const hr = findHeader('human readable');
    const dr = findHeader('debug raw datasource response') || findHeader('debug raw datasource responses') || findHeader('debug raw');
    return !!(hr && isHeaderExpandedQuick(hr) && dr && isHeaderExpandedQuick(dr));
  };

  let tries = 0;
  const max = 12;
  const tick = () => {
    tries++;
    if (bothExpanded()) return; // already good
    try { expandDebugAccordion(); } catch (_) {}
    if (tries < max) setTimeout(tick, 900);
  };
  tick();
}

// Function to extract transaction ID from the page
async function extractTransactionId(fieldTested, testCaseValue, testCaseNumber, runId, { timeoutMs = 30000, intervalMs = 800, silent = false } = {}) {
  console.log('Looking for transaction ID (with polling)...');

  const tryOnce = () => {
    let transactionId = null;

    // Method 1: Look for the specific span with "Transaction ID:" label
    const allSpans = document.querySelectorAll('span.label');
    for (const span of allSpans) {
      if (span.textContent.includes('Transaction ID:')) {
        // The value should be in the next span with class "value"
        const valueSpan = span.nextElementSibling;
        if (valueSpan && valueSpan.classList.contains('value')) {
          transactionId = valueSpan.textContent.trim();
          console.log(`Transaction ID found in span.value: ${transactionId}`);
          break;
        }

        // Alternative: value might be in the same parent element
        const parent = span.parentElement;
        if (parent) {
          const valueInParent = parent.querySelector('span.value');
          if (valueInParent) {
            transactionId = valueInParent.textContent.trim();
            console.log(`Transaction ID found in parent span.value: ${transactionId}`);
            break;
          }
        }
      }
    }

    // Method 2: Look for span.label containing "Transaction ID" anywhere in the row
    if (!transactionId) {
      const labels = document.querySelectorAll('span.label');
      for (const label of labels) {
        const text = label.textContent.trim();
        if (text.includes('Transaction ID')) {
          // Try to find the value in siblings or nearby elements
          const row = label.closest('tr') || label.closest('td') || label.parentElement;
          if (row) {
            const valueSpan = row.querySelector('span.value[data-hj-suppress="true"]') ||
                             row.querySelector('span.value');
            if (valueSpan) {
              transactionId = valueSpan.textContent.trim();
              console.log(`Transaction ID found via row search: ${transactionId}`);
              break;
            }
          }
        }
      }
    }

    // Method 3: Look for input field with TransactionID in the name
    if (!transactionId) {
      const transactionInput = document.querySelector('input[name*="TransactionID" i]') ||
                              document.querySelector('input[id*="TransactionID" i]') ||
                              document.querySelector('input[name*="TransactionRecordID" i]') ||
                              document.querySelector('input[id*="TransactionRecordID" i]') ||
                              document.querySelector('span[class*="transaction" i]');

      if (transactionInput) {
        transactionId = (transactionInput.value || transactionInput.textContent || '').trim();
        if (transactionId) console.log(`Transaction ID found in input/span: ${transactionId}`);
      }
    }

    // Method 4: Search in page text as last resort
    if (!transactionId) {
      const pageText = document.body ? document.body.innerText : '';
      const patterns = [
        /Transaction\s*ID[:\s]+([A-Za-z0-9-]{20,})/i,
        /TransactionID[:\s]+([A-Za-z0-9-]{20,})/i
      ];

      for (const pattern of patterns) {
        const match = pageText.match(pattern);
        if (match) {
          transactionId = match[1];
          console.log(`Transaction ID found via pattern: ${transactionId}`);
          break;
        }
      }
    }

    return transactionId && transactionId.trim() ? transactionId.trim() : null;
  };

  const start = Date.now();
  let found = null;
  // Poll until timeout
  while ((Date.now() - start) < timeoutMs) {
    try {
      found = tryOnce();
    } catch (e) {
      // ignore and retry
    }
    if (found) break;
    await new Promise(r => setTimeout(r, intervalMs));
  }

  const finalId = found || 'NOT_FOUND';
  console.log(`Final Transaction ID extracted: ${finalId}`);

  // Optionally notify background
  if (!silent) {
    chrome.runtime.sendMessage({
      action: 'FORM_SUBMITTED',
      transactionId: finalId,
      fieldTested: fieldTested,
      testCase: testCaseValue,
      testCaseNumber: testCaseNumber,
      runId
    });
  }

  return finalId;
}

// Function to debug a transaction
function debugTransaction(transactionId) {
  console.log(`========== DEBUGGING TRANSACTION ==========`);
  console.log(`Transaction ID: ${transactionId}`);
  
  // Wait a moment for page to fully load
  setTimeout(() => {
    // Find the debug input field - it's a text input before the "Lookup" button
    // Based on screenshot: input field has placeholder "TransactionRecordID/TransactionID"
    let debugInput =
      // Prefer explicit name/id matches
      document.querySelector('input[type="text"][name*="TransactionRecordID" i]') ||
      document.querySelector('input[type="text"][id*="TransactionRecordID" i]') ||
      document.querySelector('input[type="text"][name*="TransactionID" i]') ||
      document.querySelector('input[type="text"][id*="TransactionID" i]') ||
      // Fall back to placeholder text
      document.querySelector('input[type="text"][placeholder*="TransactionRecordID" i]') ||
      document.querySelector('input[type="text"][placeholder*="TransactionID" i]') ||
      document.querySelector('input[type="text"]');
    
    // Also try finding by looking for input near "Lookup" button
    if (!debugInput) {
      const lookupButton = document.querySelector('input[type="submit"][value="Lookup"]') ||
                          document.querySelector('button[type="submit"]');
      if (lookupButton) {
        // Find the closest text input before the button
        const form = lookupButton.closest('form') || lookupButton.parentElement;
        if (form) {
          // Try to pick the input that is placed before the lookup button within the form
          const candidates = Array.from(form.querySelectorAll('input[type="text"]'));
          if (candidates.length === 1) debugInput = candidates[0];
          else if (candidates.length > 1) {
            // choose the one with transaction-ish name/id/placeholder
            debugInput = candidates.find(el => /transaction(record)?id/i.test(el.name || '') || /transaction(record)?id/i.test(el.id || '') || /transaction/i.test(el.placeholder || '')) || candidates[0];
          }
        }
      }
    }
    
    if (debugInput) {
      console.log('Found debug input field');
      
      // Clear any existing value
      debugInput.value = '';
      
      // Set the transaction ID
      debugInput.value = transactionId;
      
      // Focus the input
      debugInput.focus();
      
      // Trigger multiple events to ensure the value is recognized
      debugInput.dispatchEvent(new Event('input', { bubbles: true }));
      debugInput.dispatchEvent(new Event('change', { bubbles: true }));
      debugInput.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true }));
      debugInput.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
      
      console.log(`Transaction ID "${transactionId}" pasted into debug field`);
      
      // Find and click the Lookup button
      let lookupButton = document.querySelector('input[type="submit"][value="Lookup"]');
      
      if (!lookupButton) {
        // Try other selectors for the lookup button
        lookupButton = document.querySelector('button[type="submit"]') ||
                       document.querySelector('input[type="submit"]') ||
                       document.querySelector('button:contains("Lookup")');
      }
      
      if (lookupButton) {
        console.log('Found Lookup button, clicking in 1 second...');
        setTimeout(() => {
          try { sessionStorage.setItem('cowdev_expand_after_lookup', '1'); } catch (_) {}
          lookupButton.click();
          console.log('Lookup button clicked!');
          
          // After lookup, wait for results to load then expand accordions
          console.log('Waiting 5 seconds for debug results to load...');
          setTimeout(() => {
            console.log('Now attempting to expand accordions...');
            expandDebugAccordion();
          }, 5000); // Increased to 5 seconds for more reliable loading
        }, 1000);
      } else {
        console.error('Lookup button not found!');
        // Log all submit buttons for debugging
        const allSubmits = document.querySelectorAll('input[type="submit"], button[type="submit"]');
        console.log(`Found ${allSubmits.length} submit buttons:`);
        allSubmits.forEach((btn, idx) => {
          console.log(`  ${idx}: ${btn.tagName} - value="${btn.value}" text="${btn.textContent}"`);
        });
      }
    } else {
      console.error('Debug input field not found!');
      // Log all text inputs for debugging
      const allInputs = document.querySelectorAll('input[type="text"]');
      console.log(`Found ${allInputs.length} text inputs on page`);
      allInputs.forEach((input, idx) => {
        console.log(`  ${idx}: placeholder="${input.placeholder}" name="${input.name}" id="${input.id}"`);
      });
    }
  }, 1000);
}

// Function to expand accordion/dropdown to show debug details
function expandDebugAccordion() {
  console.log('========================================');
  console.log('EXPANDING SPECIFIC DEBUG ACCORDIONS');
  console.log('========================================');

  // Small utility to determine if an accordion header appears expanded/visible
  const isHeaderExpanded = (header) => {
    try {
      const aria = header.getAttribute('aria-expanded');
      if (aria === 'true') return true;
      // Try common panel sibling visibility
      const panel = header.nextElementSibling;
      if (panel && (panel.matches('.ui-accordion-content, [role="region"], [role="tabpanel"]'))) {
        const style = window.getComputedStyle(panel);
        if (style && style.display !== 'none' && style.visibility !== 'hidden' && panel.clientHeight > 0) return true;
      }
    } catch (_) {}
    return false;
  };

  const clickHeader = (header) => {
    try { header.scrollIntoView({ behavior: 'instant', block: 'center' }); } catch (_) {}
    try { header.click(); } catch (_) { header.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
    // Also try clicking any inline toggle icon/button inside the header
    const toggle = header.querySelector('button, .toggle, .ui-accordion-header-icon');
    if (toggle) {
      try { toggle.click(); } catch (_) { toggle.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
    }
  };

  const ensureExpanded = async (header, label) => {
    const maxAttempts = 4;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const expanded = isHeaderExpanded(header);
      if (expanded) {
        console.log(`  ✓ "${label}" expanded (attempt ${attempt})`);
        return true;
      }
      console.log(`  → Clicking "${label}" (attempt ${attempt})`);
      clickHeader(header);
      // wait a bit for UI framework to toggle
      await new Promise(r => setTimeout(r, 350));
    }
    const finalExpanded = isHeaderExpanded(header);
    if (!finalExpanded) console.warn(`  ❌ Failed to expand "${label}" after retries`);
    return finalExpanded;
  };

  // Wait for page to load, then click specific accordions
  setTimeout(async () => {
    const headers = Array.from(document.querySelectorAll('h3.ui-accordion-header, .ui-accordion-header, h3, .accordion-header'));
    console.log(`Found ${headers.length} accordion-like headers`);

    const normalize = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const targets = [
      { match: 'human readable', label: 'Human Readable' },
      { match: 'debug raw datasource response', label: 'Debug Raw Datasource Response' },
      { match: 'debug raw datasource responses', label: 'Debug Raw Datasource Responses' },
      { match: 'debug raw', label: 'Debug Raw' }
    ];

    let foundAny = false;
    for (const { match, label } of targets) {
      const header = headers.find(h => normalize(h.textContent).includes(match));
      if (header) {
        foundAny = true;
        await ensureExpanded(header, label);
      }
    }

    if (!foundAny) {
      console.warn('⚠️ Expected debug accordions not found by text');
    }

    // Verification log after a short delay
    setTimeout(() => {
      console.log('========================================');
      console.log('VERIFICATION:');
      const updated = Array.from(document.querySelectorAll('h3.ui-accordion-header, .ui-accordion-header, h3, .accordion-header'));
      updated.forEach((h, idx) => {
        const t = (h.textContent || '').trim();
        if (/human readable|debug raw datasource response|debug raw datasource responses|debug raw/i.test(t)) {
          const ok = isHeaderExpanded(h);
          const status = ok ? '✅' : '❌';
          console.log(`${status} ${idx}: "${t}"`);
        }
      });
      console.log('========================================');
    }, 800);

  }, 3000); // Wait 3 seconds for page to load
}
