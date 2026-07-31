# Requirements Document

## Introduction

A personal browser dashboard / new-tab replacement page built with HTML, CSS, and Vanilla JavaScript. The application runs entirely in the browser, persists all state in Local Storage, and is deployable as a static site on GitHub Pages. It provides five core widgets: a greeting with live clock, a Pomodoro focus timer, a to-do list, a quick-links launcher, and a light/dark theme toggle.

## Glossary

- **Dashboard**: The single-page web application described in this document.
- **User**: The person who opens the Dashboard in their browser.
- **Greeting_Widget**: The UI component that displays the current time, date, and a personalised greeting.
- **Timer**: The Pomodoro-style focus countdown component.
- **Todo_List**: The UI component that manages the User's task list.
- **Todo_Item**: A single task entry in the Todo_List.
- **Quick_Links**: The UI component that displays a collection of user-defined website shortcuts.
- **Link**: A single quick-link entry consisting of a label and a URL.
- **Theme_Toggle**: The control that switches between light and dark visual themes.
- **Local_Storage**: The browser's `localStorage` API used for all client-side persistence.
- **Session**: The period from when the User opens the Dashboard until the browser tab is closed or navigated away.

---

## Requirements

### Requirement 1: Live Greeting Display

**User Story:** As a User, I want to see the current time, date, and a personalised greeting when I open the Dashboard, so that I have immediate context about the time of day.

#### Acceptance Criteria

1. WHILE the Dashboard is open, THE Greeting_Widget SHALL display the current time in HH:MM:SS (24-hour) format, updating every second.
2. THE Greeting_Widget SHALL display the current date in the format "Weekday, Month DD, YYYY" (e.g., "Thursday, July 31, 2025").
3. WHEN the current local hour is between 05:00 and 11:59, THE Greeting_Widget SHALL display the greeting "Good morning".
4. WHEN the current local hour is between 12:00 and 17:59, THE Greeting_Widget SHALL display the greeting "Good afternoon".
5. WHEN the current local hour is between 18:00 and 21:59, THE Greeting_Widget SHALL display the greeting "Good evening".
6. WHEN the current local hour is between 22:00 and 04:59, THE Greeting_Widget SHALL display the greeting "Good night".
7. IF a name is saved in Local_Storage, THEN THE Greeting_Widget SHALL append the name to the greeting message (e.g., "Good morning, Alex").
8. IF no name is saved in Local_Storage, THEN THE Greeting_Widget SHALL display the greeting without a name suffix.
9. WHEN the User submits a new name via the name input field, THE Greeting_Widget SHALL save the name to Local_Storage and update the greeting within 1 second.
10. IF the User submits a name that is empty or exceeds 50 characters, THEN THE Greeting_Widget SHALL reject the submission, display an inline validation message, and retain any previously stored name without overwriting it.

---

### Requirement 2: Pomodoro Focus Timer

**User Story:** As a User, I want a 25-minute countdown timer with start, stop, and reset controls, so that I can use the Pomodoro technique to manage focused work sessions.

#### Acceptance Criteria

1. THE Timer SHALL initialise with a 25-minute (1500-second) countdown value on first load and after a reset.
2. WHEN the User activates the start control, THE Timer SHALL begin counting down at one-second intervals.
3. WHILE the Timer is counting down, THE Timer SHALL display the remaining time in MM:SS format, updating every second.
4. WHEN the User activates the stop control, THE Timer SHALL pause the countdown and retain the current remaining time.
5. WHEN the User activates the reset control, THE Timer SHALL stop any active countdown and restore the display to 25:00.
6. WHEN the countdown reaches 00:00, THE Timer SHALL stop automatically and display a visible notification to the User within 1 second.
7. WHILE the Timer is counting down, THE Timer SHALL disable the start control and enable the stop and reset controls.
8. WHILE the Timer is stopped or reset, THE Timer SHALL enable the start control and disable the stop control.
9. IF the User activates the start control while the Timer is already counting down, THEN THE Timer SHALL take no action.
10. WHEN the User activates the start control after the Timer has been paused, THE Timer SHALL resume the countdown from the retained remaining time.

---

### Requirement 3: To-Do List

**User Story:** As a User, I want to add, edit, complete, sort, and delete tasks, so that I can manage my daily to-do list directly from my dashboard.

#### Acceptance Criteria

1. WHEN the User submits a non-empty task description (1–280 characters, after trimming whitespace) via the add-task input, THE Todo_List SHALL create a new Todo_Item with a default incomplete state and append it to the end of the list.
2. IF the User submits an empty, whitespace-only, or >280-character task description, THEN THE Todo_List SHALL reject the submission and display an inline validation message.
3. WHEN the User activates the complete control on a Todo_Item, THE Todo_List SHALL mark that Todo_Item as done and apply strikethrough styling to its description text.
4. WHEN the User activates the complete control on an already-completed Todo_Item, THE Todo_List SHALL mark that Todo_Item as incomplete and remove the strikethrough styling.
5. WHEN the User activates the edit control on a Todo_Item, THE Todo_List SHALL present an editable input field pre-populated with the Todo_Item's current description.
6. WHEN the User confirms an edit with a non-empty value (after trimming whitespace), THE Todo_List SHALL save the trimmed description to the Todo_Item and exit edit mode.
7. IF the User confirms an edit with an empty or whitespace-only value, THEN THE Todo_List SHALL retain the original description and exit edit mode.
8. WHEN the User activates the delete control on a Todo_Item, THE Todo_List SHALL remove that Todo_Item from the list immediately without requiring additional confirmation.
9. WHEN the User selects a sort option, THE Todo_List SHALL reorder the displayed items according to the selected criterion within 100 milliseconds without deleting any items.
10. THE Todo_List SHALL support at minimum the following sort options: "Default" (original insertion order), "Active first" (incomplete items before completed items, preserving relative insertion order within each group), and "Completed first" (completed items before incomplete items, preserving relative insertion order within each group).
11. THE Todo_List SHALL persist all Todo_Items (description and completion state) to Local_Storage by overwriting the stored array after every add, edit, complete, or delete operation.
12. WHEN the Dashboard loads, THE Todo_List SHALL restore all previously saved Todo_Items from Local_Storage before the User can interact with the list.
13. IF Local_Storage is unavailable or the stored Todo_List data is corrupt, THEN THE Todo_List SHALL initialise with an empty list and display an inline notice that data could not be loaded.

