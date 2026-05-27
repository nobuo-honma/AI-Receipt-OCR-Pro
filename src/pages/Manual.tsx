// src/pages/Manual.tsx
import { useState } from 'react';

// ── 型定義 ──────────────────────────────────────────
type NavItem = { id: string; emoji: string; label: string };
type StepItem = { num: string | number; title: React.ReactNode; desc: React.ReactNode };
type FlowNode = { node: string } | { arrow: true };
type TechRow = { layer: string; tech: string; role: string };
type FaqRow = { q: string; a: string };
type GraphRow = { graph: string; content: React.ReactNode };

// ── データ定義 ──────────────────────────────────────
const NAV_ITEMS: NavItem[] = [
    { id: 'overview', emoji: '🏠', label: 'アプリ概要' },
    { id: 'tech', emoji: '🛠️', label: '技術スタック' },
    { id: 'analyze', emoji: '📸', label: 'レシート読込' },
    { id: 'customers', emoji: '👥', label: '顧客・予約管理' },
    { id: 'dashboard', emoji: '📈', label: '売上集計・月報' },
    { id: 'master', emoji: '📖', label: 'マスタ管理' },
    { id: 'contact', emoji: '👨‍🍳', label: '製造実績・チャット' },
    { id: 'flow', emoji: '🔄', label: '業務フロー全体図' },
    { id: 'tips', emoji: '💡', label: 'よくある質問' },
];

const FEATURES = [
    { emoji: '📸', title: 'AIレシート解析', desc: 'Geminiが商品名と金額を自動読み取り。日計表にも対応。' },
    { emoji: '👥', title: '顧客管理', desc: '会員登録・ポイント付与・宛名ラベルのPDF印刷機能。' },
    { emoji: '🥐', title: '予約注文', desc: 'マスタと連動し、直感的に商品を選んで予約を受け付け。' },
    { emoji: '📈', title: '売上集計', desc: 'ダッシュボードや月間出荷表を自動生成し、Excel・PDFへ出力。' },
    { emoji: '📖', title: 'マスタ管理', desc: '商品名・単価・カテゴリ・製造予定数を一括管理。CSV読込対応。' },
    { emoji: '👨‍🍳', title: '製造・チャット', desc: '製造部門の実績入力と、販売部門とのリアルタイム連絡。' },
];

const TECH_ROWS: TechRow[] = [
    { layer: 'フロントエンド', tech: 'React / TypeScript / Vite', role: '高速なSPA（シングルページアプリ）を構築。型安全な開発で品質を担保。' },
    { layer: 'データベース', tech: 'Supabase（PostgreSQL）', role: '顧客・商品・予約・チャットなど全データをクラウドで管理。リアルタイム同期機能を利用。' },
    { layer: 'OCR / AI解析', tech: 'Google Gemini 1.5 Pro', role: 'レシートや日計表の画像から文字と数値を読み取り。Supabase Edge Functionsを経由して安全に呼び出す。' },
    { layer: 'マスタ補正ロジック', tech: '独自アルゴリズム', role: 'AIの解析結果とマスタの「レシート表示名」を照合し、かすれや誤読を「正しい単価・商品名・カテゴリ」に自動補正。' },
    { layer: 'スマホ転送', tech: 'QRコード + Supabase Realtime', role: 'PCに表示されたQRをスマホで読み取り撮影。画像がBase64でリアルタイムにPCへ転送される。' },
];

const ANALYZE_INPUT_STEPS: StepItem[] = [
    { num: 'A', title: 'PCからファイルを選択', desc: '「📁 ファイル」ボタンをタップ → PC内の画像（JPEG / PNG）を選択。' },
    { num: 'B', title: <>スマホで撮影して転送 <Badge>便利</Badge></>, desc: '「📱 スマホ転送」ボタンをタップ → QRコードが表示される → スマホでスキャンして専用ページを開き撮影 → 画像が自動でPCに届きます。' },
    { num: 'C', title: 'PC内蔵カメラを起動', desc: '「📷 PCカメラ」ボタンをタップ → カメラが起動したらレシートにかざす → 画面下のシャッターボタンを押して撮影。' },
];

