// src/pages/Manual.tsx
import { useState } from 'react';

// ── 型定義 ──────────────────────────────────────────
type NavItem = { id: string; emoji: string; label: string };
type StepItem = { num: string | number; title: React.ReactNode; desc: React.ReactNode };
type TechRow = { layer: string; tech: string; role: string };
type FaqRow = { q: string; a: string };

// ── データ定義 ──────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
    { id: 'overview', emoji: '🏠', label: 'アプリ概要' },
    { id: 'firstsetup', emoji: '🚀', label: 'はじめに（初期設定）' },
    { id: 'tech', emoji: '🛠️', label: '技術スタック' },
    { id: 'analyze', emoji: '📸', label: 'レシート解析' },
    { id: 'dashboard', emoji: '📈', label: '売上・製造集計' },
    { id: 'customers', emoji: '👥', label: '顧客管理' },
    { id: 'reservation', emoji: '🥐', label: '予約注文' },
    { id: 'master', emoji: '📖', label: '製品マスタ管理' },
    { id: 'production', emoji: '👨‍🍳', label: '製造実績・チャット' },
    { id: 'flow', emoji: '🔄', label: '業務フロー全体図' },
    { id: 'tips', emoji: '💡', label: 'よくある質問' },
];

const FEATURES = [
    { emoji: '📸', title: 'AIレシート解析', desc: 'Geminiが商品名と金額を自動読み取り。長い日計表にも対応し、点数から自動で計算・修復します。' },
    { emoji: '📈', title: '自動集計ダッシュボード', desc: '売上ランキングの可視化や、店舗用・施設買上用の月報（PDF・Excel）を自動生成します。' },
    { emoji: '👨‍🍳', title: '製造・ロス自動計算', desc: '厨房で製造実績を入力すると、「製造数 − ショップ販売数 ＝ 施設買上」としてロスなく自動計算されます。' },
    { emoji: '👥', title: '顧客管理', desc: '会員登録や購買履歴の管理、検索結果からA4・21面シールの宛名ラベルをワンクリックで印刷できます。' },
    { emoji: '🥐', title: '予約注文', desc: 'マスタと連動し、直感的に商品を選んで予約を受付。非会員（ゲスト）でも名前だけで登録可能です。' },
    { emoji: '📖', title: 'マスタ一括管理', desc: '商品名・単価・カテゴリ・製造予定数を管理。CSVでの一括インポート機能にも対応しています。' },
];

const TECH_ROWS: TechRow[] = [
    { layer: 'フロントエンド', tech: 'React / TypeScript / Vite', role: '高速なSPA（シングルページアプリ）を構築。型安全な開発で品質を担保。' },
    { layer: 'データベース', tech: 'Supabase（PostgreSQL）', role: '顧客・商品・予約・チャットなど全データをクラウドで安全に管理。' },
    { layer: 'OCR / AI解析', tech: 'Google Gemini 1.5 Pro', role: 'レシートや日計表の画像から文字と数値を読み取り。Supabase Edge Functionsを経由して安全に呼び出す。' },
    { layer: 'マスタ補正ロジック', tech: '独自アルゴリズム', role: 'AIの解析結果とマスタの「レシート印字名」を照合し、かすれや誤読を「正しい単価・商品名・カテゴリ」に自動補正。' },
    { layer: 'スマホ転送', tech: 'QRコード + Supabase Realtime', role: 'PCに表示されたQRをスマホで読み取り撮影。画像がBase64でリアルタイムにPCへ転送される。' },
];

// ── よくある質問 ──
const FAQ_ROWS: FaqRow[] = [
    {
        q: '商品が読み取れなかった / 解析に失敗する',
        a: 'マスタ管理に「レシート印字名」が正しく登録されているか確認してください。また、日計表を撮影する場合は、周りにメニュー表などの関係ない文字が写り込まないよう接写してください。照明が暗い場合はスマホのフラッシュを使うと精度が上がります。',
    },
    {
        q: '同じ商品が重複して表示される',
        a: '解析ボタンを押すたびに自動で合算されます。もし重複が起きた場合は「🗑️ クリア」ボタンを押してリセットしてから再度やり直してください。',
    },
    {
        q: '施設買上（卸売）の入力画面がない',
        a: 'システムが全自動化されました。厨房で入力した「ショップ用製造数」から、レジの「ショップ販売数」を引いた残りが、すべて自動的に施設買上として計算されます。ダッシュボードの「施設買上」タブで確認できます。',
    },
    {
        q: 'スマホ転送がうまくいかない',
        a: 'PCとスマホが同じWi-Fiに接続されているか確認してください。また、スマホのブラウザでカメラ使用を「許可」する必要があります。Safari / Chrome の設定＞プライバシー＞カメラからアクセスを許可してください。',
    },
    {
        q: 'CSVインポートで文字化けする',
        a: 'Shift-JISやUTF-8などの文字コードはシステムが自動判定するため、Excelから保存したCSVファイルをそのまま読み込ませて大丈夫です。どうしても文字化けする場合はExcelで「名前を付けて保存」→「CSV UTF-8（コンマ区切り）」を選んで保存してください。',
    },
    {
        q: '印刷やPDF保存のレイアウトが崩れる',
        a: 'ブラウザの印刷設定で「レイアウト」を横（ランドスケープ）、「余白」をなし（ゼロ）に設定してください。「ヘッダーとフッター」のチェックも外すときれいに仕上がります。Chrome推奨です。',
    },
    {
        q: '予約の受渡日時を間違えた',
        a: '一覧の予約カードをクリックすると編集モードになります。受渡日・時刻・商品数量を修正して「更新する」を押してください。「完了」済みの予約は編集できないため、いったんステータスを「未完了」に戻してから再編集してください。',
    },
    {
        q: '顧客の購買履歴が増えない',
        a: 'レシート解析後に「⭐ 購買履歴として記録」ボタンを押して顧客を選択する手順が必要です。解析・保存だけでは顧客履歴には自動連携されません。',
    },
];

