<script setup>
import { reactive, ref, onMounted, watch } from "vue";
import { useAuth } from "../composables/useAuth";
import {
  editUserMileage,
  editUserRole,
  getUser,
  editUserGender,
} from "../api/userDirectory";
import {
  createTeam,
  joinTeam,
  getTeamByAthlete,
  leaveTeam,
} from "../api/teamMembership";
const { user } = useAuth();
const backendProfile = ref(null);
const teamInfo = ref(null);

// Local-only editing state (no API calls yet)
const editing = reactive({ mileage: false, role: false, gender: false });
const drafts = reactive({ mileage: null, role: null, gender: null });

// Backend user id saved after login (see login flow)
const backendUserId = ref(
  (typeof localStorage !== "undefined" && localStorage.getItem("tt_userId")) ||
    (typeof window !== "undefined" && window.__tt_userId) ||
    null
);

function openMileageEditor() {
  if (backendProfile.value?.role !== "athlete") {
    console.warn("Only athletes can set mileage.");
    return;
  }
  editing.mileage = true;
  drafts.mileage = backendProfile.value?.weeklyMileage ?? null;
}
async function saveMileageLocal() {
  if (!backendUserId.value) {
    console.warn("No backend userId found; cannot save mileage.");
    return;
  }
  try {
    const n = Number(drafts.mileage);
    const res = await editUserMileage(backendUserId.value, n);
    console.log("[Profile] Saved mileage response:", res);
    // refresh backend profile
    const u = await getUser(backendUserId.value);
    if (!u.error) backendProfile.value = u;
    editing.mileage = false;
  } catch (e) {
    console.error("[Profile] Failed to save mileage:", e);
  }
}

function openRoleEditor() {
  editing.role = true;
  drafts.role = backendProfile.value?.role ?? null;
}

async function saveRoleLocal() {
  if (!backendUserId.value) {
    console.warn("No backend userId found; cannot save role.");
    return;
  }
  try {
    const res = await editUserRole(backendUserId.value, drafts.role);
    console.log("[Profile] Saved role response:", res);
    // refresh backend profile
    const u = await getUser(backendUserId.value);
    if (!u.error) backendProfile.value = u;
    editing.role = false;
  } catch (e) {
    console.error("[Profile] Failed to save role:", e);
  }
}

function openGenderEditor() {
  editing.gender = true;
  drafts.gender = backendProfile.value?.gender ?? null;
}
function saveGenderLocal() {
  (async () => {
    if (!backendUserId.value) {
      console.warn("No backend userId found; cannot save gender.");
      return;
    }
    if (!drafts.gender) {
      console.warn("Gender is not selected.");
      return;
    }
    try {
      const res = await editUserGender(backendUserId.value, drafts.gender);
      console.log("[Profile] Saved gender response:", res);
      const u = await getUser(backendUserId.value);
      if (!u.error) backendProfile.value = u;
      editing.gender = false;
    } catch (e) {
      console.error("[Profile] Failed to save gender:", e);
    }
  })();
}

async function loadBackendProfile() {
  try {
    if (!backendUserId.value) return;
    const u = await getUser(backendUserId.value);
    if (!u?.error) backendProfile.value = u;
  } catch (e) {
    console.warn("[Profile] Failed to load backend profile:", e);
  }
}

onMounted(async () => {
  // Try to hydrate backendUserId from window/localStorage if missing
  if (!backendUserId.value) {
    try {
      if (typeof window !== "undefined" && window.__tt_userId) {
        backendUserId.value = window.__tt_userId;
      } else if (typeof localStorage !== "undefined") {
        const cached = localStorage.getItem("tt_userId");
        if (cached) backendUserId.value = cached;
      }
    } catch {}
  }
  await loadBackendProfile();
  await loadTeamForAthlete();
});

watch(backendUserId, async (val) => {
  if (val) {
    await loadBackendProfile();
    await loadTeamForAthlete();
  }
});

watch(user, async () => {
  // If user signs in later, pick up backend id and load profile
  if (!backendUserId.value) {
    try {
      if (typeof window !== "undefined" && window.__tt_userId) {
        backendUserId.value = window.__tt_userId;
      } else if (typeof localStorage !== "undefined") {
        const cached = localStorage.getItem("tt_userId");
        if (cached) backendUserId.value = cached;
      }
    } catch {}
  }
  await loadBackendProfile();
  await loadTeamForAthlete();
});

