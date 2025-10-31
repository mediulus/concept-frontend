<script setup>
import { ref, computed, reactive, onMounted, watch } from "vue";
import { createEvent, getEventsByDate } from "../api/calendarEvents";
import { sendNotificationToTeam } from "../api/notifications";
import { useAuth } from "../composables/useAuth";

const { user } = useAuth();

// today reference
const today = new Date();

// reactive state for the visible month
const currentYear = ref(today.getFullYear());
const currentMonth = ref(today.getMonth()); // 0-11

// helpers
const monthNames = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];
const weekDayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function daysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function firstWeekday(year, month) {
  return new Date(year, month, 1).getDay(); // 0=Sun ... 6=Sat
}

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11;
    currentYear.value -= 1;
  } else {
    currentMonth.value -= 1;
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0;
    currentYear.value += 1;
  } else {
    currentMonth.value += 1;
  }
}

// build a simple matrix of 6 weeks x 7 days for display
const calendarCells = computed(() => {
  const year = currentYear.value;
  const month = currentMonth.value;
  const start = firstWeekday(year, month);
  const total = daysInMonth(year, month);

  const cells = [];
  // add blanks before day 1
  for (let i = 0; i < start; i++) cells.push(null);
  // add days
  for (let d = 1; d <= total; d++) cells.push(d);
  // pad to full weeks (up to 42 cells)
  while (cells.length % 7 !== 0) cells.push(null);
  while (cells.length < 42) cells.push(null);
  return cells;
});

function isToday(day) {
  return (
    day != null &&
    currentYear.value === today.getFullYear() &&
    currentMonth.value === today.getMonth() &&
    day === today.getDate()
  );
}

// ----------------- Day selection and in-cell events display -----------------
const selectedDay = ref(null); // number (1-31) in current month/year
const eventsLoading = ref(false);
const eventsError = ref("");
const eventsByDay = ref({}); // { [day: number]: Event[] }
const selectedEvent = ref(null);

function openEvent(e) {
  selectedEvent.value = e;
}
function closeEvent() {
  selectedEvent.value = null;
}

async function onSelectDay(day) {
  if (day == null) return;
  selectedDay.value = day;
  eventsLoading.value = true;
  eventsError.value = "";
  // leave other days cached
  try {
    const res = await getEventsByDate({
      day,
      month: currentMonth.value + 1, // convert 0-11 -> 1-12
      year: currentYear.value,
    });
    if (res?.error) {
      eventsError.value = res.error;
    } else {
      eventsByDay.value[day] = res.events || [];
    }
  } catch (e) {
    eventsError.value = e?.message || "Failed to load events.";
  } finally {
    eventsLoading.value = false;
  }
}

// ----------------- Create Event (UI only) -----------------
const showCreate = ref(false);
const form = reactive({
  title: "",
  location: "",
  startAt: "",
  endAt: "",
  description: "",
  link: "",
});
const formError = ref("");
const formOk = ref("");

// ----------------- Notification Feature -----------------
const showNotification = ref(false);
const selectedEventIds = ref(new Set());
const notificationMessage = ref("");
const notificationError = ref("");
const notificationSuccess = ref("");
const sendingNotification = ref(false);

function formatDateTimeLocal(d) {
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}

function openCreateForm() {
  formError.value = "";
  formOk.value = "";
  // toggling: initialize defaults when opening
  if (!showCreate.value) {
    const now = new Date();
    const start = new Date(now);
    start.setMinutes(0, 0, 0);
    const end = new Date(start);
    end.setHours(start.getHours() + 1);
    form.startAt = formatDateTimeLocal(start);
    form.endAt = formatDateTimeLocal(end);
    form.title = "";
    form.location = "";
    form.description = "";
    form.link = "";
  }
  showCreate.value = !showCreate.value;
}

async function submitCreateLocal() {
  formError.value = "";
  formOk.value = "";
  try {
    if (!form.title.trim()) return (formError.value = "Title is required.");
    if (!form.location.trim())
      return (formError.value = "Location is required.");
    if (!form.startAt || !form.endAt)
      return (formError.value = "Start and end are required.");

    const startTime = new Date(form.startAt);
    const endTime = new Date(form.endAt);
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return (formError.value = "Invalid date/time.");
    }
    if (startTime.getTime() >= endTime.getTime()) {
      return (formError.value = "Start time must be before end time.");
    }

    const payload = {
      startTime,
      endTime,
      location: form.location.trim(),
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      link: form.link?.trim() || undefined,
    };

    try {
      const res = await createEvent(payload);
      if (res?.error) {
        formError.value = res.error;
      } else {
        formOk.value = "Event created (server responded).";
        // Optionally close/reset here
        // showCreate.value = false;
      }
    } catch (e) {
      console.warn(
        "Create Event API not available yet:",
        (e && (e.response?.data || e.message)) || e
      );
      formOk.value = "Request prepared. Backend endpoint not ready yet.";
    }
  } catch (e) {
    formError.value = e?.message || "Validation failed.";
  }
}

