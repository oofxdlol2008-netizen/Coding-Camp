# Design Document: Personal Dashboard

## Overview

The Personal Dashboard is a zero-dependency, single-page web application that serves as a browser new-tab replacement. It is implemented entirely in HTML, CSS, and Vanilla JavaScript — no build step, no frameworks, no external requests. All state is persisted in the browser's `localStorage` API. The application is deployable as a static site on GitHub Pages and works equally well over `file://`.

The dashboard presents five widgets in a single viewport:

1. **Greeting Widget** — live clock, current date, time-of-day greeting, and personalised name
2. **Pomodoro Timer** — 25-minute countdown with start / stop / reset controls
3. **To-Do List** — add, edit, complete, sort, and delete tasks
4. **Quick Links** — add and launch URL shortcuts in new tabs
5. **Theme Toggle** — light / dark theme switch, OS-preference aware

### Design Goals

- **Zero network requests after initial page load.** Every asset is local.
- **Immediate readiness.** All persisted data is restored before the first visible render.
- **Graceful degradation.** Any `localStorage` failure results in a visible notice, not a broken UI.
- **Testable pure-logic core.** Business logic (validation, sorting, greeting lookup, serialisation) is extracted into pure functions so it can be unit-tested and property-tested without a DOM.

---

## Architecture

The application follows a **single-file JS module** pattern: one `js/app.js` file owns the full runtime. Internally it is structured as a collection of namespaced modules (plain JS objects acting as namespaces) rather than ES modules, to preserve `file://` compatibility without a bundler.

```
index.html
css/
  style.css          ← single stylesheet (light + dark theme variables)
js/
  app.js             ← single JavaScript file (all logic)
```

### Runtime Execution Order

```
DOMContentLoaded
  │
  ├─ Storage.load()          ← read & parse all localStorage keys
  │    ├─ theme              ← apply theme class BEFORE paint (prevents flash)
  │    ├─ userName
  │    ├─ todos
  │    └─ links
  │
  ├─ Theme.init()            ← honour saved / OS preference
  ├─ Greeting.init()         ← start 1-second clock tick
  ├─ Timer.init()            ← render 25:00, bind controls
  ├─ TodoList.init()         ← render restored tasks, bind controls
  ├─ QuickLinks.init()       ← render restored links, bind controls
  └─ (DOM ready for user)
```

Theme is applied synchronously before the first paint by reading `localStorage` in a `<script>` tag placed in `<head>` — this eliminates the flash-of-wrong-theme problem.

### State Management

There is no central reactive store. Each widget owns its own in-memory state (a plain JS object or array) and is responsible for:

1. Hydrating that state from `localStorage` on `init()`.
2. Mutating state in response to user actions.
3. Flushing state to `localStorage` after every mutation.
4. Re-rendering the affected DOM fragment.

This is a deliberate simplification trade-off: it avoids over-engineering for a five-widget dashboard while keeping each widget independently testable.

---

## Components and Interfaces

### 1. `Storage` module

Responsible for all `localStorage` access. Isolating this module means the rest of the codebase never calls `localStorage` directly, making it easy to stub in tests.

```js
Storage = {
  KEYS: { THEME, USER_NAME, TODOS, LINKS },

  // Returns parsed value or null; never throws
  read(key): any | null,

  // Serialises value and writes; returns true on success, false on failure
  write(key, value): boolean,
}
```

### 2. `Greeting` module

```js
Greeting = {
  // Returns "Good morning" | "Good afternoon" | "Good evening" | "Good night"
  // based on the given hour (0–23)
  getGreetingText(hour: number): string,

  // Formats a Date object to "HH:MM:SS" (24-hour)
  formatTime(date: Date): string,

  // Formats a Date object to "Weekday, Month DD, YYYY"
  formatDate(date: Date): string,

  // Validates the name: returns { valid: true } or { valid: false, reason: string }
  validateName(name: string): { valid: boolean, reason?: string },

  // Starts the 1-second tick; updates DOM
  init(): void,
}
```

### 3. `Timer` module

```js
Timer = {
  state: { remaining: 1500, running: false },

  // Returns MM:SS string from total seconds
  formatDisplay(totalSeconds: number): string,

  // Starts countdown; no-op if already running
  start(): void,

  // Pauses countdown; retains remaining
  stop(): void,

  // Stops countdown; resets remaining to 1500
  reset(): void,

  // Called when countdown reaches 0
  onComplete(): void,

  init(): void,
}
```

### 4. `TodoList` module

```js
TodoList = {
  state: { items: TodoItem[], sortMode: 'default' | 'active' | 'completed' },

  // Validates raw input; returns { valid, reason }
  validateDescription(raw: string): { valid: boolean, reason?: string },

  // Returns a new TodoItem (pure)
  createItem(description: string): TodoItem,

  // Returns sorted copy of items (pure, does not mutate)
  sortItems(items: TodoItem[], mode: SortMode): TodoItem[],

  // CRUD operations that mutate state and flush to Storage
  addItem(description: string): void,
  toggleComplete(id: string): void,
  editItem(id: string, newDescription: string): void,
  deleteItem(id: string): void,

  init(): void,
}
```

