// Personal Dashboard — js/app.js
// Single JavaScript file; all logic is organised as plain-object namespaces
// to preserve file:// compatibility without a bundler.

// ---------------------------------------------------------------------------
// Storage module
// Isolates all localStorage access so no other module calls localStorage
// directly, making the rest of the codebase easy to test.
// ---------------------------------------------------------------------------
const Storage = {
  KEYS: {
    THEME: 'dashboard_theme',
    USER_NAME: 'dashboard_name',
    TODOS: 'dashboard_todos',
    LINKS: 'dashboard_links',
  },

  // Returns parsed value or null; never throws.
  read(key) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  },

  // Serialises value and writes; returns true on success, false on failure.
  write(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      return false;
    }
  },
};

// ---------------------------------------------------------------------------
// Greeting module
// Live clock, date display, time-of-day greeting, personalised name.
// ---------------------------------------------------------------------------
const Greeting = {
  // Returns "Good morning" | "Good afternoon" | "Good evening" | "Good night"
  // based on the given hour (0–23).
  getGreetingText(hour) {
    if (hour >= 5 && hour <= 11) return 'Good morning';
    if (hour >= 12 && hour <= 17) return 'Good afternoon';
    if (hour >= 18 && hour <= 21) return 'Good evening';
    return 'Good night'; // 22–23 and 0–4
  },

  // Formats a Date object to "HH:MM:SS" (24-hour, zero-padded).
  formatTime(date) {
    const hh = String(date.getHours()).padStart(2, '0');
    const mm = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  },

  // Formats a Date object to "Weekday, Month DD, YYYY".
  formatDate(date) {
    return new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(date);
  },

  // Validates the name: returns { valid: true } or { valid: false, reason }.
  validateName(name) {
    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { valid: false, reason: 'Name cannot be empty.' };
    }
    if (trimmed.length > 50) {
      return { valid: false, reason: 'Name must be 50 characters or fewer.' };
    }
    return { valid: true };
  },

  // Starts the 1-second tick and updates the DOM.
  init() {
    // Inject DOM markup into #greeting — do NOT modify index.html
    const section = document.getElementById('greeting');
    section.innerHTML = `
      <div id="clock" aria-live="off"></div>
      <div id="date"></div>
      <h1 id="greeting-text"></h1>
      <div id="name-form">
        <input
          type="text"
          id="name-input"
          placeholder="Enter your name"
          maxlength="55"
          aria-label="Your name"
        />
        <button type="button" id="name-submit">Save name</button>
        <span id="name-error" class="inline-error" role="alert" aria-live="polite"></span>
      </div>
    `;

    // Hydrate stored name
    let currentName = Storage.read(Storage.KEYS.USER_NAME) || '';

    // Internal tick function — updates clock, date and greeting
    function tick() {
      const now = new Date();
      document.getElementById('clock').textContent = Greeting.formatTime(now);
      document.getElementById('date').textContent = Greeting.formatDate(now);
      const base = Greeting.getGreetingText(now.getHours());
      document.getElementById('greeting-text').textContent =
        currentName ? `${base}, ${currentName}` : base;
    }

    // Run immediately, then every second
    tick();
    setInterval(tick, 1000);

    // Wire name-submit button
    const nameInput = document.getElementById('name-input');
    const nameSubmit = document.getElementById('name-submit');
    const nameError = document.getElementById('name-error');

    // Pre-populate input with stored name if available
    if (currentName) {
      nameInput.value = currentName;
    }

    // Clear inline error while user is typing
    nameInput.addEventListener('input', function () {
      nameError.textContent = '';
    });

    nameSubmit.addEventListener('click', function () {
      nameError.textContent = '';
      const raw = nameInput.value;
      const result = Greeting.validateName(raw);
      if (!result.valid) {
        nameError.textContent = result.reason;
        return;
      }
      const trimmed = raw.trim();
      const saved = Storage.write(Storage.KEYS.USER_NAME, trimmed);
      if (!saved) {
        // Storage.write failed — retain in-memory but show notice
        nameError.textContent = 'Name could not be saved persistently.';
      }
      // Update greeting immediately regardless of storage outcome
      currentName = trimmed;
      const now = new Date();
      const base = Greeting.getGreetingText(now.getHours());
      document.getElementById('greeting-text').textContent =
        currentName ? `${base}, ${currentName}` : base;
    });
  },
};

