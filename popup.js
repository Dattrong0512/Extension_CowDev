// Field names mapping
const FIELD_NAMES = {
  lastName: 'Last Name',
  firstName: 'First Name',
  dayOfBirth: 'Day of Birth',
  monthOfBirth: 'Month of Birth',
  yearOfBirth: 'Year of Birth',
  houseNumber: 'House Number',
  city: 'City',
  streetName: 'Street Name',
  postalCode: 'Postal Code',
  telephone: 'Telephone',
  cellNumber: 'Cell Number',
  gender: 'Gender',
  emailAddress: 'Email Address'
};

document.addEventListener('DOMContentLoaded', async function() {
  // Tab switching
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      
      // Remove active class from all
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked tab
      btn.classList.add('active');
      document.getElementById(targetTab).classList.add('active');
      
      // If switching to field manager, load all fields
      if (targetTab === 'field-manager') {
        loadFieldManager();
      }
    });
  });
  
  // Test Config Tab Logic
  const generateBtn = document.getElementById('generate-tests-btn');
  const statusDisplay = document.getElementById('status-display');
  // Country controls
  const countrySelect = document.getElementById('country-selector');
  const countryInput = document.getElementById('country-input');
  const countryAddBtn = document.getElementById('country-add-btn');
  const countryRemoveBtn = document.getElementById('country-remove-btn');
  // Sandbox controls (choose field and value)
  const sandboxFieldSelector = document.getElementById('sandbox-field-selector');
  const sandboxValueSelector = document.getElementById('sandbox-value-selector');

  // Field-to-test controls
  const fieldToTestSelect = document.getElementById('field-to-test');
  const fieldToTestInput = document.getElementById('field-to-test-input');
  const fieldToTestAddBtn = document.getElementById('field-to-test-add-btn');
  const fieldToTestRemoveBtn = document.getElementById('field-to-test-remove-btn');
  // DOM field add/remove controls
  const addDomFieldBtn = document.getElementById('add-dom-field-btn');
  const removeDomFieldBtn = document.getElementById('remove-dom-field-btn');
  const domIdInput = document.getElementById('new-dom-id');
  const domLabelInput = document.getElementById('new-dom-label');
  // Select dropdown field add/remove controls
  const addSelectFieldBtn = document.getElementById('add-select-field-btn');
  const removeSelectFieldBtn = document.getElementById('remove-select-field-btn');
  const selectIdInput = document.getElementById('new-select-id');
  const selectLabelInput = document.getElementById('new-select-label');
  // Checkbox field add/remove controls
  const addCheckboxFieldBtn = document.getElementById('add-checkbox-field-btn');
  const removeCheckboxFieldBtn = document.getElementById('remove-checkbox-field-btn');
  const checkboxIdInput = document.getElementById('new-checkbox-id');
  const checkboxLabelInput = document.getElementById('new-checkbox-label');
  
  // Handle URL dropdown changes
  const interfaceUrlSelect = document.getElementById('interface-url');
  const interfaceUrlCustom = document.getElementById('interface-url-custom');
  const debugUrlSelect = document.getElementById('debug-url');
  const debugUrlCustom = document.getElementById('debug-url-custom');
  
  interfaceUrlSelect.addEventListener('change', function() {
    if (this.value === 'custom') {
      interfaceUrlCustom.style.display = 'block';
      interfaceUrlCustom.focus();
    } else {
      interfaceUrlCustom.style.display = 'none';
    }
  });
  
  debugUrlSelect.addEventListener('change', function() {
    if (this.value === 'custom') {
      debugUrlCustom.style.display = 'block';
      debugUrlCustom.focus();
    } else {
      debugUrlCustom.style.display = 'none';
    }
  });

  generateBtn.addEventListener('click', function() {
    // Prevent multiple clicks
    generateBtn.disabled = true;
    statusDisplay.textContent = 'Starting tests...';

    // Gather all data from the form
    const country = document.getElementById('country-selector').value;
  const sandboxFieldKey = (sandboxFieldSelector && sandboxFieldSelector.value) || '';
  const sandboxValue = (sandboxValueSelector && sandboxValueSelector.value) || '';
    const fieldToTest = document.getElementById('field-to-test').value;
    const runTestTransaction = document.getElementById('run-test-transaction-checkbox').checked;
    const testCases = [
      document.getElementById('test-case-1').value,
      document.getElementById('test-case-2').value,
      document.getElementById('test-case-3').value,
      document.getElementById('test-case-4').value,
      document.getElementById('test-case-5').value
    ];
    
    // Get URLs from dropdowns or custom inputs
    let interfaceUrl = interfaceUrlSelect.value;
    if (interfaceUrl === 'custom') {
      interfaceUrl = interfaceUrlCustom.value;
    }
    
    let debugUrl = debugUrlSelect.value;
    if (debugUrl === 'custom') {
      debugUrl = debugUrlCustom.value;
    }

    // Validate inputs
    if (!fieldToTest) {
      statusDisplay.textContent = 'Please select a field to test!';
      generateBtn.disabled = false;
      return;
    }

    if (!sandboxFieldKey) {
      statusDisplay.textContent = 'Please select the Sandbox field!';
      generateBtn.disabled = false;
      return;
    }

    if (!interfaceUrl || !debugUrl) {
      statusDisplay.textContent = 'Please provide both URLs!';
      generateBtn.disabled = false;
      return;
    }

    // Allow blank test cases; do not block if all are empty.

    // Package data and send to background script
    const config = {
      country: country,
      sandboxFieldKey,
      sandboxValue,
      fieldToTest: fieldToTest,
      testCases: testCases,
      interfaceUrl: interfaceUrl,
      debugUrl: debugUrl,
      runTestTransaction: runTestTransaction
    };

    console.log('Sending config to background:', config);

    chrome.runtime.sendMessage({ 
      action: 'START_TESTS', 
      config: config 
    }, function(response) {
      if (response && response.success) {
        statusDisplay.textContent = 'Tests started successfully!';
      } else {
        statusDisplay.textContent = 'Error starting tests.';
        generateBtn.disabled = false;
      }
    });

    // Re-enable button after 3 seconds
    setTimeout(() => {
      generateBtn.disabled = false;
    }, 3000);
  });

  // Populate dynamic selectors on load
  await populateCountrySelector();
  await populateSandboxSelectors();
  await populateFieldToTestSelect();

  // React when sandbox field changes to refresh its values list
  if (sandboxFieldSelector) {
    sandboxFieldSelector.addEventListener('change', async () => {
      await populateSandboxValuesFor(sandboxFieldSelector.value);
    });
  }

  // Field-to-test add/remove handlers
  fieldToTestAddBtn.addEventListener('click', async () => {
    const label = fieldToTestInput.value.trim();
    if (!label) return alert('Enter a label for the new field');
    // derive a key from label
    const key = label.replace(/[^a-zA-Z0-9]/g, '');
    try {
      await addTestableField(key, label);
      // also register as a custom field so it appears in Field Manager
      try { await addCustomField(key, label); } catch (_) {}
      await populateFieldToTestSelect();
      fieldToTestInput.value = '';
      fieldToTestInput.focus();
    } catch (e) { alert(e.message || e); }
  });

  fieldToTestRemoveBtn.addEventListener('click', async () => {
    const selected = Array.from(fieldToTestSelect.selectedOptions).map(o => o.value).filter(v => v);
    if (selected.length === 0) return alert('Select field(s) to remove');
    for (const k of selected) {
      await removeTestableField(k);
    }
    await populateFieldToTestSelect();
  });

  // Country add/remove handlers
  countryAddBtn.addEventListener('click', async () => {
    const name = (countryInput && countryInput.value || '').trim();
    if (!name) return alert('Enter a country name to add');
    try {
      await addCountry(name);
      await populateCountrySelector(name);
      countryInput.value = '';
      countryInput.focus();
    } catch (e) { alert(e.message || e); }
  });
  countryRemoveBtn.addEventListener('click', async () => {
    const selected = Array.from(countrySelect.selectedOptions).map(o => o.value);
    if (selected.length === 0) return alert('Select country to remove');
    for (const c of selected) await removeCountry(c);
    await populateCountrySelector();
  });

  // Add/Remove DOM field (by id and label)
  if (addDomFieldBtn) {
    addDomFieldBtn.addEventListener('click', async () => {
      const domId = (domIdInput && domIdInput.value || '').trim();
      const label = (domLabelInput && domLabelInput.value || '').trim();
      if (!domId || !label) return alert('Please enter DOM id and label');
      try {
        await addDomField(domId, label);
        try { await addTestableField(domId.replace(/[^a-zA-Z0-9]/g, ''), label); } catch (_) {}
        await loadFieldManager();
        await populateFieldToTestSelect();
        domIdInput.value = '';
        domLabelInput.value = '';
      } catch (e) { alert(e.message || e); }
    });
  }
  if (removeDomFieldBtn) {
    removeDomFieldBtn.addEventListener('click', async () => {
      const domId = (domIdInput && domIdInput.value || '').trim();
      if (!domId) return alert('Enter DOM id to remove');
      try {
        await removeDomFieldBySelector(domId);
        await loadFieldManager();
        await populateFieldToTestSelect();
      } catch (e) { alert(e.message || e); }
    });
  }

  // Add/Remove Select dropdown field (by select id and label), seeding options from page
  if (addSelectFieldBtn) {
    addSelectFieldBtn.addEventListener('click', async () => {
      const selId = (selectIdInput && selectIdInput.value || '').trim();
      const label = (selectLabelInput && selectLabelInput.value || '').trim();
      if (!selId || !label) return alert('Please enter Select id and Label');
      try {
        const options = await scrapeSelectOptionsFromActiveTab(selId);
        const cleaned = (options || []).filter(v => !!v && v.trim() !== '' && v.trim().toLowerCase() !== 'not selected');
        if (cleaned.length === 0) {
          if (!confirm('No options detected or only placeholders. Add field anyway?')) return;
        }
        const key = (typeof deriveKeyFromSelector === 'function' ? deriveKeyFromSelector(selId) : selId.replace(/[^a-zA-Z0-9]/g, ''));
        await addCustomField(key, label, selId.startsWith('#') ? selId : `#${selId}`);
        if (cleaned.length > 0) await setFieldValues(key, cleaned);
        try { await addTestableField(key, label); } catch (_) {}
        await loadFieldManager();
        await populateFieldToTestSelect();
        selectIdInput.value = '';
        selectLabelInput.value = '';
      } catch (e) {
        alert((e && e.message) || String(e));
      }
    });
  }
  if (removeSelectFieldBtn) {
    removeSelectFieldBtn.addEventListener('click', async () => {
      const selId = (selectIdInput && selectIdInput.value || '').trim();
      if (!selId) return alert('Enter Select id to remove');
      try {
        await removeDomFieldBySelector(selId);
        await loadFieldManager();
        await populateFieldToTestSelect();
      } catch (e) { alert(e.message || e); }
    });
  }

  // Add/Remove Checkbox field (by checkbox id and label)
  if (addCheckboxFieldBtn) {
    addCheckboxFieldBtn.addEventListener('click', async () => {
      const cbId = (checkboxIdInput && checkboxIdInput.value || '').trim();
      const label = (checkboxLabelInput && checkboxLabelInput.value || '').trim();
      if (!cbId || !label) return alert('Please enter Checkbox id and Label');
      try {
        // Register as a custom checkbox field and seed values Checked/Unchecked
        await addCheckboxField(cbId, label);
        // Also register as a testable field so it can be chosen for Sandbox/Test
        try { await addTestableField(deriveKeyFromSelector(cbId), label); } catch (_) {}
        await loadFieldManager();
        await populateFieldToTestSelect();
        checkboxIdInput.value = '';
        checkboxLabelInput.value = '';
      } catch (e) {
        alert((e && e.message) || String(e));
      }
    });
  }
  if (removeCheckboxFieldBtn) {
    removeCheckboxFieldBtn.addEventListener('click', async () => {
      const cbId = (checkboxIdInput && checkboxIdInput.value || '').trim();
      if (!cbId) return alert('Enter Checkbox id to remove');
      try {
        await removeDomFieldBySelector(cbId);
        await loadFieldManager();
        await populateFieldToTestSelect();
      } catch (e) { alert((e && e.message) || String(e)); }
    });
  }
});

