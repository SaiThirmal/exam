const scenarioListEl = document.getElementById("scenario-list");
const scenarioDetailEl = document.getElementById("scenario-detail");
const leaderboardBodyEl = document.getElementById("leaderboard-body");
const leaderboardHeaderEl = document.getElementById("leaderboard-header");
const attemptForm = document.getElementById("attempt-form");
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

let selectedScenarioId = null;
let accessToken = localStorage.getItem("cyberrange_token");
let currentUser = null;
let leaderboardMode = "individual";

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

async function getJson(url, options = {}) {
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

function scenarioCard(item) {
  const tags = item.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join(" ");
  return `
    <div class="scenario-item">
      <strong>${escapeHtml(item.title)}</strong>
      <div class="muted">Difficulty: ${escapeHtml(item.difficulty)}</div>
      <div class="muted">${tags}</div>
      <button data-scenario-id="${escapeHtml(item.id)}">Select</button>
    </div>
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
    <strong>${result.passed ? "PASS" : "NOT PASSED"} - Score ${result.score}/100</strong>
    <ul>${feedbackItems}</ul>
  `;
}

function renderLeaderboard(entries) {
  if (leaderboardMode === "individual") {
    leaderboardHeaderEl.innerHTML = `
      <th>User</th>
      <th>Total Score</th>
      <th>Successes</th>
      <th>Attempts</th>
      <th>Last Attempt</th>
    `;
  } else {
    leaderboardHeaderEl.innerHTML = `
      <th>Team</th>
      <th>Total Score</th>
      <th>Successes</th>
      <th>Attempts</th>
      <th>Last Attempt</th>
    `;
  }

  leaderboardBodyEl.innerHTML = entries
    .map(
      (entry) => `
      <tr>
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
  const scenarios = await getJson("/api/scenarios");
  scenarioListEl.innerHTML = scenarios.map(scenarioCard).join("");
  scenarioListEl.querySelectorAll("button[data-scenario-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const scenarioId = button.getAttribute("data-scenario-id");
      selectedScenarioId = scenarioId;
      const detail = await getJson(`/api/scenarios/${scenarioId}`);
      renderScenarioDetail(detail);
    });
  });
}

async function loadLeaderboard() {
  const endpoint = leaderboardMode === "individual" ? "/api/leaderboard" : "/api/leaderboard/teams";
  const leaderboard = await getJson(endpoint);
  renderLeaderboard(leaderboard);
}

function renderAuthState() {
  if (!currentUser) {
    authStateEl.textContent = "Not logged in";
    return;
  }
  authStateEl.textContent = `Logged in as ${currentUser.username} (${currentUser.role})`;
}

function renderTeams(teams) {
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
        <div class="muted">Owner: ${escapeHtml(team.owner_username)}</div>
        <div class="muted">Members: ${team.member_count}</div>
        <div class="muted">Invite code: ${escapeHtml(team.invite_code)}</div>
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
  const teams = await getJson("/api/teams/mine");
  renderTeams(teams);
}

function renderProgress(progress) {
  if (!progress || !progress.attempts) {
    progressBoxEl.innerHTML = "No attempts yet. Submit your first scenario attempt.";
    return;
  }
  const rows = progress.per_scenario
    .map(
      (item) =>
        `<li>${escapeHtml(item.scenario_id)}: best score ${item.best_score}, attempts ${item.attempts}</li>`
    )
    .join("");
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
  const progress = await getJson("/api/progress/me");
  renderProgress(progress);
}

async function hydrateAuthState() {
  if (!accessToken) {
    currentUser = null;
    renderAuthState();
    return;
  }
  try {
    currentUser = await getJson("/api/auth/me");
  } catch {
    accessToken = null;
    localStorage.removeItem("cyberrange_token");
    currentUser = null;
  }
  renderAuthState();
}

registerFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = document.getElementById("register-username").value.trim();
  const password = document.getElementById("register-password").value;
  const role = document.getElementById("register-role").value;
  try {
    const result = await getJson("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, role }),
    });
    accessToken = result.access_token;
    localStorage.setItem("cyberrange_token", accessToken);
    currentUser = result.user;
    renderAuthState();
    await loadTeams();
    await loadProgress();
  } catch (error) {
    resultEl.className = "result fail";
    resultEl.textContent = error.message;
  }
});

loginFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  try {
    const result = await getJson("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    accessToken = result.access_token;
    localStorage.setItem("cyberrange_token", accessToken);
    currentUser = result.user;
    renderAuthState();
    await loadTeams();
    await loadProgress();
  } catch (error) {
    resultEl.className = "result fail";
    resultEl.textContent = error.message;
  }
});

logoutBtnEl.addEventListener("click", async () => {
  if (!accessToken) {
    return;
  }
  try {
    await getJson("/api/auth/logout", { method: "POST" });
  } catch {
    // Best effort logout; always clear local state.
  }
  accessToken = null;
  currentUser = null;
  localStorage.removeItem("cyberrange_token");
  renderAuthState();
  renderTeams([]);
  progressBoxEl.textContent = "Login to view your progress.";
});

createTeamFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) {
    resultEl.className = "result fail";
    resultEl.textContent = "Please login before creating a team.";
    return;
  }
  const name = document.getElementById("team-name").value.trim();
  try {
    await getJson("/api/teams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    await loadTeams();
  } catch (error) {
    resultEl.className = "result fail";
    resultEl.textContent = error.message;
  }
});

joinTeamFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) {
    resultEl.className = "result fail";
    resultEl.textContent = "Please login before joining a team.";
    return;
  }
  const inviteCode = document.getElementById("team-invite").value.trim();
  try {
    await getJson("/api/teams/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invite_code: inviteCode }),
    });
    await loadTeams();
  } catch (error) {
    resultEl.className = "result fail";
    resultEl.textContent = error.message;
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

attemptForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!currentUser) {
    resultEl.className = "result fail";
    resultEl.textContent = "Please login before submitting an attempt.";
    return;
  }
  if (!selectedScenarioId) {
    resultEl.className = "result fail";
    resultEl.textContent = "Please select a scenario first.";
    return;
  }

  const payload = document.getElementById("payload").value;
  const evidence = document.getElementById("evidence").value;
  const teamId = teamSelectEl.value ? Number(teamSelectEl.value) : null;

  try {
    const result = await getJson("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario_id: selectedScenarioId,
        payload,
        evidence,
        team_id: teamId,
      }),
    });
    renderResult(result);
    await loadLeaderboard();
    await loadProgress();
  } catch (error) {
    resultEl.className = "result fail";
    resultEl.textContent = error.message;
  }
});

async function init() {
  await hydrateAuthState();
  await loadTeams();
  await loadScenarios();
  await loadLeaderboard();
  await loadProgress();
}

init().catch((error) => {
  resultEl.className = "result fail";
  resultEl.textContent = `Failed to initialize app: ${error.message}`;
});
