// src/pages/Production.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Product = { id: number; name: string; target_qty: number; sort_order: number; category: string; };

export default function Production() {
    const [products, setProducts] = useState<Product[]>([]);
    const [productionDate, setProductionDate] = useState(() => new Date().toISOString().split('T')[0]);

    // ⭐️ 修正：ステートを「ショップ用(shop)」と「その他用(other)」で管理する
    const [quantities, setQuantities] = useState<Record<number, { shop: number, other: number }>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        supabase.from('products').select('*').order('sort_order', { ascending: true })
            .then(({ data }) => { if (data) setProducts(data); });
    }, []);

    useEffect(() => {
        const fetchTodayProduction = async () => {
            const { data } = await supabase.from('production_records').select('*').eq('production_date', productionDate);
            const qtys: Record<number, { shop: number, other: number }> = {};
            if (data) {
                data.forEach(record => {
                    // データベースから読み込む時、総数(quantity)からショップ用(shop_quantity)を引いて「その他用」を復元する
                    const shop = record.shop_quantity || 0;
                    const total = record.quantity || 0;
                    qtys[record.product_id] = { shop: shop, other: Math.max(0, total - shop) };
                });
            }
            setQuantities(qtys);
        };
        fetchTodayProduction();
    }, [productionDate]);

    // ⭐️ 修正：ショップ用の入力ハンドラー
    const handleShopQtyChange = (productId: number, qty: number) => {
        const val = Math.max(0, qty);
        setQuantities(prev => ({
            ...prev,
            [productId]: { shop: val, other: prev[productId]?.other || 0 }
        }));
    };

    // ⭐️ 修正：その他用（外部卸し等）の入力ハンドラー
    const handleOtherQtyChange = (productId: number, qty: number) => {
        const val = Math.max(0, qty);
        setQuantities(prev => ({
            ...prev,
            [productId]: { shop: prev[productId]?.shop || 0, other: val }
        }));
    };

    const saveProduction = async () => {
        setIsSaving(true);
        const upsertData = Object.entries(quantities).map(([productId, data]) => ({
            product_id: parseInt(productId),
            production_date: productionDate,
            // ⭐️ 保存時に「ショップ用＋その他用」を合算して「総製造数(quantity)」としてDBに書き込む！
            quantity: data.shop + data.other,
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
                    店頭に並べる「ショップ用」と、施設買上などの「その他用」を分けて入力してください。<br />
                    （※合計数は自動で計算され、ダッシュボードに反映されます）
                </p>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-bakery-border overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="sticky top-0 bg-bakery-surface shadow-sm z-10 border-b-2 border-bakery-border">
                            <tr className="text-[#8B6340]">
                                <th className="p-3">商品名</th>
                                <th className="p-3 text-center w-24 border-l border-bakery-border/30">予定数</th>
                                {/* ⭐️ ヘッダーの並びを変更 */}
                                <th className="p-3 text-center w-48 border-l border-bakery-border/30 bg-blue-50/80">ショップ用</th>
                                <th className="p-3 text-center w-48 border-l border-bakery-border/30 bg-orange-50/80">その他用</th>
                                <th className="p-3 text-center w-24 border-l border-bakery-border/30 bg-bakery-surface/80">合計数</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((p, index) => {
                                const shopQty = quantities[p.id]?.shop || 0;
                                const otherQty = quantities[p.id]?.other || 0;
                                const totalQty = shopQty + otherQty; // 自動計算される合計数

                                // 予定数（目標）と、自動計算された合計数を比較して色を変える
                                const diffColor = totalQty < p.target_qty ? 'text-red-500' : totalQty > p.target_qty ? 'text-blue-500' : 'text-green-600';

                                return (
                                    <tr key={p.id} className={`border-b hover:bg-[#FAFAFA] ${index % 2 !== 0 ? 'bg-[#FCFBFA]' : ''}`}>
                                        <td className="p-3 font-bold text-bakery-textMain">
                                            {p.name}
                                            <span className="ml-2 text-[10px] text-[#8B6340] bg-bakery-bg px-1.5 py-0.5 rounded font-normal">{p.category}</span>
                                        </td>
                                        <td className="p-3 text-center text-gray-500 font-bold border-l border-bakery-border/30">{p.target_qty > 0 ? p.target_qty : '-'}</td>

                                        {/* ショップ用の入力（青っぽいエリア） */}
                                        <td className="p-2 border-l border-bakery-border/30 bg-blue-50/20">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleShopQtyChange(p.id, shopQty - 1)} className="w-8 h-8 bg-gray-200 rounded-full font-bold text-gray-600 hover:bg-gray-300">-</button>
                                                <input type="number" min="0" value={shopQty || ''} onChange={e => handleShopQtyChange(p.id, parseInt(e.target.value) || 0)} className="w-14 text-center font-bold text-lg border-b-2 border-transparent focus:border-blue-400 outline-none bg-transparent text-blue-600" placeholder="0" />
                                                <button onClick={() => handleShopQtyChange(p.id, shopQty + 1)} className="w-8 h-8 bg-blue-500 rounded-full font-bold text-white hover:bg-blue-600">+</button>
                                            </div>
                                        </td>

                                        {/* その他用の入力（オレンジっぽいエリア） */}
                                        <td className="p-2 border-l border-bakery-border/30 bg-orange-50/20">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleOtherQtyChange(p.id, otherQty - 1)} className="w-8 h-8 bg-gray-200 rounded-full font-bold text-gray-600 hover:bg-gray-300">-</button>
                                                <input type="number" min="0" value={otherQty || ''} onChange={e => handleOtherQtyChange(p.id, parseInt(e.target.value) || 0)} className="w-14 text-center font-bold text-lg border-b-2 border-transparent focus:border-orange-400 outline-none bg-transparent text-orange-600" placeholder="0" />
                                                <button onClick={() => handleOtherQtyChange(p.id, otherQty + 1)} className="w-8 h-8 bg-orange-400 rounded-full font-bold text-white hover:bg-orange-500">+</button>
                                            </div>
                                        </td>

                                        {/* 合計数（自動計算で表示だけ） */}
                                        <td className={`p-3 text-center font-bold text-lg border-l border-bakery-border/30 bg-bakery-surface/30 ${diffColor}`}>
                                            {totalQty > 0 ? totalQty : '-'}
                                        </td>
                                    </tr>
                                );
                            })}

                            {/* ⭐️ 合計行 */}
                            <tr className="bg-gray-100 font-bold border-t-2 border-bakery-border text-lg">
                                <td className="p-3 text-center text-bakery-textMain" colSpan={2}>本日の製造 合計</td>

                                {/* ショップ用製造数の合計 */}
                                <td className="p-3 text-center text-blue-600 border-l border-bakery-border/30 bg-blue-50/50">
                                    {Object.values(quantities).reduce((sum, q) => sum + (q.shop || 0), 0)} 個
                                </td>

                                {/* その他用の合計 */}
                                <td className="p-3 text-center text-orange-600 border-l border-bakery-border/30 bg-orange-50/50">
                                    {Object.values(quantities).reduce((sum, q) => sum + (q.other || 0), 0)} 個
                                </td>

                                {/* 全体の合計 */}
                                <td className="p-3 text-center text-bakery-primary border-l border-bakery-border/30 bg-bakery-surface/50">
                                    {Object.values(quantities).reduce((sum, q) => sum + ((q.shop || 0) + (q.other || 0)), 0)} 個
                                </td>
                            </tr>

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