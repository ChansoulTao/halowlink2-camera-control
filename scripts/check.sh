#!/bin/sh

set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)"
VERSION="$(sed -n 's/^Version:[[:space:]]*//p' "$ROOT_DIR/packaging/control" | head -n1)"
PACKAGE="$(sed -n 's/^Package:[[:space:]]*//p' "$ROOT_DIR/packaging/control" | head -n1)"
ARCHITECTURE="$(sed -n 's/^Architecture:[[:space:]]*//p' "$ROOT_DIR/packaging/control" | head -n1)"
DASHBOARD_SOURCE="$ROOT_DIR/work/camera-network/root/www/luci-static/resources/view/camera-network/index.js"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT INT TERM
IPK="$TMP_DIR/${PACKAGE}_${VERSION}_${ARCHITECTURE}.ipk"
IPK_SECOND="$TMP_DIR/${PACKAGE}_${VERSION}_${ARCHITECTURE}.second.ipk"

[ -n "$VERSION" ] && [ -n "$PACKAGE" ] && [ -n "$ARCHITECTURE" ]

for command_name in gzip jq node rg; do
	command -v "$command_name" >/dev/null 2>&1 || {
		echo "Required check tool is missing: $command_name" >&2
		exit 1
	}
done

sh -n \
	"$ROOT_DIR/scripts/build-ipk.sh" \
	"$ROOT_DIR/packaging/preinst" \
	"$ROOT_DIR/packaging/postinst" \
	"$ROOT_DIR/packaging/prerm" \
	"$ROOT_DIR/work/camera-network/root/etc/init.d/camera-network-monitor" \
	"$ROOT_DIR/work/camera-network/root/usr/sbin/camera-network-monitor" \
	"$ROOT_DIR/work/camera-network/root/usr/sbin/camera-network-leds" \
	"$ROOT_DIR/work/camera-network/root/usr/sbin/camera-network-button" \
	"$ROOT_DIR/work/camera-network/root/usr/sbin/camera-network-client-leds" \
	"$ROOT_DIR/work/camera-network/root/usr/sbin/camera-network-pair-client" \
	"$ROOT_DIR/work/camera-network/root/usr/sbin/camera-network-static-ip"

"$ROOT_DIR/work/camera-network/root/usr/sbin/camera-network-static-ip" self-test
(cd "$ROOT_DIR" && node scripts/test-leds.mjs)
(cd "$ROOT_DIR" && node scripts/test-button.mjs)
(cd "$ROOT_DIR" && node scripts/test-led-telemetry.mjs)
(cd "$ROOT_DIR" && node scripts/test-led-ui.mjs)

node --check "$DASHBOARD_SOURCE"
jq empty \
	"$ROOT_DIR/work/camera-network/root/usr/share/luci/menu.d/luci-app-camera-network.json" \
	"$ROOT_DIR/work/camera-network/root/usr/share/rpcd/acl.d/luci-app-camera-network.json"

# Mobile rows must target tbody explicitly. A generic :first-child or
# :not(:first-child) selector hides or deforms the first discovered device.
if rg -n -F \
	-e '.camera-dashboard .camera-table-scroll tr:first-child' \
	-e '.camera-dashboard .camera-table-scroll tr:not(:first-child)' \
	"$DASHBOARD_SOURCE"; then
	echo "Unsafe mobile discovered-device row selector found" >&2
	exit 1
fi
grep -Fq '.camera-dashboard .camera-table-scroll tbody tr {' "$DASHBOARD_SOURCE"
rg -q -U '\.camera-dashboard \.camera-device-actions \{\n\s*display:grid;\n\s*grid-template-columns:repeat\(2,minmax\(0,1fr\)\);' "$DASHBOARD_SOURCE"
grep -Fq '.camera-dashboard .camera-filter-group { display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%; }' "$DASHBOARD_SOURCE"
grep -Fq '.camera-dashboard .camera-device-ip a { color:inherit;text-decoration:none; }' "$DASHBOARD_SOURCE"

"$ROOT_DIR/scripts/build-ipk.sh" "$IPK"
gzip -t "$IPK"
actual_outer="$(tar -tzf "$IPK" | LC_ALL=C sort)"
expected_outer="$(printf '%s\n' ./control.tar.gz ./data.tar.gz ./debian-binary | LC_ALL=C sort)"
test "$actual_outer" = "$expected_outer"

mkdir -p "$TMP_DIR/outer"
tar -xzf "$IPK" -C "$TMP_DIR/outer"
mkdir -p "$TMP_DIR/control" "$TMP_DIR/data"
tar -xzf "$TMP_DIR/outer/control.tar.gz" -C "$TMP_DIR/control"
tar -xzf "$TMP_DIR/outer/data.tar.gz" -C "$TMP_DIR/data"

test "$(cat "$TMP_DIR/outer/debian-binary")" = "2.0"
test "$(sed -n 's/^Package:[[:space:]]*//p' "$TMP_DIR/control/control" | head -n1)" = "$PACKAGE"
test "$(sed -n 's/^Version:[[:space:]]*//p' "$TMP_DIR/control/control" | head -n1)" = "$VERSION"
test "$(sed -n 's/^Architecture:[[:space:]]*//p' "$TMP_DIR/control/control" | head -n1)" = "$ARCHITECTURE"
CACHE_VERSION="$(printf '%s' "$VERSION" | tr -c 'A-Za-z0-9' '_')"
grep -q "camera-network/index-v${CACHE_VERSION}" \
	"$TMP_DIR/data/usr/share/luci/menu.d/luci-app-camera-network.json"
test -f "$TMP_DIR/data/www/luci-static/resources/view/camera-network/index-v${CACHE_VERSION}.js"

if find "$TMP_DIR/data" -type f -path '*roadlink*' -print | grep -q .; then
	echo "RoadLink files remain in the package" >&2
	exit 1
fi
if rg -n 'halow-mode|roadlink/' "$TMP_DIR/data"; then
	echo "Removed RoadLink integration remains in the package" >&2
	exit 1
fi

expected_ipk_name="${PACKAGE}_${VERSION}_${ARCHITECTURE}.ipk"
grep -q "$expected_ipk_name" "$ROOT_DIR/README.md"
grep -q "$expected_ipk_name" "$ROOT_DIR/outputs/Camera-Network-安装说明.md"

# Build twice to catch timestamps or ordering that make release artifacts
# differ even though their source tree is identical.
"$ROOT_DIR/scripts/build-ipk.sh" "$IPK_SECOND"
cmp -s "$IPK" "$IPK_SECOND" || {
	echo "IPK build is not reproducible" >&2
	exit 1
}

if rg -n --hidden --glob '!.git/**' --glob '!outputs/*.ipk' --glob '!scripts/check.sh' \
		'BEGIN (OPENSSH |RSA |EC )?PRIVATE KEY|Device Password:|Wi-Fi Password:' "$ROOT_DIR"; then
	echo "Potential secret material found" >&2
	exit 1
fi

echo "All checks passed for $VERSION"
