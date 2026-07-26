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
- Optional automatic first-time Client authorization for remote temperature and light controls
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

## Automatic Client authorization

Remote Client temperature and indicator-light control use a dedicated SSH key.
For installations where all Clients share one trusted management password, the
AP can automatically authorize newly connected Clients:

1. Install `sshpass` from the official OpenWrt 23.05.6 package feed.
2. Store the shared Client management password in
   `/etc/camera-network/client-password`.
3. Restrict the file to root:

```sh
mkdir -p /etc/camera-network
printf '%s\n' 'replace-with-your-client-password' > /etc/camera-network/client-password
chmod 600 /etc/camera-network/client-password
```

The monitor checks for new HaLow Clients every ten seconds. When it can map an
associated Client MAC address to a management IP, it installs the AP public key
and records the Client as paired. The password is not exposed in LuCI or
configuration exports.

This mode deliberately trades some security for convenience. Every Client must
use the configured management password. Anyone who obtains root access to the
AP can read that password and may gain root access to all Clients that share
it. Do not commit the password, device backups, or private keys to Git.

If automatic authorization is not configured, each Client can still be
authorized once by adding the AP public key to
`/etc/dropbear/authorized_keys`.

## Wired iPad and Mac access

An iPad or Mac can use wired Ethernet for the camera network while continuing
to use Wi-Fi for internet access. Configure the wired adapter manually:

- Address: an unused address in `192.168.12.0/24`
- Subnet mask: `255.255.255.0`
- Router/default gateway: blank
- DNS: blank

For example, use `192.168.12.2` on a Mac or iPad and open
`https://192.168.12.1`. The Wi-Fi network must use a different subnet, such as
`192.168.10.0/24`.

If the wired interface only receives a `169.254.x.x` address, or is configured
with `255.255.0.0`, it is not correctly configured for the HaLowLink management
network. A yellow light that appears only when a cable is connected can be a
link indication; verify access to `192.168.12.1` before treating it as a
firmware failure.

## Source layout

- `work/camera-network/root/` — files installed on the OpenWrt device
- `outputs/` — ready-to-install package and documentation

Device backups, private configuration, credentials, and SSH keys are not part
of this repository.

## Important

Back up the device configuration before installing. This is an independent
community project and is not affiliated with or endorsed by Morse Micro.
