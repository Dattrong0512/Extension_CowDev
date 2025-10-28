// Utility functions for generating random test data
// This version integrates with the field manager for custom values

async function generateRandomData() {
  // Use field manager to get random values from stored lists
  const data = {
    firstName: await getRandomValueFromStorage('firstName', 'allMatch'),
    lastName: await getRandomValueFromStorage('lastName', 'Smith'),
    day: await getRandomValueFromStorage('dayOfBirth', '15'),
    month: await getRandomValueFromStorage('monthOfBirth', '06'),
    year: await getRandomValueFromStorage('yearOfBirth', '1990'),
    houseNumber: await getRandomValueFromStorage('houseNumber', '123'),
    streetName: await getRandomValueFromStorage('streetName', 'Main Street'),
    city: await getRandomValueFromStorage('city', 'Springfield'),
    state: await getRandomValueFromStorage('stateProvince', 'CA'),
    postalCode: await getRandomValueFromStorage('postalCode', '12345'),
    telephone: await getRandomValueFromStorage('telephone', '3001234567'),
    cellNumber: await getRandomValueFromStorage('cellNumber', '7001234567'),
    gender: await getRandomValueFromStorage('gender', 'M'),
    email: await getRandomValueFromStorage('emailAddress', `test${Date.now()}@example.com`)
  };
  
  // Ensure no field is undefined
  for (const key in data) {
    if (data[key] === undefined || data[key] === null || data[key] === 'undefined') {
      // Use fallback defaults if value is missing
      const fallbacks = {
        lastName: 'Smith',
        day: '15',
        month: '06',
        year: '1990',
        houseNumber: '123',
        streetName: 'Main Street',
        city: 'Springfield',
        state: 'CA',
        postalCode: '12345',
        telephone: '3001234567',
        cellNumber: '7001234567',
        gender: 'M',
        email: `test${Date.now()}@example.com`
      };
      data[key] = fallbacks[key] || 'Default';
    }
  }
  
  return data;
}

// Get a random value from Chrome storage, or use fallback
async function getRandomValueFromStorage(fieldName, fallback) {
  return new Promise((resolve) => {
    chrome.storage.local.get(['devCowFieldValues'], (result) => {
      const store = result.devCowFieldValues || {};
      if (Object.prototype.hasOwnProperty.call(store, fieldName)) {
        const values = store[fieldName] || [];
        // If user explicitly configured empty list, respect it -> return empty
        if (values.length === 0) { resolve(''); return; }
        const randomIndex = Math.floor(Math.random() * values.length);
        const value = values[randomIndex];
        resolve(value ?? '');
        return;
      }
      // No configuration present -> use fallback default
      resolve(fallback);
    });
  });
}

// Legacy function for backwards compatibility
function randomNum(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
