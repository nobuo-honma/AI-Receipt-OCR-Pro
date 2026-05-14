// src/pages/Master.tsx
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

type Product = {
    id: number;
    name: string;
    price: number;
};

export default function Master() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    // インライン編集用のステート
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editPrice, setEditPrice] = useState(0);

    // 新規登録モーダル用のステート
    const [showModal, setShowModal] = useState(false);
    const [newName, setNewName] = useState("");
    const [newPrice, setNewPrice] = useState<number | "">("");
    const [isSaving, setIsSaving] = useState(false);

    // 1. Supabaseからマスタデータを取得
    const fetchProducts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .order('id', { ascending: true }); // ID順に並べる

        if (!error && data) {
            setProducts(data);
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchProducts();
    }, []);

    // 2. 新規商品の登録
    const handleAddProduct = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim() || newPrice === "" || newPrice < 0) return alert("正しい商品名と単価を入力してください。");

        const normalizedName = newName.trim().normalize("NFKC");


        setIsSaving(true);
        // 重複チェック
        const isExist = products.some(p => p.name === normalizedName);
        if (isExist) {
            alert("その商品名はすでに登録されています！");
            setIsSaving(false);
            return;
        }

        const { error } = await supabase.from('products').insert({
            name: normalizedName,
            price: Number(newPrice)
        });

        setIsSaving(false);
        if (error) {
            alert("登録に失敗しました。");
            console.error(error);
        } else {
            alert(`「${newName}」をマスタに登録しました！`);
            setShowModal(false);
            setNewName("");
            setNewPrice("");
            fetchProducts(); // 画面を更新
        }
    };

    // 3. インライン編集の開始
    const startEdit = (p: Product) => {
        setEditingId(p.id);
        setEditName(p.name);
        setEditPrice(p.price);
    };

    // 4. 編集の保存（更新）
    const saveEdit = async () => {
        if (!editName.trim() || editPrice < 0) return alert("正しい商品名と単価を入力してください。");

        const { error } = await supabase
            .from('products')
            .update({ name: editName, price: editPrice })
            .eq('id', editingId);

        if (error) {
            alert("更新に失敗しました。");
        } else {
            setEditingId(null);
            fetchProducts();
        }
    };

    // 5. 商品の削除
    const deleteProduct = async (id: number, name: string) => {
        if (window.confirm(`本当に「${name}」をマスタから削除しますか？`)) {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) {
                alert("削除に失敗しました。");
            } else {
                fetchProducts();
            }
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto relative">
            <div className="flex justify-between items-center mb-8 border-b-2 border-bakery-border pb-4">
                <h1 className="text-3xl font-bold text-bakery-textMain">📖 製品マスタ管理</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-bakery-primary hover:bg-[#8B5E3C] text-white px-6 py-2 rounded-md font-bold transition-colors shadow-sm"
                >
                    ➕ 新規商品
                </button>
            </div>

            <div className="bg-bakery-surface border-l-4 border-bakery-primary p-4 rounded-r-md text-sm text-bakery-textMain mb-6 shadow-sm">
                ℹ️ 商品名・単価を登録しておくと、OCR解析時に自動補正が働き、誤読を防止できます。
            </div>

            {loading ? (
                <p className="text-bakery-textMain animate-pulse">データを読み込み中...</p>
            ) : products.length === 0 ? (
                <div className="border-2 border-dashed border-bakery-border p-16 text-center rounded-lg text-[#8B6340] bg-bakery-surface">
                    <p className="text-4xl mb-4">📖</p>
                    <p>マスタデータがありません。<br />右上の「➕ 新規商品」から登録してください。</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-bakery-border overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-bakery-bg text-bakery-primary">
                                <th className="p-4 border-b border-bakery-border w-24">ID</th>
                                <th className="p-4 border-b border-bakery-border">商品名</th>
                                <th className="p-4 border-b border-bakery-border w-48 text-right">単価</th>
                                <th className="p-4 border-b border-bakery-border w-40 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product, i) => (
                                <tr key={product.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}>
                                    <td className="p-4 border-b border-bakery-border/50 text-[#8B6340]">{product.id}</td>

                                    <td className="p-4 border-b border-bakery-border/50 font-bold text-bakery-textMain">
                                        {editingId === product.id ? (
                                            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="border border-bakery-border p-2 rounded w-full focus:outline-none focus:ring-2 focus:ring-bakery-gold" />
                                        ) : product.name}
                                    </td>

                                    <td className="p-4 border-b border-bakery-border/50 text-right">
                                        {editingId === product.id ? (
                                            <input type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} className="border border-bakery-border p-2 rounded w-24 text-right focus:outline-none focus:ring-2 focus:ring-bakery-gold" />
                                        ) : `￥${product.price.toLocaleString()}`}
                                    </td>

                                    <td className="p-4 border-b border-bakery-border/50 text-center space-x-2">
                                        {editingId === product.id ? (
                                            <div className="flex justify-center gap-2">
                                                <button onClick={saveEdit} className="text-xs bg-[#10B981] text-white px-3 py-1.5 rounded font-bold hover:bg-green-600 shadow-sm">保存</button>
                                                <button onClick={() => setEditingId(null)} className="text-xs bg-gray-300 text-gray-700 px-3 py-1.5 rounded font-bold hover:bg-gray-400">取消</button>
                                            </div>
                                        ) : (
                                            <>
                                                <button onClick={() => startEdit(product)} className="text-sm bg-bakery-surface border border-bakery-border text-bakery-primary px-3 py-1 rounded hover:bg-bakery-bg transition-colors">編集</button>
                                                <button onClick={() => deleteProduct(product.id, product.name)} className="text-sm text-red-400 hover:text-red-600 transition-colors">削除</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* ── 新規商品登録モーダル（ポップアップ） ── */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-bakery-bg p-8 rounded-xl shadow-2xl w-full max-w-md relative border-2 border-bakery-border animate-fade-in-up">

                        <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-black">✖</button>

                        <h2 className="text-2xl font-bold text-bakery-textMain mb-6">➕ 新規商品の登録</h2>

                        <form onSubmit={handleAddProduct} className="space-y-4">
                            <div>
                                <label className="block text-sm font-bold text-[#8B6340] mb-1">商品名 <span className="text-red-500">*</span></label>
                                <input required type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="例: クロワッサン" className="w-full p-3 border border-bakery-border rounded bg-white text-bakery-textMain focus:outline-none focus:ring-2 focus:ring-bakery-gold" />
                            </div>

                            <div>
                                <label className="block text-sm font-bold text-[#8B6340] mb-1">単価（円） <span className="text-red-500">*</span></label>
                                <input required type="number" min="0" value={newPrice} onChange={e => setNewPrice(e.target.value === "" ? "" : Number(e.target.value))} placeholder="例: 250" className="w-full p-3 border border-bakery-border rounded bg-white text-bakery-textMain focus:outline-none focus:ring-2 focus:ring-bakery-gold" />
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button type="button" onClick={() => setShowModal(false)} className="flex-1 py-3 border border-[#8B6340] text-[#8B6340] rounded font-bold hover:bg-bakery-surface transition-colors">
                                    キャンセル
                                </button>
                                <button type="submit" disabled={isSaving} className="flex-1 py-3 bg-bakery-primary text-bakery-gold rounded font-bold hover:bg-[#8B5E3C] transition-colors shadow-md disabled:bg-gray-400 disabled:text-white">
                                    {isSaving ? '登録中...' : '登録する'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

        </div>
    );
}