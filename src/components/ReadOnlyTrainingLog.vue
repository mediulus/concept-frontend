<template>
  <div class="ro-log">
    <div class="ro-header">
      <h3 class="ro-title">Training Log</h3>
    </div>

    <div v-if="loading" class="loading">Loading…</div>
    <div v-else-if="err" class="err">{{ err }}</div>
    <div v-else class="table-wrap">
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
          <tr v-for="row in rows" :key="row.day">
            <td class="date-col">{{ formatDate(row.day) }}</td>
            <td class="num">{{ fmt(row.mileage) }}</td>
            <td class="num">{{ fmt(row.stress) }}</td>
            <td class="num">{{ fmt(row.sleep) }}</td>
            <td class="num">{{ fmt(row.restingHeartRate) }}</td>
            <td class="num">{{ fmt(row.exerciseHeartRate) }}</td>
            <td class="num">{{ fmt(row.perceivedExertion) }}</td>
            <td class="notes">{{ row.notes || "" }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted } from "vue";
import { listEntries } from "../api/trainingRecords";

const props = defineProps({
  userId: { type: String, required: true },
  from: { type: String, default: null },
  to: { type: String, default: null },
});

const loading = ref(false);
const err = ref("");
const rows = ref([]);

function toLocalYMD(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function defaultRange() {
  const to = new Date();
  const from = new Date();
  from.setDate(to.getDate() - 30);
  return { from: toLocalYMD(from), to: toLocalYMD(to) };
}

function formatDate(d) {
  const dt = new Date(d);
  return dt.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function fmt(v) {
  if (v === null || v === undefined || v === "") return "—";
  const n = Number(v);
  if (Number.isNaN(n)) return "—";
  return Math.round(n * 10) / 10;
}

async function load() {
  if (!props.userId) return;
  loading.value = true;
  err.value = "";
  try {
    const range = {
      ...(props.from && { from: props.from }),
      ...(props.to && { to: props.to }),
    };
    const res = await listEntries({ userId: props.userId, ...range });
    if (res?.error) err.value = res.error;
    else rows.value = res.entries || [];
  } catch (e) {
    err.value = e?.message || "Failed to load log";
  } finally {
    loading.value = false;
  }
}

watch(() => [props.userId, props.from, props.to], load, { immediate: true });

onMounted(load);
</script>

<style scoped>
.ro-log {
  display: flex;
  flex-direction: column;
  gap: 10px;
  height: 100%;
}
.ro-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.ro-title {
  margin: 0;
  color: var(--color-heading);
  font-weight: 800;
}
.table-wrap {
  flex: 1;
  min-height: 0;
  overflow: auto;
  border: 1px solid var(--gray-300);
  border-radius: 12px;
}
.training-table {
  width: 100%;
  border-collapse: collapse;
  background: white;
  font-family: "Rethink Sans", -apple-system, BlinkMacSystemFont, "Segoe UI",
    Roboto, "Helvetica Neue", Arial, sans-serif;
  font-size: 14px;
}
.training-table th {
  padding: 10px 8px;
  font-weight: 600;
  text-align: center;
  border-bottom: 2px solid var(--gray-300);
  background: var(--gray-100);
  color: var(--gray-600);
  white-space: nowrap;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.025em;
}
.training-table td {
  padding: 8px;
  border-bottom: 1px solid #f3f4f6;
}
.training-table .date-col {
  width: 170px;
  min-width: 170px;
}
.training-table .num {
  text-align: right;
}
.training-table .notes {
  min-width: 220px;
}
.loading {
  color: var(--gray-600);
}
.err {
  color: var(--color-accent);
}
.btn-secondary {
  background: transparent;
  color: var(--color-text);
  border: 1px solid var(--gray-300);
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}
.btn-secondary:hover {
  background: var(--gray-100);
}
</style>
