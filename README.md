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
- Built-in English/Chinese interface switch with a remembered preference
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

Download the latest `.ipk` from `outputs/`, copy it to `/tmp/` on the
HaLowLink 2, then install it over SSH:

```sh
opkg install /tmp/luci-app-camera-network_1.0.3-1_all.ipk
```

To reinstall or upgrade:

```sh
opkg install --force-reinstall /tmp/luci-app-camera-network_1.0.3-1_all.ipk
```

Open the HaLowLink 2 address in a browser and sign in to LuCI. Camera Control
will be available from the main interface.

See [the Chinese installation guide](outputs/Camera-Network-安装说明.md) for
additional details.

## Source layout

- `work/camera-network/root/` — files installed on the OpenWrt device
- `outputs/` — ready-to-install package and documentation

Device backups, private configuration, credentials, and SSH keys are not part
of this repository.

## Important

Back up the device configuration before installing. This is an independent
community project and is not affiliated with or endorsed by Morse Micro.
