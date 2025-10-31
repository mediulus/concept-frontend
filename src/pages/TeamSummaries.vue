<template>
  <div class="team-summaries">
    <div class="header">
      <h1>Team Weekly Summaries</h1>
      <div class="actions">
        <input class="date-input" type="date" v-model="dateStr" />
        <button class="btn" @click="refresh">Refresh</button>
      </div>
    </div>

    <!-- Team trends line chart -->
    <div class="trend-card">
      <h2 class="trend-title">Team Trends (last 8 weeks)</h2>
      <div class="trend-chart">
        <canvas ref="chartEl" aria-label="Team trends line chart" />
      </div>
    </div>

    <div v-if="err" class="err">{{ err }}</div>
    <div v-else-if="loading" class="loading">Loading…</div>

    <div v-else class="grid">
      <div v-for="card in cards" :key="card.key" class="card">
        <div class="card-header">
          <button class="name linklike" @click="openLog(card.athlete)">
            {{ personName(card.athlete) }}
          </button>
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

    <!-- Read-only training log modal -->
    <div v-if="logModal.open" class="modal-overlay" @click.self="closeLog">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">{{ personName(logModal.athlete) }}</h3>
          <button class="btn-secondary" @click="closeLog">Close</button>
        </div>
        <ReadOnlyTrainingLog
          v-if="logModal.userId"
          :user-id="logModal.userId"
        />
        <div v-else class="err">No user ID for this athlete.</div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useAuth } from "../composables/useAuth";
import { getTeamWeeklySummaries } from "../api/trainingRecords";
import Chart from "chart.js/auto";
import ReadOnlyTrainingLog from "../components/ReadOnlyTrainingLog.vue";

const { user } = useAuth();
const loading = ref(false);
const err = ref("");
const cards = ref([]);
const chartEl = ref(null);
let chartInstance = null;

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

function personName(p) {
  if (!p) return "";
  const first = p.firstName?.trim?.();
  const last = p.lastName?.trim?.();
  if (first || last) return [first, last].filter(Boolean).join(" ");
  if (p.name) return p.name;
  if (p.fullName) return p.fullName;
  if (p.displayName) return p.displayName;
  return p.email || "";
}

function getUserId() {
  let userId = null;
  try {
    if (window.__tt_userId) userId = window.__tt_userId;
    if (!userId) userId = localStorage.getItem("tt_userId");
    if (!userId && user?.value?.uid) userId = user.value.uid;
    if (userId) localStorage.setItem("tt_userId", userId);
  } catch {}
  return userId;
}

