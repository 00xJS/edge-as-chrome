// Keeps the network rules and page script in sync with the saved site list.

const DEFAULT_SITES = [];
const SCRIPT_ID = 'edge-as-chrome';
const RESOURCE_TYPES = [
  'main_frame', 'sub_frame', 'stylesheet', 'script', 'image', 'font', 'object',
  'xmlhttprequest', 'ping', 'csp_report', 'media', 'websocket', 'webtransport',
  'webbundle', 'other'
];

async function getSites() {
  const { sites } = await chrome.storage.sync.get('sites');
  return Array.isArray(sites) ? sites : DEFAULT_SITES;
}

// Replace the "Microsoft Edge" brand with "Google Chrome". Real Chrome reports the
// Chromium version, so use that rather than Edge's own build number.
function asChrome(brands) {
  const chromium = brands.find(b => b.brand === 'Chromium');
  return brands.map(b =>
    b.brand === 'Microsoft Edge' ? { brand: 'Google Chrome', version: chromium?.version ?? b.version } : b
  );
}

function brandHeader(brands) {
  return brands.map(b => `"${b.brand}";v="${b.version}"`).join(', ');
}

async function buildHeaders() {
  const headers = [
    { header: 'user-agent', operation: 'set', value: navigator.userAgent.replace(/\s?Edg\/[\d.]+/, '') }
  ];
  const uaData = navigator.userAgentData;
  if (uaData) {
    headers.push({ header: 'sec-ch-ua', operation: 'set', value: brandHeader(asChrome(uaData.brands)) });
    const { fullVersionList } = await uaData.getHighEntropyValues(['fullVersionList']);
    if (fullVersionList?.length) {
      headers.push({
        header: 'sec-ch-ua-full-version-list',
        operation: 'set',
        value: brandHeader(asChrome(fullVersionList))
      });
    }
  }
  return headers;
}

async function applyRules(sites) {
  const existing = await chrome.declarativeNetRequest.getDynamicRules();
  const addRules = [];
  if (sites.length) {
    const action = { type: 'modifyHeaders', requestHeaders: await buildHeaders() };
    // Requests *to* the listed sites, and requests made *by* pages on those sites (APIs, CDNs).
    addRules.push(
      { id: 1, priority: 1, action, condition: { requestDomains: sites, resourceTypes: RESOURCE_TYPES } },
      { id: 2, priority: 1, action, condition: { initiatorDomains: sites, resourceTypes: RESOURCE_TYPES } }
    );
  }
  await chrome.declarativeNetRequest.updateDynamicRules({
    removeRuleIds: existing.map(r => r.id),
    addRules
  });
}

async function applyScripts(sites) {
  const registered = await chrome.scripting.getRegisteredContentScripts({ ids: [SCRIPT_ID] });
  if (registered.length) {
    await chrome.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  }
  if (!sites.length) return;
  await chrome.scripting.registerContentScripts([{
    id: SCRIPT_ID,
    js: ['inject.js'],
    // "*.example.com" also matches the bare "example.com".
    matches: sites.map(s => `*://*.${s}/*`),
    runAt: 'document_start',
    world: 'MAIN',
    allFrames: true,
    persistAcrossSessions: true
  }]);
}

async function applyAll() {
  const sites = await getSites();
  await applyRules(sites);
  await applyScripts(sites);
}

// Run one update at a time. Overlapping updates (e.g. install + the storage change it
// triggers) would otherwise both try to add rule 1 and fail with "not a unique ID".
let queue = Promise.resolve();
function sync() {
  queue = queue.then(applyAll).catch(err => console.warn('Edge as Chrome: update failed', err));
  return queue;
}

chrome.runtime.onInstalled.addListener(async () => {
  const { sites } = await chrome.storage.sync.get('sites');
  if (!Array.isArray(sites)) {
    await chrome.storage.sync.set({ sites: DEFAULT_SITES });
  }
  await sync();
});

chrome.runtime.onStartup.addListener(sync);

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync' && changes.sites) sync();
});
