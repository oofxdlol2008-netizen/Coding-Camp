# Implementation Plan: Personal Dashboard

## Overview

The implementation follows the architecture defined in the design document: a zero-dependency, single-page web app with one `index.html`, one `css/style.css`, and one `js/app.js`. All logic is organised as plain JS namespace objects. Tasks proceed in layers — file scaffolding → pure-function core → DOM wiring per widget → integration — so every step builds directly on the last.

---

## Tasks

- [ ] 1. Scaffold project structure and HTML shell
  - [ ] 1.1 Create `index.html` with semantic layout
    - Create `index.html` at the workspace root with `<!DOCTYPE html>`, `<html>`, `<head>`, `<body>`
    - Add a `<link>` tag referencing `css/style.css` using a relative path
    - Add a `<script>` tag (deferred, at end of `<body>`) referencing `js/app.js` using a relative path
    - Add the inline `<script>` in `<head>` that reads `localStorage['dashboard_theme']` and sets the `data-theme` attribute on `<html>` synchronously before any paint — this is the flash-of-wrong-theme prevention required by the design
    - Add placeholder `<section>` elements for each of the five widgets: `#greeting`, `#timer`, `#todo`, `#links`, `#theme-toggle`
    - _Requirements: 7.1, 7.2, 7.3, 5.4_

  - [ ] 1.2 Create `css/style.css` with CSS custom properties for theming
    - Create `css/style.css`
    - Define `:root` CSS custom properties for the light theme (`--bg`, `--surface`, `--text`, `--accent`, etc.)
    - Define `[data-theme="dark"]` overrides for each custom property
    - Add base layout styles (grid or flexbox) for the five widget sections so the page is visually coherent from the start
    - Add utility classes for `.strikethrough`, `.hidden`, `.toast`, `.inline-error`
    - _Requirements: 5.1, 5.2, 7.1, 7.2_

  - [ ] 1.3 Create `js/app.js` with module skeleton and `DOMContentLoaded` bootstrap
    - Create `js/app.js`
    - Declare empty namespace objects: `Storage`, `Greeting`, `Timer`, `TodoList`, `QuickLinks`, `Theme`
    - Add a `DOMContentLoaded` listener that calls each module's `init()` in the order specified in the design: `Theme.init()`, `Greeting.init()`, `Timer.init()`, `TodoList.init()`, `QuickLinks.init()`
    - _Requirements: 7.1, 7.3, 6.1_

- [ ] 2. Implement `Storage` module
  - [ ] 2.1 Implement `Storage.KEYS`, `Storage.read()`, and `Storage.write()`
    - Define `Storage.KEYS = { THEME: 'dashboard_theme', USER_NAME: 'dashboard_name', TODOS: 'dashboard_todos', LINKS: 'dashboard_links' }`
    - Implement `Storage.read(key)`: wrap `localStorage.getItem` + `JSON.parse` in `try/catch`; return `null` on any error (missing key, malformed JSON, `SecurityError`)
    - Implement `Storage.write(key, value)`: wrap `JSON.stringify` + `localStorage.setItem` in `try/catch`; return `true` on success, `false` on failure (catches `QuotaExceededError`, `SecurityError`)
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 3.11, 4.5, 5.3_

  - [ ]* 2.2 Write property test for Storage round-trip (Property 1)
    - **Property 1: Storage round-trip preserves data**
    - For any valid `AppState` fragment (todos array, links array, theme string, name string), `Storage.read(k)` deep-equals the original value after `Storage.write(k, v)`
    - Use `fc.oneof(fc.string(), fc.array(fc.record({ id: fc.string(), description: fc.string(), completed: fc.boolean(), insertionIndex: fc.integer() })), fc.constantFrom('light','dark'))` as the generator
    - Mock `localStorage` with a plain object to keep tests environment-agnostic
    - Tag comment: `// Feature: personal-dashboard, Property 1: Storage round-trip preserves data`
    - **Validates: Requirements 3.11, 3.12, 4.5, 4.6, 5.3, 5.4, 6.1, 6.5**

