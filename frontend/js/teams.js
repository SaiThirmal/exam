import { apiRequest, escapeHtml, initPage, requireAuth, setSelectedTeamId, setToken, showToast, state } from "./core.js";

const createTeamFormEl = document.getElementById("create-team-form");
const joinTeamFormEl = document.getElementById("join-team-form");
const teamsListEl = document.getElementById("teams-list");
const teamScopeEl = document.getElementById("team-scope") || document.getElementById("team-select");

function renderTeams(teams) {
  if (!teamScopeEl) {
    showToast("Team scope control not found on page.", true);
    return;
  }
  teamScopeEl.innerHTML = `<option value="">No team (individual)</option>`;
  if (!teams.length) {
    teamsListEl.innerHTML = `<div class="item"><span class="muted">No teams joined yet.</span></div>`;
    setSelectedTeamId("");
    return;
  }
  teamsListEl.innerHTML = teams
    .map(
      (team) => `
      <div class="item">
        <strong>${escapeHtml(team.name)}</strong>
        <div class="meta">
          <span class="pill">Owner: ${escapeHtml(team.owner_username)}</span>
          <span class="pill">Members: ${team.member_count}</span>
          <span class="pill">Invite: ${escapeHtml(team.invite_code)}</span>
        </div>
      </div>
    `
    )
    .join("");
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = String(team.id);
    option.textContent = `${team.name} (#${team.id})`;
    if (state.selectedTeamId && String(team.id) === String(state.selectedTeamId)) {
      option.selected = true;
    }
    teamScopeEl.appendChild(option);
  });

  if (!teams.some((team) => String(team.id) === String(state.selectedTeamId))) {
    setSelectedTeamId("");
  }
}

async function loadTeams() {
  if (!state.currentUser) {
    renderTeams([]);
    return;
  }
  const teams = await apiRequest("/api/teams/mine");
  renderTeams(teams);
}

createTeamFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAuth()) {
    return;
  }
  try {
    const teamName = document.getElementById("team-name").value.trim();
    await apiRequest("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: teamName }),
    });
    createTeamFormEl.reset();
    await loadTeams();
    showToast("Team created");
  } catch (error) {
    showToast(error.message, true);
  }
});

joinTeamFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!requireAuth()) {
    return;
  }
  try {
    const inviteCode = document.getElementById("team-invite").value.trim();
    await apiRequest("/api/teams/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: inviteCode }),
    });
    joinTeamFormEl.reset();
    await loadTeams();
    showToast("Joined team");
  } catch (error) {
    showToast(error.message, true);
  }
});

if (teamScopeEl) {
  teamScopeEl.addEventListener("change", () => {
    setSelectedTeamId(teamScopeEl.value || "");
  });
}

document.getElementById("logout-btn")?.addEventListener("click", async () => {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch {
    // Best effort.
  }
  setToken(null);
  setSelectedTeamId("");
  await initPage("teams");
  await loadTeams();
  showToast("Signed out");
});

async function init() {
  await initPage("teams");
  await loadTeams();
}

init().catch((error) => showToast(`Failed to initialize teams: ${error.message}`, true));
