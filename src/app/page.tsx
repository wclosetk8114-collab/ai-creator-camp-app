import Link from "next/link";
import Shell from "./Shell";

export const metadata = {
  title: "AI Creator Camp｜90日で、AIで事業をつくって、稼げる人材になる",
  description:
    "ツール一式＋90日のスクール。課題の提出も相談も公式LINEで完結、24時間AIが返します。ツールのみ30,000円／スクールつき3ヶ月50,000円から。修了後は月3,980円の専門コース。",
  openGraph: {
    title: "AI Creator Camp｜90日で、AIで事業をつくって、稼げる人材になる",
    description: "ツール一式＋90日のスクール。提出も相談も公式LINEで。ツールのみ30,000円／スクールつき3ヶ月50,000円から。",
    images: ["/ogp.png"],
  },
  robots: { index: true },
};

const MONTHS = [
  {
    m: "MONTH 1", d: "DAY 1 — 30", t: "AIで、なんでも作れるようになる",
    s: ["Webページをつくる", "文章と資料をつくる", "画像・動画・声をつくる", "アプリをつくる"],
  },
  {
    m: "MONTH 2", d: "DAY 31 — 60", t: "自分のビジネスと、要るものをそろえる",
    s: ["事業を1つに決める", "サービスを設計する", "ブランドをつくる（名前・ロゴ・SNS）", "仕事に使うアプリをつくる"],
  },
  {
    m: "MONTH 3", d: "DAY 61 — 90", t: "売れる形にして、世に出す",
    s: ["LPと申し込みの入口をつくる", "発信を始める", "最初のお客さん", "90日の発表"],
  },
];

const CASES = [
  { who: "起業家", before: "企画は10個あるのに、人手も外注費も足りない。出せるのは年に1つか2つ。", after: "思いついた企画を、その週のうちに形にして出せる。外注していた制作が手元に戻る。" },
  { who: "フリーランス", before: "手を動かした時間の分しか売上にならない。受注が途切れたら、その月はゼロ。", after: "得意を小さなツールや型にして、時間ではなく「形」で売れるようになる。" },
  { who: "主婦", before: "まとまった時間は1日30分。ブランクが長くなるほど戻りにくい。", after: "子どもが寝たあとの時間だけで、動くものが1つできる。リンクを「見せる」側になる。" },
  { who: "大学生", before: "ガクチカはバイトとサークル。ポートフォリオは白紙。", after: "「これ、作りました」と画面で見せられる。学生は全部半額。" },
  { who: "事務の人", before: "転記と集計と問い合わせで1日が終わる。", after: "その作業がボタンひとつで終わる。社内で「AIならあの人」になる。" },
];

const FAQ = [
  ["AIを触ったことがなくても大丈夫？", "大丈夫です。Month1が道具に慣れる月です。わからないことは、公式LINEでいつでもAIに聞けます。"],
  ["週にどのくらい時間が必要？", "5〜8時間が目安です。働きながら続けられる量にしてあります。"],
  ["審査って誰がするの？", "提出するとAIがすぐ審査します。合格基準は課題ごとに決まっていて、足りないところは具体的に返ってきます。何回でも出し直せます。判定に納得できないときは「スタッフ」と送れば、運営が確認します。"],
  ["「分割」と「月額」は何がちがう？", "中身は同じです。分割は初回にツール代3万円、2・3ヶ月目に月1万円（合計5万円）。月額は初回にツール代＋1ヶ月目で5万円、2・3ヶ月目に月2万円（合計9万円）です。"],
  ["3ヶ月が終わったら？", "4ヶ月目から自動で月3,980円の専門コースに切り替わります。動画・画像／アプリ・ツール開発／業務自動化・DX／ゲーム・漫画・アートから1つ選んで伸ばします。続けない場合は、マイページからいつでも解約できます。"],
  ["90日で稼げるようになる？", "収入は保証しません。90日でそろうのは「売れる形のもの」と「値段」と「入口」までです。そこから先は、売りに行く時間が別に必要です。"],
  ["ツールだけ買うこともできる？", "できます（30,000円・買い切り）。プラグインを入れるところまで、公式LINEで1ステップずつ案内します。あとからスクールに入る場合は50,000円（一括、または月25,000円×2回。学生は半額）です。最初からセットで入るほうがお得です。"],
  ["学割は誰が使える？", "高校生・大学生（大学院・専門学校・高専を含む）です。すべて半額。申し込み後に公式LINEで学生証の写真を送ってください。"],
  ["途中でやめられる？", "スクール代のお支払いが残っている期間も、マイページから解約できます。次の更新日の前日までに手続きすれば、それ以降は請求されません。日割りの返金はありません。ツール代は返金できません。"],
  ["必要なものは？", "スマホかPCと、LINE。ツールを使うには、Claudeの有料プランと各種生成サービスの実費が別にかかります。"],
];

