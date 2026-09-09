'use strict';
'require fs';
'require network';
'require poll';
'require rpc';
'require uci';
'require ui';
'require view';

const callBoard = rpc.declare({ object: 'system', method: 'board' });
const callSystemInfo = rpc.declare({ object: 'system', method: 'info' });
const callNetworkDump = rpc.declare({ object: 'network.interface', method: 'dump' });
const callDHCPLeases = rpc.declare({
	object: 'luci-rpc',
	method: 'getDHCPLeases',
	expect: { '': {} }
});
const latencyResults = new Map();
const openDeviceDetails = new Set();
const signalSamples = [];
const apSignalSamples = new Map();
const apClientStates = new Map();
const apKnownPeers = new Map();
const apOutages = new Map();
const dismissedAlerts = new Set();
const MAX_SIGNAL_SAMPLES = 150;
const SIGNAL_WINDOW_MS = 5 * 60 * 1000;
const deviceView = { query: '', filter: 'pinned' };
let ledOperations = 0;
const AP_CHART_COLORS = ['#59e3aa', '#6da9ff', '#f2b94b', '#d98bec', '#f47c7c', '#a2d85c'];
const AP_CHART_COLORS_LIGHT = ['#087650', '#245fc7', '#9a6500', '#8a3fa0', '#b42318', '#5c7900'];
const CAMERA_ADDRESS_SLOTS = Object.freeze([
	{ id:'A', section:'slot_a', ip:'192.168.12.50' },
	{ id:'B', section:'slot_b', ip:'192.168.12.51' },
	{ id:'C', section:'slot_c', ip:'192.168.12.52' },
	{ id:'D', section:'slot_d', ip:'192.168.12.53' }
]);
let requestDashboardRefresh = null;

function applyCameraSystemTheme(root) {
	const resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
	root.dataset.cameraTheme = resolved;
	document.body.classList.toggle('camera-theme-light', resolved === 'light');
	document.body.classList.toggle('camera-theme-dark', resolved === 'dark');
	document.body.dataset.cameraTheme = resolved;
}

