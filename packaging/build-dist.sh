#!/bin/bash
# Build distribution packages for cockpit-filebrowser
# Usage: ./packaging/build-dist.sh [deb|rpm|all]
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_DIR"

VERSION=$(node -e "console.log(require('./package.json').version)")
PACKAGE_NAME="cockpit-filebrowser"

echo "=== Building $PACKAGE_NAME v$VERSION ==="

# Ensure dist/ is built
if [ ! -d dist ]; then
    echo "Building dist/..."
    npm install
    npm run build
fi

mkdir -p "$PROJECT_DIR/output"

build_deb() {
    echo ""
    echo "=== Building .deb package ==="
    if ! command -v dpkg-deb &>/dev/null; then
        echo "ERROR: dpkg-deb not found. Install dpkg or run on Debian/Ubuntu."
        return 1
    fi

    local BUILD_DIR="$PROJECT_DIR/output/deb-build"
    rm -rf "$BUILD_DIR"
    mkdir -p "$BUILD_DIR/DEBIAN"
    mkdir -p "$BUILD_DIR/usr/share/cockpit/filebrowser"

    cp -r dist/* "$BUILD_DIR/usr/share/cockpit/filebrowser/"

    cat > "$BUILD_DIR/DEBIAN/control" << EOF
Package: $PACKAGE_NAME
Version: $VERSION
Architecture: all
Maintainer: tetrisKun <tetrisKun@users.noreply.github.com>
Depends: cockpit (>= 137)
Recommends: tar, zip, unzip, p7zip-full
Section: admin
Priority: optional
Homepage: https://github.com/tetrisKun/cockpit-filebrowser
Description: Modern file browser plugin for Cockpit web console
 A full-featured file browser for the Cockpit web administration interface.
 Features include file browsing, Monaco editor, upload with progress,
 archive compress/extract, clipboard operations, and 20 language translations.
EOF

    dpkg-deb --build "$BUILD_DIR" "$PROJECT_DIR/output/${PACKAGE_NAME}_${VERSION}_all.deb"
    rm -rf "$BUILD_DIR"
    echo "Built: output/${PACKAGE_NAME}_${VERSION}_all.deb"
}

build_rpm() {
    echo ""
    echo "=== Building .rpm package ==="
    if ! command -v rpmbuild &>/dev/null; then
        echo "ERROR: rpmbuild not found. Install rpm-build."
        return 1
    fi

    local RPM_BUILD="$PROJECT_DIR/output/rpm-build"
    rm -rf "$RPM_BUILD"
    mkdir -p "$RPM_BUILD"/{BUILD,RPMS,SOURCES,SPECS,SRPMS}

    # Create tarball with correct structure
    local TARBALL_DIR="$RPM_BUILD/tarball/$PACKAGE_NAME-$VERSION"
    mkdir -p "$TARBALL_DIR/share/cockpit/filebrowser"
    cp -r dist/* "$TARBALL_DIR/share/cockpit/filebrowser/"
    tar czf "$RPM_BUILD/SOURCES/$PACKAGE_NAME-$VERSION.tar.gz" \
        -C "$RPM_BUILD/tarball" "$PACKAGE_NAME-$VERSION"
    rm -rf "$RPM_BUILD/tarball"

    cp "$PROJECT_DIR/$PACKAGE_NAME.spec" "$RPM_BUILD/SPECS/"

    rpmbuild -bb \
        --define "_topdir $RPM_BUILD" \
        "$RPM_BUILD/SPECS/$PACKAGE_NAME.spec"

    cp "$RPM_BUILD"/RPMS/noarch/*.rpm "$PROJECT_DIR/output/"
    rm -rf "$RPM_BUILD"
    echo "Built: output/$(ls output/*.rpm 2>/dev/null | head -1 | xargs basename)"
}

case "${1:-all}" in
    deb)  build_deb ;;
    rpm)  build_rpm ;;
    all)  build_deb; build_rpm ;;
    *)    echo "Usage: $0 [deb|rpm|all]"; exit 1 ;;
esac

echo ""
echo "=== Done ==="
ls -lh "$PROJECT_DIR/output/"*.{deb,rpm} 2>/dev/null || true
