"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { createClient } from "@/lib/supabase/client";
import { updateCachedRoom } from "@/lib/roomsCache";
import {
  getRoomDisplayStatus,
  getRoomMoodFromActivity,
} from "@/lib/roomStatus";

const supabase = createClient();
const DEFAULT_COLOR = "#111113";
const FLOORS = [3, 2, 1];
const ROOMS_PER_FLOOR = 5;

function getHallwayNav(floor, roomNumber) {
  const unit = roomNumber % 100;

  return {
    unit,
    prevRoom: unit > 1 ? floor * 100 + unit - 1 : null,
    nextRoom:
      unit < ROOMS_PER_FLOOR ? floor * 100 + unit + 1 : null,
    roomOnFloor: (targetFloor) => targetFloor * 100 + unit,
  };
}

function ElevatorBar({ floor, roomOnFloor }) {
  return (
    <aside
      className="fixed right-0 top-0 z-20 flex h-full w-9 justify-center border-l border-zinc-800/60 bg-zinc-950/50 sm:w-11"
      aria-label="Elevator"
    >
      <div className="relative flex h-full w-full flex-col overflow-y-auto overscroll-contain py-6 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="absolute inset-y-6 left-1/2 w-px -translate-x-1/2 bg-zinc-800" />

        {FLOORS.map((targetFloor) => {
          const targetRoom = roomOnFloor(targetFloor);
          const isCurrentFloor = targetFloor === floor;

          return (
            <Link
              key={targetFloor}
              href={`/floor/${targetFloor}/room/${targetRoom}`}
              aria-label={`Floor ${targetFloor}, room ${targetRoom}`}
              className="group relative flex min-h-20 flex-1 items-center justify-center sm:min-h-24"
            >
              <span
                className={[
                  "relative z-10 rounded-full transition-all duration-300",
                  isCurrentFloor
                    ? "h-10 w-2 bg-amber-400/90 shadow-[0_0_12px_rgba(251,191,36,0.45)]"
                    : "h-6 w-1 bg-zinc-700 group-hover:h-8 group-hover:w-1.5 group-hover:bg-zinc-400",
                ].join(" ")}
              />
            </Link>
          );
        })}
      </div>
    </aside>
  );
}

function HallwayArrow({ href, label, direction }) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-2 font-mono text-xs tracking-wider text-zinc-600 transition-colors hover:text-zinc-300"
      aria-label={`${direction === "left" ? "Previous" : "Next"} room ${label}`}
    >
      {direction === "left" ? (
        <>
          <span className="text-lg transition-transform group-hover:-translate-x-0.5">
            ←
          </span>
          <span>{label}</span>
        </>
      ) : (
        <>
          <span>{label}</span>
          <span className="text-lg transition-transform group-hover:translate-x-0.5">
            →
          </span>
        </>
      )}
    </Link>
  );
}

