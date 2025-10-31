# Default Dashboard User Preference Implementation Plan

This document outlines the plan to implement a dual default dashboard preference system that allows users to set both user-wide (backend) and browser-specific (localStorage) default dashboards.

## Overview

The goal is to enhance the existing `ha-pick-dashboard-row` component to support two levels of default dashboard preferences:

1. **User-wide default** (stored in backend) - applies across all browsers and devices
2. **Browser-specific override** (stored in localStorage) - overrides the user-wide default for a specific browser

## User Experience

### Preference Hierarchy
```
Browser-specific override (localStorage)
    ↓ (if not set)
User-wide default (backend core)
    ↓ (if not set)
System default ("lovelace")
```

### User Interface Design

The `ha-pick-dashboard-row` component will be enhanced to show both preferences:

```
┌─────────────────────────────────────────────────────────────┐
│ Default Dashboard                                           │
│ Choose your default dashboard across all devices           │
│                                                             │
│ User Default:     [Overview ▼]                            │
│ Browser Override: [Same as user default ▼]                │
│                                                             │
│ ℹ️ Browser override only affects this browser              │
└─────────────────────────────────────────────────────────────┘
```

### Dropdown Options for Browser Override
- **"Same as user default"** (clears localStorage override)
- **"Overview"** (lovelace)
- **Custom dashboards...**

## Technical Implementation

### 1. Data Structure Changes

#### Backend Storage (core key)
```json
"core": {
  "showAdvanced": false,
  "showEntityIdPicker": false,
  "defaultPanel": "lovelace"  // New: user-wide default
}
```

#### localStorage (unchanged)
```javascript
// Key: "defaultPanel"
// Value: "dashboard-url" or null (for no override)
localStorage.getItem("defaultPanel"); // "config" or null
```

### 2. Component Enhancement

#### File: `/src/panels/profile/ha-pick-dashboard-row.ts`

**New Properties:**
```typescript
@state() private _userDefault?: string;      // From backend
@state() private _browserOverride?: string;  // From localStorage
@state() private _coreUserData?: CoreFrontendUserData;
```

**Enhanced Rendering:**
```typescript
protected render(): TemplateResult {
  return html`
    <ha-settings-row .narrow=${this.narrow}>
      <span slot="heading">
        ${this.hass.localize("ui.panel.profile.dashboard.header")}
      </span>
      <span slot="description">
        ${this.hass.localize("ui.panel.profile.dashboard.description")}
      </span>
      
      <!-- User-wide Default -->
      <div class="preference-row">
        <label>${this.hass.localize("ui.panel.profile.dashboard.user_default")}</label>
        <ha-select
          .value=${this._userDefault || "lovelace"}
          @selected=${this._userDefaultChanged}
          naturalMenuWidth
        >
          ${this._renderDashboardOptions()}
        </ha-select>
      </div>
      
      <!-- Browser Override -->
      <div class="preference-row">
        <label>${this.hass.localize("ui.panel.profile.dashboard.browser_override")}</label>
        <ha-select
          .value=${this._browserOverride || "__user_default__"}
          @selected=${this._browserOverrideChanged}
          naturalMenuWidth
        >
          <ha-list-item value="__user_default__">
            ${this.hass.localize("ui.panel.profile.dashboard.same_as_user")}
          </ha-list-item>
          ${this._renderDashboardOptions()}
        </ha-select>
      </div>
      
      <div class="info-text">
        <ha-icon icon="mdi:information"></ha-icon>
        ${this.hass.localize("ui.panel.profile.dashboard.browser_info")}
      </div>
    </ha-settings-row>
  `;
}
```

**Event Handlers:**
```typescript
private async _userDefaultChanged(ev) {
  const urlPath = ev.target.value;
  try {
    await saveFrontendUserData(this.hass.connection, "core", {
      ...this._coreUserData,
      defaultPanel: urlPath
    });
    this._userDefault = urlPath;
    this._updateEffectiveDefault();
  } catch (err) {
    // Handle error
  }
}

private _browserOverrideChanged(ev) {
  const value = ev.target.value;
  
  if (value === "__user_default__") {
    // Clear browser override
    localStorage.removeItem("defaultPanel");
    this._browserOverride = undefined;
  } else {
    // Set browser override
    localStorage.setItem("defaultPanel", JSON.stringify(value));
    this._browserOverride = value;
  }
  
  this._updateEffectiveDefault();
}

private _updateEffectiveDefault() {
  const effectiveDefault = this._browserOverride || this._userDefault || "lovelace";
  fireEvent(this, "hass-default-panel", { defaultPanel: effectiveDefault });
}
```

### 3. Data Loading Logic