### 5. `QuickLinks` module

```js
QuickLinks = {
  state: { links: Link[] },

  // Validates label and URL; returns { valid, reason }
  validateLink(label: string, url: string): { valid: boolean, reason?: string },

  // CRUD that mutates state and flushes to Storage
  addLink(label: string, url: string): void,
  deleteLink(id: string): void,

  init(): void,
}
```

### 6. `Theme` module

```js
Theme = {
  // Returns 'dark' | 'light' considering saved preference and OS preference
  resolveInitialTheme(): 'dark' | 'light',

  // Applies theme to <html> element and persists to Storage
  apply(theme: 'dark' | 'light'): void,

  // Toggles current theme
  toggle(): void,

  init(): void,
}
```

---

## Data Models

### `TodoItem`

```js
{
  id: string,           // crypto.randomUUID() or Date.now().toString()
  description: string,  // 1–280 chars, trimmed
  completed: boolean,   // false on creation
  insertionIndex: number // monotonically increasing, for stable default sort
}
```

### `Link`

```js
{
  id: string,   // crypto.randomUUID() or Date.now().toString()
  label: string, // 1–50 chars
  url: string    // must start with http:// or https://
}
```

### `AppState` (in-memory and localStorage schema)

| `localStorage` key  | Type            | Default    |
|---------------------|-----------------|------------|
| `dashboard_theme`   | `"light"\|"dark"` | `"light"` |
| `dashboard_name`    | `string`        | `""`       |
| `dashboard_todos`   | `TodoItem[]`    | `[]`       |
| `dashboard_links`   | `Link[]`        | `[]`       |

All values are stored as JSON strings. Each `Storage.read()` call `JSON.parse`s the raw string and returns `null` on any error (missing key, malformed JSON, SecurityError).

### Validation Rules (pure functions)

| Field            | Rule                                          |
|------------------|-----------------------------------------------|
| Name             | `0 < len ≤ 50` after trim; empty → reject     |
| Task description | `1 ≤ len ≤ 280` after trim                   |
| Link label       | `1 ≤ len ≤ 50` after trim                    |
| Link URL         | starts with `http://` or `https://`           |

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Storage round-trip preserves data

*For any* valid `AppState` value (todos array, links array, theme string, or name string), serialising it via `Storage.write()` and then reading it back via `Storage.read()` shall produce a value that is deep-equal to the original.

**Validates: Requirements 3.11, 3.12, 4.5, 4.6, 5.3, 5.4, 6.1, 6.5**

---

### Property 2: Greeting text is determined solely by hour

*For any* integer hour in 0–23, `Greeting.getGreetingText(hour)` shall return exactly one of the four defined greeting strings, consistent with the time-of-day bands:
- 5–11 → "Good morning"
- 12–17 → "Good afternoon"
- 18–21 → "Good evening"
- 22–23 or 0–4 → "Good night"

**Validates: Requirements 1.3, 1.4, 1.5, 1.6**

---

### Property 3: Task description validation is consistent with length constraints

*For any* string `s`, `TodoList.validateDescription(s)` shall return `valid: true` if and only if `s.trim().length` is between 1 and 280 (inclusive), and `valid: false` otherwise.

**Validates: Requirements 3.1, 3.2**

---

### Property 4: Todo sort preserves all items

*For any* non-empty array of `TodoItem`s and any valid sort mode, `TodoList.sortItems(items, mode)` shall return an array containing exactly the same items (by `id`) as the input, with no additions or deletions.

**Validates: Requirements 3.9, 3.10**

---

### Property 5: Todo sort stability — active-first and completed-first preserve relative order within each group

*For any* array of `TodoItem`s sorted with mode `"active"`, all incomplete items shall appear before all completed items, and the relative insertion order within each group shall be preserved. The same invariant holds symmetrically for mode `"completed"`.

**Validates: Requirements 3.10**

---

### Property 6: Link URL validation matches the http/https prefix rule

*For any* string `url`, `QuickLinks.validateLink("valid-label", url)` shall return `valid: true` if and only if `url` starts with `"http://"` or `"https://"` (case-sensitive prefix match).

**Validates: Requirements 4.1, 4.2**

---

### Property 7: Timer display format is always MM:SS

*For any* integer `n` in 0–1500 (valid timer range), `Timer.formatDisplay(n)` shall return a string matching the pattern `MM:SS` where MM is zero-padded minutes and SS is zero-padded seconds, and `MM * 60 + SS === n`.

**Validates: Requirements 2.3**

---

### Property 8: Name validation is consistent with length constraints

