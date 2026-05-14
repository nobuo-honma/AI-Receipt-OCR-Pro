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
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editName, setEditName] = useState("");
    const [editPrice, setEditPrice] = useState(0);

    // マスタデータの取得 (※本来は products テーブルが必要ですが、今回は仮の動きです)
    useEffect(() => {
        const fetchMaster = async () => {
            const { data, error } = await supabase.from('scan_items').select('name, unit_price');
            if (!error && data) {
                const uniqueMap = new Map<string, number>();
                data.forEach(item => uniqueMap.set(item.name, item.unit_price));
                let index = 1;
                setProducts(Array.from(uniqueMap.entries()).map(([name, price]) => ({ id: index++, name, price })));
            }
            setLoading(false);
        };
        fetchMaster();
    }, []);

    // 編集モードに入る
    const startEdit = (p: Product) => {
        setEditingId(p.id);
        setEditName(p.name);
        setEditPrice(p.price);
    };

    // 編集を保存する（今回は画面上の配列を更新するだけ）
    const saveEdit = () => {
        setProducts(products.map(p => p.id === editingId ? { ...p, name: editName, price: editPrice } : p));
        setEditingId(null);
    };

    // 商品を削除する
    const deleteProduct = (id: number) => {
        if (window.confirm("この商品をマスタから削除しますか？")) {
            setProducts(products.filter(p => p.id !== id));
        }
    };

    return (
        <div className="p-8 max-w-4xl mx-auto">
            <div className="flex justify-between items-center mb-8 border-b-2 border-bakery-border pb-4">
                <h1 className="text-3xl font-bold text-bakery-textMain">📖 製品マスタ管理</h1>
                <button className="bg-bakery-primary hover:bg-[#8B5E3C] text-white px-6 py-2 rounded-md font-bold transition-colors shadow-sm">
                    ➕ 新規商品
                </button>
            </div>

            <div className="bg-[#FDF0D5] border-l-4 border-bakery-primary p-4 rounded-r-md text-sm text-bakery-textMain mb-6">
                ℹ️ 商品名・単価を登録しておくと、OCR解析時に自動補正が働きます（※現在は過去の販売履歴から自動生成しています）
            </div>

            {loading ? (
                <p className="text-bakery-textMain animate-pulse">データを読み込み中...</p>
            ) : products.length === 0 ? (
                <div className="border-2 border-dashed border-bakery-border p-16 text-center rounded-lg text-[#8B6340] bg-bakery-surface">
                    <p>マスタデータがありません。</p>
                </div>
            ) : (
                <div className="bg-white rounded-lg shadow-sm border border-bakery-border overflow-hidden">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-bakery-bg text-[#6B4226]">
                                <th className="p-4 border-b border-bakery-border w-24">ID</th>
                                <th className="p-4 border-b border-bakery-border">商品名</th>
                                <th className="p-4 border-b border-bakery-border w-48">単価</th>
                                <th className="p-4 border-b border-bakery-border w-40 text-center">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map((product, i) => (
                                <tr key={product.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}>
                                    <td className="p-4 border-b border-bakery-border/50 text-[#8B6340]">{product.id}</td>

                                    <td className="p-4 border-b border-bakery-border/50 font-bold">
                                        {editingId === product.id ? (
                                            <input type="text" value={editName} onChange={e => setEditName(e.target.value)} className="border p-1 rounded w-full" />
                                        ) : product.name}
                                    </td>

                                    <td className="p-4 border-b border-bakery-border/50">
                                        {editingId === product.id ? (
                                            <input type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} className="border p-1 rounded w-24" />
                                        ) : `￥${product.price.toLocaleString()}`}
                                    </td>

                                    <td className="p-4 border-b border-bakery-border/50 text-center space-x-2">
                                        {editingId === product.id ? (
                                            <button onClick={saveEdit} className="text-sm bg-[#10B981] text-white px-3 py-1 rounded">保存</button>
                                        ) : (
                                            <>
                                                <button onClick={() => startEdit(product)} className="text-sm bg-bakery-surface border border-bakery-border text-[#6B4226] px-3 py-1 rounded hover:bg-bakery-bg">編集</button>
                                                <button onClick={() => deleteProduct(product.id)} className="text-sm text-red-500 hover:underline">削除</button>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}