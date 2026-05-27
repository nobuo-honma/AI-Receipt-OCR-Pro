// src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type Product = { id: number; name: string; price: number; target_qty: number; category: string; };

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monthly_report'>('dashboard');

  const [ranking, setRanking] = useState<{ name: string, category: string, totalSales: number, totalQty: number }[]>([]);
  const [dailyData, setDailyData] = useState<{ dates: string[], items: Record<string, { category: string, dateMap: Record<string, number> }> }>({ dates: [], items: {} });
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterText, setFilterText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const [reportMonth, setReportMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [products, setProducts] = useState<Product[]>([]);
  const [reportMatrix, setReportMatrix] = useState<Record<string, Record<number, number>>>({});
  // ⭐️ 新規：製造実績のデータ保持用
  const [prodMatrix, setProdMatrix] = useState<Record<string, Record<number, number>>>({});

  const fetchDashboardData = async () => {
    const { data: sessionData } = await supabase.from('scan_sessions').select('id, scanned_at').gte('scanned_at', `${startDate} 00:00:00`).lte('scanned_at', `${endDate} 23:59:59`);
    if (sessionData && sessionData.length > 0) {
      const sessionDateMap: Record<number, string> = {};
      const uniqueDates = new Set<string>();
      sessionData.forEach(s => { const dateOnly = s.scanned_at.split(' ')[0]; sessionDateMap[s.id] = dateOnly; uniqueDates.add(dateOnly); });

      const { data: itemsData } = await supabase.from('scan_items').select('session_id, name, subtotal, quantity, category').in('session_id', sessionData.map(s => s.id));
      if (itemsData) {
        const agg: Record<string, any> = {};
        const crossTable: Record<string, { category: string, dateMap: Record<string, number> }> = {};
        itemsData.forEach(item => {
          const cat = item.category || "❓ 未分類";
          if (!agg[item.name]) agg[item.name] = { name: item.name, category: cat, totalSales: 0, totalQty: 0 };
          agg[item.name].totalSales += item.subtotal; agg[item.name].totalQty += item.quantity;

          const itemDate = sessionDateMap[item.session_id];
          if (!crossTable[item.name]) crossTable[item.name] = { category: cat, dateMap: {} };
          if (!crossTable[item.name].dateMap[itemDate]) crossTable[item.name].dateMap[itemDate] = 0;
          crossTable[item.name].dateMap[itemDate] += item.quantity;
        });
        setRanking(Object.values(agg).sort((a, b) => b.totalSales - a.totalSales));
        setDailyData({ dates: Array.from(uniqueDates).sort(), items: crossTable });
      }
    } else { setRanking([]); setDailyData({ dates: [], items: {} }); }
  };

  const fetchMonthlyReportData = async () => {
    const { data: pData } = await supabase.from('products').select('*').order('sort_order', { ascending: true });
    if (pData) setProducts(pData);

    const [year, month] = reportMonth.split('-');
    const lastDay = new Date(Number(year), Number(month), 0).getDate();
    const startStr = `${reportMonth}-01 00:00:00`;
    const endStr = `${reportMonth}-${lastDay} 23:59:59`;

    // 販売実績の取得
    const { data: sessionData } = await supabase.from('scan_sessions').select('id, scanned_at').gte('scanned_at', startStr).lte('scanned_at', endStr);
    const matrix: Record<string, Record<number, number>> = {};

    if (sessionData && sessionData.length > 0) {
      const sessionDateMap: Record<number, number> = {};
      sessionData.forEach(s => { sessionDateMap[s.id] = parseInt(s.scanned_at.split(' ')[0].split('-')[2], 10); });
      const { data: itemsData } = await supabase.from('scan_items').select('session_id, name, quantity').in('session_id', sessionData.map(s => s.id));
      if (itemsData) {
        itemsData.forEach(item => {
          const day = sessionDateMap[item.session_id];
          if (!matrix[item.name]) matrix[item.name] = {};
          if (!matrix[item.name][day]) matrix[item.name][day] = 0;
          matrix[item.name][day] += item.quantity;
        });
      }
    }
    setReportMatrix(matrix);

    // ⭐️ 製造実績の取得
    const { data: prodData } = await supabase.from('production_records').select('*').gte('production_date', `${reportMonth}-01`).lte('production_date', `${reportMonth}-${lastDay}`);
    const pMatrix: Record<string, Record<number, number>> = {};
    if (prodData && pData) {
      prodData.forEach(record => {
        const day = parseInt(record.production_date.split('-')[2], 10);
        const pName = pData.find(p => p.id === record.product_id)?.name;
        if (pName) {
          if (!pMatrix[pName]) pMatrix[pName] = {};
          pMatrix[pName][day] = record.quantity;
        }
      });
    }
    setProdMatrix(pMatrix);
  };

  useEffect(() => { if (activeTab === 'dashboard') fetchDashboardData(); }, [startDate, endDate, activeTab]);
  useEffect(() => { if (activeTab === 'monthly_report') fetchMonthlyReportData(); }, [reportMonth, activeTab]);

  const handleDeleteAll = async () => {
    if (window.confirm("本当に全ての履歴を削除しますか？\n（※顧客データは消えません）")) {
      await supabase.from('scan_items').delete().neq('id', 0);
      await supabase.from('scan_sessions').delete().neq('id', 0);
      await supabase.from('production_records').delete().neq('id', 0); // 製造実績もリセット
      fetchDashboardData(); fetchMonthlyReportData();
    }
  };

  const handlePrint = () => {
    if (activeTab === 'monthly_report') alert("印刷設定で「レイアウト」を『横』にし、「余白」を『なし』に設定してPDF保存してください。");
    window.print();
  };

  const exportToExcel = () => {
    let csvContent = '商品名,期間合計個数,' + dailyData.dates.join(',') + '\n';
    Object.entries(dailyData.items).forEach(([itemName, dataObj]) => {
      const total = Object.values(dataObj.dateMap).reduce((sum, qty) => sum + qty, 0);
      let row = `"${itemName}",${total},`;
      const qtyList = dailyData.dates.map(date => dataObj.dateMap[date] || 0);
      row += qtyList.join(',');
      csvContent += row + '\n';
    });
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a'); link.href = window.URL.createObjectURL(blob);
    link.download = `売上集計_${startDate}_${endDate}.csv`; link.click();
  };

  const reportYear = parseInt(reportMonth.split('-')[0]);
  const reportMonthNum = parseInt(reportMonth.split('-')[1]);
  const daysInMonth = new Date(reportYear, reportMonthNum, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dayOfWeekStr = ['日', '月', '火', '水', '木', '金', '土'];

  const dailyTotals: Record<number, number> = {};
  let grandTotalQty = 0; let grandTotalPrice = 0;

  // 絞り込み処理
  const filteredRanking = ranking.filter(r => r.name.includes(filterText) && (filterCategory === "" || r.category === filterCategory));
  const uniqueCategories = Array.from(new Set(ranking.map(r => r.category))).sort();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-bakery-bg">
      <div className="no-print flex flex-col md:flex-row justify-between items-end md:items-center mb-6 border-b-2 border-bakery-border pb-4 gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <h1 className="text-3xl font-bold text-bakery-textMain">📈 売上・製造ダッシュボード</h1>
          <div className="flex bg-white rounded-lg p-1 border border-bakery-border shadow-sm">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'dashboard' ? 'bg-bakery-gold text-white' : 'text-[#8B6340] hover:bg-gray-50'}`}>📊 売上ダッシュボード</button>
            <button onClick={() => setActiveTab('monthly_report')} className={`px-4 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'monthly_report' ? 'bg-bakery-gold text-white' : 'text-[#8B6340] hover:bg-gray-50'}`}>📅 月間出荷表 (PDF用)</button>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === 'dashboard' && ranking.length > 0 && <button onClick={exportToExcel} className="bg-[#10B981] hover:bg-green-600 text-white px-4 py-2 rounded font-bold shadow-sm">📥 Excel出力</button>}
          <button onClick={handlePrint} className="bg-white border-2 border-bakery-primary text-bakery-primary hover:bg-bakery-surface px-4 py-2 rounded font-bold shadow-sm transition-colors">🖨️ 印刷 / PDF保存</button>
        </div>
      </div>

      {activeTab === 'dashboard' && (
        <div className="animate-fade-in-up">
          <div className="no-print bg-white p-4 rounded-xl border border-bakery-border shadow-sm mb-6 flex flex-col lg:flex-row items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
              <div className="flex items-center gap-2 w-full sm:w-auto"><span className="font-bold whitespace-nowrap">🔍 絞り込み :</span><select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="p-2 border rounded bg-bakery-bg focus:ring-2 focus:ring-bakery-gold"><option value="">すべてのカテゴリ</option>{uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></div>
              <div className="w-full sm:w-auto"><input type="text" placeholder="商品名で検索..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-full p-2 border rounded bg-bakery-bg focus:ring-2 focus:ring-bakery-gold" /></div>
            </div>
            <div className="flex items-center gap-2 w-full lg:w-auto justify-end"><span className="font-bold whitespace-nowrap">📅 集計期間 :</span><input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border rounded bg-bakery-bg" /><span className="font-bold text-[#8B6340]">〜</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border rounded bg-bakery-bg" /></div>
          </div>
          {ranking.length === 0 ? (
            <div className="no-print border-2 border-dashed border-bakery-border p-16 text-center rounded-lg text-[#8B6340] bg-bakery-surface"><p className="text-4xl mb-4">📊</p><p>指定期間のデータがありません。</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="bg-white p-6 rounded-lg shadow-sm border border-bakery-border h-[350px] flex flex-col"><h2 className="text-lg font-bold mb-4">💰 売上金額 TOP10</h2><div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={filteredRanking.slice(0, 10)} layout="vertical" margin={{ left: 40, right: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#3D2B1F', fontSize: 12 }} /><Tooltip formatter={(v: any) => [`￥${Number(v).toLocaleString()}`, "売上"]} contentStyle={{ backgroundColor: '#FDF0D5', borderColor: '#E0C898', borderRadius: '8px' }} /><Bar dataKey="totalSales" radius={[0, 4, 4, 0]}>{filteredRanking.slice(0, 10).map((_, i) => <Cell key={i} fill="#8B5E3C" />)}</Bar></BarChart></ResponsiveContainer></div></div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-bakery-border h-[350px] flex flex-col"><h2 className="text-lg font-bold mb-4">📦 販売個数 TOP10</h2><div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={[...filteredRanking].sort((a, b) => b.totalQty - a.totalQty).slice(0, 10)} layout="vertical" margin={{ left: 40, right: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#3D2B1F', fontSize: 12 }} /><Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} 個`, "個数"]} contentStyle={{ backgroundColor: '#FDF0D5', borderColor: '#E0C898', borderRadius: '8px' }} /><Bar dataKey="totalQty" radius={[0, 4, 4, 0]}>{filteredRanking.slice(0, 10).map((_, i) => <Cell key={i} fill="#D4A96A" />)}</Bar></BarChart></ResponsiveContainer></div></div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'monthly_report' && (
        <div className="animate-fade-in-up">
          <div className="no-print bg-white p-4 rounded-xl border border-bakery-border shadow-sm mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4"><span className="font-bold">📅 対象月 :</span><input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="p-2 border rounded bg-bakery-bg font-bold outline-none" /></div>
            <p className="text-xs text-[#8B6340]">上段：製造数 / 下段：販売数</p>
          </div>

          <div className="bg-white p-2 md:p-6 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 md:border border-bakery-border overflow-x-auto print:p-0 print:border-0 print:shadow-none">
            <div className="flex justify-between items-end mb-2 px-1"><span className="font-bold text-lg">{reportYear}年{reportMonthNum}月</span><h2 className="text-2xl font-bold tracking-[1em] text-center absolute left-1/2 -translate-x-1/2">出荷・製造実績表</h2><span className="text-sm">製パン・販売部門 共有</span></div>

            <table className="w-full text-[10px] border-collapse border border-black font-sans min-w-max print:min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1 w-40 text-center font-normal" rowSpan={2}>日付・曜日<br />商品名</th>
                  <th className="border border-black p-1 w-12 text-center font-normal" rowSpan={2}>単価</th>
                  {daysArray.map(d => <th key={d} className="border border-black p-0.5 text-center font-normal w-5">{d}</th>)}
                  <th className="border border-black p-1 w-12 text-center font-normal" rowSpan={2}>合計</th>
                  <th className="border border-black p-1 w-16 text-center font-normal" rowSpan={2}>金額</th>
                </tr>
                <tr className="bg-gray-100">
                  {daysArray.map(d => {
                    const date = new Date(reportYear, reportMonthNum - 1, d);
                    return <th key={d} className={`border border-black p-0.5 text-center font-normal ${date.getDay() === 0 ? 'text-red-600' : date.getDay() === 6 ? 'text-blue-600' : ''}`}>{dayOfWeekStr[date.getDay()]}</th>;
                  })}
                </tr>
              </thead>

              <tbody>
                {products.map(p => {
                  let rowTotalSales = 0; let rowTotalProd = 0;
                  // 各商品の縦列集計（販売数のみ）
                  daysArray.forEach(d => { const sQty = reportMatrix[p.name]?.[d] || 0; if (!dailyTotals[d]) dailyTotals[d] = 0; dailyTotals[d] += sQty; rowTotalSales += sQty; });
                  daysArray.forEach(d => { rowTotalProd += prodMatrix[p.name]?.[d] || 0; });
                  grandTotalQty += rowTotalSales; grandTotalPrice += rowTotalSales * p.price;

                  return (
                    <React.Fragment key={p.id}>
                      {/* 製造数の行（上段） */}
                      <tr className="bg-blue-50/30">
                        <td className="border border-black border-b-0 p-1 truncate max-w-[140px] pl-2 font-bold text-bakery-textMain" rowSpan={2}>{p.name}</td>
                        <td className="border border-black border-b-0 p-1 text-right pr-1" rowSpan={2}>{p.price}</td>
                        {daysArray.map(d => { const pQty = prodMatrix[p.name]?.[d] || 0; return <td key={`p-${d}`} className={`border border-black border-b-0 border-dotted p-0.5 text-right pr-1 ${pQty === 0 ? 'text-transparent' : 'text-blue-600 font-bold'}`}>{pQty}</td>; })}
                        <td className="border border-black border-b-0 border-dotted p-1 text-right pr-1 text-blue-600 font-bold">{rowTotalProd > 0 ? rowTotalProd : ''}</td>
                        <td className="border border-black border-b-0 p-1 text-right pr-1" rowSpan={2}>{(rowTotalSales * p.price).toLocaleString()}</td>
                      </tr>
                      {/* 販売数の行（下段） */}
                      <tr>
                        {daysArray.map(d => {
                          const sQty = reportMatrix[p.name]?.[d] || 0;
                          const pQty = prodMatrix[p.name]?.[d] || 0;
                          // 製造より売上が多い（または少ない）場合の警告色
                          const diffClass = (sQty > 0 && pQty > 0 && sQty !== pQty) ? 'bg-red-100 text-red-600' : (sQty === 0 ? 'text-gray-300' : 'font-bold');
                          return <td key={`s-${d}`} className={`border border-black border-t-0 p-0.5 text-right pr-1 ${diffClass}`}>{sQty > 0 ? sQty : '0'}</td>;
                        })}
                        <td className="border border-black border-t-0 p-1 text-right pr-1 font-bold">{rowTotalSales > 0 ? rowTotalSales : '0'}</td>
                      </tr>
                    </React.Fragment>
                  );
                })}
                <tr className="bg-gray-100 font-bold border-t-2 border-black">
                  <td className="border border-black p-1 text-center" colSpan={2}>販売 合計</td>
                  {daysArray.map(d => <td key={d} className={`border border-black p-0.5 text-right pr-1 ${dailyTotals[d] === 0 ? 'text-gray-400 font-normal' : ''}`}>{dailyTotals[d] || 0}</td>)}
                  <td className="border border-black p-1 text-right pr-1">{grandTotalQty}</td>
                  <td className="border border-black p-1 text-right pr-1">{grandTotalPrice.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>

            <div className="flex justify-between px-1 mt-1 text-[10px] pb-10"><span className="w-40 text-transparent">_</span><span className="w-12 text-transparent">_</span>{daysArray.map(d => <span key={d} className="w-5 text-center">{d}</span>)}<span className="w-12 text-transparent">_</span><span className="w-16 text-transparent">_</span></div>
          </div>
        </div>
      )}
    </div>
  );
}