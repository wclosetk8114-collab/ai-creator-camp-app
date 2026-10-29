"use server";
import { revalidatePath } from "next/cache";
import { getMember } from "@/lib/session";
import { sql } from "@/lib/db";
import { stageCount } from "@/lib/camp";

export async function setupDoneAction() {
  const m = await getMember();
  if (!m) return;
  const total = await stageCount("setup");
  if (m.setup_step > total) return;
  await sql`update camp.members set setup_step = ${m.setup_step + 1} where id = ${m.id}`;
  revalidatePath("/me/tool");
  revalidatePath("/me");
}

export async function setupBackAction() {
  const m = await getMember();
  if (!m) return;
  if (m.setup_step <= 1) return;
  await sql`update camp.members set setup_step = ${m.setup_step - 1} where id = ${m.id}`;
  revalidatePath("/me/tool");
  revalidatePath("/me");
}
