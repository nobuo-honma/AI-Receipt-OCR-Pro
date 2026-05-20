// src/pages/Master.tsx
import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

// ⭐️ category を追加
type Product = { id: number; receipt_name: string; name: string; price: number; target_qty: number; category: string; };

export default function Master() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editReceiptName, setEditReceiptName] = useState("");
  const [editName, setEditName] = useState("");
  const [editPrice, setEditPrice] = useState(0);
  const [editTargetQty, setEditTargetQty] = useState(0);
  const [editCategory, setEditCategory] = useState(""); // ⭐️ 追加
  
  const [showModal, setShowModal] = useState(false);
  const [newReceiptName, setNewReceiptName] = useState("");
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState<number | "">("");
  const [newCategory, setNewCategory] = useState(""); // ⭐️ 追加
  
  const [isSaving, setIsSaving] = useState(false);
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
    // ⭐️ categoryも一緒に保存
    await supabase.from('products').insert({ 
      receipt_name: nReceipt, 
      name: nName, 
      price: Number(newPrice), 
      target_qty: 0,
      category: newCategory || '❓ 未分類'
    });
    setIsSaving(false);
    
    setShowModal(false); setNewReceiptName(""); setNewName(""); setNewPrice(""); setNewCategory(""); fetchProducts();
  };

  const saveEdit = async () => {
    await supabase.from('products').update({ 
      receipt_name: editReceiptName.normalize("NFKC"), 
      name: editName.normalize("NFKC"), 
      price: editPrice, 
      target_qty: editTargetQty,
      category: editCategory || '❓ 未分類' // ⭐️ 追加
    }).eq('id', editingId);
    setEditingId(null); fetchProducts();
  };

  const deleteProduct = async (id: number) => {
    if (window.confirm(`削除しますか？`)) { await supabase.from('products').delete().eq('id', id); fetchProducts(); }
  };

  const handleDeleteAll = async () => {
    if (window.confirm("【警告】\n登録されている全ての商品マスタを削除しますか？\n※この操作は取り消せません！")) {
      const { error } = await supabase.from('products').delete().neq('id', 0);
      if (error) alert("削除に失敗しました。\n" + error.message);
      else { alert("全ての商品マスタを削除しました。"); fetchProducts(); }
    }
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
    reader.readAsArrayBuffer(file);
    reader.onload = async (event) => {
      try {
        const buffer = event.target?.result as ArrayBuffer;
        const uint8Array = new Uint8Array(buffer);
        let text = "";
        const isShiftJIS = uint8Array.some(b => (b >= 0x81 && b <= 0x9f) || (b >= 0xe0 && b <= 0xfc));
        if (isShiftJIS) { const decoder = new TextDecoder("shift-jis"); text = decoder.decode(uint8Array); } 
        else { const decoder = new TextDecoder("utf-8"); text = decoder.decode(uint8Array); }

        const lines = text.split('\n').map(line => line.trim()).filter(line => line.length > 0);
        if (lines.length <= 1) throw new Error("データがありません");

        const insertData = []; const upsertData = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',');
          if (cols.length < 3) continue;
          const rName = cols[0].replace(/['"]/g, '').trim().normalize("NFKC");
          const fName = cols[1].replace(/['"]/g, '').trim().normalize("NFKC");
          const price = parseInt(cols[2].replace(/['"]/g, '').trim(), 10);
          const tQty = cols[3] ? parseInt(cols[3].replace(/['"]/g, '').trim(), 10) : 0;
          const cat = cols[4] ? cols[4].replace(/['"]/g, '').trim() : '❓ 未分類'; // ⭐️ 5列目をカテゴリにする

          if (!rName || !fName || isNaN(price)) continue;

          const existingProduct = products.find(p => p.receipt_name === rName);
          if (existingProduct) upsertData.push({ id: existingProduct.id, receipt_name: rName, name: fName, price, target_qty: isNaN(tQty) ? 0 : tQty, category: cat });
          else insertData.push({ receipt_name: rName, name: fName, price, target_qty: isNaN(tQty) ? 0 : tQty, category: cat });
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

  // ⭐️ 既存のカテゴリの一覧を抽出（入力補助用）
  const uniqueCategories = Array.from(new Set(products.map(p => p.category))).filter(c => c !== '❓ 未分類');

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-end md:items-center mb-4 border-b-2 border-bakery-border pb-4 gap-4">
        <h1 className="text-3xl font-bold text-bakery-textMain">📖 製品マスタ管理</h1>
        <div className="flex gap-2">
          {products.length > 0 && (
            <button onClick={handleDeleteAll} className="bg-white border-2 border-red-400 text-red-500 hover:bg-red-50 px-4 py-2 rounded-md font-bold transition-colors shadow-sm">
              🗑️ 全リセット
            </button>
          )}
          <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleImportCSV} />
          <button onClick={() => fileInputRef.current?.click()} disabled={isImporting} className="bg-white border-2 border-[#10B981] text-[#10B981] hover:bg-green-50 px-4 py-2 rounded-md font-bold transition-colors shadow-sm disabled:opacity-50">
            {isImporting ? '⏳ 読込中...' : '📥 CSV読込'}
          </button>
          <button onClick={() => setShowModal(true)} className="bg-bakery-primary hover:bg-[#8B5E3C] text-white px-4 py-2 rounded-md font-bold transition-colors shadow-sm">
            ➕ 新規商品
          </button>
        </div>
      </div>

      <div className="flex items-start gap-2 bg-[#FFF8E7] border border-bakery-border/50 text-[#8B6340] text-sm p-4 rounded-lg shadow-sm mb-8">
        <span className="text-bakery-gold text-lg leading-none mt-0.5">💡</span>
        <div className="leading-relaxed">
          <p>「カテゴリ」を設定しておくと、ダッシュボードでの絞り込みや、レシート解析時の自動分類に活用されます。</p>
          <p className="text-xs mt-1 text-[#C4A882]">※CSVフォーマット: 「印字名, 正式名, 単価, 予定数, カテゴリ」の順</p>
        </div>
      </div>

      {!loading && products.length > 0 && (
        <div className="animate-fade-in-up">
          <table className="w-full bg-white rounded-lg shadow-sm border overflow-hidden">
            <thead>
              <tr className="bg-bakery-bg text-bakery-primary">
                <th className="p-4 border-b border-bakery-border">印字名</th>
                <th className="p-4 border-b border-bakery-border font-bold">正式商品名</th>
                <th className="p-4 border-b border-bakery-border">カテゴリ</th>
                <th className="p-4 border-b border-bakery-border text-right">単価</th>
                <th className="p-4 border-b border-bakery-border text-center text-[#10B981]">予定数</th>
                <th className="p-4 border-b border-bakery-border text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, i) => (
                <tr key={p.id} className={i % 2 === 0 ? 'bg-white' : 'bg-[#FAFAFA]'}>
                  <td className="p-4 border-b border-bakery-border/50">{editingId === p.id ? <input value={editReceiptName} onChange={e=>setEditReceiptName(e.target.value)} className="border p-1 w-full"/> : <span className="text-gray-500 text-sm">{p.receipt_name || p.name}</span>}</td>
                  <td className="p-4 border-b border-bakery-border/50 font-bold text-bakery-textMain">{editingId === p.id ? <input value={editName} onChange={e=>setEditName(e.target.value)} className="border p-1 w-full"/> : p.name}</td>
                  
                  {/* ⭐️ カテゴリ表示・編集 */}
                  <td className="p-4 border-b border-bakery-border/50">
                    {editingId === p.id ? (
                      <input type="text" value={editCategory} onChange={e=>setEditCategory(e.target.value)} list="category-list" className="border p-1 w-full" placeholder="🍞 パン など"/>
                    ) : (
                      <span className="text-xs text-[#8B6340] bg-bakery-bg px-2 py-1 rounded">{p.category}</span>
                    )}
                  </td>

                  <td className="p-4 border-b border-bakery-border/50 text-right">{editingId === p.id ? <input type="number" value={editPrice} onChange={e=>setEditPrice(Number(e.target.value))} className="border p-1 w-20 text-right"/> : `￥${p.price.toLocaleString()}`}</td>
                  <td className="p-4 border-b border-bakery-border/50 text-center font-bold text-[#10B981]">
                    {editingId === p.id ? <input type="number" min="0" value={editTargetQty} onChange={e=>setEditTargetQty(Number(e.target.value))} className="border border-[#10B981] p-1 w-16 text-center"/> : `${p.target_qty} 個`}
                  </td>
                  <td className="p-4 border-b border-bakery-border/50 text-center whitespace-nowrap">
                    {editingId === p.id ? (
                      <div className="flex justify-center gap-2">
                        <button onClick={saveEdit} className="text-xs bg-[#10B981] text-white px-3 py-1.5 rounded font-bold hover:bg-green-600 shadow-sm">保存</button>
                        <button onClick={() => setEditingId(null)} className="text-xs bg-gray-300 text-gray-700 px-3 py-1.5 rounded font-bold hover:bg-gray-400">取消</button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => { setEditingId(p.id); setEditReceiptName(p.receipt_name || p.name); setEditName(p.name); setEditCategory(p.category); setEditPrice(p.price); setEditTargetQty(p.target_qty); }} className="text-sm bg-bakery-surface border border-bakery-border text-bakery-primary px-3 py-1 rounded hover:bg-bakery-bg transition-colors">編集</button>
                        <button onClick={() => deleteProduct(p.id)} className="text-sm text-red-400 hover:text-red-600 transition-colors ml-2">削除</button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* インライン編集時用のサジェスト（入力候補）リスト */}
          <datalist id="category-list">
            {uniqueCategories.map(cat => <option key={cat} value={cat} />)}
          </datalist>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleAddProduct} className="bg-bakery-bg p-8 rounded-xl w-full max-w-md space-y-4 relative">
            <button type="button" onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-gray-500 hover:text-black">✖</button>
            <h2 className="text-2xl font-bold mb-4">新規商品の登録</h2>
            <div><label className="block text-xs font-bold text-gray-500 mb-1">レシート表示名（印字どおり）</label><input required type="text" value={newReceiptName} onChange={e=>setNewReceiptName(e.target.value)} className="w-full p-3 border rounded focus:ring-2 focus:ring-bakery-gold outline-none" /></div>
            <div><label className="block text-xs font-bold text-bakery-primary mb-1">正式商品名</label><input required type="text" value={newName} onChange={e=>setNewName(e.target.value)} className="w-full p-3 border rounded focus:ring-2 focus:ring-bakery-gold outline-none" /></div>
            
            {/* ⭐️ カテゴリの入力欄 */}
            <div>
              <label className="block text-xs font-bold text-bakery-primary mb-1">カテゴリ（任意）</label>
              <input type="text" list="category-list" placeholder="🍞 パン など" value={newCategory} onChange={e=>setNewCategory(e.target.value)} className="w-full p-3 border rounded focus:ring-2 focus:ring-bakery-gold outline-none" />
            </div>

            <div><label className="block text-xs font-bold text-bakery-primary mb-1">単価</label><input required type="number" value={newPrice} onChange={e=>setNewPrice(Number(e.target.value))} className="w-full p-3 border rounded focus:ring-2 focus:ring-bakery-gold outline-none" /></div>
            <button type="submit" disabled={isSaving} className="w-full py-3 mt-2 bg-bakery-primary text-white rounded font-bold">登録する</button>
          </form>
        </div>
      )}
    </div>
  );
}