- [ ] 3. Implement `Greeting` module pure functions
  - [ ] 3.1 Implement `Greeting.getGreetingText()`, `Greeting.formatTime()`, `Greeting.formatDate()`, `Greeting.validateName()`
    - Implement `getGreetingText(hour)`: return one of the four greeting strings based on the time-of-day bands (5–11 → morning, 12–17 → afternoon, 18–21 → evening, 22–23/0–4 → night)
    - Implement `formatTime(date)`: return `"HH:MM:SS"` string using zero-padded hours, minutes, seconds from the `Date` object
    - Implement `formatDate(date)`: return `"Weekday, Month DD, YYYY"` using `Intl.DateTimeFormat` or a manual lookup table
    - Implement `validateName(name)`: return `{ valid: true }` if `name.trim().length` is 1–50; otherwise `{ valid: false, reason: '...' }`
    - _Requirements: 1.2, 1.3, 1.4, 1.5, 1.6, 1.9, 1.10_

  - [ ]* 3.2 Write property test for greeting text by hour (Property 2)
    - **Property 2: Greeting text is determined solely by hour**
    - Generator: `fc.integer({ min: 0, max: 23 })`
    - Assert: return value is one of the four strings; each hour maps to the correct band
    - Tag comment: `// Feature: personal-dashboard, Property 2: Greeting text is determined solely by hour`
    - **Validates: Requirements 1.3, 1.4, 1.5, 1.6**

  - [ ]* 3.3 Write property test for name validation (Property 8)
    - **Property 8: Name validation is consistent with length constraints**
    - Generator: `fc.string()` (arbitrary string)
    - Assert: `Greeting.validateName(s).valid === (s.trim().length >= 1 && s.trim().length <= 50)`
    - Tag comment: `// Feature: personal-dashboard, Property 8: Name validation is consistent with length constraints`
    - **Validates: Requirements 1.9, 1.10**

- [ ] 4. Implement `Greeting` module DOM and `init()`
  - [ ] 4.1 Implement `Greeting.init()` with clock tick, name display, and name edit
    - Add DOM markup inside `#greeting`: `<div id="clock">`, `<div id="date">`, `<h1 id="greeting-text">`, `<div id="name-form">` (input + submit button + inline error span)
    - Implement `Greeting.init()`: call `Storage.read(KEYS.USER_NAME)` to hydrate name; start a `setInterval` (1 000 ms) that calls `formatTime` + `formatDate` + `getGreetingText` and updates the DOM elements each tick; immediately invoke the tick once on init
    - Wire name-submit button: call `validateName`; on failure display inline error; on success call `Storage.write` and update the displayed greeting
    - Display a `Storage` failure banner (reuse `.inline-error`) if `Storage.write` returns `false`
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10_

- [ ] 5. Implement `Timer` module
  - [ ] 5.1 Implement `Timer.formatDisplay()` pure function
    - Implement `Timer.formatDisplay(totalSeconds)`: convert `totalSeconds` to `MM:SS` with zero-padding for both fields; `Math.floor(totalSeconds / 60)` for minutes, `totalSeconds % 60` for seconds
    - _Requirements: 2.3_

  - [ ]* 5.2 Write property test for timer display format (Property 7)
    - **Property 7: Timer display format is always MM:SS**
    - Generator: `fc.integer({ min: 0, max: 1500 })`
    - Assert: output matches `/^\d{2}:\d{2}$/`; reconstructed value `MM * 60 + SS === n`
    - Tag comment: `// Feature: personal-dashboard, Property 7: Timer display format is always MM:SS`
    - **Validates: Requirements 2.3**

  - [ ] 5.3 Implement `Timer.init()`, `start()`, `stop()`, `reset()`, `onComplete()`
    - Add DOM markup inside `#timer`: `<div id="timer-display">`, `<button id="timer-start">`, `<button id="timer-stop">`, `<button id="timer-reset">`, `<div id="timer-notification" class="hidden">`
    - Implement `Timer.state = { remaining: 1500, running: false }` and `_intervalId = null`
    - Implement `start()`: no-op if `state.running`; set `state.running = true`; start `setInterval` (1 000 ms) decrementing `state.remaining`; call `onComplete()` when `remaining` hits 0; update button enabled/disabled states and display after each tick
    - Implement `stop()`: clear interval; set `state.running = false`; update button states
    - Implement `reset()`: call `stop()`; set `state.remaining = 1500`; update display; hide notification
    - Implement `onComplete()`: stop timer; show `#timer-notification`; dismiss it on next interaction with any timer control
    - Implement `init()`: render `formatDisplay(1500)`; bind button events; set initial button states
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7, 2.8, 2.9, 2.10_

