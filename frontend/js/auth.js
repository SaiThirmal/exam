import { apiRequest, bindSharedUi, saveToken, showToast } from "./core.js";

const registerFormEl = document.getElementById("register-form");
const loginFormEl = document.getElementById("login-form");
const logoutBtnEl = document.getElementById("logout-btn");
const registerUsernameEl = document.getElementById("register-username");
const registerPasswordEl = document.getElementById("register-password");
const registerRoleEl = document.getElementById("register-role");
const loginUsernameEl = document.getElementById("login-username");
const loginPasswordEl = document.getElementById("login-password");
const authResultEl = document.getElementById("auth-result");

async function refreshMe() {
  try {
    const me = await apiRequest("/api/auth/me");
    authResultEl.className = "result";
    authResultEl.innerHTML = `
      <strong>Current session</strong><br />
      User: ${me.username}<br />
      Role: ${me.role}<br />
      Joined: ${new Date(me.created_at).toLocaleString()}
    `;
  } catch {
    authResultEl.className = "result";
    authResultEl.textContent = "Not currently logged in.";
  }
}

registerFormEl.addEventListener("submit", async (event) => {
  event.preventDefault();
  try {
    const result = await apiRequest("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: registerUsernameEl.value.trim(),
        password: registerPasswordEl.value,
        role: registerRoleEl.value,
      }),
    });
    saveToken(result.access_token);
    registerFormEl.reset();
    showToast(`Welcome, ${result.user.username}`);
    await bindSharedUi();
    await refreshMe();
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
        username: loginUsernameEl.value.trim(),
        password: loginPasswordEl.value,
      }),
    });
    saveToken(result.access_token);
    showToast("Signed in successfully");
    await bindSharedUi();
    await refreshMe();
  } catch (error) {
    showToast(error.message, true);
  }
});

logoutBtnEl.addEventListener("click", async () => {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } catch {
    // Best effort logout.
  }
  saveToken(null);
  showToast("Signed out");
  await bindSharedUi();
  await refreshMe();
});

await bindSharedUi();
await refreshMe();
