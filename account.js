import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const byId = (id) => document.getElementById(id);
const menu = byId("profileMenu");
const menuToggle = byId("profileMenuToggle");
const popover = byId("rakProfilePopover");
const googleButton = byId("googleSignInBtn");
const createButton = byId("rakCreateAccountBtn");
const loginButton = byId("rakLoginBtn");
const moreOptionsButton = byId("rakMoreOptionsBtn");
const moreOptionsPanel = byId("rakMoreOptionsPanel");
const status = byId("googleAuthStatus");
const signedInInfo = byId("rakSignedInInfo");
const signOutButton = byId("googleSignOutBtn");
let rakAccountLoginMode = false;

function setStatus(message, isError = false) {
  if (!status) return;
  status.textContent = message;
  status.dataset.error = isError ? "true" : "false";
}
function closeMenu() {
  popover?.classList.add("hidden");
  menuToggle?.setAttribute("aria-expanded", "false");
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
    <h3 id="rakAccountTitle">Create your RAK password</h3>
    <p id="rakAccountHelp">Google has verified your account. Now choose a separate password for RAK Editing Studio.</p>
    <form id="rakAccountForm">
      <label for="rakAccountEmail">Verified Google email</label>
      <input id="rakAccountEmail" type="email" autocomplete="email" readonly required>
      <div id="rakPasswordField">
        <label for="rakAccountPassword">Create RAK password</label>
        <input id="rakAccountPassword" type="password" autocomplete="new-password" minlength="8" maxlength="72" placeholder="At least 8 characters" required>
      </div>
      <div class="rak-account-actions">
        <button id="rakAccountSubmit" type="submit">Save RAK password</button>
      </div>
    </form>
    <p id="rakAccountMessage" role="status" aria-live="polite"></p>
  `;
  menu.appendChild(panel);

  const form = byId("rakAccountForm");
  const emailInput = byId("rakAccountEmail");
  const password = byId("rakAccountPassword");
  const submit = byId("rakAccountSubmit");
  const message = byId("rakAccountMessage");

  byId("rakAccountClose").addEventListener("click", () => panel.classList.add("hidden"));
  window.rakShowSignupPasswordStage = (verifiedEmail) => {
    rakAccountLoginMode = false;
    emailInput.readOnly = true;
    byId("rakAccountTitle").textContent = "Create your RAK password";
    byId("rakAccountHelp").textContent = "Google has verified your account. Choose a separate password for RAK Editing Studio.";
    submit.textContent = "Save RAK password";
    password.autocomplete = "new-password";
    emailInput.value = verifiedEmail || "";
    password.value = "";
    panel.classList.remove("hidden");
    message.textContent = "Google verification successful. Create a separate RAK password to finish setting up your account.";
    password.focus();
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!window.rakSupabase) {
      message.textContent = "Account service is not ready. Please reload and try again.";
      return;
    }
    if (rakAccountLoginMode) {
      submit.disabled = true;
      message.textContent = "Signing in…";
      try {
        const { error } = await window.rakSupabase.auth.signInWithPassword({ email: emailInput.value.trim(), password: password.value });
        if (error) throw error;
        message.textContent = "Login successful.";
        panel.classList.add("hidden");
      } catch (error) {
        message.textContent = error?.message || "Login failed. Check your email and RAK password.";
      } finally {
        submit.disabled = false;
      }
      return;
    }
    if (password.value.length < 8) {
      message.textContent = "RAK password must contain at least 8 characters.";
      return;
    }
    submit.disabled = true;
    message.textContent = "Saving your RAK password…";
    try {
      const { error } = await window.rakSupabase.auth.updateUser({ password: password.value });
      if (error) throw error;
      localStorage.removeItem("rak_google_signup_pending");
      message.textContent = "Your RAK account is ready. Password saved successfully.";
      panel.classList.add("hidden");
      const { data } = await window.rakSupabase.auth.getUser();
      showUser(data?.user || null);
    } catch (error) {
      message.textContent = error?.message || "Could not save the password. Please try again.";
    } finally {
      submit.disabled = false;
    }
  });
}

function showUser(user) {
  const signedIn = Boolean(user);
  if (googleButton) googleButton.classList.toggle("hidden", signedIn);
  if (createButton) createButton.classList.toggle("hidden", signedIn);
  signedInInfo?.classList.toggle("hidden", !signedIn);
  if (byId("googleUserName")) byId("googleUserName").textContent = signedIn
    ? (user.user_metadata?.full_name || user.user_metadata?.name || "RAK account") : "";
  if (byId("googleUserEmail")) byId("googleUserEmail").textContent = signedIn ? (user.email || "") : "";
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
    createButton && (createButton.disabled = true);
    setStatus("Account setup is incomplete. Please contact the site owner.", true);
  } else {
    try {
      const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
      });
      window.rakSupabase = supabase;
      window.rakGoogleAuthReady = true;

      async function startGoogleSignIn(isSignup) {
        if (isSignup) localStorage.setItem("rak_google_signup_pending", "true");
        else localStorage.removeItem("rak_google_signup_pending");
        closeMenu();
        setStatus(isSignup ? "Opening Google's secure account verification…" : "Opening Google sign-in…");
        const { error } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin + window.location.pathname,
            queryParams: { prompt: "select_account" },
            scopes: "openid email profile"
          }
        });
        if (error) throw error;
      }

      createButton?.addEventListener("click", async () => {
        createButton.disabled = true;
        try {
          await startGoogleSignIn(true);
        } catch (error) {
          localStorage.removeItem("rak_google_signup_pending");
          setStatus("Google verification could not start: " + (error?.message || "Please try again."), true);
          createButton.disabled = false;
        }
      });

      googleButton.addEventListener("click", async () => {
        googleButton.disabled = true;
        try {
          await startGoogleSignIn(false);
        } catch (error) {
          setStatus("Google sign-in could not start: " + (error?.message || "Please try again."), true);
          googleButton.disabled = false;
        }
      });

      loginButton?.addEventListener("click", () => {
        closeMenu();
        const panel = byId("rakAccountPanel");
        if (!panel) return;
        panel.classList.remove("hidden");
        rakAccountLoginMode = true;
        byId("rakAccountTitle").textContent = "Login to RAK Editing Studio";
        byId("rakAccountHelp").textContent = "Use your verified email and your separate RAK password. You can also use Continue with Google.";
        byId("rakAccountEmail").readOnly = false;
        byId("rakAccountPassword").value = "";
        byId("rakAccountPassword").autocomplete = "current-password";
        byId("rakAccountSubmit").textContent = "Login";
        byId("rakAccountMessage").textContent = "";
        /* The shared form submit handler switches to password login mode. */
        /* no separate submit handler is installed here */
        /*
          event.preventDefault();
          const email = byId("rakAccountEmail").value.trim();
          const password = byId("rakAccountPassword").value;
          const submit = byId("rakAccountSubmit");
          const message = byId("rakAccountMessage");
          submit.disabled = true;
          message.textContent = "Signing in…";
          try {
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) throw error;
            message.textContent = "Login successful.";
            panel.classList.add("hidden");
          } catch (error) {
            message.textContent = error?.message || "Login failed. Check your email and RAK password.";
          } finally {
            submit.disabled = false;
          }
        }; */
      });

      moreOptionsButton?.addEventListener("click", () => {
        const opening = moreOptionsPanel?.classList.contains("hidden");
        moreOptionsPanel?.classList.toggle("hidden", !opening);
        moreOptionsButton.setAttribute("aria-expanded", String(Boolean(opening)));
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
        if (event === "SIGNED_IN") {
          setStatus("Google account verified and connected.");
          if (localStorage.getItem("rak_google_signup_pending") === "true" && session?.user?.email) {
            window.rakShowSignupPasswordStage?.(session.user.email);
          }
        }
        if (event === "SIGNED_OUT") setStatus("You have been signed out.");
      });

      const { data, error } = await supabase.auth.getSession();
      if (error) setStatus("Could not restore login: " + error.message, true);
      showUser(data?.session?.user || null);
      if (localStorage.getItem("rak_google_signup_pending") === "true" && data?.session?.user?.email) {
        window.rakShowSignupPasswordStage?.(data.session.user.email);
      }
      const params = new URLSearchParams(window.location.search);
      const oauthError = params.get("error_description") || params.get("error");
      if (oauthError) setStatus("Google sign-in error: " + oauthError, true);
    } catch (error) {
      googleButton.disabled = true;
      if (createButton) createButton.disabled = true;
      setStatus("Account system could not load: " + (error?.message || "Please reload the page."), true);
      console.error("RAK account initialization failed:", error);
    }
  }
}