function average(nums) {
  const arr = (nums || [])
    .map((n) => (n === null || n === undefined ? null : Number(n)))
    .filter((n) => !isNaN(n));
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

async function loadTeamTrends(weeks = 8) {
  const userId = getUserId();
  if (!userId) return; // silent if not signed in

  // Build the list of dates (one per week), oldest -> newest
  const base = new Date(dateStr.value);
  const dateList = Array.from({ length: weeks }, (_, idx) => {
    const d = new Date(base);
    d.setDate(d.getDate() - 7 * (weeks - 1 - idx));
    return toLocalYMD(d);
  });

  try {
    const results = await Promise.all(
      dateList.map((d) =>
        getTeamWeeklySummaries({ userId, date: d }).catch(() => null)
      )
    );

    const labels = [];
    const mileage = [];
    const stress = [];
    const sleep = [];
    const rhr = [];
    const exhr = [];
    const rpe = [];

    results.forEach((res, i) => {
      const summaries = res?.summaries || [];
      // Label: prefer server weekStart, else the request date
      const weekStart = summaries[0]?.weekStart || dateList[i];
      labels.push(formatDate(weekStart));

      mileage.push(average(summaries.map((s) => s.mileageSoFar)));
      stress.push(
        average(
          summaries.map(
            (s) =>
              s.averageStress?.averageActivityMetric ?? s.averageStress ?? null
          )
        )
      );
      sleep.push(
        average(
          summaries.map(
            (s) =>
              s.averageSleep?.averageActivityMetric ?? s.averageSleep ?? null
          )
        )
      );
      rhr.push(
        average(
          summaries.map(
            (s) =>
              s.averageRestingHeartRate?.averageActivityMetric ??
              s.averageRestingHeartRate ??
              null
          )
        )
      );
      exhr.push(
        average(
          summaries.map(
            (s) =>
              s.averageExerciseHeartRate?.averageActivityMetric ??
              s.averageExerciseHeartRate ??
              null
          )
        )
      );
      rpe.push(
        average(
          summaries.map(
            (s) =>
              s.averagePerceivedExertion?.averageActivityMetric ??
              s.averagePerceivedExertion ??
              null
          )
        )
      );
    });

    const dsCommon = {
      fill: false,
      spanGaps: true,
      tension: 0.25,
      pointRadius: 2,
      pointHoverRadius: 4,
      pointHitRadius: 8,
    };

    const datasets = [
      {
        label: "Avg Mileage",
        data: mileage,
        borderColor: "#750014",
        backgroundColor: "#750014",
        ...dsCommon,
      },
      {
        label: "Avg Stress",
        data: stress,
        borderColor: "#f59e0b",
        backgroundColor: "#f59e0b",
        ...dsCommon,
      },
      {
        label: "Avg Sleep (h)",
        data: sleep,
        borderColor: "#2563eb",
        backgroundColor: "#2563eb",
        ...dsCommon,
      },
      {
        label: "Avg Rest HR",
        data: rhr,
        borderColor: "#7c3aed",
        backgroundColor: "#7c3aed",
        ...dsCommon,
      },
      {
        label: "Avg Ex HR",
        data: exhr,
        borderColor: "#16a34a",
        backgroundColor: "#16a34a",
        ...dsCommon,
      },
      {
        label: "Avg RPE",
        data: rpe,
        borderColor: "#6b7280",
        backgroundColor: "#6b7280",
        ...dsCommon,
      },
    ];

    const cfg = {
      type: "line",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "nearest", intersect: false },
        plugins: {
          legend: { position: "bottom" },
          tooltip: {
            callbacks: {
              label: (ctx) =>
                `${ctx.dataset.label}: ${formatNumber(ctx.parsed.y)}`,
            },
          },
        },
        scales: {
          x: { grid: { color: "#eee" } },
          y: { grid: { color: "#eee" } },
        },
      },
    };

    // Create or update chart
    if (chartInstance) {
      chartInstance.data.labels = labels;
      chartInstance.data.datasets = datasets;
      chartInstance.update();
    } else if (chartEl.value) {
      chartInstance = new Chart(chartEl.value.getContext("2d"), cfg);
    }
  } catch (e) {
    // Silent fail for chart; page still usable
    // console.error(e);
  }
}

async function refresh() {
  err.value = "";
  loading.value = true;
  try {
    // get backend userId from window/localStorage (set during login)
    const userId = getUserId();
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
      // Update the chart for the current date window
      await loadTeamTrends();
    }
  } catch (e) {
    err.value = e?.message || "Failed to load summaries";
  } finally {
    loading.value = false;
  }
}

onMounted(async () => {
  await refresh();
  await loadTeamTrends();
});

onUnmounted(() => {
  if (chartInstance) {
    try {
      chartInstance.destroy();
    } catch {}
    chartInstance = null;
  }
});

// Read-only training log modal state and helpers
const logModal = ref({ open: false, userId: null, athlete: null });
function athleteUserId(a) {
  return (
    a?.userId ||
    a?.id ||
    a?._id ||
    a?.uid ||
    a?.user?.id ||
    a?.user?._id ||
    null
  );
}
function openLog(athlete) {
  logModal.value = {
    open: true,
    userId: athleteUserId(athlete) ? String(athleteUserId(athlete)) : null,
    athlete,
  };
}
function closeLog() {
  logModal.value = { open: false, userId: null, athlete: null };
}
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
.header h1 {
  color: #ffffff;
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

.trend-card {
  background: #fff;
  border: 1px solid var(--gray-300);
  border-radius: 12px;
  padding: 14px;
  margin: 8px 0 20px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}
.trend-title {
  margin: 0 0 8px 0;
  color: var(--color-heading);
  font-weight: 800;
}
.trend-chart {
  position: relative;
  width: 100%;
  height: 260px;
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
  font-size: 1.2rem;
}
.name.linklike {
  background: transparent;
  border: none;
  padding: 0;
  text-align: left;
  cursor: pointer;
  color: var(--color-heading);
}
.name.linklike:hover {
  text-decoration: underline;
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

/* Modal styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 50;
}
.modal-card {
  width: min(100%, 1000px);
  height: min(90vh, 720px);
  background: #fff;
  border-radius: 12px;
  border: 1px solid var(--gray-300);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  padding: 14px;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.modal-title {
  margin: 0;
  font-weight: 800;
  color: var(--color-heading);
}
</style>
