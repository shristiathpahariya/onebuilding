let cache = null;
let fetchedAt = 0;
const TTL_MS = 60_000;

export function getCachedRooms() {
  if (cache && Date.now() - fetchedAt < TTL_MS) {
    return cache;
  }
  return null;
}

export function setCachedRooms(rooms) {
  cache = rooms;
  fetchedAt = Date.now();
}

export function updateCachedRoom(updatedRoom) {
  if (!cache || !updatedRoom) return;
  cache = cache.map((room) =>
    room.number === updatedRoom.number ? { ...room, ...updatedRoom } : room
  );
  fetchedAt = Date.now();
}
