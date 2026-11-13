import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, getSupabaseClient } from "../supabase-client.js";

const validConfig = /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(SUPABASE_URL) &&
  typeof SUPABASE_PUBLISHABLE_KEY === "string" &&
  SUPABASE_PUBLISHABLE_KEY.startsWith("sb_publishable_");

if (validConfig) {
  try {
    const supabase = getSupabaseClient();
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

    const getPagePath = () => {
      const path = location.pathname || "/";
      return /^\/[a-zA-Z0-9/_-]*$/.test(path) ? path.slice(0, 160) : "/";
    };
    const deviceType = /tablet|ipad/i.test(navigator.userAgent) ? "tablet" :
      /mobile|android|iphone|ipod/i.test(navigator.userAgent) ? "mobile" : "desktop";

    const recordVisit = () => supabase.rpc("record_site_visit", {
      p_visitor_id: visitorId,
      p_page_path: getPagePath()
    });
    const heartbeat = () => supabase.rpc("record_visitor_presence", {
      p_visitor_id: visitorId,
      p_page_path: getPagePath(),
      p_device_type: deviceType
    });

    // Realtime Presence broadcasts anonymous, coarse session state immediately.
    const liveChannel = supabase.channel("rak-live-visitors", {
      config: { presence: { key: visitorId } }
    });
    const trackPresence = () => {
      if (getPagePath().endsWith("/owner-analytics.html")) return Promise.resolve();
      return liveChannel.track({
      visitor_id: visitorId,
      page_path: getPagePath(),
      device_type: deviceType,
      last_seen_at: new Date().toISOString()
      });
    };

    recordVisit();
    heartbeat();
    liveChannel.subscribe(status => {
      if (status === "SUBSCRIBED") trackPresence();
    });

    // Keep the existing database heartbeat as a resilient fallback for aggregate stats.
    const presenceTimer = window.setInterval(() => {
      heartbeat();
      trackPresence();
    }, 30000);

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") {
        heartbeat();
        trackPresence();
      }
    });
    window.addEventListener("pagehide", () => {
      window.clearInterval(presenceTimer);
      liveChannel.untrack();
      supabase.removeChannel(liveChannel);
    }, { once: true });

    supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        queueMicrotask(() => supabase.rpc("record_login_event"));
        queueMicrotask(recordVisit);
        queueMicrotask(heartbeat);
        queueMicrotask(trackPresence);
      }
    });
  } catch (error) {
    console.info("RAK visitor analytics could not start.", error);
  }
}
