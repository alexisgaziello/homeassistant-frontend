# Home Assistant Frontend User Preferences

This document provides a comprehensive overview of how user preferences are implemented and stored in the Home Assistant frontend.

## Overview

Home Assistant uses a distributed preference system with two main storage mechanisms:
1. **System-wide preferences**: Stored in core configuration (backend)
2. **Per-user UI preferences**: Stored in frontend user data and localStorage

## Preference Components Location

All user preference UI components are located in:
```
/src/panels/profile/
```

### Available Preference Components

| Component | File | Storage Type | Description |
|-----------|------|--------------|-------------|
| `ha-pick-language-row` | `ha-pick-language-row.ts` | Core Config + Frontend | Language selection |
| `ha-pick-number-format-row` | `ha-pick-number-format-row.ts` | Frontend User Data | Number format (1,234.56 vs 1.234,56) |
| `ha-pick-time-format-row` | `ha-pick-time-format-row.ts` | Frontend User Data | Time format (12h vs 24h) |
| `ha-pick-date-format-row` | `ha-pick-date-format-row.ts` | Frontend User Data | Date format (DMY, MDY, YMD) |
| `ha-pick-time-zone-row` | `ha-pick-time-zone-row.ts` | Core Config | Timezone selection |
| `ha-pick-first-weekday-row` | `ha-pick-first-weekday-row.ts` | Frontend User Data | First day of week |
| `ha-pick-dashboard-row` | `ha-pick-dashboard-row.ts` | localStorage | Default dashboard selection |
| `ha-advanced-mode-row` | `ha-advanced-mode-row.ts` | Frontend User Data | Advanced mode toggle |
| `ha-entity-id-picker-row` | `ha-entity-id-picker-row.ts` | Frontend User Data | Entity ID picker toggle |

## Storage Architecture

### 1. Core Configuration (Backend)
**Location**: `homeassistant/core_config.py` (Python backend)
**API**: `config/core/update` websocket command
**Preferences**:
- `language`: System language
- `time_zone`: System timezone
- `country`: Country code
- `currency`: Currency
- `latitude`, `longitude`, `elevation`: Location
- `unit_system`: Metric vs Imperial

### 2. Frontend User Data (Per-User)
**Storage**: `frontend.user_data_{user_id}` via websocket API
**API Commands**:
- `frontend/set_user_data`
- `frontend/get_user_data` 
- `frontend/subscribe_user_data`

**Storage Keys**:
- `"language"`: Locale preferences (number_format, time_format, date_format, first_weekday, time_zone)
- `"core"`: Core UI preferences (showAdvanced, showEntityIdPicker)

### 3. localStorage (Browser-Specific)
**Location**: `window.localStorage`
**Managed by**: `/src/util/ha-pref-storage.ts`
**Keys**: `dockedSidebar`, `selectedTheme`, `selectedLanguage`, `vibrate`, `debugConnection`, `suspendWhenHidden`, `enableShortcuts`, `defaultPanel`

## Data Types and Enums

**File**: `/src/data/translation.ts`

```typescript
export enum NumberFormat {
  language = "language",
  system = "system", 
  comma_decimal = "comma_decimal",
  decimal_comma = "decimal_comma",
  quote_decimal = "quote_decimal",
  space_comma = "space_comma",
  none = "none"
}

export enum TimeFormat {
  language = "language",
  system = "system",
  am_pm = "12",
  twenty_four = "24"
}

export enum DateFormat {
  language = "language",
  system = "system",
  DMY = "DMY",
  MDY = "MDY", 
  YMD = "YMD"
}

export enum FirstWeekday {
  language = "language",
  monday = "monday",
  tuesday = "tuesday",
  wednesday = "wednesday",
  thursday = "thursday",
  friday = "friday",
  saturday = "saturday",
  sunday = "sunday"
}

export interface FrontendLocaleData {
  language: string;
  number_format: NumberFormat;
  time_format: TimeFormat;
  date_format: DateFormat;
  first_weekday: FirstWeekday;
  time_zone: TimeZone;
}
```

## Event Flow Examples

### Dashboard Selection Flow

