import { apiRequest, initShell, showToast } from "./core.js";

let mode = "individual";

const individualTab = document.getElementById("individual-tab");
const teamTab = document.getElementById("team-tab");
const header = document.getElementById("leaderboard-header");
const body = document.getElementById("leaderboard-body");

function renderHeader() {
  const nameHeader = mode === "individual" ? "User" : "Team";
  header.innerHTML = `
    <th>#</th>
    <th>${nameHeader}</th>
    <th>Total Score</th>
    <th>Successes</th>
    <th>Attempts</th>
    <th>Last Attempt</th>
  `;
}

function renderRows(entries) {
  if (!entries.length) {
    body.innerHTML = `
      <tr>
        <td colspan="6" class="muted">No attempts recorded yet.</td>
      </tr>
    `;
    return;
  }
  body.innerHTML = entries
    .map(
      (entry, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${entry.user_id || entry.team_name}</td>
        <td>${entry.total_score}</td>
        <td>${entry.successful_attempts}</td>
        <td>${entry.total_attempts}</td>
        <td>${new Date(entry.last_attempt_at).toLocaleString()}</td>
      </tr>
    `,
    )
    .join("");
}

async function loadLeaderboard() {
  const endpoint = mode === "individual" ? "/api/leaderboard" : "/api/leaderboard/teams";
  try {
    const entries = await apiRequest(endpoint);
    renderHeader();
    renderRows(entries);
  } catch (error) {
    showToast(error.message, true);
  }
}

function bindTabs() {
  individualTab.addEventListener("click", async () => {
    mode = "individual";
    individualTab.classList.add("active");
    teamTab.classList.remove("active");
    await loadLeaderboard();
  });
  teamTab.addEventListener("click", async () => {
    mode = "team";
    teamTab.classList.add("active");
    individualTab.classList.remove("active");
    await loadLeaderboard();
  });
}

async function init() {
  await initShell("leaderboard");
  bindTabs();
  await loadLeaderboard();
}

init().catch((error) => showToast(error.message, true));
