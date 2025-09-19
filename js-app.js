diff --git a//dev/null b/js/app.js
index 0000000000000000000000000000000000000000..4ce4da2040cdf903e315a8182dc5f80ce0d189e5 100644
--- a//dev/null
+++ b/js/app.js
@@ -0,0 +1,1042 @@
+const storage = {
+    get(key, fallback) {
+        try {
+            const raw = localStorage.getItem(key);
+            return raw ? JSON.parse(raw) : fallback;
+        } catch (error) {
+            console.error('Failed to read from storage', error);
+            return fallback;
+        }
+    },
+    set(key, value) {
+        try {
+            localStorage.setItem(key, JSON.stringify(value));
+        } catch (error) {
+            console.error('Failed to write to storage', error);
+        }
+    }
+};
+
+const state = {
+    currentDate: new Date(),
+    selectedDate: new Date(),
+    currentView: storage.get('celestial:view', 'month'),
+    events: storage.get('celestial:events', []),
+    tasks: storage.get('celestial:tasks', []),
+    photos: storage.get('celestial:photos', [])
+};
+
+const elements = {
+    clock: document.getElementById('clock'),
+    themeToggle: document.getElementById('themeToggle'),
+    themeLabel: document.getElementById('themeLabel'),
+    calendarContainer: document.getElementById('calendarContainer'),
+    currentPeriodLabel: document.getElementById('currentPeriodLabel'),
+    viewButtons: [...document.querySelectorAll('.view-toggle')],
+    eventFeed: document.getElementById('eventFeed'),
+    addEventBtn: document.getElementById('addEventBtn'),
+    prevPeriod: document.getElementById('prevPeriod'),
+    nextPeriod: document.getElementById('nextPeriod'),
+    todayBtn: document.getElementById('todayBtn'),
+    eventDialog: document.getElementById('eventDialog'),
+    eventForm: document.getElementById('eventForm'),
+    eventTitle: document.getElementById('eventTitle'),
+    eventDescription: document.getElementById('eventDescription'),
+    eventDate: document.getElementById('eventDate'),
+    eventStartTime: document.getElementById('eventStartTime'),
+    eventEndTime: document.getElementById('eventEndTime'),
+    eventColor: document.getElementById('eventColor'),
+    cancelEventBtn: document.getElementById('cancelEventBtn'),
+    eventTemplate: document.getElementById('eventFeedTemplate'),
+    eventDialogTitle: document.getElementById('eventDialogTitle'),
+    addTaskBtn: document.getElementById('addTaskBtn'),
+    taskDialog: document.getElementById('taskDialog'),
+    taskForm: document.getElementById('taskForm'),
+    taskTitle: document.getElementById('taskTitle'),
+    taskNotes: document.getElementById('taskNotes'),
+    taskStartDate: document.getElementById('taskStartDate'),
+    taskTime: document.getElementById('taskTime'),
+    taskFrequency: document.getElementById('taskFrequency'),
+    taskDialogTitle: document.getElementById('taskDialogTitle'),
+    cancelTaskBtn: document.getElementById('cancelTaskBtn'),
+    taskList: document.getElementById('taskList'),
+    taskTemplate: document.getElementById('taskTemplate'),
+    photoUpload: document.getElementById('photoUpload'),
+    photoGallery: document.getElementById('photoGallery'),
+    addPhotoUrlBtn: document.getElementById('addPhotoUrlBtn'),
+    photoUrlDialog: document.getElementById('photoUrlDialog'),
+    photoUrlForm: document.getElementById('photoUrlForm'),
+    photoUrlInput: document.getElementById('photoUrlInput'),
+    cancelPhotoUrlBtn: document.getElementById('cancelPhotoUrlBtn'),
+    fetchWeatherBtn: document.getElementById('fetchWeather'),
+    locationInput: document.getElementById('locationInput'),
+    weatherContent: document.getElementById('weatherContent')
+};
+
+let editingEventId = null;
+let editingTaskId = null;
+
+function randomId() {
+    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
+        return crypto.randomUUID();
+    }
+    return Math.random().toString(36).slice(2, 11);
+}
+
+function formatDate(date) {
+    return date.toLocaleDateString(undefined, {
+        year: 'numeric',
+        month: 'short',
+        day: 'numeric'
+    });
+}
+
+function formatTime(time) {
+    if (!time) return '';
+    const [hour, minute] = time.split(':').map(Number);
+    const date = new Date();
+    date.setHours(hour, minute, 0, 0);
+    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
+}
+
+function formatDateTimeISO(dateStr, timeStr) {
+    if (!dateStr) return null;
+    if (timeStr) {
+        return `${dateStr}T${timeStr}:00`;
+    }
+    return `${dateStr}T00:00:00`;
+}
+
+function clampTimeOrder(startTime, endTime) {
+    if (startTime && endTime && startTime > endTime) {
+        return [startTime, startTime];
+    }
+    return [startTime, endTime];
+}
+
+function startOfDay(date) {
+    const d = new Date(date);
+    d.setHours(0, 0, 0, 0);
+    return d;
+}
+
+function endOfDay(date) {
+    const d = new Date(date);
+    d.setHours(23, 59, 59, 999);
+    return d;
+}
+
+function startOfWeek(date) {
+    const d = startOfDay(date);
+    const day = d.getDay();
+    const diff = d.getDate() - day;
+    return new Date(d.setDate(diff));
+}
+
+function endOfWeek(date) {
+    const start = startOfWeek(date);
+    return new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
+}
+
+function startOfMonth(date) {
+    return new Date(date.getFullYear(), date.getMonth(), 1);
+}
+
+function endOfMonth(date) {
+    return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
+}
+
+function saveState() {
+    storage.set('celestial:events', state.events);
+    storage.set('celestial:tasks', state.tasks);
+    storage.set('celestial:photos', state.photos);
+    storage.set('celestial:view', state.currentView);
+}
+
+function updateClock() {
+    const now = new Date();
+    elements.clock.textContent = now.toLocaleTimeString([], {
+        hour: '2-digit',
+        minute: '2-digit',
+        second: '2-digit'
+    });
+}
+
+function applyTheme(theme) {
+    const isDark = theme === 'dark';
+    document.body.classList.toggle('dark', isDark);
+    elements.themeToggle.checked = isDark;
+    elements.themeLabel.textContent = isDark ? 'Dark Mode' : 'Light Mode';
+    storage.set('celestial:theme', theme);
+}
+
+function detectInitialTheme() {
+    const stored = storage.get('celestial:theme', null);
+    if (stored) {
+        applyTheme(stored);
+        return;
+    }
+    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
+    applyTheme(prefersDark ? 'dark' : 'light');
+}
+
+function setView(view) {
+    state.currentView = view;
+    storage.set('celestial:view', view);
+    elements.viewButtons.forEach((button) => {
+        button.classList.toggle('active', button.dataset.view === view);
+    });
+    renderCalendar();
+}
+
+function adjustPeriod(direction) {
+    const multiplier = direction === 'next' ? 1 : -1;
+    const { currentView } = state;
+    const date = new Date(state.currentDate);
+    if (currentView === 'day') {
+        date.setDate(date.getDate() + multiplier);
+    } else if (currentView === 'week') {
+        date.setDate(date.getDate() + multiplier * 7);
+    } else {
+        date.setMonth(date.getMonth() + multiplier);
+    }
+    state.currentDate = date;
+    state.selectedDate = date;
+    renderCalendar();
+}
+
+function renderCalendar() {
+    elements.calendarContainer.innerHTML = '';
+    const { currentDate, currentView } = state;
+    const periodLabel = new Intl.DateTimeFormat(undefined, {
+        month: currentView === 'month' ? 'long' : 'short',
+        year: 'numeric',
+        day: currentView === 'day' ? 'numeric' : undefined
+    }).format(currentDate);
+    elements.currentPeriodLabel.textContent = periodLabel;
+
+    if (currentView === 'month') {
+        renderMonthView();
+    } else if (currentView === 'week') {
+        renderWeekView();
+    } else {
+        renderDayView();
+    }
+    renderEventFeed();
+}
+
+function renderMonthView() {
+    const { calendarContainer } = elements;
+    const dayNamesRow = document.createElement('div');
+    dayNamesRow.className = 'day-names';
+    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
+    dayNames.forEach((name) => {
+        const span = document.createElement('span');
+        span.textContent = name;
+        dayNamesRow.appendChild(span);
+    });
+    calendarContainer.appendChild(dayNamesRow);
+
+    const grid = document.createElement('div');
+    grid.className = 'calendar-grid';
+
+    const firstDay = startOfMonth(state.currentDate);
+    const lastDay = endOfMonth(state.currentDate);
+    const firstWeekDay = firstDay.getDay();
+    const daysInMonth = lastDay.getDate();
+
+    const totalCells = Math.ceil((firstWeekDay + daysInMonth) / 7) * 7;
+    const startDate = new Date(firstDay);
+    startDate.setDate(firstDay.getDate() - firstWeekDay);
+
+    for (let i = 0; i < totalCells; i += 1) {
+        const date = new Date(startDate);
+        date.setDate(startDate.getDate() + i);
+        const cell = createDayCell(date, date.getMonth() !== state.currentDate.getMonth());
+        grid.appendChild(cell);
+    }
+
+    calendarContainer.appendChild(grid);
+}
+
+function renderWeekView() {
+    const weekStart = startOfWeek(state.currentDate);
+    const wrapper = document.createElement('div');
+    wrapper.className = 'week-view';
+
+    for (let i = 0; i < 7; i += 1) {
+        const date = new Date(weekStart);
+        date.setDate(weekStart.getDate() + i);
+        const dayContainer = document.createElement('div');
+        dayContainer.className = 'week-day';
+        dayContainer.dataset.date = date.toISOString();
+
+        const header = document.createElement('div');
+        header.className = 'week-day-header';
+        const title = document.createElement('h4');
+        title.textContent = new Intl.DateTimeFormat(undefined, {
+            weekday: 'long',
+            month: 'short',
+            day: 'numeric'
+        }).format(date);
+        const dayName = document.createElement('span');
+        dayName.textContent = formatDate(date);
+        header.append(title, dayName);
+
+        const events = getEventsForDate(date);
+        const list = document.createElement('div');
+        list.className = 'events';
+        if (events.length === 0) {
+            const empty = document.createElement('p');
+            empty.textContent = 'No events scheduled';
+            empty.className = 'empty';
+            list.appendChild(empty);
+        } else {
+            events.forEach((event) => {
+                list.appendChild(createEventChip(event));
+            });
+        }
+
+        dayContainer.append(header, list);
+        if (isSameDay(date, state.selectedDate)) {
+            dayContainer.classList.add('selected');
+        }
+        wrapper.appendChild(dayContainer);
+    }
+
+    elements.calendarContainer.appendChild(wrapper);
+}
+
+function renderDayView() {
+    const { calendarContainer } = elements;
+    const dayWrapper = document.createElement('div');
+    dayWrapper.className = 'day-view';
+
+    const header = document.createElement('h3');
+    header.textContent = new Intl.DateTimeFormat(undefined, {
+        weekday: 'long',
+        month: 'long',
+        day: 'numeric',
+        year: 'numeric'
+    }).format(state.currentDate);
+
+    const schedule = document.createElement('div');
+    schedule.className = 'day-schedule';
+
+    const timeLabels = document.createElement('div');
+    timeLabels.className = 'time-labels';
+    for (let hour = 0; hour < 24; hour += 3) {
+        const label = document.createElement('div');
+        const date = new Date();
+        date.setHours(hour, 0, 0, 0);
+        label.textContent = date.toLocaleTimeString([], { hour: 'numeric' });
+        timeLabels.appendChild(label);
+    }
+
+    const eventsColumn = document.createElement('div');
+    eventsColumn.className = 'events-column';
+    const events = getEventsForDate(state.currentDate);
+    if (events.length === 0) {
+        const empty = document.createElement('p');
+        empty.textContent = 'Your day is wide open. Add something inspiring!';
+        eventsColumn.appendChild(empty);
+    } else {
+        events.forEach((event) => {
+            const block = document.createElement('div');
+            block.className = 'schedule-block';
+            block.style.borderLeftColor = event.color || 'var(--accent)';
+
+            const title = document.createElement('strong');
+            title.textContent = event.title;
+
+            const time = document.createElement('span');
+            const startLabel = event.startTime ? formatTime(event.startTime) : 'All Day';
+            const endLabel = event.startTime && event.endTime ? ` – ${formatTime(event.endTime)}` : '';
+            time.textContent = `${startLabel}${endLabel}`;
+
+            block.append(title, time);
+            if (event.description) {
+                const description = document.createElement('p');
+                description.textContent = event.description;
+                description.className = 'event-description';
+                block.appendChild(description);
+            }
+            eventsColumn.appendChild(block);
+        });
+    }
+
+    schedule.append(timeLabels, eventsColumn);
+    dayWrapper.append(header, schedule);
+    calendarContainer.appendChild(dayWrapper);
+}
+
+function createDayCell(date, isOtherMonth = false) {
+    const cell = document.createElement('div');
+    cell.className = 'day-cell';
+    cell.dataset.date = date.toISOString();
+    if (isOtherMonth) {
+        cell.classList.add('other-month');
+    }
+    if (isSameDay(date, new Date())) {
+        cell.classList.add('today');
+    }
+    if (isSameDay(date, state.selectedDate)) {
+        cell.classList.add('selected');
+    }
+
+    const label = document.createElement('div');
+    label.className = 'date-label';
+    const dayNumber = document.createElement('strong');
+    dayNumber.textContent = date.getDate();
+    const dayName = document.createElement('span');
+    dayName.className = 'day-name';
+    dayName.textContent = new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date);
+    label.append(dayNumber, dayName);
+
+    const events = getEventsForDate(date);
+    const eventsContainer = document.createElement('div');
+    eventsContainer.className = 'events';
+    events.slice(0, 3).forEach((event) => {
+        const chip = createEventChip(event);
+        eventsContainer.appendChild(chip);
+    });
+    if (events.length > 3) {
+        const more = document.createElement('span');
+        more.className = 'event-chip';
+        more.textContent = `+${events.length - 3} more`;
+        eventsContainer.appendChild(more);
+    }
+
+    cell.append(label, eventsContainer);
+    return cell;
+}
+
+function createEventChip(event) {
+    const chip = document.createElement('div');
+    chip.className = 'event-chip';
+    chip.style.color = event.color || 'var(--accent)';
+    const timeLabel = event.startTime ? formatTime(event.startTime) : 'All Day';
+    chip.textContent = `${timeLabel} ${event.title}`;
+    chip.title = event.description || '';
+    chip.dataset.eventId = event.id;
+    return chip;
+}
+
+function getEventsForDate(date) {
+    return state.events
+        .filter((event) => isSameDay(new Date(`${event.date}T00:00:00`), date))
+        .sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
+}
+
+function isSameDay(dateA, dateB) {
+    return dateA.getFullYear() === dateB.getFullYear() &&
+        dateA.getMonth() === dateB.getMonth() &&
+        dateA.getDate() === dateB.getDate();
+}
+
+function renderEventFeed() {
+    elements.eventFeed.innerHTML = '';
+    const { start, end } = getCurrentPeriodRange();
+    const events = state.events
+        .filter((event) => {
+            const date = new Date(`${event.date}T00:00:00`);
+            return date >= start && date <= end;
+        })
+        .sort((a, b) => {
+            const dateDiff = new Date(a.date) - new Date(b.date);
+            if (dateDiff !== 0) return dateDiff;
+            return (a.startTime || '').localeCompare(b.startTime || '');
+        });
+
+    if (events.length === 0) {
+        const empty = document.createElement('p');
+        empty.textContent = 'No events scheduled for this period yet.';
+        empty.className = 'empty';
+        elements.eventFeed.appendChild(empty);
+        return;
+    }
+
+    events.forEach((event) => {
+        const node = elements.eventTemplate.content.firstElementChild.cloneNode(true);
+        node.querySelector('.event-color').style.background = event.color || 'var(--accent)';
+        node.querySelector('h4').textContent = event.title;
+        const eventDateObj = new Date(`${event.date}T00:00:00`);
+        const startLabel = event.startTime ? formatTime(event.startTime) : 'All Day';
+        const endLabel = event.startTime && event.endTime ? ` – ${formatTime(event.endTime)}` : '';
+        node.querySelector('.event-time').textContent = `${formatDate(eventDateObj)} • ${startLabel}${endLabel}`;
+        node.querySelector('.event-description').textContent = event.description || 'No additional details.';
+        node.dataset.eventId = event.id;
+        elements.eventFeed.appendChild(node);
+    });
+}
+
+function getCurrentPeriodRange() {
+    const { currentView, currentDate } = state;
+    if (currentView === 'day') {
+        return { start: startOfDay(currentDate), end: endOfDay(currentDate) };
+    }
+    if (currentView === 'week') {
+        return { start: startOfWeek(currentDate), end: endOfWeek(currentDate) };
+    }
+    return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
+}
+
+function openEventDialog(event = null) {
+    if (event) {
+        editingEventId = event.id;
+        elements.eventDialogTitle.textContent = 'Edit Event';
+        elements.eventTitle.value = event.title;
+        elements.eventDescription.value = event.description || '';
+        elements.eventDate.value = event.date;
+        elements.eventStartTime.value = event.startTime || '';
+        elements.eventEndTime.value = event.endTime || '';
+        elements.eventColor.value = event.color || '#6b5cff';
+    } else {
+        editingEventId = null;
+        elements.eventDialogTitle.textContent = 'Add Event';
+        const targetDate = state.selectedDate || new Date();
+        elements.eventTitle.value = '';
+        elements.eventDescription.value = '';
+        elements.eventDate.value = targetDate.toISOString().slice(0, 10);
+        elements.eventStartTime.value = '09:00';
+        elements.eventEndTime.value = '10:00';
+        elements.eventColor.value = '#6b5cff';
+    }
+    elements.eventDialog.showModal();
+}
+
+function openTaskDialog(task = null) {
+    if (task) {
+        editingTaskId = task.id;
+        elements.taskDialogTitle.textContent = 'Edit Task';
+        elements.taskTitle.value = task.title;
+        elements.taskNotes.value = task.notes || '';
+        const nextOccurrence = task.nextOccurrence || task.startDate;
+        elements.taskStartDate.value = nextOccurrence.slice(0, 10);
+        elements.taskTime.value = task.time || '';
+        elements.taskFrequency.value = task.frequency;
+    } else {
+        editingTaskId = null;
+        elements.taskDialogTitle.textContent = 'Add Task';
+        const targetDate = state.selectedDate || new Date();
+        elements.taskTitle.value = '';
+        elements.taskNotes.value = '';
+        elements.taskStartDate.value = targetDate.toISOString().slice(0, 10);
+        elements.taskTime.value = '';
+        elements.taskFrequency.value = 'once';
+    }
+    elements.taskDialog.showModal();
+}
+
+function renderTasks() {
+    elements.taskList.innerHTML = '';
+    const sorted = [...state.tasks].sort((a, b) => {
+        const dateA = new Date(a.nextOccurrence || a.startDate);
+        const dateB = new Date(b.nextOccurrence || b.startDate);
+        return dateA - dateB;
+    });
+
+    if (sorted.length === 0) {
+        const empty = document.createElement('p');
+        empty.textContent = 'No tasks scheduled. Create one to stay on track!';
+        elements.taskList.appendChild(empty);
+        return;
+    }
+
+    sorted.forEach((task) => {
+        const node = elements.taskTemplate.content.firstElementChild.cloneNode(true);
+        node.dataset.taskId = task.id;
+        node.querySelector('.task-title').textContent = task.title;
+        if (task.notes) {
+            node.querySelector('.task-details').title = task.notes;
+        }
+        const nextDate = new Date(task.nextOccurrence || task.startDate);
+        const metaParts = [formatDate(nextDate)];
+        if (task.time) {
+            metaParts.push(formatTime(task.time));
+        }
+        metaParts.push(formatFrequencyLabel(task.frequency));
+        node.querySelector('.task-meta').textContent = metaParts.join(' • ');
+        elements.taskList.appendChild(node);
+    });
+}
+
+function formatFrequencyLabel(freq) {
+    const map = {
+        once: 'One-time',
+        daily: 'Daily',
+        'every-other-day': 'Every Other Day',
+        weekly: 'Weekly',
+        monthly: 'Monthly',
+        yearly: 'Yearly'
+    };
+    return map[freq] || 'One-time';
+}
+
+function saveEventFromForm(event) {
+    event.preventDefault();
+    const title = elements.eventTitle.value.trim();
+    const description = elements.eventDescription.value.trim();
+    const date = elements.eventDate.value;
+    let startTime = elements.eventStartTime.value;
+    let endTime = elements.eventEndTime.value;
+    const color = elements.eventColor.value;
+
+    if (!title || !date) {
+        elements.eventDialog.close();
+        return;
+    }
+
+    [startTime, endTime] = clampTimeOrder(startTime, endTime);
+
+    const eventData = {
+        id: editingEventId || randomId(),
+        title,
+        description,
+        date,
+        startTime,
+        endTime,
+        color
+    };
+
+    if (editingEventId) {
+        state.events = state.events.map((evt) => (evt.id === editingEventId ? eventData : evt));
+    } else {
+        state.events.push(eventData);
+    }
+
+    editingEventId = null;
+    saveState();
+    renderCalendar();
+    elements.eventDialog.close();
+}
+
+function saveTaskFromForm(event) {
+    event.preventDefault();
+    const title = elements.taskTitle.value.trim();
+    const notes = elements.taskNotes.value.trim();
+    const startDate = elements.taskStartDate.value;
+    const time = elements.taskTime.value;
+    const frequency = elements.taskFrequency.value;
+
+    if (!title || !startDate) {
+        elements.taskDialog.close();
+        return;
+    }
+
+    const nextOccurrence = formatDateTimeISO(startDate, time);
+    const taskData = {
+        id: editingTaskId || randomId(),
+        title,
+        notes,
+        startDate: formatDateTimeISO(startDate, time),
+        time,
+        frequency,
+        nextOccurrence
+    };
+
+    if (editingTaskId) {
+        state.tasks = state.tasks.map((task) => (task.id === editingTaskId ? { ...taskData } : task));
+    } else {
+        state.tasks.push(taskData);
+    }
+
+    editingTaskId = null;
+    saveState();
+    renderTasks();
+    elements.taskDialog.close();
+}
+
+function handleTaskCompletion(taskId) {
+    const task = state.tasks.find((t) => t.id === taskId);
+    if (!task) return;
+
+    if (task.frequency === 'once') {
+        state.tasks = state.tasks.filter((t) => t.id !== taskId);
+    } else {
+        const currentDate = new Date(task.nextOccurrence || task.startDate);
+        const nextDate = computeNextOccurrence(currentDate, task.frequency);
+        task.nextOccurrence = nextDate.toISOString();
+        task.startDate = task.startDate || nextDate.toISOString();
+    }
+    saveState();
+    renderTasks();
+}
+
+function computeNextOccurrence(date, frequency) {
+    const next = new Date(date);
+    switch (frequency) {
+        case 'daily':
+            next.setDate(next.getDate() + 1);
+            break;
+        case 'every-other-day':
+            next.setDate(next.getDate() + 2);
+            break;
+        case 'weekly':
+            next.setDate(next.getDate() + 7);
+            break;
+        case 'monthly':
+            next.setMonth(next.getMonth() + 1);
+            break;
+        case 'yearly':
+            next.setFullYear(next.getFullYear() + 1);
+            break;
+        default:
+            next.setDate(next.getDate() + 1);
+            break;
+    }
+    return next;
+}
+
+function deleteEvent(eventId) {
+    state.events = state.events.filter((event) => event.id !== eventId);
+    saveState();
+    renderCalendar();
+}
+
+function deleteTask(taskId) {
+    state.tasks = state.tasks.filter((task) => task.id !== taskId);
+    saveState();
+    renderTasks();
+}
+
+function handleCalendarClick(event) {
+    const dayCell = event.target.closest('.day-cell, .week-day');
+    if (dayCell && dayCell.dataset.date) {
+        const date = new Date(dayCell.dataset.date);
+        state.selectedDate = date;
+        state.currentDate = date;
+        if (event.detail === 2) {
+            openEventDialog();
+        }
+        renderCalendar();
+    }
+    const chip = event.target.closest('.event-chip');
+    if (chip) {
+        const eventId = chip.dataset.eventId;
+        const calendarEvent = state.events.find((evt) => evt.id === eventId);
+        if (calendarEvent) {
+            openEventDialog(calendarEvent);
+        }
+    }
+}
+
+function handleEventFeedClick(event) {
+    const eventNode = event.target.closest('.event-feed-item');
+    if (!eventNode) return;
+    const eventId = eventNode.dataset.eventId;
+    if (event.target.classList.contains('event-delete')) {
+        deleteEvent(eventId);
+    } else if (event.target.classList.contains('event-edit')) {
+        const evt = state.events.find((item) => item.id === eventId);
+        if (evt) openEventDialog(evt);
+    }
+}
+
+function handleTaskListClick(event) {
+    const item = event.target.closest('.task-item');
+    if (!item) return;
+    const taskId = item.dataset.taskId;
+    if (event.target.classList.contains('task-delete')) {
+        deleteTask(taskId);
+        return;
+    }
+    if (event.target.classList.contains('task-edit')) {
+        const task = state.tasks.find((t) => t.id === taskId);
+        if (task) openTaskDialog(task);
+        return;
+    }
+    if (event.target.classList.contains('task-complete')) {
+        handleTaskCompletion(taskId);
+    }
+}
+
+function renderPhotos() {
+    elements.photoGallery.innerHTML = '';
+    if (state.photos.length === 0) {
+        const empty = document.createElement('p');
+        empty.textContent = 'No photos yet. Upload or link your memories!';
+        elements.photoGallery.appendChild(empty);
+        return;
+    }
+
+    state.photos.forEach((photo) => {
+        const figure = document.createElement('figure');
+        const img = document.createElement('img');
+        img.src = photo.src;
+        img.alt = photo.alt || 'Gallery item';
+        const button = document.createElement('button');
+        button.type = 'button';
+        button.textContent = '×';
+        button.addEventListener('click', () => removePhoto(photo.id));
+        figure.append(img, button);
+        elements.photoGallery.appendChild(figure);
+    });
+}
+
+function removePhoto(photoId) {
+    state.photos = state.photos.filter((photo) => photo.id !== photoId);
+    saveState();
+    renderPhotos();
+}
+
+function handlePhotoUpload(event) {
+    const files = [...event.target.files];
+    if (!files.length) return;
+    files.forEach((file) => {
+        const reader = new FileReader();
+        reader.onload = (e) => {
+            state.photos.push({ id: randomId(), src: e.target.result, alt: file.name });
+            saveState();
+            renderPhotos();
+        };
+        reader.readAsDataURL(file);
+    });
+    event.target.value = '';
+}
+
+function openPhotoUrlDialog() {
+    elements.photoUrlInput.value = '';
+    elements.photoUrlDialog.showModal();
+}
+
+function savePhotoFromUrl(event) {
+    event.preventDefault();
+    const url = elements.photoUrlInput.value.trim();
+    if (!url) {
+        elements.photoUrlDialog.close();
+        return;
+    }
+    state.photos.push({ id: randomId(), src: url, alt: 'Linked photo' });
+    saveState();
+    renderPhotos();
+    elements.photoUrlDialog.close();
+}
+
+function computeWeatherEmoji(weathercode) {
+    const map = new Map([
+        [[0], '☀️'],
+        [[1, 2], '🌤️'],
+        [[3], '☁️'],
+        [[45, 48], '🌫️'],
+        [[51, 53, 55], '🌦️'],
+        [[56, 57, 66, 67], '🌧️'],
+        [[61, 63, 65], '🌧️'],
+        [[71, 73, 75, 77], '❄️'],
+        [[80, 81, 82], '🌧️'],
+        [[85, 86], '❄️'],
+        [[95, 96, 99], '⛈️']
+    ]);
+    for (const [codes, emoji] of map.entries()) {
+        if (codes.includes(weathercode)) return emoji;
+    }
+    return '🌡️';
+}
+
+function describeWeatherCode(code) {
+    const descriptions = {
+        0: 'Clear sky',
+        1: 'Mainly clear',
+        2: 'Partly cloudy',
+        3: 'Overcast',
+        45: 'Foggy',
+        48: 'Depositing rime fog',
+        51: 'Light drizzle',
+        53: 'Moderate drizzle',
+        55: 'Dense drizzle',
+        56: 'Light freezing drizzle',
+        57: 'Dense freezing drizzle',
+        61: 'Slight rain',
+        63: 'Moderate rain',
+        65: 'Heavy rain',
+        66: 'Light freezing rain',
+        67: 'Heavy freezing rain',
+        71: 'Slight snow',
+        73: 'Moderate snow',
+        75: 'Heavy snow',
+        77: 'Snow grains',
+        80: 'Rain showers',
+        81: 'Heavy rain showers',
+        82: 'Violent rain showers',
+        85: 'Snow showers',
+        86: 'Heavy snow showers',
+        95: 'Thunderstorm',
+        96: 'Thunderstorm with hail',
+        99: 'Thunderstorm with heavy hail'
+    };
+    return descriptions[code] || 'Weather update';
+}
+
+async function fetchWeather() {
+    const query = elements.locationInput.value.trim();
+    try {
+        elements.weatherContent.innerHTML = '<p class="weather-status">Loading weather...</p>';
+        let latitude;
+        let longitude;
+        let displayName = '';
+
+        if (query) {
+            if (/^-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?$/.test(query)) {
+                const [lat, lon] = query.split(',').map((part) => parseFloat(part.trim()));
+                latitude = lat;
+                longitude = lon;
+                displayName = `Lat ${lat.toFixed(2)}, Lon ${lon.toFixed(2)}`;
+            } else {
+                const geoUrl = new URL('https://geocoding-api.open-meteo.com/v1/search');
+                geoUrl.searchParams.set('name', query);
+                geoUrl.searchParams.set('count', '1');
+                const geoResponse = await fetch(geoUrl.toString());
+                const geoData = await geoResponse.json();
+                if (!geoData || !geoData.results || !geoData.results.length) {
+                    throw new Error('Location not found');
+                }
+                const result = geoData.results[0];
+                latitude = result.latitude;
+                longitude = result.longitude;
+                displayName = `${result.name}, ${result.country_code}`;
+            }
+        } else if (navigator.geolocation) {
+            try {
+                const position = await new Promise((resolve, reject) => {
+                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
+                });
+                latitude = position.coords.latitude;
+                longitude = position.coords.longitude;
+                displayName = 'Your Location';
+            } catch (geoError) {
+                console.warn('Geolocation unavailable, using default city.', geoError);
+                latitude = 40.7128;
+                longitude = -74.0060;
+                displayName = 'New York, USA';
+            }
+        } else {
+            latitude = 40.7128;
+            longitude = -74.0060;
+            displayName = 'New York, USA';
+        }
+
+        const weatherUrl = new URL('https://api.open-meteo.com/v1/forecast');
+        weatherUrl.searchParams.set('latitude', latitude);
+        weatherUrl.searchParams.set('longitude', longitude);
+        weatherUrl.searchParams.set('current_weather', 'true');
+        weatherUrl.searchParams.set('hourly', 'temperature_2m,weathercode');
+        weatherUrl.searchParams.set('daily', 'weathercode,temperature_2m_max,temperature_2m_min');
+        weatherUrl.searchParams.set('timezone', 'auto');
+
+        const response = await fetch(weatherUrl.toString());
+        const data = await response.json();
+        renderWeather(data, displayName);
+    } catch (error) {
+        console.error(error);
+        elements.weatherContent.innerHTML = `<p class="weather-status">Unable to fetch weather. ${error.message}</p>`;
+    }
+}
+
+function renderWeather(data, displayName) {
+    if (!data || !data.current_weather) {
+        elements.weatherContent.innerHTML = '<p class="weather-status">Weather information unavailable.</p>';
+        return;
+    }
+
+    const current = data.current_weather;
+    const emoji = computeWeatherEmoji(current.weathercode);
+    const description = describeWeatherCode(current.weathercode);
+
+    const wrapper = document.createElement('div');
+    wrapper.className = 'weather-card';
+
+    const currentBlock = document.createElement('div');
+    currentBlock.className = 'current-weather';
+    currentBlock.innerHTML = `
+        <div class="current-weather-main">
+            <span class="weather-emoji" aria-hidden="true">${emoji}</span>
+            <div>
+                <strong>${current.temperature.toFixed(0)}°${data.current_weather_units.temperature}</strong>
+                <p>${description}</p>
+            </div>
+        </div>
+        <p class="weather-meta">${displayName} • Wind ${current.windspeed.toFixed(0)} ${data.current_weather_units.windspeed}</p>
+    `;
+
+    const forecastList = document.createElement('div');
+    forecastList.className = 'weather-forecast';
+
+    const days = data.daily.time.slice(0, 3);
+    days.forEach((day, index) => {
+        const code = data.daily.weathercode[index];
+        const dayEmoji = computeWeatherEmoji(code);
+        const min = data.daily.temperature_2m_min[index];
+        const max = data.daily.temperature_2m_max[index];
+        const item = document.createElement('div');
+        item.className = 'weather-forecast-item';
+        const date = new Date(day);
+        item.innerHTML = `
+            <div>
+                <strong>${new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(date)}</strong>
+                <span>${describeWeatherCode(code)}</span>
+            </div>
+            <div class="forecast-right">
+                <span class="weather-emoji">${dayEmoji}</span>
+                <span>${min.toFixed(0)}° / ${max.toFixed(0)}°</span>
+            </div>
+        `;
+        forecastList.appendChild(item);
+    });
+
+    wrapper.append(currentBlock, forecastList);
+    elements.weatherContent.innerHTML = '';
+    elements.weatherContent.appendChild(wrapper);
+}
+
+function init() {
+    detectInitialTheme();
+    updateClock();
+    setInterval(updateClock, 1000);
+    elements.themeToggle.addEventListener('change', () => {
+        applyTheme(elements.themeToggle.checked ? 'dark' : 'light');
+    });
+
+    elements.viewButtons.forEach((button) => {
+        button.addEventListener('click', () => setView(button.dataset.view));
+    });
+    elements.prevPeriod.addEventListener('click', () => adjustPeriod('prev'));
+    elements.nextPeriod.addEventListener('click', () => adjustPeriod('next'));
+    elements.todayBtn.addEventListener('click', () => {
+        const today = new Date();
+        state.currentDate = today;
+        state.selectedDate = today;
+        renderCalendar();
+    });
+
+    elements.addEventBtn.addEventListener('click', () => openEventDialog());
+    elements.cancelEventBtn.addEventListener('click', () => {
+        editingEventId = null;
+        elements.eventDialog.close();
+    });
+    elements.eventForm.addEventListener('submit', saveEventFromForm);
+
+    elements.addTaskBtn.addEventListener('click', () => openTaskDialog());
+    elements.cancelTaskBtn.addEventListener('click', () => {
+        editingTaskId = null;
+        elements.taskDialog.close();
+    });
+    elements.taskForm.addEventListener('submit', saveTaskFromForm);
+
+    elements.calendarContainer.addEventListener('click', handleCalendarClick);
+    elements.eventFeed.addEventListener('click', handleEventFeedClick);
+    elements.taskList.addEventListener('click', handleTaskListClick);
+
+    elements.photoUpload.addEventListener('change', handlePhotoUpload);
+    elements.addPhotoUrlBtn.addEventListener('click', openPhotoUrlDialog);
+    elements.cancelPhotoUrlBtn.addEventListener('click', () => elements.photoUrlDialog.close());
+    elements.photoUrlForm.addEventListener('submit', savePhotoFromUrl);
+
+    elements.fetchWeatherBtn.addEventListener('click', fetchWeather);
+
+    setView(state.currentView);
+    renderTasks();
+    renderPhotos();
+    fetchWeather();
+}
+
+init();
