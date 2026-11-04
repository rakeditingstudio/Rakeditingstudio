import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "./supabase-config.js";

const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
});
let signedIn = false;
let promptBox;

async function refreshSession() {
  const { data } = await supabase.auth.getSession();
  signedIn = Boolean(data?.session?.user);
}
await refreshSession();
supabase.auth.onAuthStateChange((_event, session) => { signedIn = Boolean(session?.user); });

function showPrompt() {
  if (!promptBox) {
    promptBox = document.createElement("div");
    promptBox.id = "rakFeatureSignInPrompt";
    promptBox.style.cssText = "position:fixed;inset:0;z-index:99999;display:grid;place-items:center;padding:18px;background:#000b";
    promptBox.innerHTML = `
      <div style="width:min(390px,100%);padding:22px;border:1px solid #b88936;border-radius:18px;background:#14110c;color:#fff;text-align:center">
        <div style="font-size:32px">🔒</div>
        <h2 style="color:#f3bd54;margin:8px 0">Sign in first</h2>
        <p>Please sign in to your RAK Editing Studio account to use this feature.</p>
        <button type="button" id="rakFeatureSignInGo">Sign in / Create account</button>
        <button type="button" id="rakFeatureSignInClose" style="margin-left:7px;background:#222;color:#fff;border-color:#444">Not now</button>
      </div>`;
    document.body.appendChild(promptBox);
    promptBox.querySelector("#rakFeatureSignInClose").addEventListener("click",()=>promptBox.remove());
    promptBox.querySelector("#rakFeatureSignInGo").addEventListener("click",()=>{ window.location.href="./?signin=1"; });
    promptBox.addEventListener("click",e=>{if(e.target===promptBox)promptBox.remove();});
  }
}
document.addEventListener("click",event=>{
  if(signedIn)return;
  const target=event.target instanceof Element?event.target:null;
  if(!target || target.closest("a[href='./'], a[href^='#'], [data-public-action='true'], #rakFeatureSignInPrompt"))return;
  const control=target.closest("button,a,[role='button'],input[type='submit']");
  if(!control)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();showPrompt();
},true);
document.addEventListener("submit",event=>{
  if(signedIn)return;
  event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();showPrompt();
},true);