function cameraCanvasUsesDarkTheme(canvas) {
	const root = canvas && canvas.closest('.camera-dashboard');
	if (root && root.dataset.cameraTheme)
		return root.dataset.cameraTheme === 'dark';
	return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function cameraIcon(name, extraClass) {
	return E('span', { class:`camera-icon camera-icon-${name}${extraClass ? ` ${extraClass}` : ''}`, 'aria-hidden':'true' });
}

function scrollToCameraSection(id) {
	const target = document.getElementById(id);
	if (target)
		target.scrollIntoView({ behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block:'start' });
}

function stableClientColor(mac, lightTheme) {
	let hash = 0;
	for (const char of String(mac || ''))
		hash = ((hash << 5) - hash + char.charCodeAt(0)) | 0;
	const palette = lightTheme === undefined
		? (document.body.classList.contains('camera-theme-light') ? AP_CHART_COLORS_LIGHT : AP_CHART_COLORS)
		: (lightTheme ? AP_CHART_COLORS_LIGHT : AP_CHART_COLORS);
	return palette[Math.abs(hash) % palette.length];
}

const dashboardStyles = `
body.camera-console-active .main-right,
body.camera-console-active #maincontent,
body.camera-console-active #maincontent > .container,
body.camera-console-active #view { background:#090b0e !important; }
body.camera-console-active #maincontent > .container { max-width:none; }
body.camera-console-active #mainmenu {
	scrollbar-width:none !important;
	-ms-overflow-style:none !important;
}
body.camera-console-active #mainmenu::-webkit-scrollbar { width:0;height:0;display:none; }
body.camera-sidebar-hidden #mainmenu {
	width:0 !important;
	min-width:0 !important;
	overflow:hidden !important;
	box-shadow:none !important;
	transition:width .22s ease;
}
.camera-dashboard {
	--camera-navy:#f5f7fa;
	--camera-slate:#a3a9b3;
	--camera-blue:#f59e0b;
	--camera-teal:#16a078;
	--camera-surface:#15181d;
	--camera-surface-2:#1c2026;
	--camera-border:#2b3038;
	color:var(--camera-navy);
	font-family:-apple-system,BlinkMacSystemFont,"Inter","SF Pro Display",sans-serif;
	letter-spacing:.005em;
	color-scheme:dark;
	container-type:inline-size;
	width:100%;
	max-width:100%;
	min-width:0;
	overflow-x:clip;
	font-variant-numeric:tabular-nums;
}
.camera-dashboard *,
.camera-dashboard *::before,
.camera-dashboard *::after { box-sizing:border-box; }
.camera-dashboard .camera-console-bar {
	display:flex; align-items:center; justify-content:space-between; gap:1rem;
	margin-bottom:1rem; padding:.8rem 1rem; background:#111419;
	border:1px solid var(--camera-border); border-radius:10px;
}
.camera-dashboard .camera-console-title { display:flex; flex:1; align-items:center; gap:.8rem; min-width:0; }
.camera-dashboard .camera-console-title h2 { margin:0; color:#fff; font-size:1.35rem; letter-spacing:.04em; }
.camera-dashboard .camera-console-subtitle { color:#7f8792; font-size:.78rem; text-transform:uppercase; letter-spacing:.12em; }
.camera-dashboard .camera-live-dot { width:9px;height:9px;border-radius:50%;background:#22c55e;box-shadow:0 0 0 4px rgba(34,197,94,.12); }
.camera-dashboard .camera-toolbar-actions { display:flex;align-items:center;gap:.6rem; }
.camera-dashboard .camera-sidebar-toggle { background:#242932 !important;border:1px solid #3a414c !important; }
.camera-dashboard.camera-monitor-mode .camera-config-only { display:none !important; }
.camera-dashboard .camera-ready-banner { display:flex;justify-content:space-between;align-items:center;gap:1rem;padding:1rem 1.2rem;margin-bottom:1rem;border-radius:10px;border:1px solid var(--camera-border); }
.camera-dashboard .camera-ready-yes { background:#0d2a20;border-color:#16866d; }
.camera-dashboard .camera-ready-no { background:#332608;border-color:#8a6508; }
.camera-dashboard .camera-ready-word { font-size:1.8rem;font-weight:900;letter-spacing:.08em; }
.camera-dashboard .camera-ready-banner small { display:block;margin-top:.25rem;font-size:.98rem;font-weight:700;opacity:1;color:#f8fafc !important; }
.camera-dashboard .camera-ready-banner > strong { color:#f8fafc !important; }
.camera-dashboard .camera-ready-no small { color:#ffe4a3 !important; }
.camera-dashboard .camera-ready-yes small { color:#b7f7da !important; }
.camera-dashboard .camera-led-control { display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:.65rem;padding:.75rem 1rem !important;margin-bottom:1rem; }
.camera-dashboard .camera-led-brightness { grid-column:1/-1;min-width:0;width:100%;margin-top:.4rem; }
.camera-dashboard .camera-led-brightness label { display:flex;align-items:center;justify-content:space-between;gap:.4rem;font-size:.72rem;color:var(--camera-slate); }
.camera-dashboard .camera-led-brightness input { display:block;width:100%;min-width:0;height:28px;margin:0;accent-color:var(--camera-green,#179447);cursor:pointer; }
.camera-dashboard .camera-led-brightness input:disabled { opacity:.45;cursor:wait; }
.camera-dashboard .camera-live-light { min-width:100px; }
.camera-dashboard .camera-live-light .camera-led-brightness { width:100px; }
.camera-dashboard .camera-led-control > div:first-child { min-width:0; }
.camera-dashboard .camera-led-control strong { display:block;color:var(--camera-navy); }
.camera-dashboard .camera-led-control small { display:block;color:var(--camera-slate);overflow-wrap:anywhere;line-height:1.25; }
.camera-dashboard .camera-temperature-panel { display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.75rem 1rem !important;margin-bottom:1rem; }
.camera-dashboard .camera-temperature-value { font-size:1.65rem;font-weight:900;line-height:1;color:#34d399; }
.camera-dashboard .camera-temperature-value.warm { color:#fbbf24; }
.camera-dashboard .camera-temperature-value.hot { color:#f87171; }
.camera-dashboard .camera-temperature-meta { color:var(--camera-slate);font-size:.82rem;text-align:right; }
.camera-dashboard .camera-status-strip { display:grid;grid-template-columns:minmax(275px,.82fr) minmax(250px,.85fr) minmax(360px,1.33fr);gap:.65rem;margin-bottom:1rem; }
.camera-dashboard .camera-status-strip-client { grid-template-columns:repeat(2,minmax(240px,1fr)); }
.camera-dashboard .camera-status-strip > .cbi-section { min-height:70px;margin:0 !important;padding:.55rem .75rem !important;border-radius:9px;box-shadow:none; }
.camera-dashboard .camera-status-strip .camera-led-control small,
.camera-dashboard .camera-status-strip .camera-temperature-panel small,
.camera-dashboard .camera-status-strip .camera-temperature-meta { display:none; }
.camera-dashboard .camera-status-strip .camera-temperature-value { font-size:1.35rem; }
.camera-dashboard .camera-status-strip button.camera-led-switch { min-height:38px;padding:.2rem .35rem !important; }
.camera-dashboard .camera-status-strip .camera-ap-summary { border-left-width:2px !important; }
.camera-dashboard button.camera-led-switch { display:flex;align-items:center;gap:.65rem;min-width:0;min-height:44px;padding:.4rem .65rem !important;background:transparent !important; }
.camera-dashboard .camera-led-switch-track { position:relative;width:52px;height:30px;flex:0 0 52px;border-radius:999px;background:#4b5563;transition:background .18s ease; }
.camera-dashboard .camera-led-switch-knob { position:absolute;top:3px;left:3px;width:24px;height:24px;border-radius:50%;background:#fff;box-shadow:0 2px 7px rgba(0,0,0,.35);transition:transform .18s ease; }
.camera-dashboard .camera-led-switch-on .camera-led-switch-track { background:#16a078; }
.camera-dashboard .camera-led-switch-on .camera-led-switch-knob { transform:translateX(22px); }
.camera-dashboard .camera-led-switch-label { min-width:2.2rem;color:var(--camera-navy);font-weight:800; }
.camera-dashboard .camera-boot-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr));gap:.5rem;min-width:0; }
.camera-dashboard .camera-boot-step { min-width:0;padding:.65rem .7rem;border-radius:8px;background:var(--camera-surface-2); }
.camera-dashboard .camera-boot-step small { display:block;overflow-wrap:anywhere;line-height:1.25; }
.camera-dashboard .camera-boot-step strong { margin-top:.2rem;white-space:nowrap; }
.camera-dashboard .camera-boot-recovery-title { margin:0 0 .55rem !important;font-size:.82rem !important;letter-spacing:.045em !important;line-height:1.2;overflow-wrap:anywhere; }
.camera-dashboard .camera-boot-recovery-note { display:block;max-width:100%;line-height:1.3;overflow-wrap:anywhere; }
.camera-dashboard h2,
.camera-dashboard h3,
.camera-dashboard .cbi-section h2,
.camera-dashboard .cbi-section h3 {
	color:#f5f7fa !important;
	background:transparent !important;
	border:0 !important;
	box-shadow:none !important;
	padding:0 !important;
}
.camera-dashboard .cbi-section {
	background: var(--camera-surface);
	border: 1px solid var(--camera-border);
	border-radius: 10px;
	box-shadow: 0 12px 30px rgba(0,0,0,.18);
	color:var(--camera-navy);
	min-width:0;
}
.camera-dashboard .cbi-section .cbi-section {
	background: var(--camera-surface-2);
	box-shadow: none;
}
.camera-dashboard h3 { color:#f8fafc; text-transform:uppercase; letter-spacing:.08em; font-size:.85rem; }
.camera-dashboard p, .camera-dashboard small, .camera-dashboard td { color:#d7dbe2; }
.camera-dashboard .cbi-button {
	min-height: 44px;
	padding: .55rem .9rem;
	border: 0 !important;
	border-radius: 7px !important;
	font-size: .92rem;
	font-weight: 750;
	color: #fff !important;
	background: #303640 !important;
	box-shadow: none !important;
}
.camera-dashboard .cbi-button-action { background: #167b61 !important; }
.camera-dashboard .cbi-button-edit { background: var(--camera-blue) !important; }
.camera-dashboard .cbi-button:active { transform: translateY(1px); }
.camera-dashboard .camera-table-scroll { overflow-x: auto; -webkit-overflow-scrolling: touch; border-radius: 12px; }
.camera-dashboard .camera-device-section { padding:1.1rem !important; }
.camera-dashboard .camera-device-section .camera-section-heading { margin:0 0 1rem; min-height:32px; }
.camera-dashboard .camera-device-section .camera-device-tools { margin:0 0 1rem; }
.camera-dashboard .camera-device-section .camera-table-scroll { margin:0; }
.camera-dashboard table { min-width: 680px; background:#111419; color:#e8eaed; }
.camera-dashboard th { color:var(--camera-slate) !important; font-size:.9rem; background:#0d1014 !important; }
.camera-dashboard td { background:transparent !important; border-color:var(--camera-border) !important; }
.camera-dashboard tr { border-color:var(--camera-border) !important; }
.camera-dashboard table tr,
.camera-dashboard table tr:nth-child(odd),
.camera-dashboard table tr:nth-child(even),
.camera-dashboard .cbi-section-table-row { background:#15191f !important; color:#e8eaed !important; }
.camera-dashboard table tr:first-child { background:#0d1014 !important; }
.camera-dashboard tbody tr:hover, .camera-dashboard tr.tr:hover { background:#1b1f25 !important; }
.camera-dashboard td, .camera-dashboard th { padding: .75rem .65rem !important; }
.camera-dashboard .camera-summary-grid {
	display: grid;
	grid-template-columns: 1.35fr .9fr;
	gap: 1rem;
	align-items: stretch;
}
.camera-dashboard .camera-summary-card {
	min-width: 0;
	padding: 1rem !important;
}
.camera-dashboard .camera-summary-card:first-child { border-top:3px solid #16a078; }
.camera-dashboard .camera-summary-card:last-child { border-top:3px solid #f59e0b; }
.camera-dashboard .camera-client-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:.8rem; }
.camera-dashboard .camera-client-card { padding:1rem !important;border-left:3px solid #16a078 !important; }
.camera-dashboard .camera-client-card-header { display:flex;justify-content:space-between;align-items:center;gap:.75rem;margin-bottom:.8rem; }
.camera-dashboard .camera-client-card-header > div:first-child { min-width:0; }
.camera-dashboard .camera-client-card-header strong { display:block;overflow-wrap:anywhere; }
.camera-dashboard .camera-client-card-status { display:flex;align-items:center;gap:.5rem; }
.camera-dashboard .camera-client-temperature { padding:.28rem .5rem;border-radius:999px;background:#253129;color:#34d399;font-size:.78rem;font-weight:850;white-space:nowrap; }
.camera-dashboard .camera-client-temperature.warm { background:#3a2d0d;color:#fbbf24; }
.camera-dashboard .camera-client-temperature.hot { background:#3b1719;color:#fca5a5; }
.camera-dashboard .camera-client-mac { color:var(--camera-slate);font-size:.78rem;font-family:ui-monospace,SFMono-Regular,monospace; }
.camera-dashboard .camera-assignment-row { display:grid;grid-template-columns:minmax(180px,.7fr) minmax(280px,1.3fr);gap:.8rem;align-items:center;padding:.7rem 0;border-bottom:1px solid var(--camera-border); }
.camera-dashboard .camera-assignment-row > div { min-width:0; }
.camera-dashboard .camera-assignment-row select { width:100%;min-width:0; }
.camera-dashboard .camera-assignment-row:last-child { border-bottom:0; }
.camera-dashboard .camera-address-grid { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.65rem; }
.camera-dashboard .camera-address-card { display:grid;grid-template-columns:auto minmax(0,1fr);gap:.65rem .8rem;align-items:start;min-width:0;padding:.8rem;border:1px solid var(--camera-border);border-radius:8px;background:var(--camera-surface-2); }
.camera-dashboard .camera-address-slot { display:grid;place-items:center;width:42px;height:42px;border-radius:8px;background:#19372c;color:#5ae3a8;font-size:1.15rem;font-weight:900; }
.camera-dashboard .camera-address-main { min-width:0; }
.camera-dashboard .camera-address-heading { display:flex;justify-content:space-between;align-items:center;gap:.65rem;min-width:0; }
.camera-dashboard .camera-address-heading strong { min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--camera-navy); }
.camera-dashboard .camera-address-main select { width:100%;min-width:0;min-height:42px;margin-top:.55rem; }
.camera-dashboard .camera-address-details { display:flex;align-items:center;gap:.55rem;flex-wrap:wrap;margin-top:.55rem;color:var(--camera-slate);font-size:.72rem; }
.camera-dashboard .camera-address-details code { overflow-wrap:anywhere;color:inherit;background:transparent;padding:0; }
.camera-dashboard .camera-address-link { display:inline-flex;align-items:center;justify-content:center;gap:.35rem;min-height:34px;padding:.3rem .55rem;border:1px solid #2c5e4b;border-radius:6px;color:#65e5ae;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:800;text-decoration:none;white-space:nowrap; }
.camera-dashboard .camera-address-link:hover { background:#183328;color:#8bf0c3; }
.camera-dashboard .camera-address-status { display:block;margin-top:.45rem;line-height:1.35;color:var(--camera-slate); }
.camera-dashboard .camera-address-status-ready { color:#39d99a; }
.camera-dashboard .camera-address-status-pending { color:#f2b94b; }
.camera-dashboard .camera-client-signal-row { display:flex;justify-content:space-between;align-items:flex-end;gap:.75rem;margin-top:.2rem; }
.camera-dashboard .camera-client-signal-value { font-size:2rem;line-height:1;font-weight:850; }
.camera-dashboard .camera-signal-track { height:16px;background:#303640;border-radius:999px;overflow:hidden;margin:.7rem 0 .45rem; }
.camera-dashboard .camera-signal-fill { height:100%;border-radius:999px;transition:width .35s ease,background .35s ease; }
.camera-dashboard .camera-summary-card h3 { margin: 0 0 .8rem; }
.camera-dashboard .camera-summary-card p { margin: .4rem 0; }
.camera-dashboard .camera-ap-summary { display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.8rem 1rem !important;margin-bottom:1rem;border-left:3px solid #16a078 !important; }
.camera-dashboard .camera-ap-summary-main { display:flex;align-items:center;gap:.8rem;min-width:0; }
.camera-dashboard .camera-ap-health { font-size:1.05rem;font-weight:850;color:#16a078; }
.camera-dashboard .camera-ap-meta { color:var(--camera-slate);font-size:.88rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.camera-dashboard .camera-device-model { font-size: 1.05rem; font-weight: 750; }
.camera-dashboard .camera-device-card-grid { display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:.75rem; }
.camera-dashboard .camera-device-card { padding:.85rem !important;min-width:0; }
.camera-dashboard .camera-device-card-head { display:flex;align-items:center;gap:.65rem; }
.camera-dashboard .camera-device-card-name { min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:800;color:var(--camera-blue); }
.camera-dashboard .camera-device-card-ip { margin:.55rem 0;color:var(--camera-slate);font-family:ui-monospace,SFMono-Regular,monospace; }
.camera-dashboard .camera-device-card-actions { display:flex;align-items:center;gap:.4rem;flex-wrap:wrap; }
.camera-dashboard .camera-device-card-actions .cbi-button { min-width:0;min-height:38px;padding:.35rem .6rem;font-size:.82rem; }
.camera-toast { position:fixed;right:1rem;bottom:max(1rem,env(safe-area-inset-bottom));z-index:9999;display:flex;align-items:center;gap:.75rem;max-width:min(420px,calc(100vw - 2rem));padding:.65rem .7rem .65rem 1rem;border-radius:10px;background:#167b61;color:#fff;font-weight:750;box-shadow:0 12px 30px rgba(0,0,0,.35); }
.camera-toast-error { background:#b42318; }
.camera-toast-message { min-width:0;flex:1; }
.camera-toast-close { appearance:none;border:0;background:rgba(255,255,255,.16);color:#fff;width:32px;height:32px;flex:0 0 32px;border-radius:50%;font-size:1.2rem;line-height:1;cursor:pointer; }
.camera-toast-close:hover { background:rgba(255,255,255,.28); }
.camera-dashboard .camera-device-version { font-size: .9rem; opacity: .68; }
.camera-dashboard .camera-boot-time { font-size: 2rem; line-height: 1; font-weight: 850; }
.camera-dashboard .camera-alert {
	display: flex;
	align-items: center;
	gap: .75rem;
	padding: .85rem 1rem;
	margin: .8rem 0;
	border-radius: 12px;
	font-weight: 750;
	position: sticky;
	top: max(.5rem, env(safe-area-inset-top));
	z-index: 40;
	min-height: 54px;
	box-sizing: border-box;
	box-shadow: 0 8px 24px rgba(15, 23, 42, .14);
}
.camera-dashboard .camera-alert-warning { color:#fbbf24;background:#332608;border:1px solid #8a6508; }
.camera-dashboard .camera-alert-danger { color:#fca5a5;background:#351315;border:1px solid #8d292f; }
.camera-dashboard .camera-alert-message { min-width:0;flex:1; }
.camera-dashboard .camera-alert-close { appearance:none;border:0;background:rgba(255,255,255,.1);color:currentColor;width:32px;height:32px;flex:0 0 32px;border-radius:50%;font-size:1.2rem;line-height:1;cursor:pointer; }
.camera-dashboard .camera-alert-close:hover { background:rgba(255,255,255,.2); }
.camera-dashboard .camera-chart-frame {
	position:relative;
	width:100%;
	height:260px;
	height:clamp(220px,28cqw,300px);
	min-width:0;
	overflow:hidden;
}
.camera-dashboard canvas.camera-chart {
	display:block;
	box-sizing:border-box;
	width:100% !important;
	height:100% !important;
	max-width:100%;
	font-variant-numeric:tabular-nums;
}
.camera-dashboard .camera-device-details { position: relative; }
.camera-dashboard .camera-device-details summary {
	cursor: pointer;
	min-height: 44px;
	display: flex;
	align-items: center;
	font-weight: 750;
	color:#f5b43a;
}
.camera-dashboard .camera-device-details dl {
	position: absolute;
	z-index: 20;
	min-width: 260px;
	max-width: min(420px, calc(100vw - 2rem));
	margin: .25rem 0 0;
	padding: .8rem;
	background:#20242b;
	border: 1px solid var(--camera-border);
	border-radius: 12px;
	box-shadow:0 14px 32px rgba(0,0,0,.45);
}
.camera-dashboard .camera-device-details dl, .camera-dashboard .camera-device-details dt, .camera-dashboard .camera-device-details dd { color:#e5e7eb !important; }
.camera-dashboard .camera-device-details dt { font-size: .8rem; color: var(--camera-slate); }
.camera-dashboard .camera-device-details dd { margin: .1rem 0 .55rem; overflow-wrap: anywhere; }
.camera-dashboard .camera-device-tools { display:flex; gap:.65rem; align-items:center; flex-wrap:wrap; margin:.25rem 0 .8rem; }
.camera-dashboard .camera-device-tools input,
.camera-dashboard .camera-device-tools select {
	min-height: 46px;
	box-sizing: border-box;
	border: 1px solid var(--camera-border);
	border-radius: 10px;
	background:#0f1216;
	color:#f3f4f6;
	font-size: 1rem;
	padding: .5rem .75rem;
}
.camera-dashboard input::placeholder { color:#7f8792; opacity:1; }
.camera-dashboard .camera-device-tools input { min-width: 220px; }
.camera-dashboard .camera-filter-group { display:flex; gap:.35rem; padding:.25rem; border-radius:9px; background:#0d1014; border:1px solid var(--camera-border); }
.camera-dashboard .camera-filter-button { color:var(--camera-slate) !important; background:transparent !important; }
.camera-dashboard .camera-filter-button-active { color:#fff !important; background:var(--camera-blue) !important; }
.camera-dashboard .camera-pin { min-width:38px !important;width:38px;min-height:38px;padding:.25rem !important;border-radius:999px !important;font-size:1.05rem !important; }
.camera-dashboard .camera-pin-active { background:#d97706 !important; }
.camera-dashboard .camera-table-scroll td:first-child::before { display:none !important;content:none !important; }
.camera-dashboard .camera-pinned-row { background:#fffbeb !important; }
.camera-dashboard .camera-section-heading h3 { width:auto !important; flex:0 1 auto !important; margin:0 !important; }
body.camera-console-active.camera-theme-light .main-right,
body.camera-console-active.camera-theme-light #maincontent,
body.camera-console-active.camera-theme-light #maincontent > .container,
body.camera-console-active.camera-theme-light #view { background:#f2f4f3 !important; }
.camera-dashboard[data-camera-theme="light"] {
	--camera-navy:#17211d;
	--camera-slate:#5e6d66;
	--camera-blue:#b76500;
	--camera-teal:#117a5a;
	--camera-surface:#ffffff;
	--camera-surface-2:#f5f7f6;
	--camera-border:#ced8d3;
	color-scheme:light;
}
.camera-dashboard[data-camera-theme="light"] .camera-console-bar { background:#fff; box-shadow:0 8px 24px rgba(0,0,0,.06); }
.camera-dashboard[data-camera-theme="light"] .camera-console-title h2,
.camera-dashboard[data-camera-theme="light"] h2,
.camera-dashboard[data-camera-theme="light"] h3,
.camera-dashboard[data-camera-theme="light"] .cbi-section h2,
.camera-dashboard[data-camera-theme="light"] .cbi-section h3 { color:#17211d !important; }
.camera-dashboard[data-camera-theme="light"] .camera-console-subtitle { color:#5e6d66; }
.camera-dashboard[data-camera-theme="light"] .camera-sidebar-toggle { color:#17211d !important; background:#e9eeeb !important; border-color:#ced8d3 !important; }
.camera-dashboard[data-camera-theme="light"] p,
.camera-dashboard[data-camera-theme="light"] small,
.camera-dashboard[data-camera-theme="light"] td { color:#34413b; }
.camera-dashboard[data-camera-theme="light"] table { background:#fff; color:#17211d; }
.camera-dashboard[data-camera-theme="light"] th { color:#5e6d66 !important; background:#f2f4f3 !important; }
.camera-dashboard[data-camera-theme="light"] table tr,
.camera-dashboard[data-camera-theme="light"] table tr:nth-child(odd),
.camera-dashboard[data-camera-theme="light"] table tr:nth-child(even),
.camera-dashboard[data-camera-theme="light"] .cbi-section-table-row { background:#fff !important; color:#17211d !important; }
.camera-dashboard[data-camera-theme="light"] table tr:first-child { background:#f2f4f3 !important; }
.camera-dashboard[data-camera-theme="light"] tbody tr:hover,
.camera-dashboard[data-camera-theme="light"] tr.tr:hover { background:#f5f7f6 !important; }
.camera-dashboard[data-camera-theme="light"] .camera-device-tools input { color:#17211d; background:#fff; }
.camera-dashboard[data-camera-theme="light"] input::placeholder { color:#6e7c75; }
.camera-dashboard[data-camera-theme="light"] .camera-filter-group { background:#e9eeeb; }
.camera-dashboard[data-camera-theme="light"] .camera-filter-button { color:#34413b !important; }
.camera-dashboard[data-camera-theme="light"] .camera-filter-button-active { color:#fff !important; background:#b76500 !important; }
.camera-dashboard[data-camera-theme="light"] .camera-device-details dl { background:#fff; }
.camera-dashboard[data-camera-theme="light"] .camera-signal-track { background:#dfe7e3; }
.camera-dashboard[data-camera-theme="light"] .camera-device-details dl,
.camera-dashboard[data-camera-theme="light"] .camera-device-details dt,
.camera-dashboard[data-camera-theme="light"] .camera-device-details dd { color:#17211d !important; }
@media (display-mode: standalone) {
	.camera-dashboard { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
	.camera-dashboard .camera-alert { top: max(.75rem, env(safe-area-inset-top)); }
}
@media (max-width: 1024px) {
	.camera-dashboard { font-size:16px; }
	.camera-dashboard .cbi-button { min-height:44px;min-width:0; }
	.camera-dashboard .camera-alert { font-size:1rem; }
}
@media (max-width: 820px) {
	.camera-dashboard .camera-summary-grid { grid-template-columns: 1.25fr .9fr; }
	.camera-dashboard .camera-status-strip { grid-template-columns:1fr; }
	.camera-dashboard .camera-console-bar { gap:.6rem;padding:.65rem .75rem; }
	.camera-dashboard .camera-console-title h2 { font-size:1.15rem;white-space:nowrap; }
	.camera-dashboard .camera-console-title .camera-console-subtitle { display:none; }
	.camera-dashboard .camera-toolbar-actions { gap:.4rem; }
	.camera-dashboard .camera-toolbar-actions .cbi-button { min-width:0;padding:.5rem .7rem; }
}
@media (max-width: 1024px) {
	.camera-dashboard .camera-assignment-row { grid-template-columns:1fr;align-items:stretch; }
	.camera-dashboard .camera-assignment-row select { min-height:44px; }
}
@media (max-width: 720px) {
	.camera-dashboard { font-size: 16px; }
	.camera-dashboard .cbi-section { padding: .8rem !important; }
	.camera-dashboard .camera-summary-grid { grid-template-columns: 1fr; }
	.camera-dashboard .camera-device-tools input { width:100%; min-width:0; }
	.camera-dashboard .camera-filter-group { width:100%;display:grid;grid-template-columns:1fr 1fr;gap:.35rem; }
	.camera-dashboard .camera-filter-group .cbi-button { min-width:0;width:100%; }
	.camera-dashboard .camera-filter-group .cbi-button:first-child { grid-column:1 / -1; }
	.camera-dashboard .camera-assignment-row { grid-template-columns:1fr; }
	.camera-dashboard .camera-boot-grid { grid-template-columns:1fr; }
	.camera-dashboard .camera-client-card-header { align-items:flex-start;flex-wrap:wrap; }
	.camera-dashboard .camera-client-card-status { margin-left:auto; }
	.camera-dashboard .camera-export-button,
	.camera-dashboard .camera-live-label { display:none !important; }
	.camera-dashboard .camera-console-title { overflow:hidden; }
	.camera-dashboard .camera-console-title h2 { font-size:.95rem;letter-spacing:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
	/* LuCI already provides its own sidebar control in the phone header. */
	.camera-dashboard .camera-sidebar-toggle { display:none !important; }
	.camera-dashboard .camera-monitor-button { min-width:0 !important;padding:.45rem .5rem !important;font-size:.8rem; }
	.camera-dashboard .camera-ready-banner > strong { display:none; }
	.camera-dashboard .camera-ap-summary { align-items:flex-start;flex-direction:column;gap:.3rem; }
	.camera-dashboard .camera-ap-summary-main { display:flex;width:100%;justify-content:space-between;gap:.6rem; }
	.camera-dashboard .camera-ap-summary-main h3 { white-space:nowrap;font-size:.8rem; }
	.camera-dashboard .camera-ap-health { margin:0;font-size:.95rem; }
	.camera-dashboard .camera-ap-meta { width:100%;white-space:normal;font-size:.78rem; }
	.camera-dashboard .camera-filter-group .cbi-button { padding:.45rem .35rem;font-size:.82rem;white-space:nowrap; }
	.camera-dashboard .camera-led-control { display:grid;grid-template-columns:minmax(0,1fr) auto;gap:.65rem; }
	.camera-dashboard button.camera-led-switch { padding:.25rem !important;gap:0;background:transparent !important; }
	.camera-dashboard .camera-led-switch-track { width:48px;height:28px;flex-basis:48px; }
	.camera-dashboard .camera-led-switch-knob { width:22px;height:22px; }
	.camera-dashboard .camera-led-switch-on .camera-led-switch-knob { transform:translateX(20px); }
	.camera-dashboard .camera-led-switch-label { display:none; }
	.camera-dashboard .camera-device-card-actions { display:grid;grid-template-columns:repeat(3,1fr);width:100%; }
	.camera-dashboard .camera-device-card-actions > div:first-child { grid-column:1 / -1;justify-content:flex-start !important; }
	.camera-dashboard .camera-device-card-actions .cbi-button { width:100%; }
	.camera-dashboard .camera-chart-note { display:none !important; }
	.camera-dashboard .camera-table-scroll { overflow:visible;border-radius:0; }
	.camera-dashboard .camera-table-scroll table { display:block;min-width:0;width:100%;background:transparent !important; }
	.camera-dashboard .camera-table-scroll tbody { display:block;width:100%; }
	.camera-dashboard .camera-table-scroll thead tr:first-child { display:none !important; }
	.camera-dashboard .camera-table-scroll tbody tr {
		display:grid !important;
		grid-template-columns:52px minmax(0,1fr) auto;
		grid-template-areas:"pin name status" "pin ip ip" "action action action";
		gap:.45rem .7rem;
		align-items:center;
		min-width:0 !important;
		margin:0 0 .75rem;
		padding:.85rem !important;
		border:1px solid var(--camera-border) !important;
		border-radius:14px;
		background:var(--camera-surface-2) !important;
	}
	.camera-dashboard .camera-table-scroll td { display:block !important;width:auto !important;min-width:0;padding:0 !important;border:0 !important; }
	.camera-dashboard .camera-table-scroll td::before { display:none !important;content:none !important; }
	.camera-dashboard .camera-table-scroll td:nth-child(1) { grid-area:pin;align-self:start; }
	.camera-dashboard .camera-table-scroll td:nth-child(2) { grid-area:name;font-size:1.05rem; }
	.camera-dashboard .camera-table-scroll td:nth-child(3),
	.camera-dashboard .camera-table-scroll td:nth-child(5),
	.camera-dashboard .camera-table-scroll td:nth-child(6) { display:none !important; }
	.camera-dashboard .camera-table-scroll td:nth-child(4) { grid-area:ip;color:var(--camera-slate) !important;font-family:ui-monospace,SFMono-Regular,monospace; }
	.camera-dashboard .camera-table-scroll td:nth-child(7) { grid-area:status;justify-self:end; }
	.camera-dashboard .camera-table-scroll td:nth-child(8) { grid-area:action;margin-top:.35rem; }
	.camera-dashboard .camera-table-scroll td:nth-child(8) .cbi-button,
	.camera-dashboard .camera-table-scroll td:nth-child(8) summary { width:100%;min-height:44px; }
	.camera-dashboard .camera-table-scroll .camera-pin { min-width:44px !important;width:44px;min-height:44px;padding:.2rem !important; }
}

/* Signal-first AP operations board. */
.camera-dashboard .camera-icon {
	display:inline-block;
	width:1.15rem;
	height:1.15rem;
	flex:0 0 1.15rem;
	background:currentColor;
	-webkit-mask:var(--camera-icon) center / contain no-repeat;
	mask:var(--camera-icon) center / contain no-repeat;
}
.camera-dashboard .camera-icon-network { --camera-icon:url('/luci-static/resources/view/camera-network/icons/network.svg'); }
.camera-dashboard .camera-icon-signal { --camera-icon:url('/luci-static/resources/view/camera-network/icons/antenna-signal.svg'); }
.camera-dashboard .camera-icon-devices { --camera-icon:url('/luci-static/resources/view/camera-network/icons/computer.svg'); }
.camera-dashboard .camera-icon-upload { --camera-icon:url('/luci-static/resources/view/camera-network/icons/upload.svg'); }
.camera-dashboard .camera-icon-download { --camera-icon:url('/luci-static/resources/view/camera-network/icons/download.svg'); }
.camera-dashboard .camera-icon-dashboard { --camera-icon:url('/luci-static/resources/view/camera-network/icons/dashboard-speed.svg'); }
.camera-dashboard .camera-icon-clients { --camera-icon:url('/luci-static/resources/view/camera-network/icons/group.svg'); }
.camera-dashboard .camera-icon-chart { --camera-icon:url('/luci-static/resources/view/camera-network/icons/graph-up.svg'); }
.camera-dashboard .camera-icon-search { --camera-icon:url('/luci-static/resources/view/camera-network/icons/search.svg'); }
.camera-dashboard .camera-icon-pin { --camera-icon:url('/luci-static/resources/view/camera-network/icons/pin.svg'); }
.camera-dashboard .camera-icon-more { --camera-icon:url('/luci-static/resources/view/camera-network/icons/more-horiz.svg'); }
.camera-dashboard .camera-icon-camera { --camera-icon:url('/luci-static/resources/view/camera-network/icons/camera.svg'); }
.camera-dashboard .camera-icon-edit { --camera-icon:url('/luci-static/resources/view/camera-network/icons/edit-pencil.svg'); }
.camera-dashboard .camera-icon-hide { --camera-icon:url('/luci-static/resources/view/camera-network/icons/eye-off.svg'); }
.camera-dashboard .camera-icon-undo { --camera-icon:url('/luci-static/resources/view/camera-network/icons/undo.svg'); }
.camera-dashboard .camera-icon-check { --camera-icon:url('/luci-static/resources/view/camera-network/icons/check-circle.svg'); }
.camera-dashboard .camera-icon-clock { --camera-icon:url('/luci-static/resources/view/camera-network/icons/clock.svg'); }
.camera-dashboard .camera-icon-temperature { --camera-icon:url('/luci-static/resources/view/camera-network/icons/temperature-high.svg'); }
.camera-dashboard .camera-icon-light { --camera-icon:url('/luci-static/resources/view/camera-network/icons/light-bulb-on.svg'); }
.camera-dashboard .camera-ops-shell {
	display:grid;
	grid-template-columns:224px minmax(0,1fr);
	min-width:0;
	min-height:calc(100dvh - 1rem);
	background:#090c0e;
	border:1px solid #252d2a;
	border-radius:12px;
	overflow:hidden;
}
.camera-dashboard .camera-ops-sidebar {
	position:sticky;
	top:0;
	align-self:start;
	height:calc(100dvh - 1rem);
	box-sizing:border-box;
	display:flex;
	flex-direction:column;
	gap:1rem;
	padding:1.2rem 1rem;
	background:#0f1413;
	border-right:1px solid #25302c;
	overflow-y:auto;
	overscroll-behavior:contain;
	scrollbar-width:none;
	-ms-overflow-style:none;
}
.camera-dashboard .camera-ops-sidebar::-webkit-scrollbar { width:0;height:0;display:none; }
.camera-dashboard .camera-side-brand {
	display:flex;
	align-items:center;
	gap:.7rem;
	min-width:0;
	padding-bottom:1rem;
	border-bottom:1px solid #27312e;
}
.camera-dashboard .camera-side-brand-icon {
	display:grid;
	place-items:center;
	width:34px;
	height:34px;
	flex:0 0 34px;
	border:1px solid #38594c;
	border-radius:8px;
	color:#54e0a5;
	background:#13221c;
}
.camera-dashboard .camera-side-brand strong { display:block;color:#f7faf8;font-size:.95rem;letter-spacing:.045em; }
.camera-dashboard .camera-side-brand small { display:block;margin-top:.15rem;color:#728078;font-size:.67rem;text-transform:uppercase;letter-spacing:.11em; }
.camera-dashboard .camera-side-ready {
	padding:.85rem;
	border:1px solid #315345;
	border-radius:9px;
	background:#10241c;
}
.camera-dashboard .camera-side-ready.camera-side-ready-no { border-color:#6e541e;background:#251d0b; }
.camera-dashboard .camera-side-ready-state { display:flex;align-items:center;gap:.45rem;color:#57e8aa;font-size:1.35rem;font-weight:900;letter-spacing:.09em; }
.camera-dashboard .camera-side-ready-no .camera-side-ready-state { color:#f6b942; }
.camera-dashboard .camera-side-ready small { display:block;margin-top:.3rem;color:#a5b5ad;line-height:1.35; }
.camera-dashboard .camera-side-metrics { display:grid;grid-template-columns:1fr;gap:.55rem; }
.camera-dashboard .camera-side-metric {
	min-width:0;
	padding:.7rem .75rem;
	border:1px solid #2b3532;
	border-radius:8px;
	background:#141a18;
}
.camera-dashboard .camera-side-metric-head { display:flex;align-items:center;justify-content:space-between;gap:.5rem;color:#8d9a94;font-size:.67rem;text-transform:uppercase;letter-spacing:.1em; }
.camera-dashboard .camera-side-metric-head .camera-icon { color:#59dca3; }
.camera-dashboard .camera-side-metric-value { margin-top:.4rem;color:#f4f8f6;font-size:1rem;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.camera-dashboard .camera-side-metric-meta { display:block;margin-top:.2rem;color:#718078;font-size:.72rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.camera-dashboard .camera-side-metric .camera-led-switch-label { display:none; }
.camera-dashboard .camera-side-nav { display:grid;gap:.35rem;margin-top:.1rem; }
.camera-dashboard .camera-side-nav button {
	display:flex;
	align-items:center;
	gap:.65rem;
	width:100%;
	min-height:42px;
	padding:.55rem .65rem;
	border:0;
	border-radius:7px;
	color:#83918a;
	background:transparent;
	font:inherit;
	font-size:.82rem;
	font-weight:750;
	text-align:left;
	cursor:pointer;
}
.camera-dashboard .camera-side-nav button:first-child,
.camera-dashboard .camera-side-nav button:hover { color:#5be5aa;background:#17231e; }
.camera-dashboard .camera-side-footer { margin-top:auto;color:#5f6b65;font-size:.68rem;line-height:1.45; }
.camera-dashboard .camera-ops-main {
	min-width:0;
	padding:1rem 1.1rem 1.35rem;
	background:#0a0e10;
	overflow-x:clip;
}
.camera-dashboard .camera-main-toolbar {
	display:flex;
	align-items:center;
	justify-content:space-between;
	gap:1rem;
	min-height:48px;
	margin-bottom:.85rem;
}
.camera-dashboard .camera-main-heading { min-width:0; }
.camera-dashboard .camera-main-heading h2 { margin:0;font-size:1.12rem;letter-spacing:.055em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.camera-dashboard .camera-main-heading small { display:block;margin-top:.15rem;color:#6f7c76;font-size:.7rem;text-transform:uppercase;letter-spacing:.09em; }
.camera-dashboard .camera-main-actions { display:flex;align-items:center;gap:.45rem;flex:0 0 auto; }
.camera-dashboard .camera-main-actions .cbi-button {
	display:inline-flex;
	align-items:center;
	justify-content:center;
	gap:.4rem;
	min-height:38px;
	padding:.4rem .65rem;
	border:1px solid #2d3834 !important;
	background:#151b19 !important;
	color:#b6c0bb !important;
	font-size:.78rem;
}
.camera-dashboard .camera-main-actions .camera-monitor-button { color:#07110d !important;background:#55dca4 !important;border-color:#55dca4 !important; }
.camera-dashboard .camera-panel {
	min-width:0;
	margin:0 0 .85rem;
	padding:.95rem 1rem;
	border:1px solid #27312e;
	border-radius:9px;
	background:#101513;
	box-shadow:none;
}
.camera-dashboard .camera-panel-heading {
	display:flex;
	align-items:flex-start;
	justify-content:space-between;
	gap:1rem;
	margin-bottom:.75rem;
}
.camera-dashboard .camera-panel-title { display:flex;align-items:center;gap:.5rem;min-width:0;color:#eaf0ed; }
.camera-dashboard .camera-panel-title .camera-icon { color:#59dda5; }
.camera-dashboard .camera-panel-title h3 { margin:0;font-size:.78rem;letter-spacing:.11em; }
.camera-dashboard .camera-panel-heading small { color:#6f7d76;font-size:.68rem;line-height:1.35;text-align:right; }
.camera-dashboard .camera-live-scroll,
.camera-dashboard .camera-device-table-scroll { width:100%;min-width:0;overflow-x:auto;-webkit-overflow-scrolling:touch; }
.camera-dashboard table.camera-live-table,
.camera-dashboard table.camera-device-table {
	width:100%;
	margin:0;
	border:0;
	border-collapse:collapse;
	background:transparent;
	color:#e8eeeb;
	font-variant-numeric:tabular-nums;
}
.camera-dashboard table.camera-live-table { min-width:850px;table-layout:auto; }
.camera-dashboard table.camera-device-table { min-width:760px; }
.camera-dashboard table.camera-live-table tr,
.camera-dashboard table.camera-device-table tr,
.camera-dashboard table.camera-live-table tr:nth-child(odd),
.camera-dashboard table.camera-live-table tr:nth-child(even),
.camera-dashboard table.camera-device-table tr:nth-child(odd),
.camera-dashboard table.camera-device-table tr:nth-child(even) { background:transparent !important; }
.camera-dashboard table.camera-live-table th,
.camera-dashboard table.camera-device-table th {
	padding:.45rem .55rem .55rem !important;
	border:0 !important;
	border-bottom:1px solid #28312e !important;
	background:transparent !important;
	color:#65726c !important;
	font-size:.64rem;
	font-weight:800;
	text-transform:uppercase;
	letter-spacing:.075em;
	white-space:nowrap;
}
.camera-dashboard table.camera-live-table td,
.camera-dashboard table.camera-device-table td {
	padding:.7rem .55rem !important;
	border:0 !important;
	border-bottom:1px solid #202825 !important;
	background:transparent !important;
	color:#dfe6e2 !important;
	font-size:.78rem;
	vertical-align:middle;
}
.camera-dashboard table.camera-live-table tbody tr:last-child td,
.camera-dashboard table.camera-device-table tbody tr:last-child td { border-bottom:0 !important; }
.camera-dashboard .camera-link-name { display:flex;align-items:center;gap:.55rem;min-width:155px; }
.camera-dashboard .camera-link-name .camera-icon { color:#5ae3a8; }
.camera-dashboard .camera-link-name-text { min-width:0; }
.camera-dashboard .camera-link-name strong { display:block;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f2f7f4; }
.camera-dashboard .camera-link-name small { display:block;margin-top:.18rem;max-width:190px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#6d7b74;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.65rem; }
.camera-dashboard .camera-link-arrow { color:#52625a; }
.camera-dashboard .camera-metric { color:#eef5f1;font-weight:800;white-space:nowrap;letter-spacing:0;font-stretch:normal; }
.camera-dashboard .camera-metric-good { color:#5ce6aa; }
.camera-dashboard .camera-metric-warn { color:#f3b94a; }
.camera-dashboard .camera-metric-bad { color:#f47c7c; }
.camera-dashboard .camera-status-pill {
	display:inline-flex;
	align-items:center;
	gap:.35rem;
	min-height:26px;
	padding:.15rem .5rem;
	border-radius:999px;
	background:#173025;
	color:#5ce1a7;
	font-size:.68rem;
	font-weight:850;
	white-space:nowrap;
}
.camera-dashboard .camera-status-pill::before { content:'';width:6px;height:6px;border-radius:50%;background:currentColor; }
.camera-dashboard .camera-status-pill-pending { color:#f3b94a;background:#302713; }
.camera-dashboard .camera-status-pill-offline { color:#e58a8a;background:#301a1a; }
.camera-dashboard .camera-live-light .camera-led-switch { min-height:32px;padding:.15rem .25rem !important; }
.camera-dashboard .camera-live-light .camera-led-switch-track { width:40px;height:24px;flex-basis:40px; }
.camera-dashboard .camera-live-light .camera-led-switch-knob { width:18px;height:18px; }
.camera-dashboard .camera-live-light .camera-led-switch-on .camera-led-switch-knob { transform:translateX(16px); }
.camera-dashboard .camera-live-light .camera-led-switch-label { display:none; }
.camera-dashboard .camera-chart-panel { padding-bottom:.65rem; }
.camera-dashboard .camera-chart-legend { display:flex;align-items:center;justify-content:flex-end;gap:.7rem;min-width:0;flex-wrap:wrap; }
.camera-dashboard .camera-chart-legend span { display:inline-flex;align-items:center;gap:.35rem;max-width:180px;color:#8b9892;font-size:.7rem;font-weight:750;white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
.camera-dashboard .camera-legend-dot { width:7px;height:7px;flex:0 0 7px;border-radius:50%;background:currentColor; }
.camera-dashboard .camera-chart-summary { display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-top:.45rem;color:#68756f;font-size:.67rem; }
.camera-dashboard .camera-chart-summary strong { color:#9ba7a1;font-weight:700; }
.camera-dashboard .camera-assignment-panel { padding:.95rem 1rem !important; }
.camera-dashboard .camera-assignment-panel .camera-assignment-row { grid-template-columns:minmax(155px,.75fr) minmax(280px,1.25fr); }
.camera-dashboard .camera-device-section.camera-ops-devices { padding:.95rem 1rem !important;box-shadow:none; }
.camera-dashboard .camera-device-section.camera-ops-devices .camera-section-heading { margin-bottom:.75rem; }
.camera-dashboard .camera-device-tools { display:grid;grid-template-columns:minmax(220px,1fr) auto;gap:.65rem; }
.camera-dashboard .camera-search-wrap { position:relative;min-width:0; }
.camera-dashboard .camera-search-wrap .camera-icon { position:absolute;left:.75rem;top:50%;transform:translateY(-50%);color:#64716a;pointer-events:none; }
.camera-dashboard .camera-search-wrap input { width:100%;min-width:0;padding-left:2.35rem; }
.camera-dashboard .camera-device-primary { display:flex;align-items:center;gap:.55rem;min-width:150px; }
.camera-dashboard .camera-device-primary .camera-icon { color:#6e7d75; }
.camera-dashboard .camera-device-primary a { display:block;min-width:0;max-width:210px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#f0f5f2;font-weight:800;text-decoration:none; }
.camera-dashboard .camera-device-role { display:block;margin-top:.12rem;color:#65726c;font-size:.64rem;text-transform:uppercase;letter-spacing:.06em; }
.camera-dashboard .camera-device-ip { color:#b7c2bc;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;white-space:nowrap; }
.camera-dashboard .camera-device-ip a { color:inherit;text-decoration:none; }
.camera-dashboard .camera-device-ip a:hover { text-decoration:underline; }
.camera-dashboard .camera-device-actions { display:flex;align-items:center;justify-content:flex-end;gap:.25rem;white-space:nowrap; }
.camera-dashboard .camera-device-actions .cbi-button,
.camera-dashboard .camera-device-table .camera-pin { display:inline-flex;align-items:center;justify-content:center;min-width:34px !important;width:34px;min-height:34px;padding:.2rem !important;border:1px solid #2d3934 !important;background:#171d1b !important;color:#8f9c96 !important; }
.camera-dashboard .camera-device-table .camera-pin-active { color:#f5b942 !important;border-color:#7a5d22 !important;background:#251e0f !important; }
.camera-dashboard .camera-device-actions .camera-action-label { display:none; }
.camera-dashboard .camera-device-details summary { min-width:34px;min-height:34px;justify-content:center;color:#8f9c96;font-size:.72rem; }
.camera-dashboard .camera-device-details summary .camera-icon { margin-right:.3rem; }
.camera-dashboard .camera-empty-state { padding:1.5rem;color:#7c8983;text-align:center; }
.camera-dashboard button:focus-visible,
.camera-dashboard a:focus-visible,
.camera-dashboard input:focus-visible,
.camera-dashboard select:focus-visible,
.camera-dashboard summary:focus-visible { outline:2px solid #5ae1a8 !important;outline-offset:2px; }

@media (max-height:850px) and (min-width:1080px) {
	.camera-dashboard .camera-ops-main { padding-top:.65rem; }
	.camera-dashboard .camera-main-toolbar { min-height:36px;margin-bottom:.4rem; }
	.camera-dashboard .camera-panel { margin-bottom:.55rem;padding:.65rem .8rem; }
	.camera-dashboard .camera-live-panel .camera-panel-heading,
	.camera-dashboard .camera-chart-panel .camera-panel-heading { margin-bottom:.4rem; }
	.camera-dashboard .camera-chart-frame { height:205px; }
	.camera-dashboard .camera-chart-summary { margin-top:.25rem; }
	.camera-dashboard table.camera-live-table th { padding:.3rem .45rem .4rem !important; }
	.camera-dashboard table.camera-live-table td { padding:.42rem .45rem !important; }
}
@container (max-width:1080px) {
	.camera-dashboard .camera-ops-shell { grid-template-columns:1fr; }
	.camera-dashboard .camera-ops-sidebar {
		position:static;
		height:auto;
		display:grid;
		grid-template-columns:minmax(190px,1.2fr) repeat(3,minmax(130px,1fr));
		gap:.6rem;
		padding:.75rem;
		border-right:0;
		border-bottom:1px solid #25302c;
		overflow:visible;
	}
	.camera-dashboard .camera-side-brand { grid-column:1 / -1;padding:0;border-bottom:0; }
	.camera-dashboard .camera-side-ready { padding:.65rem .75rem; }
	.camera-dashboard .camera-side-ready-state { font-size:1.05rem; }
	.camera-dashboard .camera-side-ready small { white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
	.camera-dashboard .camera-side-metrics { display:contents; }
	.camera-dashboard .camera-side-metric { padding:.55rem .65rem; }
	.camera-dashboard .camera-side-nav,
	.camera-dashboard .camera-side-footer { display:none; }
	.camera-dashboard .camera-ops-main { padding:.8rem; }
	.camera-dashboard .camera-live-scroll { overflow-x:auto; }
	.camera-dashboard .camera-chart-frame { height:235px; }
}
@media (max-width:1080px) {
	.camera-dashboard .camera-ops-shell { grid-template-columns:1fr; }
	.camera-dashboard .camera-ops-sidebar { position:static;height:auto;display:grid;grid-template-columns:minmax(190px,1.2fr) repeat(3,minmax(130px,1fr));gap:.6rem;padding:.75rem;border-right:0;border-bottom:1px solid #25302c;overflow:visible; }
	.camera-dashboard .camera-side-brand { grid-column:1 / -1;padding:0;border-bottom:0; }
	.camera-dashboard .camera-side-ready { padding:.65rem .75rem; }
	.camera-dashboard .camera-side-ready-state { font-size:1.05rem; }
	.camera-dashboard .camera-side-ready small { white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
	.camera-dashboard .camera-side-metrics { display:contents; }
	.camera-dashboard .camera-side-metric { padding:.55rem .65rem; }
	.camera-dashboard .camera-side-nav,.camera-dashboard .camera-side-footer { display:none; }
	.camera-dashboard .camera-ops-main { padding:.8rem; }
	.camera-dashboard .camera-chart-frame { height:235px; }
}
@media (max-width:900px) {
	.camera-dashboard .camera-ops-shell { grid-template-columns:1fr; }
	.camera-dashboard .camera-ops-sidebar { position:static;height:auto;display:grid;grid-template-columns:minmax(190px,1.2fr) repeat(3,minmax(130px,1fr));gap:.6rem;padding:.75rem;border-right:0;border-bottom:1px solid #25302c;overflow:visible; }
	.camera-dashboard .camera-side-brand { grid-column:1 / -1;padding:0;border-bottom:0; }
	.camera-dashboard .camera-side-ready { padding:.65rem .75rem; }
	.camera-dashboard .camera-side-ready-state { font-size:1.05rem; }
	.camera-dashboard .camera-side-ready small { white-space:nowrap;overflow:hidden;text-overflow:ellipsis; }
	.camera-dashboard .camera-side-metrics { display:contents; }
	.camera-dashboard .camera-side-metric { padding:.55rem .65rem; }
	.camera-dashboard .camera-side-nav,.camera-dashboard .camera-side-footer { display:none; }
	.camera-dashboard .camera-ops-main { padding:.8rem; }
	.camera-dashboard .camera-chart-frame { height:235px; }
	.camera-dashboard .camera-live-scroll { overflow:visible; }
	.camera-dashboard table.camera-live-table { display:block;min-width:0;width:100%;background:transparent !important; }
	.camera-dashboard table.camera-live-table thead { display:none !important; }
	.camera-dashboard table.camera-live-table tbody { display:grid;width:100%;gap:.55rem; }
	.camera-dashboard table.camera-live-table tr {
		display:grid !important;
		grid-template-columns:minmax(180px,1.6fr) repeat(4,minmax(62px,.7fr));
		grid-template-rows:auto auto;
		gap:.5rem .7rem;
		min-width:0 !important;
		padding:.65rem .7rem !important;
		border:1px solid #24302b !important;
		border-radius:8px;
		background:#121816 !important;
	}
	.camera-dashboard table.camera-live-table td { display:block !important;width:auto !important;min-width:0;padding:0 !important;border:0 !important; }
	.camera-dashboard table.camera-live-table td::before { content:attr(data-label) !important;display:block !important;margin-bottom:.15rem;color:#637069;font-size:.55rem;font-weight:800;text-transform:uppercase;letter-spacing:.065em; }
	.camera-dashboard table.camera-live-table td:nth-child(1) { grid-column:1;grid-row:1 / span 2;align-self:center; }
	.camera-dashboard table.camera-live-table td:nth-child(1)::before { display:none !important; }
	.camera-dashboard table.camera-live-table td:nth-child(2) { grid-column:2;grid-row:1; }
	.camera-dashboard table.camera-live-table td:nth-child(3) { grid-column:3;grid-row:1; }
	.camera-dashboard table.camera-live-table td:nth-child(4) { grid-column:4;grid-row:1; }
	.camera-dashboard table.camera-live-table td:nth-child(5) { grid-column:5;grid-row:1; }
	.camera-dashboard table.camera-live-table td:nth-child(6) { grid-column:2;grid-row:2; }
	.camera-dashboard table.camera-live-table td:nth-child(7) { grid-column:3;grid-row:2; }
	.camera-dashboard table.camera-live-table td:nth-child(8) { grid-column:4;grid-row:2; }
	.camera-dashboard table.camera-live-table td:nth-child(9) { grid-column:5;grid-row:2;align-self:end; }
	.camera-dashboard table.camera-device-table { min-width:0; }
	.camera-dashboard table.camera-device-table th:nth-child(3),
	.camera-dashboard table.camera-device-table td:nth-child(3),
	.camera-dashboard table.camera-device-table th:nth-child(5),
	.camera-dashboard table.camera-device-table td:nth-child(5),
	.camera-dashboard table.camera-device-table th:nth-child(6),
	.camera-dashboard table.camera-device-table td:nth-child(6) { display:none !important; }
	.camera-dashboard table.camera-device-table th,
	.camera-dashboard table.camera-device-table td { padding:.55rem .4rem !important; }
	.camera-dashboard .camera-device-actions > div strong { display:none !important; }
	.camera-dashboard .camera-device-actions .cbi-button,
	.camera-dashboard .camera-device-details summary,
	.camera-dashboard .camera-device-table .camera-pin { width:44px;min-width:44px !important;min-height:44px; }
}

@media (min-width:641px) and (max-width:720px) {
	.camera-dashboard .camera-table-scroll .camera-pin { width:44px;min-width:44px !important;min-height:44px; }
	.camera-dashboard .camera-device-actions {
		display:grid;
		grid-template-columns:repeat(2,minmax(0,1fr));
		align-items:stretch;
		justify-content:stretch;
		gap:.45rem;
		width:100%;
		white-space:normal;
	}
	.camera-dashboard .camera-device-actions > * { min-width:0;width:100%; }
	.camera-dashboard .camera-device-actions > div { display:flex !important;align-items:stretch !important;gap:0 !important;white-space:normal !important; }
	.camera-dashboard .camera-device-actions .camera-action-label { display:inline; }
	.camera-dashboard .camera-device-actions .cbi-button,
	.camera-dashboard .camera-device-details summary {
		justify-content:center;
		width:100% !important;
		min-width:0 !important;
		min-height:44px;
		padding:.3rem .45rem !important;
		gap:.3rem;
	}
	.camera-dashboard .camera-device-details summary { list-style:none; }
	.camera-dashboard .camera-device-details summary::-webkit-details-marker { display:none; }
	.camera-dashboard .camera-device-details[open] { grid-column:1 / -1; }
	.camera-dashboard .camera-device-details[open] dl { position:static;width:100%;min-width:0;max-width:none;margin:.45rem 0 0; }
}
	@media (max-width:640px) {
		.camera-dashboard .camera-address-grid { grid-template-columns:1fr; }
		.camera-dashboard .camera-address-heading { align-items:stretch;flex-direction:column;gap:.45rem; }
		.camera-dashboard .camera-address-link { width:100%; }
		.camera-dashboard .camera-ops-shell { border:0;border-radius:0; }
	.camera-dashboard .camera-ops-sidebar { grid-template-columns:1fr 1fr;padding:.65rem; }
	.camera-dashboard .camera-side-brand { grid-column:1 / -1; }
	.camera-dashboard .camera-side-ready { grid-column:1 / -1; }
	.camera-dashboard .camera-side-metric.camera-config-only { display:block !important;grid-column:1 / -1; }
	.camera-dashboard .camera-ops-main { padding:.65rem; }
	.camera-dashboard .camera-main-toolbar { align-items:flex-start; }
	.camera-dashboard .camera-main-heading small { display:none; }
	.camera-dashboard .camera-main-actions .camera-export-button { display:none !important; }
	.camera-dashboard .camera-main-actions .cbi-button { width:44px;min-height:44px;padding:.3rem !important; }
	.camera-dashboard .camera-main-actions .cbi-button span:not(.camera-icon) { display:none; }
	.camera-dashboard .camera-panel { padding:.75rem; }
	.camera-dashboard .camera-panel-heading { display:block;margin-bottom:.55rem; }
	.camera-dashboard .camera-panel-heading small { display:block;margin-top:.35rem;text-align:left; }
	.camera-dashboard .camera-chart-legend { justify-content:flex-start;margin-top:.45rem;overflow:visible;flex-wrap:wrap; }
	.camera-dashboard .camera-chart-frame { height:215px; }
	.camera-dashboard .camera-chart-summary { display:none; }
	.camera-dashboard .camera-live-scroll,
	.camera-dashboard .camera-device-table-scroll { overflow:visible; }
	.camera-dashboard table.camera-live-table,
	.camera-dashboard table.camera-device-table { display:block;min-width:0;width:100%;background:transparent !important; }
	.camera-dashboard table.camera-live-table thead,
	.camera-dashboard table.camera-device-table thead { display:none !important; }
	.camera-dashboard table.camera-live-table tbody,
	.camera-dashboard table.camera-device-table tbody { display:grid;width:100%;gap:.65rem; }
	.camera-dashboard table.camera-live-table tr,
	.camera-dashboard table.camera-device-table tr { display:grid !important;min-width:0 !important;margin:0;padding:.75rem !important;border:1px solid #27312e !important;border-radius:8px;background:#131917 !important; }
	.camera-dashboard table.camera-live-table tr { grid-template-columns:repeat(2,minmax(0,1fr));gap:.55rem .75rem; }
	.camera-dashboard table.camera-device-table tr {
		grid-template-columns:44px minmax(0,1fr) auto;
		grid-template-areas:
			"pin name status"
			"pin ip ip"
			"actions actions actions";
		gap:.5rem .65rem;
		align-items:center;
	}
	.camera-dashboard table.camera-live-table td,
	.camera-dashboard table.camera-device-table td { display:block !important;width:auto !important;min-width:0;padding:0 !important;border:0 !important; }
	.camera-dashboard table.camera-live-table td::before,
	.camera-dashboard table.camera-device-table td::before { content:attr(data-label) !important;display:block !important;margin-bottom:.15rem;color:#637069;font-size:.58rem;font-weight:800;text-transform:uppercase;letter-spacing:.07em; }
	.camera-dashboard table.camera-live-table td:first-child { grid-column:1 / -1;padding-bottom:.55rem !important;border-bottom:1px solid #28312e !important; }
	.camera-dashboard table.camera-live-table td:first-child::before { display:none !important; }
	.camera-dashboard table.camera-live-table td:nth-child(n) { grid-column:auto;grid-row:auto;align-self:auto; }
	.camera-dashboard table.camera-live-table td:first-child { grid-column:1 / -1; }
	.camera-dashboard table.camera-live-table td:last-child { display:block !important; }
	.camera-dashboard .camera-live-light .camera-led-switch { min-height:44px; }
	.camera-dashboard table.camera-device-table td:nth-child(1) { grid-area:pin;align-self:start; }
	.camera-dashboard table.camera-device-table td:nth-child(1)::before { display:none !important;content:none !important; }
	.camera-dashboard table.camera-device-table td:nth-child(2) { grid-area:name; }
	.camera-dashboard table.camera-device-table td:nth-child(3),
	.camera-dashboard table.camera-device-table td:nth-child(5),
	.camera-dashboard table.camera-device-table td:nth-child(6) { display:none !important; }
	.camera-dashboard table.camera-device-table td:nth-child(4) { grid-area:ip; }
	.camera-dashboard table.camera-device-table td:nth-child(7) { grid-area:status;align-self:start;justify-self:end; }
	.camera-dashboard table.camera-device-table td:nth-child(8) { grid-area:actions;margin-top:.35rem;padding-top:.65rem !important;border-top:1px solid #28312e !important; }
	.camera-dashboard .camera-device-primary { min-width:0; }
	.camera-dashboard .camera-device-primary a { width:100%;max-width:none; }
	.camera-dashboard .camera-device-ip { white-space:normal;overflow-wrap:anywhere; }
	.camera-dashboard .camera-device-actions {
		display:grid;
		grid-template-columns:repeat(2,minmax(0,1fr));
		align-items:stretch;
		justify-content:stretch;
		gap:.45rem;
		width:100%;
		white-space:normal;
	}
	.camera-dashboard .camera-device-actions > * { min-width:0;width:100%; }
	.camera-dashboard .camera-device-actions > div { display:flex !important;align-items:stretch !important;gap:0 !important;white-space:normal !important; }
	.camera-dashboard .camera-device-actions .camera-action-label { display:inline; }
	.camera-dashboard .camera-device-actions .cbi-button,
	.camera-dashboard .camera-device-details summary {
		justify-content:center;
		width:100% !important;
		min-width:0 !important;
		padding:.3rem .45rem !important;
		gap:.3rem;
		overflow:hidden;
		border:1px solid #2d3934 !important;
		border-radius:7px;
		background:#171d1b;
	}
	.camera-dashboard .camera-device-details summary { list-style:none; }
	.camera-dashboard .camera-device-details summary::-webkit-details-marker { display:none; }
	.camera-dashboard .camera-device-details[open] { grid-column:1 / -1; }
	.camera-dashboard .camera-device-details[open] dl { position:static;width:100%;min-width:0;max-width:none;margin:.45rem 0 0; }
	.camera-dashboard .camera-device-actions .cbi-button,
	.camera-dashboard .camera-device-details summary { min-height:44px; }
	.camera-dashboard .camera-device-table .camera-pin { width:44px;min-width:44px !important;min-height:44px; }
	.camera-dashboard .camera-device-tools { grid-template-columns:1fr; }
	.camera-dashboard .camera-filter-group { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%; }
	.camera-dashboard .camera-filter-group .cbi-button { width:100%;white-space:normal;line-height:1.2; }
	.camera-dashboard .camera-filter-group .cbi-button:first-child { grid-column:1 / -1; }
	.camera-dashboard .camera-assignment-panel .camera-assignment-row { grid-template-columns:1fr; }
}

@media (max-width:390px) {
	.camera-dashboard table.camera-device-table tr {
		grid-template-columns:44px minmax(0,1fr);
		grid-template-areas:
			"pin name"
			"pin status"
			"ip ip"
			"actions actions";
	}
	.camera-dashboard table.camera-device-table td:nth-child(7) { justify-self:start; }
}

/* The operations surface is dark-first, so the explicit light theme needs to
 * cover the newer AP components as well as the legacy LuCI cards above. */
.camera-dashboard[data-camera-theme="light"] .camera-ops-shell { background:#f6f8f7;border-color:#ced8d3; }
.camera-dashboard[data-camera-theme="light"] .camera-ops-sidebar { background:#ffffff;border-color:#d7e0dc; }
.camera-dashboard[data-camera-theme="light"] .camera-side-brand { border-color:#d7e0dc; }
.camera-dashboard[data-camera-theme="light"] .camera-side-brand-icon { color:#117a5a;background:#e8f6f0;border-color:#a5d8c4; }
.camera-dashboard[data-camera-theme="light"] .camera-side-brand strong { color:#17211d; }
.camera-dashboard[data-camera-theme="light"] .camera-side-brand small { color:#5e6d66; }
.camera-dashboard[data-camera-theme="light"] .camera-side-ready { color:#17211d;background:#eaf7f1;border-color:#91cdb5; }
.camera-dashboard[data-camera-theme="light"] .camera-side-ready.camera-side-ready-no { background:#fff6df;border-color:#d7b668; }
.camera-dashboard[data-camera-theme="light"] .camera-side-ready-state { color:#117a5a; }
.camera-dashboard[data-camera-theme="light"] .camera-side-ready-no .camera-side-ready-state { color:#8a5b00; }
.camera-dashboard[data-camera-theme="light"] .camera-side-ready small { color:#405049; }
.camera-dashboard[data-camera-theme="light"] .camera-side-metric { background:#f5f8f6;border-color:#d7e0dc; }
.camera-dashboard[data-camera-theme="light"] .camera-side-metric-head { color:#52625a; }
.camera-dashboard[data-camera-theme="light"] .camera-side-metric-head .camera-icon { color:#117a5a; }
.camera-dashboard[data-camera-theme="light"] .camera-side-metric-value { color:#17211d; }
.camera-dashboard[data-camera-theme="light"] .camera-side-metric-meta { color:#5e6d66; }
.camera-dashboard[data-camera-theme="light"] .camera-side-nav button { color:#4f5f57; }
.camera-dashboard[data-camera-theme="light"] .camera-side-nav button:first-child,
.camera-dashboard[data-camera-theme="light"] .camera-side-nav button:hover { color:#0b684b;background:#e6f4ee; }
.camera-dashboard[data-camera-theme="light"] .camera-side-footer { color:#5e6d66; }
.camera-dashboard[data-camera-theme="light"] .camera-ops-main { background:#f2f4f3; }
.camera-dashboard[data-camera-theme="light"] .camera-main-heading small { color:#5e6d66; }
.camera-dashboard[data-camera-theme="light"] .camera-main-actions .cbi-button { color:#34413b !important;background:#ffffff !important;border-color:#c8d3ce !important; }
.camera-dashboard[data-camera-theme="light"] .camera-main-actions .camera-monitor-button { color:#073b2a !important;background:#8de3bd !important;border-color:#60c99c !important; }
.camera-dashboard[data-camera-theme="light"] .camera-panel { background:#ffffff;border-color:#ced8d3; }
.camera-dashboard[data-camera-theme="light"] .camera-panel-title { color:#17211d; }
.camera-dashboard[data-camera-theme="light"] .camera-panel-title .camera-icon { color:#117a5a; }
.camera-dashboard[data-camera-theme="light"] .camera-panel-heading small { color:#5e6d66; }
.camera-dashboard[data-camera-theme="light"] table.camera-live-table,
.camera-dashboard[data-camera-theme="light"] table.camera-device-table { color:#17211d; }
.camera-dashboard[data-camera-theme="light"] table.camera-live-table th,
.camera-dashboard[data-camera-theme="light"] table.camera-device-table th { color:#52625a !important;border-color:#d7e0dc !important; }
.camera-dashboard[data-camera-theme="light"] table.camera-live-table td,
.camera-dashboard[data-camera-theme="light"] table.camera-device-table td { color:#27342e !important;border-color:#e2e8e5 !important; }
.camera-dashboard[data-camera-theme="light"] .camera-link-name strong { color:#17211d; }
.camera-dashboard[data-camera-theme="light"] .camera-link-name small { color:#5e6d66; }
.camera-dashboard[data-camera-theme="light"] .camera-link-arrow { color:#64736c; }
.camera-dashboard[data-camera-theme="light"] .camera-metric { color:#17211d; }
.camera-dashboard[data-camera-theme="light"] .camera-metric-good { color:#087650; }
.camera-dashboard[data-camera-theme="light"] .camera-metric-warn { color:#8a5b00; }
.camera-dashboard[data-camera-theme="light"] .camera-metric-bad { color:#b42318; }
.camera-dashboard[data-camera-theme="light"] .camera-status-pill { color:#087650;background:#e4f5ed; }
.camera-dashboard[data-camera-theme="light"] .camera-status-pill-pending { color:#7a5100;background:#fff3d4; }
.camera-dashboard[data-camera-theme="light"] .camera-status-pill-offline { color:#a72121;background:#fdecec; }
.camera-dashboard[data-camera-theme="light"] .camera-chart-legend span { color:#52625a; }
.camera-dashboard[data-camera-theme="light"] .camera-chart-summary { color:#5e6d66; }
.camera-dashboard[data-camera-theme="light"] .camera-chart-summary strong { color:#34413b; }
.camera-dashboard[data-camera-theme="light"] .camera-device-tools input,
.camera-dashboard[data-camera-theme="light"] .camera-device-tools select,
.camera-dashboard[data-camera-theme="light"] .camera-assignment-row select,
.camera-dashboard[data-camera-theme="light"] .camera-address-main select { color:#17211d;background:#ffffff;border-color:#c8d3ce; }
.camera-dashboard[data-camera-theme="light"] .camera-address-card { background:#f5f8f6;border-color:#c8d3ce; }
.camera-dashboard[data-camera-theme="light"] .camera-address-slot { color:#087650;background:#e4f5ed; }
.camera-dashboard[data-camera-theme="light"] .camera-address-link { color:#087650;background:#ffffff;border-color:#91cdb5; }
.camera-dashboard[data-camera-theme="light"] .camera-address-link:hover { color:#064e3b;background:#e4f5ed; }
.camera-dashboard[data-camera-theme="light"] .camera-address-status-ready { color:#087650; }
.camera-dashboard[data-camera-theme="light"] .camera-address-status-pending { color:#7a5100; }
.camera-dashboard[data-camera-theme="light"] .camera-device-primary a { color:#17211d; }
.camera-dashboard[data-camera-theme="light"] .camera-device-primary .camera-icon,
.camera-dashboard[data-camera-theme="light"] .camera-device-role { color:#52625a; }
.camera-dashboard[data-camera-theme="light"] .camera-device-ip { color:#34413b; }
.camera-dashboard[data-camera-theme="light"] .camera-device-actions .cbi-button,
.camera-dashboard[data-camera-theme="light"] .camera-device-table .camera-pin { color:#405049 !important;background:#f5f8f6 !important;border-color:#c8d3ce !important; }
.camera-dashboard[data-camera-theme="light"] .camera-device-table .camera-pin-active { color:#8a5b00 !important;background:#fff3d4 !important;border-color:#d7b668 !important; }
.camera-dashboard[data-camera-theme="light"] .camera-device-details summary { color:#405049; }
.camera-dashboard[data-camera-theme="light"] .camera-device-actions .camera-device-details summary { background:#f5f8f6;border-color:#c8d3ce !important; }
.camera-dashboard[data-camera-theme="light"] .camera-empty-state { color:#52625a; }
.camera-dashboard[data-camera-theme="light"] .camera-alert-warning { color:#7a5100;background:#fff6df;border-color:#d7b668; }
.camera-dashboard[data-camera-theme="light"] .camera-alert-danger { color:#9f1c1c;background:#fff0f0;border-color:#e8a4a4; }
.camera-dashboard[data-camera-theme="light"] .camera-client-temperature { color:#087650;background:#e4f5ed; }
.camera-dashboard[data-camera-theme="light"] .camera-client-temperature.warm { color:#7a5100;background:#fff3d4; }
.camera-dashboard[data-camera-theme="light"] .camera-client-temperature.hot { color:#9f1c1c;background:#fdecec; }
.camera-dashboard[data-camera-theme="light"] table.camera-live-table td::before,
.camera-dashboard[data-camera-theme="light"] table.camera-device-table td::before { color:#52625a !important; }
.camera-dashboard[data-camera-theme="light"] table.camera-live-table tr,
.camera-dashboard[data-camera-theme="light"] table.camera-device-table tr { background:#ffffff !important;border-color:#d7e0dc !important; }
.camera-dashboard[data-camera-theme="light"] table.camera-live-table td:first-child,
.camera-dashboard[data-camera-theme="light"] table.camera-device-table td:last-child { border-color:#d7e0dc !important; }
`;

function applySavedSidebarState() {
	document.body.classList.add('camera-console-active');
	const mobile = window.matchMedia('(max-width: 768px)').matches;
	if (mobile) {
		const sidebar = document.querySelector('#mainmenu');
		const mainRight = document.querySelector('.main-right');
		const mask = document.querySelector('.darkMask');
		if (sidebar) sidebar.classList.remove('active');
		if (mainRight) mainRight.classList.remove('active');
		if (mask) mask.classList.remove('active');
		document.body.classList.remove('camera-sidebar-hidden');
	} else {
		document.body.classList.add('camera-sidebar-hidden');
	}
	window.localStorage.setItem('cameraSidebar', 'hidden');
}

function toggleSidebar() {
	const sidebar = document.querySelector('#mainmenu');
	const mainRight = document.querySelector('.main-right');
	const mask = document.querySelector('.darkMask');
	const mobile = window.matchMedia('(max-width: 768px)').matches;
	let hidden;
	if (mobile && sidebar) {
		const opening = !sidebar.classList.contains('active');
		sidebar.classList.toggle('active', opening);
		mainRight && mainRight.classList.toggle('active', opening);
		mask && mask.classList.toggle('active', opening);
		hidden = !opening;
	} else {
		hidden = !document.body.classList.contains('camera-sidebar-hidden');
		document.body.classList.toggle('camera-sidebar-hidden', hidden);
	}
	window.localStorage.setItem('cameraSidebar', hidden ? 'hidden' : 'shown');
}

function toggleMonitorMode(root) {
	const enabled = !root.classList.contains('camera-monitor-mode');
	root.classList.toggle('camera-monitor-mode', enabled);
	window.localStorage.setItem('cameraMonitorMode', enabled ? '1' : '0');
	if (enabled && document.documentElement.requestFullscreen)
		document.documentElement.requestFullscreen().catch(() => {});
	else if (!enabled && document.fullscreenElement && document.exitFullscreen)
		document.exitFullscreen().catch(() => {});
}

async function toggleAllLEDs(button) {
	const enabled = uci.get('camera_network', 'settings', 'leds_enabled') !== '0';
	const next = !enabled;
	button.disabled = true;
	ledOperations++;
	try {
		await fs.exec_direct('/usr/sbin/camera-network-leds', [next ? 'on' : 'off']);
		uci.set('camera_network', 'settings', 'leds_enabled', next ? '1' : '0');
		button.className = `cbi-button camera-led-switch ${next ? 'camera-led-switch-on' : 'camera-led-switch-off'}`;
		button.setAttribute('aria-pressed', next ? 'true' : 'false');
		button.setAttribute('aria-label', next ? _('Disable indicator lights') : _('Enable indicator lights'));
		button.title = next ? _('Disable indicator lights') : _('Enable indicator lights');
		button.replaceChildren(
			E('span', { class:'camera-led-switch-track' }, E('span', { class:'camera-led-switch-knob' })),
			E('span', { class:'camera-led-switch-label' }, next ? _('On') : _('Off'))
		);
		const sidebarValue = button.closest('.camera-side-metric') && button.closest('.camera-side-metric').querySelector('.camera-side-metric-value');
		if (sidebarValue)
			sidebarValue.textContent = next ? _('Enabled') : _('Disabled');
		showCameraToast(next ? _('Indicator lights enabled') : _('Indicator lights disabled'));
	} catch (error) {
		showCameraToast(_('Unable to change indicator lights'), true);
	} finally {
		ledOperations--;
		button.disabled = false;
	}
}

function preserveLEDBrightness(root, nextContent) {
	const existing = new Map(Array.from(root.querySelectorAll('[data-led-brightness-key]'), node => [node.getAttribute('data-led-brightness-key'), node]));
	for (const next of nextContent.querySelectorAll('[data-led-brightness-key]')) {
		const previous = existing.get(next.getAttribute('data-led-brightness-key'));
		if (previous && previous.querySelector('input').value === next.querySelector('input').value)
			next.replaceWith(previous);
	}
}

function renderLEDBrightness(identity, location = 'main') {
	const section = identity ? cameraSection(identity.mac) : 'settings';
	const option = identity ? 'remote_leds_brightness' : 'leds_brightness';
	const raw = uci.get('camera_network', section, option);
	let saved = /^\d{1,3}$/.test(String(raw)) && Number(raw) <= 100 ? String(Number(raw)) : '100';
	const output = E('output', {}, `${saved}%`);
	const input = E('input', {
		type:'range', min:'0', max:'100', step:'1', value:saved,
		'aria-label':identity ? _('Client indicator brightness') : _('Device indicator brightness'),
		disabled:identity && !identity.ip ? true : null,
		input:() => { output.textContent = `${input.value}%`; },
		change:async () => {
			const next = String(input.value);
			if (next === saved) return;
			input.disabled = true;
			ledOperations++;
			try {
				if (identity)
					await fs.exec_direct('/usr/sbin/camera-network-client-leds', [identity.ip, identity.mac, 'brightness', next]);
				else
					await fs.exec_direct('/usr/sbin/camera-network-leds', ['brightness', next]);
				if (!uci.get('camera_network', section)) uci.add('camera_network', identity ? 'camera' : 'led_control', section);
				uci.set('camera_network', section, option, next);
				saved = next;
			} catch (error) {
				input.value = saved;
				showCameraToast(_('Unable to change brightness — check the connection and Client software version'), true);
			} finally {
				output.textContent = `${saved}%`;
				input.disabled = !!(identity && !identity.ip);
				ledOperations--;
			}
		}
	});
	return E('div', { class:'camera-led-brightness',
		'data-led-brightness-key':`${section}:${location}:${identity ? identity.ip || '' : ''}`,
		title:_('Wi-Fi light: HaLow signal. Purple light: LAN cable link and traffic. Settings survive reboot.') }, [
		E('label', {}, [E('span', {}, _('Brightness')), output]), input
	]);
}

function renderLEDControl() {
	const enabled = uci.get('camera_network', 'settings', 'leds_enabled') !== '0';
	const button = E('button', {
		class:`cbi-button camera-led-switch ${enabled ? 'camera-led-switch-on' : 'camera-led-switch-off'}`,
		'aria-pressed':enabled ? 'true' : 'false',
		click:ev => toggleAllLEDs(ev.currentTarget)
	}, [
		E('span', { class:'camera-led-switch-track' }, E('span', { class:'camera-led-switch-knob' })),
		E('span', { class:'camera-led-switch-label' }, enabled ? _('On') : _('Off'))
	]);
	return E('div', { class:'cbi-section camera-led-control camera-config-only' }, [
		E('div', {}, [E('strong', {}, _('Indicator lights')), E('small', {}, enabled ? _('Automatic network indication enabled') : _('All device lights are disabled'))]),
		button,
		renderLEDBrightness()
	]);
}

function renderSidebarLEDControl() {
	const enabled = uci.get('camera_network', 'settings', 'leds_enabled') !== '0';
	const button = E('button', {
		class:`cbi-button camera-led-switch ${enabled ? 'camera-led-switch-on' : 'camera-led-switch-off'}`,
		'aria-label':enabled ? _('Disable indicator lights') : _('Enable indicator lights'),
		'aria-pressed':enabled ? 'true' : 'false',
		title:enabled ? _('Disable indicator lights') : _('Enable indicator lights'),
		click:ev => toggleAllLEDs(ev.currentTarget)
	}, [
		E('span', { class:'camera-led-switch-track' }, E('span', { class:'camera-led-switch-knob' })),
		E('span', { class:'camera-led-switch-label' }, enabled ? _('On') : _('Off'))
	]);
	return E('div', { class:'camera-side-metric camera-config-only' }, [
		E('div', { class:'camera-side-metric-head' }, [E('span', {}, _('Indicator lights')), cameraIcon('light')]),
		E('div', { style:'display:flex;align-items:center;justify-content:space-between;gap:.5rem;margin-top:.25rem' }, [
			E('span', { class:'camera-side-metric-value', style:'margin:0' }, enabled ? _('Enabled') : _('Disabled')),
			button
		]),
		renderLEDBrightness()
	]);
}

function cameraSection(mac) {
	return `cam_${String(mac || '').replace(/[^A-Fa-f0-9]/g, '').toLowerCase()}`;
}

function normalizeMac(mac) {
	const compact = String(mac || '').replace(/[^A-Fa-f0-9]/g, '').toUpperCase();
	return compact.length === 12 ? compact.match(/.{2}/g).join(':') : String(mac || '').toUpperCase();
}

function cameraAddressSlot(slotID) {
	return CAMERA_ADDRESS_SLOTS.find(slot => slot.id === String(slotID || '').toUpperCase()) || null;
}

function cameraAddressAssignments() {
	return CAMERA_ADDRESS_SLOTS.map(slot => ({
		...slot,
		cameraMac:normalizeMac(uci.get('camera_network', slot.section, 'camera_mac'))
	}));
}

function cameraAddressSlotForMac(mac) {
	const normalized = normalizeMac(mac);
	return normalized ? cameraAddressAssignments().find(slot => slot.cameraMac === normalized) || null : null;
}

function safeCameraAddressMessage(value) {
	return String(value || '')
		.replace(/[\u0000-\u001f\u007f]+/g, ' ')
		.replace(/\b(password|passphrase|secret|key)\s*[:=]\s*\S+/gi, '$1=[redacted]')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, 180);
}

