#!/usr/bin/env python3
"""Add early return to setupFacebookAuth when FB credentials are missing."""
import sys

path = "server/auth-facebook.ts"
if len(sys.argv) > 1:
    path = sys.argv[1]

with open(path, "r") as f:
    content = f.read()

# Check if already fixed
if "if (!FB_APP_ID || !FB_APP_SECRET) {\n    return;" in content and "Skip Facebook auth" in content:
    print("Already has early return")
    sys.exit(0)

# Pattern to find - the function start (flexible whitespace)
old_pattern = "export function setupFacebookAuth(app: Express): void {\n  // Configure Facebook Passport Strategy"
new_text = """export function setupFacebookAuth(app: Express): void {
  if (!FB_APP_ID || !FB_APP_SECRET) {
    return; // Skip Facebook auth when credentials not configured (e.g. local dev)
  }

  // Configure Facebook Passport Strategy"""

if old_pattern in content:
    content = content.replace(old_pattern, new_text)
    with open(path, "w") as f:
        f.write(content)
    print("Added early return")
    sys.exit(0)

# Alternative pattern - maybe no "// " before Configure
old2 = "export function setupFacebookAuth(app: Express): void {\n  passport.use("
new2 = """export function setupFacebookAuth(app: Express): void {
  if (!FB_APP_ID || !FB_APP_SECRET) {
    return; // Skip Facebook auth when credentials not configured (e.g. local dev)
  }

  passport.use("""

if old2 in content:
    content = content.replace(old2, new2)
    with open(path, "w") as f:
        f.write(content)
    print("Added early return (alt pattern)")
    sys.exit(0)

print("ERROR: Could not find insertion point. Your file may have different structure.")
print("Please add this at the start of setupFacebookAuth (right after the opening brace):")
print("  if (!FB_APP_ID || !FB_APP_SECRET) {")
print("    return;")
print("  }")
sys.exit(1)
