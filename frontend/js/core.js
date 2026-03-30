const state = {
  accessToken: localStorage.getItem("cyberrange_token"),
  currentUser: null,
  selectedScenarioId: localStorage.getItem("selected_scenario_id"),
  selectedScenarioTitle: localStorage.getItem("selected_scenario_title"),
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
  showToast._timer = window.setTimeout(() => toast.classList.remove("show"), 2400);
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

function setActiveNav() {
  const page = document.body.dataset.page;
  document.querySelectorAll("[data-nav]").forEach((link) => {
    if (link.dataset.nav === page) {
      link.classList.add("active");
    } else {
      link.classList.remove("active");
    }
  });
}

function renderAuthBadge() {
  const authBadge = document.getElementById("auth-badge");
  const authDot = document.getElementById("auth-dot");
  if (!authBadge || !authDot) return;
  if (!state.currentUser) {
    authBadge.textContent = "Guest";
    authDot.classList.remove("ok");
    return;
  }
  authBadge.textContent = `${state.currentUser.username} · ${state.currentUser.role}`;
  authDot.classList.add("ok");
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
    state.accessToken = null;
    localStorage.removeItem("cyberrange_token");
    state.currentUser = null;
  }
  renderAuthBadge();
  return state.currentUser;
}

function setToken(token) {
  state.accessToken = token;
  if (!token) {
    localStorage.removeItem("cyberrange_token");
    return;
  }
  localStorage.setItem("cyberrange_token", token);
}

function setSelectedScenario(id, title) {
  state.selectedScenarioId = id;
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

function requireAuthOrNotice() {
  if (state.currentUser) return true;
  showToast("Please sign in first", true);
  return false;
}

function formatDateTime(iso) {
  if (!iso) return "N/A";
  return new Date(iso).toLocaleString();
}

export {
  state,
  apiRequest,
  escapeHtml,
  formatDateTime,
  hydrateAuth,
  renderAuthBadge,
  requireAuthOrNotice,
  setActiveNav,
  setSelectedScenario,
  setToken,
  showToast,
};
