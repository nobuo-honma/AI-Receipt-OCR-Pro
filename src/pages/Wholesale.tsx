// src/pages/Wholesale.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Product = { id: number; name: string; price: number; sort_order: number; category: string; };

export default function Wholesale() {
    const [products, setProducts] = useState<Product[]>([]);
    const [salesDate, setSalesDate] = useState(() => new Date().toISOString().split('T')[0]);

    // 入力された数量を管理するステート
    const [quantities, setQuantities] = useState<Record<number, number>>({});
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        supabase.from('products').select('*').order('sort_order', { ascending: true })
            .then(({ data }) => { if (data) setProducts(data); });
    }, []);

    const handleQtyChange = (productId: number, qty: number) => {
        setQuantities(prev => ({ ...prev, [productId]: Math.max(0, qty) }));
    };

    const calculateTotal = () => {
        return Object.entries(quantities).reduce((sum, [productId, qty]) => {
            const product = products.find(p => p.id === parseInt(productId));
            return sum + (product ? product.price * qty : 0);
        }, 0);
    };

    const handleSaveToDB = async () => {
        const totalItems = Object.values(quantities).reduce((sum, q) => sum + q, 0);
        if (totalItems === 0 || isSaving) return alert("保存するデータがありません");

        setIsSaving(true);
        try {
            // 1. scan_sessions に「施設買上 (wholesale)」として保存
            const { data: sessionData, error: sessionErr } = await supabase
                .from('scan_sessions')
                .insert({
                    scanned_at: `${salesDate} 12:00:00`,
                    total_amt: calculateTotal(),
                    sales_type: 'wholesale' // ⭐️ ここで施設買上として区別する
                })
                .select('id').single();

            if (sessionErr || !sessionData) throw sessionErr;

            // 2. scan_items に明細を保存
            const itemsToInsert = Object.entries(quantities)
                .filter(([_, qty]) => qty > 0)
                .map(([productId, qty]) => {
                    const product = products.find(p => p.id === parseInt(productId));
                    return {
                        session_id: sessionData.id,
                        name: product?.name || "",
                        unit_price: product?.price || 0,
                        quantity: qty,
                        subtotal: (product?.price || 0) * qty,
                        category: product?.category || "❓ 未分類",
                        sales_type: 'wholesale' // ⭐️ 明細も施設買上として区別
                    };
                });

            const { error: itemsErr } = await supabase.from('scan_items').insert(itemsToInsert);
            if (itemsErr) throw itemsErr;

            alert(`${salesDate} の施設買上（卸売）実績を保存しました！`);
            setQuantities({}); // 保存後にリセット
        } catch (err: any) {
            alert("保存に失敗しました。\n" + err.message);
        } finally {
            setIsSaving(false);
        }
    };

    const totalAmount = calculateTotal();

    return (
        <div className="p-4 md:p-8 max-w-4xl mx-auto h-[calc(100vh-80px)] flex flex-col">
            <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-6 border-b-2 border-bakery-border pb-4 gap-4">
                <h1 className="text-3xl font-bold text-bakery-textMain">🏢 施設買上（卸売）入力</h1>
                <div className="flex items-center gap-3">
                    <span className="font-bold text-[#8B6340]">📅 売上日:</span>
                    <input type="date" value={salesDate} onChange={e => setSalesDate(e.target.value)} className="p-3 border border-bakery-border rounded-lg font-bold outline-none focus:ring-2 focus:ring-bakery-gold bg-white shadow-sm text-bakery-textMain" />
                </div>
            </div>

            <div className="flex items-start gap-2 bg-[#FFF8E7] border border-bakery-border/50 text-[#8B6340] text-sm p-4 rounded-lg shadow-sm mb-6">
                <span className="text-bakery-gold text-lg leading-none mt-0.5">💡</span>
                <p className="leading-relaxed">
                    施設買上やイベント出店など、レジを通さない外部卸しの売上を入力します。<br />
                    ここで入力した売上は、ダッシュボードで店頭販売分と区別して集計されます。
                </p>
            </div>

            <div className="flex-1 bg-white rounded-xl shadow-sm border border-bakery-border overflow-hidden flex flex-col">

                <div className="bg-linear-to-br from-bakery-textMain to-bakery-primary p-4 text-center border-b border-[#4A2E1A]">
                    <p className="font-playfair italic text-bakery-gold text-xs tracking-[0.15em] mb-1">TOTAL AMOUNT</p>
                    <p className="font-zen font-bold text-[#FDF6E3] text-3xl">￥{totalAmount.toLocaleString()}</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    <table className="w-full text-sm text-left border-collapse">
                        <thead className="sticky top-0 bg-white shadow-sm z-10">
                            <tr className="text-[#8B6340] border-b-2 border-bakery-border">
                                <th className="p-3">商品名</th>
                                <th className="p-3 text-right w-24">単価</th>
                                <th className="p-3 text-center w-36">販売数</th>
                                <th className="p-3 text-right w-28">小計</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((p, index) => {
                                const qty = quantities[p.id] || 0;
                                return (
                                    <tr key={p.id} className={`border-b hover:bg-[#FAFAFA] ${index % 2 !== 0 ? 'bg-[#FCFBFA]' : ''}`}>
                                        <td className="p-3 font-bold text-bakery-textMain">
                                            {p.name}
                                            <span className="ml-2 text-[10px] text-[#8B6340] bg-bakery-bg px-1.5 py-0.5 rounded font-normal">{p.category}</span>
                                        </td>
                                        <td className="p-3 text-right text-gray-500">￥{p.price}</td>
                                        <td className="p-2 border-l border-bakery-border/30 bg-blue-50/20">
                                            <div className="flex items-center justify-center gap-2">
                                                <button onClick={() => handleQtyChange(p.id, qty - 1)} className="w-8 h-8 bg-gray-200 rounded-full font-bold text-gray-600 hover:bg-gray-300">-</button>
                                                <input type="number" min="0" value={qty || ''} onChange={e => handleQtyChange(p.id, parseInt(e.target.value) || 0)} className="w-12 text-center font-bold text-lg border-b-2 border-transparent focus:border-blue-400 outline-none bg-transparent text-blue-600" placeholder="0" />
                                                <button onClick={() => handleQtyChange(p.id, qty + 1)} className="w-8 h-8 bg-blue-500 rounded-full font-bold text-white hover:bg-blue-600">+</button>
                                            </div>
                                        </td>
                                        <td className="p-3 text-right font-bold text-bakery-primary">￥{(p.price * qty).toLocaleString()}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                <div className="p-4 border-t border-bakery-border bg-gray-50">
                    <button onClick={handleSaveToDB} disabled={isSaving || totalAmount === 0} className="w-full py-4 bg-bakery-primary text-bakery-gold rounded-xl font-bold shadow-md hover:bg-[#8B5E3C] disabled:bg-gray-400 disabled:text-white text-lg transition-transform active:scale-95">
                        {isSaving ? '⏳ 保存中...' : '💾 施設買上（卸売）実績を保存'}
                    </button>
                </div>
            </div>
        </div>
    );
}