async function runCameraAddressHelper(slot, cameraMac) {
	const args = cameraMac ? ['apply', slot.id, cameraMac] : ['clear', slot.id];
	const result = await fs.exec('/usr/sbin/camera-network-static-ip', args);
	if (result && result.code !== undefined && Number(result.code) !== 0) {
		const detail = safeCameraAddressMessage(result.stderr || result.stdout);
		throw new Error(detail || _('The device rejected the address update.'));
	}
	return result || {};
}

async function setCameraAddressSlot(slotID, cameraMac, currentIP, options) {
	const slot = cameraAddressSlot(slotID);
	const normalized = normalizeMac(cameraMac);
	const settings = options || {};
	if (!slot || (normalized && !/^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(normalized)))
		throw new Error(_('Invalid camera address assignment.'));

	try {
		await runCameraAddressHelper(slot, normalized);
		if (typeof uci.unload === 'function')
			uci.unload('camera_network');
		await uci.load('camera_network');

		if (!settings.silent) {
			if (!normalized)
				showCameraToast(_('%s Cam address cleared').format(slot.id));
			else if (String(currentIP || '') !== slot.ip)
				showCameraToast(_('%s Cam assigned to %s — reconnect the camera or renew DHCP').format(slot.id, slot.ip));
			else
				showCameraToast(_('%s Cam is ready at %s').format(slot.id, slot.ip));
		}
		if (!settings.deferRefresh && requestDashboardRefresh)
			await requestDashboardRefresh();
		return true;
	} catch (error) {
		const detail = safeCameraAddressMessage(error && error.message);
		if (!settings.silent)
			showCameraToast(detail ? _('Address update failed: %s').format(detail) : _('Unable to update the camera address'), true);
		throw error;
	}
}

