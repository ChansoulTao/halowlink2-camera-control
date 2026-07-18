'use strict';
'require fs';
'require ui';
'require view';

const styles = `
.roadlink-control{max-width:760px;margin:1rem auto;font-family:-apple-system,BlinkMacSystemFont,"SF Pro Display",sans-serif}
.roadlink-card{padding:1.5rem;border:1px solid #2b3038;border-radius:14px;background:#15181d;color:#f5f7fa;box-shadow:0 14px 36px #0003}
.roadlink-card h2{margin:0 0 .5rem;color:#fff}.roadlink-card p{color:#a3a9b3;line-height:1.55}
.roadlink-status{display:flex;align-items:center;gap:.65rem;margin:1.25rem 0;padding:1rem;border-radius:10px;background:#1c2026}
.roadlink-dot{width:10px;height:10px;border-radius:50%;background:#6b7280}.roadlink-dot.on{background:#22c58b;box-shadow:0 0 0 5px #22c58b22}
.roadlink-actions{display:flex;gap:.7rem;flex-wrap:wrap}.roadlink-actions .cbi-button{min-height:46px;border:0;border-radius:8px;padding:.65rem 1rem;font-weight:800}
`;

async function getMode() {
	try { return (await fs.exec_direct('/usr/sbin/halow-mode', ['status'])).trim(); }
	catch (_) { return 'camera'; }
}

return view.extend({
	load: getMode,
	render: function(mode) {
		const enabled = mode === 'chat';
		const status = E('div', { class:'roadlink-status' }, [
			E('span', { class:`roadlink-dot${enabled ? ' on' : ''}` }),
			E('strong', {}, enabled ? _('RoadLink is running') : _('RoadLink is off'))
		]);
		const start = E('button', { class:'cbi-button cbi-button-positive', disabled:enabled ? '' : null, click:async ev => {
			if (!window.confirm(_('Start RoadLink? 2.4 GHz Wi-Fi will turn on with SSID “carchat”.'))) return;
			ev.currentTarget.disabled = true;
			try { await fs.exec_direct('/usr/sbin/halow-mode', ['chat']); window.location.href='/car-chat/'; }
			catch (_) { ev.currentTarget.disabled=false; ui.addNotification(null,E('p',{},_('Unable to start RoadLink'))); }
		}}, _('Start RoadLink'));
		const stop = E('button', { class:'cbi-button cbi-button-negative', disabled:enabled ? null : '', click:async ev => {
			ev.currentTarget.disabled=true;
			try { await fs.exec_direct('/usr/sbin/halow-mode', ['camera']); window.location.reload(); }
			catch (_) { ev.currentTarget.disabled=false; }
		}}, _('Stop RoadLink'));
		return E('div', { class:'roadlink-control' }, [E('style',{},styles), E('div',{class:'roadlink-card'},[
			E('h2',{},_('RoadLink')),
			E('p',{},_('Offline vehicle communication. It stays off until started here.')),
			status,
			E('div',{class:'roadlink-actions'},[start,stop])
		])]);
	},
	handleSaveApply:null,
	handleSave:null,
	handleReset:null
});
