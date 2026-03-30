import { apiRequest, initPage, showToast } from "./core.js";

const scenariosEl = document.getElementById("stat-scenarios");
const topUserEl = document.getElementById("stat-top-user");
const topTeamEl = document.getElementById("stat-top-team");

async function init() {
  await initPage("index");
  try {
    const [scenarios, individual, teams] = await Promise.all([
      apiRequest("/api/scenarios"),
      apiRequest("/api/leaderboard"),
      apiRequest("/api/leaderboard/teams"),
    ]);
    scenariosEl.textContent = String(scenarios.length);
    topUserEl.textContent = individual.length ? individual[0].user_id : "-";
    topTeamEl.textContent = teams.length ? teams[0].team_name : "-";
  } catch (error) {
    showToast(error.message, true);
  }
}

init().catch((error) => showToast(error.message, true));
