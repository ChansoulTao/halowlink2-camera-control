import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

// Exercise the actual shell helper; only OpenWrt UCI, flock and iwinfo are
// replaced because the host is not OpenWrt. Sysfs writes remain observable.
const dir = mkdtempSync(join(tmpdir(), 'camera-led-test-'));
const helper = resolve('work/camera-network/root/usr/sbin/camera-network-leds');
const remote = resolve('work/camera-network/root/usr/sbin/camera-network-client-leds');
const env = { ...process.env, PATH: `${dir}/bin:${process.env.PATH}`, TEST_DIR: dir,
  CAMERA_LED_SYSFS: `${dir}/leds`, CAMERA_LED_STATE: `${dir}/state` };
const file = (name, value, mode) => writeFileSync(join(dir, name), value, mode ? { mode } : undefined);
const read = name => readFileSync(join(dir, name), 'utf8').trim();
const run = (...args) => spawnSync('sh', [helper, ...args], { env, encoding: 'utf8' });
const ok = (...args) => { const r = run(...args); assert.equal(r.status, 0, r.stderr); };
const signal = (...levels) => file('assoc', levels.map((n, i) =>
  `94:83:C4:93:40:${String(i).padStart(2, '0')}  ${n} dBm / -100 dBm (SNR 33)  0 ms ago\n\tRX: 43.3 MBit/s, MCS 9, 8MHz 1936 Pkts.\n`).join(''));
