<template>
  <div class="log-page">
    <div class="header">
      <h1 class="log-title">Training Log</h1>
      <div class="header-actions">
        <button class="jump-today-btn" @click="jumpToToday">
          Jump to Today
        </button>
        <span v-if="!userId" class="hint">
          Sign in to enable saving.
          <button
            v-if="user"
            type="button"
            class="link-btn"
            @click="linkBackendAccount"
          >
            Link account
          </button>
        </span>
        <span v-if="err" class="err">{{ err }}</span>
        <span v-if="ok" class="ok">Saved</span>
      </div>
    </div>

    <div class="spreadsheet-container">
      <table class="training-table">
        <thead>
          <tr>
            <th class="date-col">Date</th>
            <th>Mileage</th>
            <th>Stress (1-10)</th>
            <th>Sleep (hrs)</th>
            <th>Resting HR</th>
            <th>Exercise HR</th>
            <th>Perceived Exertion (1-10)</th>
            <th class="notes-col">Notes</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="row in sortedRows"
            :key="row.date"
            :class="{ 'current-date': row.isToday }"
          >
            <td class="date-col">
              {{ formatDate(row.date) }}
            </td>
            <td>
              <input
                type="number"
                step="0.1"
                v-model.number="row.mileage"
                @blur="saveRow(row)"
                :disabled="!userId"
              />
            </td>
            <td>
              <input
                type="number"
                min="1"
                max="10"
                v-model.number="row.stress"
                @blur="saveRow(row)"
                :disabled="!userId"
              />
            </td>
            <td>
              <input
                type="number"
                step="0.1"
                v-model.number="row.sleep"
                @blur="saveRow(row)"
                :disabled="!userId"
              />
            </td>
            <td>
              <input
                type="number"
                v-model.number="row.restingHeartRate"
                @blur="saveRow(row)"
                :disabled="!userId"
              />
            </td>
            <td>
              <input
                type="number"
                v-model.number="row.exerciseHeartRate"
                @blur="saveRow(row)"
                :disabled="!userId"
              />
            </td>
            <td>
              <input
                type="number"
                min="1"
                max="10"
                v-model.number="row.perceivedExertion"
                @blur="saveRow(row)"
                :disabled="!userId"
              />
            </td>
            <td class="notes-col">
              <input
                type="text"
                v-model="row.notes"
                @blur="saveRow(row)"
                :disabled="!userId"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref, watch, computed } from "vue";
import { useAuth } from "../composables/useAuth";
import { listEntries, logDailyEntry } from "../api/trainingRecords";
import { loginWithGoogleIdToken } from "../api/userDirectory";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";

const { user, auth } = useAuth();
const userId = ref(null);
// Load backend userId from window/localStorage when available
try {
  if (window.__tt_userId) userId.value = window.__tt_userId;
  const cached = localStorage.getItem("tt_userId");
  if (!userId.value && cached) userId.value = cached;
} catch {}

const saving = ref(false);
const err = ref(null);
const ok = ref(false);
const entries = ref([]);

// Local date helpers to avoid UTC shifting
function toLocalYMD(d) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseLocalYMD(s) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

// Generate rows for the past 30 days and next 7 days
const sortedRows = computed(() => {
  const today = new Date();
  const todayStr = toLocalYMD(today);
  const rows = [];

  // Generate date range: 30 days in the past to 7 days in the future
  for (let i = -30; i <= 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dateStr = toLocalYMD(d);

    // Find existing entry for this date
    const existing = entries.value.find((e) => e.day === dateStr);

    rows.push({
      date: dateStr,
      isToday: dateStr === todayStr,
      mileage: existing?.mileage ?? null,
      stress: existing?.stress ?? null,
      sleep: existing?.sleep ?? null,
      restingHeartRate: existing?.restingHeartRate ?? null,
      exerciseHeartRate: existing?.exerciseHeartRate ?? null,
      perceivedExertion: existing?.perceivedExertion ?? null,
      notes: existing?.notes ?? "",
    });
  }

  return rows;
});

