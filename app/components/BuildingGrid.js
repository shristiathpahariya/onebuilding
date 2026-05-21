"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { getCachedRooms, setCachedRooms } from "@/lib/roomsCache";
import { getRoomDisplayStatus, normalizeStatus } from "@/lib/roomStatus";

const supabase = createClient();
const DEFAULT_THEME = "#111113";

const container = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.015 },
  },
};

const item = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0 },
};

const statusStyles = {
  occupied: {
    card: "border-amber-500/70 bg-amber-950/45 shadow-[inset_0_0_24px_rgba(251,191,36,0.14)] hover:border-amber-400/80 hover:bg-amber-950/55",
    label: "text-amber-300/90",
  },
  inactive: {
    card: "border-blue-500/55 bg-blue-950/50 shadow-[inset_0_0_20px_rgba(59,130,246,0.1)] hover:border-blue-400/65 hover:bg-blue-950/60",
    label: "text-blue-300/75",
  },
  unclaimed: {
    card: "border-zinc-300/70 bg-zinc-500 shadow-[0_2px_10px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.18)] hover:border-zinc-200 hover:bg-zinc-400",
    label: "text-zinc-50 font-medium",
  },
  abandoned: {
    card: "border-zinc-600/50 bg-zinc-800/90 hover:border-zinc-500/70 hover:bg-zinc-800",
    label: "text-zinc-400",
  },
};

function getStatusStyles(status, room) {
  if (!room?.user_id) {
    return statusStyles.unclaimed;
  }
  return statusStyles[normalizeStatus(status)];
}

function getThemeTint(room, displayStatus) {
  if (displayStatus !== "occupied") return null;
  if (!room.user_id || !room.theme_color) return null;
  if (room.theme_color.toLowerCase() === DEFAULT_THEME) return null;
  return room.theme_color;
}

function groupByFloor(rooms) {
  const map = new Map();

  for (const room of rooms) {
    if (!map.has(room.floor)) {
      map.set(room.floor, []);
    }
    map.get(room.floor).push(room);
  }

  return [...map.entries()]
    .sort(([floorA], [floorB]) => floorB - floorA)
    .map(([id, floorRooms]) => ({
      id,
      rooms: floorRooms.sort((a, b) => a.number - b.number),
    }));
}

export default function BuildingGrid({ initialRooms = [] }) {
  const [rooms, setRooms] = useState(() => {
    if (initialRooms.length > 0) {
      setCachedRooms(initialRooms);
      return initialRooms;
    }
    return getCachedRooms() ?? [];
  });
  const hasAnimated = useRef(false);
  const [, setTick] = useState(0);

  const fetchRooms = useCallback(async () => {
    const { data } = await supabase
      .from("rooms")
      .select("*")
      .order("floor", { ascending: false });

    const next = data ?? [];
    setRooms(next);
    setCachedRooms(next);
  }, []);

  useEffect(() => {
    fetchRooms();
  }, [fetchRooms]);

  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === "visible") {
        fetchRooms();
      }
    }

    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchRooms]);

  useEffect(() => {
    const intervalMs =
      process.env.NODE_ENV === "development" ? 30_000 : 3_600_000;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      fetchRooms();
    }, intervalMs);
    return () => clearInterval(id);
  }, [fetchRooms]);

  const floors = groupByFloor(rooms);

  return (
    <section className="flex min-h-full flex-1 items-center justify-center bg-[#030305] px-6 py-16">
      <div className="w-full max-w-3xl">
        <div className="rounded-sm border border-zinc-800/90 bg-[#0a0a0c] p-5 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.85)]">
          <div className="mb-5 flex justify-end">
            <Link
              href="/bulletin"
              className="font-mono text-[11px] tracking-wider text-zinc-500 transition-colors hover:text-zinc-300"
            >
              Bulletin →
            </Link>
          </div>
          <div className="flex flex-col gap-6">
            {floors.map((floor) => (
              <div key={floor.id}>
                <p className="mb-3 font-mono text-xs tracking-[0.2em] text-zinc-400">
                  FLOOR {floor.id}
                </p>
                <motion.div
                  className="grid grid-cols-5 gap-4"
                  variants={container}
                  initial={hasAnimated.current ? false : "hidden"}
                  animate={rooms.length > 0 ? "show" : "hidden"}
                  onAnimationComplete={() => {
                    hasAnimated.current = true;
                  }}
                >
                  {floor.rooms.map((room) => {
                    const displayStatus = getRoomDisplayStatus(room);
                    const styles = getStatusStyles(displayStatus, room);
                    const themeTint = getThemeTint(room, displayStatus);

                    return (
                      <motion.div key={room.id} variants={item}>
                        <Link
                          href={`/floor/${floor.id}/room/${room.number}`}
                          className={[
                            "relative flex aspect-[4/5] items-end justify-start overflow-hidden rounded-sm border p-2.5 transition-colors",
                            styles.card,
                          ].join(" ")}
                        >
                          {themeTint ? (
                            <span
                              className="pointer-events-none absolute inset-0 opacity-35"
                              style={{ backgroundColor: themeTint }}
                              aria-hidden
                            />
                          ) : null}
                          <span
                            className={[
                              "relative font-mono text-xs tabular-nums tracking-wider",
                              styles.label,
                            ].join(" ")}
                          >
                            {room.number}
                          </span>
                        </Link>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
