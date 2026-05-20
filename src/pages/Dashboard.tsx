// src/pages/Dashboard.tsx
import React, { useEffect, useState, useCallback } from 'react'; // ⭐️ React をインポートに追加
import { supabase } from '../lib/supabase';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

// ⭐️ カテゴリ変換用マスタ（Analyze.tsxと同じものを用意）
const CATEGORY_MAP: Record<string, string> = {
  "CAT_001": "🍞 パン",
  "CAT_002": "🍪 クッキー",
  "CAT_003": "🍦 ソフトクリーム",
  "CAT_004": "☕ コーヒー",
  "CAT_UNKNOWN": "❓ 未分類"
};

export default function Dashboard() {
  const [ranking, setRanking] = useState<{name: string, category: string, totalSales: number, totalQty: number}[]>([]);
  const [dailyData, setDailyData] = useState<{ dates: string[], items: Record<string, { category: string, dateMap: Record<string, number> }> }>({ dates: [], items: {} });
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const [filterText, setFilterText] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  const fetchData = useCallback(async () => {
    const { data: sessionData } = await supabase.from('scan_sessions').select('id, scanned_at')
      .gte('scanned_at', `${startDate} 00:00:00`).lte('scanned_at', `${endDate} 23:59:59`);
      
    if (sessionData && sessionData.length > 0) {
      const sessionDateMap: Record<number, string> = {};
      const uniqueDates = new Set<string>();
      sessionData.forEach(s => { const dateOnly = s.scanned_at.split(' ')[0]; sessionDateMap[s.id] = dateOnly; uniqueDates.add(dateOnly); });
      const sortedDates = Array.from(uniqueDates).sort();

      const sessionIds = sessionData.map(s => s.id);
      const { data: itemsData } = await supabase.from('scan_items').select('session_id, name, subtotal, quantity, category').in('session_id', sessionIds);
      
      if (itemsData) {
        const agg: Record<string, { name: string; category: string; totalSales: number; totalQty: number }> = {};
        const crossTable: Record<string, { category: string, dateMap: Record<string, number> }> = {};

        itemsData.forEach(item => {
          // ⭐️ データベースの「CAT_001」を「🍞 パン」に変換して集計する
          const cat = CATEGORY_MAP[item.category] || CATEGORY_MAP["CAT_UNKNOWN"];

          if(!agg[item.name]) agg[item.name] = { name: item.name, category: cat, totalSales: 0, totalQty: 0 }; 
          agg[item.name].totalSales += item.subtotal; 
          agg[item.name].totalQty += item.quantity;
          
          const itemDate = sessionDateMap[item.session_id];
          if(!crossTable[item.name]) crossTable[item.name] = { category: cat, dateMap: {} };
          if(!crossTable[item.name].dateMap[itemDate]) crossTable[item.name].dateMap[itemDate] = 0;
          crossTable[item.name].dateMap[itemDate] += item.quantity;
        });

        setRanking(Object.values(agg).sort((a,b) => b.totalSales - a.totalSales));
        setDailyData({ dates: sortedDates, items: crossTable });
      }
    } else {
      setRanking([]); setDailyData({ dates: [], items: {} });
    }
  }, [startDate, endDate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleDeleteAll = async () => {
    if (window.confirm("本当に全ての履歴を削除しますか？\n（※顧客データは消えません）")) {
      await supabase.from('scan_items').delete().neq('id', 0);
      await supabase.from('scan_sessions').delete().neq('id', 0);
      fetchData();
    }
  };

  const handlePrint = () => window.print();
  const formatShortDate = (dateStr: string) => { const [, month, day] = dateStr.split('-'); return `${parseInt(month)}/${parseInt(day)}`; };

  const filteredRanking = ranking.filter(r => r.name.includes(filterText) && (filterCategory === "" || r.category === filterCategory));
  const filteredDailyItems = Object.entries(dailyData.items).filter(([name, data]) => name.includes(filterText) && (filterCategory === "" || data.category === filterCategory));

  // ⭐️ 存在するカテゴリ（「🍞 パン」など）の一覧を抽出してソート
  const uniqueCategories = Array.from(new Set(ranking.map(r => r.category))).sort();

  const groupedDailyItems: Record<string, typeof filteredDailyItems> = {};
  filteredDailyItems.forEach(item => {
    const cat = item[1].category;
    if (!groupedDailyItems[cat]) groupedDailyItems[cat] = [];
    groupedDailyItems[cat].push(item);
  });
  const sortedCategoryKeys = Object.keys(groupedDailyItems).sort();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto bg-bakery-bg">
      <div className="no-print flex flex-col md:flex-row justify-between items-end md:items-center mb-4 border-b-2 border-bakery-border pb-4 gap-4">
        <h1 className="text-3xl font-bold text-bakery-textMain">📈 売上集計ダッシュボード</h1>
        {ranking.length > 0 && (
          <div className="flex gap-2">
            <button onClick={handlePrint} className="bg-white border-2 border-bakery-primary text-bakery-primary hover:bg-[#FDF0D5] px-4 py-2 rounded font-bold shadow-sm transition-colors">🖨️ 印刷 / PDF保存</button>
            <button onClick={handleDeleteAll} className="border-2 border-red-400 text-red-500 px-4 py-2 rounded font-bold hover:bg-red-50">🗑️ 履歴全削除</button>
          </div>
        )}
      </div>

      <div className="no-print bg-white p-4 rounded-xl border border-bakery-border shadow-sm mb-8 flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <span className="font-bold text-bakery-textMain whitespace-nowrap">🔍 絞り込み :</span>
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)} className="p-2 border border-bakery-border rounded bg-bakery-bg outline-none focus:ring-2 focus:ring-bakery-gold min-w-[140px]">
              <option value="">すべて</option>
              {/* ⭐️ プルダウンに綺麗なカテゴリ名を表示 */}
              {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </select>
          </div>
          <div className="w-full sm:w-auto">
            <input type="text" placeholder="商品名で検索..." value={filterText} onChange={e=>setFilterText(e.target.value)} className="w-full p-2 border border-bakery-border rounded bg-bakery-bg outline-none focus:ring-2 focus:ring-bakery-gold" />
          </div>
        </div>

        <div className="flex items-center gap-2 w-full lg:w-auto justify-end">
          <span className="font-bold text-bakery-textMain whitespace-nowrap">📅 集計期間 :</span>
          <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="p-2 border border-bakery-border rounded bg-bakery-bg outline-none" />
          <span className="font-bold text-[#8B6340]">〜</span>
          <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="p-2 border border-bakery-border rounded bg-bakery-bg outline-none" />
        </div>
      </div>

      {ranking.length === 0 || filteredRanking.length === 0 ? (
         <div className="no-print border-2 border-dashed border-bakery-border p-16 text-center rounded-lg text-[#8B6340] bg-bakery-surface">
           <p className="text-4xl mb-4">📊</p>
           <p>指定条件のデータがありません。</p>
         </div>
      ) : (
        <div className="animate-fade-in-up space-y-10">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-bakery-border h-[350px] flex flex-col">
              <h2 className="text-lg font-bold text-bakery-textMain mb-4">💰 売上金額 TOP10 {filterCategory && <span className="text-sm font-normal text-bakery-primary bg-bakery-bg px-2 py-1 rounded ml-2">{filterCategory}</span>}</h2>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={filteredRanking.slice(0, 10)} layout="vertical" margin={{ left: 40, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill:'#3D2B1F', fontSize: 12}}/>
                    <Tooltip formatter={(v)=>[`￥${Number(v).toLocaleString()}`, "売上"]} contentStyle={{ backgroundColor: '#FDF0D5', borderColor: '#E0C898', borderRadius: '8px' }}/>
                    <Bar dataKey="totalSales" radius={[0,4,4,0]}>{filteredRanking.slice(0, 10).map((_,i)=><Cell key={i} fill="#8B5E3C"/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            <div className="bg-white p-6 rounded-lg shadow-sm border border-bakery-border h-[350px] flex flex-col">
              <h2 className="text-lg font-bold text-bakery-textMain mb-4">📦 販売個数 TOP10 {filterCategory && <span className="text-sm font-normal text-bakery-primary bg-bakery-bg px-2 py-1 rounded ml-2">{filterCategory}</span>}</h2>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[...filteredRanking].sort((a,b)=>b.totalQty - a.totalQty).slice(0, 10)} layout="vertical" margin={{ left: 40, right: 20 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill:'#3D2B1F', fontSize: 12}}/>
                    <Tooltip formatter={(v)=>[`${Number(v).toLocaleString()} 個`, "個数"]} contentStyle={{ backgroundColor: '#FDF0D5', borderColor: '#E0C898', borderRadius: '8px' }}/>
                    <Bar dataKey="totalQty" radius={[0,4,4,0]}>{filteredRanking.slice(0, 10).map((_,i)=><Cell key={i} fill="#D4A96A"/>)}</Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-bakery-border overflow-hidden">
            <div className="hidden print-only mb-6">
              <h1 className="text-2xl font-bold text-bakery-textMain border-b-2 border-bakery-textMain pb-2">
                売上・製造集計表（{startDate} 〜 {endDate}）
                {filterCategory && <span className="text-lg ml-4">【{filterCategory}】</span>}
              </h1>
            </div>

            <div className="flex flex-col md:flex-row md:justify-between md:items-end mb-4">
              <h2 className="no-print text-xl font-bold text-bakery-textMain flex items-center gap-2">
                🗓️ 商品別 × 日別 販売個数カレンダー
              </h2>
              <div className="text-xl font-bold text-bakery-primary bg-[#FDF0D5] px-4 py-2 rounded-lg border border-[#E0C898] shadow-sm mt-2 md:mt-0 inline-block">
                総合計金額: ￥{filteredRanking.reduce((sum, r) => sum + r.totalSales, 0).toLocaleString()}
              </div>
            </div>
            
            <div className="overflow-x-auto pb-4">
              <table className="w-full text-sm text-left border-collapse min-w-max">
                <thead>
                  <tr className="bg-bakery-surface text-bakery-primary border-b-2 border-bakery-border">
                    <th className="p-3 sticky left-0 bg-bakery-surface z-10 font-bold border-r border-bakery-border/50">カテゴリ・商品名</th>
                    <th className="p-3 text-center border-r border-bakery-border/50 bg-[#FDF0D5] font-bold">販売個数合計</th>
                    <th className="p-3 text-center border-r border-bakery-border/50 bg-[#FDF0D5] font-bold">売上金額合計</th>
                    {dailyData.dates.map(date => (
                      <th key={date} className="p-3 text-center border-r border-bakery-border/50 font-bold">
                        {formatShortDate(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedCategoryKeys.map(cat => {
                    const itemsInCategory = groupedDailyItems[cat];
                    const categoryTotalQty = itemsInCategory.reduce((catSum, [, data]) => {
                      return catSum + Object.values(data.dateMap).reduce((sum, q) => sum + q, 0);
                    }, 0);
                    const categoryTotalAmount = itemsInCategory.reduce((catSum, [itemName]) => {
                      const r = filteredRanking.find(r => r.name === itemName);
                      return catSum + (r ? r.totalSales : 0);
                    }, 0);

                    return (
                      <React.Fragment key={cat}>
                        <tr className="bg-[#E0C898]/30 border-b border-bakery-border">
                          <td className="p-3 font-bold text-bakery-primary sticky left-0 bg-[#F5EDD6] z-10 border-r border-bakery-border/50">
                            📂 {cat}
                          </td>
                          <td className="p-3 text-center font-bold text-bakery-primary border-r border-bakery-border/50 bg-[#D4A96A]/20">
                            {categoryTotalQty} 個
                          </td>
                          <td className="p-3 text-center font-bold text-bakery-primary border-r border-bakery-border/50 bg-[#D4A96A]/20">
                            ￥{categoryTotalAmount.toLocaleString()}
                          </td>
                          {dailyData.dates.map(date => {
                            const dateTotal = itemsInCategory.reduce((sum, [, data]) => sum + (data.dateMap[date] || 0), 0);
                            return (
                              <td key={date} className={`p-3 text-center border-r border-bakery-border/50 ${dateTotal > 0 ? 'font-bold text-bakery-primary' : 'text-transparent'}`}>
                                {dateTotal > 0 ? dateTotal : '-'}
                              </td>
                            );
                          })}
                        </tr>

                        {itemsInCategory.map(([itemName, dataObj], index) => {
                          const itemTotalQty = Object.values(dataObj.dateMap).reduce((sum, qty) => sum + qty, 0);
                          const r = filteredRanking.find(r => r.name === itemName);
                          const itemTotalAmount = r ? r.totalSales : 0;
                          return (
                            <tr key={itemName} className={`border-b border-gray-200 hover:bg-[#FAFAFA] ${index % 2 !== 0 ? 'bg-[#FCFBFA]' : ''}`}>
                              <td className="p-3 pl-8 text-bakery-textMain sticky left-0 bg-inherit z-10 border-r border-bakery-border/50">
                                └ {itemName}
                              </td>
                              <td className="p-3 text-center font-bold text-[#8B6340] border-r border-bakery-border/50 bg-[#FDF0D5]/30">
                                {itemTotalQty}
                              </td>
                              <td className="p-3 text-center font-bold text-[#8B6340] border-r border-bakery-border/50 bg-[#FDF0D5]/30">
                                ￥{itemTotalAmount.toLocaleString()}
                              </td>
                              {dailyData.dates.map(date => {
                                const qty = dataObj.dateMap[date] || 0;
                                return (
                                  <td key={date} className={`p-3 text-center border-r border-bakery-border/50 ${qty > 0 ? 'font-bold text-bakery-textMain' : 'text-gray-300'}`}>
                                    {qty > 0 ? qty : '-'}
                                  </td>
                                );
                              })}
                            </tr>
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
  );
}