// Field Manager Functions
async function loadFieldManager() {
  const fieldList = document.getElementById('field-list');
  fieldList.innerHTML = ''; // Clear existing
  // Merge built-in FIELD_NAMES with any custom fields stored by the user
  const custom = await loadCustomFields();
  const merged = { ...FIELD_NAMES };
  for (const [k, v] of Object.entries(custom)) {
    const label = (v && v.label) || v || k;
    merged[k] = label;
  }

  const customKeys = new Set(Object.keys(custom));
  for (const [fieldKey, fieldLabel] of Object.entries(merged)) {
    const fieldItem = createFieldItem(fieldKey, fieldLabel, customKeys.has(fieldKey));
    fieldList.appendChild(fieldItem);
  }

  // Load values for all fields (including custom)
  for (const fieldKey of Object.keys(merged)) {
    await refreshFieldValues(fieldKey);
  }
}

function createFieldItem(fieldKey, fieldLabel, isCustom = false) {
  const div = document.createElement('div');
  div.className = 'field-item';
  const headerDeleteBtn = isCustom ? `<button class="btn-remove-field" data-remove-field="${fieldKey}" title="Remove this field">🗑</button>` : '';
  div.innerHTML = `
    <h3 style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
      <span>${fieldLabel}</span>
      ${headerDeleteBtn}
    </h3>
    <div class="value-manager">
      <select id="field-${fieldKey}" class="field-select" size="3" multiple></select>
      <div class="field-controls">
        <input type="text" id="input-${fieldKey}" placeholder="Add..." />
        <button class="btn-add" data-field="${fieldKey}">➕</button>
        <button class="btn-remove" data-field="${fieldKey}">➖</button>
        <button class="btn-reset" data-field="${fieldKey}">🔄</button>
      </div>
    </div>
  `;
  
  // Add event listeners
  const addBtn = div.querySelector('.btn-add');
  const removeBtn = div.querySelector('.btn-remove');
  const resetBtn = div.querySelector('.btn-reset');
  const input = div.querySelector(`#input-${fieldKey}`);
  const removeFieldBtn = div.querySelector('.btn-remove-field');
  
  addBtn.addEventListener('click', () => addValue(fieldKey));
  removeBtn.addEventListener('click', () => removeValue(fieldKey));
  resetBtn.addEventListener('click', () => resetField(fieldKey));
  if (removeFieldBtn) {
    removeFieldBtn.addEventListener('click', async () => {
      if (!confirm(`Remove field "${fieldLabel}" and its stored values?`)) return;
      await removeCustomField(fieldKey);
      await loadFieldManager();
      await populateFieldToTestSelect();
    });
  }
  
  // Add value on Enter key
  input.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      addValue(fieldKey);
    }
  });
  
  return div;
}

