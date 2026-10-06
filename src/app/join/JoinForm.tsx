"use client";
import { useState } from "react";

const LP = "https://ai-creator-camp-theta.vercel.app";
const f = (n: number) => n.toLocaleString("ja-JP");

export default function JoinForm({ initialPlan, initialStudent, initialRef }: { initialPlan?: string; initialStudent: boolean; initialRef: string }) {
  const [plan, setPlan] = useState(["tool", "school_a", "school_b"].includes(initialPlan || "") ? initialPlan! : "school_a");
  const [student, setStudent] = useState(initialStudent);
  const [busy, setBusy] = useState(false);
  const k = student ? 0.5 : 1;
  const cont = 3980 * k;

  return (
    <form method="post" action="/api/checkout" onSubmit={() => setBusy(true)}>
      <div className="plans">
        <label className="plan">
          <input type="radio" name="plan" value="school_a" checked={plan === "school_a"} onChange={() => setPlan("school_a")} />
          <span className="pill">いちばん人気</span>
          <h3 style={{ marginTop: 6 }}>スクールつき・分割</h3>
          <div className="price">{f(30000 * k)}円 <small>初回（ツール代）</small></div>
          <div>＋ 2・3ヶ月目に 月{f(10000 * k)}円（スクール代）</div>
          <div className="muted">3ヶ月の合計 {f(50000 * k)}円 ／ 4ヶ月目から 月{f(cont)}円の専門コース</div>
          <ul>
            <li>開発ツール一式（Claudeに差し込むプラグイン＋手順書）</li>
            <li>90日のカリキュラム（12ステージ）とAI審査</li>
            <li>公式LINEで24時間AIに相談</li>
            <li>月1回のリアル相談会・交流会</li>
          </ul>
        </label>
        <label className="plan">
          <input type="radio" name="plan" value="school_b" checked={plan === "school_b"} onChange={() => setPlan("school_b")} />
          <h3>スクールつき・月額</h3>
          <div className="price">{f(50000 * k)}円 <small>初回（ツール代＋1ヶ月目）</small></div>
          <div>＋ 2・3ヶ月目に 月{f(20000 * k)}円（スクール代）</div>
          <div className="muted">3ヶ月の合計 {f(90000 * k)}円 ／ 4ヶ月目から 月{f(cont)}円の専門コース</div>
          <ul><li>内容は「分割」と同じです</li></ul>
        </label>
        <label className="plan">
          <input type="radio" name="plan" value="tool" checked={plan === "tool"} onChange={() => setPlan("tool")} />
          <h3>ツールのみ</h3>
          <div className="price">{f(30000 * k)}円 <small>買い切り</small></div>
          <ul>
            <li>開発ツール一式（Claudeに差し込むプラグイン＋手順書）</li>
            <li>ツールの使い方は公式LINEでAIに相談できます</li>
            <li>スクール（課題・審査・交流会）はつきません</li>
          </ul>
        </label>
      </div>

      <label className="check" style={{ marginTop: 18 }}>
        <input type="checkbox" name="student" value="1" checked={student} onChange={(e) => setStudent(e.target.checked)} />
        <span>高校生・大学生です（すべて半額。申し込み後に公式LINEで学生証を送ってください）</span>
      </label>

      <label htmlFor="name">お名前</label>
      <input id="name" type="text" name="name" required maxLength={80} placeholder="土屋 千穂" />
      <label htmlFor="email">メールアドレス（ログインに使います）</label>
      <input id="email" type="email" name="email" required placeholder="you@example.com" />
      <label htmlFor="ref">紹介者（いれば）</label>
      <input id="ref" type="text" name="ref" defaultValue={initialRef} maxLength={80} />

      <div className="card soft" style={{ marginTop: 18 }}>
        <p className="muted" style={{ margin: 0 }}>
          ・スクールつきは、4ヶ月目から自動で月{f(cont)}円の専門コースに切り替わります。マイページからいつでも解約できます。<br />
          ・成果や収入を約束するものではありません。<br />
          ・ツールの利用には、Claudeの有料プランと各種生成サービスの実費が別にかかります。
        </p>
      </div>
      <label className="check">
        <input type="checkbox" name="agree" value="1" required />
        <span><a href={`${LP}/terms.html`} target="_blank">利用規約</a>と<a href={`${LP}/tokushoho.html`} target="_blank">特定商取引法に基づく表記</a>を読んで、同意します</span>
      </label>
      <button className="btn block" disabled={busy} style={{ marginTop: 16 }}>
        {busy ? "決済ページを開いています…" : "決済に進む"}
      </button>
    </form>
  );
}
