#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
CONTROL_FILE="$ROOT_DIR/packaging/control"

[ "$#" -le 1 ] || {
	echo "Usage: $0 [output-ipk]" >&2
	exit 2
}

control_field() {
	sed -n "s/^$1:[[:space:]]*//p" "$CONTROL_FILE" | head -n1
}

PACKAGE="$(control_field Package)"
VERSION="$(control_field Version)"
ARCHITECTURE="$(control_field Architecture)"
[ -n "$PACKAGE" ] && [ -n "$VERSION" ] && [ -n "$ARCHITECTURE" ] || {
	echo "Unable to read Package, Version, and Architecture from $CONTROL_FILE" >&2
	exit 1
}
case "$PACKAGE:$VERSION:$ARCHITECTURE" in
	*[!A-Za-z0-9._:+~-]*)
		echo "Invalid Package, Version, or Architecture field in $CONTROL_FILE" >&2
		exit 1
		;;
esac

OUTPUT="${1:-$ROOT_DIR/outputs/${PACKAGE}_${VERSION}_${ARCHITECTURE}.ipk}"
TMP_DIR="$(mktemp -d)"
PARTIAL_OUTPUT="${OUTPUT}.partial.$$"
trap 'rm -rf "$TMP_DIR"; rm -f "$PARTIAL_OUTPUT"' EXIT INT TERM

mkdir -p "$TMP_DIR/root" "$TMP_DIR/control" "$TMP_DIR/outer"
cp -R "$ROOT_DIR/work/camera-network/root/." "$TMP_DIR/root/"
cp -R "$ROOT_DIR/packaging/." "$TMP_DIR/control/"

# Give every release a distinct browser URL. This is important on iPad Safari,
# which otherwise keeps serving an older LuCI module after an IPK upgrade.
CACHE_VERSION="$(printf '%s' "$VERSION" | tr -c 'A-Za-z0-9' '_')"
CACHE_VIEW="index-v${CACHE_VERSION}"
cp "$TMP_DIR/root/www/luci-static/resources/view/camera-network/index.js" \
	"$TMP_DIR/root/www/luci-static/resources/view/camera-network/${CACHE_VIEW}.js"
MENU_FILE="$TMP_DIR/root/usr/share/luci/menu.d/luci-app-camera-network.json"
sed "s#camera-network/index\"#camera-network/${CACHE_VIEW}\"#" "$MENU_FILE" > "$MENU_FILE.tmp"
mv "$MENU_FILE.tmp" "$MENU_FILE"
grep -q "\"path\": \"camera-network/${CACHE_VIEW}\"" "$MENU_FILE" || {
	echo "Unable to version the Camera Network LuCI menu path" >&2
	exit 1
}

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
	"$TMP_DIR/root/usr/sbin/camera-network-static-ip" \
	"$TMP_DIR/control/preinst" \
	"$TMP_DIR/control/postinst" \
	"$TMP_DIR/control/prerm"

normalize_tree() {
	# A fixed timestamp removes host checkout times from archive metadata.
	# Symlinks are skipped because BSD and GNU touch differ in their handling.
	find "$1" ! -type l -exec touch -t 200001010000 {} +
}

archive_as_root() {
	destination="$1"
	directory="$2"
	shift 2
	temporary_archive="$(mktemp "$TMP_DIR/archive.XXXXXX")"
	if tar --version 2>/dev/null | grep -q bsdtar; then
		COPYFILE_DISABLE=1 tar --no-xattrs --uid 0 --gid 0 --uname root --gname root \
			-cf "$temporary_archive" -C "$directory" "$@"
	else
		tar --numeric-owner --owner=0 --group=0 --sort=name \
			-cf "$temporary_archive" -C "$directory" "$@"
	fi
	# gzip normally embeds the build time. -n removes that timestamp and the
	# source filename so identical inputs produce byte-identical IPKs.
	gzip -n -9 -c "$temporary_archive" > "$destination"
	rm -f "$temporary_archive"
}

normalize_tree "$TMP_DIR/control"
normalize_tree "$TMP_DIR/root"
archive_as_root "$TMP_DIR/outer/control.tar.gz" "$TMP_DIR/control" .
archive_as_root "$TMP_DIR/outer/data.tar.gz" "$TMP_DIR/root" .
printf '2.0\n' > "$TMP_DIR/outer/debian-binary"
normalize_tree "$TMP_DIR/outer"
mkdir -p "$(dirname -- "$OUTPUT")"

# OpenWrt 23.05 IPKs use a gzip-compressed outer tar, not Debian's ar format.
archive_as_root "$PARTIAL_OUTPUT" "$TMP_DIR/outer" \
	./debian-binary ./data.tar.gz ./control.tar.gz
mv "$PARTIAL_OUTPUT" "$OUTPUT"

echo "Built $OUTPUT"
