"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const supabase = createClient();
const POLL_MS = 20_000;
const LIMIT = 30;

function formatTimestamp(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Anonymous wire copy — never show visitor_email on the bulletin. */
function formatDispatch(entry) {
  const text = entry.message?.trim() ?? "";
  const roomNumber = entry.rooms?.number;

  if (
    text.includes("was claimed by a new resident") ||
    text.includes("has gone dark")
  ) {
    return text;
  }

  if (roomNumber) {
    return `Someone left a message in Room ${roomNumber}.`;
  }

  return text || "Activity in the building.";
}

export default function BulletinFeed({ initialEntries = [] }) {
  const [entries, setEntries] = useState(initialEntries);

  const fetchEntries = useCallback(async () => {
    const { data } = await supabase
      .from("guestbook")
      .select("id, message, created_at, room_id, rooms(number)")
      .order("created_at", { ascending: false })
      .limit(LIMIT);

    setEntries(data ?? []);
  }, []);

  useEffect(() => {
    const id = setInterval(fetchEntries, POLL_MS);
    return () => clearInterval(id);
  }, [fetchEntries]);

  useEffect(() => {
    function onVisible() {
      if (document.visibilityState === "visible") fetchEntries();
    }
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [fetchEntries]);

  return (
    <main className="flex min-h-full flex-1 flex-col items-center justify-center bg-[#1a1510] px-4 py-10 sm:px-6">
      <div className="relative w-full max-w-2xl overflow-hidden rounded-sm border-2 border-[#3d2e1f] bg-[#f2e6c9] shadow-[0_8px_40px_rgba(0,0,0,0.55),inset_0_0_80px_rgba(139,119,80,0.12)]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent, transparent 2px, #3d2e1f 2px, #3d2e1f 3px)",
          }}
          aria-hidden
        />

        <header className="relative border-b-2 border-double border-[#3d2e1f] px-6 py-5 text-center">
          <p className="font-mono text-[10px] tracking-[0.35em] text-[#6b5a45]">
            ONE BUILDING FOREVER
          </p>
          <h1 className="mt-2 font-mono text-2xl font-semibold tracking-tight text-[#2c1810] sm:text-3xl">
            THE BUILDING BULLETIN
          </h1>
          <p className="mt-2 font-mono text-[11px] tracking-widest text-[#6b5a45]">
            — WIRE SERVICE — ALL FLOORS —
          </p>
        </header>

        <div className="relative max-h-[min(70vh,560px)] overflow-y-auto px-6 py-5">
          {entries.length === 0 ? (
            <p className="text-center font-mono text-sm italic text-[#6b5a45]">
              No dispatches yet. The building is quiet.
            </p>
          ) : (
            <ul className="space-y-0 divide-y divide-[#3d2e1f]/30">
              {entries.map((entry) => (
                <li key={entry.id} className="py-4 first:pt-0 last:pb-0">
                  <p className="font-mono text-sm leading-relaxed text-[#2c1810]">
                    {formatDispatch(entry)}
                  </p>
                  <time
                    dateTime={entry.created_at}
                    className="mt-2 block font-mono text-[10px] uppercase tracking-widest text-[#8b7355]"
                  >
                    {formatTimestamp(entry.created_at)}
                  </time>
                </li>
              ))}
            </ul>
          )}
        </div>

        <footer className="relative border-t border-[#3d2e1f]/40 px-6 py-4 text-center">
          <Link
            href="/"
            className="font-mono text-[11px] tracking-wider text-[#6b5a45] transition-colors hover:text-[#2c1810]"
          >
            ← Return to the building
          </Link>
        </footer>
      </div>
    </main>
  );
}
