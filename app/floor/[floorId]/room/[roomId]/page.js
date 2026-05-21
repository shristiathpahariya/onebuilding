import RoomDetail from "@/app/components/RoomDetail";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function RoomPage({ params }) {
  const { floorId, roomId } = await params;
  const roomNumber = Number(roomId);
  const supabase = await createClient();

  const { data: room } = await supabase
    .from("rooms")
    .select("*")
    .eq("number", roomNumber)
    .single();

  if (!room) {
    notFound();
  }

  let guestbook = [];

  if (room?.id) {
    const { data } = await supabase
      .from("guestbook")
      .select("*")
      .eq("room_id", room.id)
      .order("created_at", { ascending: true });

    guestbook = data ?? [];
  }

  return (
    <RoomDetail
      floorId={floorId}
      roomId={roomId}
      initialRoom={room}
      initialGuestbook={guestbook}
    />
  );
}
