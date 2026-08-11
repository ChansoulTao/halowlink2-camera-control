const CLIENT_A = '94:83:C4:93:40:28';
const CLIENT_B = '94:83:C4:93:40:35';
const CAMERA_A = '00:1E:C0:AA:10:01';
const CAMERA_B = '00:1E:C0:AA:10:02';

const cameraSection = mac => `cam_${String(mac).replace(/[^a-f0-9]/gi, '').toLowerCase()}`;

const config = {
  wireless: {
    default_radio1: { '.name': 'default_radio1', '.type': 'wifi-iface', mode: 'ap', ssid: 'CAMERA-LINK', encryption: 'sae' },
    radio1: { '.name': 'radio1', '.type': 'wifi-device', channel: '28', country: 'US' }
  },
  camera_network: {
    settings: { '.name': 'settings', '.type': 'settings', leds_enabled: '1' },
    [cameraSection(CLIENT_A)]: {
      '.name': cameraSection(CLIENT_A), '.type': 'camera', mac: CLIENT_A,
      name: '', note: 'Camera A bridge', last_ip: '192.168.12.194',
      remote_paired: '1', remote_leds_enabled: '1', bound_camera_mac: ''
    },
    [cameraSection(CLIENT_B)]: {
      '.name': cameraSection(CLIENT_B), '.type': 'camera', mac: CLIENT_B,
      name: '', note: 'Camera B bridge', last_ip: '192.168.12.195',
      remote_paired: '1', remote_leds_enabled: '0', bound_camera_mac: ''
    },
    [cameraSection(CAMERA_A)]: {
      '.name': cameraSection(CAMERA_A), '.type': 'camera', mac: CAMERA_A,
      name: 'A-Cam VENICE 2', note: 'Main camera · Stage left', last_ip: '192.168.12.101',
      pinned: '1', hidden: '0', bound_camera_mac: ''
    },
    [cameraSection(CAMERA_B)]: {
      '.name': cameraSection(CAMERA_B), '.type': 'camera', mac: CAMERA_B,
      name: 'B-Cam FX6', note: 'Handheld · Stage right', last_ip: '192.168.12.102',
      pinned: '1', hidden: '0', bound_camera_mac: ''
    }
  }
};

let sampleTick = 0;

function peers() {
  sampleTick += 1;
  return [
    { mac: CLIENT_A, bssid: CLIENT_A, signal: -42 + Math.round(Math.sin(sampleTick / 2)), noise: -91, connected_time: 1864 + sampleTick * 2 },
    { mac: CLIENT_B, bssid: CLIENT_B, signal: -57 + Math.round(Math.cos(sampleTick / 3) * 2), noise: -92, connected_time: 1729 + sampleTick * 2 }
  ];
}

const boot = {
  ap: 8.4,
  temperature: 48,
  thermalMitigation: 0,
  clientTelemetry: {
    [CLIENT_A]: {
      online: true, ip: '192.168.12.194', temperature: 54, thermalMitigation: 0,
      recovery: 9.8, wiredMacs: [CAMERA_A]
    },
    [CLIENT_B]: {
      online: true, ip: '192.168.12.195', temperature: 61, thermalMitigation: 0,
      recovery: 12.6, wiredMacs: [CAMERA_B]
    }
  },
  clientRecoveries: {
    [CLIENT_A]: { recovery: 9.8 },
    [CLIENT_B]: { recovery: 12.6 }
  }
};

const leases = {
  dhcp_leases: [
    { macaddr: CLIENT_A, ipaddr: '192.168.12.194', hostname: 'halow-client-a' },
    { macaddr: CLIENT_B, ipaddr: '192.168.12.195', hostname: 'halow-client-b' },
    { macaddr: CAMERA_A, ipaddr: '192.168.12.101', hostname: 'venice2-a' },
    { macaddr: CAMERA_B, ipaddr: '192.168.12.102', hostname: 'fx6-b' },
    { macaddr: '64:DB:8B:10:20:30', ipaddr: '192.168.12.120', hostname: 'video-assist' }
  ]
};

