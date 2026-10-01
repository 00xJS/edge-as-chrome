const $ = id => document.getElementById(id);
let tab;

// "app.example.com" -> "example.com" so every subdomain of the site is covered.
function baseDomain(host) {
  host = host.replace(/^www\./, '');
  if (/^[\d.]+$/.test(host) || !host.includes('.')) return host;
  return host.split('.').slice(-2).join('.');
}

function cleanDomain(input) {
  const value = input.trim().toLowerCase();
  try {
    return new URL(value.includes('://') ? value : `https://${value}`).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function covers(site, host) {
  return host === site || host.endsWith(`.${site}`);
}

async function getSites() {
  const { sites } = await chrome.storage.sync.get('sites');
  return Array.isArray(sites) ? sites : [];
}

async function saveSites(sites, reloadTab) {
  await chrome.storage.sync.set({ sites: [...new Set(sites)].sort() });
  // Give the background worker a moment to apply the new rules, then reload.
  if (reloadTab && tab) setTimeout(() => chrome.tabs.reload(tab.id), 300);
  render();
}

async function render() {
  const sites = await getSites();

  const list = $('list');
  list.replaceChildren();
  if (!sites.length) {
    const li = document.createElement('li');
    li.className = 'muted';
    li.textContent = 'No sites yet';
    list.append(li);
  }
  for (const site of sites) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = site;
    const remove = document.createElement('button');
    remove.className = 'link';
    remove.title = `Remove ${site}`;
    remove.textContent = '✕';
    remove.onclick = () => saveSites(sites.filter(s => s !== site), tab && covers(site, tab.host));
    li.append(name, remove);
    list.append(li);
  }

  if (!tab) return;
  const match = sites.find(s => covers(s, tab.host));
  $('current').hidden = false;
  $('host').textContent = tab.host;
  $('status').textContent = match ? `On — appearing as Chrome (${match})` : 'Off — showing as Edge';
  $('status').className = match ? 'status on' : 'status';
  $('toggle').textContent = match ? 'Turn off for this site' : `Turn on for ${baseDomain(tab.host)}`;
  $('toggle').className = match ? 'secondary' : '';
  $('toggle').onclick = () => match
    ? saveSites(sites.filter(s => !covers(s, tab.host)), true)
    : saveSites([...sites, baseDomain(tab.host)], true);
}

$('add').onsubmit = async e => {
  e.preventDefault();
  const domain = cleanDomain($('domain').value);
  if (!domain) return;
  $('domain').value = '';
  await saveSites([...(await getSites()), domain], tab && covers(domain, tab.host));
};

(async () => {
  const [active] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (active?.url && /^https?:/.test(active.url)) {
    tab = { id: active.id, host: new URL(active.url).hostname };
  }
  render();
})();
