// src/pages/Master.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// ⭐️ receipt_name を追加
type Product = { id: number; receipt_name: string; name: string; price: number; };

export default function Master() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    // インライン編集用のステート
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editReceiptName, setEditReceiptName] = useState("");
    const [editName, setEditName] = useState("");
    const [editPrice, setEditPrice] = useState(0);

    // 新規登録モーダル用のステート
    const [showModal, setShowModal] = useState(false);
    const [newReceiptName, setNewReceiptName] = useState("");
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState<number | "">("");

    const fetchProducts = async () => {
        const { data } = await supabase.from('products').select('*').order('id', { ascending: true });
        if (data) setProducts(data);
        setLoading(false);
    };
    useEffect(() => { fetchProducts(); }, []);

    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newReceiptName.trim() || !newName.trim() || newPrice === "" || newPrice < 0) return;

        // 全角に統一
        const normalizedReceiptName = newReceiptName.trim().normalize("NFKC");
        const normalizedName = newName.trim().normalize("NFKC");

        if (products.some(p => p.receipt_name === normalizedReceiptName)) {
            return alert("その『レシート表示名』はすでに登録されています");
        }

        await supabase.from('products').insert({
            receipt_name: normalizedReceiptName,
            name: normalizedName,
            price: Number(newPrice)
        });

        setShowModal(false); setNewReceiptName(""); setNewName(""); setNewPrice(""); fetchProducts();
    };

    const saveEdit = async () => {
        await supabase.from('products').update({
            receipt_name: editReceiptName.normalize("NFKC"),
            name: editName.normalize("NFKC"),
            price: editPrice
        }).eq('id', editingId);
        setEditingId(null); fetchProducts();
    };

    const deleteProduct = async (id: number) => {
        if (window.confirm(`削除しますか？`)) { await supabase.from('products').delete().eq('id', id); fetchProducts(); }
    };

    return (
        <div className="p-8 max-w-5xl mx-auto">
            <div className="flex justify-between items-center mb-4 border-b-2 pb-4">
                <h1 className="text-3xl font-bold text-bakery-textMain">📖 製品マスタ管理</h1>
                <button onClick={() => setShowModal(true)} className="bg-bakery-primary text-white px-6 py-2 rounded-md font-bold">➕ 新規商品</button>
            </div>

            <div className="flex items-start gap-2 bg-[#FFF8E7] border border-bakery-border/50 text-[#8B6340] text-sm p-4 rounded-lg shadow-sm mb-8">
                <span className="text-bakery-gold text-lg leading-none mt-0.5">💡</span>
                <p className="leading-relaxed">
                    「レシート表示名」には実際に印字される文字を、「本当の商品名」にはダッシュボードや予約一覧で表示させたい綺麗な名前を登録してください。<br />
                    （※半角で入力しても自動的に全角に統一されて保存されます）
                </p>
            </div>

            {!loading && products.length > 0 && (
                <table className="w-full bg-white rounded-lg shadow-sm border overflow-hidden">
                    <thead>
                        <tr className="bg-bakery-bg">
                            <th className="p-4">ID</th>
                            <th className="p-4 text-gray-500">レシート表示名（印字）</th>
                            <th className="p-4 font-bold text-bakery-primary">本当の商品名</th>
                            <th className="p-4 text-right">単価</th>
                            <th className="p-4 text-center w-40">操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        {products.map((p) => (
                            <tr key={p.id} className="border-b">
                                <td className="p-4 text-gray-500 text-sm">{p.id}</td>

                                {/* ⭐️ レシート表示名 */}
                                <td className="p-4">
                                    {editingId === p.id
                                        ? <input value={editReceiptName} onChange={e => setEditReceiptName(e.target.value)} className="border p-1 w-full" />
                                        : <span className="text-gray-500 text-sm">{p.receipt_name || p.name}</span>}
                                </td>

                                {/* ⭐️ 本当の商品名 */}
                                <td className="p-4 font-bold">
                                    {editingId === p.id
                                        ? <input value={editName} onChange={e => setEditName(e.target.value)} className="border p-1 w-full" />
                                        : p.name}
                                </td>

                                <td className="p-4 text-right">
                                    {editingId === p.id
                                        ? <input type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} className="border p-1 w-20 text-right" />
                                        : `￥${p.price}`}
                                </td>
                                <td className="p-4 text-center">
                                    {editingId === p.id
                                        ? <button onClick={saveEdit} className="bg-green-500 text-white px-3 py-1 rounded">保存</button>
                                        : <button onClick={() => { setEditingId(p.id); setEditReceiptName(p.receipt_name || p.name); setEditName(p.name); setEditPrice(p.price); }} className="text-sm border px-3 py-1 rounded">編集</button>}
                                    {!editingId && <button onClick={() => deleteProduct(p.id)} className="text-sm text-red-500 ml-2">削除</button>}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}

            {/* 新規登録モーダル */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleAddProduct} className="bg-bakery-bg p-8 rounded-xl w-full max-w-md space-y-4 relative">
                        <button type="button" onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500">✖</button>
                        <h2 className="text-2xl font-bold mb-4">新規商品の登録</h2>

                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">レシート表示名（印字どおりに入力）</label>
                            <input required type="text" placeholder="例: ｸﾛﾜｯｻﾝA" value={newReceiptName} onChange={e => setNewReceiptName(e.target.value)} className="w-full p-3 border rounded focus:ring-2 focus:ring-bakery-gold outline-none" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-bakery-primary mb-1">本当の商品名（システムに登録する名前）</label>
                            <input required type="text" placeholder="例: チョコクロワッサン" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-3 border rounded focus:ring-2 focus:ring-bakery-gold outline-none" />
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-bakery-primary mb-1">単価</label>
                            <input required type="number" placeholder="例: 250" value={newPrice} onChange={e => setNewPrice(Number(e.target.value))} className="w-full p-3 border rounded focus:ring-2 focus:ring-bakery-gold outline-none" />
                        </div>

                        <button type="submit" className="w-full py-3 mt-2 bg-bakery-primary text-white rounded font-bold">登録する</button>
                    </form>
                </div>
            )}
        </div>
    );
}