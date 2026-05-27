// src/pages/Dashboard.tsx
import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type Product = { id: number; name: string; price: number; target_qty: number; category: string; };

// ⭐️ 分析画面と同じ「カテゴリID → 表示名」の変換マスタを用意
const CATEGORY_MAP: Record<string, string> = {
  "CAT_001": "🍞 パン",
  "CAT_002": "🍪 クッキー",
  "CAT_003": "🍦 ソフトクリーム",
  "CAT_004": "☕ コーヒー",
  "CAT_UNKNOWN": "❓ 未分類"
};

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'monthly_production' | 'monthly_sales'>('dashboard');

  // ── ダッシュボード用ステート ──
  const [ranking, setRanking] = useState<{ name: string, category: string, totalSales: number, totalQty: number }[]>([]);
  const [dailyData, setDailyData] = useState<{ dates: string[], items: Record<string, { category: string, dateMap: Record<string, number> }> }>({ dates: [], items: {} });
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [filterText, setFilterText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // ── 月報（製造・販売）用ステート ──
  const [reportMonth, setReportMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [products, setProducts] = useState<Product[]>([]);
  const [salesMatrix, setSalesMatrix] = useState<Record<string, Record<number, number>>>({}); // 販売実績
  const [prodMatrix, setProdMatrix] = useState<Record<string, Record<number, number>>>({});  // 製造実績

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
          // ⭐️ DBに保存されているID(CAT_001等)を、画面表示用の名前(🍞 パン等)に変換する
          const cat = CATEGORY_MAP[item.category] || item.category || "❓ 未分類";

          if (!agg[item.name]) agg[item.name] = { name: item.name, category: cat, totalSales: 0, totalQty: 0 };
          agg[item.name].totalSales += item.subtotal;
          agg[item.name].totalQty += item.quantity;

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

    // 1. 販売実績（scan_items）の取得
    const { data: sessionData } = await supabase.from('scan_sessions').select('id, scanned_at').gte('scanned_at', startStr).lte('scanned_at', endStr);
    const sMatrix: Record<string, Record<number, number>> = {};
    if (sessionData && sessionData.length > 0) {
      const sessionDateMap: Record<number, number> = {};
      sessionData.forEach(s => { sessionDateMap[s.id] = parseInt(s.scanned_at.split(' ')[0].split('-')[2], 10); });
      const { data: itemsData } = await supabase.from('scan_items').select('session_id, name, quantity').in('session_id', sessionData.map(s => s.id));
      if (itemsData) {
        itemsData.forEach(item => {
          const day = sessionDateMap[item.session_id];
          if (!sMatrix[item.name]) sMatrix[item.name] = {};
          if (!sMatrix[item.name][day]) sMatrix[item.name][day] = 0;
          sMatrix[item.name][day] += item.quantity;
        });
      }
    }
    setSalesMatrix(sMatrix);

    // 2. 製造実績（production_records）の取得
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
  useEffect(() => { if (activeTab === 'monthly_production' || activeTab === 'monthly_sales') fetchMonthlyReportData(); }, [reportMonth, activeTab]);

  const handleDeleteAll = async () => {
    if (window.confirm("本当に全ての履歴を削除しますか？\n（※顧客データやマスタは消えません）")) {
      await supabase.from('scan_items').delete().neq('id', 0);
      await supabase.from('scan_sessions').delete().neq('id', 0);
      await supabase.from('production_records').delete().neq('id', 0);
      fetchDashboardData(); fetchMonthlyReportData();
    }
  };

  const handlePrint = () => {
    if (activeTab !== 'dashboard') alert("印刷設定で「レイアウト」を『横』にし、「余白」を『なし』に設定してPDF保存してください。");
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

  const formatShortDate = (dateStr: string) => { const [, month, day] = dateStr.split('-'); return `${parseInt(month)}/${parseInt(day)}`; };

  // 絞り込み処理
  const filteredRanking = ranking.filter(r => r.name.includes(filterText) && (filterCategory === "" || r.category === filterCategory));
  const uniqueCategories = Array.from(new Set(ranking.map(r => r.category))).sort();
  const filteredDailyItems = Object.entries(dailyData.items).filter(([name, data]) => name.includes(filterText) && (filterCategory === "" || data.category === filterCategory));

  const groupedDailyItems: Record<string, typeof filteredDailyItems> = {};
  filteredDailyItems.forEach(item => { const cat = item[1].category; if (!groupedDailyItems[cat]) groupedDailyItems[cat] = []; groupedDailyItems[cat].push(item); });
  const sortedCategoryKeys = Object.keys(groupedDailyItems).sort();

  // 月報用計算ヘルパー
  const reportYear = parseInt(reportMonth.split('-')[0]);
  const reportMonthNum = parseInt(reportMonth.split('-')[1]);
  const daysInMonth = new Date(reportYear, reportMonthNum, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dayOfWeekStr = ['日', '月', '火', '水', '木', '金', '土'];

  const dailyTotalsSales: Record<number, number> = {};
  let grandTotalSalesQty = 0; let grandTotalSalesPrice = 0;
  products.forEach(p => { let pQty = 0; daysArray.forEach(d => { const qty = salesMatrix[p.name]?.[d] || 0; if (!dailyTotalsSales[d]) dailyTotalsSales[d] = 0; dailyTotalsSales[d] += qty; pQty += qty; }); grandTotalSalesQty += pQty; grandTotalSalesPrice += pQty * p.price; });

  const dailyTotalsProd: Record<number, number> = {};
  let grandTotalProdQty = 0;
  products.forEach(p => { let pQty = 0; daysArray.forEach(d => { const qty = prodMatrix[p.name]?.[d] || 0; if (!dailyTotalsProd[d]) dailyTotalsProd[d] = 0; dailyTotalsProd[d] += qty; pQty += qty; }); grandTotalProdQty += pQty; });

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-bakery-bg">
      <div className="no-print flex flex-col md:flex-row justify-between items-end md:items-center mb-6 border-b-2 border-bakery-border pb-4 gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          <h1 className="text-3xl font-bold text-bakery-textMain">📈 売上・製造ダッシュボード</h1>
          <div className="flex bg-white rounded-lg p-1 border border-bakery-border shadow-sm">
            <button onClick={() => setActiveTab('dashboard')} className={`px-4 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'dashboard' ? 'bg-bakery-gold text-white' : 'text-[#8B6340] hover:bg-gray-50'}`}>📊 ダッシュボード</button>
            <button onClick={() => setActiveTab('monthly_production')} className={`px-4 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'monthly_production' ? 'bg-[#8B5E3C] text-white' : 'text-[#8B6340] hover:bg-gray-50'}`}>🍞 製造実績表</button>
            <button onClick={() => setActiveTab('monthly_sales')} className={`px-4 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'monthly_sales' ? 'bg-bakery-primary text-white' : 'text-[#8B6340] hover:bg-gray-50'}`}>🛒 販売実績表</button>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === 'dashboard' && ranking.length > 0 && <button onClick={exportToExcel} className="bg-[#10B981] hover:bg-green-600 text-white px-4 py-2 rounded font-bold shadow-sm">📥 Excel出力</button>}
          <button onClick={handlePrint} className="bg-white border-2 border-bakery-primary text-bakery-primary hover:bg-bakery-surface px-4 py-2 rounded font-bold shadow-sm transition-colors">🖨️ 印刷 / PDF保存</button>
        </div>
      </div>

      {/* ========================================================
          タブ1: 売上ダッシュボード (グラフ + カテゴリ別表)
          ======================================================== */}
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
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-bakery-border h-[350px] flex flex-col"><h2 className="text-lg font-bold mb-4">💰 売上金額 TOP10</h2><div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={filteredRanking.slice(0, 10)} layout="vertical" margin={{ left: 40, right: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#3D2B1F', fontSize: 12 }} /><Tooltip formatter={(v: any) => [`￥${Number(v).toLocaleString()}`, "売上"]} contentStyle={{ backgroundColor: '#FDF0D5', borderColor: '#E0C898', borderRadius: '8px' }} /><Bar dataKey="totalSales" radius={[0, 4, 4, 0]}>{filteredRanking.slice(0, 10).map((_, i) => <Cell key={i} fill="#8B5E3C" />)}</Bar></BarChart></ResponsiveContainer></div></div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-bakery-border h-[350px] flex flex-col"><h2 className="text-lg font-bold mb-4">📦 販売個数 TOP10</h2><div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={[...filteredRanking].sort((a, b) => b.totalQty - a.totalQty).slice(0, 10)} layout="vertical" margin={{ left: 40, right: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#3D2B1F', fontSize: 12 }} /><Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} 個`, "個数"]} contentStyle={{ backgroundColor: '#FDF0D5', borderColor: '#E0C898', borderRadius: '8px' }} /><Bar dataKey="totalQty" radius={[0, 4, 4, 0]}>{filteredRanking.slice(0, 10).map((_, i) => <Cell key={i} fill="#D4A96A" />)}</Bar></BarChart></ResponsiveContainer></div></div>
              </div>

              {/* ⭐️ カテゴリ別クロス集計表 */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-bakery-border overflow-hidden">
                <h2 className="no-print text-xl font-bold text-bakery-textMain mb-4 flex items-center gap-2">🗓️ 商品別 × 日別 販売個数一覧（カテゴリ別）</h2>
                <div className="overflow-x-auto pb-4">
                  <table className="w-full text-sm text-left border-collapse min-w-max">
                    <thead><tr className="bg-bakery-surface text-bakery-primary border-b-2"><th className="p-3 sticky left-0 bg-bakery-surface z-10 font-bold border-r">カテゴリ・商品名</th><th className="p-3 text-center border-r bg-[#FDF0D5] font-bold">期間合計</th>{dailyData.dates.map(date => (<th key={date} className="p-3 text-center border-r font-bold">{formatShortDate(date)}</th>))}</tr></thead>
                    <tbody>
                      {sortedCategoryKeys.map(cat => {
                        const itemsInCategory = groupedDailyItems[cat];
                        const categoryTotalQty = itemsInCategory.reduce((catSum, [_, data]) => catSum + Object.values(data.dateMap).reduce((sum, q) => sum + q, 0), 0);
                        return (
                          <React.Fragment key={cat}>
                            <tr className="bg-bakery-border/30 border-b border-bakery-border"><td className="p-3 font-bold text-bakery-primary sticky left-0 bg-bakery-bg z-10 border-r">📂 {cat}</td><td className="p-3 text-center font-bold text-bakery-primary border-r bg-bakery-gold/20">{categoryTotalQty}</td>{dailyData.dates.map(date => { const dateTotal = itemsInCategory.reduce((sum, [_, data]) => sum + (data.dateMap[date] || 0), 0); return (<td key={date} className={`p-3 text-center border-r ${dateTotal > 0 ? 'font-bold text-bakery-primary' : 'text-transparent'}`}>{dateTotal > 0 ? dateTotal : '-'}</td>); })}</tr>
                            {itemsInCategory.map(([itemName, dataObj], index) => {
                              const itemTotalQty = Object.values(dataObj.dateMap).reduce((sum, qty) => sum + qty, 0);
                              return (
                                <tr key={itemName} className={`border-b hover:bg-[#FAFAFA] ${index % 2 !== 0 ? 'bg-[#FCFBFA]' : ''}`}><td className="p-3 pl-8 text-bakery-textMain sticky left-0 bg-inherit z-10 border-r">└ {itemName}</td><td className="p-3 text-center font-bold text-[#8B6340] border-r bg-bakery-surface/30">{itemTotalQty}</td>{dailyData.dates.map(date => { const qty = dataObj.dateMap[date] || 0; return (<td key={date} className={`p-3 text-center border-r ${qty > 0 ? 'font-bold text-bakery-textMain' : 'text-gray-300'}`}>{qty > 0 ? qty : '-'}</td>); })}</tr>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          タブ2: 月間出荷表 (製造・販売 共通レイアウト)
          ======================================================== */}
      {(activeTab === 'monthly_production' || activeTab === 'monthly_sales') && (
        <div className="animate-fade-in-up">
          <div className="no-print bg-white p-4 rounded-xl border border-bakery-border shadow-sm mb-6 flex items-center justify-between">
            <div className="flex items-center gap-4"><span className="font-bold">📅 対象月 :</span><input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="p-2 border rounded bg-bakery-bg font-bold outline-none" /></div>
            <p className="text-xs text-[#8B6340]">印刷時はブラウザの「レイアウト」を「横(ランドスケープ)」に設定してください。</p>
          </div>

          <div className="bg-white p-2 md:p-6 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 md:border border-bakery-border overflow-x-auto print:p-0 print:border-0 print:shadow-none">
            <div className="flex justify-between items-end mb-2 px-1">
              <span className="font-bold text-lg">{reportYear}年{reportMonthNum}月</span>
              <h2 className="text-2xl font-bold tracking-[1em] text-center absolute left-1/2 -translate-x-1/2">
                {activeTab === 'monthly_production' ? '製 造 出 荷 表' : '販 売 実 績 表'}
              </h2>
              <span className="text-sm">{activeTab === 'monthly_production' ? '製造部門' : '販売部門'}</span>
            </div>

            <table className="w-full text-[10px] border-collapse border border-black font-sans min-w-max print:min-w-full">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1 w-40 text-center font-normal" rowSpan={2}>日付・曜日<br />商品名</th>
                  <th className="border border-black p-1 w-12 text-center font-normal" rowSpan={2}>単価</th>
                  {daysArray.map(d => <th key={d} className="border border-black p-0.5 text-center font-normal w-5">{d}</th>)}
                  <th className="border border-black p-1 w-12 text-center font-normal" rowSpan={2}>合計</th>
                  {activeTab === 'monthly_sales' && <th className="border border-black p-1 w-16 text-center font-normal" rowSpan={2}>金額</th>}
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
                  let rowTotal = 0;
                  const isSales = activeTab === 'monthly_sales';
                  const targetMatrix = isSales ? salesMatrix : prodMatrix;

                  daysArray.forEach(d => rowTotal += targetMatrix[p.name]?.[d] || 0);

                  return (
                    <tr key={p.id} className="hover:bg-gray-50">
                      <td className="border border-black p-1 truncate max-w-[140px] pl-2 font-bold text-bakery-textMain">{p.name}</td>
                      <td className="border border-black p-1 text-right pr-1">{p.price}</td>
                      {daysArray.map(d => {
                        const qty = targetMatrix[p.name]?.[d] || 0;
                        return <td key={d} className={`border border-black p-0.5 text-right pr-1 ${qty === 0 ? 'text-transparent' : 'font-bold'}`}>{qty > 0 ? qty : ''}</td>;
                      })}
                      <td className="border border-black p-1 text-right pr-1 font-bold text-bakery-primary">{rowTotal > 0 ? rowTotal : ''}</td>
                      {isSales && <td className="border border-black p-1 text-right pr-1 font-bold text-bakery-primary">{rowTotal > 0 ? (rowTotal * p.price).toLocaleString() : ''}</td>}
                    </tr>
                  );
                })}
                <tr className="bg-gray-100 font-bold border-t-2 border-black">
                  <td className="border border-black p-1 text-center" colSpan={2}>合　計</td>
                  {daysArray.map(d => {
                    const dTotal = activeTab === 'monthly_sales' ? dailyTotalsSales[d] : dailyTotalsProd[d];
                    return <td key={d} className={`border border-black p-0.5 text-right pr-1 ${!dTotal ? 'text-transparent' : ''}`}>{dTotal || ''}</td>
                  })}
                  <td className="border border-black p-1 text-right pr-1">{activeTab === 'monthly_sales' ? grandTotalSalesQty : grandTotalProdQty}</td>
                  {activeTab === 'monthly_sales' && <td className="border border-black p-1 text-right pr-1">{grandTotalSalesPrice.toLocaleString()}</td>}
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