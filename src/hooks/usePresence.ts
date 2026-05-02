import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

const THROTTLE_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Pings the `touch_last_seen` RPC to update the current user's
 * `profiles.last_seen_at`. Throttled to once per 5 minutes per session
 * and re-fires when the tab becomes visible again.
 */
export function usePresence() {
  const { user } = useAuth();
  const lastPingRef = useRef<number>(0);

  useEffect(() => {
    if (!user?.id) return;

    const ping = async () => {
      const now = Date.now();
      if (now - lastPingRef.current < THROTTLE_MS) return;
      lastPingRef.current = now;
      try {
        await supabase.rpc("touch_last_seen");
      } catch (err) {
        // Silent: presence is best-effort
        console.debug("touch_last_seen failed", err);
      }
    };

    // Initial ping on mount/login
    ping();

    // Periodic ping while tab is open
    const interval = setInterval(ping, THROTTLE_MS);

    // Ping when tab becomes visible again
    const onVisibility = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [user?.id]);
}