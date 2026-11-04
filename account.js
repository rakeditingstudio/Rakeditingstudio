import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const byId = (id) => document.getElementById(id);
const menu = byId("profileMenu");
const menuToggle = byId("profileMenuToggle");
const popover = byId("rakProfilePopover");
const googleButton = byId("googleSignInBtn");
const createButton = byId("rakCreateAccountBtn");
const status = byId("googleAuthStatus");
const signedInInfo = byId("rakSignedInInfo");
const signOutButton = byId("googleSignOutBtn");

function setStatus(message, isError = false) {
  if (!status) return;
  status.textContent = message;
  status.dataset.error = isError ? "true" : "false";
}

function closeMenu() {
  if (popover) popover.classList.add("hidden");
  if (menuToggle) menuToggle.setAttribute("aria-expanded", "false");
}

function installAccountUI() {
  if (!menu || byId("rakAccountPanel")) return;
  const style = document.createElement("style");
  style.textContent = `
    #rakAccountPanel{position:absolute;right:0;top:60px;z-index:45;width:min(340px,92vw);padding:17px;border:1px solid #b88936;border-radius:15px;background:#14110c;box-shadow:0 14px 40px #000c}
    #rakAccountPanel h3{margin:0 0 5px;color:#f3bd54}
    #rakAccountPanel p{font-size:12px;color:#bbb;margin:4px 0 12px}
    #rakAccountPanel label{display:block;font-size:12px;color:#ddd;margin-top:9px}
    #rakAccountPanel input{width:100%;padding:11px;background:#090909;border:1px solid #383838;border-radius:9px;color:#fff;margin-top:5px}
    #rakAccountPanel .rak-account-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}
    #rakAccountPanel button{padding:9px 12px;font-size:13px}
    #rakAccountPanel .rak-account-switch{background:transparent;color:#f3bd54;border:0;padding-left:0}
    #rakAccountPanel .rak-account-close{float:right;background:#222;color:#eee;border-color:#444}
    #rakAccountMessage{min-height:18px;color:#f3d08a!important;overflow-wrap:anywhere}
  `;
  document.head.appendChild(style);

  const panel = document.createElement("section");
  panel.id = "rakAccountPanel";
  panel.className = "hidden";
  panel.setAttribute("aria-label", "RAK account");
  panel.innerHTML = `
    <button type="button" id="rakAccountClose" class="rak-account-close" aria-label="Close">✕</button>
    <h3 id="rakAccountTitle">Create your RAK account</h3>
    <p>Use your email and create a separate RAK password. This is not your Google/Gmail password.</p>
    <form id="rakAccountForm">
      <label for="rakAccountEmail">Email address</label>
      <input id="rakAccountEmail" type="email" autocomplete="email" required maxlength="254" placeholder="you@example.com">
      <label for="rakAccountPassword">Create password</label>
      <input id="rakAccountPassword" type="password" autocomplete="new-password" required minlength="8" maxlength="72" placeholder="At least 8 characters">
      <div class="rak-account-actions">
        <button id="rakAccountSubmit" type="submit">Create account</button>
        <button id="rakAccountSwitch" type="button" class="rak-account-switch">Already have an account? Login</button>
      </div>
    </form>
    <p id="rakAccountMessage" role="status" aria-live="polite"></p>
  `;
  menu.appendChild(panel);

  let mode = "signup";
  const form = byId("rakAccountForm");
  const password = byId("rakAccountPassword");
  const submit = byId("rakAccountSubmit");
  const switcher = byId("rakAccountSwitch");
  const message = byId("rakAccountMessage");
  const setMode = (next) => {
    mode = next;
    byId("rakAccountTitle").textContent = mode === "signup" ? "Create your RAK account" : "Login to RAK Editing Studio";
    submit.textContent = mode === "signup" ? "Create account" : "Login";
    password.autocomplete = mode === "signup" ? "new-password" : "current-password";
    password.placeholder = mode === "signup" ? "At least 8 characters" : "Your RAK account password";
    password.minLength = mode === "signup" ? 8 : 1;
    switcher.textContent = mode === "signup" ? "Already have an account? Login" : "New here? Create account";
    message.textContent = "";
  };

  createButton?.addEventListener("click", () => {
    closeMenu();
    panel.classList.remove("hidden");
    setMode("signup");
  });
  byId("rakAccountClose").addEventListener("click", () => panel.classList.add("hidden"));
  switcher.addEventListener("click", () => setMode(mode === "signup" ? "login" : "signup"));
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!window.rakSupabase) {
      message.textContent = "Account service is not ready. Please reload and try again.";
      return;
    }
    const email = byId("rakAccountEmail").value.trim();
    const pass = password.value;
    submit.disabled = true;
    message.textContent = mode === "signup" ? "Creating your account…" : "Signing in…";
    try {
      if (mode === "signup") {
        const { data, error } = await window.rakSupabase.auth.signUp({
          email, password: pass,
          options: { emailRedirectTo: window.location.origin + window.location.pathname }
        });
        if (error) throw error;
        message.textContent = data.session
          ? "Account created and signed in successfully."
          : "Account created. Check your email for the confirmation link, then return here to login.";
      } else {
        const { error } = await window.rakSupabase.auth.signInWithPassword({ email, password: pass });
        if (error) throw error;
        message.textContent = "Login successful.";
        panel.classList.add("hidden");
      }
    } catch (error) {
      message.textContent = error?.message || "Could not complete this request. Please try again.";
    } finally {
      submit.disabled = false;
    }
  });
}

