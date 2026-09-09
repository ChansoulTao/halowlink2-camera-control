import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
const dir = mkdtempSync(join(tmpdir(), 'camera-led-telemetry-'));
const source = readFileSync('work/camera-network/root/usr/sbin/camera-network-monitor', 'utf8').split('\nstop_sampling()')[0];
try {
  mkdirSync(`${dir}/bin`);
  writeFileSync(`${dir}/bin/uci`, `#!/bin/sh
case "$*" in
  '-q show camera_network') echo "camera_network.cam_a.remote_paired='1'" ;;
  '-q get camera_network.cam_a.mac') echo '94:83:C4:93:40:28' ;;
  '-q get camera_network.cam_a.last_ip') echo '192.168.12.194' ;;
  '-q get camera_network.settings.leds_enabled') echo "$TEST_ENABLED" ;;
esac
`, { mode:0o755 });
  writeFileSync(`${dir}/bin/iwinfo`, '#!/bin/sh\necho "94:83:C4:93:40:28 -55 dBm"\n', { mode:0o755 });
  const script = `${source}\nAP_READY=1\nOUT="$TEST_DIR/out"\nCLIENT_CACHE_DIR="$TEST_DIR"\nDHCP_LEASE_FILE="$TEST_DIR/no-leases"\nbuild_client_json\nwrite_state\n`;
  for (const [local, remote, age, wantLocal, wantRemote] of [['0','0',0,false,false], ['1','1',0,true,true], ['','',0,true,null], ['1','0',16,true,null]]) {
    writeFileSync(`${dir}/9483C4934028`, `boot\n3\n40\n0\n192.168.12.194\n\n${remote}\n${Math.floor(Date.now()/1000)-age}\n`);
    const result = spawnSync('sh', ['-c', script], { encoding:'utf8', env:{ ...process.env, PATH:`${dir}/bin:${process.env.PATH}`, TEST_DIR:dir, TEST_ENABLED:local } });
    assert.equal(result.status, 0, result.stderr);
    const state = JSON.parse(readFileSync(`${dir}/out`, 'utf8'));
    assert.equal(state.ledsEnabled, wantLocal, 'local button state is live');
    assert.equal(state.clientTelemetry['94:83:C4:93:40:28'].ledsEnabled, wantRemote, 'remote LED state is validated and fresh');
  }
  console.log('LED telemetry checks passed: local, remote, old firmware and stale samples.');
} finally { rmSync(dir, { recursive:true, force:true }); }
