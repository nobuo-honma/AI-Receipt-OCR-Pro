// src/pages/Dashboard.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function Dashboard() {
    const [ranking, setRanking] = useState<{ name: string, totalSales: number, totalQty: number }[]>([]);
    const [dailyData, setDailyData] = useState<{ dates: string[], items: Record<string, Record<string, number>> }>({ dates: [], items: {} });

    const [startDate, setStartDate] = useState(() => {
        const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
    });
    const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

    const fetchData = async () => {
        const { data: sessionData } = await supabase.from('scan_sessions').select('id, scanned_at')
            .gte('scanned_at', `${startDate} 00:00:00`).lte('scanned_at', `${endDate} 23:59:59`);

        if (sessionData && sessionData.length > 0) {
            const sessionDateMap: Record<number, string> = {};
            const uniqueDates = new Set<string>();
            sessionData.forEach(s => { const dateOnly = s.scanned_at.split(' ')[0]; sessionDateMap[s.id] = dateOnly; uniqueDates.add(dateOnly); });
            const sortedDates = Array.from(uniqueDates).sort();

            const sessionIds = sessionData.map(s => s.id);
            const { data: itemsData } = await supabase.from('scan_items').select('session_id, name, subtotal, quantity').in('session_id', sessionIds);

            if (itemsData) {
                const agg: Record<string, any> = {};
                const crossTable: Record<string, Record<string, number>> = {};

                itemsData.forEach(item => {
                    if (!agg[item.name]) agg[item.name] = { name: item.name, totalSales: 0, totalQty: 0 };
                    agg[item.name].totalSales += item.subtotal; agg[item.name].totalQty += item.quantity;

                    const itemDate = sessionDateMap[item.session_id];
                    if (!crossTable[item.name]) crossTable[item.name] = {};
                    if (!crossTable[item.name][itemDate]) crossTable[item.name][itemDate] = 0;
                    crossTable[item.name][itemDate] += item.quantity;
                });

                setRanking(Object.values(agg).sort((a, b) => b.totalSales - a.totalSales).slice(0, 10));
                setDailyData({ dates: sortedDates, items: crossTable });
            }
        } else {
            setRanking([]); setDailyData({ dates: [], items: {} });
        }
    };

    useEffect(() => { fetchData(); }, [startDate, endDate]);

    const handleDeleteAll = async () => {
        if (window.confirm("本当に全ての履歴を削除しますか？\n（※顧客データは消えません）")) {
            await supabase.from('scan_items').delete().neq('id', 0);
            await supabase.from('scan_sessions').delete().neq('id', 0);
            fetchData();
        }
    };

    // ⭐️ 新規追加：Excel(CSV) 出力機能
    const exportToExcel = () => {
        // ヘッダー（日付）の作成
        let csvContent = '商品名,期間合計個数,' + dailyData.dates.join(',') + '\n';

        // データ（商品名と個数）の作成
        Object.entries(dailyData.items).forEach(([itemName, dateMap]) => {
            const total = Object.values(dateMap).reduce((sum, qty) => sum + qty, 0);
            let row = `"${itemName}",${total},`;
            const qtyList = dailyData.dates.map(date => dateMap[date] || 0);
            row += qtyList.join(',');
            csvContent += row + '\n';
        });

        // 文字化け防止（BOM）を付けてダウンロードさせる
        const bom = new Uint8Array([0xEF, 0xBB, 0xBF]);
        const blob = new Blob([bom, csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `月間集計表_${startDate}_${endDate}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
    };

    const formatShortDate = (dateStr: string) => { const [, month, day] = dateStr.split('-'); return `${parseInt(month)}/${parseInt(day)}`; };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-4 border-b-2 border-bakery-border pb-4 gap-4">
                <h1 className="text-3xl font-bold text-bakery-textMain">📈 売上集計ダッシュボード</h1>
                {ranking.length > 0 && (
                    <div className="flex gap-2">
                        <button onClick={exportToExcel} className="bg-[#10B981] hover:bg-green-600 text-white px-4 py-2 rounded font-bold shadow-sm">
                            📥 Excel出力
                        </button>
                        <button onClick={handleDeleteAll} className="border-2 border-red-400 text-red-500 px-4 py-2 rounded font-bold hover:bg-red-50">
                            🗑️ 履歴全削除
                        </button>
                    </div>
                )}
            </div>

            <div className="bg-white p-4 rounded-xl border border-bakery-border shadow-sm mb-8 flex flex-col sm:flex-row items-center justify-center gap-4">
                <div className="font-bold text-bakery-textMain">📅 集計期間 :</div>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border border-bakery-border rounded bg-bakery-bg outline-none" />
                <span className="font-bold text-[#8B6340]">〜</span>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border border-bakery-border rounded bg-bakery-bg outline-none" />
            </div>

            {ranking.length === 0 ? (
                <div className="border-2 border-dashed border-bakery-border p-16 text-center rounded-lg text-[#8B6340] bg-bakery-surface"><p className="text-4xl mb-4">📊</p><p>指定期間のデータがありません。</p></div>
            ) : (
                <div className="animate-fade-in-up space-y-10">

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white p-6 rounded-lg shadow-sm border h-[350px] flex flex-col"><h2 className="text-lg font-bold text-bakery-textMain mb-4">💰 売上金額 TOP {ranking.length}</h2><div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={ranking} layout="vertical" margin={{ left: 40, right: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#3D2B1F', fontSize: 12 }} /><Tooltip formatter={(v: any) => [`￥${Number(v).toLocaleString()}`, "売上"]} contentStyle={{ backgroundColor: '#FDF0D5', borderColor: '#E0C898', borderRadius: '8px' }} /><Bar dataKey="totalSales" radius={[0, 4, 4, 0]}>{ranking.map((_, i) => <Cell key={i} fill="#8B5E3C" />)}</Bar></BarChart></ResponsiveContainer></div></div>
                        <div className="bg-white p-6 rounded-lg shadow-sm border h-[350px] flex flex-col"><h2 className="text-lg font-bold text-bakery-textMain mb-4">📦 販売個数 TOP {ranking.length}</h2><div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={[...ranking].sort((a, b) => b.totalQty - a.totalQty)} layout="vertical" margin={{ left: 40, right: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#3D2B1F', fontSize: 12 }} /><Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} 個`, "個数"]} contentStyle={{ backgroundColor: '#FDF0D5', borderColor: '#E0C898', borderRadius: '8px' }} /><Bar dataKey="totalQty" radius={[0, 4, 4, 0]}>{ranking.map((_, i) => <Cell key={i} fill="#D4A96A" />)}</Bar></BarChart></ResponsiveContainer></div></div>
                    </div>

                    <div className="bg-white p-6 rounded-xl shadow-sm border overflow-hidden">
                        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">🗓️ 商品別 × 日別 販売個数カレンダー</h2>
                        <div className="overflow-x-auto pb-4">
                            <table className="w-full text-sm text-left border-collapse min-w-max">
                                <thead><tr className="bg-bakery-bg text-bakery-primary border-b-2"><th className="p-3 sticky left-0 bg-bakery-bg z-10 shadow font-bold">商品名</th><th className="p-3 text-center border-l bg-[#FDF0D5]">期間合計</th>{dailyData.dates.map(date => (<th key={date} className="p-3 text-center border-l font-bold">{formatShortDate(date)}</th>))}</tr></thead>
                                <tbody>
                                    {Object.entries(dailyData.items).map(([itemName, dateMap], index) => {
                                        const totalForThisItem = Object.values(dateMap).reduce((sum, qty) => sum + qty, 0);
                                        return (
                                            <tr key={itemName} className={`border-b hover:bg-[#FAFAFA] ${index % 2 !== 0 ? 'bg-[#FCFBFA]' : ''}`}>
                                                <td className="p-3 font-bold sticky left-0 bg-inherit z-10 shadow">{itemName}</td>
                                                <td className="p-3 text-center font-bold text-bakery-primary border-l bg-[#FDF0D5]/50">{totalForThisItem}</td>
                                                {dailyData.dates.map(date => { const qty = dateMap[date] || 0; return (<td key={date} className={`p-3 text-center border-l ${qty > 0 ? 'font-bold' : 'text-gray-300'}`}>{qty > 0 ? qty : '-'}</td>); })}
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}