// ---------------------------------------------------------------------------
// Timer module
// 25-minute Pomodoro countdown with start / stop / reset controls.
// ---------------------------------------------------------------------------

// Module-level interval handle so it is accessible to start(), stop(), reset().
let _timerIntervalId = null;

const Timer = {
  state: { remaining: 1500, running: false },

  // Returns MM:SS string from total seconds (zero-padded).
  formatDisplay(totalSeconds) {
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return String(minutes).padStart(2, '0') + ':' + String(seconds).padStart(2, '0');
  },

  // Private: syncs display text and button enabled/disabled states to state.
  _updateTimerUI() {
    const display = document.getElementById('timer-display');
    const btnStart = document.getElementById('timer-start');
    const btnStop  = document.getElementById('timer-stop');
    const btnReset = document.getElementById('timer-reset');

    if (!display) return; // DOM not yet injected — safe no-op

    display.textContent = Timer.formatDisplay(Timer.state.remaining);

    // Start disabled while running; stop enabled while running; reset always on.
    btnStart.disabled = Timer.state.running;
    btnStop.disabled  = !Timer.state.running;
    btnReset.disabled = false;
  },

  // Starts countdown; no-op if already running.
  start() {
    if (Timer.state.running) return;

    Timer.state.running = true;
    _timerIntervalId = setInterval(function () {
      Timer.state.remaining -= 1;
      Timer._updateTimerUI();
      if (Timer.state.remaining <= 0) {
        Timer.onComplete();
      }
    }, 1000);
    Timer._updateTimerUI();
  },

  // Pauses countdown; retains remaining time.
  stop() {
    clearInterval(_timerIntervalId);
    _timerIntervalId = null;
    Timer.state.running = false;
    Timer._updateTimerUI();
  },

  // Stops countdown and resets remaining to 1500.
  reset() {
    Timer.stop();
    Timer.state.remaining = 1500;
    Timer._updateTimerUI();
    // Hide notification if visible
    const notification = document.getElementById('timer-notification');
    if (notification) notification.classList.add('hidden');
  },

  // Called when countdown reaches 0; shows a notification banner.
  onComplete() {
    Timer.stop();
    const notification = document.getElementById('timer-notification');
    if (notification) {
      notification.textContent = 'Pomodoro complete! Take a break.';
      notification.classList.remove('hidden');
    }
  },

  // Injects widget markup, binds events, and renders initial state.
  init() {
    const section = document.getElementById('timer');
    if (!section) return;

    section.innerHTML = `
      <h2 class="widget-title">Pomodoro Timer</h2>
      <div id="timer-display" aria-live="polite" aria-label="Timer display"></div>
      <div class="timer-controls">
        <button id="timer-start" type="button">Start</button>
        <button id="timer-stop"  type="button">Stop</button>
        <button id="timer-reset" type="button">Reset</button>
      </div>
      <div id="timer-notification" class="hidden" role="status" aria-live="assertive"></div>
    `;

    // Dismiss notification on any timer control interaction.
    function dismissNotification() {
      const notification = document.getElementById('timer-notification');
      if (notification) notification.classList.add('hidden');
    }

    document.getElementById('timer-start').addEventListener('click', function () {
      dismissNotification();
      Timer.start();
    });

    document.getElementById('timer-stop').addEventListener('click', function () {
      dismissNotification();
      Timer.stop();
    });

    document.getElementById('timer-reset').addEventListener('click', function () {
      // reset() already hides the notification internally
      Timer.reset();
    });

    Timer._updateTimerUI();
  },
};

// ---------------------------------------------------------------------------
// DOM utility helpers (used by TodoList and QuickLinks for safe HTML rendering)
// ---------------------------------------------------------------------------

function _escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function _escapeAttr(str) {
  return String(str).replace(/"/g, '&quot;');
}

// ---------------------------------------------------------------------------
// generateId — fallback-safe ID generator
// Uses crypto.randomUUID() when available; falls back to Date.now() + random
// for environments where crypto.randomUUID is not supported (older Safari).
// ---------------------------------------------------------------------------
function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return Date.now().toString() + Math.random().toString(36).slice(2);
}