const ANALYZE_SAVE_STEPS: StepItem[] = [
    { num: 1, title: '解析を実行', desc: '画像をセットしたら「🚀 レシートを自動解析する」ボタンを押す。AIが読み取り、マスタに登録されている商品だけが抽出されて右側に表示されます。' },
    { num: 2, title: '手動修正（必要に応じて）', desc: 'AIが間違えていた場合は、表示されたリストの「商品名」や「数量」「カテゴリ」などを直接書き換えて修正できます。不要な行は「対象」ボタンを押して除外できます。' },
    { num: 3, title: '履歴に保存', desc: '「💾 修正を確認して売上登録」ボタンを押すと売上データが確定し、ダッシュボードの集計に反映されます。' },
    { num: 4, title: 'ポイント付与（任意）', desc: '顧客をドロップダウンから選び「⭐ 購買記録 & ポイント付与」を押すと、購買履歴の保存と同時にポイントが付与されます。' },
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

const DASHBOARD_STEPS: StepItem[] = [
    { num: '📊', title: 'ダッシュボード', desc: '売上金額・販売個数のランキング（グラフ）と、カテゴリ別にグループ化された日別販売カレンダーが表示されます。カテゴリや商品名で絞り込み検索が可能です。' },
    { num: '🍞', title: '製造実績表（月報）', desc: '製造部門が入力した「本日の製造数」の一覧です。エクセルのような表形式で表示され、PDF保存や印刷に適しています。' },
    { num: '🛒', title: '販売実績表（月報）', desc: 'レシート解析で読み取った「販売数」の一覧です。製造実績と見比べることで、売れ残りや欠品がないかを確認できます。' },
];

const MASTER_STEPS: StepItem[] = [
    { num: 1, title: '商品を新規登録', desc: '「➕ 新規商品」ボタンから登録します。レシートに印字される略称（印字名）と、正式な商品名の両方を登録します。' },
    { num: 2, title: 'カテゴリと製造予定数の設定', desc: '商品は「🍞 パン」などのカテゴリに分けて登録します。製造予定数を設定しておくと、製造部門の画面に目標数として表示されます。' },
    { num: 3, title: 'CSVインポート', desc: '「📥 CSV読込」ボタンから、エクセル等で作った商品リストを一括で読み込めます。（フォーマット：印字名,正式名,単価,予定数,カテゴリ）' },
];

const CHAT_STEPS: StepItem[] = [
    { num: 1, title: '製造実績の入力', desc: '左側のパネルで、本日の日付を選びます。商品ごとに「＋」「−」ボタンで製造した数を入力し、「💾 製造実績を確定して保存」を押します。' },
    { num: 2, title: '業務連絡チャット', desc: '右側のパネルで「🛒 販売」または「🥖 製造」ボタンを押して立場を設定し、メッセージを送信します。別の端末で開いていてもリアルタイムに届きます。' },
];

const FAQ_ROWS: FaqRow[] = [
    { q: '商品が読み取れなかった / 解析に失敗する', a: 'マスタ管理に「レシート印字名」が正しく登録されているか確認してください。また、日計表を撮影する場合は、周りにメニュー表などの関係ない文字が写り込まないように接写してください。' },
    { q: '同じ商品が重複して表示される', a: '解析ボタンを押すたびに自動で合算されます。もし重複が起きた場合は「クリア」して再度やり直してください。' },
    { q: 'ダッシュボードに何も表示されない', a: 'レシート読込画面で「💾 修正を確認して売上登録」を押してデータを確定させてください。また、ダッシュボードの「📅 集計期間」が正しいか確認してください。' },
    { q: 'CSVインポートで文字化けする', a: 'Shift-JISやUTF-8などの文字コードはシステムが自動判定するため、Excelから保存したCSVファイルをそのまま読み込ませて大丈夫です。' },
    { q: '印刷やPDF保存のレイアウトが崩れる', a: 'ブラウザの印刷設定画面で、「レイアウト」を『横（ランドスケープ）』に、「余白」を『なし（ゼロ）』に設定してください。ヘッダーやフッターのチェックも外すときれいに仕上がります。' },
];

// ── 共通コンポーネント ─────────────────────────────

function Badge({ children }: { children: React.ReactNode }) {
    return (
        <span style={{ display: 'inline-block', background: '#D4A96A', color: '#3D2B1F', fontSize: '.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 4, letterSpacing: '.05em', verticalAlign: 'middle', marginLeft: 4 }}>
            {children}
        </span>
    );
}

function SectionHeader({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 28, paddingBottom: 16, borderBottom: '2px solid #D6C4A8' }}>
            <span style={{ fontSize: '2rem', lineHeight: 1 }}>{emoji}</span>
            <div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 700, color: '#3D2B1F' }}>{title}</div>
                <div style={{ fontSize: '.75rem', color: '#7B5C3A', letterSpacing: '.1em', marginTop: 2 }}>{sub}</div>
            </div>
        </div>
    );
}

