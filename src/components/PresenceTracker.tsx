import { usePresence } from "@/hooks/usePresence";

/**
 * Mounts the presence tracker. Must be rendered inside <AuthProvider>.
 * Pings touch_last_seen so admins can see when each user was last active.
 */
export function PresenceTracker() {
  usePresence();
  return null;
}