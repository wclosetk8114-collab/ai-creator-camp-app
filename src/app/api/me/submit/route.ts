import { NextResponse } from "next/server";
import { getMember } from "@/lib/session";
import { submitWork } from "@/lib/camp";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const m = await getMember();
  if (!m) return NextResponse.json({ ok: false, message: "ログインしてください" }, { status: 401 });
  const f = await req.formData();
  const content = String(f.get("content") || "").slice(0, 8000);
  const files = f.getAll("images").filter((x): x is File => x instanceof File && x.size > 0).slice(0, 3);
  const images = [];
  for (const file of files) {
    if (file.size > 4 * 1024 * 1024) return NextResponse.json({ ok: false, message: "画像は1枚4MBまでです" }, { status: 400 });
    images.push({ data: Buffer.from(await file.arrayBuffer()), type: file.type || "image/jpeg" });
  }
  if (!content.trim() && !images.length) return NextResponse.json({ ok: false, message: "提出する内容を入れてください" }, { status: 400 });
  const res = await submitWork(m, content, images);
  return NextResponse.json({ ok: true, verdict: res.grade?.verdict ?? null, message: res.message });
}