function openNotificationMode() {
  notificationError.value = "";
  notificationSuccess.value = "";
  if (!showNotification.value) {
    selectedEventIds.value = new Set();
    notificationMessage.value = "";
  }
  showNotification.value = !showNotification.value;
  if (showNotification.value) {
    showCreate.value = false; // Close create form if open
  }
}

function toggleEventSelection(eventId) {
  if (selectedEventIds.value.has(eventId)) {
    selectedEventIds.value.delete(eventId);
  } else {
    selectedEventIds.value.add(eventId);
  }
  // Force reactivity
  selectedEventIds.value = new Set(selectedEventIds.value);
}

function isEventSelected(eventId) {
  return selectedEventIds.value.has(eventId);
}

async function sendNotification() {
  notificationError.value = "";
  notificationSuccess.value = "";

  if (selectedEventIds.value.size === 0) {
    notificationError.value = "Please select at least one event.";
    return;
  }

  if (!user.value) {
    notificationError.value = "You must be signed in to send notifications.";
    return;
  }

  sendingNotification.value = true;
  try {
    // Get user ID from localStorage/window
    let userId = null;
    try {
      if (window.__tt_userId) userId = window.__tt_userId;
      else userId = localStorage.getItem("tt_userId");
    } catch {}

    if (!userId) {
      notificationError.value = "User ID not found. Please sign in.";
      return;
    }

    const res = await sendNotificationToTeam({
      senderId: userId,
      eventIds: Array.from(selectedEventIds.value),
      additionalMessage: notificationMessage.value.trim(),
    });

    if (res?.error) {
      notificationError.value = res.error;
    } else {
      notificationSuccess.value = "Notification sent successfully!";
      selectedEventIds.value.clear();
      selectedEventIds.value = new Set();
      notificationMessage.value = "";
      setTimeout(() => {
        notificationSuccess.value = "";
        showNotification.value = false;
      }, 2000);
    }
  } catch (e) {
    notificationError.value =
      e?.response?.data?.error || e?.message || "Failed to send notification.";
  } finally {
    sendingNotification.value = false;
  }
}

// Load events for all days in the current month
async function loadMonthEvents() {
  eventsLoading.value = true;
  eventsError.value = "";
  const year = currentYear.value;
  const month = currentMonth.value;
  const total = daysInMonth(year, month);

  // Clear existing events for this month
  eventsByDay.value = {};

  // Load events for each day in the month
  const promises = [];
  for (let day = 1; day <= total; day++) {
    promises.push(
      getEventsByDate({
        day,
        month: month + 1, // convert 0-11 -> 1-12
        year,
      })
        .then((res) => {
          if (res?.error) {
            console.error(`Error loading events for day ${day}:`, res.error);
          } else if (res.events && res.events.length > 0) {
            eventsByDay.value[day] = res.events;
          }
        })
        .catch((e) => {
          console.error(`Failed to load events for day ${day}:`, e);
        })
    );
  }

  try {
    await Promise.all(promises);
  } catch (e) {
    eventsError.value = e?.message || "Failed to load events.";
  } finally {
    eventsLoading.value = false;
  }
}

// Auto-select today on mount to trigger the first fetch
onMounted(() => {
  loadMonthEvents();
});

// Watch for month/year changes and reload events
watch([currentYear, currentMonth], () => {
  loadMonthEvents();
});
</script>