// ---------------------------------------------------------------------------
// showToast — non-blocking notice; requires <div id="toast"> in index.html
// ---------------------------------------------------------------------------
function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) {
    console.warn('[Dashboard]', message);
    return;
  }
  toast.textContent = message;
  toast.classList.remove('hidden', 'toast--fading');
  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(function () {
    toast.classList.add('toast--fading');
    setTimeout(function () { toast.classList.add('hidden'); }, 400);
  }, 3000);
}

// ---------------------------------------------------------------------------
// TodoList module
// Add, edit, complete, sort, and delete tasks; persists to localStorage.
// ---------------------------------------------------------------------------

// Monotonically increasing counter for TodoItem insertion order.
// Module-level so it persists across createItem() calls within a session.
let _todoInsertionCounter = 0;

const TodoList = {
  state: { items: [], sortMode: 'default' },

  // Validates raw input; returns { valid: true } or { valid: false, reason }.
  // A description is valid if its trimmed length is between 1 and 280 inclusive.
  validateDescription(raw) {
    const trimmed = raw.trim();
    if (trimmed.length < 1) {
      return { valid: false, reason: 'Description cannot be empty.' };
    }
    if (trimmed.length > 280) {
      return { valid: false, reason: 'Description cannot exceed 280 characters.' };
    }
    return { valid: true };
  },

  // Returns a new TodoItem object (pure).
  // Uses generateId() for cross-environment ID generation with fallback.
  createItem(description) {
    return {
      id: generateId(),
      description: description.trim(),
      completed: false,
      insertionIndex: _todoInsertionCounter++,
    };
  },

  // Returns a sorted copy of items (pure, does not mutate the original array).
  // Modes:
  //   'default'   — ascending by insertionIndex
  //   'active'    — incomplete items first (by insertionIndex), then completed (by insertionIndex)
  //   'completed' — completed items first (by insertionIndex), then incomplete (by insertionIndex)
  sortItems(items, mode) {
    if (mode === 'default') {
      return items.slice().sort((a, b) => a.insertionIndex - b.insertionIndex);
    }

    if (mode === 'active') {
      const incomplete = items
        .filter(item => !item.completed)
        .sort((a, b) => a.insertionIndex - b.insertionIndex);
      const completed = items
        .filter(item => item.completed)
        .sort((a, b) => a.insertionIndex - b.insertionIndex);
      return incomplete.concat(completed);
    }

    if (mode === 'completed') {
      const completed = items
        .filter(item => item.completed)
        .sort((a, b) => a.insertionIndex - b.insertionIndex);
      const incomplete = items
        .filter(item => !item.completed)
        .sort((a, b) => a.insertionIndex - b.insertionIndex);
      return completed.concat(incomplete);
    }

    // Unknown mode — return a copy sorted by insertionIndex as a safe fallback.
    return items.slice().sort((a, b) => a.insertionIndex - b.insertionIndex);
  },

  // Flushes state.items to Storage; calls showToast on failure.
  _flush() {
    const ok = Storage.write(Storage.KEYS.TODOS, TodoList.state.items);
    if (!ok) {
      showToast('Could not save to-do list: storage unavailable.');
    }
  },

  // Adds a new item; validates first and shows inline error on failure.
  addItem(description) {
    const errorEl = document.getElementById('todo-error');
    const validation = TodoList.validateDescription(description);
    if (!validation.valid) {
      if (errorEl) {
        errorEl.textContent = validation.reason;
        errorEl.classList.remove('hidden');
      }
      return;
    }
    // Clear any previous error
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    }
    const item = TodoList.createItem(description);
    TodoList.state.items.push(item);
    TodoList._flush();
    TodoList._render();
  },

  // Toggles the completed state of the item with the given id.
  toggleComplete(id) {
    const item = TodoList.state.items.find(i => i.id === id);
    if (item) {
      item.completed = !item.completed;
    }
    TodoList._flush();
    TodoList._render();
  },

  // Updates the description of an item; always exits edit mode afterward.
  editItem(id, newDescription) {
    const trimmed = newDescription.trim();
    if (trimmed.length > 0) {
      const item = TodoList.state.items.find(i => i.id === id);
      if (item) {
        item.description = trimmed;
      }
    }
    // Always flush and re-render to exit edit mode
    TodoList._flush();
    TodoList._render();
  },

  // Removes the item with the given id from state.
  deleteItem(id) {
    TodoList.state.items = TodoList.state.items.filter(i => i.id !== id);
    TodoList._flush();
    TodoList._render();
  },

  // Builds and replaces the #todo-list innerHTML, then attaches event listeners.
  _render() {
    const listEl = document.getElementById('todo-list');
    if (!listEl) return;

    const sorted = TodoList.sortItems(TodoList.state.items, TodoList.state.sortMode);

    const fragment = sorted.map(item => {
      const completedClass = item.completed ? ' strikethrough' : '';
      return `<li class="todo-item" data-id="${_escapeAttr(item.id)}">
        <button class="btn-ghost todo-complete-btn" aria-label="${item.completed ? 'Mark incomplete' : 'Mark complete'}" data-id="${_escapeAttr(item.id)}">
          ${item.completed ? '&#10003;' : '&#9675;'}
        </button>
        <span class="todo-item-description${completedClass}">${_escapeHtml(item.description)}</span>
        <button class="btn-ghost todo-edit-btn" aria-label="Edit task" data-id="${_escapeAttr(item.id)}">&#9998;</button>
        <button class="btn-danger todo-delete-btn" aria-label="Delete task" data-id="${_escapeAttr(item.id)}">&#128465;</button>
      </li>`;
    }).join('');

    listEl.innerHTML = fragment;

    // Attach event listeners after rendering
    listEl.querySelectorAll('.todo-complete-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        TodoList.toggleComplete(this.dataset.id);
      });
    });

    listEl.querySelectorAll('.todo-edit-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        const id = this.dataset.id;
        const li = listEl.querySelector(`.todo-item[data-id="${id}"]`);
        if (!li) return;
        const span = li.querySelector('.todo-item-description');
        if (!span) return;
        const currentText = TodoList.state.items.find(i => i.id === id)?.description || '';

        // Replace the span with an edit input + save button
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.value = currentText;
        editInput.className = 'todo-edit-input';
        editInput.setAttribute('aria-label', 'Edit task description');

        const saveBtn = document.createElement('button');
        saveBtn.textContent = 'Save';
        saveBtn.className = 'btn-ghost todo-save-btn';

        span.replaceWith(editInput);
        // Replace edit button with the save button
        this.replaceWith(saveBtn);

        editInput.focus();

        saveBtn.addEventListener('click', function () {
          TodoList.editItem(id, editInput.value);
        });

        editInput.addEventListener('keydown', function (e) {
          if (e.key === 'Enter') {
            TodoList.editItem(id, editInput.value);
          } else if (e.key === 'Escape') {
            // Cancel edit — re-render without changes
            TodoList._render();
          }
        });
      });
    });

    listEl.querySelectorAll('.todo-delete-btn').forEach(btn => {
      btn.addEventListener('click', function () {
        TodoList.deleteItem(this.dataset.id);
      });
    });
  },

  // Initialises the widget: injects markup, hydrates from storage, binds events.
  init() {
    const section = document.getElementById('todo');
    if (!section) return;

    // Inject widget markup (do NOT modify index.html)
    section.innerHTML = `
      <h2>To-Do</h2>
      <div class="todo-input-row">
        <input id="todo-input" type="text" placeholder="Add a new task…" aria-label="New task description" />
        <button id="todo-add">Add</button>
      </div>
      <span id="todo-error" class="inline-error hidden"></span>
      <div class="todo-controls">
        <label for="todo-sort" class="sr-only">Sort tasks</label>
        <select id="todo-sort" aria-label="Sort tasks">
          <option value="default">Default</option>
          <option value="active">Active first</option>
          <option value="completed">Completed first</option>
        </select>
      </div>
      <ul id="todo-list" aria-label="Task list"></ul>
    `;

    // Hydrate from Storage
    const stored = Storage.read(Storage.KEYS.TODOS);
    if (stored === null) {
      // Key missing (normal first run) — start with empty list, no error shown
      TodoList.state.items = [];
    } else if (!Array.isArray(stored)) {
      // Corrupt / unexpected data type — show inline notice
      TodoList.state.items = [];
      const notice = document.createElement('span');
      notice.className = 'inline-notice';
      notice.textContent = 'Could not load saved tasks. Starting with an empty list.';
      const errorEl = document.getElementById('todo-error');
      if (errorEl) {
        errorEl.parentNode.insertBefore(notice, errorEl.nextSibling);
      } else {
        section.appendChild(notice);
      }
    } else {
      TodoList.state.items = stored;
      // Sync the insertion counter so new items don't collide with restored ones
      const maxIndex = stored.reduce((max, item) => {
        return (typeof item.insertionIndex === 'number' && item.insertionIndex > max)
          ? item.insertionIndex : max;
      }, -1);
      _todoInsertionCounter = maxIndex + 1;
    }

    // Bind add button
    const addBtn = document.getElementById('todo-add');
    const input = document.getElementById('todo-input');
    if (addBtn && input) {
      const doAdd = function () {
        const val = input.value;
        const validation = TodoList.validateDescription(val);
        if (validation.valid) {
          TodoList.addItem(val);
          input.value = '';
        } else {
          TodoList.addItem(val); // will show inline error
        }
      };

      addBtn.addEventListener('click', doAdd);
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          doAdd();
        }
        // Clear error as user types
        const errorEl = document.getElementById('todo-error');
        if (errorEl) {
          errorEl.textContent = '';
          errorEl.classList.add('hidden');
        }
      });
    }

    // Bind sort select
    const sortSelect = document.getElementById('todo-sort');
    if (sortSelect) {
      sortSelect.value = TodoList.state.sortMode;
      sortSelect.addEventListener('change', function () {
        TodoList.state.sortMode = this.value;
        TodoList._render();
      });
    }

    TodoList._render();
  },
};