async function refreshFieldValues(fieldKey) {
  const select = document.getElementById(`field-${fieldKey}`);
  if (!select) return;
  
  const values = await getFieldValues(fieldKey);
  select.innerHTML = '';
  
  values.forEach(value => {
    const option = document.createElement('option');
    option.value = value;
    const isEmpty = value === '' || /^\s+$/.test(value || '');
    option.textContent = isEmpty ? '(empty)' : value;
    select.appendChild(option);
  });
}

// Populate Country selector from storage
async function populateCountrySelector(selectValue) {
  const sel = document.getElementById('country-selector');
  if (!sel) return;
  const list = await loadCountries();
  sel.innerHTML = '';
  list.forEach(c => {
    const o = document.createElement('option');
    o.value = c;
    o.textContent = c;
    sel.appendChild(o);
  });
  if (selectValue && list.includes(selectValue)) sel.value = selectValue;
}

// Populate FirstName sandbox selector from stored values
// Populate Sandbox field and its value selector
async function populateSandboxSelectors() {
  // Build merged field list: FIELD_NAMES + custom fields
  const sel = document.getElementById('sandbox-field-selector');
  if (!sel) return;
  const custom = await loadCustomFields();
  const merged = { ...FIELD_NAMES };
  for (const [k, v] of Object.entries(custom)) merged[k] = (v && v.label) || v || k;

  sel.innerHTML = '';
  Object.entries(merged).forEach(([key, label]) => {
    const o = document.createElement('option');
    o.value = key;
    o.textContent = label;
    sel.appendChild(o);
  });

  // Default to first option and populate its values list
  await populateSandboxValuesFor(sel.value);
}

