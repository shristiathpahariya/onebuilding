const isDev = process.env.NODE_ENV === "development";

/** Active within this window → occupied (5 min in dev, 7 days in prod). */
export const OCCUPIED_WITHIN_MS = isDev
  ? 5 * 60 * 1000
  : 7 * 24 * 60 * 60 * 1000;

/** Active within this window → inactive; beyond → abandoned (15 min in dev, 30 days in prod). */
export const INACTIVE_WITHIN_MS = isDev
  ? 15 * 60 * 1000
  : 30 * 24 * 60 * 60 * 1000;

export function normalizeStatus(status) {
  const value = (status ?? "abandoned").toLowerCase();
  if (value === "occupied" || value === "inactive" || value === "abandoned") {
    return value;
  }
  return "abandoned";
}

export function getRoomMoodFromActivity(lastActive, now = Date.now()) {
  if (!lastActive) return "inactive";

  const elapsed = now - new Date(lastActive).getTime();
  if (elapsed < OCCUPIED_WITHIN_MS) return "occupied";
  if (elapsed < INACTIVE_WITHIN_MS) return "inactive";
  return "abandoned";
}

export function getRoomDisplayStatus(room) {
  if (room.user_id) {
    return getRoomMoodFromActivity(room.last_active);
  }
  return normalizeStatus(room.status);
}
