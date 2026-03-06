# Versioning Guide

Soccer Coach App uses **Semantic Versioning** (MAJOR.MINOR.PATCH)

## Current Version: 1.10.1

- **MAJOR** (1): Breaking changes or major feature releases
- **MINOR** (10): New features or significant feature updates  
- **PATCH** (1): Bug fixes and minor improvements

## How to Update Version for Bug Fixes

When implementing a bug fix, increment the **PATCH** version:

### 1. Update `dist_v2/version.json`

Edit the version file and update:
- `version`: Increment patch number (e.g., 1.10.1 → 1.10.2)
- `lastUpdated`: Use current date (YYYY-MM-DD)
- `changelog`: Add entry describing the bug fix

**Example:**
```json
{
  "version": "1.10.2",
  "lastUpdated": "2026-03-06",
  "changelog": {
    "1.10.2": "Bug fix: Fixed player filtering in formation setup",
    "1.10.1": "Bug fixes: Team switching, statistics isolation",
    ...
  }
}
```

### 2. Update Script Cache Busting (Optional)

The app automatically loads the version from `version.json`, so the `<script>` tag cache parameter updates dynamically. However, to force browser cache refresh immediately after deployment:

In `dist_v2/index.html` line ~563:
```html
<script src="js/app.js?v=1.10.2"></script>
```

### 3. Test the Version Display

After updating:
1. Refresh the browser
2. The header should display the new version from `version.json`
3. Version is stored in `window.APP_VERSION` for exports

## Version Loading Flow

```
version.json 
    ↓
fetch in index.html
    ↓
document.getElementById('app-version').textContent = 'v' + data.version
    ↓
window.APP_VERSION = data.version (available to app.js)
    ↓
exports use window.APP_VERSION || fallback
```

## Files That Reference Version

- `dist_v2/version.json` - **Single source of truth**
- `dist_v2/index.html` - Fetches and displays version (line ~24, ~563-575)
- `dist_v2/js/app.js` - Uses `window.APP_VERSION` in exports (line ~1318)

## Quick Increment Process

For each bug fix:
1. Open `dist_v2/version.json`
2. Increment patch version: `1.10.0` → `1.10.1`
3. Update `lastUpdated` date
4. Add changelog entry
5. Done! No other files need manual updates (version loads automatically)