async function populateSandboxValuesFor(fieldKey) {
  const valSel = document.getElementById('sandbox-value-selector');
  if (!valSel) return;
  const values = await getFieldValues(fieldKey);
  valSel.innerHTML = '';
  // Always include an explicit empty option so user can choose blank
  const emptyOpt = document.createElement('option');
  emptyOpt.value = '';
  emptyOpt.textContent = '(empty)';
  valSel.appendChild(emptyOpt);

  values.forEach(v => {
    const o = document.createElement('option');
    o.value = v;
    const isEmpty = v === '' || /^\s+$/.test(v || '');
    o.textContent = isEmpty ? '(empty)' : v;
    valSel.appendChild(o);
  });
}

// Populate Field-to-Test select from stored testable fields
async function populateFieldToTestSelect() {
  const sel = document.getElementById('field-to-test');
  if (!sel) return;
  const list = await loadTestableFields();
  sel.innerHTML = '';
  const none = document.createElement('option');
  none.value = '';
  none.textContent = '(None)';
  sel.appendChild(none);
  list.forEach(item => {
    const o = document.createElement('option');
    o.value = item.key;
    o.textContent = item.label;
    sel.appendChild(o);
  });
}

async function addValue(fieldKey) {
  const input = document.getElementById(`input-${fieldKey}`);
  const value = input.value; // preserve as-is; allow empty/whitespace
  
  await addFieldValue(fieldKey, value);
  await refreshFieldValues(fieldKey);
  input.value = '';
  input.focus();
}

async function removeValue(fieldKey) {
  const select = document.getElementById(`field-${fieldKey}`);
  const selectedOptions = Array.from(select.selectedOptions);
  
  if (selectedOptions.length === 0) {
    alert('Please select value(s) to remove');
    return;
  }
  
  for (const option of selectedOptions) {
    await removeFieldValue(fieldKey, option.value);
  }
  
  await refreshFieldValues(fieldKey);
}

async function resetField(fieldKey) {
  if (confirm(`Reset ${FIELD_NAMES[fieldKey]} to default values?`)) {
    await resetFieldToDefault(fieldKey);
    await refreshFieldValues(fieldKey);
  }
}

// Scrape options from a SELECT element on the active tab using content script
async function scrapeSelectOptionsFromActiveTab(selectId) {
  // Find active tab
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.id) throw new Error('No active tab');
  // Inject content script (idempotent)
  try { await chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ['content.js'] }); } catch (_) {}
  const response = await chrome.tabs.sendMessage(tab.id, { action: 'SCRAPE_SELECT_OPTIONS', selectId });
  if (!response || !response.success) throw new Error('Could not scrape select options');
  return response.options || [];
}
