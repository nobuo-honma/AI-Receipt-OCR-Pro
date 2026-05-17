// src/pages/Master.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// ⭐️ target_qty (製造予定数) を追加
type Product = { id: number; receipt_name: string; name: string; price: number; target_qty: number; };

export default function Master() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editReceiptName, setEditReceiptName] = useState("");
    const [editName, setEditName] = useState("");
    const [editPrice, setEditPrice] = useState(0);
    const [editTargetQty, setEditTargetQty] = useState(0); // ⭐️ 追加

    const [showModal, setShowModal] = useState(false);
    const [newReceiptName, setNewReceiptName] = useState("");
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState<number | "">("");

    const fetchProducts = async () => {
        setLoading(true);
        const { data } = await supabase.from('products').select('*').order('id', { ascending: true });
        if (data) setProducts(data);
        setLoading(false);
    };
    useEffect(() => { fetchProducts(); }, []);

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReceiptName.trim() || !newName.trim() || newPrice === "" || newPrice < 0) return;
        const nReceipt = newReceiptName.trim().normalize("NFKC"); const nName = newName.trim().normalize("NFKC");
        if (products.some(p => p.receipt_name === nReceipt)) return alert("その『レシート表示名』はすでに登録されています");

        await supabase.from('products').insert({ receipt_name: nReceipt, name: nName, price: Number(newPrice), target_qty: 0 });
        setShowModal(false); setNewReceiptName(""); setNewName(""); setNewPrice(""); fetchProducts();
    };

    const saveEdit = async () => {
        await supabase.from('products').update({
            receipt_name: editReceiptName.normalize("NFKC"), name: editName.normalize("NFKC"), price: editPrice, target_qty: editTargetQty
        }).eq('id', editingId);
        setEditingId(null); fetchProducts();
    };

    const deleteProduct = async (id: number) => {
        if (window.confirm(`削除しますか？`)) { await supabase.from('products').delete().eq('id', id); fetchProducts(); }
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-4 border-b-2 border-bakery-border pb-4">
                <h1 className="text-3xl font-bold text-bakery-textMain">📖 製品マスタ管理</h1>
                <button onClick={() => setShowModal(true)} className="bg-bakery-primary text-white px-6 py-2 rounded-md font-bold hover:bg-[#8B5E3C]">➕ 新規商品</button>
            </div>

            <div className="flex items-start gap-2 bg-[#FFF8E7] border border-bakery-border/50 text-[#8B6340] text-sm p-4 rounded-lg shadow-sm mb-8">
                <span className="text-bakery-gold text-lg leading-none mt-0.5">💡</span>
                <p className="leading-relaxed">商品の登録に加え、日々の「製造予定数」を設定できます。設定した予定数は業務連絡チャットなどで共有できます。</p>
            </div>

            {!loading && products.length > 0 && (
                <table className="w-full bg-white rounded-lg shadow-sm border overflow-hidden">
                    <thead>
                        <tr className="bg-bakery-bg">
                            <th className="p-4 text-gray-500">印字名（レシート）</th>
                            <th className="p-4 font-bold text-bakery-primary">正式商品名</th>
                            <th className="p-4 text-right">単価</th>
                            <th className="p-4 text-center text-[#10B981]">製造予定数</th>
                            <th className="p-4 text-center">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((p) => (
                            <tr key={p.id} className="border-b">
                                <td className="p-4">{editingId === p.id ? <input value={editReceiptName} onChange={e => setEditReceiptName(e.target.value)} className="border p-1 w-full" /> : <span className="text-gray-500 text-sm">{p.receipt_name || p.name}</span>}</td>
                                <td className="p-4 font-bold">{editingId === p.id ? <input value={editName} onChange={e => setEditName(e.target.value)} className="border p-1 w-full" /> : p.name}</td>
                                <td className="p-4 text-right">{editingId === p.id ? <input type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} className="border p-1 w-20 text-right" /> : `￥${p.price}`}</td>

                                {/* ⭐️ 製造予定数の入力エリア */}
                                <td className="p-4 text-center font-bold text-[#10B981]">
                                    {editingId === p.id ? <input type="number" min="0" value={editTargetQty} onChange={e => setEditTargetQty(Number(e.target.value))} className="border border-[#10B981] p-1 w-16 text-center" /> : `${p.target_qty} 個`}
                                </td>

                                <td className="p-4 text-center">
                                    {editingId === p.id ? <button onClick={saveEdit} className="bg-green-500 text-white px-3 py-1 rounded">保存</button>
                                        : <button onClick={() => { setEditingId(p.id); setEditReceiptName(p.receipt_name || p.name); setEditName(p.name); setEditPrice(p.price); setEditTargetQty(p.target_qty); }} className="text-sm border px-3 py-1 rounded">編集</button>}
                                    {!editingId && <button onClick={() => deleteProduct(p.id)} className="text-sm text-red-500 ml-2">削除</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleAddProduct} className="bg-bakery-bg p-8 rounded-xl w-full max-w-md space-y-4 relative">
                        <button type="button" onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500">✖</button>
                        <h2 className="text-2xl font-bold mb-4">新規商品の登録</h2>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">レシート表示名（印字どおりに入力）</label><input required type="text" value={newReceiptName} onChange={e => setNewReceiptName(e.target.value)} className="w-full p-3 border rounded" /></div>
                        <div><label className="block text-xs font-bold text-bakery-primary mb-1">正式商品名</label><input required type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-3 border rounded" /></div>
                        <div><label className="block text-xs font-bold text-bakery-primary mb-1">単価</label><input required type="number" value={newPrice} onChange={e => setNewPrice(Number(e.target.value))} className="w-full p-3 border rounded" /></div>
                        <button type="submit" className="w-full py-3 mt-2 bg-bakery-primary text-white rounded font-bold">登録する</button>
                    </form>
                </div>
            )}
        </div>
    );
}