export default function Home() {
  return (
    <Shell right={<Link href="/login" className="btn small ghost">ログイン</Link>}>
      {/* HERO */}
      <section className="lp-hero">
        <img src="/logo.png" alt="AI Creator Camp" className="lp-logo" />
        <h1 className="lp-h1">AIで、事業をつくる。<br />90日で、稼げる人材へ。</h1>
        <p className="lead">
          ツールを渡して終わり、にはしません。90日で自分の事業をひとつ立ち上げます。
          課題の提出も、相談も、ぜんぶ公式LINEで。AIが24時間すぐ返します。
        </p>
        <div className="row lp-center">
          <a href="#price" className="btn">料金を見る</a>
          <a href="#map" className="btn ghost">90日の中身</a>
        </div>
        <p className="muted lp-center">ツールのみ 30,000円 ／ スクールつき 3ヶ月 50,000円から（税込）</p>
      </section>

      {/* しくみ */}
      <section className="lp-sec">
        <p className="lp-label">HOW IT WORKS</p>
        <h2>ぜんぶ、公式LINEで回ります。</h2>
        <div className="lp-grid">
          <div className="card"><span className="lp-num">01</span><h3>課題が届く</h3><p className="muted">いまのステージの課題がLINEに届きます。何を出せば合格かも書いてあります。</p></div>
          <div className="card"><span className="lp-num">02</span><h3>LINEで提出</h3><p className="muted">「提出」と送って、文章・URL・画像を送るだけ。</p></div>
          <div className="card"><span className="lp-num">03</span><h3>AIがすぐ審査</h3><p className="muted">合格なら、その場で次のステージへ。足りなければ、何が足りないかが返ってきます。</p></div>
          <div className="card"><span className="lp-num">04</span><h3>24時間、相談できる</h3><p className="muted">詰まったら、そのままLINEで質問。夜中でもAIが返します。人と話したいときは「スタッフ」。</p></div>
          <div className="card"><span className="lp-num">05</span><h3>月1回、リアルで会う</h3><p className="muted">相談会と交流会を毎月1回。前日にLINEでお知らせが届きます。</p></div>
          <div className="card"><span className="lp-num">06</span><h3>ツール導入もLINEで</h3><p className="muted">購入したあと、プラグインを入れるところまで1ステップずつ案内。詰まったらスクショを送るだけ。</p></div>
          <div className="card"><span className="lp-num">07</span><h3>マイページで一元管理</h3><p className="muted">ツールの受け取り、進み具合、支払いまで。メールアドレスだけでログインできます。</p></div>
        </div>
      </section>

      {/* 90日の地図 */}
      <section className="lp-sec" id="map">
        <p className="lp-label">90 DAYS MAP</p>
        <h2>12のステージを、1つずつ通っていく。</h2>
        <p className="lead">課題を出して合格すると、次のステージが開きます。やることは全部決まっているので、「次は何をすれば？」と迷う時間がありません。</p>
        {MONTHS.map((mo) => (
          <div key={mo.m} className="card grad-border">
            <div className="row"><span className="pill">{mo.m}</span><span className="muted">{mo.d}</span></div>
            <h3 style={{ marginTop: 8 }}>{mo.t}</h3>
            <ol className="lp-stages">{mo.s.map((x) => <li key={x}>{x}</li>)}</ol>
          </div>
        ))}
      </section>

      {/* 1週間 */}
      <section className="lp-sec">
        <p className="lp-label">ONE WEEK</p>
        <h2>週にだいたい5〜8時間。</h2>
        <p className="lead">働きながらでも続けられる量です。1週間の流れは決まっていて、LINEが毎週声をかけてくれます。</p>
        <div className="lp-grid">
          <div className="card"><span className="lp-num">月</span><h3>課題が届く</h3><p className="muted">今週の課題がLINEに届きます。「いまの課題」でいつでも見返せます。</p></div>
          <div className="card"><span className="lp-num">火〜木</span><h3>手を動かす</h3><p className="muted">ツールに話しかけて作る。詰まったらLINEでAIに相談（スクショでもOK）。</p></div>
          <div className="card"><span className="lp-num">金</span><h3>途中を見せる</h3><p className="muted">途中のものをAIに見せて、足りないところを聞きます。</p></div>
          <div className="card"><span className="lp-num">土日</span><h3>提出する</h3><p className="muted">「提出」→ 送る →「以上」。合格なら次のステージが届きます。</p></div>
        </div>
      </section>

      {/* 持ち帰るもの */}
      <section className="lp-sec">
        <p className="lp-label">WHAT YOU GET</p>
        <h2>90日後、手元に残るもの。</h2>
        <div className="lp-grid">
          {[
            ["開発ツール一式", "Claudeに差し込むプラグイン＋手順書。動画・画像・ナレーション・LP・アプリ・資料が、話しかけるだけで作れます。"],
            ["なんでも作れる手", "Webページ・資料・画像・動画・声・アプリ。Month1で、ひと通り自分で作れるようになります。"],
            ["自分のビジネス一式", "事業・サービス設計・名前とロゴ・SNS・仕事に使うアプリまで、Month2でそろえます。"],
            ["LPと申し込みの入口", "お客さんが申し込める状態で、世に出します。"],
            ["発信と、最初の反応", "7日間の発信と、3人以上への案内の記録。"],
            ["仲間", "月1回のリアルの場で、同じ90日を走る人と会えます。"],
          ].map(([t, d]) => (
            <div className="card" key={t}><h3>{t}</h3><p className="muted">{d}</p></div>
          ))}
        </div>
      </section>

      {/* こう変わる */}
      <section className="lp-sec">
        <p className="lp-label">BEFORE → AFTER</p>
        <h2>AIが使えるだけの人は、もう増えすぎました。</h2>
        <p className="lead">お金になるのは、その先です。AIで何かを作って、それを誰かに届ける。この一連ができる人が、稼げる人になります。</p>
        {CASES.map((c) => (
          <div className="card" key={c.who}>
            <h3>{c.who}</h3>
            <div className="lp-ba">
              <div><span className="pill">BEFORE</span><p className="muted">{c.before}</p></div>
              <div><span className="pill ok">AFTER</span><p>{c.after}</p></div>
            </div>
          </div>
        ))}
        <p className="muted">ここに書いたのは例です。収入が出ることを保証するものではありません。</p>
      </section>

      {/* 合う・合わない */}
      <section className="lp-sec">
        <p className="lp-label">FIT</p>
        <h2>向いてない人にも、正直に言っておきます。</h2>
        <div className="lp-ba">
          <div className="card">
            <h3>○ 合う人</h3>
            <ul><li>3ヶ月、週に5〜8時間は出せる</li><li>自分の事業を持ちたい</li><li>締切と合否があったほうが動ける</li><li>粗くても、まず完成させられる</li><li>AIは初めてでもいい</li></ul>
          </div>
          <div className="card">
            <h3>× 合わない人</h3>
            <ul><li>情報だけ集めたい</li><li>今月中に副収入がほしい</li><li>完成より完璧を取りたい</li><li>人に相談せず、ひとりで抱えたい</li></ul>
          </div>
        </div>
      </section>

      {/* 料金 */}
      <section className="lp-sec" id="price">
        <p className="lp-label">PRICE</p>
        <h2>料金</h2>
        <p className="lead">すべて税込。入会金なし。高校生・大学生はすべて半額です。</p>
        <div className="lp-grid">
          <div className="card grad-border">
            <span className="pill">いちばん人気</span>
            <h3 style={{ marginTop: 8 }}>スクールつき・分割</h3>
            <div className="lp-price">30,000<small>円 初回（ツール代）</small></div>
            <p>＋ 2・3ヶ月目に 月10,000円</p>
            <p className="muted">3ヶ月の合計 50,000円<br />4ヶ月目から 月3,980円の専門コース</p>
            <Link href="/join?plan=school_a" className="btn block">このプランで申し込む</Link>
          </div>
          <div className="card">
            <h3>スクールつき・月額</h3>
            <div className="lp-price">50,000<small>円 初回（ツール代＋1ヶ月目）</small></div>
            <p>＋ 2・3ヶ月目に 月20,000円</p>
            <p className="muted">3ヶ月の合計 90,000円<br />4ヶ月目から 月3,980円の専門コース</p>
            <Link href="/join?plan=school_b" className="btn ghost block">このプランで申し込む</Link>
          </div>
          <div className="card">
            <h3>ツールのみ</h3>
            <div className="lp-price">30,000<small>円 買い切り</small></div>
            <p className="muted">開発ツール一式＋手順書。プラグインを入れるところまで、公式LINEで1ステップずつ案内します。スクールはつきません。<br />あとからスクールに入る場合：50,000円（一括 または 月25,000円×2回）</p>
            <Link href="/join?plan=tool" className="btn ghost block">ツールだけ買う</Link>
          </div>
        </div>
        <div className="card soft">
          <h3>スクールつきに入っているもの</h3>
          <ul>
            <li>開発ツール一式（Claudeに差し込むプラグイン＋手順書）</li>
            <li>90日・12ステージのカリキュラムと、AIの即時審査</li>
            <li>公式LINEで24時間、AIに相談し放題</li>
            <li>月1回のリアル相談会・交流会</li>
            <li>マイページ（進み具合・提出の記録・支払い管理）</li>
          </ul>
          <p className="muted" style={{ margin: 0 }}>学生価格：ツールのみ 15,000円／分割 初回15,000円＋月5,000円×2／月額 初回25,000円＋月10,000円×2／あとからスクール 25,000円（月12,500円×2回も可）／専門コース 月1,990円</p>
        </div>
        <p className="muted">ツールの利用には、Claudeの有料プランと各種生成サービスの実費が別にかかります。決済はStripeです。カード情報は当方では保持しません。</p>
      </section>

      {/* 3ヶ月のあと */}
      <section className="lp-sec">
        <p className="lp-label">AFTER 90 DAYS</p>
        <h2>4ヶ月目からは、月3,980円で専門を伸ばす。</h2>
        <p className="lead">スクール代のお支払いが終わると、自動で専門コースに切り替わります。分野は4つ。好きなときに変えられます。</p>
        <div className="lp-grid">
          {[
            ["動画・画像", "AIでの動画制作、画像生成、短尺コンテンツ。"],
            ["アプリ・ツール開発", "Webアプリ、LP、業務ツールを作って公開まで。"],
            ["業務自動化・DX", "事務・問い合わせなど、会社の作業を自動で回す。"],
            ["ゲーム・漫画・アート", "作品としての表現を、AIで形にする。"],
          ].map(([t, d]) => (
            <div className="card" key={t}><h3>{t}</h3><p className="muted">{d}</p></div>
          ))}
        </div>
        <p className="muted">運営や修了生の案件に参加できる枠もあります。案件の数と時期は保証できません。</p>
      </section>

      {/* 流れ */}
      <section className="lp-sec">
        <p className="lp-label">FLOW</p>
        <h2>申し込んだ日から、始められます。</h2>
        <div className="lp-grid">
          <div className="card"><span className="lp-num">STEP 1</span><h3>申し込む</h3><p className="muted">プランを選んで、カードで決済。2分ほどです。</p></div>
          <div className="card"><span className="lp-num">STEP 2</span><h3>マイページに入る</h3><p className="muted">メールアドレスを入れると、ログインコードが届きます。ツールもここで受け取れます。</p></div>
          <div className="card"><span className="lp-num">STEP 3</span><h3>LINEとつなぐ</h3><p className="muted">マイページの6けたのコードを、公式LINEに送るだけ。最初の課題が届きます。</p></div>
        </div>
      </section>

      {/* FAQ */}
      <section className="lp-sec">
        <p className="lp-label">FAQ</p>
        <h2>よくある質問</h2>
        {FAQ.map(([q, a]) => (
          <details key={q} className="card lp-faq">
            <summary>{q}</summary>
            <p className="muted" style={{ marginTop: 8, marginBottom: 0 }}>{a}</p>
          </details>
        ))}
      </section>

      {/* CLOSING */}
      <section className="lp-sec lp-center">
        <h2>つくれる人から、稼げる人へ。</h2>
        <p className="lead">90日後、売れる形のものが手元に残ります。そこから先は、自分で決められます。</p>
        <Link href="/join" className="btn">申し込む</Link>
        <p className="muted" style={{ marginTop: 10 }}>すでに申し込んだ方は <Link href="/login">マイページにログイン</Link></p>
      </section>
    </Shell>
  );
}