function cameraProfile(mac) {
	const section = cameraSection(mac);
	return {
		name: uci.get('camera_network', section, 'name'),
		note: uci.get('camera_network', section, 'note'),
		lastIP: uci.get('camera_network', section, 'last_ip'),
		boundCameraMac: uci.get('camera_network', section, 'bound_camera_mac'),
		remoteLEDS: uci.get('camera_network', section, 'remote_leds_enabled') !== '0',
		remotePaired: uci.get('camera_network', section, 'remote_paired') === '1',
		hidden: uci.get('camera_network', section, 'hidden') === '1',
		pinned: uci.get('camera_network', section, 'pinned') === '1'
	};
}

function normalizedObjectMap(object) {
	const result = new Map();
	for (const [mac, value] of Object.entries(object || {})) {
		const normalized = normalizeMac(mac);
		if (normalized)
			result.set(normalized, value || {});
	}
	return result;
}

function telemetryWiredMacs(telemetry) {
	const raw = telemetry && telemetry.wiredMacs;
	const values = Array.isArray(raw) ? raw : typeof raw === 'string' ? raw.split(/[\s,]+/) : [];
	return Array.from(new Set(values.map(normalizeMac).filter(mac => /^([0-9A-F]{2}:){5}[0-9A-F]{2}$/.test(mac))));
}

function cameraRecord(mac, devices) {
	const normalized = normalizeMac(mac);
	const live = (devices || []).find(device => normalizeMac(device.mac) === normalized);
	const addressSlot = cameraAddressSlotForMac(normalized);
	if (live)
		return { ...live, mac:normalized, addressSlot, fixedIP:addressSlot ? addressSlot.ip : '' };
	const profile = cameraProfile(normalized);
	return { mac:normalized, ip:profile.lastIP || '', fallbackName:profile.name || '', online:false, current:false, addressSlot, fixedIP:addressSlot ? addressSlot.ip : '' };
}

