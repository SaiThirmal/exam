const state = {
  accessToken: localStorage.getItem("cyberrange_token"),
  currentUser: null,
  selectedScenarioId: localStorage.getItem("selected_scenario_id") || "",
  selectedScenarioTitle: localStorage.getItem("selected_scenario_title") || "",
  selectedTeamId: localStorage.getItem("selected_team_id") || "",
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
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.style.borderColor = isError ? "rgba(255, 95, 114, 0.72)" : "rgba(255, 107, 46, 0.75)";
  toast.classList.add("show");
  window.clearTimeout(showToast._timer);
  showToast._timer = window.setTimeout(() => toast.classList.remove("show"), 2500);
}

async function apiRequest(url, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (state.accessToken) {
    headers.Authorization = `Bearer ${state.accessToken}`;
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

function setToken(token) {
  state.accessToken = token || null;
  if (!token) {
    localStorage.removeItem("cyberrange_token");
    state.currentUser = null;
    return;
  }
  localStorage.setItem("cyberrange_token", token);
}

function setSelectedScenario(id, title) {
  state.selectedScenarioId = id || "";
  state.selectedScenarioTitle = title || "";
  if (id) {
    localStorage.setItem("selected_scenario_id", id);
  } else {
    localStorage.removeItem("selected_scenario_id");
  }
  if (title) {
    localStorage.setItem("selected_scenario_title", title);
  } else {
    localStorage.removeItem("selected_scenario_title");
  }
}

function setSelectedTeamId(teamId) {
  state.selectedTeamId = teamId || "";
  if (teamId) {
    localStorage.setItem("selected_team_id", String(teamId));
  } else {
    localStorage.removeItem("selected_team_id");
  }
}

function formatDateTime(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleString();
}

function setActiveNav(pageKey) {
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === pageKey) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

function renderAuthBadge() {
  const badge = document.getElementById("auth-badge");
  const dot = document.getElementById("auth-dot");
  if (!badge || !dot) return;
  if (!state.currentUser) {
    badge.textContent = "Guest";
    dot.classList.remove("ok");
    return;
  }
  badge.textContent = `${state.currentUser.username} · ${state.currentUser.role}`;
  dot.classList.add("ok");
}

async function hydrateAuth() {
  if (!state.accessToken) {
    state.currentUser = null;
    renderAuthBadge();
    return null;
  }
  try {
    state.currentUser = await apiRequest("/api/auth/me");
  } catch {
    setToken(null);
  }
  renderAuthBadge();
  return state.currentUser;
}

function requireAuth() {
  if (state.currentUser) return true;
  showToast("Please sign in first.", true);
  return false;
}

async function initPage(pageKey) {
  setActiveNav(pageKey);
  await hydrateAuth();
}

export {
  apiRequest,
  escapeHtml,
  formatDateTime,
  initPage,
  requireAuth,
  setSelectedScenario,
  setSelectedTeamId,
  setToken,
  showToast,
  state,
};
