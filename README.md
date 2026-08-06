# HaLowLink 2 Camera Control

An iPad- and phone-friendly camera-network dashboard for HaLowLink 2 devices
running OpenWrt and Morse Micro firmware.

The project adds a dedicated LuCI interface for monitoring and operating a
HaLow camera network without replacing the standard OpenWrt administration
pages.

## Features

- Live HaLow client signal strength, SNR, connection state, and five-minute history
- Dropout and reconnection-time tracking
- AP and remote Client chip-temperature monitoring
- Camera and network-device discovery with custom names, pinning, filtering, and hiding
- Automatic Client-to-camera association
- Reachability and latency checks
- AP and remote Client indicator-light controls
- One-click remote Client pairing from the AP dashboard; the Client password is used once and never stored
- Responsive light/dark interface designed for iPad and phone use
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
opkg install /tmp/luci-app-camera-network_1.2.0-4_all.ipk
```

To reinstall or upgrade:

```sh
opkg install --force-reinstall /tmp/luci-app-camera-network_1.2.0-4_all.ipk
```

Open the HaLowLink 2 address in a browser and sign in to LuCI. Camera Control
will be available from the main interface.

See [the Chinese installation guide](outputs/Camera-Network-安装说明.md) for
additional details.

## Pair a new Client

1. Use the HaLowLink built-in setup portal to put the new device in
   Client/Extender mode and join the AP's HaLow SSID.
2. Install the same Camera Network IPK on the Client. This enables SSH and
   installs the local light-control helper.
3. Open Camera Network on the AP. In the detected Client card, click **Pair**.
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

`packaging/control` is the only package-version source. To publish a release,
update its `Version` field, run `./scripts/check.sh`, then run
`./scripts/build-ipk.sh`. Create a matching Git tag and GitHub Release, and
attach the generated IPK from `outputs/`. Do not publish device backups,
configuration exports, passwords, or SSH keys.

## Source layout

- `work/camera-network/root/` — files installed on the OpenWrt device
- `outputs/` — ready-to-install package and documentation

Device backups, private configuration, credentials, and SSH keys are not part
of this repository.

## Important

Back up the device configuration before installing. This is an independent
community project and is not affiliated with or endorsed by Morse Micro.
