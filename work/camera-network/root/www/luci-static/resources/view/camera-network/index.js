'use strict';
'require fs';
'require network';
'require poll';
'require rpc';
'require uci';
'require ui';
'require view';

const luciTranslate = _;
const cameraChinese = {
	'%d HaLow clients': '%d 个 HaLow 客户端',
	'%d cameras': '%d 台摄影机',
	'%d clients': '%d 个客户端',
	'%d connected': '%d 个已连接',
	'%d device(s) did not reply to the latency test': '%d 台设备未响应延迟测试',
	'%d min %d sec': '%d 分 %d 秒',
	'%d pinned cameras offline': '%d 台置顶摄影机离线',
	'%d saved cameras are offline': '%d 台已保存摄影机离线',
	'%d seconds': '%d 秒',
	'%s and %s online': '%s和%s在线',
	'1 HaLow client': '1 个 HaLow 客户端',
	'1 camera': '1 台摄影机',
	'1 client': '1 个客户端',
	'1 pinned camera offline': '1 台置顶摄影机离线',
	'1 saved camera is offline': '1 台已保存摄影机离线',
	'AP monitor ready': 'AP 监测服务就绪',
	'All device lights are disabled': '所有设备指示灯均已关闭',
	'All devices': '全部设备',
	'Attention': '需要注意',
	'Authentication started': '开始认证',
	'Automatic network indication enabled': '自动网络状态指示已启用',
	'Automatically detected': '自动检测',
	'CAMERA NETWORK': '摄影机网络',
	'Camera': '摄影机',
	'Camera name': '摄影机名称',
	'Camera network telemetry refreshes every 2 seconds.': '摄影机网络状态每 2 秒更新一次。',
	'Camera pinned': '摄影机已置顶',
	'Camera profile saved': '摄影机资料已保存',
	'Camera unpinned': '摄影机已取消置顶',
	'Channel': '信道',
	'Check network': '检查网络',
	'Choose camera': '选择摄影机',
	'Client control failed — check pairing and connection': '客户端控制失败——请检查配对与连接',
	'Client lights': '客户端指示灯',
	'Client lights disabled': '客户端指示灯已关闭',
	'Client lights enabled': '客户端指示灯已打开',
	'Client paired — refreshing': '客户端已配对——正在刷新',
	'Client signal history — last 5 minutes': '客户端信号历史——最近 5 分钟',
	'Client temperature alert': '客户端温度警告',
	'Client → camera connections': '客户端 → 摄影机连接',
	'Collecting samples…': '正在收集数据…',
	'Collecting samples… the curve appears after two refreshes.': '正在收集数据…刷新两次后将显示曲线。',
	'Configuration exported': '配置已导出',
	'Configuration restored — refreshing': '配置已恢复——正在刷新',
	'Connected for %d seconds': '已连接 %d 秒',
	'Critical chip temperature': '芯片温度危险',
	'Critical temperature': '温度危险',
	'DHCP lease': 'DHCP 租约',
	'Details': '详情',
	'Device hidden': '设备已隐藏',
	'Device restored': '设备已恢复显示',
	'Discovered devices': '发现的设备',
	'Dismiss': '关闭',
	'Dropouts': '断线次数',
	'Edit': '编辑',
	'Elevated temperature': '温度偏高',
	'Emergency chip temperature': '芯片温度紧急',
	'Emergency — reduce load immediately': '紧急——请立即降低负载',
	'Excellent': '极佳',
	'Exit monitor': '退出监看',
	'Export': '导出',
	'First HaLow client': '首个 HaLow 客户端',
	'First pinned camera': '首台置顶摄影机',
	'Good': '良好',
	'HaLow Client': 'HaLow 客户端',
	'HaLow access point': 'HaLow 接入点',
	'HaLow chip temperature': 'HaLow 芯片温度',
	'HaLow client initialized': 'HaLow 客户端已初始化',
	'HaLow clients': 'HaLow 客户端',
	'HaLow connection history — this boot': 'HaLow 连接记录——本次开机',
	'HaLow link': 'HaLow 链路',
	'HaLow link connected': 'HaLow 链路已连接',
	'HaLow link disconnected': 'HaLow 链路已断开',
	'HaLow link is disconnected': 'HaLow 链路已断开',
	'HaLow production console · Live telemetry': 'HaLow 摄影制作控制台 · 实时状态',
	'Healthy': '正常',
	'Hidden': '已隐藏',
	'Hide': '隐藏',
	'High chip temperature': '芯片温度过高',
	'Import': '导入',
	'Indicator lights': '指示灯',
	'Indicator lights disabled': '指示灯已关闭',
	'Indicator lights enabled': '指示灯已打开',
	'Invalid configuration file': '配置文件无效',
	'Last recovery': '最近恢复',
	'Last session': '上次连接',
	'Live': '实时',
	'Low signal-to-noise ratio: %d dB': '信噪比过低：%d dB',
	'MAC address': 'MAC 地址',
	'Management IP unavailable': '管理 IP 不可用',
	'Manual selection': '手动选择',
	'Measured continuously by the AP, even when this page is closed.': '由 AP 持续测量，即使关闭本页面也不会停止。',
	'Merge %d saved device profiles into this controller?': '将 %d 个已保存设备资料合并到此控制器？',
	'Monitor': '监看',
	'Network neighbor': '网络邻居',
	'No HaLow client connected': '没有 HaLow 客户端连接',
	'No camera detected': '未检测到摄影机',
	'No connection events recorded in this boot.': '本次开机尚无连接事件记录。',
	'No matching devices.': '没有符合条件的设备。',
	'No reply': '无响应',
	'No signal': '无信号',
	'Noise': '噪声',
	'Note / position': '备注 / 位置',
	'Off': '关闭',
	'Offline': '离线',
	'On': '打开',
	'Online': '在线',
	'Open or close sidebar': '打开或关闭侧边栏',
	'Pair': '配对',
	'Pair required': '需要配对',
	'Pairing failed — authorize this AP on the Client': '配对失败——请在客户端授权此 AP',
	'Pin at least one camera below': '请在下方至少置顶一台摄影机',
	'Pin camera': '置顶摄影机',
	'Pin the camera below, then select it here.': '请先在下方置顶摄影机，再在此选择。',
	'Pinned cameras on the same HaLow bridge port are matched automatically.': '系统会自动匹配同一 HaLow 网桥端口上的置顶摄影机。',
	'Pinned only': '仅置顶',
	'Power-on recovery — this boot': '开机恢复——本次开机',
	'Power-on → HaLow ready': '通电 → HaLow 就绪',
	'Reachable': '可访问',
	'Ready to shoot': '可以拍摄',
	'Remote HaLow chip temperature': '远程 HaLow 芯片温度',
	'Restore': '恢复',
	'Saved static device': '已保存的静态设备',
	'Search name, IP or MAC': '搜索名称、IP 或 MAC',
	'Shaded gaps mark signal loss. The number shows how long reconnection took.': '阴影区表示信号中断，数字表示重新连接所用时间。',
	'Signal history — last 5 minutes': '信号历史——最近 5 分钟',
	'Source': '来源',
	'Switch to Chinese': '切换到中文',
	'Switch to English': '切换到英文',
	'Temperature normal': '温度正常',
	'Test': '测试',
	'Testing…': '正在测试…',
	'Thermal protection': '温度保护',
	'This boot': '本次开机',
	'Unable to change indicator lights': '无法更改指示灯状态',
	'Unpin camera': '取消置顶摄影机',
	'Updated': '更新时间',
	'Uptime: %s': '运行时间：%s',
	'Very weak': '非常弱',
	'Waiting for clients to connect…': '正在等待客户端连接…',
	'Waiting for sensor…': '正在等待温度传感器…',
	'Waiting…': '等待中…',
	'Warning 75°C · Critical 85°C': '警告 75°C · 危险 85°C',
	'Weak': '较弱',
	'Weak HaLow signal: %d dBm': 'HaLow 信号较弱：%d dBm',
	'disconnected': '已断开',
	'frequent dropouts': '频繁断线',
	'low SNR': '信噪比低',
	'slow recovery': '恢复缓慢',
	'temperature unavailable': '温度不可用',
	'thermal mitigation events': '温度保护事件',
	'thermal protection': '温度保护',
	'weak signal': '信号较弱'
};