async function loadTeamForAthlete() {
  try {
    if (!backendUserId.value) return;
    if (backendProfile.value?.role !== "athlete") {
      teamInfo.value = null;
      return;
    }
    const res = await getTeamByAthlete(backendUserId.value);
    teamInfo.value = res && !res.error ? res : null;
  } catch (e) {
    teamInfo.value = null;
  }
}

function openJoinTeam() {
  (async () => {
    if (!backendUserId.value) return;
    if (backendProfile.value?.role !== "athlete") {
      console.warn("Only athletes can join teams.");
      return;
    }
    const title = window.prompt("Team title?")?.trim();
    if (!title) return;
    const passKey = window.prompt("Team passKey?")?.trim();
    if (!passKey) return;
    try {
      const res = await joinTeam(backendUserId.value, title, passKey);
      if (res?.error) {
        const msg = res.error.toLowerCase();
        if (msg.includes("not found")) {
          alert("That team does not exist.");
        } else if (msg.includes("invalid passkey")) {
          alert("Incorrect passkey.");
        } else if (msg.includes("already")) {
          alert("You are already a member of this team.");
        } else {
          alert(res.error);
        }
        return;
      }
      alert(`Joined team "${title}"`);
      await loadTeamForAthlete();
    } catch (e) {
      console.error("[Profile] Failed to join team:", e);
      alert("Failed to join team.");
    }
  })();
}

function openCreateTeam() {
  (async () => {
    if (!backendUserId.value) return;
    if (backendProfile.value?.role !== "coach") {
      console.warn("Only coaches can create teams.");
      return;
    }
    const title = window.prompt("Team name?")?.trim();
    if (!title) return;
    const passKey = window.prompt("Team passKey?")?.trim();
    if (!passKey) return;
    try {
      const res = await createTeam(backendUserId.value, title, passKey);
      console.log("[Profile] createTeam response:", res);
      if (res?.error) {
        alert(res.error);
      } else {
        alert(`Team "${res.newTeam?.name || title}" created`);
      }
    } catch (e) {
      console.error("[Profile] Failed to create team:", e);
      alert("Failed to create team.");
    }
  })();
}

async function onLeaveTeam() {
  try {
    if (!backendUserId.value || !teamInfo.value?.name) return;
    const ok = window.confirm(`Leave team "${teamInfo.value.name}"?`);
    if (!ok) return;
    const res = await leaveTeam(backendUserId.value, teamInfo.value.name);
    if (res?.error) {
      alert(res.error);
      return;
    }
    teamInfo.value = null;
    alert("You left the team.");
  } catch (e) {
    alert("Failed to leave team.");
  }
}
</script>

