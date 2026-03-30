const scenarioListEl = document.getElementById("scenario-list");
const scenarioDetailEl = document.getElementById("scenario-detail");
const leaderboardBodyEl = document.getElementById("leaderboard-body");
const leaderboardHeaderEl = document.getElementById("leaderboard-header");
const attemptFormEl = document.getElementById("attempt-form");
const resultEl = document.getElementById("result");
const authStateEl = document.getElementById("auth-state");
const teamsListEl = document.getElementById("teams-list");
const teamSelectEl = document.getElementById("team-select");
const progressBoxEl = document.getElementById("progress-box");
const registerFormEl = document.getElementById("register-form");
const loginFormEl = document.getElementById("login-form");
const createTeamFormEl = document.getElementById("create-team-form");
const joinTeamFormEl = document.getElementById("join-team-form");
const logoutBtnEl = document.getElementById("logout-btn");
const individualTabEl = document.getElementById("individual-tab");
const teamTabEl = document.getElementById("team-tab");
const toastEl = document.getElementById("toast");
const statScenariosEl = document.getElementById("stat-scenarios");
const statModeEl = document.getElementById("stat-mode");
const statTeamsEl = document.getElementById("stat-teams");
const healthDotEl = document.querySelector(".dot");

let selectedScenarioId = null;
let accessToken = localStorage.getItem("cyberrange_token");
let currentUser = null;
let leaderboardMode = "individual";

const dom = {
  registerUsername: document.getElementById("register-username"),
  registerPassword: document.getElementById("register-password"),
  registerRole: document.getElementById("register-role"),
  loginUsername: document.getElementById("login-username"),
  loginPassword: document.getElementById("login-password"),
  teamName: document.getElementById("team-name"),
  teamInvite: document.getElementById("team-invite"),
  payload: document.getElementById("payload"),
  evidence: document.getElementById("evidence"),
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function showToast(message, isError = false) {
  toastEl.textContent = message;
  toastEl.style.borderColor = isError ? "rgba(255, 93, 115, 0.65)" : "rgba(78, 140, 255, 0.55)";
  toastEl.classList.add("show");
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => toastEl.classList.remove("show"), 2400);
}

async function apiRequest(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    const fallbackMessage = `Request failed with status ${response.status}`;
    let message = fallbackMessage;
    try {
      const payload = await response.json();
      message = payload.detail || fallbackMessage;
    } catch {
      message = fallbackMessage;
    }
    throw new Error(message);
  }
  if (response.status === 204) {
    return null;
  }
  return response.json();
}

function modeLabel() {
  return leaderboardMode === "individual" ? "Individual" : "Team";
}

function renderScenarioCard(item) {
  const tags = item.tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("");
  return `
    <article class="scenario-item">
      <strong>${escapeHtml(item.title)}</strong>
      <div class="meta">
        <span class="pill">${escapeHtml(item.difficulty)}</span>
        ${tags}
      </div>
      <button data-scenario-id="${escapeHtml(item.id)}" type="button">Load Mission</button>
    </article>
  `;
}

function renderScenarioDetail(detail) {
  const hints = detail.hints.map((hint) => `<li>${escapeHtml(hint)}</li>`).join("");
  const examples = detail.safe_payload_examples
    .map((sample) => `<li><code>${escapeHtml(sample)}</code></li>`)
    .join("");

  scenarioDetailEl.innerHTML = `
    <h3>${escapeHtml(detail.title)}</h3>
    <p>${escapeHtml(detail.description)}</p>
    <p><strong>Objective:</strong> ${escapeHtml(detail.objective)}</p>
    <strong>Hints</strong>
    <ul>${hints}</ul>
    <strong>Safe payload examples</strong>
    <ul>${examples}</ul>
  `;
}

function renderResult(result) {
  const feedbackItems = result.feedback.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
  resultEl.className = `result ${result.passed ? "pass" : "fail"}`;
  resultEl.innerHTML = `
    <strong>${result.passed ? "PASS" : "NOT PASSED"} · Score ${result.score}/100</strong>
    <ul>${feedbackItems}</ul>
  `;
}

