import { state, escapeHtml, initializeLayout, notify, setAuthState, fetchJson } from "./core.js";

const scenarioListEl = document.getElementById("scenario-list");
const scenarioDetailEl = document.getElementById("scenario-detail");
const attemptFormEl = document.getElementById("attempt-form");
const resultEl = document.getElementById("result");
const teamSelectEl = document.getElementById("team-select");
const payloadEl = document.getElementById("payload");
const evidenceEl = document.getElementById("evidence");

let selectedScenarioId = null;

function renderScenarios(items) {
  if (!items.length) {
    scenarioListEl.innerHTML = `<div class="item"><span class="muted">No scenarios available.</span></div>`;
    return;
  }
  scenarioListEl.innerHTML = items
    .map(
      (item) => `
      <article class="item">
        <strong>${escapeHtml(item.title)}</strong>
        <div class="meta">
          <span class="pill">${escapeHtml(item.difficulty)}</span>
          ${item.tags.map((tag) => `<span class="pill">${escapeHtml(tag)}</span>`).join("")}
        </div>
        <button type="button" data-scenario-id="${escapeHtml(item.id)}">Load Mission</button>
      </article>
    `
    )
    .join("");

  scenarioListEl.querySelectorAll("button[data-scenario-id]").forEach((button) => {
    button.addEventListener("click", async () => {
      const scenarioId = button.getAttribute("data-scenario-id");
      selectedScenarioId = scenarioId;
      try {
        const detail = await fetchJson(`/api/scenarios/${scenarioId}`);
        scenarioDetailEl.innerHTML = `
          <h3>${escapeHtml(detail.title)}</h3>
          <p>${escapeHtml(detail.description)}</p>
          <p><strong>Objective:</strong> ${escapeHtml(detail.objective)}</p>
          <strong>Hints</strong>
          <ul>${detail.hints.map((hint) => `<li>${escapeHtml(hint)}</li>`).join("")}</ul>
          <strong>Safe payload examples</strong>
          <ul>${detail.safe_payload_examples
            .map((sample) => `<li><code>${escapeHtml(sample)}</code></li>`)
            .join("")}</ul>
        `;
        notify(`Mission loaded: ${detail.title}`);
      } catch (error) {
        notify(error.message, true);
      }
    });
  });
}

async function loadTeams() {
  teamSelectEl.innerHTML = `<option value="">No team (individual)</option>`;
  if (!state.user) {
    return;
  }
  const teams = await fetchJson("/api/teams/mine");
  teams.forEach((team) => {
    const option = document.createElement("option");
    option.value = String(team.id);
    option.textContent = `${team.name} (#${team.id})`;
    teamSelectEl.appendChild(option);
  });
}

function renderResult(result) {
  resultEl.className = `result ${result.passed ? "pass" : "fail"}`;
  resultEl.innerHTML = `
    <strong>${result.passed ? "PASS" : "NOT PASSED"} · Score ${result.score}/100</strong>
    <ul>${result.feedback.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  `;
}

attemptFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!state.user) {
    notify("Please login before submitting attempts.", true);
    return;
  }
  if (!selectedScenarioId) {
    notify("Load a mission first.", true);
    return;
  }
  try {
    const result = await fetchJson("/api/attempts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scenario_id: selectedScenarioId,
        payload: payloadEl.value,
        evidence: evidenceEl.value,
        team_id: teamSelectEl.value ? Number(teamSelectEl.value) : null,
      }),
    });
    renderResult(result);
    notify(`Attempt scored: ${result.score}/100`);
  } catch (error) {
    resultEl.className = "result fail";
    resultEl.textContent = error.message;
    notify(error.message, true);
  }
});

async function init() {
  await initializeLayout("missions");
  await setAuthState();
  const scenarios = await fetchJson("/api/scenarios");
  renderScenarios(scenarios);
  await loadTeams();
}

init().catch((error) => notify(error.message, true));