function cameraLanguage() {
	const saved = window.localStorage.getItem('cameraLanguage');
	if (saved === 'zh' || saved === 'en')
		return saved;
	const browserLanguage = document.documentElement.lang || navigator.language || '';
	return /^zh/i.test(browserLanguage) ? 'zh' : 'en';
}

function t(source) {
	return cameraLanguage() === 'zh' ? (cameraChinese[source] || source) : luciTranslate(source);
}

function toggleCameraLanguage() {
	window.localStorage.setItem('cameraLanguage', cameraLanguage() === 'zh' ? 'en' : 'zh');
	window.location.reload();
}

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
const deviceView = { query: '', filter: 'pinned' };

const dashboardStyles = `
body.camera-console-active .main-right,
body.camera-console-active #maincontent,
body.camera-console-active #maincontent > .container,
body.camera-console-active #view { background:#090b0e !important; }
body.camera-console-active #maincontent > .container { max-width:none; }
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
}
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
.camera-dashboard .camera-language-button { min-width:3.1rem;padding-left:.65rem;padding-right:.65rem; }
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
.camera-dashboard .camera-led-control { display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.75rem 1rem !important;margin-bottom:1rem; }
.camera-dashboard .camera-led-control strong { display:block;color:var(--camera-navy); }
.camera-dashboard .camera-led-control small { color:var(--camera-slate); }
.camera-dashboard .camera-temperature-panel { display:flex;align-items:center;justify-content:space-between;gap:1rem;padding:.75rem 1rem !important;margin-bottom:1rem; }
.camera-dashboard .camera-temperature-value { font-size:1.65rem;font-weight:900;line-height:1;color:#34d399; }
.camera-dashboard .camera-temperature-value.warm { color:#fbbf24; }
.camera-dashboard .camera-temperature-value.hot { color:#f87171; }
.camera-dashboard .camera-temperature-meta { color:var(--camera-slate);font-size:.82rem;text-align:right; }
.camera-dashboard .camera-status-strip { display:grid;grid-template-columns:minmax(220px,.75fr) minmax(250px,.85fr) minmax(360px,1.4fr);gap:.65rem;margin-bottom:1rem; }
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
.camera-dashboard .camera-boot-grid { display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem; }
.camera-dashboard .camera-boot-step { padding:.8rem;border-radius:8px;background:var(--camera-surface-2); }
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
.camera-dashboard .camera-client-card-status { display:flex;align-items:center;gap:.5rem; }
.camera-dashboard .camera-client-temperature { padding:.28rem .5rem;border-radius:999px;background:#253129;color:#34d399;font-size:.78rem;font-weight:850;white-space:nowrap; }
.camera-dashboard .camera-client-temperature.warm { background:#3a2d0d;color:#fbbf24; }
.camera-dashboard .camera-client-temperature.hot { background:#3b1719;color:#fca5a5; }
.camera-dashboard .camera-client-mac { color:var(--camera-slate);font-size:.78rem;font-family:ui-monospace,SFMono-Regular,monospace; }
.camera-dashboard .camera-assignment-row { display:grid;grid-template-columns:minmax(180px,.7fr) minmax(280px,1.3fr);gap:.8rem;align-items:center;padding:.7rem 0;border-bottom:1px solid var(--camera-border); }
.camera-dashboard .camera-assignment-row:last-child { border-bottom:0; }
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
.camera-dashboard .camera-chart { width: 100%; height: auto; min-height: 170px; display: block; }
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
@media (prefers-color-scheme: light) {
	body.camera-console-active .main-right,
	body.camera-console-active #maincontent,
	body.camera-console-active #maincontent > .container,
	body.camera-console-active #view { background:#f2f2f7 !important; }
	.camera-dashboard {
		--camera-navy:#1c1c1e;
		--camera-slate:#6e6e73;
		--camera-blue:#ff9f0a;
		--camera-teal:#16866d;
		--camera-surface:#ffffff;
		--camera-surface-2:#f7f7fa;
		--camera-border:#d1d1d6;
		color-scheme:light;
	}
	.camera-dashboard .camera-console-bar { background:#fff; box-shadow:0 8px 24px rgba(0,0,0,.06); }
	.camera-dashboard .camera-console-title h2,
	.camera-dashboard h2,
	.camera-dashboard h3,
	.camera-dashboard .cbi-section h2,
	.camera-dashboard .cbi-section h3 { color:#1c1c1e !important; }
	.camera-dashboard .camera-console-subtitle { color:#6e6e73; }
	.camera-dashboard .camera-sidebar-toggle { color:#1c1c1e !important; background:#e9e9ee !important; border-color:#d1d1d6 !important; }
	.camera-dashboard p, .camera-dashboard small, .camera-dashboard td { color:#3a3a3c; }
	.camera-dashboard table { background:#fff; color:#1c1c1e; }
	.camera-dashboard th { color:#6e6e73 !important; background:#f2f2f7 !important; }
	.camera-dashboard table tr,
	.camera-dashboard table tr:nth-child(odd),
	.camera-dashboard table tr:nth-child(even),
	.camera-dashboard .cbi-section-table-row { background:#fff !important; color:#1c1c1e !important; }
	.camera-dashboard table tr:first-child { background:#f2f2f7 !important; }
	.camera-dashboard tbody tr:hover, .camera-dashboard tr.tr:hover { background:#f7f7fa !important; }
	.camera-dashboard .camera-device-tools input { color:#1c1c1e; background:#fff; }
	.camera-dashboard input::placeholder { color:#8e8e93; }
	.camera-dashboard .camera-filter-group { background:#e9e9ee; }
	.camera-dashboard .camera-filter-button { color:#3a3a3c !important; }
	.camera-dashboard .camera-filter-button-active { color:#fff !important; background:#ff9f0a !important; }
	.camera-dashboard .camera-device-details dl { background:#fff; }
	.camera-dashboard .camera-signal-track { background:#e5e5ea; }
	.camera-dashboard .camera-device-details dl,
	.camera-dashboard .camera-device-details dt,
	.camera-dashboard .camera-device-details dd { color:#1c1c1e !important; }
}
@media (display-mode: standalone) {
	.camera-dashboard { padding-bottom: max(1rem, env(safe-area-inset-bottom)); }
	.camera-dashboard .camera-alert { top: max(.75rem, env(safe-area-inset-top)); }
}
@media (max-width: 1024px) {
	.camera-dashboard { font-size: 17px; }
	.camera-dashboard > h2 { font-size: 2rem; }
	.camera-dashboard .cbi-section { border-radius: 18px; }
	.camera-dashboard .cbi-button { min-height: 48px; min-width: 74px; font-size: 1.02rem; }
	.camera-dashboard td, .camera-dashboard th { padding: .85rem .75rem !important; }
	.camera-dashboard .camera-alert { font-size:1.08rem; }
	.camera-dashboard .camera-device-section { padding:1.2rem !important; }
}
@media (max-width: 820px) {
	.camera-dashboard .camera-summary-grid { grid-template-columns: 1.25fr .9fr; }
	.camera-dashboard .camera-status-strip { grid-template-columns:1fr 1fr; }
	.camera-dashboard .camera-status-strip .camera-ap-summary { grid-column:1 / -1; }
	.camera-dashboard .camera-console-bar { gap:.6rem;padding:.65rem .75rem; }
	.camera-dashboard .camera-console-title h2 { font-size:1.15rem;white-space:nowrap; }
	.camera-dashboard .camera-console-title .camera-console-subtitle { display:none; }
	.camera-dashboard .camera-toolbar-actions { gap:.4rem; }
	.camera-dashboard .camera-toolbar-actions .cbi-button { min-width:0;padding:.5rem .7rem; }
}
@media (max-width: 700px) {
	.camera-dashboard { font-size: 16px; }
	.camera-dashboard .cbi-section { padding: .8rem !important; }
	.camera-dashboard .camera-summary-grid { grid-template-columns: 1fr; }
	.camera-dashboard .camera-device-tools input { width:100%; min-width:0; }
	.camera-dashboard .camera-filter-group { width:100%;display:grid;grid-template-columns:1fr 1fr;gap:.35rem; }
	.camera-dashboard .camera-filter-group .cbi-button { min-width:0;width:100%; }
	.camera-dashboard .camera-filter-group .cbi-button:first-child { grid-column:1 / -1; }
	.camera-dashboard .camera-assignment-row { grid-template-columns:1fr; }
	.camera-dashboard .camera-boot-grid { grid-template-columns:1fr; }
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
	.camera-dashboard .camera-table-scroll tr:first-child { display:none !important; }
	.camera-dashboard .camera-table-scroll tr:not(:first-child) {
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
	.camera-dashboard .camera-table-scroll td:nth-child(2) { grid-area:status;justify-self:end; }
	.camera-dashboard .camera-table-scroll td:nth-child(3) { grid-area:name;font-size:1.05rem; }
	.camera-dashboard .camera-table-scroll td:nth-child(4) { grid-area:ip;color:var(--camera-slate) !important;font-family:ui-monospace,SFMono-Regular,monospace; }
	.camera-dashboard .camera-table-scroll td:nth-child(5),
	.camera-dashboard .camera-table-scroll td:nth-child(6) { display:none !important; }
	.camera-dashboard .camera-table-scroll td:nth-child(7) { grid-area:action;margin-top:.35rem; }
	.camera-dashboard .camera-table-scroll td:nth-child(7) .cbi-button { width:100%;min-height:44px; }
	.camera-dashboard .camera-table-scroll .camera-pin { min-width:38px !important;width:38px;min-height:38px;padding:.2rem !important; }
}
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
	try {
		await fs.exec_direct('/usr/sbin/camera-network-leds', [next ? 'on' : 'off']);
		uci.set('camera_network', 'settings', 'leds_enabled', next ? '1' : '0');
		button.className = `cbi-button camera-led-switch ${next ? 'camera-led-switch-on' : 'camera-led-switch-off'}`;
		button.setAttribute('aria-pressed', next ? 'true' : 'false');
		button.replaceChildren(
			E('span', { class:'camera-led-switch-track' }, E('span', { class:'camera-led-switch-knob' })),
			E('span', { class:'camera-led-switch-label' }, next ? t('On') : t('Off'))
		);
		showCameraToast(next ? t('Indicator lights enabled') : t('Indicator lights disabled'));
	} catch (error) {
		showCameraToast(t('Unable to change indicator lights'), true);
	} finally {
		button.disabled = false;
	}
}

function renderLEDControl() {
	const enabled = uci.get('camera_network', 'settings', 'leds_enabled') !== '0';
	const button = E('button', {
		class:`cbi-button camera-led-switch ${enabled ? 'camera-led-switch-on' : 'camera-led-switch-off'}`,
		'aria-pressed':enabled ? 'true' : 'false',
		click:ev => toggleAllLEDs(ev.currentTarget)
	}, [
		E('span', { class:'camera-led-switch-track' }, E('span', { class:'camera-led-switch-knob' })),
		E('span', { class:'camera-led-switch-label' }, enabled ? t('On') : t('Off'))
	]);
	return E('div', { class:'cbi-section camera-led-control camera-config-only' }, [
		E('div', {}, [E('strong', {}, t('Indicator lights')), E('small', {}, enabled ? t('Automatic network indication enabled') : t('All device lights are disabled'))]),
		button
	]);
}

function cameraSection(mac) {
	return `cam_${String(mac || '').replace(/[^A-Fa-f0-9]/g, '').toLowerCase()}`;
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

function clientDisplayName(mac, fallbackToMac) {
	const client = cameraProfile(mac);
	if (client.boundCameraMac) {
		const assigned = cameraProfile(client.boundCameraMac);
		if (assigned.name && String(assigned.name).trim())
			return String(assigned.name).trim();
	}
	if (client.name && String(client.name).trim())
		return String(client.name).trim();
	return fallbackToMac ? String(mac || '').slice(-8) : t('HaLow Client');
}

function showCameraToast(message, error) {
	const old = document.querySelector('.camera-toast');
	if (old) old.remove();
	const toast = E('div', { class:`camera-toast${error ? ' camera-toast-error' : ''}`, role:'status' }, [
		E('span', { class:'camera-toast-message' }, message),
		E('button', { class:'camera-toast-close', title:t('Dismiss'), 'aria-label':t('Dismiss'), click:() => toast.remove() }, '×')
	]);
	document.body.appendChild(toast);
	window.setTimeout(() => toast.remove(), error ? 4500 : 2600);
}

function renderRemoteClientLEDSwitch(mac, online) {
	const section = cameraSection(mac);
	const profile = cameraProfile(mac);
	const enabled = profile.remoteLEDS;
	const ip = profile.lastIP;
	if (!profile.remotePaired) {
		const pair = E('button', { class:'cbi-button', click:async ev => {
			const control=ev.currentTarget; control.disabled=true;
			try {
				await fs.exec_direct('/usr/sbin/camera-network-client-leds', [ip, 'on']);
				uci.set('camera_network', section, 'remote_paired', '1'); await uci.save(); await uci.apply(10);
				showCameraToast(t('Client paired — refreshing'));
			} catch (error) { showCameraToast(t('Pairing failed — authorize this AP on the Client'), true); }
			finally { control.disabled=!ip; }
		} }, t('Pair'));
		if (!ip) pair.disabled=true;
		return E('div', { style:'display:flex;align-items:center;justify-content:space-between;gap:.75rem;border-top:1px solid var(--camera-border);margin-top:.75rem;padding-top:.65rem' }, [
			E('div', {}, [E('strong', { style:'display:block;font-size:.82rem' }, t('Client lights')), E('small', {}, t('Pair required'))]), pair
		]);
	}
	const button = E('button', {
		class:`cbi-button camera-led-switch ${enabled ? 'camera-led-switch-on' : 'camera-led-switch-off'}`,
		'aria-pressed':enabled ? 'true' : 'false',
		click:async ev => {
			const control = ev.currentTarget;
			const next = !cameraProfile(mac).remoteLEDS;
			control.disabled = true;
			try {
				await fs.exec_direct('/usr/sbin/camera-network-client-leds', [ip, next ? 'on' : 'off']);
				uci.set('camera_network', section, 'remote_leds_enabled', next ? '1' : '0');
				await uci.save();
				control.className = `cbi-button camera-led-switch ${next ? 'camera-led-switch-on' : 'camera-led-switch-off'}`;
				control.setAttribute('aria-pressed', next ? 'true' : 'false');
				control.querySelector('.camera-led-switch-label').textContent = next ? t('On') : t('Off');
				showCameraToast(next ? t('Client lights enabled') : t('Client lights disabled'));
			} catch (error) {
				showCameraToast(t('Client control failed — check pairing and connection'), true);
			} finally {
				control.disabled = !ip;
			}
		}
	}, [
		E('span', { class:'camera-led-switch-track' }, E('span', { class:'camera-led-switch-knob' })),
		E('span', { class:'camera-led-switch-label' }, enabled ? t('On') : t('Off'))
	]);
	if (!ip)
		button.disabled = true;
	return E('div', { style:'display:flex;align-items:center;justify-content:space-between;gap:.75rem;border-top:1px solid var(--camera-border);margin-top:.75rem;padding-top:.65rem' }, [
		E('div', {}, [E('strong', { style:'display:block;font-size:.82rem' }, t('Client lights')), E('small', {}, ip || t('Management IP unavailable'))]),
		button
	]);
}

async function bindCameraToClient(clientMac, cameraMac) {
	const section = cameraSection(clientMac);
	if (!uci.get('camera_network', section)) uci.add('camera_network', 'camera', section);
	uci.set('camera_network', section, 'mac', clientMac);
	uci.set('camera_network', section, 'bound_camera_mac', cameraMac || '');
	await uci.save();
	await uci.apply(10);
	showCameraToast(cameraProfile(mac).pinned ? t('Camera pinned') : t('Camera unpinned'));
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
		devices.push({ mac, ip, fallbackName: lease.hostname || hints.getHostnameByMACAddr(mac), source: t('DHCP lease'), online:true });
	}
	for (const [macRaw, hint] of Object.entries(hints.hosts || {})) {
		const mac = macRaw.toUpperCase();
		const ip = (hint.ipaddrs || hint.ipv4 || [])[0];
		if (seen.has(mac) || !ip || selfIPs.has(ip)) continue;
		seen.add(mac);
		devices.push({ mac, ip, fallbackName: hint.name, source: t('Network neighbor'), online:true });
	}
	for (const section of uci.sections('camera_network', 'camera') || []) {
		const mac = String(section.mac || '').toUpperCase();
		const ip = section.last_ip || '';
		if (!mac || !ip || seen.has(mac) || selfIPs.has(ip)) continue;
		devices.push({ mac, ip, fallbackName: section.name, source: t('Saved static device'), online:bridgePorts ? bridgePorts.has(mac) : false });
	}
	return devices;
}

async function toggleCameraPin(mac, ip) {
	const section = cameraSection(mac);
	const profile = cameraProfile(mac);
	if (!uci.get('camera_network', section))
		uci.add('camera_network', 'camera', section);
	uci.set('camera_network', section, 'mac', mac);
	uci.set('camera_network', section, 'last_ip', ip);
	uci.set('camera_network', section, 'pinned', profile.pinned ? '0' : '1');
	await uci.save();
	await uci.apply(10);
}

async function editCameraProfile(mac, ip, fallbackName) {
	const current = cameraProfile(mac);
	const name = window.prompt(t('Camera name'), current.name || fallbackName || '');
	if (name === null)
		return;
	const note = window.prompt(t('Note / position'), current.note || '');
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
	showCameraToast(t('Camera profile saved'));
}

async function hideCameraDevice(mac, ip) {
	const section = cameraSection(mac);
	if (!uci.get('camera_network', section)) uci.add('camera_network', 'camera', section);
	uci.set('camera_network', section, 'mac', mac);
	uci.set('camera_network', section, 'last_ip', ip || '');
	uci.set('camera_network', section, 'hidden', '1');
	await uci.save();
	await uci.apply(10);
	showCameraToast(t('Device hidden'));
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
	let label = t('No signal');
	let color = '#777';
	if (percent >= 75) {
		label = t('Excellent');
		color = '#179447';
	} else if (percent >= 50) {
		label = t('Good');
		color = '#65a30d';
	} else if (percent >= 25) {
		label = t('Weak');
		color = '#e89a16';
	} else if (percent > 0) {
		label = t('Very weak');
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
			E('span', {}, peer && Number.isFinite(m.noise) ? `${t('Noise')} ${m.noise} dBm` : `${t('Noise')} —`)
		])
	]);
}

function renderHalowClients(peers, clientTemperatures) {
	if (!peers.length)
		return E('div', { class: 'cbi-section camera-device-section' }, [
			E('h3', {}, t('HaLow clients')),
			E('p', {}, E('em', {}, t('Waiting for clients to connect…')))
		]);
	return E('div', { class: 'cbi-section camera-device-section' }, [
		E('div', { class: 'camera-section-heading', style: 'display:flex;justify-content:space-between;align-items:center;gap:1rem' }, [
			E('h3', {}, t('HaLow clients')),
			E('strong', {}, t('%d connected').format(peers.filter(peer => peer._online !== false).length))
		]),
		E('div', { class: 'camera-client-grid' }, peers.map(peer => {
			const mac = String(peer.mac || peer.bssid || '—').toUpperCase();
			const profile = cameraProfile(mac);
			const online = peer._online !== false;
			const metrics = signalMetrics(online ? peer.signal : null, online ? peer.noise : null);
			const outages = apOutages.get(mac) || [];
			const latestRecovery = outages.length ? outages[outages.length - 1].duration : null;
			const thermal = clientTemperatures[mac] || {};
			const temperature = Number(thermal.temperature);
			const hasTemperature = online && Number.isFinite(temperature);
			const temperatureClass = temperature >= 85 ? ' hot' : temperature >= 75 ? ' warm' : '';
			return E('div', { class: 'cbi-section camera-client-card', style:online ? '' : 'border-left-color:#d33b32 !important' }, [
				E('div', { class: 'camera-client-card-header' }, [
					E('div', {}, [
						E('strong', {}, clientDisplayName(mac, false)),
						E('div', { class: 'camera-client-mac' }, mac)
					]),
					E('div', { class:'camera-client-card-status' }, [
						E('span', { class:`camera-client-temperature${temperatureClass}`, title:t('Remote HaLow chip temperature') }, hasTemperature ? `${temperature}°C` : 'Temp —'),
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
					E('div', {}, [E('small', {}, online ? t('Online') : t('Last session')), E('strong', { style:'display:block' }, formatDuration(peer.connected_time || 0))]),
					E('div', {}, [E('small', {}, t('Dropouts')), E('strong', { style:'display:block' }, String(outages.length))]),
					E('div', {}, [E('small', {}, t('Last recovery')), E('strong', { style:'display:block' }, latestRecovery === null ? '—' : formatDuration(latestRecovery / 1000))])
				]),
				renderRemoteClientLEDSwitch(mac, online)
			]);
		}))
	]);
}

function renderRemoteTemperatureAlert(clientTemperatures) {
	const warnings = [];
	let critical = false;
	for (const [mac, thermal] of Object.entries(clientTemperatures || {})) {
		const temperature = Number(thermal.temperature);
		const mitigation = Number(thermal.thermalMitigation) || 0;
		if ((!Number.isFinite(temperature) || temperature < 75) && mitigation < 1)
			continue;
		const name = clientDisplayName(mac, true);
		if (temperature >= 85) critical = true;
		warnings.push(`${name}: ${Number.isFinite(temperature) ? `${temperature}°C` : t('temperature unavailable')}${mitigation > 0 ? ` · ${t('thermal protection')} ${mitigation}` : ''}`);
	}
	if (!warnings.length) {
		dismissedAlerts.delete('remote-temperature-high');
		return E([]);
	}
	return dismissibleAlert('remote-temperature-high', critical ? 'camera-alert-danger' : 'camera-alert-warning', `▲ ${t('Client temperature alert')} · ${warnings.join(' · ')}`);
}

function dismissibleAlert(key, className, message) {
	if (dismissedAlerts.has(key)) return E([]);
	const alert = E('div', { class:`camera-alert ${className}` }, [
		E('span', { class:'camera-alert-message' }, message),
		E('button', { class:'camera-alert-close', title:t('Dismiss'), 'aria-label':t('Dismiss'), click:() => { dismissedAlerts.add(key); alert.remove(); } }, '×')
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
		details.push(`${t('thermal mitigation events')}: ${mitigation}`);
	return dismissibleAlert(
		'temperature-high',
		critical || emergency ? 'camera-alert-danger' : 'camera-alert-warning',
		`${critical ? '●' : '▲'} ${emergency ? t('Emergency chip temperature') : critical ? t('Critical chip temperature') : t('High chip temperature')}: ${details.join(' · ')}`
	);
}

function renderTemperaturePanel(temperature, thermalMitigation) {
	const value = Number(temperature);
	const available = Number.isFinite(value);
	const mitigation = Number(thermalMitigation) || 0;
	const warm = available && value >= 75 && value < 85;
	const hot = available && value >= 85;
	const emergency = available && value >= 95;
	const status = !available ? t('Waiting for sensor…')
		: emergency ? t('Emergency — reduce load immediately')
		: hot ? t('Critical temperature')
		: warm ? t('Elevated temperature')
		: t('Temperature normal');
	return E('div', { class:'cbi-section camera-temperature-panel' }, [
		E('div', {}, [
			E('strong', {}, t('HaLow chip temperature')),
			E('small', { style:'display:block;margin-top:.2rem' }, status)
		]),
		E('div', {}, [
			E('div', { class:`camera-temperature-value${hot ? ' hot' : warm ? ' warm' : ''}` }, available ? `${value}°C` : '—'),
			E('div', { class:'camera-temperature-meta' }, mitigation > 0
				? `${t('Thermal protection')}: ${mitigation}`
				: t('Warning 75°C · Critical 85°C'))
		])
	]);
}

function renderAPSummary(state) {
	const healthy = state.halow.peers.length && state.halow.peers.every(peer => Number(peer.signal) >= -75);
	return E('div', { class:'cbi-section camera-ap-summary' }, [
		E('div', { class:'camera-ap-summary-main' }, [
			E('h3', { style:'margin:0' }, t('HaLow access point')),
			E('div', { class:'camera-ap-health', style:`color:${healthy ? '#16a078' : '#f59e0b'}` }, healthy ? t('Healthy') : t('Attention'))
		]),
		E('div', { class:'camera-ap-meta' }, `${state.halow.peers.length === 1 ? t('1 client') : t('%d clients').format(state.halow.peers.length)} · ${uci.get('wireless', 'default_radio1', 'ssid') || '—'} · ${t('Channel')} ${uci.get('wireless', 'radio1', 'channel') || '—'}`)
	]);
}

function renderAPAlerts(peers) {
	const alerts = [];
	for (const peer of peers || []) {
		const mac = String(peer.mac || peer.bssid || '').toUpperCase();
		const name = clientDisplayName(mac, true);
		const signal = Number(peer.signal), noise = Number(peer.noise);
		const snr = Number.isFinite(signal) && Number.isFinite(noise) ? signal - noise : null;
		const outages = apOutages.get(mac) || [];
		const latest = outages.length ? outages[outages.length - 1] : null;
		if (signal < -75) alerts.push(`${name}: ${t('weak signal')} ${signal} dBm`);
		else if (snr !== null && snr < 15) alerts.push(`${name}: ${t('low SNR')} ${snr} dB`);
		if (outages.length >= 3) alerts.push(`${name}: ${t('frequent dropouts')} (${outages.length})`);
		if (latest && latest.duration > 15000) alerts.push(`${name}: ${t('slow recovery')} ${Math.round(latest.duration / 1000)}s`);
	}
	for (const [mac, state] of apClientStates.entries()) {
		if (!state.connected) {
			alerts.push(`${clientDisplayName(mac, true)}: ${t('disconnected')}`);
		}
	}
	if (!alerts.length) { dismissedAlerts.delete('ap-network'); return E([]); }
	return dismissibleAlert('ap-network', 'camera-alert-warning', `▲ ${alerts.join(' · ')}`);
}

function renderReadiness(peers, devices) {
	const clientMacs = new Set((peers || []).map(peer => String(peer.mac || peer.bssid || '').toUpperCase()));
	const saved = (uci.sections('camera_network', 'camera') || []).filter(section => section.pinned === '1' && !clientMacs.has(String(section.mac || '').toUpperCase()));
	const visible = new Set(devices.filter(device => device.online).map(device => device.mac));
	const missing = saved.filter(section => section.mac && !visible.has(String(section.mac).toUpperCase()));
	const ready = peers.length > 0 && saved.length > 0 && missing.length === 0;
	const clientText = peers.length === 1 ? t('1 HaLow client') : t('%d HaLow clients').format(peers.length);
	const cameraText = saved.length === 1 ? t('1 camera') : t('%d cameras').format(saved.length);
	let detail = ready ? t('%s and %s online').format(clientText, cameraText)
		: !peers.length ? t('No HaLow client connected')
		: !saved.length ? t('Pin at least one camera below')
		: missing.length === 1 ? t('1 pinned camera offline') : t('%d pinned cameras offline').format(missing.length);
	return E('div', { class:`camera-ready-banner ${ready ? 'camera-ready-yes' : 'camera-ready-no'}` }, [
		E('div', {}, [E('div', { class:'camera-ready-word', style:`color:${ready ? '#34d399' : '#fbbf24'}` }, ready ? 'READY' : 'NOT READY'), E('small', {}, detail)]),
		E('strong', {}, ready ? t('Ready to shoot') : t('Check network'))
	]);
}

function renderBootRecovery(boot) {
	const value = seconds => Number.isFinite(Number(seconds)) ? formatDuration(Number(seconds)) : t('Waiting…');
	return E('div', { class:'cbi-section camera-device-section' }, [
		E('h3', {}, t('Power-on recovery — this boot')),
		E('div', { class:'camera-boot-grid' }, [
			E('div', { class:'camera-boot-step' }, [E('small', {}, t('AP monitor ready')), E('strong', { style:'display:block;font-size:1.25rem' }, value(boot.ap))]),
			E('div', { class:'camera-boot-step' }, [E('small', {}, t('First HaLow client')), E('strong', { style:'display:block;font-size:1.25rem' }, value(boot.client))]),
			E('div', { class:'camera-boot-step' }, [E('small', {}, t('First pinned camera')), E('strong', { style:'display:block;font-size:1.25rem' }, value(boot.camera))])
		]),
		E('small', { style:'display:block;opacity:.65;margin-top:.55rem' }, t('Measured continuously by the AP, even when this page is closed.'))
	]);
}

function renderCameraAssignments(peers, devices, bridgePorts) {
	const clientMacs = new Set((peers || []).map(peer => String(peer.mac || peer.bssid || '').toUpperCase()));
	const pinned = devices.filter(device => cameraProfile(device.mac).pinned && !clientMacs.has(device.mac));
	return E('div', { class:'cbi-section camera-device-section camera-config-only' }, [
		E('div', { class:'camera-section-heading' }, [
			E('h3', {}, t('Client → camera connections')),
			E('small', { style:'display:block;opacity:.7;margin-top:.35rem' }, t('Pinned cameras on the same HaLow bridge port are matched automatically.'))
		]),
		...(peers || []).map(peer => {
			const clientMac = String(peer.mac || peer.bssid || '').toUpperCase();
			const clientProfile = cameraProfile(clientMac);
			const clientPort = bridgePorts.get(clientMac);
			const automatic = pinned.filter(device => device.mac !== clientMac && clientPort && bridgePorts.get(device.mac) === clientPort);
			const chosenMac = clientProfile.boundCameraMac || (automatic.length === 1 ? automatic[0].mac : '');
			const chosen = devices.find(device => device.mac === chosenMac);
			const select = E('select', { class:'cbi-input-select', value:chosenMac, change:ev => bindCameraToClient(clientMac, ev.currentTarget.value) }, [
				E('option', { value:'' }, automatic.length > 1 ? t('Choose camera') : t('No camera detected')),
				...pinned.filter(device => device.mac !== clientMac).map(device => {
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
				E('div', {}, [E('strong', {}, clientProfile.name || t('HaLow Client')), E('small', { class:'camera-client-mac', style:'display:block' }, clientMac)]),
				E('div', {}, [
					chosen ? E('div', { style:'font-weight:750;margin-bottom:.35rem' }, `→ ${cameraProfile(chosen.mac).name || chosen.fallbackName || t('Camera')} · ${chosen.ip || '—'}`) : '',
					select,
					E('small', { style:'display:block;opacity:.65;margin-top:.3rem' }, clientProfile.boundCameraMac ? t('Manual selection') : automatic.length === 1 ? t('Automatically detected') : t('Pin the camera below, then select it here.'))
				])
			]);
		})
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
	}, cameras };
	const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type:'application/json' }));
	const link = E('a', { href:url, download:`halow-camera-config-${new Date().toISOString().slice(0,10)}.json` });
	document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
	showCameraToast(t('Configuration exported'));
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
				if (!window.confirm(t('Merge %d saved device profiles into this controller?').format(payload.cameras.length))) return;
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
				await uci.save(); await uci.apply(10);
				showCameraToast(t('Configuration restored — refreshing'));
				window.setTimeout(() => window.location.reload(), 700);
			} catch (error) { showCameraToast(t('Invalid configuration file'), true); }
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
	if (signalSamples.length > MAX_SIGNAL_SAMPLES)
		signalSamples.splice(0, signalSamples.length - MAX_SIGNAL_SAMPLES);
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
			if (samples.length > MAX_SIGNAL_SAMPLES)
				samples.splice(0, samples.length - MAX_SIGNAL_SAMPLES);
			apSignalSamples.set(mac, samples);
		}
	}
	for (const peer of peers || []) {
		const mac = String(peer.mac || peer.bssid || '').toUpperCase();
		const signal = Number(peer.signal);
		const noise = Number(peer.noise);
		if (!mac || !Number.isFinite(signal))
			continue;
		apKnownPeers.set(mac, { ...peer, _online:true });
		const state = apClientStates.get(mac);
		if (state && !state.connected && state.disconnectedAt) {
			if (!apOutages.has(mac))
				apOutages.set(mac, []);
			apOutages.get(mac).push({ start: state.disconnectedAt, end: now, duration: now - state.disconnectedAt });
		}
		apClientStates.set(mac, { connected: true, disconnectedAt: null });
		if (!apSignalSamples.has(mac))
			apSignalSamples.set(mac, []);
		const samples = apSignalSamples.get(mac);
		samples.push({ time: now, signal, snr: Number.isFinite(noise) ? signal - noise : null });
		if (samples.length > MAX_SIGNAL_SAMPLES)
			samples.splice(0, samples.length - MAX_SIGNAL_SAMPLES);
	}
	for (const [mac, peer] of apKnownPeers.entries())
		if (!connected.has(mac))
			apKnownPeers.set(mac, { ...peer, signal:null, noise:null, _online:false });
}

function APDisplayPeers(currentPeers) {
	for (const peer of currentPeers || []) {
		const mac = String(peer.mac || peer.bssid || '').toUpperCase();
		if (mac) apKnownPeers.set(mac, { ...peer, _online:true });
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
	const checked = await Promise.all((peers || []).map(async peer => {
		const inactive = Number(peer.inactive);
		const mac = String(peer.mac || peer.bssid || '').toUpperCase();
		const markOffline = () => {
			apKnownPeers.set(mac, { ...peer, signal:null, noise:null, _online:false });
			if (!apClientStates.has(mac))
				apClientStates.set(mac, { connected:false, disconnectedAt:Date.now() });
			return null;
		};
		if (stationStates.get(mac) === false)
			return markOffline();
		const managementIP = cameraProfile(mac).lastIP;
		if (managementIP) try {
			const probe = await promiseTimeout(fs.exec_direct('/bin/ping', ['-c', '1', '-W', '1', managementIP]), null, 1300);
			// LuCI's CGI exec request may resolve successfully even when ping exits
			// non-zero. Only an actual ICMP reply proves that the client is live.
			const replied = typeof probe === 'string' && /(?:bytes from|1 packets received|1 received)/i.test(probe);
			return replied ? peer : markOffline();
		} catch (error) {
			return markOffline();
		}
		if (stationStates.get(mac) === true || !Number.isFinite(inactive) || inactive < 5000)
			return peer;
		return markOffline();
	}));
	for (const [mac, online] of stationStates.entries()) {
		if (!online && !(peers || []).some(peer => String(peer.mac || peer.bssid || '').toUpperCase() === mac)) {
			const previous = apKnownPeers.get(mac) || { mac };
			apKnownPeers.set(mac, { ...previous, signal:null, noise:null, _online:false });
			if (!apClientStates.has(mac))
				apClientStates.set(mac, { connected:false, disconnectedAt:Date.now() });
		}
	}
	return checked.filter(Boolean);
}

function drawAPChart(canvas) {
	const ctx = canvas.getContext('2d');
	const ratio = Number(canvas.dataset.pixelRatio) || 1;
	const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
	const colors = ['#16a078', '#3b82f6', '#f59e0b', '#e879f9', '#ef4444', '#84cc16'];
	ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
	ctx.clearRect(0, 0, 600, 180);
	ctx.strokeStyle = dark ? '#303640' : '#d1d1d6';
	ctx.fillStyle = dark ? '#9ca3af' : '#64748b';
	ctx.font = '12px -apple-system,sans-serif';
	for (const [value, y] of [[-30, 28], [-50, 65], [-70, 103], [-90, 140]]) {
		ctx.beginPath(); ctx.moveTo(45, y); ctx.lineTo(585, y); ctx.stroke();
		ctx.fillText(String(value), 5, y + 4);
	}
	ctx.fillText('5 min ago', 45, 168);
	ctx.fillText('now', 557, 168);
	const now = Date.now();
	Array.from(apSignalSamples.entries()).forEach(([mac, samples], seriesIndex) => {
		const color = colors[seriesIndex % colors.length];
		for (const outage of apOutages.get(mac) || []) {
			if (outage.end < now - 300000)
				continue;
			const x1 = 585 - (Math.max(0, Math.min(300000, now - outage.start)) / 300000) * 540;
			const x2 = 585 - (Math.max(0, Math.min(300000, now - outage.end)) / 300000) * 540;
			ctx.fillStyle = `${color}24`;
			ctx.fillRect(Math.min(x1, x2), 28, Math.max(3, Math.abs(x2 - x1)), 112);
			ctx.fillStyle = color;
			ctx.font = 'bold 11px -apple-system,sans-serif';
			ctx.fillText(`${Math.max(1, Math.round(outage.duration / 1000))}s`, Math.min(x1, x2) + 3, 42 + seriesIndex * 14);
		}
		ctx.beginPath();
		ctx.strokeStyle = color;
		ctx.lineWidth = 3;
		ctx.lineCap = 'round'; ctx.lineJoin = 'round';
		let started = false;
		for (const sample of samples) {
			if (sample.signal === null || sample.signal === undefined || sample.signal === '' || !Number.isFinite(Number(sample.signal))) {
				started = false;
				continue;
			}
			const age = Math.max(0, Math.min(300000, now - sample.time));
			const x = 585 - (age / 300000) * 540;
			const y = 140 - Math.max(0, Math.min(1, (sample.signal + 100) / 70)) * 112;
			if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
		}
		ctx.stroke();
	});
}

function renderAPSignalHistory() {
	const ratio = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
	const canvas = E('canvas', { class: 'camera-chart', width: Math.round(600 * ratio), height: Math.round(180 * ratio), 'data-pixel-ratio': ratio });
	const entries = Array.from(apSignalSamples.entries());
	const ready = entries.some(entry => entry[1].length >= 2);
	if (ready)
		window.requestAnimationFrame(() => drawAPChart(canvas));
	const colors = ['#16a078', '#3b82f6', '#f59e0b', '#e879f9', '#ef4444', '#84cc16'];
	return E('div', { class: 'cbi-section', style: 'padding:1rem' }, [
		E('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap' }, [
			E('h3', {}, t('Client signal history — last 5 minutes')),
			E('div', { style: 'display:flex;gap:.8rem;flex-wrap:wrap;font-size:.82rem;font-weight:700' }, entries.map((entry, index) => {
				const profile = cameraProfile(entry[0]);
				return E('span', { style: `color:${colors[index % colors.length]}` }, `● ${profile.name || entry[0].slice(-8)}`);
			}))
		]),
		ready ? canvas : E('p', {}, E('em', {}, t('Collecting samples… the curve appears after two refreshes.'))),
		E('small', { class:'camera-chart-note', style: 'display:block;opacity:.7;margin-top:.5rem' }, t('Shaded gaps mark signal loss. The number shows how long reconnection took.'))
	]);
}

function drawChart(canvas) {
	const ctx = canvas.getContext('2d');
	const pixelRatio = Number(canvas.dataset.pixelRatio) || 1;
	const darkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
	ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
	ctx.clearRect(0, 0, 600, 165);
	ctx.strokeStyle = darkMode ? '#303640' : '#dbe3ed';
	ctx.lineWidth = 1;
	for (const y of [30, 85, 140]) {
		ctx.beginPath();
		ctx.moveTo(45, y);
		ctx.lineTo(580, y);
		ctx.stroke();
	}
	ctx.fillStyle = darkMode ? '#9ca3af' : '#64748b';
	ctx.font = '12px sans-serif';
	ctx.fillText('-30', 4, 35);
	ctx.fillText('-65', 4, 90);
	ctx.fillText('-100', 4, 145);
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
			const x = 45 + index * (535 / Math.max(1, signalSamples.length - 1));
			const y = 140 - Math.max(0, Math.min(1, (value - min) / (max - min))) * 110;
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
	const pixelRatio = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
	const canvas = E('canvas', {
		class: 'camera-chart',
		width: Math.round(600 * pixelRatio),
		height: Math.round(165 * pixelRatio),
		'data-pixel-ratio': pixelRatio
	});
	if (signalSamples.length >= 2)
		window.requestAnimationFrame(() => drawChart(canvas));
	return E('div', { class: 'cbi-section', style: 'padding:1rem' }, [
		E('div', { style: 'display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap' }, [
			E('h3', {}, t('Signal history — last 5 minutes')),
			E('div', { style: 'display:flex;gap:1rem;font-size:.9rem;font-weight:700' }, [
				E('span', { style: 'color:#0f766e' }, '● Signal dBm'),
				E('span', { style: 'color:#2563eb' }, '● SNR dB')
			])
		]),
		signalSamples.length < 2
			? E('p', {}, E('em', {}, t('Collecting samples…')))
			: canvas
	]);
}

function renderLinkAlert(peer) {
	if (!peer) {
		dismissedAlerts.delete('client-weak'); dismissedAlerts.delete('client-snr');
		return dismissibleAlert('client-disconnected', 'camera-alert-danger', `● ${t('HaLow link is disconnected')}`);
	}
	dismissedAlerts.delete('client-disconnected');
	const signal = Number(peer.signal);
	const noise = Number(peer.noise);
	const snr = Number.isFinite(signal) && Number.isFinite(noise) ? signal - noise : null;
	if (signal < -75) {
		dismissedAlerts.delete('client-snr');
		return dismissibleAlert('client-weak', 'camera-alert-warning', `▲ ${t('Weak HaLow signal: %d dBm').format(signal)}`);
	}
	dismissedAlerts.delete('client-weak');
	if (snr !== null && snr < 15)
		return dismissibleAlert('client-snr', 'camera-alert-warning', `▲ ${t('Low signal-to-noise ratio: %d dB').format(snr)}`);
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
		return dismissibleAlert('saved-offline', 'camera-alert-danger', `● ${missing.length === 1 ? t('1 saved camera is offline') : t('%d saved cameras are offline').format(missing.length)}`);
	dismissedAlerts.delete('saved-offline');
	const failed = Array.from(latencyResults.values()).filter(result => result.text === t('No reply')).length;
	if (failed)
		return dismissibleAlert('latency-failed', 'camera-alert-warning', `▲ ${t('%d device(s) did not reply to the latency test').format(failed)}`);
	dismissedAlerts.delete('latency-failed');
	return null;
}

function formatDuration(seconds) {
	const value = Math.max(0, Math.round(Number(seconds) || 0));
	if (value < 60)
		return t('%d seconds').format(value);
	return t('%d min %d sec').format(Math.floor(value / 60), value % 60);
}

function parseLinkHistory(text) {
	const events = [];
	let bootLinkSeconds = null;
	for (const line of String(text || '').split('\n')) {
		let type = null;
		let detail = null;
		if (/CTRL-EVENT-CONNECTED/.test(line)) {
			type = 'connected';
			detail = t('HaLow link connected');
		} else if (/CTRL-EVENT-DISCONNECTED|wlan0.*link is down/i.test(line)) {
			type = 'disconnected';
			detail = t('HaLow link disconnected');
		} else if (/Trying to authenticate/.test(line)) {
			type = 'auth';
			detail = t('Authentication started');
		} else if (/Successfully initialized wpa_supplicant/.test(line)) {
			type = 'init';
			detail = t('HaLow client initialized');
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
		return E('p', {}, E('em', {}, t('No connection events recorded in this boot.')));
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
	}, online ? t('Online') : t('Offline'));
}

async function testLatency(ip, output, button) {
	button.disabled = true;
	button.classList.add('spinning');
	output.textContent = t('Testing…');
	try {
		const text = await fs.exec_direct('/bin/ping', ['-c', '1', '-W', '1', ip]);
		const replied = typeof text === 'string' && /(?:bytes from|1 packets received|1 received)/i.test(text);
		if (!replied)
			throw new Error('No ICMP reply');
		const match = text.match(/time[=<]([0-9.]+)\s*ms/i);
		const result = match ? `${match[1]} ms` : t('Reachable');
		latencyResults.set(ip, { text: result, color: '#179447' });
		output.textContent = result;
		output.style.color = '#179447';
	} catch (e) {
		latencyResults.set(ip, { text: t('No reply'), color: '#d33b32' });
		output.textContent = t('No reply');
		output.style.color = '#d33b32';
	} finally {
		button.disabled = false;
		button.classList.remove('spinning');
	}
}

function latencyControl(ip) {
	const previous = latencyResults.get(ip);
	const output = E('strong', { style: `display:inline-block;min-width:5rem;color:${previous ? previous.color : 'inherit'}` }, previous ? previous.text : '—');
	const button = E('button', {
		class: 'cbi-button cbi-button-action cbi-button-inline',
		click: (ev) => testLatency(ip, output, ev.currentTarget)
	}, t('Test'));
	return E('div', { style: 'display:flex;align-items:center;gap:.5rem;white-space:nowrap' }, [output, button]);
}

function deviceDetails(mac, source) {
	const attrs = {
		class: 'camera-device-details',
		toggle: (ev) => {
			if (ev.currentTarget.open)
				openDeviceDetails.add(mac);
			else
				openDeviceDetails.delete(mac);
		}
	};
	if (openDeviceDetails.has(mac))
		attrs.open = '';
	return E('details', attrs, [
		E('summary', {}, t('Details')),
		E('dl', {}, [
			E('dt', {}, t('MAC address')),
			E('dd', {}, valueOrDash(mac)),
			E('dt', {}, t('Source')),
			E('dd', {}, source)
		])
	]);
}

function renderDeviceTable(leases, hints, selfIPs, bridgePorts) {
	const devices = discoveredDevices(leases, hints, selfIPs, bridgePorts);
	const tableHost = E('div', { class: 'camera-device-card-grid' });
	const renderRows = () => {
		const query = deviceView.query.trim().toLowerCase();
		const visible = devices.map(device => ({ ...device, profile: cameraProfile(device.mac) }))
			.filter(device => deviceView.filter === 'hidden' ? device.profile.hidden : !device.profile.hidden)
			.filter(device => deviceView.filter !== 'pinned' || device.profile.pinned)
			.filter(device => !query || [device.profile.name, device.fallbackName, device.profile.note, device.ip, device.mac]
				.some(value => String(value || '').toLowerCase().includes(query)))
			.sort((a, b) => Number(b.profile.pinned) - Number(a.profile.pinned));
		const cards = visible.map(device => {
			const tested = latencyResults.get(device.ip);
			const effectiveOnline = tested ? tested.text !== t('No reply') : device.online;
			return E('div', { class:'cbi-section camera-device-card' }, [
			E('div', { class:'camera-device-card-head' }, [
				E('button', {
				class: `cbi-button camera-pin${device.profile.pinned ? ' camera-pin-active' : ''}`,
				title: device.profile.pinned ? t('Unpin camera') : t('Pin camera'),
				click: async () => { await toggleCameraPin(device.mac, device.ip); updateFilterButtons(); renderRows(); }
				}, device.profile.pinned ? '★' : '☆'),
				E('a', { class:'camera-device-card-name', href:`http://${device.ip}/`, target:'_blank', rel:'noopener' }, valueOrDash(device.profile.name || device.fallbackName)),
				statusBadge(effectiveOnline)
			]),
			E('div', { class:'camera-device-card-ip' }, valueOrDash(device.ip)),
			device.profile.note ? E('small', { style:'display:block;margin-bottom:.5rem' }, device.profile.note) : '',
			E('div', { class:'camera-device-card-actions' }, [
				latencyControl(device.ip),
				deviceDetails(device.mac, device.source),
				E('button', { class:'cbi-button cbi-button-edit', click:() => editCameraProfile(device.mac, device.ip, device.fallbackName) }, t('Edit')),
				deviceView.filter === 'hidden'
					? E('button', { class:'cbi-button', click:async() => { const section=cameraSection(device.mac); uci.set('camera_network', section, 'hidden', '0'); await uci.save(); await uci.apply(10); showCameraToast(t('Device restored')); updateFilterButtons(); renderRows(); } }, t('Restore'))
					: E('button', { class:'cbi-button', click:async() => { await hideCameraDevice(device.mac, device.ip); updateFilterButtons(); renderRows(); } }, t('Hide'))
			])
		]);
		});
		tableHost.replaceChildren(...(cards.length ? cards : [E('p', {}, E('em', {}, t('No matching devices.')))]));
	};
	const search = E('input', {
		type: 'search',
		placeholder: t('Search name, IP or MAC'),
		value: deviceView.query,
		input: (ev) => { deviceView.query = ev.currentTarget.value; renderRows(); }
	});
	const filterGroup = E('div', { class: 'camera-filter-group' });
	const updateFilterButtons = () => {
		const pinnedCount = devices.filter(device => cameraProfile(device.mac).pinned && !cameraProfile(device.mac).hidden).length;
		const visibleCount = devices.filter(device => !cameraProfile(device.mac).hidden).length;
		const hiddenCount = devices.length - visibleCount;
		filterGroup.replaceChildren(
			E('button', {
				class: `cbi-button camera-filter-button${deviceView.filter === 'all' ? ' camera-filter-button-active' : ''}`,
				click: () => { deviceView.filter = 'all'; updateFilterButtons(); renderRows(); }
			}, `${t('All devices')} (${visibleCount})`),
			E('button', {
				class: `cbi-button camera-filter-button${deviceView.filter === 'pinned' ? ' camera-filter-button-active' : ''}`,
				click: () => { deviceView.filter = 'pinned'; updateFilterButtons(); renderRows(); }
			}, `${t('Pinned only')} (${pinnedCount})`),
			E('button', {
				class:`cbi-button camera-filter-button${deviceView.filter === 'hidden' ? ' camera-filter-button-active' : ''}`,
				click:() => { deviceView.filter='hidden'; updateFilterButtons(); renderRows(); }
			}, `${t('Hidden')} (${hiddenCount})`)
		);
	};
	updateFilterButtons();
	renderRows();
	return E('div', {}, [E('div', { class: 'camera-device-tools' }, [search, filterGroup]), tableHost]);
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
		let interactionHoldUntil = 0;
		let deviceScrollLeft = 0;
		root.addEventListener('touchstart', () => { interactionHoldUntil = Date.now() + 1500; }, { passive:true });
		root.addEventListener('touchmove', () => { interactionHoldUntil = Date.now() + 1500; }, { passive:true });
		root.addEventListener('touchend', () => { interactionHoldUntil = Date.now() + 800; }, { passive:true });
		root.addEventListener('touchcancel', () => { interactionHoldUntil = Date.now() + 500; }, { passive:true });
		root.classList.toggle('camera-monitor-mode', window.localStorage.getItem('cameraMonitorMode') === '1');
		const renderData = (state) => {
			const peer = state.halow && state.halow.peer;
			const isAP = state.halow && state.halow.role === 'ap';
			const displayPeers = isAP ? APDisplayPeers(state.halow.peers) : [];
			const devices = discoveredDevices(state.leases, state.hints, state.selfIPs, state.bridgePorts);
			if (isAP)
				recordAPSignalSamples(state.halow.peers);
			else
				recordSignalSample(peer);
			const linkAlert = isAP ? renderAPAlerts(state.halow.peers) : (renderLinkAlert(peer) || E([]));
			const deviceAlert = renderDeviceAlert(state.leases, state.hints) || E([]);
			const temperatureAlert = renderTemperatureAlert(state.boot.temperature, state.boot.thermalMitigation);
			const remoteTemperatureAlert = isAP ? renderRemoteTemperatureAlert(state.boot.clientTemperatures) : E([]);
			const uptime = Number(state.systemInfo && state.systemInfo.uptime) || 0;
			const connectedTime = peer && Number(peer.connected_time);
			const acquisitionTime = state.linkHistory.bootLinkSeconds !== null
				? state.linkHistory.bootLinkSeconds
				: (Number.isFinite(connectedTime) ? Math.max(0, uptime - connectedTime) : null);
			const activeControl = document.activeElement;
			const preserveInteraction = (root.contains(activeControl) && /^(INPUT|SELECT|TEXTAREA)$/.test(activeControl.tagName)) || Date.now() < interactionHoldUntil;
			const statusStrip = E('div', { class:`camera-status-strip${isAP ? '' : ' camera-status-strip-client'}` }, [
				renderLEDControl(),
				renderTemperaturePanel(state.boot.temperature, state.boot.thermalMitigation),
				isAP ? renderAPSummary(state) : E([])
			]);
			const roleOverview = isAP
				? E([], [
					renderHalowClients(displayPeers, state.boot.clientTemperatures || {}),
					renderAPSignalHistory(),
					renderCameraAssignments(state.halow.peers, devices, state.bridgePorts)
				])
				: E([], [
					E('div', { class: 'camera-summary-grid' }, [
						E('div', { class: 'cbi-section camera-summary-card' }, [
							E('h3', {}, t('HaLow link')),
							E('p', {}, peer ? statusBadge(true) : statusBadge(false)),
							renderSignalGauge(peer),
							E('p', {}, peer && peer.connected_time !== undefined ? t('Connected for %d seconds').format(peer.connected_time) : '')
						]),
						E('div', { class: 'cbi-section camera-summary-card' }, [
							E('h3', {}, t('This boot')),
							E('div', { class: 'camera-boot-time', style: `color:${acquisitionTime !== null && acquisitionTime <= 20 ? '#179447' : '#2563a8'}` }, acquisitionTime === null ? '—' : formatDuration(acquisitionTime)),
							E('p', { style: 'font-weight:700' }, t('Power-on → HaLow ready')),
							E('p', { style: 'opacity:.7;font-size:.9rem' }, t('Uptime: %s').format(formatDuration(uptime)))
						])
					]),
					renderSignalHistory()
				]);
			if (preserveInteraction)
				return;
			const oldDeviceScroll = root.querySelector('.camera-table-scroll');
			if (oldDeviceScroll)
				deviceScrollLeft = oldDeviceScroll.scrollLeft;
			const pageScrollY = window.scrollY;
			root.replaceChildren(
				E('style', {}, dashboardStyles),
				E('div', { class: 'camera-console-bar' }, [
					E('button', { class: 'cbi-button camera-sidebar-toggle', title: t('Open or close sidebar'), click: toggleSidebar }, '☰'),
					E('div', { class: 'camera-console-title' }, [
						E('div', {}, [
							E('h2', {}, t('CAMERA NETWORK')),
							E('div', { class: 'camera-console-subtitle' }, t('HaLow production console · Live telemetry'))
						])
					]),
					E('div', { class: 'camera-toolbar-actions' }, [
						E('button', {
							class:'cbi-button camera-language-button',
							title:cameraLanguage() === 'zh' ? t('Switch to English') : t('Switch to Chinese'),
							click:toggleCameraLanguage
						}, cameraLanguage() === 'zh' ? 'EN' : '中文'),
						isAP ? E('button', { class:'cbi-button camera-config-only camera-export-button', click:() => exportCameraConfiguration(state) }, t('Export')) : E([]),
						isAP ? E('button', { class:'cbi-button camera-config-only camera-export-button', click:importCameraConfiguration }, t('Import')) : E([]),
						isAP ? E('button', { class:'cbi-button camera-monitor-button', click:() => toggleMonitorMode(root) }, root.classList.contains('camera-monitor-mode') ? t('Exit monitor') : t('Monitor')) : E([]),
						E('span', { class: 'camera-live-dot' }),
						E('span', { class: 'camera-console-subtitle camera-live-label' }, t('Live'))
					])
				]),
				isAP ? renderReadiness(state.halow.peers, devices) : E([]),
				statusStrip,
				temperatureAlert,
				remoteTemperatureAlert,
				linkAlert,
				deviceAlert,
				roleOverview,
				isAP ? renderBootRecovery(state.boot) : E([]),
				E('div', { class: 'cbi-section camera-device-section camera-config-only' }, [
					E('div', { class: 'camera-section-heading', style: 'display:flex;justify-content:space-between;align-items:center;gap:1rem;flex-wrap:wrap' }, [
						E('h3', {}, t('Discovered devices')),
						E('small', { style: 'opacity:.7' }, `${t('Updated')} ${new Date().toLocaleTimeString(cameraLanguage() === 'zh' ? 'zh-CN' : 'en-US')}`)
					]),
					renderDeviceTable(state.leases, state.hints, state.selfIPs, state.bridgePorts)
				]),
				isAP ? E([]) : E('div', { class: 'cbi-section', style: 'padding:1rem' }, [
					E('h3', {}, t('HaLow connection history — this boot')),
					renderLinkHistory(state.linkHistory)
				]),
				E('p', { style: 'opacity:.7' }, t('Camera network telemetry refreshes every 2 seconds.'))
			);
			window.requestAnimationFrame(() => {
				const newDeviceScroll = root.querySelector('.camera-table-scroll');
				if (newDeviceScroll)
					newDeviceScroll.scrollLeft = deviceScrollLeft;
				window.scrollTo(0, pageScrollY);
			});
		};

		renderData(data);
		poll.add(async () => {
			try {
				renderData(await this.collect());
			} catch (error) {
				console.error('Camera Network refresh failed', error);
			}
		}, 2);
		return root;
	}
});
