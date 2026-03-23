const scenarioListEl = document.getElementById("scenario-list");
const scenarioDetailEl = document.getElementById("scenario-detail");
const leaderboardBodyEl = document.getElementById("leaderboard-body");
const attemptForm = document.getElementById("attempt-form");
const resultEl = document.getElementById("result");

let selectedScenarioId = null;

async function getJson(url, options = {}) {
  const response = await fetch(url, options);
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
  return response.json();
}

function scenarioCard(item) {
  const tags = item.tags.map((tag) => `<span>${tag}</span>`).join(" ");
  return `
    <div class="scenario-item">
      <strong>${item.title}</strong>
      <div class="muted">Difficulty: ${item.difficulty}</div>
      <div class="muted">${tags}</div>
      <button data-scenario-id="${item.id}">Select</button>
    </div>
  `;
}

function renderScenarioDetail(detail) {
  const hints = detail.hints.map((hint) => `<li>${hint}</li>`).join("");
  const examples = detail.safe_payload_examples
    .map((sample) => `<li><code>${sample}</code></li>`)
    .join("");

  scenarioDetailEl.innerHTML = `
    <h3>${detail.title}</h3>
    <p>${detail.description}</p>
    <p><strong>Objective:</strong> ${detail.objective}</p>
    <strong>Hints</strong>
    <ul>${hints}</ul>
    <strong>Safe payload examples</strong>
    <ul>${examples}</ul>
  `;
}

function renderResult(result) {
  const feedbackItems = result.feedback.map((item) => `<li>${item}</li>`).join("");
  resultEl.className = `result ${result.passed ? "pass" : "fail"}`;
  resultEl.innerHTML = `
    <strong>${result.passed ? "PASS" : "NOT PASSED"} - Score ${result.score}/100</strong>
    <ul>${feedbackItems}</ul>
  `;
}

function renderLeaderboard(entries) {
  leaderboardBodyEl.innerHTML = entries
    .map(
      (entry) => `
      <tr>
        <td>${entry.user_id}</td>
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
  const leaderboard = await getJson("/api/leaderboard");
  renderLeaderboard(leaderboard);
}

attemptForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!selectedScenarioId) {
    resultEl.className = "result fail";
    resultEl.textContent = "Please select a scenario first.";
    return;
  }

  const userId = document.getElementById("user-id").value.trim();
  const payload = document.getElementById("payload").value;
  const evidence = document.getElementById("evidence").value;

  try {
    const result = await getJson("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        user_id: userId || "guest",
        scenario_id: selectedScenarioId,
        payload,
        evidence,
      }),
    });
    renderResult(result);
    await loadLeaderboard();
  } catch (error) {
    resultEl.className = "result fail";
    resultEl.textContent = error.message;
  }
});

async function init() {
  await loadScenarios();
  await loadLeaderboard();
}

init().catch((error) => {
  resultEl.className = "result fail";
  resultEl.textContent = `Failed to initialize app: ${error.message}`;
});
