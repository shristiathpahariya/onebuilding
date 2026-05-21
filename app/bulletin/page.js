import BulletinFeed from "@/app/components/BulletinFeed";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
  title: "The Building Bulletin",
  description: "Anonymous activity from across the building.",
};

export const dynamic = "force-dynamic";

export default async function BulletinPage() {
  const supabase = await createClient();

  const { data: entries } = await supabase
    .from("guestbook")
    .select("id, message, created_at, room_id, rooms(number)")
    .order("created_at", { ascending: false })
    .limit(30);

  return <BulletinFeed initialEntries={entries ?? []} />;
}
