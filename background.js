// Global state to store transaction results
let transactionResults = [];
let panelWindowId = null; // persistent popup window
// Map testCaseNumber -> debug tab id (so we can fill later when txn arrives)
// Persist to storage to survive service worker restarts during a run
const debugTabsByCase = new Map();
const DEBUG_TABS_MAP_KEY = 'devCowDebugTabsByCase';

// Track form tabs too so we can re-poll for Transaction IDs before opening debug tabs
const formTabsByCase = new Map();
const FORM_TABS_MAP_KEY = 'devCowFormTabsByCase';

async function persistDebugTabsMap() {
  const obj = Object.fromEntries(debugTabsByCase.entries());
  try { await new Promise(r => chrome.storage.local.set({ [DEBUG_TABS_MAP_KEY]: obj }, r)); } catch (_) {}
}

async function loadDebugTabsMap() {
  try {
    const res = await new Promise(r => chrome.storage.local.get([DEBUG_TABS_MAP_KEY], r));
    const obj = res && res[DEBUG_TABS_MAP_KEY] ? res[DEBUG_TABS_MAP_KEY] : {};
    debugTabsByCase.clear();
    for (const [k, v] of Object.entries(obj)) debugTabsByCase.set(Number(k), v);
  } catch (_) { /* ignore */ }
}

async function persistFormTabsMap() {
  const obj = Object.fromEntries(formTabsByCase.entries());
  try { await new Promise(r => chrome.storage.local.set({ [FORM_TABS_MAP_KEY]: obj }, r)); } catch (_) {}
}

async function loadFormTabsMap() {
  try {
    const res = await new Promise(r => chrome.storage.local.get([FORM_TABS_MAP_KEY], r));
    const obj = res && res[FORM_TABS_MAP_KEY] ? res[FORM_TABS_MAP_KEY] : {};
    formTabsByCase.clear();
    for (const [k, v] of Object.entries(obj)) formTabsByCase.set(Number(k), v);
  } catch (_) { /* ignore */ }
}

// Keys for caching test runs
const RUN_CURRENT_KEY = 'devCowRunCurrent';
const RUN_HISTORY_KEY = 'devCowRunHistory';

// Helper function to create a sleep delay
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

// Listen for messages from popup and content scripts
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  if (message.action === 'START_TESTS') {
    // Clear previous results
    transactionResults = [];
    debugTabsByCase.clear();
  try { await new Promise(r => chrome.storage.local.remove([DEBUG_TABS_MAP_KEY], r)); } catch (_) {}
  formTabsByCase.clear();
  try { await new Promise(r => chrome.storage.local.remove([FORM_TABS_MAP_KEY], r)); } catch (_) {}
    
    // Start the test sequence (with runId + cache seed)
    runTestSequence(message.config)
      .then(() => {
        console.log('Test sequence completed successfully');
      })
      .catch(err => {
        console.error('Error in test sequence:', err);
      });
    
    sendResponse({ success: true });
    return true;
  }
  
  if (message.action === 'FORM_SUBMITTED') {
    // Store the transaction ID from content script
    const transactionId = message.transactionId;
    
    console.log('========================================');
    console.log('FORM_SUBMITTED received');
    console.log('Transaction ID:', transactionId);
    console.log('Field Tested:', message.fieldTested);
    console.log('Test Case:', message.testCase);
    console.log('========================================');
    
    // Only store if we have a valid transaction ID
    if (transactionId && transactionId !== 'NOT_FOUND' && transactionId.trim() !== '') {
      transactionResults.push({
        testCase: message.testCase,
        testCaseNumber: message.testCaseNumber,
        transactionId: transactionId,
        fieldTested: message.fieldTested
      });
      console.log('✅ Transaction recorded successfully');
      console.log(`Total transactions stored: ${transactionResults.length}`);

      // Update cached run with this result
      cacheAppendResult(message.runId, {
        testCase: message.testCase,
        testCaseNumber: message.testCaseNumber,
        transactionId,
        fieldTested: message.fieldTested
      }).catch(err => console.warn('cacheAppendResult error', err));
    } else {
      console.error('❌ Invalid transaction ID - not storing');
    }
    
    // If a debug tab for this case already exists and we now have a txn, auto-trigger lookup
    try {
      // Ensure we have the latest mapping from storage (in case SW restarted)
      await loadDebugTabsMap();
      const caseNum = Number(message.testCaseNumber);
      if (transactionId && transactionId !== 'NOT_FOUND' && debugTabsByCase.has(caseNum)) {
        const tabId = debugTabsByCase.get(caseNum);
        // Ensure tab is still around, then inject and send DEBUG_TRANSACTION
        chrome.tabs.get(tabId, async (tab) => {
          if (chrome.runtime.lastError || !tab) {
            // Tab might be closed; drop mapping
            debugTabsByCase.delete(caseNum);
            return;
          }
          try { await chrome.scripting.executeScript({ target: { tabId }, files: ['content.js'] }); } catch (_) {}
          try { await chrome.tabs.sendMessage(tabId, { action: 'DEBUG_TRANSACTION', transactionId }); } catch (_) {}
          // One-shot; remove mapping
          debugTabsByCase.delete(caseNum);
          await persistDebugTabsMap();
        });
      }
    } catch (e) {
      console.warn('Deferred debug lookup failed', e);
    }
    
    sendResponse({ success: true });
    return true;
  }
});

