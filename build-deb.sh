#!/bin/bash
set -e
VERSION="${1:-0.1.0}"
PKGNAME="cockpit-filebrowser"
BUILDDIR="/tmp/${PKGNAME}-deb"

# Build
npm ci 2>/dev/null || npm install
NODE_ENV=production ./build.js

# Package
rm -rf "$BUILDDIR"
mkdir -p "$BUILDDIR/DEBIAN"
mkdir -p "$BUILDDIR/usr/share/cockpit/filebrowser"
cp -r dist/* "$BUILDDIR/usr/share/cockpit/filebrowser/"

cat > "$BUILDDIR/DEBIAN/control" << EOF
Package: ${PKGNAME}
Version: ${VERSION}
Section: admin
Priority: optional
Architecture: all
Depends: cockpit
Maintainer: cockpit-filebrowser developers
Description: A modern file browser for Cockpit
 Provides file management, code editing, Markdown preview,
 permission management, and search with i18n support.
EOF

dpkg-deb --build --root-owner-group "$BUILDDIR" "${PKGNAME}_${VERSION}_all.deb"
echo "Built: ${PKGNAME}_${VERSION}_all.deb"
