import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./useAuth";

/**
 * Tracks user presence by periodically calling touch_last_seen RPC.
 * Throttled to at most one call every 60 seconds to avoid hammering the DB.
 * Triggered on: mount, route change (via location), tab focus, and user interaction.
 */
const THROTTLE_MS = 60_000; // 1 minute

export function usePresence() {
  const { user } = useAuth();
  const lastTouchRef = useRef<number>(0);

  useEffect(() => {
    if (!user) return;

    const touch = async () => {
      const now = Date.now();
      if (now - lastTouchRef.current < THROTTLE_MS) return;
      lastTouchRef.current = now;
      try {
        await supabase.rpc("touch_last_seen");
      } catch {
        // silent — presence is non-critical
      }
    };

    // Initial touch
    touch();

    // Periodic heartbeat while tab is open
    const interval = setInterval(touch, THROTTLE_MS);

    // Touch on tab focus / visibility change
    const onVisibility = () => {
      if (document.visibilityState === "visible") touch();
    };
    const onFocus = () => touch();
    const onInteract = () => touch();

    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", onFocus);
    window.addEventListener("click", onInteract, { passive: true });
    window.addEventListener("keydown", onInteract, { passive: true });

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("click", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, [user?.id]);
}