function buildClientIdentities(displayPeers, livePeers, devices, boot) {
	const telemetryByMac = normalizedObjectMap(boot && boot.clientTelemetry);
	const legacyTemperatures = normalizedObjectMap(boot && boot.clientTemperatures);
	const legacyRecoveries = normalizedObjectMap(boot && boot.clientRecoveries);
	const peerByMac = new Map();
	const liveMacs = new Set();
	const clientMacs = new Set(telemetryByMac.keys());
	const deviceByMac = new Map((devices || []).map(device => [normalizeMac(device.mac), device]));

	for (const peer of displayPeers || []) {
		const mac = normalizeMac(peer.mac || peer.bssid);
		if (!mac) continue;
		clientMacs.add(mac);
		peerByMac.set(mac, peer);
	}
	for (const peer of livePeers || []) {
		const mac = normalizeMac(peer.mac || peer.bssid);
		if (mac) liveMacs.add(mac);
	}
	for (const section of uci.sections('camera_network', 'camera') || []) {
		const mac = normalizeMac(section.mac);
		if (mac && (section.remote_paired === '1' || section.bound_camera_mac))
			clientMacs.add(mac);
	}

	const pinnedByMac = new Map();
	for (const section of uci.sections('camera_network', 'camera') || []) {
		const mac = normalizeMac(section.mac);
		if (mac && section.pinned === '1' && !clientMacs.has(mac))
			pinnedByMac.set(mac, cameraRecord(mac, devices));
	}

	const cameraByClient = new Map();
	const claimedCameras = new Map();
	for (const clientMac of Array.from(clientMacs).sort()) {
		const bound = normalizeMac(cameraProfile(clientMac).boundCameraMac);
		if (!bound || !pinnedByMac.has(bound) || claimedCameras.has(bound))
			continue;
		cameraByClient.set(clientMac, pinnedByMac.get(bound));
		claimedCameras.set(bound, clientMac);
	}

	const automaticClaims = new Map();
	for (const clientMac of clientMacs) {
		if (cameraByClient.has(clientMac)) continue;
		const telemetry = telemetryByMac.get(clientMac) || {};
		const candidates = telemetryWiredMacs(telemetry).filter(mac => pinnedByMac.has(mac) && !claimedCameras.has(mac));
		if (candidates.length !== 1) continue;
		const cameraMac = candidates[0];
		if (!automaticClaims.has(cameraMac)) automaticClaims.set(cameraMac, []);
		automaticClaims.get(cameraMac).push(clientMac);
	}
	for (const [cameraMac, clients] of automaticClaims.entries()) {
		if (clients.length !== 1) continue;
		cameraByClient.set(clients[0], pinnedByMac.get(cameraMac));
		claimedCameras.set(cameraMac, clients[0]);
	}

	const identities = new Map();
	for (const clientMac of clientMacs) {
		const profile = cameraProfile(clientMac);
		const telemetry = telemetryByMac.get(clientMac) || {};
		const peer = peerByMac.get(clientMac) || null;
		const currentDevice = deviceByMac.get(clientMac);
		const camera = cameraByClient.get(clientMac) || null;
		const cameraInfo = camera ? cameraProfile(camera.mac) : null;
		const legacyTemperature = legacyTemperatures.get(clientMac) || {};
		const legacyRecovery = legacyRecoveries.get(clientMac);
		const recoveryValue = telemetry.recovery !== undefined ? telemetry.recovery
			: legacyRecovery && typeof legacyRecovery === 'object' ? legacyRecovery.recovery
			: legacyRecovery;
		const name = cameraInfo && String(cameraInfo.name || '').trim()
			? String(cameraInfo.name).trim()
			: camera && String(camera.fallbackName || '').trim() ? String(camera.fallbackName).trim()
			: String(profile.name || '').trim() || String(currentDevice && currentDevice.fallbackName || '').trim()
				|| (_('Client %s').format(clientMac.slice(-8)));
		identities.set(clientMac, {
			mac:clientMac,
			profile,
			peer,
			telemetry,
			camera,
			name,
			ip:String((currentDevice && currentDevice.current && currentDevice.ip) || telemetry.ip || profile.lastIP || ''),
			online:liveMacs.has(clientMac) || telemetry.online === true,
			temperature:telemetry.temperature !== undefined ? telemetry.temperature : legacyTemperature.temperature,
			thermalMitigation:telemetry.thermalMitigation !== undefined ? telemetry.thermalMitigation : legacyTemperature.thermalMitigation,
			recovery:recoveryValue,
			wiredMacs:telemetryWiredMacs(telemetry),
			manual:Boolean(profile.boundCameraMac && camera && normalizeMac(profile.boundCameraMac) === camera.mac)
		});
	}
	return identities;
}

function clientDisplayName(mac, fallbackToMac, identities) {
	const normalized = normalizeMac(mac);
	const identity = identities && identities.get(normalized);
	if (identity)
		return identity.name;
	const client = cameraProfile(normalized);
	if (client.name && String(client.name).trim())
		return String(client.name).trim();
	return fallbackToMac ? normalized.slice(-8) : _('HaLow Client');
}

function showCameraToast(message, error) {
	const old = document.querySelector('.camera-toast');
	if (old) old.remove();
	const toast = E('div', { class:`camera-toast${error ? ' camera-toast-error' : ''}`, role:'status' }, [
		E('span', { class:'camera-toast-message' }, message),
		E('button', { class:'camera-toast-close', title:_('Dismiss'), 'aria-label':_('Dismiss'), click:() => toast.remove() }, '×')
	]);
	document.body.appendChild(toast);
	window.setTimeout(() => toast.remove(), error ? 4500 : 2600);
}

function renderRemoteClientLEDSwitch(identity, compact) {
	const mac = identity.mac;
	const section = cameraSection(mac);
	const profile = identity.profile;
	const enabled = profile.remoteLEDS;
	const ip = identity.ip;
	if (!profile.remotePaired) {
		const pair = E('button', { class:'cbi-button', click:async ev => {
			const control=ev.currentTarget; let password=null; control.disabled=true;
			try {
				password = window.prompt(_('Enter the Client administrator password. It is used once for pairing and is not stored.'));
				if (!password) return;
					await fs.exec('/usr/sbin/camera-network-pair-client', [ip], { CAMERA_CLIENT_PASSWORD:password });
					if (!uci.get('camera_network', section)) uci.add('camera_network', 'camera', section);
					uci.set('camera_network', section, 'mac', mac);
					uci.set('camera_network', section, 'last_ip', ip);
					uci.set('camera_network', section, 'remote_paired', '1'); await uci.save(); await uci.apply(10);
				showCameraToast(_('Client paired — refreshing'));
			} catch (error) { showCameraToast(_('Pairing failed — authorize this AP on the Client'), true); }
			finally { password=null; control.disabled=!ip; }
		} }, _('Pair'));
		if (!ip) pair.disabled=true;
		if (compact) {
			pair.classList.add('camera-live-light-button');
			pair.title = _('Pair this Client for remote light control');
			pair.setAttribute('aria-label', _('Pair this Client for remote light control'));
			return E('div', { class:'camera-live-light' }, pair);
		}
		return E('div', { style:'display:flex;align-items:center;justify-content:space-between;gap:.75rem;border-top:1px solid var(--camera-border);margin-top:.75rem;padding-top:.65rem' }, [
			E('div', {}, [E('strong', { style:'display:block;font-size:.82rem' }, _('Client lights')), E('small', {}, _('Pair required'))]), pair
		]);
	}
	const button = E('button', {
		class:`cbi-button camera-led-switch ${enabled ? 'camera-led-switch-on' : 'camera-led-switch-off'}`,
		'aria-label':enabled ? _('Disable Client lights') : _('Enable Client lights'),
		title:enabled ? _('Disable Client lights') : _('Enable Client lights'),
		'aria-pressed':enabled ? 'true' : 'false',
		click:async ev => {
			const control = ev.currentTarget;
			const next = !cameraProfile(mac).remoteLEDS;
			control.disabled = true;
			ledOperations++;
			try {
					await fs.exec_direct('/usr/sbin/camera-network-client-leds', [ip, mac, next ? 'on' : 'off']);
					uci.set('camera_network', section, 'remote_leds_enabled', next ? '1' : '0');
					uci.set('camera_network', section, 'last_ip', ip);
				control.className = `cbi-button camera-led-switch ${next ? 'camera-led-switch-on' : 'camera-led-switch-off'}`;
				control.setAttribute('aria-pressed', next ? 'true' : 'false');
				control.setAttribute('aria-label', next ? _('Disable Client lights') : _('Enable Client lights'));
				control.title = next ? _('Disable Client lights') : _('Enable Client lights');
				control.querySelector('.camera-led-switch-label').textContent = next ? _('On') : _('Off');
				showCameraToast(next ? _('Client lights enabled') : _('Client lights disabled'));
			} catch (error) {
				showCameraToast(_('Client control failed — check pairing and connection'), true);
			} finally {
				ledOperations--;
				control.disabled = !ip;
			}
		}
	}, [
		E('span', { class:'camera-led-switch-track' }, E('span', { class:'camera-led-switch-knob' })),
		E('span', { class:'camera-led-switch-label' }, enabled ? _('On') : _('Off'))
	]);
	if (!ip)
		button.disabled = true;
	if (compact)
		return E('div', { class:'camera-live-light' }, [button, renderLEDBrightness(identity, 'live')]);
	return E('div', { style:'display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:center;gap:.4rem;border-top:1px solid var(--camera-border);margin-top:.75rem;padding-top:.65rem' }, [
		E('div', {}, [E('strong', { style:'display:block;font-size:.82rem' }, _('Client lights')), E('small', {}, ip || _('Management IP unavailable'))]),
		button,
		renderLEDBrightness(identity, 'details')
	]);
}

async function bindCameraToClient(clientMac, cameraMac) {
	clientMac = normalizeMac(clientMac);
	cameraMac = normalizeMac(cameraMac);
	const section = cameraSection(clientMac);
	if (cameraMac) {
		for (const other of uci.sections('camera_network', 'camera') || []) {
			const otherMac = normalizeMac(other.mac);
			if (!otherMac || otherMac === clientMac || normalizeMac(other.bound_camera_mac) !== cameraMac)
				continue;
			uci.set('camera_network', cameraSection(otherMac), 'bound_camera_mac', '');
		}
	}
	if (!uci.get('camera_network', section)) uci.add('camera_network', 'camera', section);
	uci.set('camera_network', section, 'mac', clientMac);
	uci.set('camera_network', section, 'bound_camera_mac', cameraMac || '');
	await uci.save();
	await uci.apply(10);
	showCameraToast(cameraMac ? _('Camera assigned to Client') : _('Camera assignment cleared'));
	if (requestDashboardRefresh)
		await requestDashboardRefresh();
}

function parseBridgeFDB(text) {
	const ports = new Map();
	for (const line of String(text || '').split('\n')) {
		const match = line.match(/^\s*(\d+)\s+([0-9a-f:]{17})\s+/i);
		if (match) ports.set(match[2].toUpperCase(), Number(match[1]));
	}
	return ports;
}

function discoveredDevices(leases, hints, selfIPs, bridgePorts) {
	const devices = [];
	const seen = new Set();
	for (const lease of leases.dhcp_leases || []) {
		const mac = (lease.macaddr || '').toUpperCase();
		const ip = lease.ipaddr || hints.getIPAddrByMACAddr(mac);
		if (!mac || selfIPs.has(ip)) continue;
		seen.add(mac);
		devices.push({ mac, ip, fallbackName: lease.hostname || hints.getHostnameByMACAddr(mac), source: _('DHCP lease'), online:Boolean(bridgePorts && bridgePorts.has(mac)), current:true });
	}
	for (const [macRaw, hint] of Object.entries(hints.hosts || {})) {
		const mac = macRaw.toUpperCase();
		const ip = (hint.ipaddrs || hint.ipv4 || [])[0];
		if (seen.has(mac) || !ip || selfIPs.has(ip)) continue;
		seen.add(mac);
		devices.push({ mac, ip, fallbackName: hint.name, source: _('Network neighbor'), online:Boolean(bridgePorts && bridgePorts.has(mac)), current:true });
	}
	for (const section of uci.sections('camera_network', 'camera') || []) {
		const mac = String(section.mac || '').toUpperCase();
		const ip = section.last_ip || '';
		if (!mac || !ip || seen.has(mac) || selfIPs.has(ip)) continue;
		devices.push({ mac, ip, fallbackName: section.name, source: _('Saved static device'), online:bridgePorts ? bridgePorts.has(mac) : false, current:false });
	}
	return devices;
}

async function toggleCameraPin(mac, ip) {
	mac = normalizeMac(mac);
	const section = cameraSection(mac);
	const profile = cameraProfile(mac);
	if (!uci.get('camera_network', section))
		uci.add('camera_network', 'camera', section);
	uci.set('camera_network', section, 'mac', mac);
	uci.set('camera_network', section, 'last_ip', ip);
	uci.set('camera_network', section, 'pinned', profile.pinned ? '0' : '1');
	if (profile.pinned) {
		for (const client of uci.sections('camera_network', 'camera') || []) {
			const clientMac = normalizeMac(client.mac);
			if (clientMac && normalizeMac(client.bound_camera_mac) === mac)
				uci.set('camera_network', cameraSection(clientMac), 'bound_camera_mac', '');
		}
	}
	await uci.save();
	await uci.apply(10);
	if (requestDashboardRefresh)
		await requestDashboardRefresh();
}

async function editCameraProfile(mac, ip, fallbackName) {
	const current = cameraProfile(mac);
	const name = window.prompt(_('Camera name'), current.name || fallbackName || '');
	if (name === null)
		return;
	const note = window.prompt(_('Note / position'), current.note || '');
	if (note === null)
		return;
	const section = cameraSection(mac);
	if (!uci.get('camera_network', section))
		uci.add('camera_network', 'camera', section);
	uci.set('camera_network', section, 'name', name.trim());
	uci.set('camera_network', section, 'note', note.trim());
	uci.set('camera_network', section, 'mac', mac);
	uci.set('camera_network', section, 'last_ip', ip);
	await uci.save();
	await uci.apply(10);
	showCameraToast(_('Camera profile saved'));
	if (requestDashboardRefresh)
		await requestDashboardRefresh();
}

async function hideCameraDevice(mac, ip) {
	const section = cameraSection(mac);
	if (!uci.get('camera_network', section)) uci.add('camera_network', 'camera', section);
	uci.set('camera_network', section, 'mac', mac);
	uci.set('camera_network', section, 'last_ip', ip || '');
	uci.set('camera_network', section, 'hidden', '1');
	await uci.save();
	await uci.apply(10);
	showCameraToast(_('Device hidden'));
	if (requestDashboardRefresh)
		await requestDashboardRefresh();
}

function valueOrDash(value) {
	return value === null || value === undefined || value === '' ? '—' : value;
}

function signalQuality(signal, noise) {
	if (signal === null || signal === undefined)
		return '—';
	if (noise === null || noise === undefined)
		return `${signal} dBm`;
	return `${signal} dBm / ${noise} dBm (SNR ${signal - noise} dB)`;
}

function signalMetrics(signal, noise) {
	const dbm = signal === null || signal === undefined || signal === '' ? NaN : Number(signal);
	const percent = Number.isFinite(dbm) ? Math.max(0, Math.min(100, Math.round((dbm + 100) * 2))) : 0;
	let label = _('No signal');
	let color = '#777';
	if (percent >= 75) {
		label = _('Excellent');
		color = '#179447';
	} else if (percent >= 50) {
		label = _('Good');
		color = '#65a30d';
	} else if (percent >= 25) {
		label = _('Weak');
		color = '#e89a16';
	} else if (percent > 0) {
		label = _('Very weak');
		color = '#d33b32';
	}
	return { dbm, noise: Number(noise), percent, label, color };
}

function renderSignalGauge(peer) {
	const m = signalMetrics(peer && peer.signal, peer && peer.noise);
	return E('div', { style: 'padding:.4rem 0' }, [
		E('div', { style: 'display:flex;justify-content:space-between;align-items:flex-end;gap:1rem' }, [
			E('div', {}, [
				E('div', { style: `font-size:2.5rem;line-height:1;font-weight:800;color:${m.color}` }, peer ? `${m.dbm} dBm` : '—'),
				E('div', { style: `font-size:1.05rem;font-weight:700;color:${m.color};margin-top:.35rem` }, m.label)
			]),
			E('div', { style: 'font-size:1.45rem;font-weight:800' }, `${m.percent}%`)
		]),
		E('div', { style: 'height:22px;background:#e5e7eb;border-radius:999px;overflow:hidden;margin:.8rem 0 .55rem' },
			E('div', { style: `height:100%;width:${m.percent}%;background:${m.color};border-radius:999px;transition:width .35s ease,background .35s ease` })
		),
		E('div', { style: 'display:flex;justify-content:space-between;gap:1rem;opacity:.82' }, [
			E('span', {}, peer && Number.isFinite(m.noise) ? `SNR ${m.dbm - m.noise} dB` : 'SNR —'),
			E('span', {}, peer && Number.isFinite(m.noise) ? `${_('Noise')} ${m.noise} dBm` : `${_('Noise')} —`)
		])
	]);
}

function renderHalowClients(peers, identities) {
	if (!peers.length)
		return E('div', { class: 'cbi-section camera-device-section' }, [
			E('h3', {}, _('HaLow clients')),
			E('p', {}, E('em', {}, _('Waiting for clients to connect…')))
		]);
	return E('div', { class: 'cbi-section camera-device-section' }, [
		E('div', { class: 'camera-section-heading', style: 'display:flex;justify-content:space-between;align-items:center;gap:1rem' }, [
			E('h3', {}, _('HaLow clients')),
			E('strong', {}, _('%d connected').format(peers.filter(peer => peer._online !== false).length))
		]),
			E('div', { class: 'camera-client-grid' }, peers.map(peer => {
				const mac = normalizeMac(peer.mac || peer.bssid || '—');
				const identity = identities.get(mac);
				const displayName = identity ? identity.name : clientDisplayName(mac, false, identities);
				const online = identity ? identity.online : peer._online !== false;
				const metrics = signalMetrics(online ? peer.signal : null, online ? peer.noise : null);
			const outages = apOutages.get(mac) || [];
			const latestRecovery = outages.length ? outages[outages.length - 1].duration : null;
				const temperature = Number(identity && identity.temperature);
			const hasTemperature = online && Number.isFinite(temperature);
			const temperatureClass = temperature >= 85 ? ' hot' : temperature >= 75 ? ' warm' : '';
			return E('div', { class: 'cbi-section camera-client-card', style:online ? '' : 'border-left-color:#d33b32 !important' }, [
				E('div', { class: 'camera-client-card-header' }, [
					E('div', {}, [
						E('strong', {}, displayName),
						E('div', { class: 'camera-client-mac' }, mac)
					]),
					E('div', { class:'camera-client-card-status' }, [
						E('span', { class:`camera-client-temperature${temperatureClass}`, title:_('Remote HaLow chip temperature') }, hasTemperature ? `${temperature}°C` : 'Temp —'),
						statusBadge(online)
					])
				]),
				E('div', { class: 'camera-client-signal-row' }, [
					E('div', { class: 'camera-client-signal-value', style: `color:${metrics.color}` }, Number.isFinite(metrics.dbm) ? `${metrics.dbm} dBm` : '—'),
					E('strong', { style: `color:${metrics.color}` }, `${metrics.percent}%`)
				]),
				E('div', { class: 'camera-signal-track', title: `${metrics.label} · ${metrics.percent}%` },
					E('div', { class: 'camera-signal-fill', style: `width:${metrics.percent}%;background:${metrics.color}` })
				),
				E('div', { style: 'display:flex;justify-content:space-between;gap:.75rem;margin:.45rem 0 .8rem' }, [
					E('span', { style: `color:${metrics.color};font-weight:750` }, metrics.label),
					E('span', {}, Number.isFinite(metrics.noise) ? `SNR ${metrics.dbm - metrics.noise} dB` : 'SNR —')
				]),
				E('div', { style: 'display:grid;grid-template-columns:repeat(3,1fr);gap:.5rem;border-top:1px solid var(--camera-border);padding-top:.7rem;font-size:.78rem' }, [
					E('div', {}, [E('small', {}, online ? _('Online') : _('Last session')), E('strong', { style:'display:block' }, formatDuration(peer.connected_time || 0))]),
					E('div', {}, [E('small', {}, _('Dropouts')), E('strong', { style:'display:block' }, String(outages.length))]),
					E('div', {}, [E('small', {}, _('Last recovery')), E('strong', { style:'display:block' }, latestRecovery === null ? '—' : formatDuration(latestRecovery / 1000))])
				]),
					renderRemoteClientLEDSwitch(identity || { mac, profile:cameraProfile(mac), ip:cameraProfile(mac).lastIP || '', online })
			]);
		}))
	]);
}

function renderRemoteTemperatureAlert(identities) {
	const warnings = [];
	let critical = false;
	for (const [mac, identity] of identities.entries()) {
		const temperature = Number(identity.temperature);
		const mitigation = Number(identity.thermalMitigation) || 0;
		if ((!Number.isFinite(temperature) || temperature < 75) && mitigation < 1)
			continue;
		const name = clientDisplayName(mac, true, identities);
		if (temperature >= 85) critical = true;
		warnings.push(`${name}: ${Number.isFinite(temperature) ? `${temperature}°C` : _('temperature unavailable')}${mitigation > 0 ? ` · ${_('thermal protection')} ${mitigation}` : ''}`);
	}
	if (!warnings.length) {
		dismissedAlerts.delete('remote-temperature-high');
		return E([]);
	}
	return dismissibleAlert('remote-temperature-high', critical ? 'camera-alert-danger' : 'camera-alert-warning', `▲ ${_('Client temperature alert')} · ${warnings.join(' · ')}`);
}

function dismissibleAlert(key, className, message) {
	if (dismissedAlerts.has(key)) return E([]);
	const alert = E('div', { class:`camera-alert ${className}` }, [
		E('span', { class:'camera-alert-message' }, message),
		E('button', { class:'camera-alert-close', title:_('Dismiss'), 'aria-label':_('Dismiss'), click:() => { dismissedAlerts.add(key); alert.remove(); } }, '×')
	]);
	return alert;
}

