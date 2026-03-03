# PWA Installation Debug Guide

## Quick Debug Steps

### 1. Enable Debug Mode

**Option A: URL Parameter**
```
https://your-site.com/?pwa-debug
```

**Option B: Browser Console**
```javascript
localStorage.setItem('pwa-debug-mode', 'true');
// Then refresh the page
```

**Option C: Click the bug icon**
- Look for a small semi-transparent bug icon in the bottom-left corner
- Click it to toggle debug panel

### 2. Check Debug Panel

Once enabled, you'll see a debug panel showing:
- Current PWA prompt status
- iOS device detection
- Whether `beforeinstallprompt` event fired
- If prompt was previously dismissed
- If app is already installed
- Real-time debug logs

### 3. Reset Prompt State

If you've dismissed the prompt and want to see it again:

**Option A: Debug Panel**
- Enable debug mode
- Click "Reset Prompt State" button

**Option B: Browser Console**
```javascript
window.resetPWAPrompt()
```

**Option C: Manual**
```javascript
localStorage.removeItem('pwa-install-dismissed');
// Then refresh the page
```

## Common Issues & Solutions

### Prompt Not Showing

**1. App Already Installed**
- Check debug panel: "Standalone mode: ✓"
- Solution: Uninstall the app first
  - Chrome: Settings → Apps → E-بيع → Uninstall
  - iOS: Long-press icon → Remove from Home Screen

**2. Previously Dismissed**
- Check debug panel: "Dismissed: ✓"
- Solution: Use "Reset Prompt State" button or:
  ```javascript
  localStorage.removeItem('pwa-install-dismissed');
  ```

**3. Browser Cooldown Period**
- Chrome blocks the prompt for ~90 days after dismissal
- Solution: Clear browser data or test in incognito mode

**4. Not HTTPS**
- PWA requires HTTPS (except localhost)
- Check: Look for 🔒 in address bar
- Solution: Deploy to HTTPS server

**5. Service Worker Issues**
- Check console for: `[PWA] Service Worker registered successfully`
- If error, check Network tab for `/sw.js` (should be 200)
- Solution: Check service worker file exists and is valid

**6. Manifest Issues**
- Open DevTools → Application → Manifest
- Look for warnings or errors
- Common issues:
  - Missing icons
  - Invalid JSON
  - Missing required fields

**7. Installation Criteria Not Met**
- Chrome DevTools → Application → Manifest → "Installability"
- Will show what's missing

### iOS Specific

**iOS doesn't support `beforeinstallprompt`**
- iOS users see manual instructions
- They must use Share button → "Add to Home Screen"
- This is a Safari/iOS limitation

## Testing Checklist

- [ ] HTTPS enabled (or using localhost)
- [ ] Service Worker registered (check console)
- [ ] Manifest.json valid (DevTools → Application)
- [ ] All manifest icons exist (check Network tab)
- [ ] Not in standalone mode (already installed)
- [ ] Prompt not previously dismissed
- [ ] Using supported browser (Chrome, Edge, Safari 16.4+)
- [ ] Not in private/incognito mode (for production)

## Debug Console Logs

Look for these in the browser console:

### Success Logs
```
[PWA] Service Worker registered successfully
[PWA] beforeinstallprompt event fired
[PWA] Custom pwa-prompt-available event dispatched
[PWA Install] beforeinstallprompt event received
```

### Warning Logs
```
[PWA Install] Prompt previously dismissed by user
[PWA Install] App already installed (running in standalone mode)
[PWA Install] Waiting for beforeinstallprompt event...
[PWA Install] Prompt not shown after 3s - possible reasons: ...
```

### Error Logs
```
[PWA] Service Worker registration failed: ...
```

## Browser DevTools Debugging

### Chrome/Edge

1. **Open DevTools** (F12)

2. **Check Application Tab**
   - Manifest: Verify all fields and icons
   - Service Workers: Should show "activated and running"
   - Storage → Local Storage: Check for `pwa-install-dismissed`

3. **Check Console Tab**
   - Look for `[PWA]` and `[PWA Install]` logs

4. **Network Tab**
   - Check `/sw.js` loads successfully (200)
   - Check all manifest icons load (200)

5. **Force Install Prompt (for testing)**
   - Console tab:
   ```javascript
   // Manually trigger if you have the event
   if (window.deferredPrompt) {
     window.deferredPrompt.prompt();
   }
   ```

### Safari (iOS)

1. **Open Web Inspector** (Settings → Safari → Advanced → Web Inspector)
2. **Connect device to Mac**
3. **Check Console** for service worker logs
4. **Note**: iOS doesn't fire `beforeinstallprompt` - users must manually add to home screen

## Production vs Development

### Development (Localhost)
- HTTPS not required
- Prompt may show more readily
- Can use debug mode freely

### Production (HTTPS)
- Browser enforces stricter rules
- Cooldown period after dismissal
- User engagement heuristics apply
- Chrome may delay prompt until user shows interest

## Need More Help?

1. **Enable debug mode** and check all status indicators
2. **Check browser console** for detailed logs
3. **Verify installation criteria** in DevTools
4. **Try incognito mode** to avoid cached state
5. **Check manifest validity** at: https://manifest-validator.appspot.com/

## Commands Reference

```javascript
// Enable debug mode
localStorage.setItem('pwa-debug-mode', 'true');
location.reload();

// Reset prompt
window.resetPWAPrompt();

// Or manually
localStorage.removeItem('pwa-install-dismissed');
location.reload();

// Check if installed
window.matchMedia('(display-mode: standalone)').matches

// Check if prompt available
window.deferredPrompt !== null
```
