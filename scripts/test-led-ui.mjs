import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

const source = readFileSync('work/camera-network/root/www/luci-static/resources/view/camera-network/index.js', 'utf8');
const config = new Map([['settings.leds_brightness', '60'], ['cam_9483c4934028.remote_leds_brightness', '35']]);
const calls = [];
let reject = false;
// LuCI DOM.attr skips only null/undefined. Even disabled:false becomes an
// HTML boolean attribute, so presence (not JS truthiness) disables the input.
// Only the DOM boundary and RPC transport are stand-ins. Run the real handlers.
const E = (tag, attrs = {}, children = []) => ({ tag, attrs, children: Array.isArray(children) ? children : [children],
  value: attrs.value, disabled: attrs.disabled != null, textContent: typeof children === 'string' ? children : '' });
const injected = source.replace('return view.extend({', `
showCameraToast = () => {};
return { renderLEDBrightness: typeof renderLEDBrightness === 'function' ? renderLEDBrightness : undefined,
  preserveLEDBrightness: typeof preserveLEDBrightness === 'function' ? preserveLEDBrightness : undefined, busy: () => ledOperations };
view.extend({`);
const api = runInNewContext(`(function() { ${injected} })()`, {
  E, _: s => s, rpc: { declare: () => () => {} },
  uci: { get: (c, s, k) => config.get(`${s}.${k}`), add: () => {}, set: (c, s, k, v) => config.set(`${s}.${k}`, v) },
  fs: { exec_direct: async (path, args) => { calls.push({ path, args: Array.from(args) }); if (reject) throw new Error('offline'); } }
});
const find = (el, tag) => el.tag === tag ? el : el.children?.map(x => typeof x === 'object' && find(x, tag)).find(Boolean);

assert.equal(typeof api.renderLEDBrightness, 'function', 'brightness slider is available');
let control = api.renderLEDBrightness();
let input = find(control, 'input');
assert.equal(input.attrs.type, 'range');
assert.equal(input.value, '60', 'start at the saved local value');
assert.ok(input.attrs['aria-label'], 'slider must have an accessible name');
input.value = '40'; input.attrs.input();
assert.equal(calls.length, 0, 'dragging does not send commands or write flash');
const pending = input.attrs.change();
assert.equal(api.busy(), 1, 'hold polling while a save is in flight');
assert.equal(input.disabled, true);
await pending;
assert.equal(api.busy(), 0);
assert.equal(config.get('settings.leds_brightness'), '40');
assert.deepEqual(calls[0], { path: '/usr/sbin/camera-network-leds', args: ['brightness', '40'] });

const identity = { mac: '94:83:C4:93:40:28', ip: '192.168.12.194' };
control = api.renderLEDBrightness(identity); input = find(control, 'input');
assert.equal(input.value, '35');
assert.equal(input.disabled, false, 'a reachable Client slider must be operable with real LuCI boolean-attribute semantics');
input.value = '25'; await input.attrs.change();
assert.deepEqual(calls[1], { path: '/usr/sbin/camera-network-client-leds', args: ['192.168.12.194', '94:83:C4:93:40:28', 'brightness', '25'] });
assert.equal(config.get('cam_9483c4934028.remote_leds_brightness'), '25');
reject = true; input.value = '80'; await input.attrs.change();
assert.equal(input.value, '25', 'a failed RPC restores the last successful value');
assert.equal(config.get('cam_9483c4934028.remote_leds_brightness'), '25');
assert.equal(api.busy(), 0);
assert.equal(find(api.renderLEDBrightness({ ...identity, ip: '' }), 'input').disabled, true);
assert.equal(typeof api.preserveLEDBrightness, 'function', 'periodic refresh preserves the existing brightness controls');
// Model only the tree replacement boundary, keeping the preservation logic real.
const slider = (key, value, owner) => ({
  getAttribute: name => name === 'data-led-brightness-key' ? key : null,
  querySelector: () => ({ value }),
  replaceWith(node) { owner[owner.indexOf(this)] = node; }
});
const oldNodes = [], newNodes = [];
oldNodes.push(slider('local', '40', oldNodes), slider('client-a:live:ip1', '25', oldNodes));
newNodes.push(slider('local', '40', newNodes), slider('client-a:live:ip1', '25', newNodes));
api.preserveLEDBrightness({ querySelectorAll: () => oldNodes }, { querySelectorAll: () => newNodes });
assert.equal(newNodes[0], oldNodes[0], 'local input identity survives telemetry refresh');
assert.equal(newNodes[1], oldNodes[1], 'Client input identity survives telemetry refresh');
const changed = [];
changed.push(slider('local', '60', changed), slider('client-a:live:ip2', '25', changed));
const fresh = [...changed];
api.preserveLEDBrightness({ querySelectorAll: () => oldNodes }, { querySelectorAll: () => changed });
assert.equal(changed[0], fresh[0], 'a change made by another control is reflected');
assert.equal(changed[1], fresh[1], 'a changed Client address must get a fresh handler');
console.log('LED UI checks passed: saved values, accessible slider, release-to-save, remote target, refresh hold and failure rollback.');