// ---------------------------------------------------------------------------
// QuickLinks module
// Add and launch URL shortcuts in new tabs; persists to localStorage.
// ---------------------------------------------------------------------------
const QuickLinks = {
  state: { links: [] },

  // Validates label and URL; returns { valid, reason? }.
  validateLink(label, url) {
    const trimmedLabel = label.trim();
    if (trimmedLabel.length < 1 || trimmedLabel.length > 50) {
      return { valid: false, reason: 'Label must be between 1 and 50 characters.' };
    }
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return { valid: false, reason: 'URL must start with http:// or https://.' };
    }
    return { valid: true };
  },

  // Adds a new link after validation. On failure shows inline error and
  // retains field values. On success creates a Link object, pushes to state,
  // flushes to Storage, and re-renders.
  addLink(label, url) {
    const errorEl = document.getElementById('link-error');
    const result = QuickLinks.validateLink(label, url);

    if (!result.valid) {
      errorEl.textContent = result.reason;
      errorEl.classList.remove('hidden');
      return;
    }

    // Clear error on successful validation
    errorEl.textContent = '';
    errorEl.classList.add('hidden');

    const link = {
      id: generateId(),
      label: label.trim(),
      url: url,
    };

    QuickLinks.state.links.push(link);

    const saved = Storage.write(Storage.KEYS.LINKS, QuickLinks.state.links);
    if (!saved) {
      showToast('Links could not be saved persistently.');
    }

    // Clear input fields on success
    document.getElementById('link-label').value = '';
    document.getElementById('link-url').value = '';

    QuickLinks._render();
  },

  // Removes the link with the given id, flushes to Storage, and re-renders.
  deleteLink(id) {
    QuickLinks.state.links = QuickLinks.state.links.filter(function (link) {
      return link.id !== id;
    });

    const saved = Storage.write(Storage.KEYS.LINKS, QuickLinks.state.links);
    if (!saved) {
      showToast('Links could not be saved persistently.');
    }

    QuickLinks._render();
  },

  // Rebuilds the #links-panel contents from state.links and attaches
  // event listeners for delete buttons.
  _render() {
    const panel = document.getElementById('links-panel');
    if (!panel) return;

    if (QuickLinks.state.links.length === 0) {
      panel.innerHTML = '';
      return;
    }

    let html = '';
    QuickLinks.state.links.forEach(function (link) {
      html +=
        '<div class="link-item">' +
          '<a href="' + link.url + '" target="_blank" rel="noopener noreferrer" class="link-btn">' +
            _escapeHtml(link.label) +
          '</a>' +
          '<button type="button" class="link-delete-btn" data-id="' + link.id + '" aria-label="Delete ' + _escapeHtml(link.label) + '">' +
            'Delete' +
          '</button>' +
        '</div>';
    });
    panel.innerHTML = html;

    // Attach delete listeners
    panel.querySelectorAll('.link-delete-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        QuickLinks.deleteLink(btn.getAttribute('data-id'));
      });
    });
  },

  // Injects DOM markup, hydrates from Storage, binds controls, and
  // performs the initial render.
  init() {
    const section = document.getElementById('links');
    section.innerHTML =
      '<h2>Quick Links</h2>' +
      '<div class="links-form">' +
        '<input id="link-label" type="text" placeholder="Label" maxlength="55" aria-label="Link label" />' +
        '<input id="link-url" type="url" placeholder="https://..." aria-label="Link URL" />' +
        '<button type="button" id="link-add">Add Link</button>' +
        '<span id="link-error" class="inline-error hidden" role="alert" aria-live="polite"></span>' +
      '</div>' +
      '<div id="links-panel"></div>';

    // Hydrate from Storage
    const stored = Storage.read(Storage.KEYS.LINKS);
    if (stored === null) {
      // Key missing is normal on first run — no error notice needed.
      QuickLinks.state.links = [];
    } else if (!Array.isArray(stored)) {
      // Data present but corrupt — show inline notice.
      QuickLinks.state.links = [];
      const panel = document.getElementById('links-panel');
      panel.innerHTML = '<span class="inline-notice">Link data could not be loaded.</span>';
    } else {
      QuickLinks.state.links = stored;
    }

    // Clear inline error while user types in either field
    document.getElementById('link-label').addEventListener('input', function () {
      const errorEl = document.getElementById('link-error');
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    });
    document.getElementById('link-url').addEventListener('input', function () {
      const errorEl = document.getElementById('link-error');
      errorEl.textContent = '';
      errorEl.classList.add('hidden');
    });

    // Bind add button
    document.getElementById('link-add').addEventListener('click', function () {
      const label = document.getElementById('link-label').value;
      const url = document.getElementById('link-url').value;
      QuickLinks.addLink(label, url);
    });

    QuickLinks._render();
  },
};

