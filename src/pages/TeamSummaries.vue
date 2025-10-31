<template>
  <div class="team-summaries">
    <div class="header">
      <h1>Team Weekly Summaries</h1>
      <div class="actions">
        <input class="date-input" type="date" v-model="dateStr" />
        <button class="btn" @click="refresh">Refresh</button>
      </div>
    </div>

    <div v-if="err" class="err">{{ err }}</div>
    <div v-else-if="loading" class="loading">Loading…</div>

    <div v-else class="grid">
      <div v-for="card in cards" :key="card.key" class="card">
        <div class="card-header">
          <div class="name">
            {{ card.athlete.displayName || card.athlete.email }}
          </div>
          <div class="email">{{ card.athlete.email }}</div>
        </div>
        <div class="metrics">
          <div class="metric">
            <div class="label">Mileage so far</div>
            <div class="value">{{ formatNumber(card.mileageSoFar) }} mi</div>
          </div>
          <div class="metric" v-for="m in trendMetrics" :key="m.key">
            <div class="label">{{ m.label }}</div>
            <div
              class="value trend"
              :class="'trend-' + (card[m.key]?.trendDirection || 'flat')"
            >
              <span class="num">{{
                formatNumber(card[m.key]?.averageActivityMetric)
              }}</span>
              <span class="arrow" aria-hidden="true">{{
                arrow(card[m.key]?.trendDirection)
              }}</span>
            </div>
          </div>
        </div>
        <div class="week">Week starting: {{ formatDate(card.weekStart) }}</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from "vue";
import { useAuth } from "../composables/useAuth";
import { getTeamWeeklySummaries } from "../api/trainingRecords";

const { user } = useAuth();
const loading = ref(false);
const err = ref("");
const cards = ref([]);

function toLocalYMD(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

const dateStr = ref(toLocalYMD());

const trendMetrics = [
  { key: "averageStress", label: "Avg Stress" },
  { key: "averageSleep", label: "Avg Sleep (h)" },
  { key: "averageRestingHeartRate", label: "Avg Rest HR" },
  { key: "averageExerciseHeartRate", label: "Avg Ex HR" },
  { key: "averagePerceivedExertion", label: "Avg RPE" },
];

function formatNumber(n) {
  if (n === null || n === undefined || isNaN(Number(n))) return "—";
  const v = Number(n);
  return Math.round(v * 10) / 10;
}
function arrow(dir) {
  if (dir === "up") return "▲";
  if (dir === "down") return "▼";
  return "•";
}
function formatDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

async function refresh() {
  err.value = "";
  loading.value = true;
  try {
    // get backend userId from window/localStorage (set during login)
    let userId = null;
    try {
      if (window.__tt_userId) userId = window.__tt_userId;
      if (!userId) userId = localStorage.getItem("tt_userId");
      // fallback to Firebase auth uid
      if (!userId && user?.value?.uid) userId = user.value.uid;
      if (userId) localStorage.setItem("tt_userId", userId);
    } catch {}
    if (!userId) {
      err.value = "Please sign in to view team summaries.";
      return;
    }
    const res = await getTeamWeeklySummaries({ userId, date: dateStr.value });
    if (res?.error) {
      err.value = res.error;
      cards.value = [];
    } else {
      const list = (res.summaries || []).map((s, idx) => ({
        key: s.athlete?.id || s.athlete?._id || idx,
        athlete: s.athlete || {},
        weekStart: s.weekStart,
        mileageSoFar: s.mileageSoFar,
        averageStress: s.averageStress,
        averageSleep: s.averageSleep,
        averageRestingHeartRate: s.averageRestingHeartRate,
        averageExerciseHeartRate: s.averageExerciseHeartRate,
        averagePerceivedExertion: s.averagePerceivedExertion,
      }));
      cards.value = list;
    }
  } catch (e) {
    err.value = e?.message || "Failed to load summaries";
  } finally {
    loading.value = false;
  }
}

onMounted(refresh);
</script>

<style scoped>
.team-summaries {
  max-width: 1100px;
  margin: 0 auto;
}
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 8px 0 16px;
}
.actions {
  display: flex;
  gap: 8px;
  align-items: center;
}
.date-input {
  border: 2px solid var(--gray-300);
  border-radius: 8px;
  padding: 8px 10px;
}
.date-input:focus {
  border-color: var(--color-accent);
  box-shadow: 0 0 0 3px rgba(117, 0, 20, 0.12);
  outline: none;
}
.btn {
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 10px;
  padding: 10px 14px;
  font-weight: 700;
}
.btn:hover {
  background: var(--accent-700);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 16px;
}
.card {
  background: #fff;
  border: 1px solid var(--gray-300);
  border-radius: 12px;
  padding: 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}
.card-header {
  margin-bottom: 10px;
}
.name {
  font-weight: 800;
  color: var(--color-heading);
}
.email {
  color: var(--vt-c-text-light-2);
  font-size: 0.9rem;
}
.metrics {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 8px;
}
.metric .label {
  color: var(--gray-600);
  font-weight: 600;
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.metric .value {
  font-weight: 800;
  font-size: 1.1rem;
}
.trend {
  display: flex;
  gap: 6px;
  align-items: center;
}
.trend-up {
  color: #15803d;
}
.trend-down {
  color: #b91c1c;
}
.trend-flat {
  color: var(--gray-600);
}
.week {
  margin-top: 10px;
  color: var(--gray-600);
  font-size: 0.9rem;
}
.loading {
  color: var(--gray-600);
}
.err {
  color: var(--color-accent);
}
</style>
