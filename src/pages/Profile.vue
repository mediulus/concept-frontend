<script setup>
import { reactive, ref, onMounted, watch } from "vue";
import { useAuth } from "../composables/useAuth";
import { useToast } from "../composables/useToast";
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
  getTeamByCoach,
  leaveTeam,
  deleteTeam,
} from "../api/teamMembership";
const { user } = useAuth();
console.log("[Profile] Initial user value:", user.value);
const toast = useToast();
const backendProfile = ref(null);
const teamInfo = ref(null);

// Local-only editing state (no API calls yet)
const editing = reactive({ mileage: false, role: false, gender: false });
const drafts = reactive({ mileage: null, role: null, gender: null });

// Backend user id - will be set by onMounted or user watcher
const backendUserId = ref(null);

// Modal state
const showJoinModal = ref(false);
const showCreateModal = ref(false);
const showLeaveModal = ref(false);
const showDisbandModal = ref(false);
const joinForm = reactive({ title: "", passKey: "" });
const createForm = reactive({ title: "", passKey: "" });

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

    // Check for error response from backend
    if (res?.error) {
      toast.error(res.error);
      return;
    }

    // refresh backend profile
    const u = await getUser(backendUserId.value);
    if (!u.error) backendProfile.value = u;
    editing.role = false;
  } catch (e) {
    console.error("[Profile] Failed to save role:", e);
    toast.error(
      e?.response?.data?.error || e?.message || "Failed to save role."
    );
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
    if (!backendUserId.value) {
      console.log("[Profile] loadBackendProfile: no backendUserId");
      return;
    }
    console.log("[Profile] Loading profile for userId:", backendUserId.value);
    const u = await getUser(backendUserId.value);
    console.log("[Profile] getUser response:", u);
    if (!u?.error) {
      backendProfile.value = u;
      console.log("[Profile] backendProfile set to:", backendProfile.value);
    } else {
      console.warn("[Profile] getUser returned error:", u?.error);
    }
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
  await loadTeam();
});

watch(backendUserId, async (val) => {
  console.log("[Profile] backendUserId watcher triggered with:", val);
  if (val) {
    await loadBackendProfile();
    await loadTeam();
  }
});

