import { apiRequest, bindGlobalUI, requireAuth, showToast, hydrateUser } from "./core.js";

const progressBoxEl = document.getElementById("progress-box");

function renderProgress(progress) {
  if (!progress || !progress.attempts) {
    progressBoxEl.className = "result";
    progressBoxEl.textContent = "No attempts yet. Solve a mission to populate your profile analytics.";
    return;
  }

  const rows = progress.per_scenario
    .map(
      (item) =>
        `<li>${item.scenario_id} · best ${item.best_score}/100 · attempts ${item.attempts}</li>`
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

async function init() {
  bindGlobalUI("progress");
  await hydrateUser();
  if (!requireAuth()) {
    progressBoxEl.className = "result fail";
    progressBoxEl.textContent = "Please sign in from the Auth page to view your progress.";
    return;
  }
  try {
    const progress = await apiRequest("/api/progress/me");
    renderProgress(progress);
  } catch (error) {
    progressBoxEl.className = "result fail";
    progressBoxEl.textContent = error.message;
    showToast(error.message, true);
  }
}

init();