// Toggle persistent popup window when the toolbar icon is clicked
chrome.action.onClicked.addListener(async () => {
  try {
    // If we already have a window id, try to focus/close
    if (panelWindowId) {
      try {
        const w = await chrome.windows.get(panelWindowId);
        if (w) {
          // Toggle: if focused, close; if not, focus
          await chrome.windows.remove(panelWindowId);
          panelWindowId = null;
          return;
        }
      } catch (_) { panelWindowId = null; }
    }

    // Create a new popup-style window
    const url = chrome.runtime.getURL('popup.html');
    const win = await chrome.windows.create({
      url,
      type: 'popup',
      width: 560,
      height: 760
    });
    panelWindowId = win.id || null;
  } catch (e) {
    console.error('Failed to toggle panel window', e);
  }
});

chrome.windows.onRemoved.addListener((id) => {
  if (id === panelWindowId) panelWindowId = null;
});

// Main async function to orchestrate the test sequence
async function runTestSequence(config) {
  console.log('Starting test sequence with config:', config);
  
  const { fieldToTest, testCases, interfaceUrl, debugUrl } = config;

  // Initialize cached run
  const runId = await createNewRunCache(config);
  console.log('Run ID:', runId);
  
  // Part 1: Open Form Tabs Sequentially (with 2-second delays)
  for (let i = 0; i < 5; i++) {
    const testCaseValue = (i < testCases.length ? testCases[i] : '') ?? '';
    
    console.log(`Opening tab ${i + 1} for test case: ${testCaseValue}`);
    
    try {
      // Create a new tab
      const tab = await chrome.tabs.create({ 
        url: interfaceUrl,
        active: false 
      });
      
  // Wait for the tab to finish loading
      await waitForTabLoad(tab.id);
      
      // Inject content script and send FILL_FORM message
      await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ['utils.js', 'content.js']
      });
      
      // Send message to fill the form
      await chrome.tabs.sendMessage(tab.id, {
        action: 'FILL_FORM',
        country: config.country,
        sandboxFieldKey: config.sandboxFieldKey,
        sandboxValue: config.sandboxValue,
        fieldToTest: fieldToTest,
        testCaseValue: testCaseValue,
        testCaseNumber: i + 1,
        runTestTransaction: config.runTestTransaction,
        runId
      });
      
  // Remember this form tab by its case number to re-poll later if needed
  formTabsByCase.set(i + 1, tab.id);
  try { await persistFormTabsMap(); } catch (_) {}

  console.log(`Tab ${i + 1} created and form fill initiated`);
      
    } catch (error) {
      console.error(`Error creating tab ${i + 1}:`, error);
    }
    
    // Wait 2 seconds before opening the next tab
    if (i < 4) {
      await sleep(2000);
    }
  }
  
  console.log('All form tabs opened. Waiting 10 seconds for submissions...');
  
  // Part 2: Wait for Submissions (10-second delay)
  console.log('========================================');
  console.log('Waiting 10 seconds for all submissions to complete...');
  console.log('========================================');
  await sleep(10000);
  
  console.log('========================================');
  console.log('Opening debug tabs');
  console.log('Debug URL:', debugUrl);
  console.log('========================================');

  // Read current run snapshot to ensure we open one debug tab per test case
  const runData = await new Promise((resolve) => chrome.storage.local.get(['devCowRunCurrent'], (r) => resolve(r.devCowRunCurrent || null)));
  const byNumber = new Map();
  for (const r of transactionResults) {
    if (r && r.testCaseNumber != null) byNumber.set(Number(r.testCaseNumber), r);
  }

  // Before opening debug tabs, try to fetch missing transaction IDs directly from form tabs
  await loadFormTabsMap();
  const configuredCases = runData && Array.isArray(runData.testCases) ? runData.testCases.length : 5;
  const totalCases = Math.max(1, configuredCases);
  for (let i = 1; i <= totalCases; i++) {
    if (!byNumber.has(i)) {
      const formTabId = formTabsByCase.get(i);
      if (formTabId) {
        try {
          // Inject scripts (idempotent) and ask content script to re-check for Transaction ID now
          try { await chrome.scripting.executeScript({ target: { tabId: formTabId }, files: ['utils.js', 'content.js'] }); } catch (_) {}
          const resp = await chrome.tabs.sendMessage(formTabId, { action: 'GET_TRANSACTION', testCaseNumber: i, timeoutMs: 20000 });
          const txn = resp && resp.transactionId && resp.transactionId !== 'NOT_FOUND' ? resp.transactionId : null;
          if (txn) {
            const rec = { testCase: runData && Array.isArray(runData.testCases) ? runData.testCases[i - 1] : '', testCaseNumber: i, transactionId: txn, fieldTested: config.fieldToTest };
            transactionResults.push(rec);
            byNumber.set(i, rec);
            try { await cacheAppendResult(runId, rec); } catch (_) {}
            console.log(`Retrieved late Transaction ID for case #${i}: ${txn}`);
          } else {
            console.warn(`Still no Transaction ID for case #${i} after re-check.`);
          }
        } catch (e) {
          console.warn(`Failed to re-check Transaction ID for case #${i}`, e);
        }
      }
    }
  }

  // Prefer the configured number of cases; if unknown, default to 5
  for (let i = 1; i <= totalCases; i++) {
    const result = byNumber.get(i) || null;
    const txn = result && result.transactionId ? result.transactionId : null;

    try {
      console.log(`🔍 Opening debug tab for test #${i}${txn ? ` (txn ${txn})` : ' (no transaction found)'}`);
      const debugTab = await chrome.tabs.create({ url: debugUrl, active: false });
      await waitForTabLoad(debugTab.id);

      // Always inject content so we can auto-fill Transaction ID if available
      await chrome.scripting.executeScript({ target: { tabId: debugTab.id }, files: ['content.js'] });
      if (txn && txn !== 'NOT_FOUND') {
        await chrome.tabs.sendMessage(debugTab.id, { action: 'DEBUG_TRANSACTION', transactionId: txn });
      } else {
        console.warn(`  ⚠ No transaction ID for test #${i}; opened debug tab without lookup (will fill when available)`);
        // Remember this tab so when the FORM_SUBMITTED for this case arrives later, we can fill it
        debugTabsByCase.set(i, debugTab.id);
        await persistDebugTabsMap();
      }
    } catch (error) {
      console.error('❌ Error creating debug tab:', error);
    }
  }
  
  console.log('========================================');
  console.log('✅ Test sequence completed!');
  console.log(`Total debug tabs opened: ${totalCases}`);
  console.log('========================================');
}

