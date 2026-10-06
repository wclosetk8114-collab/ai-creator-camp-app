"use server";
import { revalidatePath } from "next/cache";
import { getMember } from "@/lib/session";
import { sql } from "@/lib/db";
import { chooseTrack } from "@/lib/camp";

export async function chooseTrackAction(fd: FormData) {
  const m = await getMember();
  if (!m) return;
  await chooseTrack(m, String(fd.get("track") || ""));
  revalidatePath("/me");
}

export async function rsvpAction(fd: FormData) {
  const m = await getMember();
  if (!m) return;
  const id = Number(fd.get("event_id"));
  const status = fd.get("status") === "no" ? "no" : "yes";
  await sql`insert into camp.rsvps (event_id, member_id, status) values (${id}, ${m.id}, ${status})
    on conflict (event_id, member_id) do update set status = excluded.status`;
  revalidatePath("/me");
}
