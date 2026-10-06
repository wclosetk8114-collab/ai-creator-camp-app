import { NextResponse } from "next/server";
import { clearMemberSession } from "@/lib/session";
import { appUrl } from "@/lib/settings";

export async function POST() {
  await clearMemberSession();
  return NextResponse.redirect(`${appUrl()}/login`, 303);
}
