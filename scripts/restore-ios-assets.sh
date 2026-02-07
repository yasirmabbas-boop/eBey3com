#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ASSETS_DIR="$PROJECT_DIR/ios-assets"
IOS_APP="$PROJECT_DIR/ios/App/App"

if [ ! -d "$ASSETS_DIR" ]; then
  echo "Error: ios-assets/ folder not found"
  exit 1
fi

echo "Restoring custom iOS assets..."

cp -f "$ASSETS_DIR/AppIcon.appiconset/AppIcon-512@2x.png" "$IOS_APP/Assets.xcassets/AppIcon.appiconset/"
cp -f "$ASSETS_DIR/AppIcon.appiconset/Contents.json" "$IOS_APP/Assets.xcassets/AppIcon.appiconset/"

cp -f "$ASSETS_DIR/Splash.imageset/splash-2732x2732.png" "$IOS_APP/Assets.xcassets/Splash.imageset/"
cp -f "$ASSETS_DIR/Splash.imageset/splash-2732x2732-1.png" "$IOS_APP/Assets.xcassets/Splash.imageset/"
cp -f "$ASSETS_DIR/Splash.imageset/splash-2732x2732-2.png" "$IOS_APP/Assets.xcassets/Splash.imageset/"
cp -f "$ASSETS_DIR/Splash.imageset/Contents.json" "$IOS_APP/Assets.xcassets/Splash.imageset/"

cp -f "$ASSETS_DIR/GoogleService-Info.plist" "$IOS_APP/"
cp -f "$ASSETS_DIR/CustomViewController.swift" "$IOS_APP/"

echo "Custom iOS assets restored successfully!"