1. **User selects dashboard** in `ha-pick-dashboard-row`
2. `_dashboardChanged(ev)` called
3. `setDefaultPanel(this, urlPath)` called
4. `fireEvent(element, "hass-default-panel", { defaultPanel: urlPath })` fired
5. `sidebar-mixin` event listener catches event
6. `this._updateHass({ defaultPanel: ev.detail.defaultPanel })` updates state
7. `storeState(this.hass!)` called
8. `window.localStorage.setItem("defaultPanel", JSON.stringify(urlPath))` saves to localStorage

**Code Path**:
```
ha-pick-dashboard-row.ts:79 → 
data/panel.ts:17 → 
state/sidebar-mixin.ts:35-37 → 
util/ha-pref-storage.ts:18-21
```

### Advanced Mode Toggle Flow

1. **User toggles switch** in `ha-advanced-mode-row`
2. `_advancedToggled(ev)` called
3. `saveFrontendUserData(this.hass.connection, "core", { ...this.coreUserData, showAdvanced: ev.currentTarget.checked })` called
4. Data saved to `frontend.user_data_{user_id}` storage with key `"core"`

### Locale Preferences Flow

1. **User changes format** in any locale preference component
2. Component fires event (e.g., `hass-number-format-select`)
3. Parent component calls `saveTranslationPreferences(hass, data)`
4. `saveFrontendUserData(hass.connection, "language", data)` called
5. Data saved to `frontend.user_data_{user_id}` storage with key `"language"`

## Profile Section Integration

**File**: `/src/panels/profile/ha-profile-section-general.ts`

The main profile section assembles all preference components:

```typescript
// User Settings Card (lines 133-156)
<ha-pick-language-row .narrow=${this.narrow} .hass=${this.hass}></ha-pick-language-row>
<ha-pick-number-format-row .narrow=${this.narrow} .hass=${this.hass}></ha-pick-number-format-row>
<ha-pick-time-format-row .narrow=${this.narrow} .hass=${this.hass}></ha-pick-time-format-row>
<ha-pick-date-format-row .narrow=${this.narrow} .hass=${this.hass}></ha-pick-date-format-row>
<ha-pick-time-zone-row .narrow=${this.narrow} .hass=${this.hass}></ha-pick-time-zone-row>
<ha-pick-first-weekday-row .narrow=${this.narrow} .hass=${this.hass}></ha-pick-first-weekday-row>

// Admin-only preferences (lines 184-198)
${this.hass.user!.is_admin
  ? html`
      <ha-advanced-mode-row .hass=${this.hass} .narrow=${this.narrow} .coreUserData=${this._coreUserData}></ha-advanced-mode-row>
      <ha-entity-id-picker-row .hass=${this.hass} .narrow=${this.narrow} .coreUserData=${this._coreUserData}></ha-entity-id-picker-row>
    `
  : ""}
```

## Key Files Reference

### Core Files
- `/src/panels/profile/ha-profile-section-general.ts` - Main profile section
- `/src/data/translation.ts` - Data types and enums
- `/src/data/frontend.ts` - Frontend user data API
- `/src/data/panel.ts` - Panel/dashboard utilities
- `/src/util/ha-pref-storage.ts` - localStorage management
- `/src/state/sidebar-mixin.ts` - Event handling for UI state

### Backend Integration
- `homeassistant/core_config.py` - Core configuration (Python)
- `homeassistant/components/frontend/storage.py` - Frontend user data storage (Python)
- `homeassistant/components/config/core.py` - Core config websocket API (Python)

## Adding New Preferences

To add a new preference component:

1. **Create component file** in `/src/panels/profile/ha-pick-{preference}-row.ts`
2. **Follow existing patterns** from other preference components
3. **Add import** to `ha-profile-section-general.ts`
4. **Add component** to the appropriate card in the template
5. **Add localization keys** for labels and descriptions
6. **Choose storage mechanism**:
   - localStorage: Add to `STORED_STATE` in `ha-pref-storage.ts`
   - Frontend user data: Use `saveFrontendUserData()` API
   - Core config: Use `config/core/update` websocket command

## Localization

