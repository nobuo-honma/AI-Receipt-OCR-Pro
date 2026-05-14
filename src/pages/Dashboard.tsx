// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type RankingItem = { name: string; totalSales: number; totalQty: number; };

export default function Dashboard() {
    const [ranking, setRanking] = useState<RankingItem[]>([]);
    const [loading, setLoading] = useState(true);

    // 初回データ取得
    const fetchRanking = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('scan_items').select('name, subtotal, quantity');
        if (!error && data) {
            const agg: Record<string, RankingItem> = {};
            data.forEach(item => {
                if (!agg[item.name]) agg[item.name] = { name: item.name, totalSales: 0, totalQty: 0 };
                agg[item.name].totalSales += item.subtotal;
                agg[item.name].totalQty += item.quantity;
            });
            const sorted = Object.values(agg).sort((a, b) => b.totalSales - a.totalSales).slice(0, 10);
            setRanking(sorted);
        }
        setLoading(false);
    };

    useEffect(() => { fetchRanking(); }, []);

    // ⚠️ 履歴をすべて削除する
    const handleDeleteAll = async () => {
        if (window.confirm("本当にすべてのスキャン履歴と売上データを削除しますか？\n（※顧客データは消えません）")) {
            await supabase.from('scan_items').delete().neq('id', 0); // 全件削除のハック
            await supabase.from('scan_sessions').delete().neq('id', 0);
            alert("すべての売上履歴を削除しました！");
            fetchRanking(); // 画面を更新してグラフを消す
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-8 border-b-2 border-bakery-border pb-4">
                <h1 className="text-3xl font-bold text-bakery-textMain">📈 売上集計ダッシュボード</h1>
                {/* 👇 全削除ボタンを追加 */}
                {ranking.length > 0 && (
                    <button onClick={handleDeleteAll} className="border-2 border-bakery-danger text-bakery-danger px-4 py-2 rounded-md font-bold hover:bg-red-50 transition-colors">
                        🗑️ 履歴を全て削除
                    </button>
                )}
            </div>

            {loading ? (
                <p className="text-bakery-textMain animate-pulse">データを集計中...</p>
            ) : ranking.length === 0 ? (
                <div className="border-2 border-dashed border-bakery-border p-16 text-center rounded-lg text-[#8B6340] bg-bakery-surface">
                    <p className="text-4xl mb-4">📊</p><p>まだ解析データがありません。</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    {/* 売上グラフ */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-bakery-border">
                        <h2 className="text-lg font-bold text-bakery-textMain mb-6">💰 売上金額 TOP {ranking.length}</h2>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={ranking} layout="vertical" margin={{ left: 40, right: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#3D2B1F', fontSize: 12 }} />
                                    <Tooltip formatter={(val: any) => [`￥${Number(val).toLocaleString()}`, "売上"]} contentStyle={{ backgroundColor: '#FDF0D5', borderColor: '#E0C898', borderRadius: '8px' }} />
                                    <Bar dataKey="totalSales" radius={[0, 4, 4, 0]}>
                                        {ranking.map((_, i) => <Cell key={i} fill="#8B5E3C" />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    {/* 個数グラフ */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border border-bakery-border">
                        <h2 className="text-lg font-bold text-bakery-textMain mb-6">📦 販売個数 TOP {ranking.length}</h2>
                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[...ranking].sort((a, b) => b.totalQty - a.totalQty)} layout="vertical" margin={{ left: 40, right: 20 }}>
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#3D2B1F', fontSize: 12 }} />
                                    <Tooltip formatter={(val: any) => [`${Number(val).toLocaleString()} 個`, "個数"]} contentStyle={{ backgroundColor: '#FDF0D5', borderColor: '#E0C898', borderRadius: '8px' }} />
                                    <Bar dataKey="totalQty" radius={[0, 4, 4, 0]}>
                                        {ranking.map((_, i) => <Cell key={i} fill="#D4A96A" />)}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}