try {
  mkdirSync(`${dir}/bin`);
  for (const name of ['rgb:led0', 'rgb:led1', 'rgb:led2', 'mt76-phy0']) {
    mkdirSync(`${dir}/leds/${name}`, { recursive: true });
    for (const [key, value] of Object.entries({ trigger: 'none', brightness: '0', max_brightness: '255',
      multi_index: 'red green blue', multi_intensity: '255 0 127', delay_on: '0', delay_off: '0',
      device_name: '', link: '0', rx: '0', tx: '0' })) file(`leds/${name}/${key}`, value);
  }
  file('config', '{}'); file('assoc', '');
  file('bin/flock', '#!/bin/sh\ncase "$*" in "9"|"-n 9") exit 0 ;; *) echo "Unsupported BusyBox flock arguments" >&2; exit 2 ;; esac\n', 0o755);
  file('bin/iwinfo', '#!/bin/sh\n[ "$1 $2" = "wlan0 assoclist" ] || exit 2\ncat "$TEST_DIR/assoc"\n', 0o755);
  file('bin/uci', `#!${process.execPath}
const fs = require('fs');
const path = process.env.TEST_DIR + '/config';
const db = JSON.parse(fs.readFileSync(path));
const [op, arg] = process.argv.slice(2).filter(x => x !== '-q');
if (op === 'get') { if (!(arg in db)) process.exit(1); console.log(db[arg]); }
else if (op === 'set') { const i = arg.indexOf('='); db[arg.slice(0,i)] = arg.slice(i+1); fs.writeFileSync(path, JSON.stringify(db)); }
else if (op === 'commit') fs.appendFileSync(process.env.TEST_DIR + '/commits', 'commit\\n');
else process.exit(2);
`, 0o755);

  // Bad inputs must never become shell syntax or a hardware/config write.
  for (const value of ['', '-1', '101', '20.5', '1;echo unsafe', '9999999999999999'])
    assert.notEqual(run('brightness', value).status, 0, `reject brightness ${value}`);
  assert.equal(read('config'), '{}');
  signal(-55);
  ok('brightness', '40');
  assert.equal(read('leds/rgb:led0/multi_intensity'), '0 102 0', 'brightness scales the green signal color');
  assert.equal(read('leds/rgb:led1/multi_intensity'), '0 0 102', 'Status stays blue at the selected brightness');
  assert.equal(read('leds/rgb:led2/multi_intensity'), '102 0 50', 'purple keeps its RGB ratio');
  assert.equal(read('leds/rgb:led2/device_name'), 'lan', 'bind physical LAN, never internal eth0 or wlan0');
  for (const attr of ['link', 'rx', 'tx']) assert.equal(read(`leds/rgb:led2/${attr}`), '1');
  const commits = read('commits');
  for (const [levels, rgb, trigger, on, off] of [
    [[-60], '0 102 0', 'default-on'], [[-61], '0 102 0', 'timer', '1000', '1000'],
    [[-70], '0 102 0', 'timer', '1000', '1000'], [[-71], '102 102 0', 'timer', '500', '500'],
    [[-80], '102 102 0', 'timer', '500', '500'], [[-81], '102 0 0', 'timer', '250', '250'],
    [[-50, -85], '102 0 0', 'timer', '250', '250'],
    [[], '102 0 0', 'timer', '100', '1900'], [[0, -999], '102 0 0', 'timer', '100', '1900']
  ]) {
    signal(...levels); ok('tick');
    assert.equal(read('leds/rgb:led0/multi_intensity'), rgb, `color for ${levels}`);
    assert.equal(read('leds/rgb:led0/trigger'), trigger);
    if (on) {
      assert.equal(read('leds/rgb:led0/delay_on'), on);
      assert.equal(read('leds/rgb:led0/delay_off'), off);
    }
  }
  assert.equal(read('commits'), commits, 'polling must not write flash');
  const before = statSync(`${dir}/leds/rgb:led0/trigger`).mtimeMs;
  ok('tick');
  assert.equal(statSync(`${dir}/leds/rgb:led0/trigger`).mtimeMs, before, 'same band must not restart the blink timer');
  file('leds/rgb:led2/device_name', 'wlan0'); ok('tick');
  assert.equal(read('leds/rgb:led2/device_name'), 'lan', 'recover after the vendor LED service resets triggers');
  ok('off'); signal(-40); ok('tick'); ok('brightness', '25');
  for (const name of ['rgb:led0', 'rgb:led1', 'rgb:led2', 'mt76-phy0']) {
    assert.equal(read(`leds/${name}/trigger`), 'none');
    assert.equal(read(`leds/${name}/brightness`), '0', 'off wins over signal and brightness');
  }
  rmSync(`${dir}/state`, { force: true }); ok('apply');
  assert.equal(read('leds/rgb:led0/brightness'), '0', 'off persists across a fresh process/boot');
  ok('on');
  assert.equal(read('leds/rgb:led0/multi_intensity'), '0 63 0', 'on restores the saved brightness');
  assert.equal(read('leds/rgb:led1/multi_intensity'), '0 0 63', 're-enabling lights restores blue Status');
  ok('brightness', '0');
  for (const name of ['rgb:led0', 'rgb:led1', 'rgb:led2']) assert.equal(read(`leds/${name}/brightness`), '0');
  ok('brightness', '100');
  assert.equal(read('leds/rgb:led0/multi_intensity'), '0 255 0', 'dimming is not cumulative');
  ok('brightness', '40');
  ok('toggle');
  assert.equal(read('leds/rgb:led1/brightness'), '0', 'button toggle switches all lights off');
  ok('toggle');
  assert.equal(read('leds/rgb:led1/multi_intensity'), '0 0 102', 'button toggle restores brightness');

  // Verify the remote command contract and MAC guard without a real SSH hop.
  file('bin/ssh', '#!/bin/sh\nprintf "%s\\n" "$@" > "$TEST_DIR/ssh-args"\n', 0o755);
  let r = spawnSync('sh', [remote, '192.168.12.194', '94:83:c4:93:40:28', 'brightness', '35'], { env, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(read('ssh-args'), /camera-network-leds 'brightness' '35'/);
  assert.match(read('ssh-args'), /\$actual.*94:83:C4:93:40:28/);
  assert.equal(JSON.parse(read('config'))['camera_network.cam_9483c4934028.remote_leds_brightness'], '35', 'AP remembers the acknowledged remote brightness across reboot');
  for (const value of ['-1', '101', '1;reboot', '']) {
    r = spawnSync('sh', [remote, '192.168.12.194', '94:83:C4:93:40:28', 'brightness', value], { env });
    assert.equal(r.status, 2);
  }
  const acknowledged = read('config');
  file('bin/ssh', '#!/bin/sh\nexit 3\n', 0o755);
  r = spawnSync('sh', [remote, '192.168.12.194', '94:83:C4:93:40:28', 'brightness', '90'], { env });
  assert.equal(r.status, 3, 'identity/SSH failure propagates to the UI');
  assert.equal(read('config'), acknowledged, 'failed remote operation must not change the AP cache');
  console.log('LED helper checks passed: bands, weakest peer, colors, LAN trigger, dimming, persistence, off, validation and remote identity.');
} finally { rmSync(dir, { recursive: true, force: true }); }