All preference components use the localization system:
- Header: `ui.panel.profile.{preference}.header`
- Description: `ui.panel.profile.{preference}.description`
- Dropdown label: `ui.panel.profile.{preference}.dropdown_label`
- Values: `ui.panel.profile.{preference}.values.{value}`

Localization files are managed separately in the translation system.

## Complete Flow: Setting a Preferred Dashboard

This section provides a detailed walkthrough of what happens when a user selects a preferred dashboard, from UI interaction to localStorage persistence.

### Step-by-Step Flow

#### 1. User Interface Interaction
**File**: `/src/panels/profile/ha-pick-dashboard-row.ts`

- User opens Profile → General settings
- The `ha-pick-dashboard-row` component renders a dropdown with available dashboards
- Component fetches dashboards via `fetchDashboards(this.hass)` in `firstUpdated()`
- Current selection shows `this.hass.defaultPanel` value

```typescript
// Lines 34-59: Dropdown rendering
<ha-select
  .value=${this.hass.defaultPanel}  // Current default panel
  @selected=${this._dashboardChanged}  // Event handler
>
  <ha-list-item value="lovelace">
    ${this.hass.localize("ui.panel.profile.dashboard.default_dashboard_label")}
  </ha-list-item>
  ${this._dashboards.map((dashboard) => {
    return html`
      <ha-list-item .value=${dashboard.url_path}>
        ${dashboard.title}
      </ha-list-item>
    `;
  })}
</ha-select>
```

#### 2. Event Handler Execution
**File**: `/src/panels/profile/ha-pick-dashboard-row.ts` (Lines 74-80)

When user selects a different dashboard:

```typescript
private _dashboardChanged(ev) {
  const urlPath = ev.target.value;  // Get selected dashboard URL path
  if (!urlPath || urlPath === this.hass.defaultPanel) {
    return;  // Exit if no change or same as current
  }
  setDefaultPanel(this, urlPath);  // Trigger the change process
}
```

#### 3. Panel Setting Function
**File**: `/src/data/panel.ts` (Lines 13-18)

The `setDefaultPanel` function creates and fires a custom event:

```typescript
export const setDefaultPanel = (
  element: HTMLElement,
  urlPath: string
): void => {
  fireEvent(element, "hass-default-panel", { defaultPanel: urlPath });
};
```

**What happens**: 
- Creates a `hass-default-panel` custom event
- Event payload: `{ defaultPanel: urlPath }`
- Event bubbles up the DOM tree

#### 4. Event Listener in Sidebar Mixin
**File**: `/src/state/sidebar-mixin.ts` (Lines 35-38)

The sidebar mixin listens for the `hass-default-panel` event:

```typescript
this.addEventListener("hass-default-panel", (ev) => {
  this._updateHass({ defaultPanel: ev.detail.defaultPanel });
  storeState(this.hass!);
});
```

**What happens**:
- Event listener catches the bubbled event
- Updates the Hass object with new `defaultPanel` value
- Immediately calls `storeState()` to persist the change

#### 5. State Storage Function
**File**: `/src/util/ha-pref-storage.ts` (Lines 14-32)

The `storeState` function persists preferences to localStorage:

```typescript
const STORED_STATE = [
  "dockedSidebar",
  "selectedTheme", 
  "selectedLanguage",
  "vibrate",
  "debugConnection",
  "suspendWhenHidden",
  "enableShortcuts",
  "defaultPanel",  // ← Our preference is in this list
];

export function storeState(hass: HomeAssistant) {
  try {
    STORED_STATE.forEach((key) => {
      const value = hass[key];
      window.localStorage.setItem(
        key,
        JSON.stringify(value === undefined ? null : value)
      );
    });
  } catch (err: any) {
    console.warn("Cannot store state; Are you in private mode or is your storage full?");
  }
}
```

**What happens**:
- Loops through all `STORED_STATE` keys (including `"defaultPanel"`)
- Gets the value from `hass.defaultPanel`
- Stores it in `localStorage` with key `"defaultPanel"`
- Value is JSON stringified (e.g., `"lovelace"` or `"config-dashboard"`) 

#### 6. Final localStorage Entry

