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
    { id: 'dashboard', emoji: '📈', label: '売上集計' },
    { id: 'master', emoji: '📖', label: 'マスタ管理' },
    { id: 'chat', emoji: '💬', label: '業務連絡チャット' },
    { id: 'flow', emoji: '🔄', label: '業務フロー全体図' },
    { id: 'tips', emoji: '💡', label: 'よくある質問' },
];

const FEATURES = [
    { emoji: '📸', title: 'レシート解析', desc: 'OCRで商品名・金額を自動読み取り' },
    { emoji: '👥', title: '顧客管理', desc: '会員登録・ポイント付与・宛名印刷' },
    { emoji: '🥐', title: '予約注文', desc: '電話・店頭の注文を一元管理' },
    { emoji: '📈', title: '売上集計', desc: '商品別ランキングをグラフで可視化' },
    { emoji: '📖', title: 'マスタ管理', desc: '商品名・価格の登録・編集' },
    { emoji: '💬', title: '業務チャット', desc: '販売スタッフ↔厨房のリアルタイム連絡' },
];

const TECH_ROWS: TechRow[] = [
    { layer: 'フロントエンド', tech: 'React / TypeScript / Vite', role: '高速なSPA（シングルページアプリ）を構築。型安全な開発で品質を担保。' },
    { layer: 'データベース', tech: 'Supabase（PostgreSQL）', role: '顧客・商品・予約・チャットなど全データをクラウドで管理。リアルタイム同期機能を利用。' },
    { layer: 'OCR / AI解析', tech: 'Google Cloud Vision API', role: 'レシート画像から文字を読み取り（OCR）。Supabase Edge Functionsを経由して呼び出す。' },
    { layer: 'マスタ補正ロジック', tech: '独自アルゴリズム（クライアント側）', role: 'OCR結果とマスタ商品名を照合し、かすれ・誤読を自動補正して正確な商品名・金額に変換。' },
    { layer: 'リアルタイム通信', tech: 'Supabase Realtime', role: 'チャットおよびスマホ→PC画像転送に利用。WebSocketで即時同期。' },
    { layer: 'スマホ転送', tech: 'QRコード + Supabase DB', role: 'スマホで撮影した画像をBase64でDBに書き込み → PCが自動受信して削除する仕組み。' },
    { layer: '印刷機能', tech: 'ブラウザ標準 Print API', role: 'A4・21面シール（70×42.3mm）対応の宛名ラベルをCSSで制御して印刷。' },
];

const ANALYZE_INPUT_STEPS: StepItem[] = [
    { num: 'A', title: 'カメラで直接撮影', desc: '「📷 カメラ」ボタンをタップ → カメラが起動したらレシートにかざす → 画面下の白いシャッターボタンを押して撮影。' },
    { num: 'B', title: 'ファイルを選択', desc: '「📁 ファイル」ボタンをタップ → PCやスマホの画像ファイル（JPEG / PNG）を選択。' },
    { num: 'C', title: <>スマホから転送 <Badge>便利</Badge></>, desc: '「📱 スマホ転送」ボタンをタップ → QRコードが表示される → スマホでスキャンして専用ページを開き撮影 → 画像が自動でPCに届きます。' },
];

const ANALYZE_SAVE_STEPS: StepItem[] = [
    { num: 1, title: '解析を実行', desc: '画像を取り込んだら「⚡ 解析を実行」ボタンを押す。AIがレシートを読み取り、商品リストと合計金額が右側に表示されます。' },
    { num: 2, title: '内容を確認', desc: '商品名・数量・金額が正しいか確認します。複数のレシートを続けて解析すると自動で合算されます。' },
    { num: 3, title: '履歴に保存', desc: '「✨ 履歴に保存」ボタンを押すと売上データが確定し、ダッシュボードの集計に反映されます。一度保存するとボタンが「✅ 保存済み」に変わります。' },
    { num: 4, title: 'ポイント付与（任意）', desc: '顧客をドロップダウンから選び「⭐ 購買記録 & 1% ポイント付与」を押すと、購買履歴の保存と同時にポイントが付与されます。' },
];

