import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/session";
import { adminLogout } from "./actions";
import "./admin.css";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAdmin())) redirect("/admin-login");
  return (
    <div className="adm">
      <nav className="adm-side">
        <div className="logo">CREATOR CAMP<small>運営の管理画面</small></div>
        <Link href="/admin">ダッシュボード</Link>
        <Link href="/admin/members">会員</Link>
        <Link href="/admin/submissions">提出・審査</Link>
        <Link href="/admin/curriculum">カリキュラム</Link>
        <Link href="/admin/events">交流会</Link>
        <Link href="/admin/settings">設定</Link>
        <form action={adminLogout}><button>ログアウト</button></form>
      </nav>
      <section className="adm-main">{children}</section>
    </div>
  );
}
