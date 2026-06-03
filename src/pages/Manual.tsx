// src/pages/Manual.tsx
import { useState } from 'react';

// ── 型定義 ──────────────────────────────────────────
type NavItem = { id: string; emoji: string; label: string };
type StepItem = { num: string | number; title: React.ReactNode; desc: React.ReactNode };
type FlowNode = { node: string } | { arrow: true };
type TechRow = { layer: string; tech: string; role: string };
type FaqRow = { q: string; a: string };

// ── データ定義 ──────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
    { id: 'overview', emoji: '🏠', label: 'アプリ概要' },
    { id: 'tech', emoji: '🛠️', label: '技術スタック' },
    { id: 'analyze', emoji: '📸', label: 'レシート解析 (日計表対応)' },
    { id: 'dashboard', emoji: '📈', label: '売上・製造集計 (月報出力)' },
    { id: 'customers', emoji: '👥', label: '顧客・予約管理' },
    { id: 'master', emoji: '📖', label: '製品マスタ管理' },
    { id: 'production', emoji: '👨‍🍳', label: '製造実績・チャット' },
    { id: 'flow', emoji: '🔄', label: '業務フロー全体図' },
    { id: 'tips', emoji: '💡', label: 'よくある質問' },
];

const FEATURES = [
    { emoji: '📸', title: 'AIレシート解析', desc: 'Geminiが商品名と金額を自動読み取り。長い日計表にも対応し、点数から自動で計算・修復します。' },
    { emoji: '📈', title: '自動集計ダッシュボード', desc: '売上ランキングの可視化や、店舗用・施設買上用の月報（PDF・Excel）を自動生成します。' },
    { emoji: '👨‍🍳', title: '製造・ロス自動計算', desc: '厨房で製造実績を入力すると、「製造数 − ショップ販売数 ＝ 施設買上」としてロスなく自動計算されます。' },
    { emoji: '👥', title: '顧客・宛名ラベル', desc: '会員登録やポイント付与だけでなく、検索結果からA4・21面シールの宛名ラベルをワンクリックで印刷できます。' },
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

const ANALYZE_INPUT_STEPS: StepItem[] = [
    { num: 'A', title: 'PCからファイルを選択', desc: '「📁 1. PCからファイルを選択」ボタンをタップ → PC内の画像（JPEG / PNG）を選択。' },
    { num: 'B', title: <>スマホで撮影して転送 <Badge>便利</Badge></>, desc: '「📱 2. スマホで撮影して転送」ボタンをタップ → QRコードが表示される → スマホでスキャンして専用ページを開き、カメラで撮影 → 画像が自動でPCに届きます。' },
    { num: 'C', title: 'PC内蔵カメラを起動', desc: '「📷 3. PCの内蔵カメラを起動」ボタンをタップ → カメラが起動したらレシートにかざす → 画面下のシャッターボタンを押して撮影。' },
];

const ANALYZE_SAVE_STEPS: StepItem[] = [
    { num: 1, title: '解析を実行', desc: '画像をセットしたら「🚀 レシートを自動解析する」ボタンを押す。AIが日計表やレシートを読み取り、マスタと照合して右側に表示されます。' },
    { num: 2, title: '手動修正（必要に応じて）', desc: 'AIが間違えていた場合は、表示されたリストの「商品名」や「数量」「カテゴリ」を直接書き換えて修正できます。不要な行は「✓ 対象」ボタンを押して除外中（赤色）にできます。' },
    { num: 3, title: '履歴に保存', desc: '「💾 修正を確認して売上登録」ボタンを押すと売上データが確定し、ダッシュボードの集計に反映されます。連続で複数枚のレシートを読み込むと自動で合算されます。' },
    { num: 4, title: 'ポイント付与（任意）', desc: '顧客をドロップダウンから選び「⭐ 購買記録 & ポイント付与」を押すと、履歴の保存と同時に合計金額の1%がポイント付与されます。' },
];

const DASHBOARD_STEPS: StepItem[] = [
    { num: '📊', title: 'ダッシュボード', desc: '売上金額・販売個数のランキング（グラフ）と、カテゴリ別にグループ化された日別販売カレンダーが表示されます。カテゴリや商品名での絞り込みが可能です。' },
    { num: '👨‍🍳', title: '製造実績表 (ショップ)', desc: '厨房で入力した「ショップ（店頭）用の製造数」を月報として出力します。' },
    { num: '🛒', title: '販売実績表 (ショップ)', desc: 'レシート解析で読み取った「店頭での販売数」と「売上金額」を月報として出力します。' },
    { num: '🏢', title: '販売実績表 (施設買上)', desc: '【自動計算機能】「ショップ用製造数」から「ショップ販売数」を引いた【残数】を、施設が買い上げたものとして自動計算し、金額を月報出力します。' },
];

const CUSTOMER_LIST_STEPS: StepItem[] = [
    { num: 1, title: '新規顧客の登録', desc: '「➕ 新規顧客」ボタン → 氏名（必須）・電話番号・住所を入力して「登録する」を押します。全角・半角の揺れは自動で補正されます。' },
    { num: 2, title: '宛名ラベルの印刷', desc: '検索欄で住所や名前を絞り込み、「🖨️ ラベル印刷」ボタンを押すと、A4・21面シール（70×42.3mm）専用の宛名ラベルが出力できます。' },
    { num: 3, title: '顧客の削除', desc: 'カードにカーソルを当てると右上に 🗑️ アイコンが表示されます。削除すると過去の購買履歴も消去されるため注意してください。' },
];

const RESERVATION_STEPS: StepItem[] = [
    { num: 1, title: '予約を入力', desc: <>「🥐 予約注文を入れる」ボタン → お客様を会員リストから選択するか、直接「お名前」「電話番号」を入力（非会員）します。</> },
    { num: 2, title: '商品と受渡日時を選択', desc: '受渡日・受渡時刻を入力し、マスタに登録されている商品を「＋」「−」ボタンで選択します。' },
    { num: 3, title: 'ステータス管理', desc: <>一覧の「完了」ボタンで<strong>受渡済み</strong>、「取消」で<strong>キャンセル</strong>に変更できます。キャンセルはグレーアウトして残ります。</> },
];

const MASTER_STEPS: StepItem[] = [
    { num: 1, title: '商品を新規登録', desc: '「➕ 新規商品」ボタンから登録します。レシートに印字される略称（印字名）と、正式な商品名の両方を登録します。' },
    { num: 2, title: 'カテゴリと製造予定数の設定', desc: '商品は「🍞 パン」などのカテゴリに分けて登録します。製造予定数を設定しておくと、製造部門の画面に目標数として表示されます。' },
    { num: 3, title: 'CSVインポート', desc: '「📥 CSV読込」ボタンから、エクセル等で作った商品リストを一括で読み込めます。（フォーマット：印字名,正式名,単価,予定数,カテゴリ）' },
];

const PRODUCTION_STEPS: StepItem[] = [
    { num: 1, title: '製造日の選択', desc: '画面上部の「📅 製造日」カレンダーで、実績を入力したい日付を選択します（初期値は今日です）。' },
    { num: 2, title: '製造実績の入力', desc: 'マスタに登録されている「予定数」を確認しながら、実際に店頭に並べる「ショップ用」の数と、外部に卸す「その他用」の数を＋−ボタンで入力します（合計は自動計算）。' },
    { num: 3, title: '実績の保存', desc: '入力が終わったら一番下の「💾 製造実績を確定して保存」を押します。保存されたデータはダッシュボードの製造実績表に連動します。' },
];

const FAQ_ROWS: FaqRow[] = [
    { q: '商品が読み取れなかった / 解析に失敗する', a: 'マスタ管理に「レシート印字名」が正しく登録されているか確認してください。また、日計表を撮影する場合は、周りにメニュー表などの関係ない文字が写り込まないように接写してください。' },
    { q: '同じ商品が重複して表示される', a: '解析ボタンを押すたびに自動で合算されます。もし重複が起きた場合は「🗑️ クリア」して再度やり直してください。' },
    { q: '施設買上（卸売）の入力画面がない', a: 'システムが全自動化されました。厨房で入力した「ショップ用製造数」から、レジの「ショップ販売数」を引いた残りが、すべて自動的に施設買上として計算されます。ダッシュボードで確認できます。' },
    { q: 'スマホ転送がうまくいかない', a: 'PCとスマホが同じネットワーク（Wi-Fi）に接続されているか確認してください。また、スマホブラウザのカメラ許可が必要です。' },
    { q: 'CSVインポートで文字化けする', a: 'Shift-JISやUTF-8などの文字コードはシステムが自動判定するため、Excelから保存したCSVファイルをそのまま読み込ませて大丈夫です。' },
    { q: '印刷やPDF保存のレイアウトが崩れる', a: 'ブラウザの印刷設定画面で、「レイアウト」を『横（ランドスケープ）』に、「余白」を『なし（ゼロ）』に設定してください。ヘッダーやフッターのチェックも外すときれいに仕上がります。' },
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

function Callout({ icon, children }: { icon: string; children: React.ReactNode }) {
    return (
        <div className="bg-[#FFF8E7] border border-bakery-border border-l-4 border-l-bakery-gold rounded-lg px-4 py-3 my-5 text-sm text-bakery-primary leading-relaxed break-inside-avoid">
            <span className="mr-1.5">{icon}</span>{children}
        </div>
    );
}

function Steps({ items }: { items: StepItem[] }) {
    return (
        <div className="flex flex-col gap-4">
            {items.map((item, i) => (
                <div key={i} className="grid grid-cols-[40px_1fr] gap-4 items-start bg-[#FFF8EE] border border-[#D6C4A8] rounded-xl p-4 break-inside-avoid">
                    <div className="w-10 h-10 bg-bakery-textMain text-bakery-gold rounded-full flex items-center justify-center font-playfair font-bold shrink-0">
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
    return <h3 className="text-sm text-bakery-textMain my-4 font-bold break-after-avoid">{children}</h3>;
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
                                <td key={ci} className={`px-4 py-2 border-b border-[#D6C4A8] align-top ${ci === 0 ? 'text-bakery-textMain font-bold' : 'text-[#7B5C3A]'}`}>
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

function FlowDiagram({ nodes }: { nodes: (string | '→')[] }) {
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

                {/* ⭐️ 印刷ボタンをヘッダーに追加！ */}
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

                {/* ⭐️ サイドバー (印刷時は非表示) */}
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

                {/* ⭐️ コンテンツ (印刷時は余白を詰めて全幅に) */}
                <main className="flex-1 p-6 md:p-12 max-w-3xl mx-auto leading-relaxed print:p-0 print:max-w-full">

                    {/* 印刷時のみ表示される注意書き */}
                    <div className="hidden print-only mb-8 text-center text-xs text-gray-500 border-b border-gray-300 pb-2">
                        このマニュアルは店舗スタッフ向けの内部資料です。外部への持ち出しはご遠慮ください。
                    </div>

                    <section id="overview" className="mb-16 print:mb-8">
                        <SectionHeader emoji="🏠" title="アプリ概要" sub="Overview" />
                        <p className="text-[#7B5C3A] text-sm mb-5">
                            <strong>AI Bakery Manager</strong> は、店舗の業務をまるごとデジタル化するWebアプリです。レシートや日計表を撮影するだけで売上を自動集計し、顧客へのポイント付与・予約注文の管理・製造部門との連携までワンストップで完結します。
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

                    <section id="tech" className="mb-16 print:mb-8">
                        <SectionHeader emoji="🛠️" title="技術スタック" sub="System Architecture" />
                        <ManualTable headers={['レイヤー', '技術', '役割']} rows={TECH_ROWS.map(r => [r.layer, r.tech, r.role])} />
                        <Callout icon="🔐"><strong>セキュリティ：</strong>APIキーはすべてSupabase Edge Functions（サーバー側）で管理されており、ブラウザには露出しません。</Callout>
                    </section>

                    <section id="analyze" className="mb-16 print:mb-8">
                        <SectionHeader emoji="📸" title="レシート解析 (日計表対応)" sub="Receipt Analyze" />
                        <Callout icon="💡">事前に<strong>マスタ管理</strong>で商品を登録しておくことで、かすれた文字も自動補正して正確に読み取ります。</Callout>
                        <SubHeading>📷 画像の取り込み方法（3種類）</SubHeading>
                        <Steps items={ANALYZE_INPUT_STEPS} />
                        <SubHeading>⚡ 解析〜保存の手順</SubHeading>
                        <Steps items={ANALYZE_SAVE_STEPS} />
                    </section>

                    <section id="dashboard" className="mb-16 print:mb-8">
                        <SectionHeader emoji="📈" title="売上・製造集計 (月報出力)" sub="Dashboard & Reports" />
                        <Steps items={DASHBOARD_STEPS} />
                        <Callout icon="📥"><strong>CSV・Excel出力：</strong>ダッシュボードの表はCSVとして出力可能。月報をPDF化したい場合は各画面の「🖨️ 印刷」ボタンからPDF保存を選んでください。</Callout>
                    </section>

                    <section id="customers" className="mb-16 print:mb-8">
                        <SectionHeader emoji="👥" title="顧客・予約管理" sub="Customers & Reservations" />
                        <SubHeading>📋 顧客一覧タブ</SubHeading>
                        <Steps items={CUSTOMER_LIST_STEPS} />
                        <SubHeading>🥐 予約注文タブ</SubHeading>
                        <Steps items={RESERVATION_STEPS} />
                    </section>

                    <section id="master" className="mb-16 print:mb-8">
                        <SectionHeader emoji="📖" title="製品マスタ管理" sub="Product Master" />
                        <Callout icon="💡">マスタ登録がすべての基本です。レシートに印字される略称（例: ｸﾛﾜｯｻﾝA）と正式名称を紐づけることで、AIの精度が飛躍的に向上します。</Callout>
                        <Steps items={MASTER_STEPS} />
                    </section>

                    <section id="production" className="mb-16 print:mb-8">
                        <SectionHeader emoji="👨‍🍳" title="製造実績・チャット" sub="Production & Chat" />
                        <Steps items={PRODUCTION_STEPS} />
                        <p className="text-[#7B5C3A] text-sm mt-4">※同じ画面にあるチャット機能を使うと、販売部門とリアルタイムに連絡が取れます。</p>
                    </section>

                    <section id="flow" className="mb-16 print:mb-8">
                        <SectionHeader emoji="🔄" title="業務フロー全体図" sub="Workflow Overview" />
                        <p className="text-xs text-[#7B5C3A] tracking-wider mb-2">■ 日々の売上・ロス管理の流れ</p>
                        <FlowDiagram nodes={['👨‍🍳 厨房: 製造実績を入力', '→', '📸 店舗: レシート解析・保存', '→', '📈 施設買上分が自動計算される']} />
                        <p className="text-xs text-[#7B5C3A] tracking-wider mt-5 mb-2">■ 予約受付の流れ</p>
                        <FlowDiagram nodes={['📞 電話・来店で注文受付', '→', '🥐 予約注文を登録', '→', '受渡時に「完了」ボタン']} />
                    </section>

                    <section id="tips" className="mb-16 print:mb-8">
                        <SectionHeader emoji="💡" title="よくある質問" sub="FAQ" />
                        <ManualTable headers={['質問', '回答']} rows={FAQ_ROWS.map(r => [r.q, r.a])} />
                    </section>

                </main>
            </div>

            {/* 印刷時のみ下部に表示されるフッター */}
            <div className="hidden print-only text-center text-[10px] text-gray-400 py-4">
                AI Bakery Manager Operations Manual - Confidential
            </div>
        </div>
    );
}