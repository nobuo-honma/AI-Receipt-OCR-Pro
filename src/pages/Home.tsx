// src/pages/Home.tsx
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase'; // ← Supabase接続設定を読み込む

// データの型（TypeScriptならではの安全設計）
type KpiStats = {
    scanCount: number;
    totalSales: number;
    customerCount: number;
    totalPoints: number;
};

export default function Home() {
    // 画面に表示する数字（状態）を持たせる。初期値はすべて 0。
    const [stats, setStats] = useState<KpiStats>({
        scanCount: 0,
        totalSales: 0,
        customerCount: 0,
        totalPoints: 0,
    });

    // データ取得中かどうかを判定するフラグ
    const [loading, setLoading] = useState(true);

    // 画面が開かれた時に1回だけ実行される処理 (useEffect)
    useEffect(() => {
        const fetchStats = async () => {
            try {
                // 1. スキャン履歴（scan_sessions）から件数と売上合計を取得
                const { data: sessionData, error: sessionErr } = await supabase
                    .from('scan_sessions')
                    .select('total_amt');

                let scanCount = 0;
                let totalSales = 0;
                if (!sessionErr && sessionData) {
                    scanCount = sessionData.length;
                    totalSales = sessionData.reduce((sum, row) => sum + (row.total_amt || 0), 0);
                }

                // 2. 顧客データ（customers）から顧客数とポイント合計を取得
                const { data: customerData, error: customerErr } = await supabase
                    .from('customers')
                    .select('points');

                let customerCount = 0;
                let totalPoints = 0;
                if (!customerErr && customerData) {
                    customerCount = customerData.length;
                    totalPoints = customerData.reduce((sum, row) => sum + (row.points || 0), 0);
                }

                // 取ってきた数字を画面用の変数（ステート）にセット！
                setStats({
                    scanCount,
                    totalSales,
                    customerCount,
                    totalPoints,
                });

            } catch (err) {
                console.error("データの取得に失敗しました", err);
            } finally {
                setLoading(false); // 読み込み完了
            }
        };

        fetchStats();
    }, []);

    // 数字をコンマ区切り（例: 10000 → 10,000）にする便利関数
    const formatNum = (num: number) => num.toLocaleString();

    return (
        <div className="min-h-screen pb-10">
            {/* ヒーローセクション */}
            <div className="bg-hero-gradient text-center px-10 pt-14 pb-12 shadow-lg">
                <p className="font-playfair italic text-[#D4A96A] tracking-[0.12em] text-lg mb-2">Welcome to</p>
                <h1 className="font-zen font-black text-[#FDF6E3] text-4xl tracking-wider mb-3">🧾 AI Receipt OCR Pro</h1>
                <p className="font-zen text-[#C4A882] tracking-widest text-sm">レシートOCR ・ 顧客管理 ・ 売上集計</p>
            </div>

            {/* KPIバー (データベースから取得した数字を表示) */}
            <div className="bg-[#2C1A0E] flex flex-wrap justify-center py-5 px-4 md:px-10 shadow-inner gap-y-4">
                {loading ? (
                    // 読み込み中は「...」を表示
                    <p className="text-[#8B6340] text-sm animate-pulse">データを取得中...</p>
                ) : (
                    <>
                        <div className="flex-1 min-w-[120px] max-w-[200px] text-center px-2 md:px-5 border-r border-[#4A2E1A]">
                            <p className="font-playfair italic text-[#8B6340] text-xs tracking-widest mb-1">Total Scans</p>
                            <p className="font-zen font-bold text-[#D4A96A] text-xl">{formatNum(stats.scanCount)} 回</p>
                        </div>
                        <div className="flex-1 min-w-[120px] max-w-[200px] text-center px-2 md:px-5 border-r border-[#4A2E1A]">
                            <p className="font-playfair italic text-[#8B6340] text-xs tracking-widest mb-1">Total Sales</p>
                            <p className="font-zen font-bold text-[#D4A96A] text-xl">￥{formatNum(stats.totalSales)}</p>
                        </div>
                        <div className="flex-1 min-w-[120px] max-w-[200px] text-center px-2 md:px-5 border-r border-[#4A2E1A]">
                            <p className="font-playfair italic text-[#8B6340] text-xs tracking-widest mb-1">Customers</p>
                            <p className="font-zen font-bold text-[#D4A96A] text-xl">{formatNum(stats.customerCount)} 人</p>
                        </div>
                        <div className="flex-1 min-w-[120px] max-w-[200px] text-center px-2 md:px-5">
                            <p className="font-playfair italic text-[#8B6340] text-xs tracking-widest mb-1">Points Issued</p>
                            <p className="font-zen font-bold text-[#D4A96A] text-xl">{formatNum(stats.totalPoints)} pt</p>
                        </div>
                    </>
                )}
            </div>

            {/* セクション見出し */}
            <div className="flex items-center justify-center gap-3 my-10 px-4">
                <div className="h-px w-24 bg-linear-to-r from-transparent to-[#C4A882]"></div>
                <p className="font-playfair italic text-[#9B7B52] tracking-[0.14em] text-sm">— Main Menu —</p>
                <div className="h-px w-24 bg-linear-to-l from-transparent to-[#C4A882]"></div>
            </div>

            {/* メニューカードのグリッド */}
            <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-4">

                {/* レシート解析 (大きく横長) */}
                <Link to="/analyze" className="md:col-span-2 group">
                    <div className="relative flex flex-col h-full min-h-[180px] p-7 bg-card-wide border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_10px_28px_rgba(61,43,31,0.15)] group-hover:bg-card-wide-hover group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-2xl text-bakery-textMain">Receipt</span>
                        <span className="font-zen font-bold tracking-widest text-bakery-textMain mt-1">レシート解析</span>
                        <span className="font-zen text-xs text-[#7B5C3A] leading-relaxed mt-3">カメラまたはファイルでレシートをスキャン。<br />商品名・金額を自動で読み取ります。</span>
                        <span className="absolute bottom-3 right-3 bg-bakery-textMain text-bakery-gold font-zen font-bold text-[10px] px-3 py-1 rounded tracking-wider transition-colors group-hover:bg-bakery-danger group-hover:text-white">OPEN ▶</span>
                    </div>
                </Link>

                {/* 顧客管理 */}
                <Link to="/customers" className="group">
                    <div className="relative flex flex-col items-center justify-center h-full min-h-[180px] p-6 bg-bakery-surface border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:bg-[#FFF8E7] group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-2xl text-bakery-textMain">Customers</span>
                        <span className="font-zen font-bold tracking-widest text-bakery-textMain mt-1">顧客管理</span>
                        <span className="text-4xl mt-3">👥</span>
                        <span className="absolute bottom-3 right-3 bg-bakery-textMain text-bakery-gold font-zen font-bold text-[10px] px-3 py-1 rounded tracking-wider transition-colors group-hover:bg-bakery-danger group-hover:text-white">OPEN ▶</span>
                    </div>
                </Link>

                {/* 👇 ここから下が抜け落ちていたカードです 👇 */}

                {/* 売上集計（ダッシュボード） */}
                <Link to="/dashboard" className="group">
                    <div className="relative flex flex-col items-center justify-center h-full min-h-[180px] p-6 bg-bakery-surface border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:bg-[#FFF8E7] group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-2xl text-bakery-textMain">Dashboard</span>
                        <span className="font-zen font-bold tracking-widest text-bakery-textMain mt-1">売上集計</span>
                        <span className="text-4xl mt-3">📈</span>
                        <span className="absolute bottom-3 right-3 bg-bakery-textMain text-bakery-gold font-zen font-bold text-[10px] px-3 py-1 rounded tracking-wider transition-colors group-hover:bg-bakery-danger group-hover:text-white">OPEN ▶</span>
                    </div>
                </Link>

                {/* マスタ管理 */}
                <Link to="/master" className="group">
                    <div className="relative flex flex-col items-center justify-center h-full min-h-[180px] p-6 bg-bakery-surface border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:bg-[#FFF8E7] group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-2xl text-bakery-textMain">Menu</span>
                        <span className="font-zen font-bold tracking-widest text-bakery-textMain mt-1">マスタ管理</span>
                        <span className="text-4xl mt-3">📖</span>
                        <span className="absolute bottom-3 right-3 bg-bakery-textMain text-bakery-gold font-zen font-bold text-[10px] px-3 py-1 rounded tracking-wider transition-colors group-hover:bg-bakery-danger group-hover:text-white">OPEN ▶</span>
                    </div>
                </Link>

                {/* お問い合わせ（必要に応じて変更） */}
                <Link to="/contact" className="group">
                    <div className="relative flex flex-col items-center justify-center h-full min-h-[180px] p-6 bg-bakery-surface border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:bg-[#FFF8E7] group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-2xl text-bakery-textMain">Contact</span>
                        <span className="font-zen font-bold tracking-widest text-bakery-textMain mt-1">お問い合わせ</span>
                        <span className="text-4xl mt-3">📞</span>
                        <span className="absolute bottom-3 right-3 bg-bakery-textMain text-bakery-gold font-zen font-bold text-[10px] px-3 py-1 rounded tracking-wider transition-colors group-hover:bg-bakery-danger group-hover:text-white">OPEN ▶</span>
                    </div>
                </Link>

            </div>
        </div>
    );
}