// ── 共通コンポーネント ─────────────────────────────

function Badge({ children }: { children: React.ReactNode }) {
    return (
        <span className="inline-block bg-bakery-gold text-bakery-textMain text-[0.7rem] font-bold px-2 py-0.5 rounded tracking-wider align-middle ml-1">
            {children}
        </span>
    );
}

function SectionHeader({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
    return (
        <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-[#D6C4A8]">
            <span className="text-3xl leading-none">{emoji}</span>
            <div>
                <div className="font-playfair text-2xl font-bold text-bakery-textMain">{title}</div>
                <div className="text-xs text-[#7B5C3A] tracking-widest mt-1">{sub}</div>
            </div>
        </div>
    );
}

function Callout({ icon, children, type = 'info' }: { icon: string; children: React.ReactNode; type?: 'info' | 'warn' | 'success' }) {
    const styles = {
        info: 'bg-[#FFF8E7] border-bakery-gold text-bakery-primary',
        warn: 'bg-[#FFF0E0] border-orange-400 text-orange-900',
        success: 'bg-[#F0FBF4] border-green-500 text-green-900',
    };
    return (
        <div className={`border border-l-4 rounded-lg px-4 py-3 my-5 text-sm leading-relaxed break-inside-avoid ${styles[type]}`}>
            <span className="mr-1.5">{icon}</span>{children}
        </div>
    );
}

function Steps({ items }: { items: StepItem[] }) {
    return (
        <div className="flex flex-col gap-4">
            {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[40px_1fr] gap-4 items-start bg-[#FFF8EE] border border-[#D6C4A8] rounded-xl p-4 break-inside-avoid">
                    <div className="w-10 h-10 bg-bakery-textMain text-bakery-gold rounded-full flex items-center justify-center font-playfair font-bold shrink-0 text-sm">
                        {item.num}
                    </div>
                    <div>
                        <div className="font-bold text-bakery-textMain mb-1 text-sm">{item.title}</div>
                        <div className="text-xs text-[#7B5C3A] leading-relaxed">{item.desc}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function SubHeading({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-sm text-bakery-textMain my-4 font-bold break-after-avoid border-l-4 border-bakery-gold pl-3 py-0.5">
            {children}
        </h3>
    );
}

function ManualTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
    return (
        <div className="overflow-x-auto my-4 break-inside-avoid">
            <table className="w-full border-collapse text-sm">
                <thead>
                    <tr>
                        {headers.map((h, i) => (
                            <th key={i} className="bg-bakery-textMain text-bakery-gold px-4 py-2 text-left font-bold tracking-wider">{h}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, ri) => (
                        <tr key={ri} className={ri % 2 === 1 ? 'bg-[#FFF8EE]' : 'bg-white'}>
                            {row.map((cell, ci) => (
                                <td key={ci} className={`px-4 py-3 border-b border-[#D6C4A8] align-top ${ci === 0 ? 'text-bakery-textMain font-bold' : 'text-[#7B5C3A]'}`}>
                                    {cell}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function FlowDiagram({ nodes }: { nodes: string[] }) {
    return (
        <div className="flex items-center flex-wrap gap-2 my-4 break-inside-avoid">
            {nodes.map((n, i) =>
                n === '→'
                    ? <span key={i} className="text-bakery-gold text-lg">→</span>
                    : <div key={i} className="bg-bakery-textMain text-bakery-border rounded-lg px-3 py-1.5 text-xs font-bold whitespace-nowrap">{n}</div>
            )}
        </div>
    );
}

/** スクリーンショット風の操作説明ボックス */
function ScreenNote({ label, children }: { label: string; children: React.ReactNode }) {
    return (
        <div className="bg-white border border-[#D6C4A8] rounded-xl overflow-hidden my-3 break-inside-avoid shadow-sm">
            <div className="bg-bakery-textMain text-bakery-gold text-xs font-bold px-4 py-1.5 tracking-wider">{label}</div>
            <div className="px-4 py-3 text-xs text-[#7B5C3A] leading-relaxed">{children}</div>
        </div>
    );
}

/** ポイントリスト */
function BulletList({ items }: { items: React.ReactNode[] }) {
    return (
        <ul className="list-none text-xs text-[#7B5C3A] leading-relaxed space-y-1.5 my-2">
            {items.map((item, i) => (
                <li key={i} className="flex gap-2 items-start">
                    <span className="text-bakery-gold font-bold mt-0.5 shrink-0">▸</span>
                    <span>{item}</span>
                </li>
            ))}
        </ul>
    );
}

// ── メインコンポーネント ───────────────────────────
export default function Manual() {
    const [activeSection, setActiveSection] = useState('overview');

    const scrollTo = (id: string) => {
        setActiveSection(id);
        document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    return (
        <div className="min-h-screen bg-[#FDF6E3] font-serif flex flex-col">

            {/* ── カバーヘッダー ── */}
            <div className="bg-bakery-textMain text-[#FDF6E3] px-6 pt-12 pb-10 text-center relative overflow-hidden shrink-0">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_40px,rgba(212,169,106,0.04)_40px,rgba(212,169,106,0.04)_41px)]" />
                <p className="font-playfair italic text-bakery-gold tracking-[0.2em] text-sm mb-2 relative">Operations Manual</p>
                <h1 className="font-playfair text-3xl md:text-4xl font-bold tracking-widest relative mb-2">🥐 AI Bakery Manager</h1>
                <p className="text-bakery-border tracking-[0.15em] text-xs relative mb-6">レシートOCR ・ 予約注文 ・ 売上集計 ・ 業務チャット</p>
                <div className="relative z-10 flex justify-center mt-6 print:hidden no-print">
                    <button
                        onClick={() => window.print()}
                        className="bg-white text-bakery-textMain px-6 py-2 rounded-full font-bold shadow-lg hover:bg-bakery-surface transition-colors flex items-center gap-2 font-zen"
                    >
                        🖨️ マニュアルを印刷・PDF保存
                    </button>
                </div>
            </div>

            {/* ── 本文レイアウト ── */}
            <div className="flex max-w-6xl mx-auto w-full flex-1">

                {/* サイドバー */}
                <nav className="print:hidden w-56 shrink-0 bg-bakery-textMain sticky top-0 h-screen overflow-y-auto py-8 hidden md:block no-print">
                    <div className="font-playfair italic text-bakery-gold text-xs tracking-[0.2em] px-6 pb-4 border-b border-bakery-gold/20 mb-3">CONTENTS</div>
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            onClick={() => scrollTo(item.id)}
                            className={`block w-full text-left px-6 py-2 text-sm tracking-wider transition-all border-l-2 ${activeSection === item.id ? 'text-bakery-gold bg-bakery-gold/10 border-bakery-gold' : 'text-bakery-border border-transparent hover:bg-white/5'}`}
                        >
                            <span className="mr-2">{item.emoji}</span>{item.label}
                        </button>
                    ))}
                </nav>

                {/* コンテンツ */}
                <main className="flex-1 p-6 md:p-12 max-w-3xl mx-auto leading-relaxed print:p-0 print:max-w-full">

                    {/* 印刷時のみ表示 */}
                    <div className="hidden print-only mb-8 text-center text-xs text-gray-500 border-b border-gray-300 pb-2">
                        このマニュアルは店舗スタッフ向けの内部資料です。外部への持ち出しはご遠慮ください。
                    </div>

                    {/* ======================================
                        § アプリ概要
                    ====================================== */}
                    <section id="overview" className="mb-16 print:mb-8">
                        <SectionHeader emoji="🏠" title="アプリ概要" sub="Overview" />
                        <p className="text-[#7B5C3A] text-sm mb-5 leading-relaxed">
                            <strong>AI Bakery Manager</strong> は、店舗の業務をまるごとデジタル化するWebアプリです。
                            レシートや日計表を撮影するだけで売上を自動集計し、顧客へのポイント付与・予約注文の管理・製造部門との連携までワンストップで完結します。
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                            {FEATURES.map((f, i) => (
                                <div key={i} className="bg-[#FFF8EE] border border-[#D6C4A8] rounded-xl p-4 text-center break-inside-avoid">
                                    <span className="text-3xl mb-2 block">{f.emoji}</span>
                                    <div className="font-bold text-sm text-bakery-textMain">{f.title}</div>
                                    <div className="text-xs text-[#7B5C3A] mt-1">{f.desc}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* ======================================
                        § はじめに（初期設定）
                    ====================================== */}
                    <section id="firstsetup" className="mb-16 print:mb-8">
                        <SectionHeader emoji="🚀" title="はじめに（初期設定）" sub="First Setup" />
                        <Callout icon="⚠️" type="warn">
                            <strong>初回のみ必須です。</strong>
                            マスタ登録が済んでいないと、AIが商品を正しく認識できません。
                            まず「製品マスタ管理」を完了させてから他の機能をお使いください。
                        </Callout>

                        <Steps items={[
                            {
                                num: '①',
                                title: '製品マスタを登録する',
                                desc: (
                                    <>
                                        画面上部メニューの「📖 マスタ管理」を開き、販売する商品をすべて登録します。
                                        <br /><br />
                                        <strong>必須項目：</strong>
                                        <BulletList items={[
                                            <>レシート印字名（例：<code>ｸﾛﾜｯｻﾝA</code>）… レシートに実際に印字される略称を正確に入力してください。半角カタカナでも可。</>,
                                            <>正式商品名（例：<code>クロワッサン Aセット</code>）… 集計・月報に表示される名称です。</>,
                                            <>単価（税込）… 売上金額の計算に使います。</>,
                                            <>カテゴリ（例：パン、スイーツ、ドリンク）… ダッシュボードのグループ分けに使います。</>,
                                        ]} />
                                        <Callout icon="💡">
                                            CSVで一括登録することもできます（後述の「製品マスタ管理」セクション参照）。
                                            商品数が多い場合は先にExcelで作成してからインポートすると効率的です。
                                        </Callout>
                                    </>
                                ),
                            },
                            {
                                num: '②',
                                title: 'テスト用のレシートを解析してみる',
                                desc: (
                                    <>
                                        「📸 レシート解析」画面を開き、実際のレシートまたは日計表を撮影して解析ボタンを押します。
                                        商品名・数量・金額が正しく読み取れたら準備完了です。
                                        <br /><br />
                                        読み取りがうまくいかない商品がある場合は、マスタの「レシート印字名」を見直してください。
                                    </>
                                ),
                            },
                            {
                                num: '③',
                                title: '顧客を登録する（任意）',
                                desc: '常連のお客様の情報を「👥 顧客管理」画面から登録しておくと、購買履歴の紐付けや宛名ラベル印刷が可能になります。後から随時追加できます。',
                            },
                        ]} />
                    </section>

                    {/* ======================================
                        § 技術スタック
                    ====================================== */}
                    <section id="tech" className="mb-16 print:mb-8">
                        <SectionHeader emoji="🛠️" title="技術スタック" sub="System Architecture" />
                        <ManualTable
                            headers={['レイヤー', '技術', '役割']}
                            rows={TECH_ROWS.map(r => [r.layer, r.tech, r.role])}
                        />
                        <Callout icon="🔐">
                            <strong>セキュリティ：</strong>APIキーはすべてSupabase Edge Functions（サーバー側）で管理されており、ブラウザには露出しません。
                        </Callout>
                    </section>

                    {/* ======================================
                        § レシート解析
                    ====================================== */}
                    <section id="analyze" className="mb-16 print:mb-8">
                        <SectionHeader emoji="📸" title="レシート解析（日計表対応）" sub="Receipt Analyze" />

                        <Callout icon="💡">
                            事前に<strong>マスタ管理</strong>で商品を登録しておくことで、かすれた文字も自動補正して正確に読み取ります。
                            1枚だけでなく、複数枚連続して読み込むと<strong>自動で合算</strong>されます。
                        </Callout>

                        {/* 画像取り込み方法 */}
                        <SubHeading>📷 STEP 1：画像の取り込み方法（3種類から選択）</SubHeading>

                        <Steps items={[
                            {
                                num: 'A',
                                title: 'PCからファイルを選択（最も手軽）',
                                desc: (
                                    <>
                                        <strong>操作手順：</strong>
                                        <BulletList items={[
                                            '「📁 1. PCからファイルを選択」ボタンをクリックします。',
                                            'ファイル選択ダイアログが開くので、解析したいレシート・日計表の画像（JPEG / PNG）を選びます。',
                                            '画像のプレビューが画面左側に表示されれば取り込み完了です。',
                                        ]} />
                                        <ScreenNote label="🖥️ おすすめの使い方">
                                            スマホで撮影済みの画像をGoogleフォトやiCloudから「PCにダウンロード」しておくと、このボタンから読み込めます。
                                        </ScreenNote>
                                    </>
                                ),
                            },
                            {
                                num: 'B',
                                title: <>スマホで撮影して転送 <Badge>便利・おすすめ</Badge></>,
                                desc: (
                                    <>
                                        PCとスマホをつなぐケーブル不要でリアルタイム転送できます。
                                        <br /><br />
                                        <strong>操作手順：</strong>
                                        <BulletList items={[
                                            '「📱 2. スマホで撮影して転送」ボタンをクリックします。',
                                            'QRコードが画面中央に表示されます。',
                                            'スマホのカメラアプリでQRコードを読み取り、リンクを開きます（ブラウザが起動します）。',
                                            'スマホブラウザのカメラ使用許可ダイアログが出たら「許可」を選びます。',
                                            'カメラ映像が表示されたらレシートに近づけて「📷 撮影」ボタンをタップします。',
                                            '自動でPC画面にプレビューが表示されれば転送完了です。',
                                        ]} />
                                        <Callout icon="⚠️" type="warn">
                                            PCとスマホが<strong>同じWi-Fi</strong>に接続されていることが必要です。
                                            モバイルデータ通信のみの場合は転送できません。
                                        </Callout>
                                    </>
                                ),
                            },
                            {
                                num: 'C',
                                title: 'PC内蔵カメラを起動',
                                desc: (
                                    <>
                                        ノートPCのカメラを使ってその場で撮影できます。
                                        <br /><br />
                                        <strong>操作手順：</strong>
                                        <BulletList items={[
                                            '「📷 3. PCの内蔵カメラを起動」ボタンをクリックします。',
                                            'ブラウザのカメラ許可ダイアログが表示されたら「許可」を選びます。',
                                            'カメラ映像が表示されたら、レシートをフラットに広げてカメラの前にかざします。',
                                            '画面下の「⚪ シャッター」ボタンをクリックして撮影します。',
                                            'プレビューが表示されれば取り込み完了です。',
                                        ]} />
                                        <Callout icon="💡">
                                            レシートが反射・光りすぎる場合は、レシートをコピー用紙の上に置いて撮影すると精度が上がります。
                                        </Callout>
                                    </>
                                ),
                            },
                        ]} />

                        {/* 解析〜保存 */}
                        <SubHeading>⚡ STEP 2：解析〜売上登録の手順</SubHeading>

                        <Steps items={[
                            {
                                num: 1,
                                title: '解析を実行する',
                                desc: (
                                    <>
                                        画像が取り込まれたら、「🚀 レシートを自動解析する」ボタンを押します。
                                        <br /><br />
                                        AIがレシート・日計表を読み取り、マスタと照合した結果が<strong>右側のリスト</strong>に表示されます。
                                        通常は5〜15秒程度で完了します。
                                        <ScreenNote label="📋 解析結果の見方">
                                            <BulletList items={[
                                                '緑色の行：マスタと正しく照合できた商品',
                                                '黄色の行：AIが自動補正した商品（要確認）',
                                                '赤色の行：マスタに存在しない商品（手動修正または除外が必要）',
                                            ]} />
                                        </ScreenNote>
                                    </>
                                ),
                            },
                            {
                                num: 2,
                                title: '手動修正（必要に応じて）',
                                desc: (
                                    <>
                                        AIの読み取りが正しくない場合は、以下の方法で修正できます。
                                        <br /><br />
                                        <BulletList items={[
                                            <>商品名の変更：行の「商品名」欄をクリック → プルダウンからマスタの正式名を選択</>,
                                            <>数量の変更：「数量」欄の数字を直接クリックして書き換え</>,
                                            <>カテゴリの変更：「カテゴリ」欄をクリックして変更</>,
                                            <>行の除外：「✓ 対象」ボタンをクリックすると赤色になり集計から除外されます。もう一度押すと元に戻ります。</>,
                                            <>行の削除：行右端の「🗑️」ボタンでその行を完全に削除できます。</>,
                                        ]} />
                                    </>
                                ),
                            },
                            {
                                num: 3,
                                title: '複数枚を続けて読み込む場合',
                                desc: (
                                    <>
                                        1枚目の解析後、そのまま2枚目を取り込んで再度「🚀 解析する」ボタンを押すと<strong>自動で合算</strong>されます。
                                        日計表が複数ページにわたる場合はこの方法で対応できます。
                                        <br /><br />
                                        ※全てやり直したい場合は「🗑️ クリア」ボタンでリセットしてください。
                                    </>
                                ),
                            },
                            {
                                num: 4,
                                title: '売上データとして登録する',
                                desc: (
                                    <>
                                        修正が完了したら「💾 修正を確認して売上登録」ボタンを押します。
                                        <br /><br />
                                        <BulletList items={[
                                            '売上データが確定し、ダッシュボードの集計に反映されます。',
                                            '日付は自動で「今日」が設定されます。過去の日付で登録する場合は、ボタン上部の「📅 売上日」を変更してください。',
                                            '登録後は「売上履歴」タブから確認・削除できます。',
                                        ]} />
                                    </>
                                ),
                            },
                            {
                                num: 5,
                                title: '顧客の購買履歴として紐付ける（任意）',
                                desc: (
                                    <>
                                        特定のお客様の来店記録として残したい場合は、登録後に表示される「⭐ 購買履歴として記録」ボタンを押します。
                                        <br /><br />
                                        <BulletList items={[
                                            'お客様の検索欄が開くので、名前または電話番号で検索して選択します。',
                                            '選択したお客様の「来店回数」と「累計購入額」が自動で加算されます。',
                                            '非会員の場合はこの手順はスキップしてください。',
                                        ]} />
                                    </>
                                ),
                            },
                        ]} />
                    </section>

                    {/* ======================================
                        § ダッシュボード
                    ====================================== */}
                    <section id="dashboard" className="mb-16 print:mb-8">
                        <SectionHeader emoji="📈" title="売上・製造集計（月報出力）" sub="Dashboard & Reports" />

                        <p className="text-[#7B5C3A] text-sm mb-5">
                            ダッシュボードは4つのタブで構成されています。各タブから月報をPDF・Excelで出力できます。
                        </p>

                        <Steps items={[
                            {
                                num: '①',
                                title: 'ダッシュボード（売上サマリー）',
                                desc: (
                                    <>
                                        <BulletList items={[
                                            '画面上部に「本日の売上」「今月の売上」「月間販売個数」の3つの数値が表示されます。',
                                            '棒グラフで商品ごとの売上ランキングを確認できます。上部の「📅 期間」で日付範囲を絞り込みできます。',
                                            '下部のカレンダーでは日別・カテゴリ別の販売数を一覧表示します。',
                                            '「🔍 絞り込み」ボタンでカテゴリや商品名での絞り込み表示が可能です。',
                                        ]} />
                                    </>
                                ),
                            },
                            {
                                num: '②',
                                title: '製造実績表（ショップ）',
                                desc: (
                                    <>
                                        厨房で入力した「ショップ（店頭）用の製造数」を月ごとに集計した表です。
                                        <BulletList items={[
                                            '月選択ドロップダウンで表示月を切り替えます。',
                                            '「📥 Excelで出力」ボタンでExcel形式（.xlsx）でダウンロードできます。',
                                            '「🖨️ 印刷・PDF保存」ボタンからブラウザの印刷機能でPDF保存できます。',
                                        ]} />
                                    </>
                                ),
                            },
                            {
                                num: '③',
                                title: '販売実績表（ショップ）',
                                desc: (
                                    <>
                                        レシート解析で読み取った「店頭販売数」と「売上金額」の月次集計です。
                                        <BulletList items={[
                                            '商品別・日別のマトリクス表で表示されます。',
                                            '月末行に月合計が自動計算されます。',
                                            '出力方法は製造実績表と同様です（Excel / 印刷）。',
                                        ]} />
                                    </>
                                ),
                            },
                            {
                                num: '④',
                                title: '販売実績表（施設買上）— 自動計算',
                                desc: (
                                    <>
                                        <strong>手入力は不要です。</strong>システムが自動計算します。
                                        <br /><br />
                                        計算式：<code>施設買上数 ＝ ショップ用製造数 − ショップ販売数</code>
                                        <br /><br />
                                        <BulletList items={[
                                            'この数値は「製造実績入力（厨房）」と「レシート解析（店頭）」の両方のデータが揃って初めて表示されます。',
                                            '施設への買上単価はマスタで設定した単価が使用されます（別途設定が必要な場合はマスタ管理で「施設単価」欄を入力してください）。',
                                        ]} />
                                    </>
                                ),
                            },
                        ]} />

                        <Callout icon="📥">
                            <strong>CSV・Excel出力：</strong>ダッシュボードの表はCSVとして出力可能です。
                            月報をPDF化したい場合は各画面の「🖨️ 印刷」ボタンから「PDFとして保存」を選んでください。
                            印刷レイアウトは<strong>横向き・余白なし</strong>に設定するときれいに出力されます。
                        </Callout>
                    </section>

                    {/* ======================================
                        § 顧客管理
                    ====================================== */}
                    <section id="customers" className="mb-16 print:mb-8">
                        <SectionHeader emoji="👥" title="顧客管理" sub="Customer Management" />

                        <SubHeading>📋 顧客の登録・検索・削除</SubHeading>

                        <Steps items={[
                            {
                                num: 1,
                                title: '新規顧客を登録する',
                                desc: (
                                    <>
                                        <BulletList items={[
                                            '「➕ 新規顧客」ボタンをクリックします。',
                                            '入力フォームが開くので、氏名（必須）・電話番号・住所・メモを入力します。',
                                            '「登録する」ボタンを押せば完了です。全角・半角の揺れは自動補正されます。',
                                        ]} />
                                        <ScreenNote label="📝 入力のポイント">
                                            <BulletList items={[
                                                '氏名は「姓」「名」を別々のフィールドに入力してください（宛名ラベルの形式に影響します）。',
                                                '住所は都道府県から入力してください。郵便番号を入力すると自動補完されます。',
                                                'メモ欄にはアレルギー情報や好み・特記事項などを自由に記入できます。',
                                            ]} />
                                        </ScreenNote>
                                    </>
                                ),
                            },
                            {
                                num: 2,
                                title: '顧客を検索する',
                                desc: (
                                    <>
                                        画面上部の検索欄に氏名・電話番号・住所の一部を入力すると、リアルタイムで絞り込まれます。
                                        <BulletList items={[
                                            'ひらがな・カタカナ・漢字のいずれでも検索できます。',
                                            '「🔍 詳細検索」ボタンから来店回数・購入金額での範囲指定検索も可能です。',
                                        ]} />
                                    </>
                                ),
                            },
                            {
                                num: 3,
                                title: '宛名ラベルを印刷する',
                                desc: (
                                    <>
                                        ダイレクトメール（DM）などに使うA4・21面シール用の宛名ラベルを印刷できます。
                                        <br /><br />
                                        <BulletList items={[
                                            'まず検索欄でラベルを印刷したい顧客を絞り込みます（例：特定の地区の住所で絞り込む）。',
                                            '「🖨️ ラベル印刷」ボタンをクリックします。',
                                            'A4・21面シール（70×42.3mm）専用のレイアウトで印刷プレビューが開きます。',
                                            'ブラウザの印刷ダイアログで「余白：なし」に設定して印刷してください。',
                                        ]} />
                                        <Callout icon="💡">
                                            対応シールのサイズ：A4用紙に縦7列×横3列＝21面（市販品ではコクヨ KPC-E1161等が対応）。
                                        </Callout>
                                    </>
                                ),
                            },
                            {
                                num: 4,
                                title: '購買履歴を確認する',
                                desc: (
                                    <>
                                        顧客カードをクリックすると詳細画面が開き、過去の購買履歴・来店日・購入商品が一覧表示されます。
                                        <BulletList items={[
                                            '「来店回数」と「累計購入額」は自動集計されます（レシート解析時に紐付けた分のみ）。',
                                            '履歴の個別削除も可能です（詳細画面の各行右端にある🗑️アイコンから）。',
                                        ]} />
                                    </>
                                ),
                            },
                            {
                                num: 5,
                                title: '顧客を削除する',
                                desc: (
                                    <>
                                        顧客カードにマウスをかざすと右上に「🗑️」アイコンが表示されます。
                                        <Callout icon="⚠️" type="warn">
                                            <strong>注意：</strong>顧客を削除すると、その顧客の<strong>すべての購買履歴も同時に削除</strong>されます。
                                            この操作は取り消せません。誤削除に注意してください。
                                        </Callout>
                                    </>
                                ),
                            },
                        ]} />
                    </section>

                    {/* ======================================
                        § 予約注文
                    ====================================== */}
                    <section id="reservation" className="mb-16 print:mb-8">
                        <SectionHeader emoji="🥐" title="予約注文" sub="Reservations" />

                        <Callout icon="💡">
                            予約注文はマスタに登録されている商品のみ選択できます。新商品を受け付ける前に、必ずマスタ登録を完了してください。
                        </Callout>

                        <Steps items={[
                            {
                                num: 1,
                                title: '予約を新規入力する',
                                desc: (
                                    <>
                                        「🥐 予約注文を入れる」ボタンをクリックします。
                                        <br /><br />
                                        <strong>お客様情報の入力（2パターン）：</strong>
                                        <BulletList items={[
                                            <>会員の場合：「会員から選択」タブで名前または電話番号で検索し、一覧からお客様を選択します。</>,
                                            <>非会員の場合：「お名前」「電話番号」欄を直接入力します。電話番号は任意です。お名前だけでも受付できます。</>,
                                        ]} />
                                    </>
                                ),
                            },
                            {
                                num: 2,
                                title: '受渡日時と商品を選択する',
                                desc: (
                                    <>
                                        <BulletList items={[
                                            '「受渡日」カレンダーから受け渡し予定日をクリックして選択します。',
                                            '「受渡時刻」を「10:00」などの形式で入力します。',
                                            '商品一覧が表示されるので「＋」ボタンで数量を追加します。「−」で減らせます。',
                                            '選択した商品と合計金額が右側に表示されます。',
                                            '「メモ」欄にカスタムオーダー（例：箱入り希望・のし要）などを入力できます。',
                                        ]} />
                                        <ScreenNote label="🛒 商品選択のポイント">
                                            カテゴリタブで絞り込むと商品が見つけやすくなります。
                                            キーボードショートカット：商品名検索欄に入力しながら数量を変更できます。
                                        </ScreenNote>
                                    </>
                                ),
                            },
                            {
                                num: 3,
                                title: '予約を登録する',
                                desc: (
                                    <>
                                        内容を確認して「✅ 予約を登録する」ボタンを押します。
                                        <br /><br />
                                        予約一覧に追加され、受渡日の近い順に自動で並び替わります。
                                        当日の受渡予定一覧は画面上部の「📅 今日の予約」バナーで確認できます。
                                    </>
                                ),
                            },
                            {
                                num: 4,
                                title: 'ステータスを管理する',
                                desc: (
                                    <>
                                        <BulletList items={[
                                            <>「<strong>完了</strong>」ボタン：お客様への受渡が完了したら押します。行が緑色になります。</>,
                                            <>「<strong>取消</strong>」ボタン：お客様からのキャンセルがあったら押します。行がグレーになります（記録は残ります）。</>,
                                            <>「<strong>編集</strong>」：予約カードをクリックすると修正できます（完了・取消後は再度「未完了」に戻してから編集）。</>,
                                        ]} />
                                    </>
                                ),
                            },
                        ]} />
                    </section>

                    {/* ======================================
                        § マスタ管理
                    ====================================== */}
                    <section id="master" className="mb-16 print:mb-8">
                        <SectionHeader emoji="📖" title="製品マスタ管理" sub="Product Master" />

                        <Callout icon="💡">
                            マスタ登録がすべての基本です。レシートに印字される略称（例：<code>ｸﾛﾜｯｻﾝA</code>）と正式名称を紐づけることで、AIの精度が飛躍的に向上します。
                        </Callout>

                        <Steps items={[
                            {
                                num: 1,
                                title: '商品を1件ずつ新規登録する',
                                desc: (
                                    <>
                                        「➕ 新規商品」ボタンをクリックすると登録フォームが開きます。
                                        <br /><br />
                                        <strong>各入力欄の説明：</strong>
                                        <ManualTable
                                            headers={['入力欄', '説明', '例']}
                                            rows={[
                                                ['レシート印字名', 'レシートに実際に印字されている名前（略称・半角カナも可）', 'ｸﾛﾜｯｻﾝA'],
                                                ['正式商品名', '集計・月報・予約画面に表示される名前', 'クロワッサン Aセット'],
                                                ['単価（税込）', '1個あたりの販売価格', '280'],
                                                ['施設単価', '施設への卸値（空欄なら単価と同じ値を使用）', '240'],
                                                ['カテゴリ', 'ダッシュボードでのグループ分け', 'パン / スイーツ / ドリンク'],
                                                ['製造予定数', '1日あたりの製造目標数（厨房画面に表示）', '30'],
                                            ]}
                                        />
                                        「登録する」ボタンで保存します。
                                    </>
                                ),
                            },
                            {
                                num: 2,
                                title: '既存商品を編集・削除する',
                                desc: (
                                    <>
                                        商品一覧の各行をクリックすると編集モードになります。
                                        <BulletList items={[
                                            '変更したい欄を書き換えて「更新する」を押すと即時反映されます。',
                                            '行右端の「🗑️」ボタンで商品を削除できます（削除すると過去の集計データとの紐付けが失われます。通常は削除せず「販売終了」フラグを立てることを推奨します）。',
                                        ]} />
                                    </>
                                ),
                            },
                            {
                                num: 3,
                                title: 'CSVで一括インポートする',
                                desc: (
                                    <>
                                        商品数が多い場合は、Excelで一覧を作成してからCSVインポートすると効率的です。
                                        <br /><br />
                                        <strong>CSVのフォーマット（1行目はヘッダー行）：</strong>
                                        <ScreenNote label="📄 CSVフォーマット">
                                            <code>印字名,正式名,単価,施設単価,予定数,カテゴリ</code>
                                            <br />
                                            <code>ｸﾛﾜｯｻﾝA,クロワッサン Aセット,280,240,30,パン</code>
                                            <br />
                                            <code>ﾒﾛﾝﾊﾟﾝ,メロンパン,200,180,50,パン</code>
                                        </ScreenNote>
                                        <BulletList items={[
                                            '「📥 CSV読込」ボタンをクリックして作成したCSVファイルを選択します。',
                                            'プレビューが表示されるので内容を確認し「インポート実行」を押します。',
                                            '文字コードはShift-JIS・UTF-8のどちらでも自動判定されます。',
                                        ]} />
                                    </>
                                ),
                            },
                        ]} />
                    </section>

                    {/* ======================================
                        § 製造実績・チャット
                    ====================================== */}
                    <section id="production" className="mb-16 print:mb-8">
                        <SectionHeader emoji="👨‍🍳" title="製造実績・チャット" sub="Production & Chat" />

                        <Callout icon="💡">
                            この画面は<strong>厨房スタッフが使う</strong>画面です。毎日、商品を店頭に出す前に製造実績を入力してください。
                            入力されたデータはダッシュボードの「施設買上自動計算」に使用されます。
                        </Callout>

                        <SubHeading>👨‍🍳 製造実績の入力手順</SubHeading>

                        <Steps items={[
                            {
                                num: 1,
                                title: '製造日を選択する',
                                desc: (
                                    <>
                                        画面上部の「📅 製造日」カレンダーで実績を入力したい日付を選択します。
                                        <BulletList items={[
                                            '初期値は今日の日付になっています。',
                                            '昨日以前の日付も遡って入力できます（最大30日前まで）。',
                                            '未来の日付は選択できません。',
                                        ]} />
                                    </>
                                ),
                            },
                            {
                                num: 2,
                                title: '製造実績を入力する',
                                desc: (
                                    <>
                                        マスタに登録されている全商品が、カテゴリ別に一覧表示されます。
                                        <br /><br />
                                        各商品に対して以下の数値を入力します：
                                        <ManualTable
                                            headers={['入力欄', '意味']}
                                            rows={[
                                                ['予定数', 'マスタで設定した目標製造数（参照用・変更不可）'],
                                                ['ショップ用', '店頭に並べる数（レジで販売する分）'],
                                                ['その他用', '施設・卸し先などに出荷する数'],
                                                ['合計', 'ショップ用＋その他用（自動計算）'],
                                            ]}
                                        />
                                        「＋」「−」ボタンで数量を変更するか、数字欄を直接クリックして入力できます。
                                        <Callout icon="💡">
                                            <strong>ショップ用</strong>の数値のみ入力すれば、施設買上はダッシュボードで自動計算されます。
                                            「その他用」はショップ以外に直接出荷した分がある場合のみ入力してください。
                                        </Callout>
                                    </>
                                ),
                            },
                            {
                                num: 3,
                                title: '実績を保存する',
                                desc: (
                                    <>
                                        入力が完了したら画面最下部の「💾 製造実績を確定して保存」ボタンを押します。
                                        <BulletList items={[
                                            '保存後はダッシュボードの「製造実績表」と「施設買上実績表」に即時反映されます。',
                                            '当日中であれば何度でも上書き保存できます。',
                                            '翌日以降の修正は管理者権限が必要です。',
                                        ]} />
                                    </>
                                ),
                            },
                        ]} />

                        <SubHeading>💬 チャット機能（販売部門との連絡）</SubHeading>

                        <p className="text-[#7B5C3A] text-sm mb-4">
                            製造実績画面の右側（またはタブを切り替え）にチャット欄があります。販売部門と製造部門がリアルタイムに連絡を取り合えます。
                        </p>

                        <BulletList items={[
                            'メッセージを入力して「送信」ボタンを押すか、Enterキーで送信できます。',
                            '送信者名には現在ログインしているアカウント名が表示されます。',
                            '画像の添付も可能です（カメラアイコンをクリック）。',
                            'メッセージは全スタッフ共通で表示されます（個人チャットには対応していません）。',
                        ]} />
                    </section>

                    {/* ======================================
                        § 業務フロー全体図
                    ====================================== */}
                    <section id="flow" className="mb-16 print:mb-8">
                        <SectionHeader emoji="🔄" title="業務フロー全体図" sub="Workflow Overview" />

                        <p className="text-[#7B5C3A] text-xs tracking-wider mb-2 font-bold">■ 毎日の売上・ロス管理の流れ</p>
                        <FlowDiagram nodes={['👨‍🍳 厨房：製造実績を入力', '→', '📸 店舗：レシート解析・保存', '→', '📈 施設買上分が自動計算される', '→', '月報出力（Excel/PDF）']} />

                        <p className="text-[#7B5C3A] text-xs tracking-wider mt-5 mb-2 font-bold">■ 予約受付の流れ</p>
                        <FlowDiagram nodes={['📞 電話・来店で注文受付', '→', '🥐 予約注文を登録', '→', '当日：受渡し', '→', '「完了」ボタンを押す']} />

                        <p className="text-[#7B5C3A] text-xs tracking-wider mt-5 mb-2 font-bold">■ 顧客管理・宛名ラベルの流れ</p>
                        <FlowDiagram nodes={['👥 顧客を新規登録', '→', 'レシート解析後に購買履歴を紐付け', '→', '住所で絞り込み', '→', '🖨️ ラベル印刷']} />

                        <p className="text-[#7B5C3A] text-xs tracking-wider mt-5 mb-2 font-bold">■ 初期設定の流れ（初回のみ）</p>
                        <FlowDiagram nodes={['📖 商品マスタを登録', '→', '📸 テスト解析で精度確認', '→', '👥 顧客情報を登録', '→', '✅ 運用開始']} />
                    </section>

                    {/* ======================================
                        § よくある質問
                    ====================================== */}
                    <section id="tips" className="mb-16 print:mb-8">
                        <SectionHeader emoji="💡" title="よくある質問" sub="FAQ" />
                        <div className="flex flex-col gap-4">
                            {FAQ_ROWS.map((row, i) => (
                                <div key={i} className="bg-[#FFF8EE] border border-[#D6C4A8] rounded-xl overflow-hidden break-inside-avoid">
                                    <div className="bg-bakery-textMain text-bakery-gold text-xs font-bold px-4 py-2 flex gap-2 items-start">
                                        <span className="shrink-0 mt-0.5">Q.</span>
                                        <span>{row.q}</span>
                                    </div>
                                    <div className="px-4 py-3 text-xs text-[#7B5C3A] leading-relaxed flex gap-2 items-start">
                                        <span className="text-bakery-gold font-bold shrink-0">A.</span>
                                        <span>{row.a}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>

                </main>
            </div>

            {/* 印刷フッター */}
            <div className="hidden print-only text-center text-[10px] text-gray-400 py-4">
                AI Bakery Manager Operations Manual - Confidential
            </div>
        </div>
    );
}