// ---------------------------------------------------------------------------
// Theme module
// Light / dark theme toggle; OS-preference aware; flash-of-wrong-theme safe.
// ---------------------------------------------------------------------------
const Theme = {
  // Returns 'dark' | 'light' considering saved preference and OS preference.
  resolveInitialTheme() {
    const saved = Storage.read(Storage.KEYS.THEME);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  },

  // Applies theme to <html> element and persists to Storage.
  apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    const saved = Storage.write(Storage.KEYS.THEME, theme);
    if (!saved) {
      showToast('Theme preference could not be saved.');
    }

    // Update toggle button label and aria-label
    const btn = document.getElementById('theme-btn');
    if (!btn) return;
    if (theme === 'light') {
      btn.textContent = '☀️ Light mode';
      btn.setAttribute('aria-label', 'Switch to dark mode');
    } else {
      btn.textContent = '🌙 Dark mode';
      btn.setAttribute('aria-label', 'Switch to light mode');
    }
  },

  // Toggles the current theme.
  toggle() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'light' ? 'dark' : 'light';
    Theme.apply(next);
  },

  init() {
    // Inject DOM markup into #theme-toggle — do NOT modify index.html
    const section = document.getElementById('theme-toggle');
    if (!section) return;

    section.innerHTML = `
      <button id="theme-btn" aria-label="Switch to dark mode">🌙 Dark mode</button>
    `;

    const theme = Theme.resolveInitialTheme();
    Theme.apply(theme);

    document.getElementById('theme-btn').addEventListener('click', function () {
      Theme.toggle();
    });
  },
};

// ---------------------------------------------------------------------------
// Bootstrap — initialise all modules in the order defined by the design:
//   Theme → Greeting → Timer → TodoList → QuickLinks
// Theme must run first so the correct colour scheme is applied before any
// widget paints visible content.
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', function () {
  Theme.init();
  Greeting.init();
  Timer.init();
  TodoList.init();
  QuickLinks.init();
});
