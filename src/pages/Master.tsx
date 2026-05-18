// src/pages/Master.tsx
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

type Product = { id: number; receipt_name: string; name: string; price: number; target_qty: number; };

export default function Master() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    const [editingId, setEditingId] = useState<number | null>(null);
    const [editReceiptName, setEditReceiptName] = useState("");
    const [editName, setEditName] = useState("");
    const [editPrice, setEditPrice] = useState(0);
    const [editTargetQty, setEditTargetQty] = useState(0);

    const [showModal, setShowModal] = useState(false);
    const [newName, setNewName] = useState("");
    const [newReceiptName, setNewReceiptName] = useState("");
    const [newPrice, setNewPrice] = useState<number | "">("");

    const [isSaving, setIsSaving] = useState(false); // ⭐️ 追加
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
        const nReceipt = newReceiptName.trim().normalize("NFKC");
        const nName = newName.trim().normalize("NFKC");

        if (products.some(p => p.receipt_name === nReceipt)) return alert("その『レシート表示名』はすでに登録されています");

        setIsSaving(true);
        await supabase.from('products').insert({ receipt_name: nReceipt, name: nName, price: Number(newPrice), target_qty: 0 });
        setIsSaving(false);

        setShowModal(false); setNewReceiptName(""); setNewName(""); setNewPrice(""); fetchProducts();
    };

    const saveEdit = async () => {
        await supabase.from('products').update({
            receipt_name: editReceiptName.normalize("NFKC"), name: editName.normalize("NFKC"), price: editPrice, target_qty: editTargetQty
        }).eq('id', editingId);
        setEditingId(null); fetchProducts();
    };

    // ⭐️ 修正：引数を id だけに変更
    const deleteProduct = async (id: number) => {
        if (window.confirm(`削除しますか？`)) { await supabase.from('products').delete().eq('id', id); fetchProducts(); }
    };

    const handleImportCSV = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (!window.confirm("CSVデータをインポートしますか？\n（同じ「レシート表示名」がある場合は上書きされます）")) {
            if (fileInputRef.current) fileInputRef.current.value = "";
            return;
        }
        setIsImporting(true);
        const reader = new FileReader();
        reader.readAsText(file, "utf-8");
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;
                const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
                if (lines.length <= 1) throw new Error("データがありません");

                const insertData = [];
                const upsertData = [];

                for (let i = 1; i < lines.length; i++) {
                    const cols = lines[i].split(',');
                    if (cols.length < 3) continue;

                    const rName = cols[0].replace(/['"]/g, '').trim().normalize("NFKC");
                    const fName = cols[1].replace(/['"]/g, '').trim().normalize("NFKC");
                    const price = parseInt(cols[2].replace(/['"]/g, '').trim(), 10);
                    const tQty = cols[3] ? parseInt(cols[3].replace(/['"]/g, '').trim(), 10) : 0;

                    if (!rName || !fName || isNaN(price)) continue;
                    const existingProduct = products.find(p => p.receipt_name === rName);
                    if (existingProduct) {
                        upsertData.push({ id: existingProduct.id, receipt_name: rName, name: fName, price, target_qty: isNaN(tQty) ? 0 : tQty });
                    } else {
                        insertData.push({ receipt_name: rName, name: fName, price, target_qty: isNaN(tQty) ? 0 : tQty });
                    }
                }
                let addedCount = 0; let updatedCount = 0;
                if (insertData.length > 0) { const { error } = await supabase.from('products').insert(insertData); if (error) throw error; addedCount = insertData.length; }
                if (upsertData.length > 0) { const { error } = await supabase.from('products').upsert(upsertData); if (error) throw error; updatedCount = upsertData.length; }
                alert(`インポート完了！\n・新規追加: ${addedCount}件\n・上書き更新: ${updatedCount}件`);
                fetchProducts();
            } catch (err: any) { alert("インポートに失敗しました。\n" + err.message); }
            finally { setIsImporting(false); if (fileInputRef.current) fileInputRef.current.value = ""; }
        };
    };

    return (
        <div className="p-8 max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-4 border-b-2 border-bakery-border pb-4 gap-4">
                <h1 className="text-3xl font-bold text-bakery-textMain">📖 製品マスタ管理</h1>
                <div className="flex gap-2">
                    <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />
                    <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="bg-white border-2 border-[#10B981] text-[#10B981] hover:bg-green-50 px-6 py-2 rounded-md font-bold transition-colors shadow-sm disabled:opacity-50">
                        {isImporting ? '⏳ 読込中...' : '📥 CSVインポート'}
                    </button>
                    <button onClick={() => setShowModal(true)} className="bg-bakery-primary hover:bg-[#8B5E3C] text-white px-6 py-2 rounded-md font-bold transition-colors shadow-sm">➕ 新規商品</button>
                </div>
            </div>

            <div className="flex items-start gap-2 bg-[#FFF8E7] border border-bakery-border/50 text-[#8B6340] text-sm p-4 rounded-lg shadow-sm mb-8">
                <span className="text-bakery-gold text-lg leading-none mt-0.5">💡</span>
                <div className="leading-relaxed">
                    <p>商品の登録に加え、日々の「製造予定数」を設定できます。CSVファイルから一括で登録・更新することも可能です。</p>
                    <p className="text-xs mt-1 text-[#C4A882]">※CSVフォーマット: 1行目ヘッダー、2行目以降に「レシート印字名, 正式商品名, 単価, 製造予定数」の順にカンマ区切りで作成してください。</p>
                </div>
            </div>

            {!loading && products.length > 0 && (
                <div className="animate-fade-in-up">
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
                                    <td className="p-4 text-right">{editingId === p.id ? <input type="number" value={editPrice} onChange={e => setEditPrice(Number(e.target.value))} className="border p-1 w-20 text-right" /> : `￥${p.price.toLocaleString()}`}</td>
                                    <td className="p-4 text-center font-bold text-[#10B981]">
                                        {editingId === p.id ? <input type="number" min="0" value={editTargetQty} onChange={e => setEditTargetQty(Number(e.target.value))} className="border border-[#10B981] p-1 w-16 text-center" /> : `${p.target_qty} 個`}
                                    </td>
                                    <td className="p-4 text-center whitespace-nowrap">
                                        {editingId === p.id ? <button onClick={saveEdit} className="bg-green-500 text-white px-3 py-1 rounded">保存</button>
                                            : <button onClick={() => { setEditingId(p.id); setEditReceiptName(p.receipt_name || p.name); setEditName(p.name); setEditPrice(p.price); setEditTargetQty(p.target_qty); }} className="text-sm border px-3 py-1 rounded hover:bg-[#F5EDD6]">編集</button>}
                                        {!editingId && <button onClick={() => deleteProduct(p.id)} className="text-sm text-red-500 ml-2 hover:underline">削除</button>} // ⭐️ 修正
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <form onSubmit={handleAddProduct} className="bg-bakery-bg p-8 rounded-xl w-full max-w-md space-y-4 relative">
                        <button type="button" onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500">✖</button>
                        <h2 className="text-2xl font-bold mb-4">新規商品の登録</h2>
                        <div><label className="block text-xs font-bold text-gray-500 mb-1">レシート表示名（印字どおり）</label><input required type="text" value={newReceiptName} onChange={e => setNewReceiptName(e.target.value)} className="w-full p-3 border rounded focus:ring-2 focus:ring-bakery-gold outline-none" /></div>
                        <div><label className="block text-xs font-bold text-bakery-primary mb-1">正式商品名</label><input required type="text" value={newName} onChange={e => setNewName(e.target.value)} className="w-full p-3 border rounded focus:ring-2 focus:ring-bakery-gold outline-none" /></div>
                        <div><label className="block text-xs font-bold text-bakery-primary mb-1">単価</label><input required type="number" value={newPrice} onChange={e => setNewPrice(Number(e.target.value))} className="w-full p-3 border rounded focus:ring-2 focus:ring-bakery-gold outline-none" /></div>
                        <button type="submit" disabled={isSaving} className="w-full py-3 mt-2 bg-bakery-primary text-white rounded font-bold">登録する</button>
                    </form>
                </div>
            )}
        </div>
    );
}