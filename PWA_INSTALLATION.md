# PWA Installation Guide

## AT&T NetBond® Advanced - Progressive Web App

Your app is now a fully functional Progressive Web App (PWA) that can be installed and run independently on any device.

---

## Features

✅ **Installable** - Add to home screen on any device
✅ **Offline Capable** - Works without internet (cached content)
✅ **Auto-Updates** - Automatically checks for new versions
✅ **Fast Loading** - Service worker caching for instant load
✅ **Native Feel** - Runs in standalone window without browser UI
✅ **Cross-Platform** - Works on desktop, mobile, and tablet

---

## Installation Instructions

### Desktop (Chrome, Edge, Brave)

1. **Visit the deployed URL** in Chrome/Edge/Brave
2. Look for the **install icon** (⊕) in the address bar
3. Click it and select **"Install"**
4. The app opens as a standalone window
5. Find it in your Applications folder or Start Menu

**Alternative:**
- Click the menu (⋮) → **Install AT&T NetBond® Advanced**

### Desktop (Safari/Firefox)

Safari and Firefox don't support PWA installation on desktop, but the app still works in the browser with full functionality.

### iOS (iPhone/iPad)

1. Open the app in **Safari** (not Chrome)
2. Tap the **Share** button (square with arrow)
3. Scroll down and tap **"Add to Home Screen"**
4. Tap **"Add"** in the top-right
5. The app icon appears on your home screen

### Android

1. Open the app in **Chrome**
2. Tap the menu (⋮)
3. Select **"Install app"** or **"Add to Home screen"**
4. Tap **Install** in the prompt
5. The app icon appears in your app drawer

---

## Features After Installation

### Offline Access
- View cached connections and data
- Navigate through the app
- Limited functionality for actions requiring network

### Automatic Updates
- When online, the app checks for updates every hour
- You'll see a notification when an update is available
- Click "Update Now" to get the latest version

### App Shortcuts
Right-click the app icon (or long-press on mobile) to access shortcuts:
- **Create Connection** - Jump directly to connection wizard
- **Monitor Network** - View monitoring dashboard
- **Manage Connections** - View all connections

### Standalone Experience
- No browser UI clutter
- Full screen space for your work
- Desktop taskbar/dock integration
- Separate window from browser

---

## Usage Without Installation

The app works perfectly in any modern browser without installation. PWA features like offline caching and auto-updates still function.

---

## Uninstalling the App

### Desktop
- **Windows:** Settings → Apps → AT&T NetBond® Advanced → Uninstall
- **Mac:** Right-click app icon → Move to Trash
- **Chrome:** chrome://apps → right-click app → Remove

### Mobile
- **iOS:** Long-press icon → Remove App
- **Android:** Long-press icon → Uninstall

---

## Technical Details

### Browser Compatibility

| Feature | Chrome/Edge | Safari | Firefox |
|---------|-------------|--------|---------|
| Install to Desktop | ✅ | ❌ | ❌ |
| Install to Mobile | ✅ | ✅ | ✅ |
| Offline Caching | ✅ | ✅ | ✅ |
| Auto Updates | ✅ | ✅ | ✅ |
| App Shortcuts | ✅ | ❌ | ❌ |

### What's Cached

- **App Shell:** HTML, CSS, JavaScript (2.2 MB)
- **Static Assets:** Fonts, icons, images
- **App Data:** Stored in the browser via localStorage (no network fetch)
- **External Fonts:** 1-year cache for Google Fonts

### Storage Requirements

- **Initial Install:** ~3-5 MB
- **Maximum Cache:** 50 MB
- **Automatic Cleanup:** Old cache cleared on updates

---

## Deployment Checklist

When deploying to production:

1. ✅ Generate proper app icons (replace placeholder icons)
2. ✅ Update `manifest.json` with production URLs
3. ✅ Set correct `start_url` in manifest
4. ✅ Test installation on multiple devices
5. ✅ Verify offline functionality
6. ✅ Test update mechanism
7. ✅ Configure HTTPS (required for PWA)

---

## Icon Requirements

For production, replace placeholder icons in `/public/` with:

- **72x72** - Chrome mobile
- **96x96** - Windows app tile
- **128x128** - Chrome web store
- **144x144** - Microsoft tile
- **152x152** - iOS (non-retina)
- **192x192** - Android Chrome (standard)
- **384x384** - Android Chrome (high-res)
- **512x512** - Android splash screen

**Format:** PNG with transparent background
**Style:** Follow AT&T brand guidelines
**Tool:** Use https://realfavicongenerator.net/ to generate all sizes

---

## Troubleshooting

### Install Button Not Showing
- Ensure HTTPS is enabled (localhost works for testing)
- Check browser compatibility
- Clear cache and reload
- Verify `manifest.json` is accessible

### App Not Working Offline
- Check service worker registration in DevTools
- Verify files are cached (Application → Cache Storage)
- Ensure data was loaded at least once online

### Updates Not Appearing
- Check console for service worker errors
- Manually check: DevTools → Application → Service Workers → Update
- Clear cache and reinstall if needed

---

## Support

For issues or questions:
- Check browser console for errors
- Review service worker status in DevTools
- Verify network connectivity
- Try reinstalling the app

**Service Worker Debug:**
- Chrome: DevTools → Application → Service Workers
- Firefox: about:serviceworkers
- Safari: Develop → Service Workers
