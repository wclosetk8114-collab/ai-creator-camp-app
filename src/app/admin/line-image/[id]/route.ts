import { isAdmin } from "@/lib/session";
import { getSettings } from "@/lib/settings";
import { getContent } from "@/lib/line";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 管理者だけが、LINEで届いた画像（学生証など）を見られる
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin())) return new Response("forbidden", { status: 403 });
  const { id } = await params;
  const s = await getSettings();
  const c = await getContent(s.line_access_token, id);
  if (!c) return new Response("画像の保存期間が過ぎたか、見つかりません", { status: 404 });
  return new Response(new Uint8Array(c.data), { headers: { "Content-Type": c.type, "Cache-Control": "private, no-store" } });
}