**Browser localStorage result**:
```javascript
// Key: "defaultPanel"
// Value: "lovelace" (for default) or "dashboard-url-path" (for custom dashboard)
localStorage.getItem("defaultPanel"); // Returns: "\"lovelace\""
```

### Complete Code Path Summary

```
1. User clicks dropdown → ha-pick-dashboard-row.ts:36 (@selected event)
2. Event handler called → ha-pick-dashboard-row.ts:74 (_dashboardChanged)
3. Panel setter called → data/panel.ts:17 (setDefaultPanel)
4. Custom event fired → data/panel.ts:17 (fireEvent)
5. Event listener triggered → state/sidebar-mixin.ts:35 (addEventListener)
6. Hass state updated → state/sidebar-mixin.ts:36 (_updateHass)
7. Storage function called → state/sidebar-mixin.ts:37 (storeState)
8. localStorage written → util/ha-pref-storage.ts:18-21 (localStorage.setItem)
```

### State Restoration on Page Load

When the user reloads the page or opens Home Assistant:

1. **State retrieval**: `getState()` function in `ha-pref-storage.ts` reads from localStorage
2. **State application**: The `defaultPanel` value is applied to the Hass object
3. **UI update**: Components automatically reflect the stored preference
4. **Navigation**: Home Assistant uses `hass.defaultPanel` to determine the landing page

```typescript
// From ha-pref-storage.ts lines 34-53
export function getState() {
  const state = {};
  STORED_STATE.forEach((key) => {
    const storageItem = window.localStorage.getItem(key);
    if (storageItem !== null) {
      let value = JSON.parse(storageItem);
      state[key] = value;
    }
  });
  return state;
}
```

### Error Handling

- **Private browsing mode**: `storeState()` catches localStorage exceptions and logs warnings
- **Invalid dashboard**: Component validates dashboard exists before allowing selection
- **Admin permissions**: Non-admin users can't select admin-only dashboards
- **Missing dashboards**: Dropdown is disabled if no dashboards are available

This complete flow ensures that user dashboard preferences are immediately persisted and restored across sessions, providing a seamless user experience.

## Complete Flow: Setting Language Preferences

This section provides a detailed walkthrough of what happens when a user selects a language preference. Unlike dashboard preferences, language settings are stored in the backend and persist across all browsers and devices for the user.

### Step-by-Step Flow

#### 1. User Interface Interaction
**File**: `/src/panels/profile/ha-pick-language-row.ts`

- User opens Profile → General settings
- The `ha-pick-language-row` component renders a language picker dropdown
- Component shows current language from `this.hass.locale.language`
- Uses `ha-language-picker` component for the dropdown

```typescript
// Lines 14-40: Language picker rendering
<ha-settings-row .narrow=${this.narrow}>
  <span slot="heading">
    ${this.hass.localize("ui.panel.profile.language.header")}
  </span>
  <span slot="description">
    <a href="https://developers.home-assistant.io/docs/translations/" target="_blank">
      ${this.hass.localize("ui.panel.profile.language.link_promo")}
    </a>
  </span>
  <ha-language-picker
    .hass=${this.hass}
    native-name
    .label=${this.hass.localize("ui.panel.profile.language.dropdown_label")}
    .value=${this.hass.locale.language}  // Current language
    @value-changed=${this._languageSelectionChanged}  // Event handler
    naturalMenuWidth
  >
  </ha-language-picker>
</ha-settings-row>
```

#### 2. Event Handler Execution
**File**: `/src/panels/profile/ha-pick-language-row.ts` (Lines 43-49)

When user selects a different language:

```typescript
private _languageSelectionChanged(ev) {
  // Only fire event if language was changed. This prevents select updates when
  // responding to hass changes.
  if (ev.detail.value !== this.hass.language) {
    fireEvent(this, "hass-language-select", ev.detail.value);
  }
}
```

**What happens**:
- Validates that the language actually changed
- Fires `hass-language-select` custom event with the new language code
- Event bubbles up to parent component

#### 3. Parent Component Event Handling
**File**: `/src/panels/profile/ha-profile-section-general.ts`

The parent profile section listens for language selection events and handles the change:

