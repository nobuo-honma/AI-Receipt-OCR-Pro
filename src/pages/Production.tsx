// src/pages/Production.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Product = { id: number; name: string; target_qty: number; sort_order: number; category: string; };

export default function Production() {
    const [products, setProducts] = useState<Product[]>([]);
    const [productionDate, setProductionDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [quantities, setQuantities] = useState<Record<number, { total: number, shop: number }>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        supabase.from('products').select('*').order('sort_order', { ascending: true })
            .then(({ data }) => { if (data) setProducts(data); });
    }, []);

    useEffect(() => {
        const fetchTodayProduction = async () => {
            const { data } = await supabase.from('production_records').select('*').eq('production_date', productionDate);
            const qtys: Record<number, { total: number, shop: number }> = {};
            if (data) {
                data.forEach(record => {
                    qtys[record.product_id] = { total: record.quantity, shop: record.shop_quantity || 0 };
                });
            }
            setQuantities(qtys);
        };
        fetchTodayProduction();
    }, [productionDate]);

    const handleTotalQtyChange = (productId: number, qty: number) => {
        const val = Math.max(0, qty);
        setQuantities(prev => ({
            ...prev,
            [productId]: { total: val, shop: prev[productId]?.shop || 0 }
        }));
    };

    const handleShopQtyChange = (productId: number, qty: number) => {
        const val = Math.max(0, qty);
        setQuantities(prev => {
            const currentTotal = prev[productId]?.total || 0;
            const safeVal = Math.min(val, currentTotal > 0 ? currentTotal : val);
            return {
                ...prev,
                [productId]: { total: prev[productId]?.total || safeVal, shop: safeVal }
            };
        });
    };

    const saveProduction = async () => {
        setIsSaving(true);
        const upsertData = Object.entries(quantities).map(([productId, data]) => ({
            product_id: parseInt(productId),
            production_date: productionDate,
            quantity: data.total,
            shop_quantity: data.shop
        }));

        if (upsertData.length > 0) {
            const { error } = await supabase.from('production_records').upsert(upsertData, { onConflict: 'product_id, production_date' });
            if (error) alert("保存に失敗しました。\n" + error.message);
            else alert(`${productionDate} の製造実績を保存しました！`);
        } else {
            alert("入力されたデータがありません。");
        }
        setIsSaving(false);
    };

    return (
        <div className="p-4 md:p-8 max-w-6xl mx-auto h-[calc(100vh-80px)] flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-6 border-b-2 border-bakery-border pb-4 gap-4">
                <h1 className="text-3xl font-bold text-bakery-textMain">👨‍🍳 製造実績入力</h1>
                <div className="flex items-center gap-3">
                    <span className="font-bold text-[#8B6340]">📅 製造日:</span>
                    <input type="date" value={productionDate} onChange={e => setProductionDate(e.target.value)} className="p-3 border border-bakery-border rounded-lg font-bold outline-none focus:ring-2 focus:ring-bakery-gold bg-white shadow-sm text-bakery-textMain" />
                </div>
            </div>

            <div className="flex items-start gap-2 bg-[#FFF8E7] border border-bakery-border/50 text-[#8B6340] text-sm p-4 rounded-lg shadow-sm mb-6">
                <span className="text-bakery-gold text-lg leading-none mt-0.5">💡</span>
                <p className="leading-relaxed">
                    「総製造数」と、そのうち店頭に並べる「ショップ用」の数を分けて入力してください。<br />
                    （※総製造数 － ショップ用 ＝ 施設買上などの外部卸し分として計算されます）
                </p>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-bakery-border overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="sticky top-0 bg-bakery-surface shadow-sm z-10 border-b-2 border-bakery-border">
                            <tr className="text-[#8B6340]">
                                <th className="p-3">商品名</th>
                                <th className="p-3 text-center w-24 border-l border-bakery-border/30">予定数</th>
                                <th className="p-3 text-center w-48 border-l border-bakery-border/30 bg-bakery-surface/50">総製造数</th>
                                <th className="p-3 text-center w-48 border-l border-bakery-border/30 bg-blue-50/50">ショップ用</th>
                                <th className="p-3 text-center w-24 border-l border-bakery-border/30 text-gray-500">外部卸し分</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((p, index) => {
                                const totalQty = quantities[p.id]?.total || 0;
                                const shopQty = quantities[p.id]?.shop || 0;
                                const wholesaleQty = totalQty - shopQty;

                                return (
                                    <tr key={p.id} className={`border-b hover:bg-[#FAFAFA] ${index % 2 !== 0 ? 'bg-[#FCFBFA]' : ''}`}>
                                        <td className="p-3 font-bold text-bakery-textMain">
                                            {p.name}
                                            <span className="ml-2 text-[10px] text-[#8B6340] bg-bakery-bg px-1.5 py-0.5 rounded font-normal">{p.category}</span>
                                        </td>
                                        <td className="p-3 text-center text-gray-500 font-bold border-l border-bakery-border/30">{p.target_qty > 0 ? p.target_qty : '-'}</td>

                                        {/* 総製造数の入力 */}
                                        <td className="p-2 border-l border-bakery-border/30 bg-bakery-surface/20">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleTotalQtyChange(p.id, totalQty - 1)} className="w-8 h-8 bg-gray-200 rounded-full font-bold text-gray-600 hover:bg-gray-300">-</button>
                                                <input type="number" min="0" value={totalQty || ''} onChange={e => handleTotalQtyChange(p.id, parseInt(e.target.value) || 0)} className="w-14 text-center font-bold text-lg border-b-2 border-transparent focus:border-bakery-gold outline-none bg-transparent text-bakery-primary" placeholder="0" />
                                                <button onClick={() => handleTotalQtyChange(p.id, totalQty + 1)} className="w-8 h-8 bg-bakery-gold rounded-full font-bold text-white hover:bg-[#C4A882]">+</button>
                                            </div>
                                        </td>

                                        {/* ショップ用の入力 */}
                                        <td className="p-2 border-l border-bakery-border/30 bg-blue-50/20">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleShopQtyChange(p.id, shopQty - 1)} className="w-8 h-8 bg-gray-200 rounded-full font-bold text-gray-600 hover:bg-gray-300">-</button>
                                                <input type="number" min="0" value={shopQty || ''} onChange={e => handleShopQtyChange(p.id, parseInt(e.target.value) || 0)} className="w-14 text-center font-bold text-lg border-b-2 border-transparent focus:border-blue-400 outline-none bg-transparent text-blue-600" placeholder="0" />
                                                <button onClick={() => handleShopQtyChange(p.id, shopQty + 1)} className="w-8 h-8 bg-blue-500 rounded-full font-bold text-white hover:bg-blue-600">+</button>
                                            </div>
                                        </td>

                                        {/* 外部卸し分（自動計算で表示だけ） */}
                                        <td className="p-3 text-center text-gray-500 font-bold border-l border-bakery-border/30 bg-gray-50/50">
                                            {wholesaleQty > 0 ? wholesaleQty : '-'}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-bakery-border bg-gray-50">
                    <button onClick={saveProduction} disabled={isSaving} className="w-full py-4 bg-[#10B981] text-white rounded-xl font-bold shadow-md hover:bg-green-600 disabled:bg-gray-400 text-lg transition-transform active:scale-95">
                        {isSaving ? '⏳ 保存中...' : '💾 製造実績を確定して保存'}
                    </button>
                </div>
            </div>
        </div>
    );
}