<template>
  <div class="calendar-container">
    <div class="calendar-header">
      <button type="button" class="nav-btn" @click="prevMonth">←</button>
      <div class="month-title">
        {{ monthNames[currentMonth] }} {{ currentYear }}
      </div>
      <button type="button" class="nav-btn" @click="nextMonth">→</button>
    </div>

    <div class="create-bar">
      <button type="button" class="btn" @click="openCreateForm">
        {{ showCreate ? "Close" : "Create Event" }}
      </button>
      <button
        type="button"
        class="btn btn-notification"
        @click="openNotificationMode"
      >
        {{ showNotification ? "Close" : "Create Notification" }}
      </button>
    </div>

    <div v-if="showCreate" class="create-card">
      <div class="form-grid">
        <label>
          <span>Title</span>
          <input
            class="input"
            v-model="form.title"
            type="text"
            placeholder="EX. Morning practice"
          />
        </label>
        <label>
          <span>Location</span>
          <input
            class="input"
            v-model="form.location"
            type="text"
            placeholder="EX. Track"
          />
        </label>
        <label>
          <span>Start</span>
          <input class="input" v-model="form.startAt" type="datetime-local" />
        </label>
        <label>
          <span>End</span>
          <input class="input" v-model="form.endAt" type="datetime-local" />
        </label>
        <label class="full">
          <span>Description (optional)</span>
          <textarea
            class="input"
            v-model="form.description"
            rows="2"
            placeholder="EX. Easy run, 4x200 strides"
          ></textarea>
        </label>
        <label class="full">
          <span>Link (optional)</span>
          <input
            class="input"
            v-model="form.link"
            type="url"
            placeholder="https://…"
          />
        </label>
      </div>
      <div class="actions">
        <button class="btn" type="button" @click="submitCreateLocal">
          Create
        </button>
        <span v-if="formError" class="err">{{ formError }}</span>
        <span v-else-if="formOk" class="ok">{{ formOk }}</span>
      </div>
    </div>

    <!-- Notification Panel -->
    <div v-if="showNotification" class="notification-panel">
      <div class="notification-header">
        <h3>Create Notification</h3>
        <p class="hint" v-if="selectedEventIds.size === 0">
          Select events from the calendar to include in the notification
        </p>
        <p class="selected-count" v-else>
          {{ selectedEventIds.size }} event{{
            selectedEventIds.size !== 1 ? "s" : ""
          }}
          selected
        </p>
      </div>
      <div class="notification-body" v-if="selectedEventIds.size > 0">
        <label>
          <span>Additional Message (optional)</span>
          <textarea
            v-model="notificationMessage"
            class="input notification-textarea"
            rows="3"
            placeholder="Add a custom message to the notification email..."
          ></textarea>
        </label>
        <div class="notification-actions">
          <button
            type="button"
            class="btn btn-primary"
            @click="sendNotification"
            :disabled="sendingNotification"
          >
            {{
              sendingNotification ? "Sending..." : "Send Notification to Team"
            }}
          </button>
          <span v-if="notificationError" class="err">{{
            notificationError
          }}</span>
          <span v-if="notificationSuccess" class="ok">{{
            notificationSuccess
          }}</span>
        </div>
      </div>
    </div>

    <table class="calendar-table">
      <thead>
        <tr>
          <th v-for="w in weekDayNames" :key="w">{{ w }}</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in 6" :key="row">
          <td v-for="col in 7" :key="col">
            <div
              v-if="calendarCells[(row - 1) * 7 + (col - 1)] !== null"
              class="day-cell"
            >
              <button
                type="button"
                class="day-btn"
                :class="{
                  today: isToday(calendarCells[(row - 1) * 7 + (col - 1)]),
                  selected:
                    selectedDay === calendarCells[(row - 1) * 7 + (col - 1)],
                }"
                @click="onSelectDay(calendarCells[(row - 1) * 7 + (col - 1)])"
              >
                {{ calendarCells[(row - 1) * 7 + (col - 1)] }}
              </button>
              <!-- events under the day number -->
              <ul
                class="day-events"
                v-if="
                  eventsByDay[calendarCells[(row - 1) * 7 + (col - 1)]]?.length
                "
              >
                <li
                  v-for="e in eventsByDay[
                    calendarCells[(row - 1) * 7 + (col - 1)]
                  ]"
                  :key="e._id"
                  class="day-event-item"
                  :class="{
                    'event-selected':
                      showNotification && isEventSelected(e._id),
                  }"
                  :title="e.title + ' @ ' + e.location"
                >
                  <input
                    v-if="showNotification"
                    type="checkbox"
                    :checked="isEventSelected(e._id)"
                    @click.stop="toggleEventSelection(e._id)"
                    class="event-checkbox"
                  />
                  <span
                    class="dot"
                    @click="!showNotification && openEvent(e)"
                  ></span>
                  <span
                    class="evt-time"
                    @click="!showNotification && openEvent(e)"
                    >{{
                      e.startTime.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    }}</span
                  >
                  <span
                    class="evt-title"
                    @click="!showNotification && openEvent(e)"
                    >{{ e.title }}</span
                  >
                </li>
              </ul>
            </div>
          </td>
        </tr>
      </tbody>
    </table>

    <!-- Event details modal -->
    <div v-if="selectedEvent" class="modal-backdrop" @click.self="closeEvent">
      <div class="modal">
        <div class="modal-header">
          <div class="modal-title">{{ selectedEvent.title }}</div>
          <button type="button" class="modal-close" @click="closeEvent">
            ×
          </button>
        </div>
        <div class="modal-body">
          <div class="modal-row">
            <strong>When:</strong>
            {{ selectedEvent.startTime.toLocaleString() }} –
            {{ selectedEvent.endTime.toLocaleString() }}
          </div>
          <div class="modal-row">
            <strong>Where:</strong> {{ selectedEvent.location }}
          </div>
          <div class="modal-row" v-if="selectedEvent.description">
            <strong>Notes:</strong> {{ selectedEvent.description }}
          </div>
          <div class="modal-row" v-if="selectedEvent.link">
            <strong>Link:</strong>
            <a :href="selectedEvent.link" target="_blank" rel="noopener">{{
              selectedEvent.link
            }}</a>
          </div>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn" @click="closeEvent">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Modern and polished calendar UI */