function renderTemperatureAlert(temperature, thermalMitigation) {
	const value = Number(temperature);
	const mitigation = Number(thermalMitigation) || 0;
	if ((!Number.isFinite(value) || value < 75) && mitigation < 1) {
		dismissedAlerts.delete('temperature-high');
		return E([]);
	}
	const critical = Number.isFinite(value) && value >= 85;
	const emergency = Number.isFinite(value) && value >= 95;
	const details = [];
	if (Number.isFinite(value))
		details.push(`${value}°C`);
	if (mitigation > 0)
		details.push(`${_('thermal mitigation events')}: ${mitigation}`);
	return dismissibleAlert(
		'temperature-high',
		critical || emergency ? 'camera-alert-danger' : 'camera-alert-warning',
		`${critical ? '●' : '▲'} ${emergency ? _('Emergency chip temperature') : critical ? _('Critical chip temperature') : _('High chip temperature')}: ${details.join(' · ')}`
	);
}

function renderTemperaturePanel(temperature, thermalMitigation) {
	const value = Number(temperature);
	const available = Number.isFinite(value);
	const mitigation = Number(thermalMitigation) || 0;
	const warm = available && value >= 75 && value < 85;
	const hot = available && value >= 85;
	const emergency = available && value >= 95;
	const status = !available ? _('Waiting for sensor…')
		: emergency ? _('Emergency — reduce load immediately')
		: hot ? _('Critical temperature')
		: warm ? _('Elevated temperature')
		: _('Temperature normal');
	return E('div', { class:'cbi-section camera-temperature-panel' }, [
		E('div', {}, [
			E('strong', {}, _('HaLow chip temperature')),
			E('small', { style:'display:block;margin-top:.2rem' }, status)
		]),
		E('div', {}, [
			E('div', { class:`camera-temperature-value${hot ? ' hot' : warm ? ' warm' : ''}` }, available ? `${value}°C` : '—'),
			E('div', { class:'camera-temperature-meta' }, mitigation > 0
				? `${_('Thermal protection')}: ${mitigation}`
				: _('Warning 75°C · Critical 85°C'))
		])
	]);
}

function renderAPSummary(state) {
	const healthy = state.halow.peers.length && state.halow.peers.every(peer => Number(peer.signal) >= -75);
	return E('div', { class:'cbi-section camera-ap-summary' }, [
		E('div', { class:'camera-ap-summary-main' }, [
			E('h3', { style:'margin:0' }, _('HaLow access point')),
			E('div', { class:'camera-ap-health', style:`color:${healthy ? '#16a078' : '#f59e0b'}` }, healthy ? _('Healthy') : _('Attention'))
		]),
		E('div', { class:'camera-ap-meta' }, `${state.halow.peers.length === 1 ? _('1 client') : _('%d clients').format(state.halow.peers.length)} · ${uci.get('wireless', 'default_radio1', 'ssid') || '—'} · ${_('Channel')} ${uci.get('wireless', 'radio1', 'channel') || '—'}`)
	]);
}

function renderAPAlerts(peers, identities) {
	const alerts = [];
	for (const peer of peers || []) {
		const mac = String(peer.mac || peer.bssid || '').toUpperCase();
		const name = clientDisplayName(mac, true, identities);
		const signal = Number(peer.signal), noise = Number(peer.noise);
		const snr = Number.isFinite(signal) && Number.isFinite(noise) ? signal - noise : null;
		const outages = apOutages.get(mac) || [];
		const latest = outages.length ? outages[outages.length - 1] : null;
		if (signal < -75) alerts.push(`${name}: ${_('weak signal')} ${signal} dBm`);
		else if (snr !== null && snr < 15) alerts.push(`${name}: ${_('low SNR')} ${snr} dB`);
		if (outages.length >= 3) alerts.push(`${name}: ${_('frequent dropouts')} (${outages.length})`);
		if (latest && latest.duration > 15000) alerts.push(`${name}: ${_('slow recovery')} ${Math.round(latest.duration / 1000)}s`);
	}
	for (const [mac, state] of apClientStates.entries()) {
		if (!state.connected) {
				alerts.push(`${clientDisplayName(mac, true, identities)}: ${_('disconnected')}`);
		}
	}
	if (!alerts.length) { dismissedAlerts.delete('ap-network'); return E([]); }
	return dismissibleAlert('ap-network', 'camera-alert-warning', `▲ ${alerts.join(' · ')}`);
}

function APReadinessState(peers, devices, identities) {
	const clientMacs = new Set(identities.keys());
	const saved = (uci.sections('camera_network', 'camera') || []).filter(section => section.pinned === '1' && !clientMacs.has(String(section.mac || '').toUpperCase()));
	const visible = new Set(devices.filter(device => device.online).map(device => normalizeMac(device.mac)));
	for (const identity of identities.values()) {
		if (!identity.online) continue;
		for (const mac of identity.wiredMacs)
			visible.add(mac);
	}
	const missing = saved.filter(section => section.mac && !visible.has(String(section.mac).toUpperCase()));
	const ready = peers.length > 0 && saved.length > 0 && missing.length === 0;
	const clientText = peers.length === 1 ? _('1 HaLow client') : _('%d HaLow clients').format(peers.length);
	const cameraText = saved.length === 1 ? _('1 camera') : _('%d cameras').format(saved.length);
	const detail = ready ? _('%s and %s online').format(clientText, cameraText)
		: !peers.length ? _('No HaLow client connected')
		: !saved.length ? _('Pin at least one camera below')
		: missing.length === 1 ? _('1 pinned camera offline') : _('%d pinned cameras offline').format(missing.length);
	return { ready, detail, clientCount:peers.length, cameraCount:saved.length, missingCount:missing.length };
}

function renderReadiness(peers, devices, identities) {
	const readiness = APReadinessState(peers, devices, identities);
	const ready = readiness.ready;
	return E('div', { class:`camera-ready-banner ${ready ? 'camera-ready-yes' : 'camera-ready-no'}` }, [
		E('div', {}, [E('div', { class:'camera-ready-word', style:`color:${ready ? '#34d399' : '#fbbf24'}` }, ready ? 'READY' : 'NOT READY'), E('small', {}, readiness.detail)]),
		E('strong', {}, ready ? _('Ready to shoot') : _('Check network'))
	]);
}

function renderAPSidebar(state, devices, identities) {
	const readiness = APReadinessState(state.halow.peers, devices, identities);
	const temperature = Number(state.boot.temperature);
	const temperatureAvailable = Number.isFinite(temperature);
	const temperatureClass = temperature >= 85 ? ' camera-metric-bad' : temperature >= 75 ? ' camera-metric-warn' : ' camera-metric-good';
	const healthy = state.halow.peers.length > 0 && state.halow.peers.every(peer => Number(peer.signal) >= -75);
	const ssid = uci.get('wireless', 'default_radio1', 'ssid') || '—';
	const channel = uci.get('wireless', 'radio1', 'channel') || '—';
	const apRecovery = state.boot.ap !== undefined && state.boot.ap !== null ? formatDuration(state.boot.ap) : _('Waiting…');
	return E('aside', { class:'camera-ops-sidebar' }, [
		E('div', { class:'camera-side-brand' }, [
			E('span', { class:'camera-side-brand-icon' }, cameraIcon('network')),
			E('div', {}, [E('strong', {}, _('CAMERA NETWORK')), E('small', {}, _('HaLow operations'))])
		]),
		E('div', { class:`camera-side-ready${readiness.ready ? '' : ' camera-side-ready-no'}` }, [
			E('div', { class:'camera-side-ready-state' }, [cameraIcon(readiness.ready ? 'check' : 'dashboard'), readiness.ready ? 'READY' : _('CHECK')]),
			E('small', { title:readiness.detail }, readiness.detail)
		]),
		E('div', { class:'camera-side-metrics' }, [
			E('div', { class:'camera-side-metric' }, [
				E('div', { class:'camera-side-metric-head' }, [E('span', {}, _('Access point')), cameraIcon('signal')]),
				E('div', { class:`camera-side-metric-value ${healthy ? 'camera-metric-good' : 'camera-metric-warn'}` }, healthy ? _('Healthy') : _('Attention')),
				E('small', { class:'camera-side-metric-meta', title:`${ssid} · ${_('Channel')} ${channel}` }, `${state.halow.peers.length} ${_('clients')} · ${ssid} · CH ${channel}`)
			]),
			E('div', { class:'camera-side-metric' }, [
				E('div', { class:'camera-side-metric-head' }, [E('span', {}, _('Temperature')), cameraIcon('temperature')]),
				E('div', { class:`camera-side-metric-value${temperatureAvailable ? temperatureClass : ''}` }, temperatureAvailable ? `${temperature}°C` : '—'),
				E('small', { class:'camera-side-metric-meta' }, `${_('AP ready')} · ${apRecovery}`)
			])
		]),
		renderSidebarLEDControl(),
		E('nav', { class:'camera-side-nav', 'aria-label':_('Dashboard sections') }, [
			E('button', { click:() => scrollToCameraSection('camera-live-links') }, [cameraIcon('dashboard'), E('span', {}, _('Live link status'))]),
			E('button', { click:() => scrollToCameraSection('camera-signal-history') }, [cameraIcon('chart'), E('span', {}, _('Signal history'))]),
			E('button', { class:'camera-config-only', click:() => scrollToCameraSection('camera-connections') }, [cameraIcon('camera'), E('span', {}, _('Camera connections'))]),
			E('button', { class:'camera-config-only', click:() => scrollToCameraSection('camera-devices') }, [cameraIcon('devices'), E('span', {}, _('Discovered devices'))])
		]),
		E('div', { class:'camera-side-footer' }, [
			E('div', {}, _('Telemetry updates every 2 seconds.')),
			E('div', {}, _('Recovery timing continues while this page is closed.'))
		])
	]);
}

function formatCompactDuration(seconds) {
	if (seconds === null || seconds === undefined || seconds === '' || !Number.isFinite(Number(seconds)))
		return '—';
	const value = Math.max(0, Math.round(Number(seconds)));
	return value < 60 ? `${value}s` : `${Math.floor(value / 60)}m ${value % 60}s`;
}

function renderLiveLinkStatus(identities) {
	const clients = Array.from(identities.values())
		.filter(identity => identity.peer || identity.profile.remotePaired || identity.telemetry.recovery !== undefined)
		.sort((a, b) => a.name.localeCompare(b.name));
	const rows = clients.map(identity => {
		const peer = identity.peer || {};
		const signal = identity.online && Number.isFinite(Number(peer.signal)) ? Number(peer.signal) : null;
		const noise = identity.online && Number.isFinite(Number(peer.noise)) ? Number(peer.noise) : null;
		const snr = signal !== null && noise !== null ? signal - noise : null;
		const temperature = identity.online && Number.isFinite(Number(identity.temperature)) ? Number(identity.temperature) : null;
		const outages = apOutages.get(identity.mac) || [];
		const latestRecovery = outages.length ? outages[outages.length - 1].duration / 1000 : null;
		const camera = identity.camera;
		const cameraName = camera
			? cameraProfile(camera.mac).name || camera.fallbackName || identity.name
			: _('No camera assigned');
		const cameraIP = camera && (camera.fixedIP || camera.ip);
		const signalClass = signal === null ? '' : signal >= -65 ? ' camera-metric-good' : signal >= -75 ? ' camera-metric-warn' : ' camera-metric-bad';
		const tempClass = temperature === null ? '' : temperature >= 85 ? ' camera-metric-bad' : temperature >= 75 ? ' camera-metric-warn' : ' camera-metric-good';
		return E('tr', {}, [
			E('td', { 'data-label':_('Client → camera') }, E('div', { class:'camera-link-name' }, [
				cameraIcon('camera'),
				E('div', { class:'camera-link-name-text' }, [
					E('strong', { title:cameraName }, cameraName),
					cameraIP
						? E('small', { title:`${identity.mac} → ${cameraIP}` }, [
							`${identity.mac.slice(-8)} → `,
							E('a', { href:`http://${cameraIP}/`, target:'_blank', rel:'noopener', title:_('Open camera Web UI') }, cameraIP)
						])
						: E('small', { title:identity.mac }, identity.mac.slice(-8))
				])
			])),
			E('td', { 'data-label':_('Status') }, E('span', { class:`camera-status-pill${identity.online ? '' : ' camera-status-pill-offline'}` }, identity.online ? _('Online') : _('Offline'))),
			E('td', { 'data-label':_('Signal') }, E('span', { class:`camera-metric${signalClass}` }, signal === null ? '—' : `${signal} dBm`)),
			E('td', { 'data-label':_('SNR') }, E('span', { class:'camera-metric' }, snr === null ? '—' : `${snr} dB`)),
			E('td', { 'data-label':_('Temp') }, E('span', { class:`camera-metric${tempClass}` }, temperature === null ? '—' : `${temperature}°C`)),
			E('td', { 'data-label':_('Boot recovery') }, E('span', { class:'camera-metric' }, formatCompactDuration(identity.recovery))),
			E('td', { 'data-label':_('Last recovery') }, E('span', { class:'camera-metric' }, formatCompactDuration(latestRecovery))),
			E('td', { 'data-label':_('Dropouts') }, E('span', { class:`camera-metric${outages.length ? ' camera-metric-warn' : ' camera-metric-good'}` }, String(outages.length))),
			E('td', { 'data-label':_('Lights') }, renderRemoteClientLEDSwitch(identity, true))
		]);
	});
	return E('section', { id:'camera-live-links', class:'camera-panel camera-live-panel' }, [
		E('div', { class:'camera-panel-heading' }, [
			E('div', { class:'camera-panel-title' }, [cameraIcon('dashboard'), E('h3', {}, _('Live link status'))]),
			E('small', {}, _('Camera names follow automatic wired-port matching.'))
		]),
		rows.length ? E('div', { class:'camera-live-scroll' }, E('table', { class:'camera-live-table' }, [
			E('thead', {}, E('tr', {}, [
				E('th', { scope:'col' }, _('Client → camera')),
				E('th', { scope:'col' }, _('Status')),
				E('th', { scope:'col' }, _('Signal')),
				E('th', { scope:'col' }, _('SNR')),
				E('th', { scope:'col' }, _('Temp')),
				E('th', { scope:'col' }, _('Boot recovery')),
				E('th', { scope:'col' }, _('Last recovery')),
				E('th', { scope:'col' }, _('Dropouts')),
				E('th', { scope:'col' }, _('Lights'))
			])),
			E('tbody', {}, rows)
		])) : E('div', { class:'camera-empty-state' }, _('Waiting for a Client to connect…'))
	]);
}

function renderBootRecovery(boot, identities) {
	const value = seconds => seconds !== null && seconds !== undefined && seconds !== '' && Number.isFinite(Number(seconds))
		? formatDuration(Number(seconds))
		: _('Waiting…');
	const clients = Array.from(identities.values())
		.filter(identity => identity.profile.remotePaired || identity.peer || identity.telemetry.recovery !== undefined)
		.sort((a, b) => a.name.localeCompare(b.name))
		.map(identity => {
			return E('div', { class:'camera-boot-step' }, [
				E('small', {}, identity.name),
				E('strong', { style:'display:block;font-size:1.25rem' }, value(identity.recovery)),
				E('small', { style:'display:block;opacity:.6;margin-top:.25rem' }, identity.online ? _('Power-on → AP connected') : _('Last power-on → AP connected'))
			]);
		});
	return E('div', { class:'cbi-section camera-device-section' }, [
		E('h3', { class:'camera-boot-recovery-title' }, _('Power-on recovery — this boot')),
		E('div', { class:'camera-boot-grid' }, [
			E('div', { class:'camera-boot-step' }, [E('small', {}, _('AP monitor ready')), E('strong', { style:'display:block;font-size:1.25rem' }, value(boot.ap))]),
			...clients
		]),
		E('small', { class:'camera-boot-recovery-note', style:'opacity:.65;margin-top:.55rem' }, _('Each Client time is measured from its own last power-on until it connected to the AP. Recorded continuously even when this page is closed.'))
	]);
}

function renderCameraAssignments(identities, devices) {
	const clientMacs = new Set(identities.keys());
	const pinnedByMac = new Map();
	for (const section of uci.sections('camera_network', 'camera') || []) {
		const mac = normalizeMac(section.mac);
		if (mac && section.pinned === '1' && !clientMacs.has(mac))
			pinnedByMac.set(mac, cameraRecord(mac, devices));
	}
	const pinned = Array.from(pinnedByMac.values());
	const ownerByCamera = new Map();
	for (const identity of identities.values())
		if (identity.camera) ownerByCamera.set(identity.camera.mac, identity.mac);
	const clients = Array.from(identities.values())
		.filter(identity => identity.peer || identity.profile.remotePaired)
		.sort((a, b) => a.name.localeCompare(b.name));
	return E('section', { id:'camera-connections', class:'cbi-section camera-panel camera-assignment-panel camera-config-only' }, [
		E('div', { class:'camera-section-heading' }, [
			E('h3', {}, _('Client → camera connections')),
		E('small', { style:'display:block;opacity:.7;margin-top:.35rem' }, _('Pinned cameras detected on each Client wired port are matched automatically.'))
		]),
		...(clients.length ? clients : [null]).map(identity => {
			if (!identity)
				return E('p', {}, E('em', {}, _('No Client available.')));
			const clientMac = identity.mac;
			const chosen = identity.camera;
			const chosenMac = chosen ? chosen.mac : '';
			const available = pinned.filter(device => !ownerByCamera.has(device.mac) || ownerByCamera.get(device.mac) === clientMac);
			const select = E('select', { class:'cbi-input-select', value:chosenMac, change:ev => bindCameraToClient(clientMac, ev.currentTarget.value) }, [
				E('option', { value:'' }, available.length ? _('Choose camera') : _('No camera available')),
				...available.map(device => {
					const profile = cameraProfile(device.mac);
					const attrs = { value:device.mac };
					if (chosenMac === device.mac) attrs.selected = true;
					return E('option', attrs, `${profile.name || device.fallbackName || device.mac} · ${device.ip || '—'}`);
				})
			]);
			// Set the live DOM property after LuCI has created all options. The E()
			// helper does not reliably apply select.value/option.selected here.
			if (chosenMac)
				select.value = chosenMac;
			return E('div', { class:'camera-assignment-row' }, [
				E('div', {}, [E('strong', {}, identity.name), E('small', { class:'camera-client-mac', style:'display:block' }, clientMac)]),
				E('div', {}, [
					chosen ? E('div', { style:'font-weight:750;margin-bottom:.35rem' }, `→ ${cameraProfile(chosen.mac).name || chosen.fallbackName || _('Camera')} · ${chosen.ip || '—'}`) : '',
					select,
					E('small', { style:'display:block;opacity:.65;margin-top:.3rem' }, identity.manual ? _('Manual selection') : chosen ? _('Automatically detected from the Client wired port') : _('Pin the camera below, then select it here.'))
				])
			]);
		})
	]);
}

function renderCameraAddressSlots(devices) {
	const pinnedByMac = new Map();
	for (const section of uci.sections('camera_network', 'camera') || []) {
		const mac = normalizeMac(section.mac);
		if (mac && section.pinned === '1')
			pinnedByMac.set(mac, cameraRecord(mac, devices));
	}
	const pinned = Array.from(pinnedByMac.values()).sort((a, b) => {
		const aProfile = cameraProfile(a.mac);
		const bProfile = cameraProfile(b.mac);
		return String(aProfile.name || a.fallbackName || a.mac).localeCompare(String(bProfile.name || b.fallbackName || b.mac));
	});
	const liveByMac = new Map((devices || []).filter(device => device.current)
		.map(device => [normalizeMac(device.mac), device]));

	const cards = cameraAddressAssignments().map(slot => {
		const assignedMac = slot.cameraMac;
		const assigned = assignedMac ? (pinnedByMac.get(assignedMac) || cameraRecord(assignedMac, devices)) : null;
		const profile = assigned ? cameraProfile(assignedMac) : null;
		const name = assigned ? String(profile.name || assigned.fallbackName || assignedMac) : _('Unassigned');
		const live = assignedMac ? liveByMac.get(assignedMac) : null;
		const currentIP = live && live.ip ? String(live.ip) : '';
		const lastIP = assigned && assigned.ip ? String(assigned.ip) : '';
		const ready = Boolean(live && live.online && currentIP === slot.ip);
		let statusClass = 'camera-address-status';
		let status = _('Select a pinned camera for this project slot.');
		if (assignedMac && ready) {
			statusClass += ' camera-address-status-ready';
			status = _('Ready at the fixed address.');
		} else if (assignedMac && currentIP && currentIP !== slot.ip) {
			statusClass += ' camera-address-status-pending';
			status = _('Pending camera reconnect / DHCP renewal · current %s').format(currentIP);
		} else if (assignedMac && currentIP === slot.ip) {
			statusClass += ' camera-address-status-pending';
			status = _('Address reserved · waiting for the camera to appear online.');
		} else if (assignedMac) {
			statusClass += ' camera-address-status-pending';
			status = lastIP && lastIP !== slot.ip
				? _('Waiting for camera reconnect · last seen %s').format(lastIP)
				: _('Waiting for camera reconnect / DHCP renewal.');
		}

		const select = E('select', {
			class:'cbi-input-select',
			'aria-label':_('Camera assigned to %s Cam').format(slot.id),
			change:async ev => {
				const control = ev.currentTarget;
				const nextMac = control.value;
				const nextLive = liveByMac.get(normalizeMac(nextMac));
				control.disabled = true;
				try {
					await setCameraAddressSlot(slot.id, nextMac, nextLive && nextLive.ip);
				} catch (error) {
					control.value = assignedMac;
					control.disabled = false;
				}
			}
		}, [
			E('option', { value:'', selected:!assignedMac }, _('No camera assigned')),
			...pinned.map(camera => {
				const cameraProfileValue = cameraProfile(camera.mac);
				const owner = cameraAddressSlotForMac(camera.mac);
				const attrs = { value:camera.mac, selected:camera.mac === assignedMac };
				const ownerLabel = owner && owner.id !== slot.id ? ` · ${_('currently %s Cam').format(owner.id)}` : '';
				return E('option', attrs, `${cameraProfileValue.name || camera.fallbackName || camera.mac} · ${camera.mac}${ownerLabel}`);
			})
		]);
		select.value = assignedMac;

		return E('article', { class:'camera-address-card' }, [
			E('div', { class:'camera-address-slot', 'aria-hidden':'true' }, slot.id),
			E('div', { class:'camera-address-main' }, [
				E('div', { class:'camera-address-heading' }, [
					E('strong', { title:name }, `${slot.id} Cam · ${name}`),
					E('a', {
						class:'camera-address-link',
						href:`http://${slot.ip}/`,
						target:'_blank',
						rel:'noopener',
						title:_('Open %s Cam WebUI at %s').format(slot.id, slot.ip),
						'aria-label':_('Open %s Cam WebUI at %s').format(slot.id, slot.ip)
					}, `${_('WebUI')} · ${slot.ip}`)
				]),
				select,
				assignedMac ? E('div', { class:'camera-address-details' }, [
					E('span', {}, _('Camera MAC')),
					E('code', {}, assignedMac),
					E('span', {}, `· ${_('Fixed IP')} ${slot.ip}`)
				]) : '',
				E('small', { class:statusClass }, status)
			])
		]);
	});

	return E('section', { id:'camera-addresses', class:'cbi-section camera-panel camera-address-panel camera-config-only' }, [
		E('div', { class:'camera-panel-heading' }, [
			E('div', { class:'camera-panel-title' }, [cameraIcon('network'), E('h3', {}, _('Camera addresses'))]),
			E('small', {}, _('A–D are reusable project slots. Reassigning a slot releases the previous camera.'))
		]),
		E('div', { class:'camera-address-grid' }, cards),
		E('small', { class:'camera-address-status', style:'margin-top:.65rem' }, _('A camera receives its new address after it renews DHCP; reconnect or restart it if the old lease remains active.'))
	]);
}