<template>
  <div class="profile-page">
    <h1 class="page-title">Profile</h1>
    <div v-if="!user" class="card">You are not signed in.</div>
    <div v-else class="grid">
      <!-- Account summary with team next to name (no profile photo) -->
      <section class="card account">
        <div class="account-row">
          <div class="account-info">
            <div class="name-row">
              <span class="name">{{ user.displayName || "—" }}</span>
              <span
                v-if="backendProfile?.role === 'athlete' && teamInfo?.name"
                class="team-chip"
                title="Your team"
                >{{ teamInfo.name }}</span
              >
            </div>
            <div class="email">{{ user.email || "—" }}</div>
          </div>
        </div>
      </section>

      <!-- Preferences & Training: Role, Gender, Mileage -->
      <section class="card">
        <h2 class="section-title">Preferences & Training</h2>
        <div class="row">
          <div class="label">Role</div>
          <div class="value" v-if="!editing.role">
            {{ backendProfile?.role ?? "—" }}
          </div>
          <div class="edit" v-if="!editing.role">
            <button class="btn" @click="openRoleEditor">Edit</button>
          </div>
          <div class="edit-group" v-else>
            <select v-model="drafts.role" class="input">
              <option :value="null">—</option>
              <option value="athlete">Athlete</option>
              <option value="coach">Coach</option>
            </select>
            <button class="btn" @click="saveRoleLocal">Save</button>
            <button class="btn-secondary" @click="editing.role = false">
              Cancel
            </button>
          </div>
        </div>

        <div class="row">
          <div class="label">Gender</div>
          <div class="value" v-if="!editing.gender">
            {{ backendProfile?.gender ?? "—" }}
          </div>
          <div class="edit" v-if="!editing.gender">
            <button class="btn" @click="openGenderEditor">Edit</button>
          </div>
          <div class="edit-group" v-else>
            <select v-model="drafts.gender" class="input">
              <option :value="null">—</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
            </select>
            <button class="btn" @click="saveGenderLocal">Save</button>
            <button class="btn-secondary" @click="editing.gender = false">
              Cancel
            </button>
          </div>
        </div>

        <!-- Weekly mileage (athlete only) -->
        <div class="row" v-if="backendProfile?.role === 'athlete'">
          <div class="label">Weekly mileage</div>
          <div class="value" v-if="!editing.mileage">
            {{ backendProfile?.weeklyMileage ?? "—" }}
          </div>
          <div class="edit" v-if="!editing.mileage">
            <button class="btn" @click="openMileageEditor">Edit</button>
          </div>
          <div class="edit-group" v-else>
            <input
              class="input"
              type="number"
              min="0"
              step="1"
              v-model.number="drafts.mileage"
            />
            <button class="btn" @click="saveMileageLocal">Save</button>
            <button class="btn-secondary" @click="editing.mileage = false">
              Cancel
            </button>
          </div>
        </div>
      </section>

      <!-- Team actions -->
      <section class="card team" v-if="backendProfile">
        <h2 class="section-title">Team</h2>
        <template v-if="backendProfile?.role === 'athlete'">
          <div class="row" v-if="teamInfo?.name">
            <div class="label">Membership</div>
            <div class="value">&nbsp;</div>
            <div class="edit">
              <button
                class="btn-secondary"
                :disabled="!backendUserId"
                @click="onLeaveTeam"
              >
                Leave Team
              </button>
            </div>
          </div>
          <div class="row" v-else>
            <div class="label">Join a team</div>
            <div class="value">&nbsp;</div>
            <div class="edit">
              <button
                class="btn"
                :disabled="!backendUserId"
                @click="openJoinTeam"
              >
                Join Team
              </button>
            </div>
          </div>
        </template>
        <template v-else-if="backendProfile?.role === 'coach'">
          <div class="row">
            <div class="label">Create a team</div>
            <div class="edit">
              <button
                class="btn"
                :disabled="!backendUserId"
                @click="openCreateTeam"
              >
                Create Team
              </button>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="muted">Set your role to manage team membership.</div>
        </template>
      </section>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 900px;
  margin: 0 auto;
}
.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: var(--color-heading);
  margin-bottom: 12px;
}
.grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}
@media (min-width: 800px) {
  .grid {
    grid-template-columns: 1fr 1fr;
  }
  .team {
    grid-column: span 2;
  }
}
.card {
  background: var(--color-background);
  border: 1px solid var(--gray-300);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.04);
}
.section-title {
  font-size: 1rem;
  font-weight: 700;
  color: var(--color-text);
  margin-bottom: 8px;
}
.row {
  display: grid;
  grid-template-columns: 140px 1fr auto;
  gap: 10px;
  align-items: center;
  padding: 6px 0;
}
.label {
  font-weight: 600;
  color: var(--color-text);
}
.value {
  color: var(--color-text);
}
.edit {
  white-space: nowrap;
}
.edit-group {
  display: flex;
  gap: 8px;
  align-items: center;
  justify-content: flex-end;
}
.input {
  padding: 6px 8px;
  border: 1px solid var(--gray-300);
  border-radius: 8px;
  min-width: 140px;
}
.btn {
  background: var(--color-accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  padding: 6px 10px;
  cursor: pointer;
}
.btn:hover {
  background: var(--accent-700);
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
.muted {
  color: var(--vt-c-text-light-2);
}

/* Account header */
.account .account-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}
.account-info .name {
  font-weight: 700;
}
.team-chip {
  font-size: 0.85rem;
  padding: 2px 8px;
  border: 1px solid var(--gray-300);
  border-radius: 999px;
  background: var(--accent-100);
  color: var(--color-accent);
}
.account-info .email {
  font-size: 0.9rem;
  color: var(--vt-c-text-light-2);
}
</style>