*For any* string `s`, `Greeting.validateName(s)` shall return `valid: true` if and only if `s.trim().length` is between 1 and 50 (inclusive).

**Validates: Requirements 1.9, 1.10**

---

## Error Handling

### `localStorage` Failures

`localStorage` can fail in two ways: read failures (corrupt data / missing key) and write failures (quota exceeded, SecurityError in sandboxed iframes, private browsing restrictions).

| Scenario | Behaviour |
|---|---|
| Key missing on load | Widget initialises with empty/default state. No error shown (this is normal first-run). |
| JSON parse error on load | Widget initialises with empty/default state. Inline notice shown inside the widget. |
| `SecurityError` on read | Same as JSON parse error path. |
| Write fails (`QuotaExceededError`, `SecurityError`) | State retained in memory. Non-blocking toast/banner notice shown. No data loss for current session. |

All `localStorage` access is wrapped in `try/catch` inside `Storage.read()` and `Storage.write()`. No widget module ever calls `localStorage` directly.

### Input Validation Errors

Each widget displays inline validation messages adjacent to the offending input field. Validation messages are cleared when the user begins typing again or the field is re-focused. No form submission clears a valid existing record.

### Timer Completion

When the timer reaches `00:00`, a visible notification is rendered (a highlighted banner or modal overlay) within 1 second. The notification is dismissed on any user interaction with the timer controls.

### Unknown/Unsupported Browser

The application uses only baseline Web APIs (DOM, `localStorage`, `setInterval`, `Date`, `crypto.randomUUID` with fallback to `Date.now()`). No polyfills are required for Chrome, Firefox, Edge, or Safari current stable. If `crypto.randomUUID` is unavailable (older Safari), a `Date.now()` + `Math.random()` fallback generates IDs.

---

## Testing Strategy

### Unit Tests

Unit tests target the pure-function core of each module. The DOM is never required for these tests; they run in Node.js via a test runner (e.g., Vitest).

Specific examples to cover:

| Area | Example tests |
|---|---|
| `Greeting.getGreetingText` | Hour 0, 4, 5, 11, 12, 17, 18, 21, 22, 23 |
| `Greeting.formatTime` | Midnight, noon, single-digit hours/minutes/seconds |
| `Greeting.formatDate` | Known date → expected string |
| `Greeting.validateName` | Empty string, 50-char string, 51-char string, whitespace-only |
| `Timer.formatDisplay` | 1500 → "25:00", 0 → "00:00", 90 → "01:30" |
| `TodoList.validateDescription` | Empty, 1 char, 280 chars, 281 chars, whitespace-only |
| `TodoList.sortItems` | Mixed complete/incomplete items under each sort mode |
| `QuickLinks.validateLink` | Valid http URL, valid https URL, ftp URL, empty URL |
| `Storage.read/write` | Mock `localStorage`, round-trip, JSON error, SecurityError |

### Property-Based Tests

Property-based tests use [fast-check](https://github.com/dubzzz/fast-check) (a mature TypeScript/JavaScript PBT library). Each property test is configured to run a minimum of 100 iterations.

Each test is tagged with a comment:

```js
// Feature: personal-dashboard, Property N: <property_text>
```

| Property | Generator | Assertion |
|---|---|---|
| **P1 Storage round-trip** | Arbitrary valid `AppState` fragments (todos, links, name, theme) | `Storage.read(k)` deep-equals original after `Storage.write(k, v)` |
| **P2 Greeting by hour** | `fc.integer({ min: 0, max: 23 })` | Return value is one of the four strings; matches the correct band |
| **P3 Task description validation** | `fc.string()` of varying length | `validateDescription(s).valid === (s.trim().length >= 1 && s.trim().length <= 280)` |
| **P4 Sort preserves items** | `fc.array(todoItemArb)`, `fc.constantFrom('default','active','completed')` | Sorted array has same IDs as input |
| **P5 Sort stability** | `fc.array(todoItemArb)` with mixed completion states | Active-first: all incomplete precede all complete; within-group relative order preserved |
| **P6 URL validation** | `fc.string()` with some valid and invalid URLs | `validateLink` returns `valid` iff string starts with `http://` or `https://` |
| **P7 Timer format** | `fc.integer({ min: 0, max: 1500 })` | Output matches `/^\d{2}:\d{2}$/`; reconstructed seconds equal input |
| **P8 Name validation** | `fc.string()` | `validateName(s).valid === (s.trim().length >= 1 && s.trim().length <= 50)` |

### Integration / Smoke Tests

- Load `index.html` in a headless browser (Playwright or manual) and verify:
  - No console errors on `file://` and `http://localhost`
  - Theme class applied before first paint (check `document.documentElement.classList` before `DOMContentLoaded` completes)
  - All five widgets are visible and interactive
- Manually verify cross-browser in Chrome, Firefox, Edge, Safari stable.
