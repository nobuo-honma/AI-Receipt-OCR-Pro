import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
    const [ranking, setRanking] = useState<{ name: string, totalSales: number, totalQty: number }[]>([]);

    const fetchRanking = async () => {
        const { data } = await supabase.from('scan_items').select('name, subtotal, quantity');
        if (data) {
            const agg: Record<string, any> = {};
            data.forEach(i => { if (!agg[i.name]) agg[i.name] = { name: i.name, totalSales: 0, totalQty: 0 }; agg[i.name].totalSales += i.subtotal; agg[i.name].totalQty += i.quantity; });
            setRanking(Object.values(agg).sort((a, b) => b.totalSales - a.totalSales).slice(0, 10));
        }
    };
    useEffect(() => { fetchRanking(); }, []);

    const handleDeleteAll = async () => {
        if (window.confirm("全ての履歴を削除しますか？")) {
            await supabase.from('scan_items').delete().neq('id', 0);
            await supabase.from('scan_sessions').delete().neq('id', 0);
            fetchRanking();
        }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-4 border-b-2 pb-4">
                <h1 className="text-3xl font-bold text-bakery-textMain">📈 売上集計ダッシュボード</h1>
                {ranking.length > 0 && <button onClick={handleDeleteAll} className="border-2 border-red-400 text-red-500 px-4 py-2 rounded font-bold">🗑️ 履歴全削除</button>}
            </div>

            <div className="flex items-start gap-2 bg-[#FFF8E7] border border-bakery-border/50 text-[#8B6340] text-sm p-3 rounded-lg mb-8">
                <span className="text-bakery-gold text-lg leading-none mt-0.5">💡</span>
                <p className="leading-relaxed">「レシート読込」画面で保存されたデータが集計され、売れ筋商品が自動的にランキング化されます。</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-white p-6 rounded-lg shadow border h-80"><ResponsiveContainer><BarChart data={ranking} layout="vertical"><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#3D2B1F' }} /><Tooltip formatter={(v: number | undefined) => v != null ? [`￥${v}`, "売上"] : ["", "売上"]} /><Bar dataKey="totalSales">{ranking.map((_, i) => <Cell key={i} fill="#8B5E3C" />)}</Bar></BarChart></ResponsiveContainer></div>
                <div className="bg-white p-6 rounded-lg shadow border h-80"><ResponsiveContainer><BarChart data={[...ranking].sort((a, b) => b.totalQty - a.totalQty)} layout="vertical"><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#3D2B1F' }} /><Tooltip formatter={(v: number | undefined) => v != null ? [`${v}個`, "個数"] : ["", "個数"]} /><Bar dataKey="totalQty">{ranking.map((_, i) => <Cell key={i} fill="#D4A96A" />)}</Bar></BarChart></ResponsiveContainer></div>
            </div>
        </div>
    );
}