const CUSTOMER_LIST_STEPS: StepItem[] = [
    { num: 1, title: '新規顧客の登録', desc: '「➕ 新規顧客」ボタン → 氏名（必須）・電話番号・住所を入力して「登録する」を押します。' },
    { num: 2, title: '検索', desc: '検索欄に名前・電話番号・住所の一部を入力するとリアルタイムで絞り込みができます。' },
    { num: 3, title: '宛名ラベルの印刷', desc: '「🖨️ ラベル印刷」ボタンを押すと現在表示中の顧客の宛名ラベルが印刷用レイアウトで出力されます（住所登録が必要）。' },
    { num: 4, title: '顧客の削除', desc: 'カードにカーソルを当てると右上に 🗑️ アイコンが表示されます。確認ダイアログの後に削除されます。' },
];

const RESERVATION_STEPS: StepItem[] = [
    { num: 1, title: '予約を入力', desc: <>「🥐 予約注文を入れる」ボタン → お客様を会員リストから選択<strong>または</strong>直接名前・電話番号を入力（非会員OK）。</> },
    { num: 2, title: '商品と受渡日時を選択', desc: '受渡日・受渡時刻を入力し、商品を「＋」「−」ボタンで数量を指定します（マスタ登録済み商品から選択）。' },
    { num: 3, title: 'ステータス管理', desc: <>一覧の「完了」ボタンで<strong>受渡済み</strong>、「取消」で<strong>キャンセル</strong>に変更できます。キャンセルは薄く表示されます。</> },
];

const MASTER_STEPS: StepItem[] = [
    { num: 1, title: '商品を新規登録', desc: '「➕ 新規商品」ボタン → 商品名・単価を入力して「登録」を押します。同名の商品は登録できません。' },
    { num: 2, title: '商品を編集', desc: '一覧の「編集」ボタンを押すと行内でインライン編集が可能になります。修正後「保存」を押して確定。' },
    { num: 3, title: '商品を削除', desc: '「削除」ボタン → 確認ダイアログ → 削除されます。削除した商品の過去データには影響しません。' },
];

const CHAT_STEPS: StepItem[] = [
    { num: 1, title: '自分の役割を選択', desc: '右上の「🛒 販売」または「🥖 製造」ボタンを押して自分の立場を設定します。これにより吹き出しの位置（右＝自分、左＝相手）が変わります。' },
    { num: 2, title: 'メッセージを送信', desc: '下部の入力欄にメッセージを入力し「送信」ボタン（またはEnterキー）を押します。' },
    { num: 3, title: 'リアルタイム受信', desc: '相手が送ったメッセージは自動的に画面に追加されます（手動更新は不要）。' },
];

const GRAPH_ROWS: GraphRow[] = [
    { graph: '左グラフ（茶色）', content: <>商品別<strong>売上金額</strong>ランキング（上位10品）。金額が高い順に横棒グラフで表示。</> },
    { graph: '右グラフ（金色）', content: <>商品別<strong>販売数量</strong>ランキング（上位10品）。数が多い順に横棒グラフで表示。</> },
];

const FAQ_ROWS: FaqRow[] = [
    { q: '商品が読み取れなかった', a: 'マスタ管理で商品名が正確に登録されているか確認してください。レシートの印字とマスタ名が一致しないと検出できません。' },
    { q: '同じ商品が重複して表示される', a: '解析時に自動で合算されます。もし重複が起きた場合は「クリア」して再度解析してください。' },
    { q: '非会員のお客様に予約を入れたい', a: '予約注文の「会員から選択」プルダウンを空のまま、直接名前と電話番号を入力すると非会員でも登録できます。' },
    { q: 'スマホ転送がうまくいかない', a: 'PCとスマホが同じネットワーク（Wi-Fi）に接続されているか確認してください。また、ブラウザのカメラ許可が必要です。' },
    { q: 'ポイントの付与率を変えたい', a: '現在は購入金額の1%固定です。変更する場合は開発者にお問い合わせください。' },
    { q: 'ダッシュボードに何も表示されない', a: 'レシート読込画面で「✨ 履歴に保存」を押してデータを確定させてください。解析しただけでは集計に反映されません。' },
];