- [ ] 6. Checkpoint — Greeting and Timer
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 7. Implement `TodoList` module pure functions
  - [ ] 7.1 Implement `TodoList.validateDescription()`, `createItem()`, and `sortItems()`
    - Implement `validateDescription(raw)`: return `{ valid: true }` if `raw.trim().length` is 1–280; otherwise `{ valid: false, reason: '...' }`
    - Implement `createItem(description)`: return a `TodoItem` object `{ id: crypto.randomUUID() || Date.now().toString(), description: description.trim(), completed: false, insertionIndex: <monotonically increasing counter> }`
    - Implement `sortItems(items, mode)`: return a new array (never mutate); for `'default'` sort ascending by `insertionIndex`; for `'active'` put incomplete items first (preserving their relative `insertionIndex` order), then completed; for `'completed'` reverse the group order
    - _Requirements: 3.1, 3.2, 3.9, 3.10_

  - [ ]* 7.2 Write property test for task description validation (Property 3)
    - **Property 3: Task description validation is consistent with length constraints**
    - Generator: `fc.string()` (arbitrary string)
    - Assert: `TodoList.validateDescription(s).valid === (s.trim().length >= 1 && s.trim().length <= 280)`
    - Tag comment: `// Feature: personal-dashboard, Property 3: Task description validation is consistent with length constraints`
    - **Validates: Requirements 3.1, 3.2**

  - [ ]* 7.3 Write property test for sort preserving items (Property 4)
    - **Property 4: Todo sort preserves all items**
    - Generator: `fc.array(todoItemArb)` (arbitrary array of TodoItems), `fc.constantFrom('default','active','completed')`
    - Assert: sorted array has the same set of IDs as the input (no additions, no deletions)
    - Tag comment: `// Feature: personal-dashboard, Property 4: Todo sort preserves all items`
    - **Validates: Requirements 3.9, 3.10**

  - [ ]* 7.4 Write property test for sort stability (Property 5)
    - **Property 5: Todo sort stability — active-first and completed-first preserve relative order within each group**
    - Generator: `fc.array(todoItemArb)` with mixed `completed` states
    - Assert for `'active'` mode: all incomplete items precede all complete items; relative `insertionIndex` order is preserved within each group
    - Assert symmetrically for `'completed'` mode
    - Tag comment: `// Feature: personal-dashboard, Property 5: Todo sort stability`
    - **Validates: Requirements 3.10**

- [ ] 8. Implement `TodoList` module DOM and `init()`
  - [ ] 8.1 Implement `TodoList.init()`, CRUD operations, and storage flush
    - Add DOM markup inside `#todo`: `<input id="todo-input">`, `<button id="todo-add">`, `<span id="todo-error">`, `<select id="todo-sort">` (options: default, active, completed), `<ul id="todo-list">`
    - Implement `TodoList.state = { items: [], sortMode: 'default' }` and `_insertionCounter = 0`
    - Implement `addItem(description)`: validate; create item; push to `state.items`; flush to `Storage`; re-render list
    - Implement `toggleComplete(id)`: find item by id; toggle `completed`; flush to `Storage`; re-render
    - Implement `editItem(id, newDescription)`: if trimmed value is non-empty update description; always exit edit mode; flush to `Storage`; re-render
    - Implement `deleteItem(id)`: filter item out; flush to `Storage`; re-render
    - Implement internal `_render()`: call `sortItems(state.items, state.sortMode)`; build list HTML with per-item complete / edit / delete controls; replace `#todo-list` innerHTML; attach event listeners
    - Implement `init()`: hydrate `state.items` from `Storage.read(KEYS.TODOS)` (default to `[]` on null/error; show inline notice on error); bind add-button and sort-select events; call `_render()`
    - Display a non-blocking toast if `Storage.write` returns `false`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 3.10, 3.11, 3.12, 3.13_

- [ ] 9. Implement `QuickLinks` module pure validation
  - [ ] 9.1 Implement `QuickLinks.validateLink()`
    - Implement `validateLink(label, url)`: return `{ valid: true }` if `label.trim().length` is 1–50 AND `url` starts with `'http://'` or `'https://'`; otherwise `{ valid: false, reason: '...' }` describing which field failed
    - _Requirements: 4.1, 4.2_

  - [ ]* 9.2 Write property test for URL validation (Property 6)
    - **Property 6: Link URL validation matches the http/https prefix rule**
    - Generator: `fc.string()` with some valid and invalid prefixes
    - Assert: `QuickLinks.validateLink('valid-label', url).valid` is `true` iff `url` starts with `'http://'` or `'https://'` (case-sensitive)
    - Tag comment: `// Feature: personal-dashboard, Property 6: Link URL validation matches the http/https prefix rule`
    - **Validates: Requirements 4.1, 4.2**