function formatDate(dateStr) {
  const date = parseLocalYMD(dateStr);
  const todayStr = toLocalYMD(new Date());

  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const month = monthNames[date.getMonth()];
  const day = date.getDate();
  const year = date.getFullYear();

  const formattedDate = `${month} ${day}, ${year}`;

  if (dateStr === todayStr) {
    return `${formattedDate} (Today)`;
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const dayName = dayNames[date.getDay()];

  return `${formattedDate} (${dayName})`;
}

function jumpToToday() {
  const todayRow = document.querySelector(".current-date");
  if (todayRow) {
    todayRow.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

async function ensureBackendUser() {
  try {
    if (!userId.value && user.value && auth?.currentUser) {
      const idToken = await auth.currentUser.getIdToken();
      const resp = await loginWithGoogleIdToken(idToken);
      if (resp && !resp.error && resp.userId) {
        userId.value = resp.userId;
        try {
          window.__tt_userId = resp.userId;
          localStorage.setItem("tt_userId", resp.userId);
        } catch {}
      } else if (resp?.error) {
        err.value = resp.error;
      }
    }
  } catch (e) {
    // swallow; UI will keep showing sign-in hint
  }
}

async function load() {
  if (!userId.value) return;
  const res = await listEntries({ userId: userId.value });
  if (res?.error) {
    err.value = res.error;
    return;
  }
  entries.value = res.entries || [];
}

async function saveRow(row) {
  if (!userId.value) return;

  err.value = null;
  ok.value = false;
  saving.value = true;

  try {
    const payload = {
      userId: userId.value,
      date: row.date,
      mileage: row.mileage,
      stress: row.stress,
      sleep: row.sleep,
      restingHeartRate: row.restingHeartRate,
      exerciseHeartRate: row.exerciseHeartRate,
      perceivedExertion: row.perceivedExertion,
      notes: row.notes,
    };

    const res = await logDailyEntry(payload);
    if (res?.error) {
      err.value = res.error;
    } else {
      ok.value = true;
      await load();
      setTimeout(() => (ok.value = false), 1200);
    }
  } catch (e) {
    err.value = e?.response?.data?.error || e?.message || "Failed to save";
  } finally {
    saving.value = false;
  }
}

async function linkBackendAccount() {
  try {
    if (!auth?.currentUser) return;
    const provider = new GoogleAuthProvider();
    provider.addScope("openid");
    provider.addScope("email");
    provider.addScope("profile");
    provider.setCustomParameters({ prompt: "select_account" });
    const cred = await signInWithPopup(auth, provider);
    const oauthCred = GoogleAuthProvider.credentialFromResult(cred);
    const googleIdToken = oauthCred?.idToken;
    if (!googleIdToken) {
      err.value = "Could not retrieve Google ID token.";
      return;
    }
    const resp = await loginWithGoogleIdToken(googleIdToken);
    if (resp && !resp.error && resp.userId) {
      userId.value = resp.userId;
      try {
        window.__tt_userId = resp.userId;
        localStorage.setItem("tt_userId", resp.userId);
      } catch {}
      await load();
    } else if (resp?.error) {
      err.value = resp.error;
    }
  } catch (e) {
    err.value = e?.message || "Failed to link account.";
  }
}

watch(user, async (newUser, oldUser) => {
  // Clear data when signing out
  if (!newUser && oldUser) {
    userId.value = null;
    records.value = [];
    return;
  }

  // If we later store backend userId on window after sign-in, pick it up
  if (newUser) {
    try {
      if (window.__tt_userId) userId.value = window.__tt_userId;
      if (!userId.value) {
        const cached = localStorage.getItem("tt_userId");
        if (cached) userId.value = cached;
      }
    } catch {}
    await ensureBackendUser();
    await load();
  }
});

onMounted(async () => {
  await ensureBackendUser();
  await load();

  // Scroll to today's row after the component is mounted
  setTimeout(() => {
    const todayRow = document.querySelector(".current-date");
    if (todayRow) {
      todayRow.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, 100);
});
</script>

<style scoped>
.log-page {
  max-width: 100%;
  margin: 0 auto;
  padding: 20px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background: #f8f9fa;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 0 4px;
}

.header h1 {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 600;
  color: #1a1a1a;
}

.log-title {
  font-size: 2.6rem !important;
  font-weight: 900;
  color: var(--color-accent) !important;
  letter-spacing: -0.01em;
  font-family: "Open Sans", -apple-system, BlinkMacSystemFont, "SF Pro Display",
    "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
}

.jump-today-btn {
  background: #454545;
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 8px 16px;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.jump-today-btn:hover {
  background: #454545;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.15);
}

.jump-today-btn:active {
  transform: scale(0.98);
}

.spreadsheet-container {
  flex: 1;
  overflow: auto;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  background: white;
  border: 1px solid #e5e7eb;
}

.training-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  font-family: "Rethink Sans", -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
}

.training-table thead {
  position: sticky;
  top: 0;
  z-index: 10;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.training-table th {
  padding: 12px 8px;
  font-weight: 600;
  text-align: center;
  border-bottom: 2px solid var(--gray-300);
  border-right: 1px solid var(--gray-200);
  background: var(--gray-100);
  color: var(--gray-600);
  white-space: nowrap;
  user-select: none;
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.training-table th:last-child {
  border-right: none;
}

.training-table td {
  padding: 0;
  border-bottom: 1px solid #f3f4f6;
  border-right: 1px solid #f9fafb;
  background: white;
  height: 42px;
  transition: background-color 0.15s ease;
}

.training-table td:last-child {
  border-right: none;
}

.training-table tbody tr:last-child td {
  border-bottom: none;
}

.training-table tr:hover td {
  background: #f9fafb;
}

.training-table tr.current-date td {
  background: var(--accent-100);
  border-color: var(--color-accent);
}

.training-table tr.current-date:hover td {
  background: var(--accent-200);
}

.training-table input {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  padding: 8px 10px;
  font-family: inherit;
  font-size: inherit;
  box-sizing: border-box;
  outline: none;
  color: #1f2937;
  transition: all 0.15s ease;
}

.training-table input:focus {
  outline: 2px solid var(--color-accent);
  outline-offset: -2px;
  background: white;
  z-index: 1;
  position: relative;
  box-shadow: 0 0 0 3px rgba(117, 0, 20, 0.12);
}

.training-table input:disabled {
  color: #9ca3af;
  cursor: not-allowed;
}

.training-table input[type="number"] {
  text-align: right;
}

.date-col {
  width: 180px;
  min-width: 180px;
  font-weight: 500;
  padding: 8px 12px !important;
  text-align: left !important;
  background: var(--gray-100) !important;
  color: var(--color-text) !important;
}

.training-table tr:hover .date-col {
  background: var(--gray-200) !important;
}

.training-table tr.current-date .date-col {
  background: var(--accent-100) !important;
  font-weight: 600;
}

.notes-col {
  min-width: 250px;
}

.err {
  color: var(--color-accent);
  font-size: 0.875rem;
  font-weight: 500;
}

.ok {
  color: #059669;
  font-size: 0.875rem;
  font-weight: 500;
}

.link-btn {
  background: transparent;
  border: none;
  color: var(--color-accent);
  padding: 0 4px;
  cursor: pointer;
  text-decoration: underline;
  font-size: 0.875rem;
  font-weight: 500;
  transition: color 0.15s ease;
}

.link-btn:hover {
  color: var(--accent-700);
}

.hint {
  color: #6b7280;
  font-size: 0.875rem;
}
</style>
