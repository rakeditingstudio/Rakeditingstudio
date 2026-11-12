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
      visitorId = crypto.randomUUID();
      localStorage.setItem("rakVisitorIdV1", visitorId);
    }
    const pagePath = location.pathname || "/";
    supabase.rpc("record_site_visit", {
      p_visitor_id: visitorId,
      p_page_path: pagePath
    }).then(({ error }) => {
      if (error) console.info("RAK visitor analytics is awaiting database setup.");
    });

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        queueMicrotask(() => supabase.rpc("record_login_event"));
        queueMicrotask(() => supabase.rpc("record_site_visit", {
          p_visitor_id: visitorId,
          p_page_path: pagePath
        }));
      }
    });
  } catch (error) {
    console.info("RAK visitor analytics could not start.", error);
  }
}
