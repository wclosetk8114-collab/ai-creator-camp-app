"use client";
import { useState } from "react";
import Shell from "../Shell";

export default function Login() {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  async function post(url: string, body: object) {
    setBusy(true);
    setMsg("");
    try {
      const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      return (await r.json()) as { ok: boolean; message?: string };
    } catch {
      return { ok: false, message: "通信できませんでした" };
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <h1>マイページにログイン</h1>
      {step === "email" ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await post("/api/auth/request", { email });
            if (r.ok) setStep("code");
            else setMsg(r.message || "うまくいきませんでした");
          }}
        >
          <p className="lead">申し込みに使ったメールアドレスを入れてください。ログインコードを送ります。</p>
          <label htmlFor="email">メールアドレス</label>
          <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          {msg && <div className="err">{msg}</div>}
          <button className="btn block" disabled={busy} style={{ marginTop: 16 }}>{busy ? "送っています…" : "ログインコードを送る"}</button>
        </form>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const r = await post("/api/auth/verify", { email, code });
            if (r.ok) location.href = "/me";
            else setMsg(r.message || "うまくいきませんでした");
          }}
        >
          <p className="lead">{email} に6けたのコードを送りました（会員登録があるアドレスの場合）。</p>
          <label htmlFor="code">ログインコード</label>
          <input id="code" type="text" inputMode="numeric" autoComplete="one-time-code" required maxLength={6} value={code} onChange={(e) => setCode(e.target.value)} />
          {msg && <div className="err">{msg}</div>}
          <button className="btn block" disabled={busy} style={{ marginTop: 16 }}>{busy ? "確認しています…" : "ログイン"}</button>
          <p className="muted" style={{ marginTop: 12 }}>
            届かないときは迷惑メールフォルダを確認するか、<a href="#" onClick={(e) => { e.preventDefault(); setStep("email"); setCode(""); }}>もう一度送る</a>。
          </p>
        </form>
      )}
    </Shell>
  );
}
