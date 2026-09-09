# HaLowLink 2 Camera Control

An iPad- and phone-friendly camera-network dashboard for HaLowLink 2 devices
running OpenWrt and Morse Micro firmware.

The project adds a dedicated LuCI interface for monitoring and operating a
HaLow camera network without replacing the standard OpenWrt administration
pages.

## Features

- Live HaLow client signal strength, SNR, connection state, and five-minute history
- Signal-first AP operations board with Camera-named Client links and per-Client recovery timing
- Dropout and reconnection-time tracking
- AP and remote Client chip-temperature monitoring
- Camera and network-device discovery with custom names, pinning, filtering, and hiding
- Automatic Client-to-camera association
- Reassignable A-D camera-position addresses (`192.168.12.50` through `.53`) with direct Web UI links
- Reachability and latency checks
- AP and per-Client 0–100% indicator brightness and on/off controls, saved across reboot
- Wi-Fi LED repurposed as a color/blink HaLow signal indicator; purple LED shows physical LAN link/activity
- One-click remote Client pairing from the AP dashboard; the Client password is used once and never stored
- Responsive interface that follows the iPad or system light/dark appearance, with unobtrusive touch scrolling
- Dismissible warnings for weak links, offline devices, and high temperatures
- Boot-to-HaLow-ready timing
- Configuration export and restore

## Compatibility

Developed and tested with:

- HaLowLink 2
- OpenWrt 23.05.6
- Morse Micro firmware 2.11.13

Other firmware versions may use different wireless-interface, thermal-sensor,
or LuCI paths and can require adaptation.

## Install

Download the latest `.ipk` from `outputs/`, copy it to `/tmp/` on both the AP
and every Client that should support remote light control, then install it over
SSH:

```sh
opkg install /tmp/luci-app-camera-network_1.2.0-15_all.ipk
```

To reinstall or upgrade:

```sh
opkg install --force-reinstall /tmp/luci-app-camera-network_1.2.0-15_all.ipk
```

Open the HaLowLink 2 address in a browser and sign in to LuCI. Camera Control
will be available from the main interface.

See [the Chinese installation guide](outputs/Camera-Network-安装说明.md) for
additional details.

## Indicator lights

The former Wi-Fi LED now reports HaLow RSSI. On an AP it shows the weakest
currently associated Client; on a Client it shows its AP signal:

| Signal | Color | Pattern |
| --- | --- | --- |
| ≥ −60 dBm | Green | Solid |
| −70 to below −60 dBm | Green | 1 s on / 1 s off |
| −80 to below −70 dBm | Yellow | 0.5 s on / 0.5 s off |
| Below −80 dBm | Red | 0.25 s on / 0.25 s off |
| No valid associated signal | Red | 0.1 s on / 1.9 s off |

The purple LED follows the physical `lan` socket: off without carrier, on
with carrier, and activity flashes on transmit/receive. It deliberately does
not use the always-up internal `eth0`, USB, or the separate WAN port.
It is a cable/link indicator, not proof that camera control is reachable.
The remaining Status LED stays blue. All three follow the saved brightness;
the off switch takes priority, and re-enabling keeps the previous brightness.
Brightness is saved when the slider is released, not on every drag step.
The kernel handles blink/activity timing; a two-second background monitor
updates the signal band even with the dashboard closed.

## Pair a new Client

1. Use the HaLowLink built-in setup portal to put the new device in
   Client/Extender mode and join the AP's HaLow SSID.
2. Install the same Camera Network IPK on the Client. This enables SSH and
   installs the local light-control helper.
3. Open Camera Network on the AP. In the Client's **Live Link Status** row, click **Pair** in the Lights column.
4. Enter the Client administrator password once.

The AP creates its own Ed25519 key and authorizes only the public key on the
Client. The password is sent directly to the Client over its local HTTPS
management interface for that pairing request, then discarded. It is not
written to UCI, files, logs, backups, or this repository. Later temperature and
light-control operations use key authentication.

After pairing, the AP reads each Client's local bridge table to identify the
camera connected to that Client's wired port. This avoids guessing from the
AP-side wireless bridge, where several Clients share the same port. A manual
selection remains available and each camera can belong to only one Client.

## Stable A-D camera addresses

The AP dashboard provides four reusable position slots. Assign the currently
used A Camera to slot A for `192.168.12.50`, B to `.51`, C to `.52`, and D to
`.53`. The slots belong to the production positions, not permanently to one
camera: when a project changes, select the replacement camera in the same slot
and the stable address follows the new camera's MAC address.

The camera must use DHCP. After assigning or replacing a slot, renew the
camera's DHCP lease or reconnect its network/power before using the new address.
The dashboard distinguishes a live fixed address from a reservation that is
waiting for the camera to reconnect, and provides a direct Camera Web UI link.

## Build the IPK

On macOS or Linux:

```sh
./scripts/build-ipk.sh
```

The output is written to `outputs/`. The build uses the gzip-compressed outer
tar format expected by OpenWrt 23.05; Debian-style `ar` packages are not
accepted by the HaLowLink 2 firmware.

Run all syntax, metadata, archive-layout, cache-version, and secret checks with:

```sh
./scripts/check.sh
```

To preview the real LuCI view locally with representative AP, Client, Camera,
telemetry, and recovery data:

```sh
cd tools/preview
npm run dev -- --host 127.0.0.1 --port 4173
```

Open `http://127.0.0.1:4173/`. The preview evaluates the maintained production
`index.js`; it does not maintain a second copy of the dashboard.

`packaging/control` is the only package-version source. To publish a release,
update its `Version` field, run `./scripts/check.sh`, then run
`./scripts/build-ipk.sh`. Create a matching Git tag and GitHub Release, and
attach the generated IPK from `outputs/`. Do not publish device backups,
configuration exports, passwords, or SSH keys.

## Source layout

- `work/camera-network/root/` — files installed on the OpenWrt device
- `outputs/` — ready-to-install package and documentation
- `tools/preview/` — local, production-source LuCI preview harness

Dashboard icons are from [Iconoir](https://iconoir.com/) under the MIT License;
the bundled license is installed alongside the icon assets.

Device backups, private configuration, credentials, and SSH keys are not part
of this repository.

## Important

Back up the device configuration before installing. This is an independent
community project and is not affiliated with or endorsed by Morse Micro.