const hints = {
  hosts: {
    [CLIENT_A]: { name: 'halow-client-a', ipaddrs: ['192.168.12.194'] },
    [CLIENT_B]: { name: 'halow-client-b', ipaddrs: ['192.168.12.195'] },
    [CAMERA_A]: { name: 'venice2-a', ipaddrs: ['192.168.12.101'] },
    [CAMERA_B]: { name: 'fx6-b', ipaddrs: ['192.168.12.102'] }
  },
  getIPAddrByMACAddr(mac) {
    const host = this.hosts[String(mac).toUpperCase()];
    return host && host.ipaddrs ? host.ipaddrs[0] : '';
  },
  getHostnameByMACAddr(mac) {
    const host = this.hosts[String(mac).toUpperCase()];
    return host ? host.name : '';
  }
};

const bridgeFDB = [CLIENT_A, CLIENT_B, CAMERA_A, CAMERA_B, '64:DB:8B:10:20:30']
  .map((mac, index) => `${index < 2 ? 2 : index < 4 ? 3 : 1}\t${mac.toLowerCase()}\tno\t\t0.00`)
  .join('\n');

const linkLog = [
  'Mon Aug 10 10:00:08 2026 daemon.notice hostapd: wlan0: AP-STA-CONNECTED 94:83:c4:93:40:28',
  'Mon Aug 10 10:00:12 2026 daemon.notice hostapd: wlan0: AP-STA-CONNECTED 94:83:c4:93:40:35'
].join('\n');

function formatString(...values) {
  let offset = 0;
  return String(this).replace(/%([%sd])/g, (token, type) => {
    if (type === '%') return '%';
    const value = values[offset++];
    return type === 'd' ? String(Number(value)) : String(value);
  });
}

if (typeof String.prototype.format !== 'function') {
  Object.defineProperty(String.prototype, 'format', {
    value: formatString,
    configurable: true,
    writable: true
  });
}

function append(parent, child) {
  if (child === null || child === undefined || child === false || child === '')
    return;
  if (Array.isArray(child)) {
    child.forEach(item => append(parent, item));
    return;
  }
  if (child instanceof Node) {
    parent.appendChild(child);
    return;
  }
  parent.appendChild(document.createTextNode(String(child)));
}

function E(tag, attributes, children) {
  if (Array.isArray(tag)) {
    const fragment = document.createDocumentFragment();
    append(fragment, tag);
    append(fragment, attributes);
    append(fragment, children);
    return fragment;
  }

  const element = document.createElement(tag);
  let attrs = attributes;
  let contents = children;
  const isAttributeMap = attrs && typeof attrs === 'object' && !Array.isArray(attrs) && !(attrs instanceof Node);
  if (!isAttributeMap) {
    contents = attrs;
    attrs = {};
  }

  for (const [name, value] of Object.entries(attrs || {})) {
    if (value === null || value === undefined || value === false)
      continue;
    if (typeof value === 'function' && ['click', 'change', 'input', 'toggle'].includes(name)) {
      element.addEventListener(name, value);
    } else if (name === 'class') {
      element.className = value;
    } else if (name === 'style') {
      element.setAttribute('style', value);
    } else if (name === 'value') {
      element.value = value;
      element.setAttribute(name, value);
    } else if (name === 'checked' || name === 'disabled' || name === 'open' || name === 'selected') {
      element[name] = Boolean(value);
      if (value) element.setAttribute(name, '');
    } else {
      element.setAttribute(name, String(value));
    }
  }
  append(element, contents);
  return element;
}

const translate = value => String(value);

