import Link from "next/link";
import Shell from "../Shell";
import JoinForm from "./JoinForm";

export const dynamic = "force-dynamic";

export default async function Join({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  return (
    <Shell right={<Link href="/login" className="btn small ghost">ログイン</Link>}>
      <h1>申し込み</h1>
      <p className="lead">プランを選んで、決済に進みます。金額はすべて税込です。</p>
      {sp.error && <div className="err">{sp.error}</div>}
      <JoinForm initialPlan={sp.plan} initialStudent={sp.student === "1" || sp.plan === "student"} initialRef={sp.ref || ""} />
    </Shell>
  );
}