// ── 共通コンポーネント ─────────────────────────────

function Badge({ children }: { children: React.ReactNode }) {
    return (
        <span style={{
            display: 'inline-block',
            background: '#D4A96A',
            color: '#3D2B1F',
            fontSize: '.7rem',
            fontWeight: 700,
            padding: '2px 8px',
            borderRadius: 4,
            letterSpacing: '.05em',
            verticalAlign: 'middle',
            marginLeft: 4,
        }}>{children}</span>
    );
}

function SectionHeader({ emoji, title, sub }: { emoji: string; title: string; sub: string }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: 14,
            marginBottom: 28, paddingBottom: 16,
            borderBottom: '2px solid #D6C4A8',
        }}>
            <span style={{ fontSize: '2rem', lineHeight: 1 }}>{emoji}</span>
            <div>
                <div style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '1.6rem', fontWeight: 700,
                    color: '#3D2B1F',
                }}>{title}</div>
                <div style={{ fontSize: '.75rem', color: '#7B5C3A', letterSpacing: '.1em', marginTop: 2 }}>{sub}</div>
            </div>
        </div>
    );
}

function Callout({ icon, children }: { icon: string; children: React.ReactNode }) {
    return (
        <div style={{
            background: '#FFF8E7',
            border: '1px solid #E0C898',
            borderLeft: '4px solid #D4A96A',
            borderRadius: 8,
            padding: '14px 18px',
            margin: '20px 0',
            fontSize: '.85rem',
            color: '#6B4226',
            lineHeight: 1.7,
        }}>
            <span style={{ marginRight: 6 }}>{icon}</span>{children}
        </div>
    );
}