---

### Requirement 4: Quick Links

**User Story:** As a User, I want to save and launch favourite website shortcuts from my dashboard, so that I can navigate to frequently visited pages in one click.

#### Acceptance Criteria

1. WHEN the User submits a label (1–50 characters) and a valid URL (beginning with http:// or https://) via the add-link form, THE Quick_Links component SHALL create a new Link and display it in the links panel.
2. IF the User submits an add-link form with an empty label, a label exceeding 50 characters, or a URL that does not begin with http:// or https://, THEN THE Quick_Links component SHALL reject the submission, display a descriptive validation message, and retain the entered values in the form fields.
3. WHEN the User activates a Link button, THE Quick_Links component SHALL open the associated URL in a new browser tab without navigating away from the Dashboard.
4. WHEN the User activates the delete control on a Link, THE Quick_Links component SHALL remove that Link from the panel immediately without requiring additional confirmation.
5. THE Quick_Links component SHALL persist all Links (label and URL) to Local_Storage within 500 milliseconds after every add or delete operation.
6. WHEN the Dashboard loads, THE Quick_Links component SHALL restore all previously saved Links from Local_Storage before the User can interact with the panel.
7. IF Local_Storage is unavailable or the stored Links data is corrupt, THEN THE Quick_Links component SHALL initialise with an empty links panel and display an inline notice that data could not be loaded.

---

### Requirement 5: Light / Dark Theme Toggle

**User Story:** As a User, I want to switch between a light and a dark colour theme, so that I can match the Dashboard's appearance to my preference or ambient lighting.

#### Acceptance Criteria

1. THE Dashboard SHALL apply a light theme by default when no theme preference has been saved and the operating system does not report a dark-mode preference.
2. WHEN the User activates the Theme_Toggle, THE Dashboard SHALL switch to the opposite theme and apply the new styles within 100 milliseconds without a page reload.
3. THE Dashboard SHALL persist the User's theme preference to Local_Storage before the next render cycle after each toggle activation.
4. WHEN the Dashboard loads and a theme preference is saved in Local_Storage, THE Dashboard SHALL apply the saved theme before the first visible render.
5. WHERE the User's operating system reports a dark-mode preference (via `prefers-color-scheme: dark`) and no theme has been saved to Local_Storage, THE Dashboard SHALL apply the dark theme before the first visible render.
6. IF Local_Storage is unavailable or throws an error when writing the theme preference, THEN THE Dashboard SHALL retain the toggled theme for the current session and display a non-blocking notice that the preference could not be saved.

---

### Requirement 6: Data Persistence and Recovery

**User Story:** As a User, I want my settings and data to survive page reloads, so that I do not have to re-enter information every time I open a new tab.

#### Acceptance Criteria

1. THE Dashboard SHALL read all persisted data from Local_Storage during the initial page load before rendering any widget.
2. WHEN Local_Storage data for a widget is absent or corrupt, THE Dashboard SHALL initialise that widget with its default empty state and display an error message to the user rather than throwing an unhandled error.
3. THE Dashboard SHALL write updated data to Local_Storage before the next user interaction is processed after each user action that mutates widget state.
4. IF a Local_Storage write operation fails, THEN THE Dashboard SHALL retain the updated state in memory for the current session and display a non-blocking notice that the data could not be saved persistently.
5. WHEN the Dashboard loads and all persisted data is successfully read from Local_Storage, THE Dashboard SHALL restore all user-configured values (tasks, links, theme, name) without requiring any user action.

---

### Requirement 7: Technology and Deployment Constraints

**User Story:** As a developer, I want the Dashboard to use only HTML, CSS, and Vanilla JavaScript with no build step, so that it can be deployed directly to GitHub Pages and opened without a server.

#### Acceptance Criteria

1. THE Dashboard SHALL be implemented using only HTML, CSS, and Vanilla JavaScript with no third-party frameworks or libraries, and all script and style references SHALL use relative paths.
2. THE Dashboard SHALL contain exactly one CSS file located in a `css/` directory, referenced from HTML via a relative `<link>` tag.
3. THE Dashboard SHALL contain exactly one JavaScript file located in a `js/` directory, referenced from HTML via a relative `<script>` tag.
4. THE Dashboard SHALL function correctly in the current stable versions of Chrome, Firefox, Edge, and Safari with no browser-specific errors in the developer console and without polyfills or build tools.
5. THE Dashboard SHALL be fully functional when opened as a local file (`file://` protocol) and when served from a GitHub Pages origin, including all CSS, JavaScript, and asset loading.
6. WHEN the Dashboard is loaded on a connection of 10 Mbps or greater, THE Dashboard SHALL complete its initial render within 1 second with no external network requests made during or after the initial load.
