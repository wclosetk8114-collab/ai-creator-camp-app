import { adminLogin } from "../admin/actions";

export default async function AdminLogin({ searchParams }: { searchParams: Promise<{ e?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="wrap" style={{ maxWidth: 420, paddingTop: 80 }}>
      <h1>管理画面</h1>
      <form action={adminLogin}>
        <label htmlFor="pw">パスワード</label>
        <input id="pw" type="password" name="password" required autoFocus />
        {sp.e && <div className="err">パスワードがちがいます</div>}
        <button className="btn block" style={{ marginTop: 14 }}>ログイン</button>
      </form>
    </div>
  );
}
