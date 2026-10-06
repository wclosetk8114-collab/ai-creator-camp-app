"use client";
import { useState } from "react";

export default function SubmitBox() {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<{ ok: boolean; verdict?: string | null; message?: string } | null>(null);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setRes(null);
        try {
          const r = await fetch("/api/me/submit", { method: "POST", body: new FormData(e.currentTarget) });
          const j = await r.json();
          setRes(j);
          if (j.verdict === "pass") setTimeout(() => location.reload(), 2500);
        } catch {
          setRes({ ok: false, message: "送れませんでした。時間をおいてお試しください" });
        } finally {
          setBusy(false);
        }
      }}
    >
      <label htmlFor="content">提出する内容（文章・URL）</label>
      <textarea id="content" name="content" placeholder="URLや、やったこと・分かったことを書いてください" />
      <label htmlFor="images">画像（3枚まで・任意）</label>
      <input id="images" type="file" name="images" accept="image/*" multiple />
      <button className="btn block" disabled={busy} style={{ marginTop: 12 }}>{busy ? "AIが審査しています…（10〜30秒）" : "提出する"}</button>
      {res && (
        <div className={res.verdict === "pass" ? "okbox" : res.ok ? "warnbox" : "err"}>{res.message}</div>
      )}
    </form>
  );
}