.calendar-container {
  max-width: 1100px;
  margin: 20px auto;
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.calendar-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 2px solid #f3f4f6;
}
.month-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-heading);
  letter-spacing: -0.025em;
}
.nav-btn {
  background: white;
  border: 2px solid var(--gray-300);
  padding: 8px 16px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--color-text);
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05);
}
.nav-btn:hover {
  background: var(--gray-50);
  border-color: var(--gray-400);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}
.nav-btn:active {
  transform: translateY(0);
}

.create-bar {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-bottom: 16px;
}
.create-card {
  border: 2px solid var(--gray-300);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 16px;
  background: var(--gray-100);
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}
.form-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.form-grid .full {
  grid-column: span 2;
}
.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.form-grid label span {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--gray-600);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.input {
  padding: 10px 14px;
  border: 2px solid var(--gray-300);
  border-radius: 8px;
  width: 100%;
  font-size: 1rem;
  transition: all 0.2s ease;
  background: white;
}
.input:focus {
  outline: none;
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(117, 0, 20, 0.12);
}
.input:hover {
  border-color: var(--gray-400);
}
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
}
.btn {
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 10px;
  padding: 10px 20px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.9375rem;
  transition: all 0.2s ease;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
}
.btn:hover {
  background: var(--accent-700);
  transform: translateY(-1px);
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1),
    0 2px 4px -1px rgba(0, 0, 0, 0.06);
}
.btn:active {
  transform: translateY(0);
}
.btn-notification {
  background: #111111;
  color: #fff;
}
.btn-notification:hover {
  background: #000;
}
.err {
  color: var(--color-accent);
  font-weight: 500;
  font-size: 0.875rem;
}
.ok {
  color: #0f766e;
  font-weight: 500;
  font-size: 0.875rem;
}

.calendar-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  font-size: 0.9375rem;
  overflow: hidden;
  border-radius: 12px;
  box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
}
.calendar-table thead th {
  font-weight: 700;
  color: var(--gray-600);
  background: var(--gray-100);
  padding: 16px 8px;
  text-transform: uppercase;
  font-size: 0.75rem;
  letter-spacing: 0.1em;
  border-bottom: 2px solid var(--gray-300);
}
.calendar-table th:first-child {
  border-top-left-radius: 12px;
}
.calendar-table th:last-child {
  border-top-right-radius: 12px;
}
.calendar-table th,
.calendar-table td {
  border: 1px solid var(--gray-200);
  text-align: center;
  width: calc(100% / 7);
  min-height: 120px;
  padding: 8px;
  vertical-align: top;
  background: white;
}
.calendar-table td {
  transition: background-color 0.15s ease;
}
.calendar-table td:hover {
  background: var(--gray-50);
}
.day-cell {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  min-height: 100px;
}
.day-btn {
  width: 100%;
  min-height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  cursor: pointer;
  font: inherit;
  color: var(--color-text);
  font-weight: 500;
  font-size: 1rem;
  border-radius: 8px;
  transition: all 0.15s ease;
}
.day-btn:hover {
  background: var(--gray-100);
}
.day-btn.today {
  background: var(--color-accent);
  color: white;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(117, 0, 20, 0.3);
}
.day-btn.selected {
  background: var(--accent-100);
  border: 2px solid var(--color-accent);
  color: var(--color-accent);
  font-weight: 600;
}