```typescript
// Event listener in parent component (inferred from pattern)
@eventOptions({ passive: true })
private _handleLanguageSelect(ev: CustomEvent) {
  const language = ev.detail;
  // Update translation preferences
  this._updateTranslationPreferences({ 
    ...this.hass.locale, 
    language 
  });
}
```

#### 4. Translation Preferences Update
**File**: `/src/data/translation.ts` (Lines 83-86)

The `saveTranslationPreferences` function is called to persist the change:

```typescript
export const saveTranslationPreferences = (
  hass: HomeAssistant,
  data: FrontendLocaleData
) => saveFrontendUserData(hass.connection, "language", data);
```

**What happens**:
- Takes the complete locale data (including the new language)
- Calls `saveFrontendUserData()` with key `"language"`
- This stores the data in the backend user storage system

#### 5. Frontend User Data Storage
**File**: `/src/data/frontend.ts`

The `saveFrontendUserData` function sends the data to the backend:

```typescript
export const saveFrontendUserData = (
  connection: Connection,
  key: string,
  data: any
) => {
  return connection.sendMessagePromise({
    type: "frontend/set_user_data",
    key,
    value: data,
  });
};
```

**What happens**:
- Creates a websocket message of type `frontend/set_user_data`
- Payload includes key `"language"` and the complete locale data
- Sends message to Home Assistant backend via websocket connection

#### 6. Backend Storage (Python)
**File**: `homeassistant/components/frontend/storage.py` (Lines 119-127)

The backend receives the websocket message and stores the data:

```python
@websocket_api.websocket_command({
    vol.Required("type"): "frontend/set_user_data",
    vol.Required("key"): str,
    vol.Required("value"): vol.Any(bool, str, int, float, dict, list, None),
})
@websocket_api.async_response
@with_user_store
async def websocket_set_user_data(
    hass: HomeAssistant,
    connection: ActiveConnection,
    msg: dict[str, Any],
    store: UserStore,
) -> None:
    """Handle set user data command."""
    await store.async_set_item(msg["key"], msg["value"])
    connection.send_result(msg["id"])
```

**What happens**:
- Websocket command handler receives the message
- Extracts the key (`"language"`) and value (locale data)
- Calls `store.async_set_item()` to persist the data
- Data is stored in file: `frontend.user_data_{user_id}`

#### 7. File System Storage
**File**: `homeassistant/components/frontend/storage.py` (Lines 51-58)

The UserStore saves the data to the file system:

```python
async def async_set_item(self, key: str, value: Any) -> None:
    """Set an item item and save the store."""
    self.data[key] = value
    await self._store.async_save(self.data)
    for cb in self.subscriptions.get(None, []):
        cb()
    for cb in self.subscriptions.get(key, []):
        cb()
```

**What happens**:
- Updates the in-memory data dictionary
- Saves the entire user data to disk via `async_save()`
- Triggers any subscribed callbacks for real-time updates
- File location: `.storage/frontend.user_data_{user_id}`

#### 8. Final Storage Result

**Backend file storage**:
```json
// File: .storage/frontend.user_data_{user_id}
{
  "version": 1,
  "key": "frontend.user_data_{user_id}",
  "data": {
    "language": {
      "language": "es",
      "number_format": "language",
      "time_format": "language", 
      "date_format": "language",
      "first_weekday": "language",
      "time_zone": "local"
    },
    "core": {
      "showAdvanced": false,
      "showEntityIdPicker": false
    },
    "sidebar": {
      "panelOrder": ["lovelace", "config", "developer-tools", "hacs"],
      "hiddenPanels": ["shopping-list", "calendar"]
    }
  }
}
```

### Complete Code Path Summary

```
1. User selects language → ha-pick-language-row.ts:35 (@value-changed event)
2. Event handler called → ha-pick-language-row.ts:43 (_languageSelectionChanged)
3. Custom event fired → ha-pick-language-row.ts:47 (fireEvent "hass-language-select")
4. Parent handles event → ha-profile-section-general.ts (event listener)
5. Save preferences called → data/translation.ts:83 (saveTranslationPreferences)
6. Frontend data API called → data/frontend.ts (saveFrontendUserData)
7. Websocket message sent → WebSocket connection (frontend/set_user_data)
8. Backend handler called → components/frontend/storage.py:119 (websocket_set_user_data)
9. User store updated → components/frontend/storage.py:51 (async_set_item)
10. File system write → .storage/frontend.user_data_{user_id}
```

