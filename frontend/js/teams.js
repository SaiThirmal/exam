import { $, apiRequest, getCurrentUser, loadSessionUser, renderTopBar, setToken, showToast } from "./core.js";

const createTeamFormEl = $("#create-team-form");
const joinTeamFormEl = $("#join-team-form");
const teamsListEl = $("#teams-list");
const teamScopeEl = $("#team-scope");

function renderTeams(teams) {
  teamScopeEl.innerHTML = `<option value="">No team (individual)</option>`;
  if (!teams.length) {
    teamsListEl.innerHTML = `<div class="item"><span class="muted">No teams joined yet.</span></div>`;
    return;
  }
  teamsListEl.innerHTML = teams
    .map(
      (team) => `
      <div class="item">
        <strong>${team.name}</strong>
        <div class="meta">
          <span class="pill">Owner: ${team.owner_username}</span>
          <span class="pill">Members: ${team.member_count}</span>
          <span class="pill">Invite: ${team.invite_code}</span>
        </div>
      </div>
    `
    )
    .join("");
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = String(team.id);
    option.textContent = `${team.name} (#${team.id})`;
    teamScopeEl.appendChild(option);
  });
}

async function loadTeams() {
  if (!getCurrentUser()) {
    renderTeams([]);
    return;
  }
  const teams = await apiRequest("/api/teams/mine");
  renderTeams(teams);
}

createTeamFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!getCurrentUser()) {
    showToast("Please sign in first", true);
    return;
  }
  try {
    const teamName = $("#team-name").value.trim();
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
  if (!getCurrentUser()) {
    showToast("Please sign in first", true);
    return;
  }
  try {
    const inviteCode = $("#team-invite").value.trim();
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

$("#logout-btn").addEventListener("click", async () => {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch {
    // Best effort.
  }
  setToken(null);
  await renderTopBar();
  await loadTeams();
  showToast("Signed out");
});

async function init() {
  await loadSessionUser();
  await renderTopBar();
  await loadTeams();
}

init().catch((error) => showToast(`Failed to initialize teams: ${error.message}`, true));