.day-events {
  list-style: none;
  padding: 0 4px 6px 4px;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
  overflow: auto;
  max-height: 80px;
}
.day-event-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.8125rem;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
  cursor: pointer;
  padding: 6px 8px;
  border-radius: 6px;
  transition: all 0.15s ease;
  background: var(--gray-100);
  border: 1px solid var(--gray-300);
}
.day-event-item:hover {
  background: var(--gray-200);
  border-color: var(--gray-400);
  transform: translateX(2px);
}
.day-event-item.event-selected {
  background: #e8e8e8;
  border-color: #111111;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.15);
}
.event-checkbox {
  cursor: pointer;
  flex-shrink: 0;
  margin: 0;
  width: 16px;
  height: 16px;
  accent-color: var(--color-accent);
}
.day-event-item .dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--color-accent);
  display: inline-block;
  flex-shrink: 0;
  cursor: pointer;
}
.day-event-item .evt-time {
  color: #6b7280;
  font-size: 0.75rem;
  flex-shrink: 0;
  cursor: pointer;
  font-weight: 600;
}
.day-event-item .evt-title {
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  cursor: pointer;
  font-weight: 500;
  color: var(--color-text);
}
.today {
  color: var(--color-heading);
  font-weight: 800;
  text-decoration: underline;
}

@media (max-width: 420px) {
  .calendar-container {
    padding: 12px;
  }
  .calendar-table th,
  .calendar-table td {
    min-height: 90px;
  }
}

/* muted utility remains */
.muted {
  color: var(--vt-c-text-light-2);
}

/* Simple modal */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1500;
  animation: fadeIn 0.2s ease;
}
@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}
.modal {
  background: white;
  color: #111827;
  border-radius: 16px;
  width: min(600px, 92vw);
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1),
    0 10px 10px -5px rgba(0, 0, 0, 0.04);
  animation: slideUp 0.3s ease;
}
@keyframes slideUp {
  from {
    transform: translateY(20px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-bottom: 2px solid #f3f4f6;
}
.modal-title {
  font-weight: 700;
  font-size: 1.25rem;
  color: #111827;
}
.modal-close {
  background: transparent;
  border: none;
  font-size: 2rem;
  line-height: 1;
  cursor: pointer;
  color: #9ca3af;
  transition: color 0.2s ease;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
}
.modal-close:hover {
  color: #374151;
  background: #f3f4f6;
}
.modal-body {
  padding: 20px 24px;
  display: grid;
  gap: 16px;
}
.modal-row {
  display: flex;
  gap: 8px;
  line-height: 1.6;
}
.modal-row strong {
  color: #6b7280;
  font-weight: 600;
  min-width: 80px;
}
.modal-row a {
  color: var(--color-accent);
  text-decoration: underline;
  font-weight: 500;
}
.modal-row a:hover {
  color: var(--accent-700);
}
.modal-actions {
  padding: 16px 24px;
  border-top: 2px solid #f3f4f6;
  display: flex;
  justify-content: flex-end;
}

/* Notification Panel Styles */
.notification-panel {
  margin-top: 20px;
  border: 2px solid var(--color-accent);
  border-radius: 12px;
  padding: 20px;
  background: linear-gradient(to bottom, #fff, #f7f7f8);
  box-shadow: 0 4px 6px -1px rgba(117, 0, 20, 0.1),
    0 2px 4px -1px rgba(117, 0, 20, 0.06);
}
.notification-header h3 {
  margin: 0 0 8px 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--color-accent);
}
.notification-header .hint {
  margin: 0;
  color: var(--gray-600);
  font-size: 0.9375rem;
  font-weight: 500;
}
.notification-header .selected-count {
  margin: 0;
  font-weight: 700;
  color: #111;
  font-size: 1rem;
  background: white;
  padding: 8px 16px;
  border-radius: 8px;
  display: inline-block;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}
.notification-body {
  margin-top: 16px;
  display: grid;
  gap: 16px;
}
.notification-body label {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.notification-body label span {
  font-weight: 600;
  font-size: 0.875rem;
  color: var(--color-accent);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.notification-textarea {
  resize: vertical;
  min-height: 80px;
  font-family: inherit;
  background: white;
  border: 2px solid var(--gray-300);
}
.notification-textarea:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(117, 0, 20, 0.1);
}
.notification-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.btn-primary {
  background: var(--color-accent);
  color: white;
  font-weight: 700;
  box-shadow: 0 2px 4px rgba(117, 0, 20, 0.3);
}
.btn-primary:hover {
  background: var(--accent-700);
  box-shadow: 0 4px 6px rgba(117, 0, 20, 0.4);
}
.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}
</style>
