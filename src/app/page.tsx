import Link from "next/link";
import Shell from "./Shell";

export default function Home() {
  return (
    <Shell right={<Link href="/login" className="btn small ghost">ログイン</Link>}>
      <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
        <img src="/logo.png" alt="AI Creator Camp" style={{ width: 220 }} />
      </div>
      <h1 style={{ textAlign: "center" }}>ツールも、スクールも、相談も。<br />ぜんぶ、ここと公式LINEで。</h1>
      <p className="lead" style={{ textAlign: "center" }}>
        課題を出して合格すると、次のステージへ。<br />提出も相談も公式LINEで、24時間AIが返します。
      </p>
      <div className="card soft">
        <h3>流れ</h3>
        <ol style={{ margin: 0, paddingLeft: "1.2em" }}>
          <li>プランを選んで申し込む（ツールのみ／スクールつき）</li>
          <li>メールアドレスでマイページにログイン</li>
          <li>公式LINEとつなぐ（6けたのコードを送るだけ）</li>
          <li>LINEで課題を提出 → AIが審査 → 合格で次のステージへ</li>
          <li>月1回、リアルの相談会・交流会</li>
          <li>90日のあとは、月3,980円の専門コースへ</li>
        </ol>
      </div>
      <div className="row" style={{ justifyContent: "center", marginTop: 20 }}>
        <Link href="/join" className="btn">申し込む</Link>
        <Link href="/login" className="btn ghost">マイページにログイン</Link>
      </div>
    </Shell>
  );
}