function Steps({ items }: { items: StepItem[] }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {items.map((item, i) => (
                <div key={i} style={{
                    display: 'grid', gridTemplateColumns: '40px 1fr', gap: 16,
                    alignItems: 'start',
                    background: '#FFF8EE', border: '1px solid #D6C4A8',
                    borderRadius: 10, padding: '18px 20px',
                }}>
                    <div style={{
                        width: 40, height: 40,
                        background: '#3D2B1F', color: '#D4A96A',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: "'Playfair Display', serif",
                        fontSize: '1rem', fontWeight: 700, flexShrink: 0,
                    }}>{item.num}</div>
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
                        <th key={i} style={{
                            background: '#3D2B1F', color: '#D4A96A',
                            padding: '10px 14px', textAlign: 'left',
                            fontWeight: 700, letterSpacing: '.05em',
                        }}>{h}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {rows.map((row, ri) => (
                    <tr key={ri}>
                        {row.map((cell, ci) => (
                            <td key={ci} style={{
                                padding: '10px 14px',
                                borderBottom: '1px solid #D6C4A8',
                                color: ci === 0 ? '#3D2B1F' : '#7B5C3A',
                                fontWeight: ci === 0 ? 700 : 400,
                                background: ri % 2 === 1 ? '#FFF8EE' : 'white',
                                verticalAlign: 'top',
                            }}>{cell}</td>
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
                    : <div key={i} style={{
                        background: '#3D2B1F', color: '#E0C898',
                        borderRadius: 8, padding: '8px 16px',
                        fontSize: '.8rem', fontWeight: 700, whiteSpace: 'nowrap',
                    }}>{n}</div>
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
            <div style={{
                background: '#3D2B1F',
                color: '#FDF6E3',
                padding: '56px 40px 44px',
                textAlign: 'center',
                position: 'relative',
                overflow: 'hidden',
            }}>
                <div style={{
                    position: 'absolute', inset: 0,
                    backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 40px, rgba(212,169,106,0.04) 40px, rgba(212,169,106,0.04) 41px)',
                }} />
                <p style={{ fontFamily: "'Playfair Display', serif", fontStyle: 'italic', color: '#D4A96A', letterSpacing: '.2em', fontSize: '1rem', marginBottom: 12, position: 'relative' }}>
                    Operations Manual
                </p>
                <h1 style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: 'clamp(1.6rem, 5vw, 2.8rem)',
                    fontWeight: 700, letterSpacing: '.08em',
                    position: 'relative', marginBottom: 10,
                }}>🥐 AI Bakery Manager</h1>
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
                <nav style={{
                    width: 240, flexShrink: 0,
                    background: '#3D2B1F',
                    position: 'sticky', top: 0,
                    height: '100vh', overflowY: 'auto',
                    padding: '32px 0',
                }}>
                    <div style={{
                        fontFamily: "'Playfair Display', serif", fontStyle: 'italic',
                        color: '#D4A96A', fontSize: '.75rem', letterSpacing: '.2em',
                        padding: '0 24px 16px',
                        borderBottom: '1px solid rgba(212,169,106,.2)',
                        marginBottom: 12,
                    }}>CONTENTS</div>
                    {NAV_ITEMS.map(item => (
                        <button
                            key={item.id}
                            onClick={() => scrollTo(item.id)}
                            style={{
                                display: 'block', width: '100%', textAlign: 'left',
                                padding: '10px 24px',
                                color: activeSection === item.id ? '#D4A96A' : '#E0C898',
                                background: activeSection === item.id ? 'rgba(212,169,106,.1)' : 'transparent',
                                borderLeft: activeSection === item.id ? '2px solid #D4A96A' : '2px solid transparent',
                                fontSize: '.82rem', letterSpacing: '.04em',
                                cursor: 'pointer', border: 'none',
                                fontFamily: "'Noto Serif JP', serif",
                                transition: 'all .2s',
                            }}
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
                            <strong>AI Bakery Manager</strong> は、ベーカリー業務をまるごとデジタル化するWebアプリです。レシートをカメラで撮影するだけで売上を自動集計し、顧客へのポイント付与・予約注文の管理・厨房との連絡までワンストップで完結します。
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginTop: 20 }}>
                            {FEATURES.map((f, i) => (
                                <div key={i} style={{
                                    background: '#FFF8EE', border: '1px solid #D6C4A8',
                                    borderRadius: 10, padding: 18, textAlign: 'center',
                                }}>
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
                        <p style={{ color: '#7B5C3A', fontSize: '.9rem', marginBottom: 20 }}>
                            本システムは<strong>完全サーバーレス構成</strong>で動作します。月額サーバー費用ゼロで、高速・セキュアな店舗DXを実現しています。
                        </p>
                        <ManualTable
                            headers={['レイヤー', '技術', '役割']}
                            rows={TECH_ROWS.map(r => [r.layer, r.tech, r.role])}
                        />
                        <Callout icon="🔐">
                            <strong>セキュリティ：</strong>APIキーはすべてSupabase Edge Functions（サーバーサイド）で管理されており、ブラウザには一切露出しません。
                        </Callout>
                    </section>

                    {/* レシート読込 */}
                    <section id="analyze" style={{ marginBottom: 64 }}>
                        <SectionHeader emoji="📸" title="レシート読込" sub="Receipt Analyze" />
                        <Callout icon="💡">
                            事前に<strong>マスタ管理</strong>で商品を登録しておくことで、かすれた文字も自動補正して正確に読み取ります。
                        </Callout>
                        <SubHeading>📷 画像の取り込み方法（3種類）</SubHeading>
                        <Steps items={ANALYZE_INPUT_STEPS} />
                        <SubHeading>⚡ 解析〜保存の手順</SubHeading>
                        <Steps items={ANALYZE_SAVE_STEPS} />
                        <Callout icon="⚠️">
                            <strong>注意：</strong>「クリア」ボタンを押すと解析結果がリセットされます。保存前に押してしまわないよう注意してください。
                        </Callout>
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
                        <SectionHeader emoji="📈" title="売上集計ダッシュボード" sub="Sales Dashboard" />
                        <p style={{ color: '#7B5C3A', fontSize: '.9rem', marginBottom: 20 }}>レシート読込で保存した全データが自動集計されます。操作は基本的に「見るだけ」です。</p>
                        <ManualTable
                            headers={['グラフ', '内容']}
                            rows={GRAPH_ROWS.map(r => [r.graph, r.content])}
                        />
                        <Callout icon="🗑️">
                            <strong>履歴全削除：</strong>ページ右上の「🗑️ 履歴全削除」ボタンを押すと全スキャン履歴が削除されます。この操作は取り消せないため注意してください。
                        </Callout>
                    </section>

                    {/* マスタ管理 */}
                    <section id="master" style={{ marginBottom: 64 }}>
                        <SectionHeader emoji="📖" title="製品マスタ管理" sub="Product Master" />
                        <Callout icon="💡">
                            マスタ登録が先！ 商品を登録しておくことでレシートのOCR精度が大幅に向上し、予約注文の商品選択にも連動します。
                        </Callout>
                        <Steps items={MASTER_STEPS} />
                    </section>

                    {/* 業務連絡チャット */}
                    <section id="chat" style={{ marginBottom: 64 }}>
                        <SectionHeader emoji="💬" title="業務連絡チャット" sub="Staff Chat" />
                        <p style={{ color: '#7B5C3A', fontSize: '.9rem', marginBottom: 20 }}>
                            販売スタッフと厨房スタッフがリアルタイムでメッセージをやり取りできます。ページを開いたまま別タブで作業していても、新しいメッセージは自動で届きます。
                        </p>
                        <Steps items={CHAT_STEPS} />
                        <Callout icon="⚠️">
                            <strong>注意：</strong>チャット履歴は直近50件のみ表示されます。重要な連絡は別途メモに残してください。
                        </Callout>
                    </section>

                    {/* 業務フロー全体図 */}
                    <section id="flow" style={{ marginBottom: 64 }}>
                        <SectionHeader emoji="🔄" title="業務フロー全体図" sub="Workflow Overview" />
                        <p style={{ fontSize: '.85rem', color: '#7B5C3A', letterSpacing: '.05em', marginBottom: 8 }}>■ 売上登録の流れ</p>
                        <FlowDiagram nodes={['📖 商品マスタ登録', '→', '📸 レシート撮影・解析', '→', '✨ 履歴に保存', '→', '📈 ダッシュボード反映']} />
                        <p style={{ fontSize: '.85rem', color: '#7B5C3A', letterSpacing: '.05em', marginTop: 20, marginBottom: 8 }}>■ ポイント付与の流れ</p>
                        <FlowDiagram nodes={['👥 顧客登録', '→', '📸 レシート解析・保存', '→', '顧客を選択', '→', '⭐ 1%ポイント付与']} />
                        <p style={{ fontSize: '.85rem', color: '#7B5C3A', letterSpacing: '.05em', marginTop: 20, marginBottom: 8 }}>■ 予約受付の流れ</p>
                        <FlowDiagram nodes={['📞 電話・来店で注文受付', '→', '🥐 予約注文を登録', '→', '受渡時に「完了」']} />
                    </section>

                    {/* よくある質問 */}
                    <section id="tips" style={{ marginBottom: 64 }}>
                        <SectionHeader emoji="💡" title="よくある質問" sub="FAQ" />
                        <ManualTable
                            headers={['質問', '回答']}
                            rows={FAQ_ROWS.map(r => [r.q, r.a])}
                        />
                    </section>

                </main>
            </div>

            {/* フッター */}
            <footer style={{
                background: '#3D2B1F',
                color: 'rgba(212,169,106,.5)',
                textAlign: 'center',
                padding: '20px',
                fontSize: '.75rem',
                letterSpacing: '.1em',
            }}>
                AI Bakery Manager — 操作マニュアル &nbsp;|&nbsp; Confidential Internal Document
            </footer>
        </div>
    );
}