function exportCameraConfiguration(state) {
	const cameras = (uci.sections('camera_network', 'camera') || []).map(section => ({
		mac: section.mac || '', name: section.name || '', note: section.note || '', pinned: section.pinned === '1',
		lastIP: section.last_ip || '', boundCameraMac: section.bound_camera_mac || '', hidden:section.hidden === '1',
		remoteLEDS:section.remote_leds_enabled !== '0'
	}));
	const payload = { exportedAt:new Date().toISOString(), device:state.board.hostname || 'HaLow_AP', network:{
		role:uci.get('wireless','default_radio1','mode'), ssid:uci.get('wireless','default_radio1','ssid'),
		channel:uci.get('wireless','radio1','channel'), country:uci.get('wireless','radio1','country'), encryption:uci.get('wireless','default_radio1','encryption')
	}, cameras, slots:cameraAddressAssignments().map(slot => ({ slot:slot.id, fixedIP:slot.ip, cameraMac:slot.cameraMac || '' })) };
	const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' }));
	const link = E('a', { href:url, download:`halow-camera-config-${new Date().toISOString().slice(0,10)}.json` });
	document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
	showCameraToast(_('Configuration exported'));
}

function importCameraConfiguration() {
	const input = E('input', { type:'file', accept:'application/json,.json', style:'display:none' });
	input.addEventListener('change', () => {
		const file = input.files && input.files[0];
		if (!file) return;
		const reader = new FileReader();
		reader.onload = async () => {
			try {
				const payload = JSON.parse(String(reader.result || '{}'));
				if (!Array.isArray(payload.cameras)) throw new Error('invalid');
				if (!window.confirm(_('Merge %d saved device profiles into this controller?').format(payload.cameras.length))) return;
				for (const camera of payload.cameras) {
					if (!camera.mac) continue;
					const section = cameraSection(camera.mac);
					if (!uci.get('camera_network', section)) uci.add('camera_network', 'camera', section);
					uci.set('camera_network', section, 'mac', camera.mac);
					uci.set('camera_network', section, 'name', camera.name || '');
					uci.set('camera_network', section, 'note', camera.note || '');
						uci.set('camera_network', section, 'last_ip', camera.lastIP || '');
						uci.set('camera_network', section, 'pinned', camera.pinned ? '1' : '0');
						uci.set('camera_network', section, 'hidden', camera.hidden ? '1' : '0');
						uci.set('camera_network', section, 'bound_camera_mac', camera.boundCameraMac || '');
						uci.set('camera_network', section, 'remote_leds_enabled', camera.remoteLEDS === false ? '0' : '1');
					}
					await uci.save();
					await uci.apply(10);
					if (Array.isArray(payload.slots)) {
						for (const savedSlot of payload.slots) {
							const slot = cameraAddressSlot(savedSlot && savedSlot.slot);
							if (!slot) continue;
							await setCameraAddressSlot(slot.id, savedSlot.cameraMac || '', '', { silent:true, deferRefresh:true });
						}
					}
					showCameraToast(_('Configuration restored — refreshing'));
				window.setTimeout(() => window.location.reload(), 700);
			} catch (error) { showCameraToast(_('Invalid configuration file'), true); }
		};
		reader.readAsText(file);
	});
	document.body.appendChild(input); input.click(); window.setTimeout(() => input.remove(), 60000);
}

function recordSignalSample(peer) {
	if (!peer)
		return;
	const signal = Number(peer.signal);
	const noise = Number(peer.noise);
	if (!Number.isFinite(signal))
		return;
	signalSamples.push({ time: Date.now(), signal, snr: Number.isFinite(noise) ? signal - noise : null });
	pruneSignalSamples(signalSamples, Date.now());
}

function pruneSignalSamples(samples, now) {
	const cutoff = now - SIGNAL_WINDOW_MS;
	while (samples.length && Number(samples[0].time) < cutoff)
		samples.shift();
	if (samples.length > MAX_SIGNAL_SAMPLES)
		samples.splice(0, samples.length - MAX_SIGNAL_SAMPLES);
}

function recordAPSignalSamples(peers) {
	const now = Date.now();
	const connected = new Set((peers || []).map(peer => String(peer.mac || peer.bssid || '').toUpperCase()).filter(Boolean));
	for (const [mac, state] of apClientStates.entries()) {
		if (!connected.has(mac) && state.connected) {
			state.connected = false;
			state.disconnectedAt = now;
		}
		if (!connected.has(mac)) {
			const samples = apSignalSamples.get(mac) || [];
			samples.push({ time: now, signal: null, snr: null });
			pruneSignalSamples(samples, now);
			apSignalSamples.set(mac, samples);
		}
	}
	for (const peer of peers || []) {
		const mac = String(peer.mac || peer.bssid || '').toUpperCase();
		const signal = Number(peer.signal);
		const noise = Number(peer.noise);
		if (!mac || !Number.isFinite(signal))
			continue;
		apKnownPeers.set(mac, { ...peer, _online:true, _lastSeen:now });
		const state = apClientStates.get(mac);
		if (state && !state.connected && state.disconnectedAt) {
			if (!apOutages.has(mac))
				apOutages.set(mac, []);
			apOutages.get(mac).push({ start: state.disconnectedAt, end: now, duration: now - state.disconnectedAt });
			apOutages.set(mac, apOutages.get(mac).filter(outage => outage.end >= now - SIGNAL_WINDOW_MS));
		}
		apClientStates.set(mac, { connected: true, disconnectedAt: null });
		if (!apSignalSamples.has(mac))
			apSignalSamples.set(mac, []);
		const samples = apSignalSamples.get(mac);
		samples.push({ time: now, signal, snr: Number.isFinite(noise) ? signal - noise : null });
		pruneSignalSamples(samples, now);
	}
	for (const [mac, peer] of apKnownPeers.entries()) {
		if (!connected.has(mac)) {
			if (now - Number(peer._lastSeen || now) > SIGNAL_WINDOW_MS) {
				apKnownPeers.delete(mac); apClientStates.delete(mac); apSignalSamples.delete(mac); apOutages.delete(mac);
				continue;
			}
			apKnownPeers.set(mac, { ...peer, signal:null, noise:null, _online:false });
		}
	}
}

function APDisplayPeers(currentPeers) {
	const now = Date.now();
	for (const peer of currentPeers || []) {
		const mac = normalizeMac(peer.mac || peer.bssid);
		if (mac) apKnownPeers.set(mac, { ...peer, _online:true, _lastSeen:now });
	}
	return Array.from(apKnownPeers.values());
}

function promiseTimeout(promise, fallback, milliseconds) {
	return Promise.race([
		Promise.resolve(promise).catch(() => fallback),
		new Promise(resolve => window.setTimeout(() => resolve(fallback), milliseconds))
	]);
}

function parseAPStationStates(text) {
	const states = new Map();
	for (const line of String(text || '').split('\n')) {
		let match = line.match(/AP-STA-CONNECTED\s+([0-9a-f:]{17})/i);
		if (match) {
			states.set(match[1].toUpperCase(), true);
			continue;
		}
		match = line.match(/AP-STA-DISCONNECTED\s+([0-9a-f:]{17})/i);
		if (match)
			states.set(match[1].toUpperCase(), false);
	}
	return states;
}

async function filterLiveAPPeers(peers, stationStates) {
	const checked = (peers || []).map(peer => {
		// Presence in iwinfo's association list is the authoritative link state.
		// An older hostapd disconnect line must not override a current peer.
		return peer;
	});
	for (const [mac, online] of stationStates.entries()) {
		if (!online && !(peers || []).some(peer => normalizeMac(peer.mac || peer.bssid) === mac)) {
			const previous = apKnownPeers.get(mac) || { mac };
			apKnownPeers.set(mac, { ...previous, signal:null, noise:null, _online:false });
			if (!apClientStates.has(mac))
				apClientStates.set(mac, { connected:false, disconnectedAt:Date.now() });
		}
	}
	return checked.filter(Boolean);
}

function prepareChartCanvas(canvas, fallbackWidth, fallbackHeight) {
	const bounds = canvas.getBoundingClientRect();
	const width = Math.max(1, Math.round(bounds.width || fallbackWidth));
	const height = Math.max(1, Math.round(bounds.height || fallbackHeight));
	const ratio = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
	const pixelWidth = Math.round(width * ratio);
	const pixelHeight = Math.round(height * ratio);
	if (canvas.width !== pixelWidth) canvas.width = pixelWidth;
	if (canvas.height !== pixelHeight) canvas.height = pixelHeight;
	canvas.dataset.pixelRatio = String(ratio);
	const ctx = canvas.getContext('2d');
	ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
	ctx.clearRect(0, 0, width, height);
	return { ctx, width, height, ratio };
}

function drawAPChart(canvas) {
	if (!canvas || !canvas.isConnected)
		return;
	const { ctx, width, height } = prepareChartCanvas(canvas, 600, 250);
	const dark = cameraCanvasUsesDarkTheme(canvas);
	const left = 48;
	const right = Math.max(left + 80, width - 14);
	const top = 18;
	const bottom = Math.max(top + 70, height - 34);
	ctx.strokeStyle = dark ? '#2c3632' : '#d1d1d6';
	ctx.fillStyle = dark ? '#89968f' : '#64748b';
	ctx.lineWidth = 1;
	ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
	ctx.textBaseline = 'middle';
	for (const value of [-30, -50, -70, -90]) {
		const y = top + ((-30 - value) / 60) * (bottom - top);
		ctx.beginPath(); ctx.moveTo(left, y); ctx.lineTo(right, y); ctx.stroke();
		ctx.fillText(String(value), 4, y);
	}
	const allSamples = Array.from(apSignalSamples.values()).flat();
	const now = Date.now();
	const oldestSample = allSamples.length ? Math.min(...allSamples.map(sample => Number(sample.time) || now)) : now;
	const windowStart = Math.max(now - 300000, oldestSample);
	const windowDuration = Math.max(1000, now - windowStart);
	const collectedSeconds = Math.max(1, Math.round(windowDuration / 1000));
	const oldestLabel = collectedSeconds >= 60 ? `${Math.floor(collectedSeconds / 60)} min ago` : `${collectedSeconds} sec ago`;
	ctx.textBaseline = 'alphabetic';
	ctx.fillText(oldestLabel, left, height - 10);
	const nowWidth = ctx.measureText('now').width;
	ctx.fillText('now', right - nowWidth, height - 10);
	Array.from(apSignalSamples.entries()).forEach(([mac, samples], seriesIndex) => {
		const color = stableClientColor(mac, !dark);
		for (const outage of apOutages.get(mac) || []) {
			if (outage.end < now - 300000)
				continue;
			const x1 = left + Math.max(0, Math.min(1, (outage.start - windowStart) / windowDuration)) * (right - left);
			const x2 = left + Math.max(0, Math.min(1, (outage.end - windowStart) / windowDuration)) * (right - left);
			ctx.fillStyle = `${color}24`;
			ctx.fillRect(Math.min(x1, x2), top, Math.max(3, Math.abs(x2 - x1)), bottom - top);
			ctx.fillStyle = color;
			ctx.font = '700 11px ui-monospace, SFMono-Regular, Menlo, monospace';
			ctx.fillText(`${Math.max(1, Math.round(outage.duration / 1000))}s`, Math.min(x1, x2) + 3, Math.min(bottom - 5, top + 15 + seriesIndex * 14));
		}
		ctx.beginPath();
		ctx.strokeStyle = color;
		ctx.lineWidth = 2.5;
		ctx.lineCap = 'round'; ctx.lineJoin = 'round';
		let started = false;
		for (const sample of samples) {
			if (sample.signal === null || sample.signal === undefined || sample.signal === '' || !Number.isFinite(Number(sample.signal))) {
				started = false;
				continue;
			}
			const x = left + Math.max(0, Math.min(1, (sample.time - windowStart) / windowDuration)) * (right - left);
			const y = top + Math.max(0, Math.min(1, (-30 - Number(sample.signal)) / 60)) * (bottom - top);
			if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
		}
		ctx.stroke();
	});
}

function renderAPSignalHistory(identities) {
	const canvas = E('canvas', { class:'camera-chart camera-chart-ap', width:600, height:250, 'aria-label':_('Client signal history chart, signal strength in dBm over the last five minutes') });
	const entries = Array.from(apSignalSamples.entries()).sort((a, b) => a[0].localeCompare(b[0]));
	const ready = entries.some(entry => entry[1].length >= 2);
	if (ready)
		window.requestAnimationFrame(() => drawAPChart(canvas));
	return E('section', { id:'camera-signal-history', class:'camera-panel camera-chart-panel' }, [
		E('div', { class:'camera-panel-heading' }, [
			E('div', { class:'camera-panel-title' }, [cameraIcon('chart'), E('h3', {}, _('Signal history · 5 minutes'))]),
			E('div', { class:'camera-chart-legend' }, entries.map(entry => {
					const clientMac = normalizeMac(entry[0]);
					const name = clientDisplayName(clientMac, true, identities);
					const color = stableClientColor(clientMac);
				return E('span', { title:name }, [E('i', { class:'camera-legend-dot', style:`color:${color}` }), E('span', {}, name)]);
			}))
		]),
		ready ? E('div', { class:'camera-chart-frame' }, canvas) : E('div', { class:'camera-empty-state' }, _('Collecting samples… the curve appears after two refreshes.')),
		E('div', { class:'camera-chart-summary' }, [
			E('span', {}, _('Shaded gaps mark signal loss.')),
			E('strong', {}, _('Healthy signal: −65 dBm or higher'))
		])
	]);
}

function drawChart(canvas) {
	if (!canvas || !canvas.isConnected)
		return;
	const { ctx, width, height } = prepareChartCanvas(canvas, 600, 220);
	const darkMode = cameraCanvasUsesDarkTheme(canvas);
	const left = 48, right = Math.max(left + 80, width - 14), top = 18, bottom = Math.max(top + 70, height - 28);
	ctx.strokeStyle = darkMode ? '#303640' : '#dbe3ed';
	ctx.lineWidth = 1;
	for (const value of [-30, -65, -100]) {
		const y = top + ((-30 - value) / 70) * (bottom - top);
		ctx.beginPath();
		ctx.moveTo(left, y);
		ctx.lineTo(right, y);
		ctx.stroke();
		ctx.fillStyle = darkMode ? '#9ca3af' : '#64748b';
		ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
		ctx.fillText(String(value), 4, y + 4);
	}
	const drawLine = (key, min, max, color, width) => {
		ctx.beginPath();
		ctx.strokeStyle = color;
		ctx.lineWidth = width;
		ctx.lineCap = 'round';
		ctx.lineJoin = 'round';
		let started = false;
		signalSamples.forEach((sample, index) => {
			const value = Number(sample[key]);
			if (!Number.isFinite(value))
				return;
			const x = left + index * ((right - left) / Math.max(1, signalSamples.length - 1));
			const y = bottom - Math.max(0, Math.min(1, (value - min) / (max - min))) * (bottom - top);
			if (!started) {
				ctx.moveTo(x, y);
				started = true;
			} else {
				ctx.lineTo(x, y);
			}
		});
		ctx.stroke();
	};
	drawLine('signal', -100, -30, '#0f766e', 4);
	drawLine('snr', 0, 60, '#2563eb', 3);
}

function renderSignalHistory() {
	const canvas = E('canvas', {
		class: 'camera-chart camera-chart-client',
		width:600,
		height:220,
		'aria-label':_('Signal and SNR history chart for the last five minutes')
	});
	if (signalSamples.length >= 2)
		window.requestAnimationFrame(() => drawChart(canvas));
	return E('div', { class: 'cbi-section', style: 'padding:1rem' }, [
		E('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap' }, [
			E('h3', {}, _('Signal history — last 5 minutes')),
			E('div', { style: 'display:flex;gap:1rem;font-size:.9rem;font-weight:700' }, [
				E('span', { style: 'color:#0f766e' }, '● Signal dBm'),
				E('span', { style: 'color:#2563eb' }, '● SNR dB')
			])
		]),
		signalSamples.length < 2
			? E('p', {}, E('em', {}, _('Collecting samples…')))
			: E('div', { class:'camera-chart-frame' }, canvas)
	]);
}

function renderLinkAlert(peer) {
	if (!peer) {
		dismissedAlerts.delete('client-weak'); dismissedAlerts.delete('client-snr');
		return dismissibleAlert('client-disconnected', 'camera-alert-danger', `● ${_('HaLow link is disconnected')}`);
	}
	dismissedAlerts.delete('client-disconnected');
	const signal = Number(peer.signal);
	const noise = Number(peer.noise);
	const snr = Number.isFinite(signal) && Number.isFinite(noise) ? signal - noise : null;
	if (signal < -75) {
		dismissedAlerts.delete('client-snr');
		return dismissibleAlert('client-weak', 'camera-alert-warning', `▲ ${_('Weak HaLow signal: %d dBm').format(signal)}`);
	}
	dismissedAlerts.delete('client-weak');
	if (snr !== null && snr < 15)
		return dismissibleAlert('client-snr', 'camera-alert-warning', `▲ ${_('Low signal-to-noise ratio: %d dB').format(snr)}`);
	dismissedAlerts.delete('client-snr');
	return null;
}

function renderDeviceAlert(leases, hints) {
	const visible = new Set();
	for (const lease of leases.dhcp_leases || [])
		visible.add(String(lease.macaddr || '').toUpperCase());
	for (const mac of Object.keys(hints.hosts || {}))
		visible.add(String(mac).toUpperCase());
	const missing = (uci.sections('camera_network', 'camera') || [])
		.filter(section => section.pinned === '1' && section.mac && !visible.has(String(section.mac).toUpperCase()));
	if (missing.length)
		return dismissibleAlert('saved-offline', 'camera-alert-danger', `● ${missing.length === 1 ? _('1 saved camera is offline') : _('%d saved cameras are offline').format(missing.length)}`);
	dismissedAlerts.delete('saved-offline');
	const failed = Array.from(latencyResults.values()).filter(result => result.text === _('No reply')).length;
	if (failed)
		return dismissibleAlert('latency-failed', 'camera-alert-warning', `▲ ${_('%d device(s) did not reply to the latency test').format(failed)}`);
	dismissedAlerts.delete('latency-failed');
	return null;
}

function formatDuration(seconds) {
	const value = Math.max(0, Math.round(Number(seconds) || 0));
	if (value < 60)
		return _('%d seconds').format(value);
	return _('%d min %d sec').format(Math.floor(value / 60), value % 60);
}

function parseLinkHistory(text) {
	const events = [];
	let bootLinkSeconds = null;
	for (const line of String(text || '').split('\n')) {
		let type = null;
		let detail = null;
		if (/CTRL-EVENT-CONNECTED/.test(line)) {
			type = 'connected';
			detail = _('HaLow link connected');
		} else if (/CTRL-EVENT-DISCONNECTED|wlan0.*link is down/i.test(line)) {
			type = 'disconnected';
			detail = _('HaLow link disconnected');
		} else if (/Trying to authenticate/.test(line)) {
			type = 'auth';
			detail = _('Authentication started');
		} else if (/Successfully initialized wpa_supplicant/.test(line)) {
			type = 'init';
			detail = _('HaLow client initialized');
		}
		const kernelMatch = line.match(/\[\s*([0-9.]+)\]\s+wlan0:\s+associated/i);
		if (kernelMatch)
			bootLinkSeconds = Number(kernelMatch[1]);
		if (type) {
			const stamp = line.match(/^(\w{3}\s+\w{3}\s+\d+\s+\d\d:\d\d:\d\d\s+\d{4})/);
			events.push({ type, detail, time: stamp ? stamp[1] : '—' });
		}
	}
	return { events: events.slice(-12).reverse(), bootLinkSeconds };
}

function renderLinkHistory(history) {
	if (!history.events.length)
		return E('p', {}, E('em', {}, _('No connection events recorded in this boot.')));
	return E('div', { style: 'display:grid;gap:.55rem' }, history.events.map(event => {
		const color = event.type === 'connected' ? '#179447' : event.type === 'disconnected' ? '#d33b32' : '#2563a8';
		return E('div', { style: 'display:grid;grid-template-columns:12px minmax(160px,1fr) auto;align-items:center;gap:.65rem' }, [
			E('span', { style: `width:10px;height:10px;border-radius:50%;background:${color}` }),
			E('strong', {}, event.detail),
			E('small', { style: 'opacity:.7;white-space:nowrap' }, event.time)
		]);
	}));
}

function statusBadge(online) {
	return E('span', {
		style: `display:inline-block;padding:.2rem .65rem;border-radius:999px;font-weight:700;color:${online ? '#126b36' : '#777'};background:${online ? '#dff7e8' : '#eee'}`
	}, online ? _('Online') : _('Offline'));
}

