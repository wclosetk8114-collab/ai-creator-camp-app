import Link from "next/link";

const LP = "https://ai-creator-camp-theta.vercel.app";

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
          <a href={`${LP}/terms.html`}>利用規約</a>
          <a href={`${LP}/tokushoho.html`}>特定商取引法に基づく表記</a>
          <a href={`${LP}/privacy.html`}>プライバシーポリシー</a>
          <div>© AI Creator Camp</div>
        </footer>
      </div>
    </>
  );
}
