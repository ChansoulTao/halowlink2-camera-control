#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
VERSION="${VERSION:-1.1.7-1}"
OUTPUT="${1:-$ROOT_DIR/outputs/luci-app-camera-network_${VERSION}_all.ipk}"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM

mkdir -p "$TMP_DIR/root" "$TMP_DIR/control" "$TMP_DIR/outer"
cp -R "$ROOT_DIR/work/camera-network/root/." "$TMP_DIR/root/"
cp -R "$ROOT_DIR/packaging/." "$TMP_DIR/control/"

# LuCI's menu references a cache-busting, versioned filename.
cp "$TMP_DIR/root/www/luci-static/resources/view/camera-network/index.js" \
	"$TMP_DIR/root/www/luci-static/resources/view/camera-network/index-v32.js"

# Do not claim /www/index.html, which belongs to luci-base. The post-install
# script installs this redirect while preserving the original file.
mkdir -p "$TMP_DIR/root/usr/share/camera-network"
mv "$TMP_DIR/root/www/index.html" "$TMP_DIR/root/usr/share/camera-network/index.html"

chmod 0755 \
	"$TMP_DIR/root/etc/init.d/camera-network-monitor" \
	"$TMP_DIR/root/usr/sbin/camera-network-monitor" \
	"$TMP_DIR/root/usr/sbin/camera-network-leds" \
	"$TMP_DIR/root/usr/sbin/camera-network-client-leds" \
	"$TMP_DIR/root/usr/sbin/camera-network-pair-client" \
	"$TMP_DIR/control/preinst" \
	"$TMP_DIR/control/postinst" \
	"$TMP_DIR/control/prerm"

archive_as_root() {
	destination="$1"
	directory="$2"
	shift 2
	if tar --version 2>/dev/null | grep -q bsdtar; then
		COPYFILE_DISABLE=1 tar --no-xattrs --uid 0 --gid 0 --uname root --gname root \
			-czf "$destination" -C "$directory" "$@"
	else
		tar --numeric-owner --owner=0 --group=0 -czf "$destination" -C "$directory" "$@"
	fi
}

archive_as_root "$TMP_DIR/outer/control.tar.gz" "$TMP_DIR/control" .
archive_as_root "$TMP_DIR/outer/data.tar.gz" "$TMP_DIR/root" .
printf '2.0\n' > "$TMP_DIR/outer/debian-binary"
mkdir -p "$(dirname -- "$OUTPUT")"

# OpenWrt 23.05 IPKs use a gzip-compressed outer tar, not Debian's ar format.
archive_as_root "$OUTPUT" "$TMP_DIR/outer" \
	./debian-binary ./data.tar.gz ./control.tar.gz

echo "Built $OUTPUT"