**Enhanced Data Fetching:**
```typescript
protected async firstUpdated(changedProps: PropertyValues) {
  super.firstUpdated(changedProps);
  await this._loadPreferences();
  this._getDashboards();
}

private async _loadPreferences() {
  try {
    // Load user-wide default from backend
    this._coreUserData = await fetchFrontendUserData(this.hass.connection, "core") || {};
    this._userDefault = this._coreUserData.defaultPanel;
    
    // Load browser override from localStorage
    const storedOverride = localStorage.getItem("defaultPanel");
    this._browserOverride = storedOverride ? JSON.parse(storedOverride) : undefined;
    
  } catch (err) {
    console.error("Failed to load dashboard preferences:", err);
  }
}
```

### 4. Default Panel Resolution Logic

**New Utility Function:**
```typescript
// File: /src/data/panel.ts
export const getEffectiveDefaultPanel = (hass: HomeAssistant): string => {
  // 1. Check browser override (localStorage)
  const browserOverride = localStorage.getItem("defaultPanel");
  if (browserOverride) {
    try {
      const parsed = JSON.parse(browserOverride);
      if (parsed && hass.panels[parsed]) {
        return parsed;
      }
    } catch (e) {
      // Invalid localStorage data, ignore
    }
  }
  
  // 2. Check user-wide default (backend)
  if (hass.defaultPanel && hass.panels[hass.defaultPanel]) {
    return hass.defaultPanel;
  }
  
  // 3. Fall back to system default
  return DEFAULT_PANEL; // "lovelace"
};
```

### 5. Integration Points

#### Update Main App Navigation
**File**: `/src/layouts/home-assistant.ts`

```typescript
// Replace direct hass.defaultPanel usage with effective default
const effectiveDefaultPanel = getEffectiveDefaultPanel(this.hass);
```

#### Update State Management
**File**: `/src/state/sidebar-mixin.ts`

```typescript
// Keep existing localStorage handling for browser override
// Add backend sync for user-wide default
this.addEventListener("hass-default-panel", (ev) => {
  // This now handles the effective default (browser override takes precedence)
  this._updateHass({ defaultPanel: ev.detail.defaultPanel });
  // Note: Don't call storeState here anymore for user default
  // Browser override is handled separately in the component
});
```

### 6. Backward Compatibility

**No Migration Required:**
- Existing localStorage preferences remain as browser-specific overrides
- Users with existing browser preferences will see them in the "Browser Override" dropdown
- User-wide default starts empty (system default) until explicitly set
- This preserves existing user behavior without assumptions about intent

## Localization Keys

New localization keys needed:

```json
{
  "ui.panel.profile.dashboard.user_default": "User Default",
  "ui.panel.profile.dashboard.browser_override": "Browser Override",
  "ui.panel.profile.dashboard.same_as_user": "Same as user default",
  "ui.panel.profile.dashboard.browser_info": "Browser override only affects this browser and takes precedence over your user default."
}
```

## Testing Scenarios

### Test Cases

1. **New User**:
   - No preferences set → Uses system default ("lovelace")
   - Set user default → Applies across all browsers
   - Set browser override → Only affects current browser

2. **Existing User (No Migration)**:
   - Has localStorage preference → Remains as browser override
   - User default starts empty → Uses system default until set
   - User can choose to promote browser preference to user default if desired

3. **Multi-Browser Usage**:
   - User default "config" set
   - Browser A: No override → Uses "config"
   - Browser B: Override "lovelace" → Uses "lovelace"
   - Browser C: Override "developer-tools" → Uses "developer-tools"

4. **Edge Cases**:
   - Invalid dashboard in localStorage → Falls back to user default
   - Invalid user default → Falls back to system default
   - Dashboard deleted → Falls back gracefully

## Benefits

1. **Flexibility**: Users can have different defaults per browser while maintaining a global preference
2. **Backward Compatibility**: Existing localStorage preferences remain as browser overrides
3. **Progressive Enhancement**: Works with existing infrastructure
4. **Clear Hierarchy**: Obvious precedence order (browser > user > system)
5. **Cross-Device Sync**: User default syncs across all devices
6. **Per-Browser Customization**: Power users can customize per browser/device type

## Implementation Phases

### Phase 1: Backend Storage
- Add `defaultPanel` to core user data structure
- Update backend APIs to handle the new field

### Phase 2: Component Enhancement
- Modify `ha-pick-dashboard-row` to show both preferences
- Implement dual preference logic
- Add migration for existing localStorage preferences

### Phase 3: Integration
- Update navigation logic to use effective default
- Update state management
- Add comprehensive testing

### Phase 4: Polish
- Add localization
- Improve UI/UX
- Documentation updates

This approach provides the best of both worlds: user-wide defaults for consistency and browser-specific overrides for flexibility.