function renderLeaderboard(entries) {
  const nameHeader = leaderboardMode === "individual" ? "User" : "Team";
  leaderboardHeaderEl.innerHTML = `
    <th>#</th>
    <th>${nameHeader}</th>
    <th>Total Score</th>
    <th>Successes</th>
    <th>Attempts</th>
    <th>Last Attempt</th>
  `;

  if (!entries.length) {
    leaderboardBodyEl.innerHTML = `
      <tr>
        <td colspan="6" class="muted">No attempts recorded yet.</td>
      </tr>
    `;
    return;
  }

  leaderboardBodyEl.innerHTML = entries
    .map(
      (entry, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(entry.user_id || entry.team_name)}</td>
        <td>${entry.total_score}</td>
        <td>${entry.successful_attempts}</td>
        <td>${entry.total_attempts}</td>
        <td>${new Date(entry.last_attempt_at).toLocaleString()}</td>
      </tr>
    `
    )
    .join("");
}

async function loadScenarios() {
  const scenarios = await apiRequest("/api/scenarios");
  statScenariosEl.textContent = String(scenarios.length);
  scenarioListEl.innerHTML = scenarios.map(renderScenarioCard).join("");

  scenarioListEl.querySelectorAll("button[data-scenario-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const scenarioId = button.getAttribute("data-scenario-id");
      selectedScenarioId = scenarioId;
      const detail = await apiRequest(`/api/scenarios/${scenarioId}`);
      renderScenarioDetail(detail);
      showToast(`Mission loaded: ${detail.title}`);
    });
  });
}

async function loadLeaderboard() {
  const endpoint = leaderboardMode === "individual" ? "/api/leaderboard" : "/api/leaderboard/teams";
  const leaderboard = await apiRequest(endpoint);
  statModeEl.textContent = modeLabel();
  renderLeaderboard(leaderboard);
}

function renderAuthState() {
  if (!currentUser) {
    authStateEl.textContent = "Not logged in";
    healthDotEl.classList.remove("ok");
    return;
  }
  authStateEl.textContent = `${currentUser.username} · ${currentUser.role}`;
  healthDotEl.classList.add("ok");
}

function renderTeams(teams) {
  statTeamsEl.textContent = String(teams.length);
  teamSelectEl.innerHTML = `<option value="">No team (individual)</option>`;
  if (!teams.length) {
    teamsListEl.innerHTML = `<div class="scenario-item"><span class="muted">No teams joined yet.</span></div>`;
    return;
  }

  teamsListEl.innerHTML = teams
    .map(
      (team) => `
      <div class="scenario-item">
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
    teamSelectEl.appendChild(option);
  });
}

async function loadTeams() {
  if (!currentUser) {
    renderTeams([]);
    return;
  }
  const teams = await apiRequest("/api/teams/mine");
  renderTeams(teams);
}

function renderProgress(progress) {
  if (!progress || !progress.attempts) {
    progressBoxEl.className = "result";
    progressBoxEl.textContent = "No attempts yet. Start with one mission to generate progress data.";
    return;
  }
  const rows = progress.per_scenario
    .map(
      (item) =>
        `<li>${escapeHtml(item.scenario_id)} · best ${item.best_score}/100 · attempts ${item.attempts}</li>`
    )
    .join("");
  progressBoxEl.className = "result";
  progressBoxEl.innerHTML = `
    <strong>Total Attempts:</strong> ${progress.attempts}<br />
    <strong>Successful Attempts:</strong> ${progress.successful_attempts}<br />
    <strong>Total Score:</strong> ${progress.total_score}<br />
    <strong>Average Score:</strong> ${progress.average_score}<br />
    <strong>Last Attempt:</strong> ${
      progress.last_attempt_at ? new Date(progress.last_attempt_at).toLocaleString() : "N/A"
    }<br />
    <ul>${rows}</ul>
  `;
}

