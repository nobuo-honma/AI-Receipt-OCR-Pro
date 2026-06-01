// src/pages/Production.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Product = { id: number; name: string; target_qty: number; sort_order: number; category: string; };

export default function Production() {
    const [products, setProducts] = useState<Product[]>([]);
    const [productionDate, setProductionDate] = useState(() => new Date().toISOString().split('T')[0]);
    const [productionQuantities, setProductionQuantities] = useState<Record<number, number>>({});
    const [isSaving, setIsSaving] = useState(false);

    // マスタ（製品一覧）の取得
    useEffect(() => {
        supabase.from('products').select('*').order('sort_order', { ascending: true })
            .then(({ data }) => { if (data) setProducts(data); });
    }, []);

    // 選択した日付の「すでに登録済みの製造実績」があれば読み込む
    useEffect(() => {
        const fetchTodayProduction = async () => {
            const { data } = await supabase.from('production_records').select('*').eq('production_date', productionDate);
            const qtys: Record<number, number> = {};
            if (data) {
                data.forEach(record => { qtys[record.product_id] = record.quantity; });
            }
            setProductionQuantities(qtys);
        };
        fetchTodayProduction();
    }, [productionDate]);

    const handleQtyChange = (productId: number, qty: number) => {
        setProductionQuantities(prev => ({ ...prev, [productId]: Math.max(0, qty) }));
    };

    // 製造実績を一括保存
    const saveProduction = async () => {
        setIsSaving(true);
        const upsertData = Object.entries(productionQuantities).map(([productId, qty]) => ({
            product_id: parseInt(productId),
            production_date: productionDate,
            quantity: qty
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
        <div className="p-4 md:p-8 max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-6 border-b-2 border-bakery-border pb-4 gap-4">
                <h1 className="text-3xl font-bold text-bakery-textMain">👨‍🍳 製造実績入力</h1>
                <div className="flex items-center gap-3">
                    <span className="font-bold text-[#8B6340]">📅 製造日:</span>
                    <input
                        type="date"
                        value={productionDate}
                        onChange={e => setProductionDate(e.target.value)}
                        className="p-3 border border-bakery-border rounded-lg font-bold outline-none focus:ring-2 focus:ring-bakery-gold bg-white shadow-sm text-bakery-textMain"
                    />
                </div>
            </div>

            <div className="flex items-start gap-2 bg-[#FFF8E7] border border-bakery-border/50 text-[#8B6340] text-sm p-4 rounded-lg shadow-sm mb-6">
                <span className="text-bakery-gold text-lg leading-none mt-0.5">💡</span>
                <p className="leading-relaxed">
                    厨房で作ったパンの数（製造実績）を入力し、「確定して保存」を押してください。<br />
                    ここで入力した数字は、ダッシュボードの「製造実績表」に反映され、販売数と比較できるようになります。
                </p>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-bakery-border overflow-hidden flex flex-col">
                <div className="flex-1 overflow-y-auto p-4">
                    <table className="w-full text-sm text-left">
                        <thead className="sticky top-0 bg-white shadow-sm z-10">
                            <tr className="text-[#8B6340] bg-bakery-surface border-b-2 border-bakery-border">
                                <th className="p-3">商品名</th>
                                <th className="p-3 text-center w-24">予定数</th>
                                <th className="p-3 text-center w-40">製造数 (実績)</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((p, index) => {
                                const currentQty = productionQuantities[p.id] || 0;
                                // 予定と実績が違う場合は色を変える
                                const diffColor = currentQty < p.target_qty ? 'text-red-500' : currentQty > p.target_qty ? 'text-blue-500' : 'text-green-600';

                                return (
                                    <tr key={p.id} className={`border-b hover:bg-[#FAFAFA] ${index % 2 !== 0 ? 'bg-[#FCFBFA]' : ''}`}>
                                        <td className="p-3 font-bold text-bakery-textMain">
                                            {p.name}
                                            <span className="ml-2 text-[10px] text-[#8B6340] bg-bakery-bg px-1.5 py-0.5 rounded font-normal">{p.category}</span>
                                        </td>
                                        <td className="p-3 text-center text-gray-500 font-bold">{p.target_qty > 0 ? p.target_qty : '-'}</td>
                                        <td className="p-3 flex items-center justify-center gap-2">
                                            <button onClick={() => handleQtyChange(p.id, currentQty - 1)} className="w-8 h-8 bg-gray-200 rounded-full font-bold text-gray-600 hover:bg-gray-300 shadow-sm transition-colors">-</button>
                                            <input
                                                type="number"
                                                min="0"
                                                value={currentQty || ''}
                                                onChange={e => handleQtyChange(p.id, parseInt(e.target.value) || 0)}
                                                className={`w-14 text-center font-bold text-lg border-b-2 border-transparent focus:border-bakery-gold outline-none bg-transparent ${diffColor}`}
                                                placeholder="0"
                                            />
                                            <button onClick={() => handleQtyChange(p.id, currentQty + 1)} className="w-8 h-8 bg-bakery-primary rounded-full font-bold text-white hover:bg-[#8B5E3C] shadow-sm transition-colors">+</button>
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