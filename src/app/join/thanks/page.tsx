import Link from "next/link";
import Shell from "../../Shell";

export default function Thanks() {
  return (
    <Shell>
      <h1>お申し込み、ありがとうございます。</h1>
      <p className="lead">確認のメールをお送りしました。次の3つで、はじめられます。</p>
      <div className="card">
        <h3>1. マイページにログイン</h3>
        <p>メールアドレスを入れると、ログインコードが届きます。</p>
        <Link href="/login" className="btn">ログインする</Link>
      </div>
      <div className="card">
        <h3>2. 公式LINEとつなぐ</h3>
        <p>マイページに出る「6けたの連携コード」を公式LINEに送るだけ。課題の提出も相談も、ここからできます。</p>
      </div>
      <div className="card">
        <h3>3. ツールを受け取る</h3>
        <p>マイページから、ツール一式と手順書を受け取れます。</p>
      </div>
      <p className="muted">メールが届かないときは、迷惑メールフォルダも確認してください。</p>
    </Shell>
  );
}