function showUser(user) {
  const signedIn = Boolean(user);
  if (googleButton) googleButton.classList.toggle("hidden", signedIn);
  if (createButton) createButton.classList.toggle("hidden", signedIn);
  if (signedInInfo) signedInInfo.classList.toggle("hidden", !signedIn);
  if (!signedIn) {
    if (byId("googleUserName")) byId("googleUserName").textContent = "";
    if (byId("googleUserEmail")) byId("googleUserEmail").textContent = "";
    return;
  }
  const meta = user.user_metadata || {};
  if (byId("googleUserName")) byId("googleUserName").textContent = meta.full_name || meta.name || "RAK account";
  if (byId("googleUserEmail")) byId("googleUserEmail").textContent = user.email || "";
  byId("rakAccountPanel")?.classList.add("hidden");
}

installAccountUI();

menuToggle?.addEventListener("click", () => {
  const opening = popover?.classList.contains("hidden");
  popover?.classList.toggle("hidden", !opening);
  menuToggle.setAttribute("aria-expanded", String(Boolean(opening)));
});
document.addEventListener("click", (event) => {
  if (menu && !menu.contains(event.target)) closeMenu();
});

if (!googleButton || !menuToggle || !signOutButton) {
  console.error("RAK account UI elements are missing.");
} else {
  const configured =
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL) &&
    typeof SUPABASE_PUBLISHABLE_KEY === "string" &&
    SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_");

  if (!configured) {
    googleButton.disabled = true;
    setStatus("Account setup is incomplete. Please contact the site owner.", true);
  } else {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      window.rakSupabase = supabase;
      window.rakGoogleAuthReady = true;
      googleButton.addEventListener("click", async () => {
        googleButton.disabled = true;
        setStatus("Opening Google sign-in…");
        try {
          const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: window.location.origin + window.location.pathname,
              queryParams: { prompt: "select_account" },
              scopes: "openid email profile"
            }
          });
          if (error) throw error;
        } catch (error) {
          setStatus("Google sign-in could not start: " + (error?.message || "Unknown error"), true);
          googleButton.disabled = false;
        }
      });
      signOutButton.addEventListener("click", async () => {
        signOutButton.disabled = true;
        try {
          const { error } = await supabase.auth.signOut();
          if (error) throw error;
          closeMenu();
        } catch (error) {
          setStatus("Sign-out failed: " + (error?.message || "Unknown error"), true);
        } finally {
          signOutButton.disabled = false;
        }
      });
      supabase.auth.onAuthStateChange((event, session) => {
        showUser(session?.user || null);
        if (event === "SIGNED_IN") setStatus("Account connected successfully.");
        if (event === "SIGNED_OUT") setStatus("You have been signed out.");
      });
      const { data, error } = await supabase.auth.getSession();
      if (error) setStatus("Could not restore login: " + error.message, true);
      showUser(data?.session?.user || null);
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error_description") || params.get("error");
      if (oauthError) setStatus("Google sign-in error: " + oauthError, true);
    } catch (error) {
      googleButton.disabled = true;
      setStatus("Account system could not load: " + (error?.message || "Please reload the page."), true);
      console.error("RAK account initialization failed:", error);
    }
  }
}