- [ ] 10. Implement `QuickLinks` module DOM and `init()`
  - [ ] 10.1 Implement `QuickLinks.init()`, `addLink()`, `deleteLink()`, and storage flush
    - Add DOM markup inside `#links`: `<input id="link-label">`, `<input id="link-url">`, `<button id="link-add">`, `<span id="link-error">`, `<div id="links-panel">`
    - Implement `QuickLinks.state = { links: [] }`
    - Implement `addLink(label, url)`: validate; create `Link` object with `crypto.randomUUID()` or `Date.now()` fallback id; push to `state.links`; flush to `Storage` (within 500 ms per req. 4.5); re-render; retain form field values on validation failure
    - Implement `deleteLink(id)`: filter; flush to `Storage`; re-render
    - Implement internal `_render()`: build link buttons (`target="_blank"` + `rel="noopener noreferrer"`) and delete controls; replace `#links-panel` innerHTML
    - Implement `init()`: hydrate from `Storage.read(KEYS.LINKS)`; show inline notice on load error; bind add-button event; call `_render()`
    - Display a non-blocking toast if `Storage.write` returns `false`
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7_

- [ ] 11. Checkpoint — TodoList and QuickLinks
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 12. Implement `Theme` module
  - [ ] 12.1 Implement `Theme.resolveInitialTheme()`, `apply()`, `toggle()`, and `init()`
    - Implement `resolveInitialTheme()`: call `Storage.read(KEYS.THEME)`; if `'light'` or `'dark'` return it; else return `'dark'` if `window.matchMedia('(prefers-color-scheme: dark)').matches`, otherwise `'light'`
    - Implement `apply(theme)`: set `document.documentElement.setAttribute('data-theme', theme)`; call `Storage.write(KEYS.THEME, theme)`; update toggle button label/icon; if `Storage.write` returns `false`, show a non-blocking toast
    - Implement `toggle()`: derive opposite of current `data-theme` attribute; call `apply()`
    - Add DOM markup inside `#theme-toggle`: `<button id="theme-btn">` with appropriate accessible label
    - Implement `init()`: call `resolveInitialTheme()`; call `apply(theme)`; bind `#theme-btn` click to `toggle()`
    - Note: the inline `<script>` in `<head>` (task 1.1) handles the synchronous pre-paint theme application; `Theme.init()` wires the runtime toggle
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6_

- [ ] 13. Wire everything together and polish
  - [ ] 13.1 Connect Storage failure notices into a shared toast system
    - Add a `<div id="toast" class="toast hidden" aria-live="polite">` to `index.html`
    - Implement a shared `showToast(message)` helper function in `app.js` that reveals `#toast` with a message for ~3 seconds then hides it with a CSS transition
    - Update every location in `Storage.write`'s failure path (Greeting, TodoList, QuickLinks, Theme) to call `showToast` instead of inline error rendering
    - _Requirements: 6.4, 3.13, 4.7, 5.6_

  - [ ] 13.2 Add `crypto.randomUUID` fallback for ID generation
    - Add a top-level helper `function generateId() { return (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : Date.now().toString() + Math.random().toString(36).slice(2); }`
    - Replace direct `crypto.randomUUID()` calls in `TodoList.createItem` and `QuickLinks.addLink` with `generateId()`
    - _Requirements: 7.4_

  - [ ] 13.3 Verify `file://` and relative-path correctness
    - Audit `index.html`: confirm all `<link>` and `<script>` src/href attributes are relative (no leading `/`)
    - Confirm no `fetch()`, `XMLHttpRequest`, or ES `import` calls exist anywhere in `app.js`
    - _Requirements: 7.1, 7.3, 7.5_

- [ ] 14. Final checkpoint — Full integration
  - Ensure all tests pass, ask the user if questions arise.

---

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property-based tests require installing `fast-check` as a dev dependency (e.g., `npm install --save-dev fast-check vitest`) — this does not affect the runtime bundle since `app.js` has zero dependencies
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation after each logical layer
- Property tests validate universal correctness properties across all inputs; unit tests validate specific examples and edge cases
- The inline `<script>` in `<head>` (task 1.1) is the only code that runs before `DOMContentLoaded` and must remain minimal — only a `localStorage` read and `setAttribute` call

---

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "1.2", "1.3"] },
    { "id": 1, "tasks": ["2.1", "3.1", "5.1", "7.1", "9.1"] },
    { "id": 2, "tasks": ["2.2", "3.2", "3.3", "5.2", "7.2", "7.3", "7.4", "9.2"] },
    { "id": 3, "tasks": ["4.1", "5.3", "8.1", "10.1", "12.1"] },
    { "id": 4, "tasks": ["13.1", "13.2", "13.3"] }
  ]
}
```