function Callout({ icon, children }: { icon: string; children: React.ReactNode }) {
    return (
        <div style={{ background: '#FFF8E7', border: '1px solid #E0C898', borderLeft: '4px solid #D4A96A', borderRadius: 8, padding: '14px 18px', margin: '20px 0', fontSize: '.85rem', color: '#6B4226', lineHeight: 1.7 }}>
            <span style={{ marginRight: 6 }}>{icon}</span>{children}
        </div>
    );
}

function Steps({ items }: { items: StepItem[] }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.map((item, i) => (
                <div key={i} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 16, alignItems: 'start', background: '#FFF8EE', border: '1px solid #D6C4A8', borderRadius: 10, padding: '18px 20px' }}>
                    <div style={{ width: 40, height: 40, background: '#3D2B1F', color: '#D4A96A', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, flexShrink: 0 }}>
                        {item.num}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, color: '#3D2B1F', marginBottom: 4, fontSize: '.95rem' }}>{item.title}</div>
                        <div style={{ fontSize: '.85rem', color: '#7B5C3A', lineHeight: 1.7 }}>{item.desc}</div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function SubHeading({ children }: { children: React.ReactNode }) {
    return (
        <h3 style={{ fontSize: '1rem', color: '#3D2B1F', margin: '24px 0 12px', fontWeight: 700 }}>
            {children}
        </h3>
    );
}