### Key Differences from Dashboard Preferences

| Aspect | Dashboard Preference | Language Preference |
|--------|---------------------|--------------------|
| **Storage Location** | `localStorage` (browser-specific) | Backend file system (cross-device) |
| **Persistence** | Single browser only | All browsers/devices for user |
| **Storage Key** | `"defaultPanel"` | `"language"` (within user data) |
| **Data Format** | Simple string | Complex locale object |
| **API Used** | Direct localStorage | Websocket + backend storage |
| **Immediate Effect** | UI navigation | UI language + future sessions |

### State Restoration on Page Load

When the user loads Home Assistant:

1. **Backend retrieval**: User data is loaded from `.storage/frontend.user_data_{user_id}`
2. **Websocket subscription**: Frontend subscribes to user data changes
3. **Locale application**: Language preference is applied to `hass.locale.language`
4. **UI update**: All components automatically use the new language
5. **Translation loading**: New language translations are fetched and applied

### Error Handling

- **Network failures**: Websocket connection errors are handled gracefully
- **Invalid languages**: Language picker validates available languages
- **Storage failures**: Backend storage errors are logged and reported
- **Fallback behavior**: System falls back to browser language if user preference fails

This flow ensures that language preferences are truly user-centric and persist across all devices and browsers where the user accesses Home Assistant.

## Sidebar Customization Storage

You're absolutely correct about sidebar order persistence! The sidebar customization (panel order and hidden panels) is also stored in the backend and persists across browsers, but it uses a different storage key.

### Sidebar Storage Details

**Storage Location**: Same backend file (`.storage/frontend.user_data_{user_id}`)
**Storage Key**: `"sidebar"`
**Data Structure**:
```json
{
  "panelOrder": ["lovelace", "config", "developer-tools", "hacs"],
  "hiddenPanels": ["shopping-list", "calendar"]
}
```

### Sidebar Customization Flow

**File**: `/src/dialogs/sidebar/dialog-edit-sidebar.ts`

1. **Data Retrieval** (Lines 51-53):
```typescript
const data = await fetchFrontendUserData(this.hass.connection, "sidebar");
this._order = data?.panelOrder;
this._hidden = data?.hiddenPanels;
```

2. **Data Saving** (Lines 195-198):
```typescript
await saveFrontendUserData(this.hass.connection, "sidebar", {
  panelOrder: this._order!,
  hiddenPanels: this._hidden!,
});
```

3. **Migration from localStorage** (Lines 56-65):
```typescript
// Fallback to old localStorage values for migration
if (!this._order) {
  const storedOrder = localStorage.getItem("sidebarPanelOrder");
  this._migrateToUserData = !!storedOrder;
  this._order = storedOrder ? JSON.parse(storedOrder) : [];
}
if (!this._hidden) {
  const storedHidden = localStorage.getItem("sidebarHiddenPanels");
  this._migrateToUserData = this._migrateToUserData || !!storedHidden;
  this._hidden = storedHidden ? JSON.parse(storedHidden) : [];
}
```

### Key Points

- **Cross-device persistence**: Like language preferences, sidebar customization persists across all browsers and devices
- **Same storage system**: Uses the same `saveFrontendUserData` API with key `"sidebar"`
- **Migration support**: Automatically migrates old localStorage-based sidebar settings to the new backend storage
- **Two components**: Stores both panel order (`panelOrder`) and hidden panels (`hiddenPanels`)

### Complete Backend Storage Keys

The `frontend.user_data_{user_id}` file can contain multiple preference categories:

| Key | Purpose | Data Type |
|-----|---------|----------|
| `"language"` | Locale preferences (language, formats, timezone) | Object with locale settings |
| `"core"` | Core UI preferences (advanced mode, entity picker) | Object with boolean flags |
| `"sidebar"` | Sidebar customization (order, hidden panels) | Object with arrays |

This explains why sidebar customization persists across browsers - it's stored in the same backend user data system as language preferences, not in localStorage like dashboard preferences.