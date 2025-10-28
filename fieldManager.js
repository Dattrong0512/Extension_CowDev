// Field Manager - Handles custom field values with persistent storage

const FIELD_STORAGE_KEY = 'devCowFieldValues';
const CUSTOM_FIELDS_KEY = 'devCowCustomFields';
const TESTABLE_FIELDS_KEY = 'devCowTestableFields';
const COUNTRIES_KEY = 'devCowCountries';

// Default values for each field
const DEFAULT_FIELD_VALUES = {
  lastName: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez'],
  dayOfBirth: ['01', '05', '10', '15', '20', '25', '28'],
  monthOfBirth: ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'],
  yearOfBirth: ['1980', '1985', '1990', '1995', '2000', '2005'],
  houseNumber: ['123', '456', '789', '1000', '2500'],
  city: ['Newfield', 'Springfield', 'Riverside', 'Fairview', 'Georgetown'],
  streetName: ['Main Street', 'High Street', 'Market Street', 'Oak Avenue'],
  firstName: ['allMatch', 'allMatchC', 'allMatchA', 'error500', 'error200', 'allDSMissing'],
  stateProvince: ['CA', 'NY', 'TX', 'FL', 'IL', 'PA', 'OH'],
  postalCode: ['12345', '67890', '11111', '22222', '33333'],
  telephone: ['2001234567', '3001234567', '4001234567', '5001234567'],
  cellNumber: ['6001234567', '7001234567', '8001234567', '9001234567'],
  gender: ['M', 'F'],
  emailAddress: ['test1@example.com', 'test2@example.com', 'test3@example.com']
};

// Load field values from storage
async function loadFieldValues() {
  return new Promise((resolve) => {
    chrome.storage.local.get([FIELD_STORAGE_KEY], (result) => {
      if (result[FIELD_STORAGE_KEY]) {
        resolve(result[FIELD_STORAGE_KEY]);
      } else {
        resolve(DEFAULT_FIELD_VALUES);
      }
    });
  });
}

// Save field values to storage
async function saveFieldValues(fieldValues) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [FIELD_STORAGE_KEY]: fieldValues }, () => {
      resolve();
    });
  });
}

// Add a value to a specific field
async function addFieldValue(fieldName, value) {
  const fieldValues = await loadFieldValues();
  if (!fieldValues[fieldName]) {
    fieldValues[fieldName] = [];
  }
  if (!fieldValues[fieldName].includes(value)) {
    fieldValues[fieldName].push(value);
    await saveFieldValues(fieldValues);
  }
  return fieldValues[fieldName];
}

// Remove a value from a specific field
async function removeFieldValue(fieldName, value) {
  const fieldValues = await loadFieldValues();
  if (fieldValues[fieldName]) {
    fieldValues[fieldName] = fieldValues[fieldName].filter(v => v !== value);
    await saveFieldValues(fieldValues);
  }
  return fieldValues[fieldName];
}

// Get random value from a field's list
async function getRandomFieldValue(fieldName) {
  const fieldValues = await loadFieldValues();
  const values = fieldValues[fieldName] || DEFAULT_FIELD_VALUES[fieldName] || [];
  if (values.length === 0) return '';
  return values[Math.floor(Math.random() * values.length)];
}

// Get all values for a field
async function getFieldValues(fieldName) {
  const fieldValues = await loadFieldValues();
  return fieldValues[fieldName] || DEFAULT_FIELD_VALUES[fieldName] || [];
}

// Reset field to default values
async function resetFieldToDefault(fieldName) {
  const fieldValues = await loadFieldValues();
  fieldValues[fieldName] = [...DEFAULT_FIELD_VALUES[fieldName]];
  await saveFieldValues(fieldValues);
  return fieldValues[fieldName];
}

// Overwrite all values for a field
async function setFieldValues(fieldName, valuesArray) {
  const fieldValues = await loadFieldValues();
  fieldValues[fieldName] = Array.isArray(valuesArray) ? [...valuesArray] : [];
  await saveFieldValues(fieldValues);
  return fieldValues[fieldName];
}

// ------------------ Custom fields (field definitions) ------------------
// These allow adding a new field key/label so the Field Manager + Test Config
// can display and manage values for fields that weren't included at build-time.