function ManualTable({ headers, rows }: { headers: string[]; rows: React.ReactNode[][] }) {
    return (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '.85rem', marginTop: 16 }}>
            <thead>
                <tr>
                    {headers.map((h, i) => (
                        <th key={i} style={{ background: '#3D2B1F', color: '#D4A96A', padding: '10px 14px', textAlign: 'left', fontWeight: 700, letterSpacing: '.05em' }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, ri) => (
                    <tr key={ri}>
                        {row.map((cell, ci) => (
                            <td key={ci} style={{ padding: '10px 14px', borderBottom: '1px solid #D6C4A8', color: ci === 0 ? '#3D2B1F' : '#7B5C3A', fontWeight: ci === 0 ? 700 : 400, background: ri % 2 === 1 ? '#FFF8EE' : 'white', verticalAlign: 'top' }}>{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

function FlowDiagram({ nodes }: { nodes: (string | '→')[] }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 4, margin: '20px 0' }}>
            {nodes.map((n, i) =>
                n === '→'
                    ? <span key={i} style={{ color: '#D4A96A', fontSize: '1.2rem' }}>→</span>
                    : <div key={i} style={{ background: '#3D2B1F', color: '#E0C898', borderRadius: 8, padding: '8px 16px', fontSize: '.8rem', fontWeight: 700, whiteSpace: 'nowrap' }}>{n}</div>
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
        <div style={{ minHeight: '100vh', background: '#FDF6E3', fontFamily: "'Noto Serif JP', serif" }}>

            {/* ── カバーヘッダー ── */}
            <div style={{ background: '#3D2B1F', color: '#FDF6E3', padding: '56px 40px 44px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', inset: 0, backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(212,169,106,0.04) 40px, rgba(212,169,106,0.04) 41px)' }} />
                <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: '#D4A96A', letterSpacing: '.2em', fontSize: '1rem', marginBottom: 12, position: 'relative' }}>
                    Operations Manual
                </p>
                <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(1.6rem, 5vw, 2.8rem)', fontWeight: 700, letterSpacing: '.08em', position: 'relative', marginBottom: 10 }}>🥐 AI Bakery Manager</h1>
                <p style={{ color: '#E0C898', letterSpacing: '.15em', fontSize: '.8rem', position: 'relative', marginBottom: 32 }}>
                    レシートOCR ・ 予約注文 ・ 売上集計 ・ 業務チャット
                </p>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, position: 'relative' }}>
                    <div style={{ width: 80, height: 1, background: '#D4A96A', opacity: .5 }} />
                    <span style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: '#D4A96A', fontSize: '.9rem' }}>— 操作マニュアル —</span>
                    <div style={{ width: 80, height: 1, background: '#D4A96A', opacity: .5 }} />
                </div>
            </div>

            {/* ── 本文レイアウト ── */}
            <div style={{ display: 'flex', maxWidth: 1100, margin: '0 auto' }}>

                {/* サイドバー */}
                <nav style={{ width: 240, flexShrink: 0, background: '#3D2B1F', position: 'sticky', top: 0, height: '100vh', overflowY: 'auto', padding: '32px 0' }}>
                    <div style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: '#D4A96A', fontSize: '.75rem', letterSpacing: '.2em', padding: '0 24px 16px', borderBottom: '1px solid rgba(212,169,106,.2)', marginBottom: 12 }}>CONTENTS</div>
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            onClick={() => scrollTo(item.id)}
                            style={{ display: 'block', width: '100%', textAlign: 'left', padding: '10px 24px', color: activeSection === item.id ? '#D4A96A' : '#E0C898', background: activeSection === item.id ? 'rgba(212,169,106,.1)' : 'transparent', borderLeft: activeSection === item.id ? '2px solid #D4A96A' : '2px solid transparent', fontSize: '.82rem', letterSpacing: '.04em', cursor: 'pointer', border: 'none', transition: 'all .2s' }}
                        >
                            <span style={{ marginRight: 8 }}>{item.emoji}</span>{item.label}
                        </button>
                    ))}
                </nav>

                {/* コンテンツ */}
                <main style={{ flex: 1, padding: '52px 48px', maxWidth: 780, lineHeight: 1.8 }}>

                    {/* アプリ概要 */}
                    <section id="overview" style={{ marginBottom: 64 }}>
                        <SectionHeader emoji="🏠" title="アプリ概要" sub="Overview" />
                        <p style={{ color: '#7B5C3A', fontSize: '.9rem', marginBottom: 20 }}>
                            <strong>AI Bakery Manager</strong> は、店舗の業務をまるごとデジタル化するWebアプリです。レシートや日計表を撮影するだけで売上を自動集計し、顧客へのポイント付与・予約注文の管理・製造部門との連絡までワンストップで完結します。
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginTop: 20 }}>
                            {FEATURES.map((f, i) => (
                                <div key={i} style={{ background: '#FFF8EE', border: '1px solid #D6C4A8', borderRadius: 10, padding: 18, textAlign: 'center' }}>
                                    <span style={{ fontSize: '2rem', marginBottom: 8, display: 'block' }}>{f.emoji}</span>
                                    <div style={{ fontWeight: 700, fontSize: '.9rem', color: '#3D2B1F' }}>{f.title}</div>
                                    <div style={{ fontSize: '.75rem', color: '#7B5C3A', marginTop: 4, lineHeight: 1.5 }}>{f.desc}</div>
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* 技術スタック */}
                    <section id="tech" style={{ marginBottom: 64 }}>
                        <SectionHeader emoji="🛠️" title="技術スタック" sub="System Architecture" />
                        <ManualTable headers={['レイヤー', '技術', '役割']} rows={TECH_ROWS.map(r => [r.layer, r.tech, r.role])} />
                        <Callout icon="🔐"><strong>セキュリティ：</strong>APIキーはすべてSupabase Edge Functions（サーバーサイド）で管理されており、ブラウザには一切露出しません。</Callout>
                    </section>

                    {/* レシート読込 */}
                    <section id="analyze" style={{ marginBottom: 64 }}>
                        <SectionHeader emoji="📸" title="レシート読込" sub="Receipt Analyze" />
                        <Callout icon="💡">事前に<strong>マスタ管理</strong>で商品を登録しておくことで、かすれた文字も自動補正して正確に読み取ります。</Callout>
                        <SubHeading>📷 画像の取り込み方法（3種類）</SubHeading>
                        <Steps items={ANALYZE_INPUT_STEPS} />
                        <SubHeading>⚡ 解析〜保存の手順</SubHeading>
                        <Steps items={ANALYZE_SAVE_STEPS} />
                    </section>

                    {/* 顧客・予約管理 */}
                    <section id="customers" style={{ marginBottom: 64 }}>
                        <SectionHeader emoji="👥" title="顧客・予約管理" sub="Customers & Reservations" />
                        <p style={{ color: '#7B5C3A', fontSize: '.9rem', marginBottom: 20 }}>上部タブで「📋 顧客一覧」と「🥐 予約注文」を切り替えます。</p>
                        <SubHeading>📋 顧客一覧タブ</SubHeading>
                        <Steps items={CUSTOMER_LIST_STEPS} />
                        <SubHeading>🥐 予約注文タブ</SubHeading>
                        <Steps items={RESERVATION_STEPS} />
                    </section>

                    {/* 売上集計 */}
                    <section id="dashboard" style={{ marginBottom: 64 }}>
                        <SectionHeader emoji="📈" title="売上集計・月報出力" sub="Dashboard & Reports" />
                        <Steps items={DASHBOARD_STEPS} />
                        <Callout icon="📥"><strong>CSV・Excel出力：</strong>ダッシュボードの表はCSVとして出力可能。PDF化したい場合は「🖨️ 印刷」ボタンからPDF保存を選んでください。</Callout>
                    </section>

                    {/* マスタ管理 */}
                    <section id="master" style={{ marginBottom: 64 }}>
                        <SectionHeader emoji="📖" title="製品マスタ管理" sub="Product Master" />
                        <Steps items={MASTER_STEPS} />
                    </section>

                    {/* 業務連絡チャット */}
                    <section id="contact" style={{ marginBottom: 64 }}>
                        <SectionHeader emoji="👨‍🍳" title="製造実績・業務連絡" sub="Production & Chat" />
                        <Steps items={CHAT_STEPS} />
                    </section>

                    {/* 業務フロー全体図 */}
                    <section id="flow" style={{ marginBottom: 64 }}>
                        <SectionHeader emoji="🔄" title="業務フロー全体図" sub="Workflow Overview" />
                        <p style={{ fontSize: '.85rem', color: '#7B5C3A', letterSpacing: '.05em', marginBottom: 8 }}>■ 売上登録の流れ</p>
                        <FlowDiagram nodes={['📖 商品マスタ登録', '→', '📸 レシート・日計表解析', '→', '💾 売上を確定', '→', '📈 ダッシュボード反映']} />
                        <p style={{ fontSize: '.85rem', color: '#7B5C3A', letterSpacing: '.05em', marginTop: 20, marginBottom: 8 }}>■ 予約受付の流れ</p>
                        <FlowDiagram nodes={['📞 電話・来店で注文受付', '→', '🥐 予約注文を登録', '→', '受渡時に「完了」ボタン']} />
                        <p style={{ fontSize: '.85rem', color: '#7B5C3A', letterSpacing: '.05em', marginTop: 20, marginBottom: 8 }}>■ 製造部門の流れ</p>
                        <FlowDiagram nodes={['📈 販売・製造月報をチェック', '→', '👨‍🍳 厨房で製造', '→', '本日の製造実績を入力']} />
                    </section>

                    {/* よくある質問 */}
                    <section id="tips" style={{ marginBottom: 64 }}>
                        <SectionHeader emoji="💡" title="よくある質問" sub="FAQ" />
                        <ManualTable headers={['質問', '回答']} rows={FAQ_ROWS.map(r => [r.q, r.a])} />
                    </section>

                </main>
            </div>

            {/* フッター */}
            <footer style={{ background: '#3D2B1F', color: 'rgba(212,169,106,.5)', textAlign: 'center', padding: '20px', fontSize: '.75rem', letterSpacing: '.1em' }}>
                AI Bakery Manager — 操作マニュアル &nbsp;|&nbsp; Confidential Internal Document
            </footer>
        </div>
    );
}