const uci = {
  load: async () => undefined,
  get(configName, sectionName, optionName) {
    const section = config[configName] && config[configName][sectionName];
    return optionName === undefined ? section : section && section[optionName];
  },
  sections(configName, type) {
    return Object.values(config[configName] || {}).filter(section => !type || section['.type'] === type);
  },
  add(configName, type, sectionName) {
    config[configName] ||= {};
    config[configName][sectionName] = { '.name': sectionName, '.type': type };
    return sectionName;
  },
  set(configName, sectionName, optionName, value) {
    config[configName] ||= {};
    config[configName][sectionName] ||= { '.name': sectionName, '.type': 'camera' };
    config[configName][sectionName][optionName] = String(value);
  },
  save: async () => undefined,
  apply: async () => undefined
};

const fs = {
  async exec(path) {
    return { code: 0, stdout: `Mock command completed: ${path}` };
  },
  async exec_direct(path) {
    if (path.endsWith('/logread')) return linkLog;
    if (path.endsWith('/brctl')) return bridgeFDB;
    if (path.endsWith('/ping')) return '64 bytes from host: time=3.4 ms\n1 packets transmitted, 1 received';
    return '';
  },
  async read(path) {
    if (path === '/tmp/camera-network-boot.json') return JSON.stringify(boot);
    return '';
  }
};

const rpc = {
  declare(specification) {
    if (specification.object === 'system' && specification.method === 'board')
      return async () => ({ hostname: 'halowlink-ap', model: 'Morse Micro HaLowLink 2', release: { description: 'OpenWrt 23.05' } });
    if (specification.object === 'system' && specification.method === 'info')
      return async () => ({ uptime: 1873, localtime: Math.floor(Date.now() / 1000) });
    if (specification.object === 'network.interface' && specification.method === 'dump')
      return async () => ({ interface: [{ interface: 'lan', 'ipv4-address': [{ address: '192.168.12.1', mask: 24 }] }] });
    if (specification.object === 'luci-rpc' && specification.method === 'getDHCPLeases')
      return async () => leases;
    return async () => ({});
  }
};

const mockWifi = {
  ubus(_namespace, _method, field) {
    return field === 'hwmodes' ? ['ah'] : [];
  },
  async getAssocList() {
    return peers();
  }
};

const network = {
  async getHostHints() { return hints; },
  async getWifiNetworks() { return [mockWifi]; }
};

const timers = [];
const poll = {
  add(callback, seconds) {
    const timer = window.setInterval(() => Promise.resolve(callback()).catch(error => console.error('Mock poll failed', error)), Math.max(500, Number(seconds) * 1000));
    timers.push(timer);
    return callback;
  }
};

const view = { extend: definition => definition };
const ui = {};

async function bootPreview() {
  const host = document.querySelector('#view');
  try {
    const response = await fetch(`/luci-index.js?preview=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok)
      throw new Error(`Unable to load production view (${response.status})`);
    const source = await response.text();
    const factory = new Function('E', '_', 'fs', 'network', 'poll', 'rpc', 'uci', 'ui', 'view', source);
    const application = factory(E, translate, fs, network, poll, rpc, uci, ui, view);
    if (!application || typeof application.load !== 'function' || typeof application.render !== 'function')
      throw new Error('The production source did not return a LuCI view definition.');
    const state = await application.load();
    const rendered = application.render(state);
    host.replaceChildren(rendered);
    window.__HALOWLINK_PREVIEW__ = { application, state, config, boot, leases };
    document.documentElement.dataset.previewReady = 'true';
  } catch (error) {
    console.error('HaLowLink preview failed', error);
    host.replaceChildren(E('div', { class: 'preview-error' }, [
      E('strong', {}, 'The local LuCI preview could not start.'),
      E('span', {}, 'The production file is loaded without modification; this error usually means a missing LuCI browser shim.'),
      E('pre', {}, error && error.stack ? error.stack : String(error))
    ]));
    document.documentElement.dataset.previewReady = 'error';
  }
}

window.addEventListener('beforeunload', () => timers.forEach(timer => window.clearInterval(timer)));
bootPreview();
