import BuildingGrid from "./components/BuildingGrid";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  await supabase.rpc("sync_room_statuses");

  const { data: rooms } = await supabase
    .from("rooms")
    .select("*")
    .order("floor", { ascending: false });

  return (
    <main className="flex flex-1 flex-col">
      <BuildingGrid initialRooms={rooms ?? []} />
    </main>
  );
}