watch(
  user,
  async (newUser, oldUser) => {
    console.log(
      "[Profile] user watcher triggered. newUser:",
      !!newUser,
      "oldUser:",
      !!oldUser
    );

    // Clear data when signing out
    if (!newUser && oldUser) {
      console.log("[Profile] Clearing data on sign out");
      backendUserId.value = null;
      backendProfile.value = null;
      teamInfo.value = null;
      return;
    }

    // If user signs in, pick up backend id (the backendUserId watcher will load the data)
    if (newUser) {
      console.log("[Profile] User signed in, looking for backend userId...");
      // Retry a few times to wait for signInWithGoogleAndRegister to complete
      for (let i = 0; i < 20; i++) {
        try {
          let uid = null;
          if (typeof window !== "undefined" && window.__tt_userId) {
            uid = window.__tt_userId;
          } else if (typeof localStorage !== "undefined") {
            uid = localStorage.getItem("tt_userId");
          }

          if (uid) {
            console.log("[Profile] Found backend userId:", uid);
            backendUserId.value = uid;
            return;
          }
        } catch {}

        console.log(
          `[Profile] Retry ${i + 1}/20 - backend userId not found yet`
        );
        // Wait 100ms before trying again (increased from 50ms)
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
      console.warn("[Profile] Failed to find backend userId after 20 retries");
    }
  },
  { flush: "post" }
);

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

async function loadTeamForCoach() {
  try {
    if (!backendUserId.value) return;
    if (backendProfile.value?.role !== "coach") {
      teamInfo.value = null;
      return;
    }
    const res = await getTeamByCoach(backendUserId.value);
    teamInfo.value = res && !res.error ? res : null;
  } catch (e) {
    teamInfo.value = null;
  }
}

async function loadTeam() {
  if (!backendUserId.value) return;
  const role = backendProfile.value?.role;
  if (role === "athlete") return loadTeamForAthlete();
  if (role === "coach") return loadTeamForCoach();
  teamInfo.value = null;
}

function openJoinTeam() {
  if (!backendUserId.value) return;
  if (backendProfile.value?.role !== "athlete") {
    console.warn("Only athletes can join teams.");
    return;
  }
  joinForm.title = "";
  joinForm.passKey = "";
  showJoinModal.value = true;
}

async function submitJoinTeam() {
  const title = joinForm.title.trim();
  const passKey = joinForm.passKey.trim();

  if (!title || !passKey) {
    toast.error("Please fill in all fields.");
    return;
  }

  try {
    const res = await joinTeam(backendUserId.value, title, passKey);
    if (res?.error) {
      const msg = res.error.toLowerCase();
      if (msg.includes("not found")) {
        toast.error("That team does not exist.");
      } else if (msg.includes("invalid passkey")) {
        toast.error("Incorrect passkey.");
      } else if (msg.includes("already")) {
        toast.warning("You are already a member of this team.");
      } else {
        toast.error(res.error);
      }
      return;
    }
    toast.success(`Joined team "${title}"!`);
    showJoinModal.value = false;
    await loadTeamForAthlete();
  } catch (e) {
    console.error("[Profile] Failed to join team:", e);
    toast.error("Failed to join team.");
  }
}

function openCreateTeam() {
  if (!backendUserId.value) return;
  if (backendProfile.value?.role !== "coach") {
    console.warn("Only coaches can create teams.");
    return;
  }
  createForm.title = "";
  createForm.passKey = "";
  showCreateModal.value = true;
}

async function submitCreateTeam() {
  const title = createForm.title.trim();
  const passKey = createForm.passKey.trim();

  if (!title || !passKey) {
    toast.error("Please fill in all fields.");
    return;
  }

  try {
    const res = await createTeam(backendUserId.value, title, passKey);
    console.log("[Profile] createTeam response:", res);
    if (res?.error) {
      toast.error(res.error);
    } else {
      showCreateModal.value = false;
      await loadTeam();
    }
  } catch (e) {
    console.error("[Profile] Failed to create team:", e);
    toast.error("Failed to create team.");
  }
}

function onLeaveTeam() {
  if (!backendUserId.value || !teamInfo.value?.name) return;
  showLeaveModal.value = true;
}

async function confirmLeaveTeam() {
  try {
    if (!backendUserId.value || !teamInfo.value?.name) return;
    const res = await leaveTeam(backendUserId.value, teamInfo.value.name);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    showLeaveModal.value = false;
    teamInfo.value = null;
    await loadTeam(); // Refresh team data
  } catch (e) {
    toast.error("Failed to leave team.");
  }
}

function onDisbandTeam() {
  if (!backendUserId.value || !teamInfo.value?.name) return;
  showDisbandModal.value = true;
}

async function confirmDisbandTeam() {
  try {
    if (!backendUserId.value || !teamInfo.value?.name) return;
    const res = await deleteTeam(backendUserId.value, teamInfo.value.name);
    if (res?.error) {
      toast.error(res.error);
      return;
    }
    showDisbandModal.value = false;
    teamInfo.value = null;
    await loadTeam();
    toast.success("Team disbanded!");
  } catch (e) {
    toast.error("Failed to disband team.");
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
              <span v-if="teamInfo?.name" class="team-chip" title="Your team">{{
                teamInfo.name
              }}</span>
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
          <div class="row" v-if="teamInfo?.name">
            <div class="label">Name</div>
            <div class="value">{{ teamInfo.name }}</div>
            <div class="edit">
              <button
                class="btn-secondary"
                :disabled="!backendUserId"
                @click="onDisbandTeam"
              >
                Disband Team
              </button>
            </div>
          </div>
          <div class="row" v-else>
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

    <!-- Join Team Modal -->
    <div
      v-if="showJoinModal"
      class="modal-overlay"
      @click="showJoinModal = false"
    >
      <div class="modal-content" @click.stop>
        <h2 class="modal-title">Join a Team</h2>
        <div class="modal-form">
          <div class="form-group">
            <label for="join-title" class="form-label">Team Name</label>
            <input
              id="join-title"
              v-model="joinForm.title"
              type="text"
              class="form-input"
              placeholder="Enter team name"
              @keyup.enter="submitJoinTeam"
            />
          </div>
          <div class="form-group">
            <label for="join-passkey" class="form-label">Team Passkey</label>
            <input
              id="join-passkey"
              v-model="joinForm.passKey"
              type="password"
              class="form-input"
              placeholder="Enter passkey"
              @keyup.enter="submitJoinTeam"
            />
          </div>
          <div class="modal-actions">
            <button
              class="modal-btn modal-btn-secondary"
              @click="showJoinModal = false"
            >
              Cancel
            </button>
            <button class="modal-btn modal-btn-primary" @click="submitJoinTeam">
              Join Team
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Team Modal -->
    <div
      v-if="showCreateModal"
      class="modal-overlay"
      @click="showCreateModal = false"
    >
      <div class="modal-content" @click.stop>
        <h2 class="modal-title">Create a Team</h2>
        <div class="modal-form">
          <div class="form-group">
            <label for="create-title" class="form-label">Team Name</label>
            <input
              id="create-title"
              v-model="createForm.title"
              type="text"
              class="form-input"
              placeholder="Enter team name"
              @keyup.enter="submitCreateTeam"
            />
          </div>
          <div class="form-group">
            <label for="create-passkey" class="form-label">Team Passkey</label>
            <input
              id="create-passkey"
              v-model="createForm.passKey"
              type="password"
              class="form-input"
              placeholder="Create a passkey"
              @keyup.enter="submitCreateTeam"
            />
          </div>
          <div class="modal-actions">
            <button
              class="modal-btn modal-btn-secondary"
              @click="showCreateModal = false"
            >
              Cancel
            </button>
            <button
              class="modal-btn modal-btn-primary"
              @click="submitCreateTeam"
            >
              Create Team
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Leave Team Confirmation Modal -->
    <div
      v-if="showLeaveModal"
      class="modal-overlay"
      @click="showLeaveModal = false"
    >
      <div class="modal-content confirmation-modal" @click.stop>
        <h2 class="modal-title">Leave Team</h2>
        <p class="confirmation-message">
          Are you sure you want to leave <strong>{{ teamInfo?.name }}</strong
          >?
        </p>
        <div class="modal-actions">
          <button
            class="modal-btn modal-btn-secondary"
            @click="showLeaveModal = false"
          >
            Cancel
          </button>
          <button class="modal-btn modal-btn-danger" @click="confirmLeaveTeam">
            Leave Team
          </button>
        </div>
      </div>
    </div>

    <!-- Disband Team Confirmation Modal -->
    <div
      v-if="showDisbandModal"
      class="modal-overlay"
      @click="showDisbandModal = false"
    >
      <div class="modal-content confirmation-modal" @click.stop>
        <h2 class="modal-title">Disband Team</h2>
        <p class="confirmation-message">
          Are you sure you want to disband <strong>{{ teamInfo?.name }}</strong
          >?
        </p>
        <p class="confirmation-warning">This action cannot be undone.</p>
        <div class="modal-actions">
          <button
            class="modal-btn modal-btn-secondary"
            @click="showDisbandModal = false"
          >
            Cancel
          </button>
          <button
            class="modal-btn modal-btn-danger"
            @click="confirmDisbandTeam"
          >
            Disband Team
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.profile-page {
  max-width: 900px;
  margin: 0 auto;
}
.page-title {
  font-size: 2.25rem;
  font-weight: 700;
  color: #ffffff;
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
  gap: 4px; /* tighter spacing between name and team */
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
  margin-left: 2px;
}
.account-info .email {
  font-size: 0.9rem;
  color: var(--vt-c-text-light-2);
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
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

.modal-content {
  background: #ffffff;
  border-radius: 16px;
  padding: 32px;
  min-width: 400px;
  max-width: 500px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
  border: 1px solid #e0e0e0;
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

.modal-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #750014;
  margin-bottom: 24px;
  text-align: center;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 0.875rem;
  font-weight: 600;
  color: #666666;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  padding: 12px 16px;
  border: 2px solid #e0e0e0;
  border-radius: 10px;
  background: #f5f5f5;
  color: #000000;
  font-size: 1rem;
  transition: all 0.3s ease;
  outline: none;
}

.form-input::placeholder {
  color: #999999;
}

.form-input:focus {
  border-color: #750014;
  background: #ffffff;
  box-shadow: 0 0 0 3px rgba(117, 0, 20, 0.1);
}

.modal-actions {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}

.modal-btn {
  flex: 1;
  padding: 12px 24px;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  outline: none;
}

.modal-btn-primary {
  background: #750014;
  color: #ffffff;
  box-shadow: 0 4px 15px rgba(117, 0, 20, 0.3);
}

.modal-btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(117, 0, 20, 0.4);
  background: #8b0019;
}

.modal-btn-primary:active {
  transform: translateY(0);
}

.modal-btn-secondary {
  background: #f5f5f5;
  color: #333333;
  border: 1px solid #e0e0e0;
}

.modal-btn-secondary:hover {
  background: #e0e0e0;
  border-color: #cccccc;
}

.modal-btn-danger {
  background: #750014;
  color: #ffffff;
  box-shadow: 0 4px 15px rgba(117, 0, 20, 0.3);
}

.modal-btn-danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(117, 0, 20, 0.4);
  background: #8b0019;
}

.modal-btn-danger:active {
  transform: translateY(0);
}

/* Confirmation Modal */
.confirmation-modal {
  max-width: 450px;
  text-align: center;
}

.confirmation-message {
  font-size: 1.1rem;
  color: #333333;
  margin-bottom: 16px;
  line-height: 1.6;
}

.confirmation-message strong {
  color: #750014;
  font-weight: 700;
}

.confirmation-warning {
  font-size: 0.95rem;
  color: #666666;
  font-style: italic;
  margin-bottom: 24px;
}

@media (max-width: 500px) {
  .modal-content {
    min-width: 90%;
    padding: 24px;
  }
}
</style>
