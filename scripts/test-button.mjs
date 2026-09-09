import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
const helper = resolve('work/camera-network/root/usr/sbin/camera-network-button');
const dir = mkdtempSync(join(tmpdir(), 'camera-button-test-'));
const env = { ...process.env, CAMERA_BUTTON_ROOT:dir, PATH:`${dir}/bin:${process.env.PATH}`, TEST_DIR:dir };
const read = p => readFileSync(`${dir}/${p}`, 'utf8');
const run = (args = [], event = {}) => spawnSync('sh', [helper, ...args], { env:{ ...env, ...event }, encoding:'utf8' });
try {
  mkdirSync(`${dir}/bin`);
  for (const command of ['camera-network-leds', 'ubus', 'reboot', 'jffs2reset'])
    writeFileSync(`${dir}/bin/${command}`, `#!/bin/sh\necho '${command}' "$@" >> "$TEST_DIR/events"\n`, { mode:0o755 });
  writeFileSync(`${dir}/events`, '');
  assert.ok(existsSync(helper), 'physical button handler must be provided');
  for (const seconds of ['0','1','2','5','10','60']) {
    writeFileSync(`${dir}/events`, '');
    for (const ACTION of ['pressed','timeout','timeout','released'])
      assert.equal(run([], { ACTION, SEEN:seconds, BUTTON:'BTN_0' }).status, 0);
    assert.equal(read('events'), Number(seconds) < 2 ? 'ubus call dpp push_button\n' : 'camera-network-leds toggle\n',
      `hold ${seconds}s: release once, no reset or mode change`);
  }
  for (const SEEN of ['', '-1', '2;reboot', 'abc']) {
    writeFileSync(`${dir}/events`, '');
    run([], { ACTION:'released', SEEN, BUTTON:'BTN_0' });
    assert.equal(read('events'), '', 'malformed duration must do nothing');
  }
  mkdirSync(`${dir}/etc/rc.button`, { recursive:true });
  mkdirSync(`${dir}/sys/firmware/devicetree/base/keys/reset`, { recursive:true });
  writeFileSync(`${dir}/sys/firmware/devicetree/base/keys/reset/linux,code`, Buffer.from([0,0,1,0]));
  writeFileSync(`${dir}/etc/rc.button/BTN_0`, '# original vendor button\n');
  assert.equal(run(['install']).status, 0);
  assert.notEqual(read('etc/rc.button/BTN_0'), '# original vendor button\n');
  assert.equal(run(['install']).status, 0, 'upgrade is idempotent');
  assert.equal(run(['remove']).status, 0);
  assert.equal(read('etc/rc.button/BTN_0'), '# original vendor button\n', 'uninstall restores original');
  assert.equal(run(['install']).status, 0);
  writeFileSync(`${dir}/etc/rc.button/BTN_0`, '# administrator change\n');
  assert.equal(run(['install']).status, 0);
  assert.equal(read('etc/rc.button/BTN_0'), '# administrator change\n', 'upgrade preserves admin edits');
  assert.equal(run(['remove']).status, 0);
  assert.equal(read('etc/rc.button/BTN_0'), '# administrator change\n', 'uninstall preserves admin edits');
  console.log('Button checks passed: durations, single release, no destructive actions, backup, upgrade, restore and admin edits.');
} finally { rmSync(dir, { recursive:true, force:true }); }
