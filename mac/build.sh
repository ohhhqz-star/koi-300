#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"
ROOT="$(pwd)"
BUILD="$ROOT/build"
DIST="$ROOT/dist"
APP_NAME="复盘 300"
APP="$BUILD/$APP_NAME.app"
VERSION="$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$ROOT/Info.plist")"
SDK="$(xcrun --show-sdk-path)"
ARCHS="${ARCHS:-arm64 x86_64}"

rm -rf "$BUILD"
mkdir -p "$BUILD" "$DIST" "$APP/Contents/MacOS" "$APP/Contents/Resources"

echo "==> Compiling Swift sources for: $ARCHS"
BINARIES=()
for ARCH in $ARCHS; do
  OUT="$BUILD/InvestmentReview-$ARCH"
  echo "    - $ARCH"
  swiftc -O -parse-as-library \
    -target "${ARCH}-apple-macos14.0" \
    -sdk "$SDK" \
    Sources/*.swift \
    -o "$OUT" \
    -framework SwiftUI -framework AppKit -framework UniformTypeIdentifiers
  BINARIES+=("$OUT")
done

if [ "${#BINARIES[@]}" -gt 1 ]; then
  lipo -create "${BINARIES[@]}" -output "$BUILD/InvestmentReview"
else
  cp "${BINARIES[0]}" "$BUILD/InvestmentReview"
fi

cp "$ROOT/Info.plist" "$APP/Contents/Info.plist"
cp "$BUILD/InvestmentReview" "$APP/Contents/MacOS/InvestmentReview"
cp "$ROOT/Resources/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"
cp "$ROOT/Resources/SeedData.json" "$APP/Contents/Resources/SeedData.json"
printf 'APPL????' > "$APP/Contents/PkgInfo"
chmod +x "$APP/Contents/MacOS/InvestmentReview"

echo "==> Ad-hoc signing"
codesign --force --deep --sign - "$APP" >/dev/null
codesign --verify --deep --strict "$APP"

ZIP_NAME="Fupan300-macOS-${VERSION}-universal.zip"
rm -f "$DIST/$ZIP_NAME"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$DIST/$ZIP_NAME"
shasum -a 256 "$DIST/$ZIP_NAME" | tee "$DIST/$ZIP_NAME.sha256"

echo
echo "Built:  $APP"
echo "Zip:    $DIST/$ZIP_NAME"
echo "Data:   ~/Library/Application Support/复盘 300/data.json"