async function loadCustomFields() {
  return new Promise((resolve) => {
    chrome.storage.local.get([CUSTOM_FIELDS_KEY], (result) => {
      const raw = result[CUSTOM_FIELDS_KEY] || {};
      // Back-compat: if value is string label, wrap to object
      const normalized = {};
      for (const [k, v] of Object.entries(raw)) {
        if (typeof v === 'string') normalized[k] = { label: v, selector: '' };
        else normalized[k] = v;
      }
      resolve(normalized);
    });
  });
}

async function saveCustomFields(obj) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [CUSTOM_FIELDS_KEY]: obj }, () => resolve());
  });
}

async function addCustomField(key, label, selector = '') {
  const fields = await loadCustomFields();
  if (!key || !label) throw new Error('key and label required');
  if (fields[key]) throw new Error('field key already exists');
  fields[key] = { label, selector };
  await saveCustomFields(fields);
  // Ensure storage has an entry for values (empty array)
  const values = await loadFieldValues();
  if (!values[key]) {
    values[key] = [];
    await saveFieldValues(values);
  }
  return fields;
}

async function removeCustomField(key) {
  const fields = await loadCustomFields();
  if (fields[key]) delete fields[key];
  await saveCustomFields(fields);
  // Remove stored values for that field as well
  const values = await loadFieldValues();
  if (values[key]) {
    delete values[key];
    await saveFieldValues(values);
  }
  return fields;
}

// Convenience: add/remove by DOM id (or CSS selector string)
function deriveKeyFromSelector(selector) {
  if (!selector) return '';
  const s = selector.trim().replace(/^#/, '');
  return s.replace(/[^a-zA-Z0-9]/g, '');
}

async function addDomField(selectorId, label) {
  if (!selectorId || !label) throw new Error('selector id and label required');
  const key = deriveKeyFromSelector(selectorId);
  return addCustomField(key, label, selectorId.startsWith('#') ? selectorId : `#${selectorId}`);
}

async function removeDomFieldBySelector(selectorId) {
  if (!selectorId) throw new Error('selector id required');
  const fields = await loadCustomFields();
  const sel = selectorId.startsWith('#') ? selectorId : `#${selectorId}`;
  const entry = Object.entries(fields).find(([k, v]) => (v && v.selector) === sel);
  const key = entry ? entry[0] : deriveKeyFromSelector(selectorId);
  return removeCustomField(key);
}

// ------------------ Testable fields list (used by "Field to Test" select) ------------------
const DEFAULT_TESTABLE_FIELDS = [
  { key: 'CellNumber', label: 'Cell Number' },
  { key: 'Telephone', label: 'Telephone' },
  { key: 'PostalCode', label: 'Postal Code' },
  { key: 'EmailAddress', label: 'Email Address' },
  { key: 'Gender', label: 'Gender' },
  { key: 'StateProvince', label: 'State Province' }
];

async function loadTestableFields() {
  return new Promise((resolve) => {
    chrome.storage.local.get([TESTABLE_FIELDS_KEY], (result) => {
      resolve(result[TESTABLE_FIELDS_KEY] || DEFAULT_TESTABLE_FIELDS);
    });
  });
}

async function saveTestableFields(list) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [TESTABLE_FIELDS_KEY]: list }, () => resolve());
  });
}

async function addTestableField(key, label) {
  const list = await loadTestableFields();
  if (!key || !label) throw new Error('key and label required');
  if (list.find(f => f.key === key)) throw new Error('test field key already exists');
  list.push({ key, label });
  await saveTestableFields(list);
  return list;
}

async function removeTestableField(key) {
  let list = await loadTestableFields();
  list = list.filter(f => f.key !== key);
  await saveTestableFields(list);
  return list;
}

// ------------------ Countries list (for Country selector in Test Config) ------------------
const DEFAULT_COUNTRIES = ['Netherlands', 'Portugal'];

async function loadCountries() {
  return new Promise((resolve) => {
    chrome.storage.local.get([COUNTRIES_KEY], (result) => {
      resolve(result[COUNTRIES_KEY] || DEFAULT_COUNTRIES);
    });
  });
}

async function saveCountries(list) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [COUNTRIES_KEY]: list }, () => resolve());
  });
}

async function addCountry(name) {
  const trimmed = (name || '').trim();
  if (!trimmed) throw new Error('Country name required');
  const list = await loadCountries();
  if (!list.includes(trimmed)) {
    list.push(trimmed);
    await saveCountries(list);
  }
  return list;
}

async function removeCountry(name) {
  const list = await loadCountries();
  const next = list.filter(c => c !== name);
  await saveCountries(next);
  return next;
}