function formatLastActive(iso) {
  if (!iso) return "Never";

  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function isRecentlyActive(lastActive) {
  if (!lastActive) return false;
  return getRoomMoodFromActivity(lastActive) === "occupied";
}

function formatGuestbookDate(iso) {
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function RoomDetail({
  floorId,
  roomId,
  initialRoom = null,
  initialGuestbook = [],
}) {
  const roomNumber = Number(roomId);
  const [room, setRoom] = useState(initialRoom);
  const [guestbook, setGuestbook] = useState(initialGuestbook);
  const [user, setUser] = useState(null);
  const [mounted, setMounted] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [note, setNote] = useState(() => initialRoom?.note ?? "");
  const [color, setColor] = useState(
    () => initialRoom?.theme_color ?? DEFAULT_COLOR
  );

  useEffect(() => {
    setMounted(true);

    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [roomNumber]);

  useEffect(() => {
    let sound;
    let cancelled = false;

    import("@/lib/sounds").then(({ getFloorSound }) => {
      if (cancelled) return;
      sound = getFloorSound(Number(floorId));
      sound?.play();
    });

    return () => {
      cancelled = true;
      sound?.stop();
    };
  }, [floorId]);

  useEffect(() => {
    if (room) {
      setNote(room.note ?? "");
      setColor(room.theme_color ?? DEFAULT_COLOR);
    }
  }, [room]);

  useEffect(() => {
    if (!mounted || !user || !room || user.id !== room.user_id) return;

    const timeout = setTimeout(async () => {
      const now = new Date().toISOString();

      await supabase
        .from("rooms")
        .update({ last_active: now, status: "occupied" })
        .eq("number", roomNumber)
        .eq("user_id", user.id);

      setRoom((prev) => {
        const next = prev
          ? { ...prev, last_active: now, status: "occupied" }
          : prev;
        if (next) updateCachedRoom(next);
        return next;
      });
    }, 500);

    return () => clearTimeout(timeout);
  }, [mounted, user?.id, room?.user_id, roomNumber]);

  async function handleClaim() {
    setClaiming(true);
    setError(null);

    const {
      data: { user: currentUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !currentUser) {
      setError("You must be signed in to claim a room.");
      setClaiming(false);
      return;
    }

    const { data, error: updateError } = await supabase
      .from("rooms")
      .update({
        status: "occupied",
        owner_name: currentUser.email,
        user_id: currentUser.id,
        last_active: new Date().toISOString(),
      })
      .eq("number", roomNumber)
      .select()
      .single();

    if (updateError || !data) {
      setError(
        updateError?.message ??
          "Could not claim this room. It may already be taken, or your account may not have permission."
      );
      setClaiming(false);
      return;
    }

    setRoom(data);
    updateCachedRoom(data);
    setClaiming(false);

    await supabase.from("guestbook").insert({
      room_id: data.id,
      message: `Room ${roomNumber} was claimed by a new resident.`,
    });

    void fetch("/api/notify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ownerEmail: data.owner_name,
        roomNumber: data.number,
        visitorEmail: currentUser.email,
        message: "",
        type: "claim",
      }),
    });
  }

  async function handleSave() {
    setSaving(true);
    setError(null);

    const { data, error: updateError } = await supabase
      .from("rooms")
      .update({ note, theme_color: color })
      .eq("number", roomNumber)
      .select()
      .single();

    if (updateError || !data) {
      setError(updateError?.message ?? "Could not save your room.");
      setSaving(false);
      return;
    }

    setRoom(data);
    updateCachedRoom(data);
    setSaving(false);
  }

  async function handleGuestbookSubmit(event) {
    event.preventDefault();

    const trimmed = message.trim();
    if (!trimmed || !room?.id || !user?.email) return;

    setSubmitting(true);
    setError(null);

    const optimisticId = `temp-${Date.now()}`;
    const optimisticEntry = {
      id: optimisticId,
      room_id: room.id,
      message: trimmed,
      created_at: new Date().toISOString(),
    };

    setGuestbook((prev) => [...prev, optimisticEntry]);
    setMessage("");

    const { data, error: insertError } = await supabase
      .from("guestbook")
      .insert({
        room_id: room.id,
        visitor_email: user.email,
        message: trimmed,
      })
      .select()
      .single();

    if (insertError || !data) {
      setGuestbook((prev) => prev.filter((entry) => entry.id !== optimisticId));
      setMessage(trimmed);
      setError(insertError?.message ?? "Could not post to the guestbook.");
      setSubmitting(false);
      return;
    }

    setGuestbook((prev) =>
      prev.map((entry) => (entry.id === optimisticId ? data : entry))
    );
    setSubmitting(false);

    if (room.owner_name) {
      void fetch("/api/notify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ownerEmail: room.owner_name,
          roomNumber: room.number,
          visitorEmail: user.email,
          message: trimmed,
        }),
      });
    }
  }

  const isClaimed = Boolean(room?.user_id);
  const isOwner = Boolean(user && room?.user_id && user.id === room.user_id);
  const isOccupied =
    Boolean(room?.user_id) &&
    (getRoomDisplayStatus(room) === "occupied" || room.status === "occupied");
  const canSignGuestbook = mounted && user && !isOwner && isOccupied;
  const themeColor = isOwner ? color : (room?.theme_color ?? DEFAULT_COLOR);
  const ownerActive = isRecentlyActive(room?.last_active);
  const floor = Number(floorId);
  const { prevRoom, nextRoom, roomOnFloor } = getHallwayNav(floor, roomNumber);

  return (
    <motion.main
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.97 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      className="relative flex min-h-full flex-1 flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950"
    >
      <ElevatorBar floor={floor} roomOnFloor={roomOnFloor} />
      <header className="border-b border-zinc-800/80 bg-zinc-950/90 px-6 py-4 pr-12 sm:pr-14">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-between gap-x-6 gap-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-zinc-300">
            <span>Room {roomId}</span>
            <span className="text-zinc-600">·</span>
            <span>Floor {floorId}</span>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-zinc-500">
            <span>{room?.owner_name ?? "Unclaimed"}</span>
            <span className="text-zinc-700">·</span>
            <span>Last active {formatLastActive(room?.last_active)}</span>
            {isClaimed ? (
              <>
                <span className="text-zinc-700">·</span>
                <span className="flex items-center gap-1.5">
                  <span
                    className={[
                      "h-2 w-2 rounded-full",
                      ownerActive
                        ? "animate-pulse bg-emerald-400"
                        : "bg-zinc-600",
                    ].join(" ")}
                    aria-hidden
                  />
                  <span className="text-xs">
                    {ownerActive ? "Present" : "Away"}
                  </span>
                </span>
              </>
            ) : null}
          </div>
        </div>
      </header>

      <div className="relative flex flex-1 flex-col items-center px-6 py-10 pr-12 sm:px-16 sm:pr-14">
        <div className="relative flex w-full max-w-3xl items-center justify-center gap-4">
          <div className="absolute left-0 top-1/2 hidden -translate-y-1/2 md:block">
            {prevRoom ? (
              <HallwayArrow
                href={`/floor/${floorId}/room/${prevRoom}`}
                label={String(prevRoom)}
                direction="left"
              />
            ) : (
              <span className="w-16" aria-hidden />
            )}
          </div>

          <div className="relative w-full max-w-2xl overflow-hidden rounded-sm border border-zinc-800/80 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.75)]">
          <div
            className="pointer-events-none absolute inset-0 opacity-30"
            style={{ backgroundColor: themeColor }}
            aria-hidden
          />

          <div className="relative space-y-10 p-8 md:p-10">
            <section className="space-y-3">
              <h2 className="font-mono text-xs tracking-[0.2em] text-zinc-500">
                NOTE
              </h2>

              {mounted && isOwner ? (
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Leave a message, a thought, anything…"
                  rows={5}
                  className="font-typewriter w-full resize-y rounded-sm border border-zinc-700/50 bg-zinc-950/50 px-4 py-3 text-base leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none"
                />
              ) : room?.note ? (
                <p className="font-typewriter text-lg leading-relaxed text-zinc-200">
                  {room.note}
                </p>
              ) : (
                <p className="font-typewriter text-zinc-600 italic">
                  No note yet.
                </p>
              )}
            </section>

            <section className="space-y-4 border-t border-zinc-800/60 pt-8">
              <h2 className="font-mono text-xs tracking-[0.2em] text-zinc-500">
                GUESTBOOK
              </h2>

              {guestbook.length > 0 ? (
                <ul className="space-y-3">
                  {guestbook.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-sm border border-zinc-800/50 bg-zinc-950/40 px-4 py-3"
                    >
                      <p className="text-sm leading-relaxed text-zinc-300">
                        {entry.message}
                      </p>
                      {entry.created_at ? (
                        <p className="mt-2 font-mono text-xs text-zinc-600">
                          {formatGuestbookDate(entry.created_at)}
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-zinc-600 italic">
                  No guestbook entries yet.
                </p>
              )}

              {canSignGuestbook ? (
                <form onSubmit={handleGuestbookSubmit} className="space-y-3">
                  <textarea
                    value={message}
                    onChange={(event) => setMessage(event.target.value)}
                    placeholder="Leave a message for the owner…"
                    rows={3}
                    className="font-typewriter w-full resize-y rounded-sm border border-zinc-700/50 bg-zinc-950/50 px-4 py-3 text-sm leading-relaxed text-zinc-200 placeholder:text-zinc-600 focus:border-amber-500/50 focus:outline-none"
                  />
                  <button
                    type="submit"
                    disabled={submitting || !message.trim()}
                    className="rounded-sm border border-zinc-700/50 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-600 hover:bg-zinc-900 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {submitting ? "Posting…" : "Sign guestbook"}
                  </button>
                </form>
              ) : null}

              {mounted && isOccupied && !user ? (
                <p className="text-sm text-zinc-500">
                  <Link
                    href="/login"
                    className="text-amber-200/70 transition-colors hover:text-amber-200"
                  >
                    Sign in to sign the guestbook
                  </Link>
                </p>
              ) : null}
            </section>

            {mounted && isOwner ? (
              <div className="space-y-4 border-t border-zinc-800/60 pt-8">
                <label className="flex items-center gap-3 text-sm text-zinc-500">
                  Theme color
                  <input
                    type="color"
                    value={color}
                    onChange={(event) => setColor(event.target.value)}
                    className="h-10 w-14 cursor-pointer rounded-sm border border-zinc-700/50 bg-transparent"
                  />
                  <span className="font-mono text-xs text-zinc-600">
                    {color}
                  </span>
                </label>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full rounded-sm border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save room"}
                </button>
              </div>
            ) : null}

            {mounted && !isClaimed && user ? (
              <div className="border-t border-zinc-800/60 pt-8">
                <button
                  type="button"
                  onClick={handleClaim}
                  disabled={claiming}
                  className="w-full rounded-sm border border-amber-500/40 bg-amber-500/10 px-4 py-2.5 text-sm text-amber-200 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {claiming ? "Claiming…" : "Claim this room"}
                </button>
              </div>
            ) : null}

            {mounted && !isClaimed && !user ? (
              <p className="border-t border-zinc-800/60 pt-8 text-center text-zinc-500">
                <Link
                  href="/login"
                  className="text-amber-200/70 transition-colors hover:text-amber-200"
                >
                  Sign in to claim this room
                </Link>
              </p>
            ) : null}

            {error ? (
              <p className="text-center text-sm text-red-400/90">{error}</p>
            ) : null}
          </div>
          </div>

          <div className="absolute right-0 top-1/2 hidden -translate-y-1/2 md:block">
            {nextRoom ? (
              <HallwayArrow
                href={`/floor/${floorId}/room/${nextRoom}`}
                label={String(nextRoom)}
                direction="right"
              />
            ) : (
              <span className="w-16" aria-hidden />
            )}
          </div>
        </div>

        <div className="mt-4 flex w-full max-w-3xl justify-between gap-4 md:hidden">
          {prevRoom ? (
            <HallwayArrow
              href={`/floor/${floorId}/room/${prevRoom}`}
              label={String(prevRoom)}
              direction="left"
            />
          ) : (
            <span />
          )}
          {nextRoom ? (
            <HallwayArrow
              href={`/floor/${floorId}/room/${nextRoom}`}
              label={String(nextRoom)}
              direction="right"
            />
          ) : null}
        </div>

        <Link
          href="/"
          className="mt-8 inline-block text-sm text-zinc-500 transition-colors hover:text-zinc-300"
        >
          ← Back to building
        </Link>
      </div>
    </motion.main>
  );
}
