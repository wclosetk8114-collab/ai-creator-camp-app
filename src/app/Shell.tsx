import Link from "next/link";

export default function Shell({ children, right }: { children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <>
      <div className="rainbow-bar" />
      <div className="wrap">
        <header className="site-head">
          <Link href="/" className="brand">
            <img src="/mark.png" alt="" />
            <span>CREATOR CAMP</span>
          </Link>
          <div>{right}</div>
        </header>
        <main>{children}</main>
        <footer className="site-foot">
          <Link href="/terms">利用規約</Link>
          <Link href="/tokushoho">特定商取引法に基づく表記</Link>
          <Link href="/privacy">プライバシーポリシー</Link>
          <div>© 2026 AI Creator Camp　お問い合わせ：ai.creator.camp2026@gmail.com</div>
        </footer>
      </div>
    </>
  );
}
