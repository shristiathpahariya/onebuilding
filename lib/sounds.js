import { Howl } from "howler";

const sources = {
  1: "/sounds/floor1.mp3",
  2: "/sounds/floor2.wav",
  3: "/sounds/floor3.wav",
};

const cache = {};

export function getFloorSound(floorId) {
  if (typeof window === "undefined") return null;

  if (!cache[floorId]) {
    const src = sources[floorId];
    if (!src) return null;

    cache[floorId] = new Howl({ src: [src], loop: true, volume: 0.3 });
  }

  return cache[floorId];
}