async function loadProgress() {
  if (!currentUser) {
    progressBoxEl.textContent = "Login to view your progress.";
    return;
  }
  const progress = await apiRequest("/api/progress/me");
  renderProgress(progress);
}

async function hydrateAuthState() {
  if (!accessToken) {
    currentUser = null;
    renderAuthState();
    return;
  }
  try {
    currentUser = await apiRequest("/api/auth/me");
  } catch {
    accessToken = null;
    localStorage.removeItem("cyberrange_token");
    currentUser = null;
  }
  renderAuthState();
}

registerFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const result = await apiRequest("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: dom.registerUsername.value.trim(),
        password: dom.registerPassword.value,
        role: dom.registerRole.value,
      }),
    });
    accessToken = result.access_token;
    localStorage.setItem("cyberrange_token", accessToken);
    currentUser = result.user;
    renderAuthState();
    await loadTeams();
    await loadProgress();
    showToast(`Welcome, ${result.user.username}`);
    registerFormEl.reset();
  } catch (error) {
    showToast(error.message, true);
  }
});

loginFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const result = await apiRequest("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: dom.loginUsername.value.trim(),
        password: dom.loginPassword.value,
      }),
    });
    accessToken = result.access_token;
    localStorage.setItem("cyberrange_token", accessToken);
    currentUser = result.user;
    renderAuthState();
    await loadTeams();
    await loadProgress();
    showToast("Signed in successfully");
  } catch (error) {
    showToast(error.message, true);
  }
});

logoutBtnEl.addEventListener("click", async () => {
  if (!accessToken) {
    return;
  }
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch {
    // Best effort logout.
  }
  accessToken = null;
  currentUser = null;
  localStorage.removeItem("cyberrange_token");
  renderAuthState();
  renderTeams([]);
  progressBoxEl.textContent = "Login to view your progress.";
  showToast("Signed out");
});

createTeamFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) {
    showToast("Please sign in first", true);
    return;
  }
  try {
    await apiRequest("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: dom.teamName.value.trim() }),
    });
    await loadTeams();
    showToast("Team created");
    createTeamFormEl.reset();
  } catch (error) {
    showToast(error.message, true);
  }
});

joinTeamFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) {
    showToast("Please sign in first", true);
    return;
  }
  try {
    await apiRequest("/api/teams/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: dom.teamInvite.value.trim() }),
    });
    await loadTeams();
    showToast("Joined team");
    joinTeamFormEl.reset();
  } catch (error) {
    showToast(error.message, true);
  }
});

individualTabEl.addEventListener("click", async () => {
  leaderboardMode = "individual";
  individualTabEl.classList.add("active");
  teamTabEl.classList.remove("active");
  await loadLeaderboard();
});

teamTabEl.addEventListener("click", async () => {
  leaderboardMode = "team";
  teamTabEl.classList.add("active");
  individualTabEl.classList.remove("active");
  await loadLeaderboard();
});

attemptFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) {
    showToast("Please sign in before submitting an attempt", true);
    return;
  }
  if (!selectedScenarioId) {
    showToast("Load a mission first", true);
    return;
  }

  try {
    const result = await apiRequest("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario_id: selectedScenarioId,
        payload: dom.payload.value,
        evidence: dom.evidence.value,
        team_id: teamSelectEl.value ? Number(teamSelectEl.value) : null,
      }),
    });
    renderResult(result);
    await loadLeaderboard();
    await loadProgress();
    showToast(`Attempt scored: ${result.score}/100`);
  } catch (error) {
    resultEl.className = "result fail";
    resultEl.textContent = error.message;
  }
});

async function init() {
  await hydrateAuthState();
  await loadScenarios();
  await loadTeams();
  await loadLeaderboard();
  await loadProgress();
}

init().catch((error) => {
  resultEl.className = "result fail";
  resultEl.textContent = `Failed to initialize app: ${error.message}`;
});
