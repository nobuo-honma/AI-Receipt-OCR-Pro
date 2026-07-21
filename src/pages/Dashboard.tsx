// src/pages/Dashboard.tsx
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

type Product = { id: number; name: string; price: number; target_qty: number; category: string; };
type TabType = 'dashboard' | 'prod_shop' | 'sales_shop' | 'prod_wholesale' | 'sales_wholesale';

export default function Dashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  const [ranking, setRanking] = useState<{ name: string, category: string, totalSales: number, totalQty: number }[]>([]);
  const [dailyData, setDailyData] = useState<{ dates: string[], items: Record<string, { category: string, dateMap: Record<string, number> }> }>({ dates: [], items: {} });

  // ダッシュボードの期間指定
  const [startDate, setStartDate] = useState(() => { const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0]; });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [filterText, setFilterText] = useState("");
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // 月報の期間指定
  const [reportMonth, setReportMonth] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [products, setProducts] = useState<Product[]>([]);

  const [shopSalesMatrix, setShopSalesMatrix] = useState<Record<string, Record<number, number>>>({});
  const [wholesaleSalesMatrix, setWholesaleSalesMatrix] = useState<Record<string, Record<number, number>>>({});
  const [shopProdMatrix, setShopProdMatrix] = useState<Record<string, Record<number, number>>>({});
  const [wholesaleProdMatrix, setWholesaleProdMatrix] = useState<Record<string, Record<number, number>>>({});

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsCategoryDropdownOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

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
    const startStr = `${reportMonth}-01`;
    const endStr = `${reportMonth}-${lastDay}`;

    const { data: sessionData } = await supabase.from('scan_sessions').select('id, scanned_at, sales_type').gte('scanned_at', `${startStr} 00:00:00`).lte('scanned_at', `${endStr} 23:59:59`);
    const sShopMatrix: Record<string, Record<number, number>> = {};
    const sWholesaleMatrix: Record<string, Record<number, number>> = {};

    if (sessionData && sessionData.length > 0) {
      const sessionMap: Record<number, { day: number, type: string }> = {};
      sessionData.forEach(s => { sessionMap[s.id] = { day: parseInt(s.scanned_at.split(' ')[0].split('-')[2], 10), type: s.sales_type || 'shop' }; });
      const { data: itemsData } = await supabase.from('scan_items').select('session_id, name, quantity').in('session_id', sessionData.map(s => s.id));
      if (itemsData) {
        itemsData.forEach(item => {
          const sInfo = sessionMap[item.session_id];
          const targetMatrix = sInfo.type === 'wholesale' ? sWholesaleMatrix : sShopMatrix;
          if (!targetMatrix[item.name]) targetMatrix[item.name] = {};
          if (!targetMatrix[item.name][sInfo.day]) targetMatrix[item.name][sInfo.day] = 0;
          targetMatrix[item.name][sInfo.day] += item.quantity;
        });
      }
    }
    setShopSalesMatrix(sShopMatrix);
    setWholesaleSalesMatrix(sWholesaleMatrix);

    const { data: prodData } = await supabase.from('production_records').select('*').gte('production_date', startStr).lte('production_date', endStr);
    const pShopMatrix: Record<string, Record<number, number>> = {};
    const pWholesaleMatrix: Record<string, Record<number, number>> = {};

    if (prodData && pData) {
      prodData.forEach(record => {
        const day = parseInt(record.production_date.split('-')[2], 10);
        const pName = pData.find(p => p.id === record.product_id)?.name;
        if (pName) {
          const shopQty = record.shop_quantity || 0;
          const wholesaleQty = (record.quantity || 0) - shopQty;
          if (!pShopMatrix[pName]) pShopMatrix[pName] = {};
          pShopMatrix[pName][day] = shopQty;
          if (!pWholesaleMatrix[pName]) pWholesaleMatrix[pName] = {};
          pWholesaleMatrix[pName][day] = wholesaleQty;
        }
      });
    }
    setShopProdMatrix(pShopMatrix);
    setWholesaleProdMatrix(pWholesaleMatrix);
  };

  useEffect(() => { if (activeTab === 'dashboard') fetchDashboardData(); }, [startDate, endDate, activeTab]);
  useEffect(() => { if (activeTab !== 'dashboard') fetchMonthlyReportData(); }, [reportMonth, activeTab]);

  // ⭐️ 新規：ダッシュボードで「指定した日付の期間」を一括削除する機能
  const handleDeleteByDateRange = async () => {
    if (window.confirm(`【警告】\n${startDate} 〜 ${endDate} の間の「売上履歴」と「製造実績」を全て削除しますか？\n（※顧客データは消えません）`)) {
      try {
        const { data: sessionData } = await supabase.from('scan_sessions').select('id').gte('scanned_at', `${startDate} 00:00:00`).lte('scanned_at', `${endDate} 23:59:59`);
        if (sessionData && sessionData.length > 0) {
          const sessionIds = sessionData.map(s => s.id);
          await supabase.from('scan_items').delete().in('session_id', sessionIds);
          await supabase.from('scan_sessions').delete().in('id', sessionIds);
        }
        await supabase.from('production_records').delete().gte('production_date', startDate).lte('production_date', endDate);

        alert("指定期間のデータを全て削除しました。");
        fetchDashboardData();
      } catch (err: any) { alert("削除に失敗しました: " + err.message); }
    }
  };

  // ⭐️ 新規：月報画面で「指定した月」のデータを一括削除する機能
  const handleDeleteByMonth = async () => {
    if (window.confirm(`【警告】\n${reportMonth}月 の「売上履歴」と「製造実績」を全て削除しますか？\n（※顧客データは消えません）`)) {
      try {
        const [year, month] = reportMonth.split('-');
        const lastDay = new Date(Number(year), Number(month), 0).getDate();
        const startStr = `${reportMonth}-01`;
        const endStr = `${reportMonth}-${lastDay}`;

        const { data: sessionData } = await supabase.from('scan_sessions').select('id').gte('scanned_at', `${startStr} 00:00:00`).lte('scanned_at', `${endStr} 23:59:59`);
        if (sessionData && sessionData.length > 0) {
          const sessionIds = sessionData.map(s => s.id);
          await supabase.from('scan_items').delete().in('session_id', sessionIds);
          await supabase.from('scan_sessions').delete().in('id', sessionIds);
        }
        await supabase.from('production_records').delete().gte('production_date', startStr).lte('production_date', endStr);

        alert(`${reportMonth}月のデータを全て削除しました。`);
        fetchMonthlyReportData();
      } catch (err: any) { alert("削除に失敗しました: " + err.message); }
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

  const uniqueCategories = Array.from(new Set(
    activeTab === 'dashboard' ? ranking.map(r => r.category) : products.map(p => p.category)
  )).sort();

  const toggleCategory = (cat: string) => {
    setSelectedCategories(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const isCategoryMatched = (cat: string) => selectedCategories.length === 0 || selectedCategories.includes(cat);

  const filteredRanking = ranking.filter(r => r.name.includes(filterText) && isCategoryMatched(r.category));
  const filteredDailyItems = Object.entries(dailyData.items).filter(([name, data]) => name.includes(filterText) && isCategoryMatched(data.category));

  const groupedDailyItems: Record<string, typeof filteredDailyItems> = {};
  filteredDailyItems.forEach(item => { const cat = item[1].category; if (!groupedDailyItems[cat]) groupedDailyItems[cat] = []; groupedDailyItems[cat].push(item); });
  const sortedCategoryKeys = Object.keys(groupedDailyItems).sort();

  const reportYear = parseInt(reportMonth.split('-')[0]);
  const reportMonthNum = parseInt(reportMonth.split('-')[1]);
  const daysInMonth = new Date(reportYear, reportMonthNum, 0).getDate();
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const dayOfWeekStr = ['日', '月', '火', '水', '木', '金', '土'];

  const filteredProducts = products.filter(p => p.name.includes(filterText) && isCategoryMatched(p.category));
  const groupedProducts: Record<string, Product[]> = {};
  filteredProducts.forEach(p => {
    if (!groupedProducts[p.category]) groupedProducts[p.category] = [];
    groupedProducts[p.category].push(p);
  });
  const sortedProdCategoryKeys = Object.keys(groupedProducts).sort();

  const renderSingleReportTable = (title: string, subTitle: string, matrixData: Record<string, Record<number, number>>, isSales: boolean) => {
    const dailyTotals: Record<number, number> = {};
    let grandTotalQty = 0; let grandTotalPrice = 0;

    filteredProducts.forEach(p => {
      let pQty = 0;
      daysArray.forEach(d => { const qty = matrixData[p.name]?.[d] || 0; if (!dailyTotals[d]) dailyTotals[d] = 0; dailyTotals[d] += qty; pQty += qty; });
      grandTotalQty += pQty; grandTotalPrice += pQty * p.price;
    });

    return (
      <div className="bg-white p-2 md:p-6 rounded-none md:rounded-xl shadow-none md:shadow-sm border-0 md:border border-bakery-border overflow-x-auto print:p-0 print:border-0 print:shadow-none animate-fade-in-up">
        <div className="flex justify-between items-end mb-2 px-1">
          <span className="font-bold text-lg">{reportYear}年{reportMonthNum}月</span>
          <h2 className="text-xl font-bold tracking-widest text-center absolute left-1/2 -translate-x-1/2">{title}</h2>
          <span className="text-sm font-bold text-bakery-primary bg-bakery-bg px-3 py-1 rounded">{subTitle}</span>
        </div>
        <table className="w-full text-[10px] border-collapse border border-black font-sans min-w-max print:min-w-full">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 w-40 text-center font-normal" rowSpan={2}>日付・曜日<br />商品名</th>
              <th className="border border-black p-1 w-12 text-center font-normal" rowSpan={2}>単価</th>
              {daysArray.map(d => <th key={d} className="border border-black p-0.5 text-center font-normal w-5">{d}</th>)}
              <th className="border border-black p-1 w-12 text-center font-normal" rowSpan={2}>合計</th>
              {isSales && <th className="border border-black p-1 w-16 text-center font-normal" rowSpan={2}>金額</th>}
            </tr>
            <tr className="bg-gray-100">
              {daysArray.map(d => {
                const date = new Date(reportYear, reportMonthNum - 1, d);
                return <th key={d} className={`border border-black p-0.5 text-center font-normal ${date.getDay() === 0 ? 'text-red-600' : date.getDay() === 6 ? 'text-blue-600' : ''}`}>{dayOfWeekStr[date.getDay()]}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {sortedProdCategoryKeys.map(cat => {
              const productsInCat = groupedProducts[cat];
              let hasAnyData = false;

              const catRows = productsInCat.map(p => {
                let rowTotal = 0;
                daysArray.forEach(d => { rowTotal += matrixData[p.name]?.[d] || 0; });
                if (rowTotal === 0) return null;
                hasAnyData = true;

                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="border border-black p-1 truncate max-w-35 pl-4 font-bold text-bakery-textMain">└ {p.name}</td>
                    <td className="border border-black p-1 text-right pr-1">{p.price}</td>
                    {daysArray.map(d => { const qty = matrixData[p.name]?.[d] || 0; return <td key={d} className={`border border-black p-0.5 text-right pr-1 ${qty === 0 ? 'text-transparent' : 'font-bold'}`}>{qty > 0 ? qty : ''}</td>; })}
                    <td className="border border-black p-1 text-right pr-1 font-bold text-bakery-primary">{rowTotal}</td>
                    {isSales && <td className="border border-black p-1 text-right pr-1 font-bold text-bakery-primary">{(rowTotal * p.price).toLocaleString()}</td>}
                  </tr>
                );
              });

              if (!hasAnyData) return null;

              return (
                <React.Fragment key={cat}>
                  <tr className="bg-bakery-bg"><td className="border border-black p-1 font-bold text-bakery-primary" colSpan={isSales ? daysArray.length + 4 : daysArray.length + 3}>📂 {cat}</td></tr>
                  {catRows}
                </React.Fragment>
              );
            })}
            <tr className="bg-gray-100 font-bold border-t-2 border-black">
              <td className="border border-black p-1 text-center" colSpan={2}>合　計</td>
              {daysArray.map(d => <td key={d} className={`border border-black p-0.5 text-right pr-1 ${dailyTotals[d] === 0 ? 'text-transparent' : ''}`}>{dailyTotals[d] || ''}</td>)}
              <td className="border border-black p-1 text-right pr-1">{grandTotalQty}</td>
              {isSales && <td className="border border-black p-1 text-right pr-1">{grandTotalPrice.toLocaleString()}</td>}
            </tr>
          </tbody>
        </table>
        <div className="flex justify-between px-1 mt-1 text-[10px] pb-10"><span className="w-40 text-transparent">_</span><span className="w-12 text-transparent">_</span>{daysArray.map(d => <span key={d} className="w-5 text-center">{d}</span>)}<span className="w-12 text-transparent">_</span><span className="w-16 text-transparent">_</span></div>
      </div>
    );
  };

  const renderFilterArea = () => (
    <div className="no-print bg-white p-4 rounded-xl border border-bakery-border shadow-sm mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-2">
            <span className="font-bold text-bakery-textMain whitespace-nowrap">🔍 カテゴリ :</span>
            <button onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)} className="p-2 border border-bakery-border rounded bg-bakery-bg focus:ring-2 focus:ring-bakery-gold min-w-40 text-left flex justify-between items-center">
              <span className="truncate max-w-30">{selectedCategories.length === 0 ? "すべて" : `${selectedCategories.length}件 選択中`}</span><span className="text-xs">▼</span>
            </button>
          </div>
          {isCategoryDropdownOpen && (
            <div className="absolute top-full left-16 mt-1 w-64 bg-white border border-bakery-border rounded-lg shadow-xl z-50 p-3 flex flex-col gap-2 max-h-60 overflow-y-auto">
              <label className="flex items-center gap-2 cursor-pointer pb-2 border-b border-gray-100"><input type="checkbox" checked={selectedCategories.length === 0} onChange={() => setSelectedCategories([])} className="w-4 h-4 text-bakery-primary rounded focus:ring-bakery-gold" /><span className="font-bold text-bakery-textMain">すべて（絞り込み解除）</span></label>
              {uniqueCategories.map(cat => (
                <label key={cat} className="flex items-center gap-2 cursor-pointer hover:bg-bakery-surface p-1 rounded"><input type="checkbox" checked={selectedCategories.includes(cat)} onChange={() => toggleCategory(cat)} className="w-4 h-4 text-bakery-primary rounded focus:ring-bakery-gold" /><span className="text-sm">{cat}</span></label>
              ))}
            </div>
          )}
        </div>
        <div className="w-full sm:w-auto flex items-center gap-2"><span className="font-bold text-bakery-textMain whitespace-nowrap">品名 :</span><input type="text" placeholder="名前で検索..." value={filterText} onChange={e => setFilterText(e.target.value)} className="w-full p-2 border border-bakery-border rounded bg-bakery-bg outline-none focus:ring-2 focus:ring-bakery-gold" /></div>
      </div>
      <div className="flex items-center gap-2 w-full md:w-auto justify-end">
        {activeTab === 'dashboard' ? (
          <>
            <span className="font-bold text-bakery-textMain whitespace-nowrap">📅 集計期間 :</span>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="p-2 border border-bakery-border rounded bg-bakery-bg outline-none" /><span className="font-bold text-[#8B6340]">〜</span><input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="p-2 border border-bakery-border rounded bg-bakery-bg outline-none" />
            {/* ⭐️ ダッシュボード：期間指定削除ボタン */}
            <button onClick={handleDeleteByDateRange} className="ml-2 bg-white border border-red-300 text-red-500 hover:bg-red-50 px-3 py-2 rounded-md font-bold text-xs shadow-sm transition-colors whitespace-nowrap">
              🗑️ この期間のデータを削除
            </button>
          </>
        ) : (
          <>
            <span className="font-bold text-bakery-textMain whitespace-nowrap">📅 対象月 :</span>
            <input type="month" value={reportMonth} onChange={e => setReportMonth(e.target.value)} className="p-2 border border-bakery-border rounded bg-bakery-bg font-bold outline-none" />
            {/* ⭐️ 月報：月間指定削除ボタン */}
            <button onClick={handleDeleteByMonth} className="ml-2 bg-white border border-red-300 text-red-500 hover:bg-red-50 px-3 py-2 rounded-md font-bold text-xs shadow-sm transition-colors whitespace-nowrap">
              🗑️ この月のデータを削除
            </button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-bakery-bg">
      <div className="no-print flex flex-col xl:flex-row justify-between items-end xl:items-center mb-6 border-b-2 border-bakery-border pb-4 gap-4">
        <div className="flex flex-col lg:flex-row items-start lg:items-center gap-6">
          <h1 className="text-3xl font-bold text-bakery-textMain whitespace-nowrap">📈 売上・製造集計</h1>
          <div className="flex flex-wrap bg-white rounded-lg p-1 border border-bakery-border shadow-sm gap-1">
            <button onClick={() => setActiveTab('dashboard')} className={`px-3 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'dashboard' ? 'bg-bakery-gold text-white' : 'text-[#8B6340] hover:bg-gray-50'}`}>📊 グラフ</button>
            <button onClick={() => setActiveTab('prod_shop')} className={`px-3 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'prod_shop' ? 'bg-[#8B5E3C] text-white' : 'text-[#8B6340] hover:bg-gray-50'}`}>👨‍🍳 製造 [ショップ]</button>
            <button onClick={() => setActiveTab('sales_shop')} className={`px-3 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'sales_shop' ? 'bg-bakery-primary text-white' : 'text-[#8B6340] hover:bg-gray-50'}`}>🛒 販売 [ショップ]</button>
            <button onClick={() => setActiveTab('prod_wholesale')} className={`px-3 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'prod_wholesale' ? 'bg-blue-600 text-white' : 'text-[#8B6340] hover:bg-gray-50'}`}>👨‍🍳 製造 [施設買上]</button>
            <button onClick={() => setActiveTab('sales_wholesale')} className={`px-3 py-2 rounded-md font-bold text-sm transition-colors ${activeTab === 'sales_wholesale' ? 'bg-indigo-600 text-white' : 'text-[#8B6340] hover:bg-gray-50'}`}>🚚 販売 [施設買上]</button>
          </div>
        </div>
        <div className="flex gap-2">
          {activeTab === 'dashboard' && ranking.length > 0 && <button onClick={exportToExcel} className="bg-[#10B981] hover:bg-green-600 text-white px-4 py-2 rounded font-bold shadow-sm whitespace-nowrap">📥 Excel出力</button>}
          <button onClick={handlePrint} className="bg-white border-2 border-bakery-primary text-bakery-primary hover:bg-bakery-surface px-4 py-2 rounded font-bold shadow-sm transition-colors whitespace-nowrap">🖨️ 印刷 / PDF保存</button>
        </div>
      </div>

      {renderFilterArea()}

      {activeTab === 'dashboard' && (
        <div className="animate-fade-in-up">
          {ranking.length === 0 ? (
            <div className="no-print border-2 border-dashed border-bakery-border p-16 text-center rounded-lg text-[#8B6340] bg-bakery-surface"><p className="text-4xl mb-4">📊</p><p>指定期間のデータがありません。</p></div>
          ) : (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white p-6 rounded-lg shadow-sm border border-bakery-border h-87.5 flex flex-col"><h2 className="text-lg font-bold mb-4">💰 売上金額 TOP10</h2><div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={filteredRanking.slice(0, 10)} layout="vertical" margin={{ left: 40, right: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#3D2B1F', fontSize: 12 }} /><Tooltip formatter={(v: any) => [`￥${Number(v).toLocaleString()}`, "売上"]} contentStyle={{ backgroundColor: '#FDF0D5', borderColor: '#E0C898', borderRadius: '8px' }} /><Bar dataKey="totalSales" radius={[0, 4, 4, 0]}>{filteredRanking.slice(0, 10).map((_, i) => <Cell key={i} fill="#8B5E3C" />)}</Bar></BarChart></ResponsiveContainer></div></div>
                <div className="bg-white p-6 rounded-lg shadow-sm border border-bakery-border h-87.5 flex flex-col"><h2 className="text-lg font-bold mb-4">📦 販売個数 TOP10</h2><div className="flex-1 min-h-0"><ResponsiveContainer width="100%" height="100%"><BarChart data={[...filteredRanking].sort((a, b) => b.totalQty - a.totalQty).slice(0, 10)} layout="vertical" margin={{ left: 40, right: 20 }}><XAxis type="number" hide /><YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fill: '#3D2B1F', fontSize: 12 }} /><Tooltip formatter={(v: any) => [`${Number(v).toLocaleString()} 個`, "個数"]} contentStyle={{ backgroundColor: '#FDF0D5', borderColor: '#E0C898', borderRadius: '8px' }} /><Bar dataKey="totalQty" radius={[0, 4, 4, 0]}>{filteredRanking.slice(0, 10).map((_, i) => <Cell key={i} fill="#D4A96A" />)}</Bar></BarChart></ResponsiveContainer></div></div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-bakery-border overflow-hidden">
                <h2 className="no-print text-xl font-bold text-bakery-textMain mb-4 flex items-center gap-2">🗓️ 商品別 × 日別 販売個数一覧（カテゴリ別）</h2>
                <div className="overflow-x-auto pb-4">
                  <table className="w-full text-sm text-left border-collapse min-w-max">
                    <thead><tr className="bg-bakery-surface text-bakery-primary border-b-2 border-bakery-border"><th className="p-3 sticky left-0 bg-bakery-surface z-10 font-bold border-r border-bakery-border/50">カテゴリ・商品名</th><th className="p-3 text-center border-r border-bakery-border/50 bg-bakery-surface font-bold">期間合計</th>{dailyData.dates.map(date => (<th key={date} className="p-3 text-center border-r border-bakery-border/50 font-bold">{formatShortDate(date)}</th>))}</tr></thead>
                    <tbody>
                      {sortedCategoryKeys.map(cat => {
                        const itemsInCategory = groupedDailyItems[cat];
                        const categoryTotalQty = itemsInCategory.reduce((catSum, [_, data]) => catSum + Object.values(data.dateMap).reduce((sum, q) => sum + q, 0), 0);
                        return (
                          <React.Fragment key={cat}>
                            <tr className="bg-bakery-border/30 border-b border-bakery-border"><td className="p-3 font-bold text-bakery-primary sticky left-0 bg-bakery-bg z-10 border-r border-bakery-border/50">📂 {cat}</td><td className="p-3 text-center font-bold text-bakery-primary border-r border-bakery-border/50 bg-bakery-gold/20">{categoryTotalQty}</td>{dailyData.dates.map(date => { const dateTotal = itemsInCategory.reduce((sum, [_, data]) => sum + (data.dateMap[date] || 0), 0); return (<td key={date} className={`p-3 text-center border-r border-bakery-border/50 ${dateTotal > 0 ? 'font-bold text-bakery-primary' : 'text-transparent'}`}>{dateTotal > 0 ? dateTotal : '-'}</td>); })}</tr>
                            {itemsInCategory.map(([itemName, dataObj], index) => {
                              const itemTotalQty = Object.values(dataObj.dateMap).reduce((sum, qty) => sum + qty, 0);
                              return (
                                <tr key={itemName} className={`border-b hover:bg-[#FAFAFA] ${index % 2 !== 0 ? 'bg-[#FCFBFA]' : ''}`}><td className="p-3 pl-8 text-bakery-textMain sticky left-0 bg-inherit z-10 border-r border-bakery-border/50">└ {itemName}</td><td className="p-3 text-center font-bold text-[#8B6340] border-r border-bakery-border/50 bg-bakery-surface/30">{itemTotalQty}</td>{dailyData.dates.map(date => { const qty = dataObj.dateMap[date] || 0; return (<td key={date} className={`p-3 text-center border-r border-bakery-border/50 ${qty > 0 ? 'font-bold text-bakery-textMain' : 'text-gray-300'}`}>{qty > 0 ? qty : '-'}</td>); })}</tr>
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

      {activeTab !== 'dashboard' && (
        <div className="animate-fade-in-up">
          {activeTab === 'prod_shop' && renderSingleReportTable('ショップ用 製造実績表', '厨房提出用', shopProdMatrix, false)}
          {activeTab === 'sales_shop' && renderSingleReportTable('ショップ用 販売実績表', '店舗用', shopSalesMatrix, true)}
          {activeTab === 'prod_wholesale' && renderSingleReportTable('施設買上用 製造実績表', '厨房提出用', wholesaleProdMatrix, false)}
          {activeTab === 'sales_wholesale' && renderSingleReportTable('施設買上用 販売実績表', '店舗用', wholesaleSalesMatrix, true)}
        </div>
      )}
    </div>
  );
}