// Helper function to wait for a tab to finish loading
function waitForTabLoad(tabId) {
  return new Promise((resolve) => {
    const listener = (updatedTabId, changeInfo) => {
      if (updatedTabId === tabId && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(listener);
        // Add a small delay to ensure page is fully ready
        setTimeout(resolve, 1000);
      }
    };
    chrome.tabs.onUpdated.addListener(listener);
  });
}

// ---------- Run cache helpers ----------

async function createNewRunCache(config) {
  const runId = `run_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const runRecord = {
    runId,
    startedAt: Date.now(),
    fieldToTest: config.fieldToTest,
    country: config.country,
    sandboxFieldKey: config.sandboxFieldKey,
    sandboxValue: config.sandboxValue,
    testCases: [...(config.testCases || [])],
    results: []
  };
  await new Promise((resolve) => chrome.storage.local.set({ [RUN_CURRENT_KEY]: runRecord }, resolve));
  // also append to history (trim to last 10)
  const history = await new Promise((resolve) => chrome.storage.local.get([RUN_HISTORY_KEY], (r) => resolve(r[RUN_HISTORY_KEY] || [])));
  history.push(runRecord);
  while (history.length > 10) history.shift();
  await new Promise((resolve) => chrome.storage.local.set({ [RUN_HISTORY_KEY]: history }, resolve));
  return runId;
}

async function cacheAppendResult(runId, result) {
  if (!runId) return;
  const data = await new Promise((resolve) => chrome.storage.local.get([RUN_CURRENT_KEY, RUN_HISTORY_KEY], (r) => resolve(r)));
  const current = data[RUN_CURRENT_KEY];
  if (current && current.runId === runId) {
    current.results = current.results || [];
    current.results.push(result);
    await new Promise((resolve) => chrome.storage.local.set({ [RUN_CURRENT_KEY]: current }, resolve));
  }
  // update in history by runId as well
  const history = data[RUN_HISTORY_KEY] || [];
  const idx = history.findIndex(h => h.runId === runId);
  if (idx !== -1) {
    history[idx].results = history[idx].results || [];
    history[idx].results.push(result);
    await new Promise((resolve) => chrome.storage.local.set({ [RUN_HISTORY_KEY]: history }, resolve));
  }
}
