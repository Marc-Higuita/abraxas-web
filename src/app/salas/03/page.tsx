import type { Metadata } from "next";
import { RoomPending } from "@/components/RoomPending";
import { getRoom } from "@/config/rooms";

const room = getRoom("03");
export const metadata: Metadata = { title: `Sala ${room.id} · ${room.title}` };

export default function Page() {
  return <RoomPending room={room} />;
}
