<template>
  <div class="log-page">
    <h1>Training Log</h1>

    <form class="grid" @submit.prevent="save">
      <label>
        Date
        <input type="date" v-model="date" required />
      </label>
      <label>
        Mileage
        <input type="number" step="0.1" v-model.number="form.mileage" />
      </label>
      <label>
        Stress (1-10)
        <input type="number" min="1" max="10" v-model.number="form.stress" />
      </label>
      <label>
        Sleep (hrs)
        <input type="number" step="0.1" v-model.number="form.sleep" />
      </label>
      <label>
        Resting HR
        <input type="number" v-model.number="form.restingHeartRate" />
      </label>
      <label>
        Exercise HR
        <input type="number" v-model.number="form.exerciseHeartRate" />
      </label>
      <label>
        Perceived Exertion (1-10)
        <input
          type="number"
          min="1"
          max="10"
          v-model.number="form.perceivedExertion"
        />
      </label>
      <label class="span2">
        Notes
        <textarea v-model="form.notes" rows="2"></textarea>
      </label>
      <div class="span2 actions">
        <button type="submit" :disabled="!userId || saving">
          {{ saving ? "Saving…" : "Save" }}
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
    </form>
    <section v-if="entries.length" class="chart-wrap">
      <h2>Weekly Trends</h2>
      <canvas ref="chartEl" height="160"></canvas>
    </section>
  </div>
</template>

<script setup>
import { onMounted, onBeforeUnmount, ref, watch } from "vue";
import { useAuth } from "../composables/useAuth";
import { listEntries, logDailyEntry } from "../api/trainingRecords";
import { loginWithGoogleIdToken } from "../api/userDirectory";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

const { user, auth } = useAuth();
const userId = ref(null);
// Load backend userId from window/localStorage when available
try {
  if (window.__tt_userId) userId.value = window.__tt_userId;
  const cached = localStorage.getItem("tt_userId");
  if (!userId.value && cached) userId.value = cached;
} catch {}

const date = ref(new Date().toISOString().slice(0, 10));
const form = ref({
  mileage: null,
  stress: null,
  sleep: null,
  restingHeartRate: null,
  exerciseHeartRate: null,
  perceivedExertion: null,
  notes: "",
});
const saving = ref(false);
const err = ref(null);
const ok = ref(false);
const entries = ref([]);

const chartEl = ref(null);
let chart;

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
  draw();
}

async function save() {
  err.value = null;
  ok.value = false;
  saving.value = true;
  try {
    if (!userId.value) {
      err.value = "Sign in to save.";
      return;
    }
    const payload = { userId: userId.value, date: date.value, ...form.value };
    const res = await logDailyEntry(payload);
    if (res?.error) {
      err.value = res.error;
    } else {
      ok.value = true;
      await load();
    }
  } catch (e) {
    err.value = e?.response?.data?.error || e?.message || "Failed to save";
  } finally {
    saving.value = false;
    setTimeout(() => (ok.value = false), 1200);
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

function draw() {
  if (!chartEl.value) return;
  const labels = entries.value.map((e) => new Date(e.day).toLocaleDateString());
  const makeData = (key) =>
    entries.value.map((e) => (typeof e[key] === "number" ? e[key] : null));
  const ds = (label, key, color) => ({
    label,
    data: makeData(key),
    borderColor: color,
    backgroundColor: color,
    pointBackgroundColor: color,
    pointBorderColor: color,
    pointHoverBackgroundColor: color,
    pointHoverBorderColor: color,
    pointRadius: 3,
    pointHoverRadius: 4,
    borderWidth: 2,
    tension: 0,
    spanGaps: true,
    fill: false,
  });
  const data = {
    labels,
    datasets: [
      ds("Mileage", "mileage", "#ef4444"),
      ds("Stress", "stress", "#dc2626"),
      ds("Sleep", "sleep", "#f87171"),
      ds("Resting HR", "restingHeartRate", "#b91c1c"),
      ds("Exercise HR", "exerciseHeartRate", "#fb7185"),
      ds("Perceived Exertion", "perceivedExertion", "#991b1b"),
    ],
  };
  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: "bottom",
        labels: { color: "#374151" },
      },
      tooltip: {
        titleColor: "#111827",
        bodyColor: "#111827",
        backgroundColor: "#fff",
        borderColor: "#e5e7eb",
        borderWidth: 1,
      },
    },
    scales: {
      x: {
        ticks: { color: "#111827" },
        grid: { color: "#e5e7eb" },
        border: { color: "#9ca3af" },
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#111827" },
        grid: { color: "#e5e7eb" },
        border: { color: "#9ca3af" },
      },
    },
  };
  if (chart) chart.destroy();
  chart = new Chart(chartEl.value.getContext("2d"), {
    type: "line",
    data,
    options,
  });
}

watch(user, async (val) => {
  // If we later store backend userId on window after sign-in, pick it up
  try {
    if (window.__tt_userId) userId.value = window.__tt_userId;
    if (!userId.value) {
      const cached = localStorage.getItem("tt_userId");
      if (cached) userId.value = cached;
    }
  } catch {}
  await ensureBackendUser();
  await load();
});

onMounted(async () => {
  await ensureBackendUser();
  await load();
});
onBeforeUnmount(() => {
  if (chart) chart.destroy();
});
</script>

<style scoped>
.log-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 16px;
}
.grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}
.span2 {
  grid-column: span 2;
}
.actions {
  display: flex;
  align-items: center;
  gap: 12px;
}
.err {
  color: crimson;
}
.ok {
  color: seagreen;
}
.chart-wrap {
  margin-top: 24px;
}
label {
  display: grid;
  gap: 6px;
  font-size: 0.9rem;
}
input,
textarea {
  padding: 6px 8px;
  border: 1px solid #ddd;
  border-radius: 6px;
}
button {
  padding: 6px 12px;
}
.link-btn {
  background: transparent;
  border: none;
  color: #dc2626;
  padding: 0 4px;
  cursor: pointer;
  text-decoration: underline;
}
.hint {
  color: #6b7280;
}
</style>
