import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from "../supabase-config.js";

const validConfig = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL) &&
  typeof SUPABASE_PUBLISHABLE_KEY === "string" &&
  SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_");

if (validConfig) {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
    let visitorId = localStorage.getItem("rakVisitorIdV1");
    if (!visitorId) {
      if (crypto.randomUUID) visitorId = crypto.randomUUID();
      else {
        const bytes = new Uint8Array(16);
        crypto.getRandomValues(bytes);
        bytes[6] = (bytes[6] & 0x0f) | 0x40;
        bytes[8] = (bytes[8] & 0x3f) | 0x80;
        const hex = Array.from(bytes, value => value.toString(16).padStart(2, "0")).join("");
        visitorId = hex.slice(0,8)+"-"+hex.slice(8,12)+"-"+hex.slice(12,16)+"-"+hex.slice(16,20)+"-"+hex.slice(20);
      }
      localStorage.setItem("rakVisitorIdV1", visitorId);
    }

    const pagePath = location.pathname || "/";
    const deviceType = /tablet|ipad/i.test(navigator.userAgent) ? "tablet" :
      /mobile|android|iphone|ipod/i.test(navigator.userAgent) ? "mobile" : "desktop";

    const recordVisit = () => supabase.rpc("record_site_visit", {
      p_visitor_id: visitorId,
      p_page_path: pagePath
    });
    const heartbeat = () => supabase.rpc("record_visitor_presence", {
      p_visitor_id: visitorId,
      p_page_path: pagePath,
      p_device_type: deviceType
    });

    recordVisit();
    heartbeat();
    const presenceTimer = window.setInterval(heartbeat, 30000);
    window.addEventListener("pagehide", () => window.clearInterval(presenceTimer), { once: true });

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        queueMicrotask(() => supabase.rpc("record_login_event"));
        queueMicrotask(recordVisit);
        queueMicrotask(heartbeat);
      }
    });
  } catch (error) {
    console.info("RAK visitor analytics could not start.", error);
  }
}