async function testLatency(ip, output, button) {
	button.disabled = true;
	button.classList.add('spinning');
	output.textContent = _('Testing…');
	try {
		const text = await fs.exec_direct('/bin/ping', ['-c', '1', '-W', '1', ip]);
		const replied = typeof text === 'string' && /(?:bytes from|1 packets received|1 received)/i.test(text);
		if (!replied)
			throw new Error('No ICMP reply');
		const match = text.match(/time[=<]([0-9.]+)\s*ms/i);
		const result = match ? `${match[1]} ms` : _('Reachable');
		latencyResults.set(ip, { text: result, color: '#179447' });
		output.textContent = result;
		output.style.color = '#179447';
	} catch (e) {
		latencyResults.set(ip, { text: _('No reply'), color: '#d33b32' });
		output.textContent = _('No reply');
		output.style.color = '#d33b32';
	} finally {
		button.disabled = false;
		button.classList.remove('spinning');
	}
}

function latencyControl(ip, compact) {
	const previous = latencyResults.get(ip);
	const output = E('strong', { style:`display:inline-block;min-width:${compact ? '2.5rem' : '5rem'};color:${previous ? previous.color : 'inherit'}` }, previous ? previous.text : '—');
	const button = E('button', {
		class:'cbi-button cbi-button-action cbi-button-inline',
		title:_('Test latency'),
		'aria-label':_('Test latency'),
		click:ev => testLatency(ip, output, ev.currentTarget)
	}, compact ? [cameraIcon('signal'), E('span', { class:'camera-action-label' }, _('Test'))] : _('Test'));
	return E('div', { style:'display:flex;align-items:center;gap:.4rem;white-space:nowrap' }, [output, button]);
}

function deviceDetails(mac, source) {
	const attrs = {
		class:'camera-device-details',
		toggle:ev => {
			if (ev.currentTarget.open)
				openDeviceDetails.add(mac);
			else
				openDeviceDetails.delete(mac);
		}
	};
	if (openDeviceDetails.has(mac))
		attrs.open = '';
	return E('details', attrs, [
		E('summary', { title:_('Device details'), 'aria-label':_('Device details') }, [cameraIcon('more'), E('span', { class:'camera-action-label' }, _('Details'))]),
		E('dl', {}, [
			E('dt', {}, _('MAC address')),
			E('dd', {}, valueOrDash(mac)),
			E('dt', {}, _('Source')),
			E('dd', {}, source)
		])
	]);
}

function renderDeviceTable(leases, hints, selfIPs, bridgePorts, identities) {
	const devices = discoveredDevices(leases, hints, selfIPs, bridgePorts);
	const tableHost = E('div', { class:'camera-device-table-scroll camera-table-scroll' });
	const renderRows = () => {
		const query = deviceView.query.trim().toLowerCase();
		const visible = devices.map(device => {
			const profile = cameraProfile(device.mac);
			const addressSlot = cameraAddressSlotForMac(device.mac);
			return { ...device, profile, addressSlot, displayIP:addressSlot ? addressSlot.ip : device.ip };
		})
			.filter(device => deviceView.filter === 'hidden' ? device.profile.hidden : !device.profile.hidden)
			.filter(device => deviceView.filter !== 'pinned' || device.profile.pinned)
			.filter(device => !query || [device.profile.name, device.fallbackName, device.profile.note, device.ip, device.displayIP, device.mac]
				.some(value => String(value || '').toLowerCase().includes(query)))
			.sort((a, b) => Number(b.profile.pinned) - Number(a.profile.pinned));
		const rows = visible.map(device => {
			const tested = latencyResults.get(device.displayIP);
			const clientIdentity = identities && identities.get(normalizeMac(device.mac));
			const baseOnline = clientIdentity ? clientIdentity.online : (tested ? tested.text !== _('No reply') : device.online);
			const addressPending = Boolean(device.addressSlot && device.current && device.ip && device.ip !== device.displayIP);
			const effectiveOnline = device.addressSlot ? baseOnline && !addressPending && device.ip === device.displayIP : baseOnline;
			const peer = clientIdentity && clientIdentity.peer;
			const signal = peer && effectiveOnline && Number.isFinite(Number(peer.signal)) ? Number(peer.signal) : null;
			const role = clientIdentity ? _('Camera link') : device.profile.pinned ? _('Camera') : _('Network device');
			const bridgePort = bridgePorts && bridgePorts.get(normalizeMac(device.mac));
			const link = clientIdentity ? _('HaLow') : bridgePort ? `br-lan · ${bridgePort}` : device.source;
			const name = valueOrDash(device.profile.name || device.fallbackName);
			const signalClass = signal === null ? '' : signal >= -65 ? ' camera-metric-good' : signal >= -75 ? ' camera-metric-warn' : ' camera-metric-bad';
			const pin = E('button', {
				class:`cbi-button camera-pin${device.profile.pinned ? ' camera-pin-active' : ''}`,
				title:device.profile.pinned ? _('Unpin camera') : _('Pin camera'),
				'aria-label':device.profile.pinned ? _('Unpin camera') : _('Pin camera'),
				click:async () => { await toggleCameraPin(device.mac, device.ip); }
			}, cameraIcon('pin'));
			const actions = E('div', { class:'camera-device-actions' }, [
				latencyControl(device.displayIP, true),
				deviceDetails(device.mac, device.source),
				E('button', { class:'cbi-button cbi-button-edit', title:_('Edit camera profile'), 'aria-label':_('Edit camera profile'), click:() => editCameraProfile(device.mac, device.ip, device.fallbackName) }, [cameraIcon('edit'), E('span', { class:'camera-action-label' }, _('Edit'))]),
				deviceView.filter === 'hidden'
					? E('button', { class:'cbi-button', title:_('Restore device'), 'aria-label':_('Restore device'), click:async() => { const section=cameraSection(device.mac); uci.set('camera_network', section, 'hidden', '0'); await uci.save(); await uci.apply(10); showCameraToast(_('Device restored')); if (requestDashboardRefresh) await requestDashboardRefresh(); } }, [cameraIcon('undo'), E('span', { class:'camera-action-label' }, _('Restore'))])
					: E('button', { class:'cbi-button', title:_('Hide device'), 'aria-label':_('Hide device'), click:async() => { await hideCameraDevice(device.mac, device.ip); } }, [cameraIcon('hide'), E('span', { class:'camera-action-label' }, _('Hide'))])
			]);
			return E('tr', {}, [
				E('td', { 'data-label':_('Pin') }, pin),
				E('td', { 'data-label':_('Name') }, E('div', { class:'camera-device-primary' }, [
					cameraIcon(clientIdentity ? 'signal' : device.profile.pinned ? 'camera' : 'devices'),
					E('div', { style:'min-width:0' }, [
						E('a', { href:`http://${device.displayIP}/`, target:'_blank', rel:'noopener', title:name }, name),
						device.profile.note ? E('small', { class:'camera-device-role', title:device.profile.note }, device.profile.note) : E('small', { class:'camera-device-role' }, role)
					])
				])),
				E('td', { 'data-label':_('Role') }, role),
				E('td', { 'data-label':_('IP address'), class:'camera-device-ip' }, device.displayIP
					? E('a', { href:`http://${device.displayIP}/`, target:'_blank', rel:'noopener', title:_('Open camera Web UI') }, `${device.addressSlot ? `${device.addressSlot.id} · ` : ''}${device.displayIP}`)
					: '—'),
				E('td', { 'data-label':_('Link / port') }, link),
				E('td', { 'data-label':_('Signal') }, E('span', { class:`camera-metric${signalClass}` }, signal === null ? '—' : `${signal} dBm`)),
				E('td', { 'data-label':_('Status') }, E('span', {
					class:`camera-status-pill${effectiveOnline ? '' : addressPending ? ' camera-status-pill-pending' : ' camera-status-pill-offline'}`,
					title:addressPending ? _('Current lease: %s').format(device.ip) : ''
				}, effectiveOnline ? _('Online') : addressPending ? _('Pending DHCP') : _('Offline'))),
				E('td', { 'data-label':_('Actions') }, actions)
			]);
		});
		tableHost.replaceChildren(rows.length ? E('table', { class:'camera-device-table' }, [
			E('thead', {}, E('tr', {}, [
				E('th', { scope:'col' }, _('Pin')),
				E('th', { scope:'col' }, _('Name')),
				E('th', { scope:'col' }, _('Role')),
				E('th', { scope:'col' }, _('IP address')),
				E('th', { scope:'col' }, _('Link / port')),
				E('th', { scope:'col' }, _('Signal')),
				E('th', { scope:'col' }, _('Status')),
				E('th', { scope:'col' }, _('Actions'))
			])),
			E('tbody', {}, rows)
		]) : E('div', { class:'camera-empty-state' }, _('No matching devices.')));
	};
	const search = E('input', {
		type:'search',
		'aria-label':_('Search discovered devices'),
		placeholder:_('Search name, IP or MAC'),
		value:deviceView.query,
		input:ev => { deviceView.query = ev.currentTarget.value; renderRows(); }
	});
	const filterGroup = E('div', { class:'camera-filter-group' });
	const updateFilterButtons = () => {
		const pinnedCount = devices.filter(device => cameraProfile(device.mac).pinned && !cameraProfile(device.mac).hidden).length;
		const visibleCount = devices.filter(device => !cameraProfile(device.mac).hidden).length;
		const hiddenCount = devices.length - visibleCount;
		filterGroup.replaceChildren(
			E('button', { class:`cbi-button camera-filter-button${deviceView.filter === 'all' ? ' camera-filter-button-active' : ''}`, click:() => { deviceView.filter='all'; updateFilterButtons(); renderRows(); } }, `${_('All devices')} (${visibleCount})`),
			E('button', { class:`cbi-button camera-filter-button${deviceView.filter === 'pinned' ? ' camera-filter-button-active' : ''}`, click:() => { deviceView.filter='pinned'; updateFilterButtons(); renderRows(); } }, `${_('Pinned only')} (${pinnedCount})`),
			E('button', { class:`cbi-button camera-filter-button${deviceView.filter === 'hidden' ? ' camera-filter-button-active' : ''}`, click:() => { deviceView.filter='hidden'; updateFilterButtons(); renderRows(); } }, `${_('Hidden')} (${hiddenCount})`)
		);
	};
	updateFilterButtons();
	renderRows();
	return E('div', {}, [E('div', { class:'camera-device-tools' }, [E('div', { class:'camera-search-wrap' }, [cameraIcon('search'), search]), filterGroup]), tableHost]);
}

function redrawCameraCharts(root) {
	window.requestAnimationFrame(() => {
		root.querySelectorAll('canvas.camera-chart-ap').forEach(canvas => drawAPChart(canvas));
		root.querySelectorAll('canvas.camera-chart:not(.camera-chart-ap)').forEach(canvas => drawChart(canvas));
	});
}

function renderAPToolbar(state, root) {
	return E('header', { class:'camera-main-toolbar' }, [
		E('div', { class:'camera-main-heading' }, [
			E('h2', {}, _('LIVE CAMERA NETWORK')),
			E('small', {}, `${state.board.hostname || _('Access point')} · ${_('Updated')} ${new Date().toLocaleTimeString()}`)
		]),
		E('div', { class:'camera-main-actions' }, [
			E('button', { class:'cbi-button camera-monitor-button', title:_('Toggle monitor mode'), 'aria-label':_('Toggle monitor mode'), click:() => toggleMonitorMode(root) }, [cameraIcon('dashboard'), E('span', {}, root.classList.contains('camera-monitor-mode') ? _('Exit monitor') : _('Monitor'))]),
			E('button', { class:'cbi-button camera-config-only camera-export-button', title:_('Export configuration'), 'aria-label':_('Export configuration'), click:() => exportCameraConfiguration(state) }, [cameraIcon('download'), E('span', {}, _('Export'))]),
			E('button', { class:'cbi-button camera-config-only camera-export-button', title:_('Import configuration'), 'aria-label':_('Import configuration'), click:importCameraConfiguration }, [cameraIcon('upload'), E('span', {}, _('Import'))])
		])
	]);
}

return view.extend({
	handleSaveApply: null,
	handleSave: null,
	handleReset: null,

	async collect() {
		const [board, systemInfo, leases, hints, wifiNetworks, _cameraConfig, _wirelessConfig, linkLog, networkDump, bridgeFDB, bootText] = await Promise.all([
			callBoard(),
			callSystemInfo(),
			callDHCPLeases(),
			network.getHostHints(),
			network.getWifiNetworks(),
			uci.load('camera_network'),
			uci.load('wireless'),
			fs.exec_direct('/sbin/logread', ['-e', 'wlan0']).catch(() => ''),
			callNetworkDump(),
			fs.exec_direct('/usr/sbin/brctl', ['showmacs', 'br-lan']).catch(() => ''),
			fs.read('/tmp/camera-network-boot.json').catch(() => '{}')
		]);
		const selfIPs = new Set();
		for (const iface of networkDump.interface || [])
			for (const address of iface['ipv4-address'] || [])
				if (address.address)
					selfIPs.add(address.address);

		const configuredRole = uci.get('wireless', 'default_radio1', 'mode') || 'sta';
		let halow = { wifi:null, role:configuredRole, peers:[], peer:null };
		for (const wifi of wifiNetworks) {
			const modes = wifi.ubus('dev', 'iwinfo', 'hwmodes') || [];
			if (modes.includes('ah')) {
				const assoc = await promiseTimeout(wifi.getAssocList(), [], 1500);
				const role = configuredRole;
				const liveAssoc = role === 'ap' ? await filterLiveAPPeers(assoc, parseAPStationStates(linkLog)) : (assoc || []);
				halow = { wifi, role, peers: liveAssoc, peer: role === 'sta' && liveAssoc.length ? liveAssoc[0] : null };
				break;
			}
		}

		let boot = {};
		try { boot = JSON.parse(bootText || '{}'); } catch (e) {}
		return { board, systemInfo, leases, hints, halow, selfIPs, boot, bridgePorts: parseBridgeFDB(bridgeFDB), linkHistory: parseLinkHistory(linkLog) };
	},

	load() {
		return this.collect();
	},

	render(data) {
		applySavedSidebarState();
		const root = E('div', { class: 'camera-dashboard' }, []);
		try { window.localStorage.removeItem('cameraTheme'); } catch (error) {}
		applyCameraSystemTheme(root);
		const themeMedia = window.matchMedia('(prefers-color-scheme: dark)');
		const syncSystemTheme = () => {
			applyCameraSystemTheme(root);
			redrawCameraCharts(root);
		};
		if (themeMedia.addEventListener)
			themeMedia.addEventListener('change', syncSystemTheme);
		else if (themeMedia.addListener)
			themeMedia.addListener(syncSystemTheme);
		let viewObserver = null;
		const releaseViewState = () => {
			if (themeMedia.removeEventListener)
				themeMedia.removeEventListener('change', syncSystemTheme);
			else if (themeMedia.removeListener)
				themeMedia.removeListener(syncSystemTheme);
			if (viewObserver)
				viewObserver.disconnect();
			document.body.classList.remove('camera-console-active', 'camera-sidebar-hidden', 'camera-theme-light', 'camera-theme-dark');
			delete document.body.dataset.cameraTheme;
		};
		window.requestAnimationFrame(() => {
			if (!root.isConnected)
				return;
			viewObserver = new MutationObserver(() => {
				if (!root.isConnected)
					releaseViewState();
			});
			viewObserver.observe(document.body, { childList:true, subtree:true });
		});
		let interactionHoldUntil = 0;
		let deviceScrollLeft = 0;
		root.addEventListener('touchstart', () => { interactionHoldUntil = Date.now() + 1500; }, { passive:true });
		root.addEventListener('touchmove', () => { interactionHoldUntil = Date.now() + 1500; }, { passive:true });
		root.addEventListener('touchend', () => { interactionHoldUntil = Date.now() + 800; }, { passive:true });
		root.addEventListener('touchcancel', () => { interactionHoldUntil = Date.now() + 500; }, { passive:true });
		root.classList.toggle('camera-monitor-mode', window.localStorage.getItem('cameraMonitorMode') === '1');
		const renderData = (state, force) => {
			const peer = state.halow && state.halow.peer;
			const isAP = state.halow && state.halow.role === 'ap';
			root.classList.toggle('camera-ap-dashboard', isAP);
			const displayPeers = isAP ? APDisplayPeers(state.halow.peers) : [];
			const devices = discoveredDevices(state.leases, state.hints, state.selfIPs, state.bridgePorts);
			const identities = isAP ? buildClientIdentities(displayPeers, state.halow.peers, devices, state.boot) : new Map();
			if (isAP)
				recordAPSignalSamples(state.halow.peers);
			else
				recordSignalSample(peer);
			const linkAlert = isAP ? renderAPAlerts(state.halow.peers, identities) : (renderLinkAlert(peer) || E([]));
			const deviceAlert = renderDeviceAlert(state.leases, state.hints) || E([]);
			const temperatureAlert = renderTemperatureAlert(state.boot.temperature, state.boot.thermalMitigation);
			const remoteTemperatureAlert = isAP ? renderRemoteTemperatureAlert(identities) : E([]);
			const uptime = Number(state.systemInfo && state.systemInfo.uptime) || 0;
			const connectedTime = peer && Number(peer.connected_time);
			const acquisitionTime = state.linkHistory.bootLinkSeconds !== null
				? state.linkHistory.bootLinkSeconds
				: (Number.isFinite(connectedTime) ? Math.max(0, uptime - connectedTime) : null);
			const activeControl = document.activeElement;
			const preserveInteraction = ledOperations > 0 || (!force && ((root.contains(activeControl) && /^(INPUT|SELECT|TEXTAREA)$/.test(activeControl.tagName)) || Date.now() < interactionHoldUntil));
			const statusStrip = E('div', { class:'camera-status-strip camera-status-strip-client' }, [
				renderLEDControl(),
				renderTemperaturePanel(state.boot.temperature, state.boot.thermalMitigation)
			]);
			const clientOverview = E([], [
					E('div', { class: 'camera-summary-grid' }, [
						E('div', { class: 'cbi-section camera-summary-card' }, [
							E('h3', {}, _('HaLow link')),
							E('p', {}, peer ? statusBadge(true) : statusBadge(false)),
							renderSignalGauge(peer),
							E('p', {}, peer && peer.connected_time !== undefined ? _('Connected for %d seconds').format(peer.connected_time) : '')
						]),
						E('div', { class: 'cbi-section camera-summary-card' }, [
							E('h3', {}, _('This boot')),
							E('div', { class: 'camera-boot-time', style: `color:${acquisitionTime !== null && acquisitionTime <= 20 ? '#179447' : '#2563a8'}` }, acquisitionTime === null ? '—' : formatDuration(acquisitionTime)),
							E('p', { style: 'font-weight:700' }, _('Power-on → HaLow ready')),
							E('p', { style: 'opacity:.7;font-size:.9rem' }, _('Uptime: %s').format(formatDuration(uptime)))
						])
					]),
					renderSignalHistory()
				]);
			if (preserveInteraction)
				return;
			const oldDeviceScroll = root.querySelector('.camera-table-scroll');
			if (oldDeviceScroll)
				deviceScrollLeft = oldDeviceScroll.scrollLeft;
			const pageScroller = document.querySelector('.main-right');
			const pageScrollY = pageScroller ? pageScroller.scrollTop : window.scrollY;
			const buildDeviceSection = () => E('section', { id:'camera-devices', class:`cbi-section camera-device-section camera-config-only${isAP ? ' camera-panel camera-ops-devices' : ''}` }, [
				E('div', { class:'camera-section-heading', style:'display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap' }, [
					E('div', { class:isAP ? 'camera-panel-title' : '' }, [isAP ? cameraIcon('devices') : E([]), E('h3', {}, _('Discovered devices'))]),
					E('small', { style:'opacity:.7' }, `${_('Updated')} ${new Date().toLocaleTimeString()}`)
				]),
				renderDeviceTable(state.leases, state.hints, state.selfIPs, state.bridgePorts, identities)
			]);
			const pageContent = isAP ? E('div', { class:'camera-ops-shell' }, [
				renderAPSidebar(state, devices, identities),
				E('main', { class:'camera-ops-main' }, [
					renderAPToolbar(state, root),
					temperatureAlert,
					remoteTemperatureAlert,
					linkAlert,
						deviceAlert,
						renderLiveLinkStatus(identities),
						renderAPSignalHistory(identities),
						renderCameraAssignments(identities, devices),
						renderCameraAddressSlots(devices),
						buildDeviceSection(),
					E('p', { class:'camera-side-footer', style:'margin:.65rem 0 0' }, _('Camera network telemetry refreshes every 2 seconds.'))
				])
			]) : E([], [
				E('div', { class:'camera-console-bar' }, [
					E('button', { class: 'cbi-button camera-sidebar-toggle', title: _('Open or close sidebar'), click: toggleSidebar }, '☰'),
					E('div', { class: 'camera-console-title' }, [
						E('div', {}, [
							E('h2', {}, _('CAMERA NETWORK')),
							E('div', { class: 'camera-console-subtitle' }, _('HaLow production console · Live telemetry'))
						])
					]),
					E('div', { class: 'camera-toolbar-actions' }, [
						E('span', { class: 'camera-live-dot' }),
						E('span', { class: 'camera-console-subtitle camera-live-label' }, _('Live'))
					])
				]),
				statusStrip,
				temperatureAlert,
				linkAlert,
				deviceAlert,
				clientOverview,
				buildDeviceSection(),
				E('div', { class:'cbi-section', style:'padding:1rem' }, [
					E('h3', {}, _('HaLow connection history — this boot')),
					renderLinkHistory(state.linkHistory)
				]),
				E('p', { style: 'opacity:.7' }, _('Camera network telemetry refreshes every 2 seconds.'))
			]);
			preserveLEDBrightness(root, pageContent);
			root.replaceChildren(E('style', {}, dashboardStyles), pageContent);
			window.requestAnimationFrame(() => {
				const newDeviceScroll = root.querySelector('.camera-table-scroll');
				if (newDeviceScroll)
					newDeviceScroll.scrollLeft = deviceScrollLeft;
				const newPageScroller = document.querySelector('.main-right');
				if (newPageScroller)
					newPageScroller.scrollTop = pageScrollY;
				else
					window.scrollTo(0, pageScrollY);
			});
		};

		renderData(data);
		requestDashboardRefresh = async () => {
			try {
				renderData(await this.collect(), true);
			} catch (error) {
				console.error('Camera Network refresh failed', error);
			}
		};
		poll.add(async () => {
			try {
				renderData(await this.collect(), false);
			} catch (error) {
				console.error('Camera Network refresh failed', error);
			}
		}, 2);
		return root;
	}
});
