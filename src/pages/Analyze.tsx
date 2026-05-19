// src/pages/Analyze.tsx
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

// ── 型定義 ──
interface ReceiptItem {
    name: string;
    price: number;
    qty: number;
    category_id: string;
    is_filtered?: boolean;
}
type Customer = { id: number; name: string; visit_count: number; points: number; first_visit: string; total_spent: number; };

export default function Analyze() {
    // ── ステート管理 ──
    const [loading, setLoading] = useState<boolean>(false);
    const [items, setItems] = useState<ReceiptItem[]>([]);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [showFilteredItems, setShowFilteredItems] = useState<boolean>(false);

    // データベース連携用
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [savedSessionId, setSavedSessionId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // カメラ・QR連携用
    const [showQrModal, setShowQrModal] = useState<boolean>(false);
    const [currentUrl, setCurrentUrl] = useState<string>('');
    const [isCameraActive, setIsCameraActive] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRefNormal = useRef<HTMLInputElement>(null);

    // ── 初期化処理 ──
    useEffect(() => {
        // 現在のURL（GitHub Pagesのパスも含む）を取得
        if (typeof window !== 'undefined') setCurrentUrl(`${window.location.protocol}//${window.location.host}${import.meta.env.BASE_URL}`);

        const fetchData = async () => {
            const { data } = await supabase.from('customers').select('*').order('last_visit', { ascending: false });
            if (data) setCustomers(data);
        };
        fetchData();

        // スマホからの転送画像を監視
        const sub = supabase.channel('public:transfer_images')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transfer_images' }, payload => {
                setImageBase64(payload.new.image_base64);
                setPreviewUrl(`data:image/jpeg;base64,${payload.new.image_base64}`);
                setShowQrModal(false); setSavedSessionId(null);
                alert("📱 スマホから画像を受信しました！");
                supabase.from('transfer_images').delete().eq('id', payload.new.id).then();
            }).subscribe();

        return () => { supabase.removeChannel(sub); stopCamera(); };
    }, []);

    // ── 画像処理系 ──
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setPreviewUrl(URL.createObjectURL(file));
        setShowQrModal(false); setSavedSessionId(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_BOUND = 1500;
                let { width, height } = img;
                if (width > height && width > MAX_BOUND) { height = Math.round((height * MAX_BOUND) / width); width = MAX_BOUND; }
                else if (height > MAX_BOUND) { width = Math.round((width * MAX_BOUND) / height); height = MAX_BOUND; }

                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    setImageBase64(canvas.toDataURL('image/jpeg', 0.8).split(',')[1]);
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    // ── PCカメラ系 ──
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); setIsCameraActive(true); }
        } catch (err) { alert("カメラの起動に失敗しました"); }
    };

    const stopCamera = useCallback(() => {
        if (videoRef.current?.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); videoRef.current.srcObject = null; }
        setIsCameraActive(false);
    }, []);

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        canvasRef.current.width = videoRef.current.videoWidth; canvasRef.current.height = videoRef.current.videoHeight;
        ctx?.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

        const b64 = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
        setImageBase64(b64); setPreviewUrl(`data:image/jpeg;base64,${b64}`);
        setSavedSessionId(null); stopCamera();
    };

    // ── Gemini解析処理 ──
    const handleAnalyze = async () => {
        if (!imageBase64) return alert("画像をセットしてください");
        setLoading(true); setItems([]);

        try {
            // ⭐ Supabase Edge Function (Gemini) を呼び出し
            const { data, error } = await supabase.functions.invoke('analyze-receipt', { body: { imageBase64 } });
            if (error) throw error;
            if (data.error) throw new Error(data.error);

            // 追加モード（複数枚対応）
            const newItems = data.items || [];
            if (newItems.length === 0) alert("商品が読み取れませんでした。");
            else setItems(prev => [...prev, ...newItems]);
        } catch (err) {
            console.error(err); alert("解析に失敗しました。");
        } finally { setLoading(false); }
    };

    const handleItemChange = (index: number, field: keyof ReceiptItem, value: any) => {
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };
        setItems(updatedItems);
    };

    // ── 保存・連携処理 ──
    const calculateTotal = () => items.filter(i => !i.is_filtered).reduce((sum, item) => sum + (item.price * item.qty), 0);
    const getFormattedDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`; };

    const handleSaveToDB = async () => {
        const savePayload = items.filter(item => !item.is_filtered);
        if (savePayload.length === 0 || isSaving) return alert("保存するデータがありません");
        setIsSaving(true);
        try {
            const { data, error } = await supabase.from('scan_sessions').insert({ scanned_at: getFormattedDate(), total_amt: calculateTotal() }).select('id').single();
            if (error || !data) throw error;

            // カテゴリを含めて保存
            await supabase.from('scan_items').insert(savePayload.map(i => ({
                session_id: data.id, name: i.name, unit_price: i.price, quantity: i.qty, subtotal: i.price * i.qty, category: i.category_id
            })));
            setSavedSessionId(data.id); alert("ダッシュボードに売上を保存しました！");
        } catch (err) { alert("保存に失敗しました"); } finally { setIsSaving(false); }
    };

    const handleLinkCustomer = async () => {
        if (!selectedCustomerId || items.length === 0 || isSaving) return;
        setIsSaving(true);
        try {
            const total = calculateTotal(); const pts = Math.max(1, Math.floor(total * 0.01));
            const c = customers.find(c => c.id.toString() === selectedCustomerId);
            if (!c) return;
            await supabase.from('customer_purchases').insert({ customer_id: c.id, session_id: savedSessionId, purchased_at: getFormattedDate(), amount: total, points_earned: pts, memo: "AIレシート解析" });
            await supabase.from('customers').update({ total_spent: c.total_spent + total, points: c.points + pts, visit_count: c.visit_count + 1 }).eq('id', c.id);
            alert(`${c.name}さんに ${pts}pt 付与しました！`); setSelectedCustomerId("");
        } catch (err) { alert("ポイント付与に失敗しました"); } finally { setIsSaving(false); }
    };

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">

            {/* ── 左カラム：画像入力 ── */}
            <div className="w-full lg:w-4/12">
                <h1 className="text-2xl font-bold text-bakery-textMain mb-6 flex items-center gap-2">📸 レシート読込</h1>

                <div className="flex flex-col gap-3 mb-6">
                    <button onClick={() => fileInputRefNormal.current?.click()} className="w-full py-4 bg-white border-2 border-bakery-border rounded-xl font-bold text-[#8B6340] hover:bg-[#FDF0D5] transition-colors shadow-sm">
                        📁 1. PCからファイルを選択
                    </button>
                    <button onClick={() => setShowQrModal(true)} className="w-full py-4 bg-bakery-primary text-white rounded-xl font-bold hover:bg-[#8B5E3C] transition-colors shadow-md">
                        📱 2. スマホで撮影して転送
                    </button>
                    <button onClick={isCameraActive ? stopCamera : startCamera} className="w-full py-3 bg-white border-2 border-bakery-primary text-bakery-primary rounded-xl font-bold hover:bg-bakery-bg transition-colors">
                        {isCameraActive ? '⏹️ PCカメラを停止' : '📷 3. PCの内蔵カメラを起動'}
                    </button>
                    <input type="file" accept="image/*" ref={fileInputRefNormal} onChange={handleFileChange} className="hidden" />
                </div>

                <div className="bg-white p-4 rounded-xl border border-bakery-border shadow-sm mb-6 text-center min-h-[250px] flex flex-col justify-center relative overflow-hidden">
                    <video ref={videoRef} className={`w-full max-h-[300px] object-cover rounded bg-black ${isCameraActive ? 'block' : 'hidden'}`} playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    {isCameraActive && <button onClick={capturePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white border-4 border-bakery-primary rounded-full w-14 h-14 shadow-lg flex justify-center items-center"><div className="bg-bakery-primary w-10 h-10 rounded-full"></div></button>}

                    {!isCameraActive && previewUrl ? (
                        <img src={previewUrl} alt="Preview" className="max-h-[300px] object-contain mx-auto rounded" />
                    ) : !isCameraActive && (
                        <div className="py-10 text-[#C4A882]"><p className="text-4xl mb-2">📄</p><p className="text-sm">画像をセットしてください</p></div>
                    )}
                </div>

                <button onClick={handleAnalyze} disabled={loading || !imageBase64} className="w-full py-4 rounded-xl font-bold text-lg bg-[#10B981] text-white hover:bg-green-600 disabled:bg-gray-300 shadow-md transition-transform active:scale-95">
                    {loading ? '⏳ Gemini AI が解析中...' : '🚀 レシートを自動解析する'}
                </button>
            </div>

            {/* ── 右カラム：解析結果と手動修正 ── */}
            <div className="w-full lg:w-8/12">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-bakery-textMain">📝 解析結果（手動修正）</h2>
                    {items.length > 0 && <button onClick={() => { if (window.confirm("クリアしますか？")) { setItems([]); setSavedSessionId(null); setImageBase64(null); setPreviewUrl(null); } }} className="text-sm text-bakery-danger border border-bakery-danger/30 bg-red-50 px-4 py-1.5 rounded font-bold shadow-sm hover:bg-red-100">🗑️ クリア</button>}
                </div>

                {items.length === 0 ? (
                    <div className="border-2 border-dashed border-bakery-border p-16 text-center rounded-xl text-[#8B6340] bg-bakery-surface">
                        <p>左側のボタンから画像をセットし、解析を実行してください</p>
                    </div>
                ) : (
                    <div className="animate-fade-in-up">
                        <div className="flex justify-between items-end mb-2">
                            <label className="text-xs text-[#8B6340] cursor-pointer flex items-center gap-1">
                                <input type="checkbox" checked={showFilteredItems} onChange={(e) => setShowFilteredItems(e.target.checked)} />
                                マスタ除外項目（レジ袋等）も表示する
                            </label>
                            <p className="font-bold text-bakery-primary text-xl">合計: ￥{calculateTotal().toLocaleString()}</p>
                        </div>

                        {/* ⭐️ インプット型テーブル */}
                        <div className="bg-white rounded-xl shadow-sm border border-bakery-border overflow-x-auto mb-6">
                            <table className="w-full text-left text-sm border-collapse min-w-max">
                                <thead>
                                    <tr className="bg-bakery-bg text-[#6B4226]">
                                        <th className="p-3 border-b border-bakery-border">商品名</th>
                                        <th className="p-3 border-b border-bakery-border w-24">単価</th>
                                        <th className="p-3 border-b border-bakery-border w-16">数量</th>
                                        <th className="p-3 border-b border-bakery-border w-32">カテゴリ</th>
                                        <th className="p-3 border-b border-bakery-border w-20 text-center">状態</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {items.map((item, idx) => {
                                        if (item.is_filtered && !showFilteredItems) return null;
                                        return (
                                            <tr key={idx} className={`border-b border-gray-100 ${item.is_filtered ? 'bg-red-50' : 'hover:bg-[#FAFAFA]'}`}>
                                                <td className="p-2"><input type="text" value={item.name} onChange={(e) => handleItemChange(idx, 'name', e.target.value)} className="w-full p-2 border border-transparent hover:border-gray-300 rounded focus:border-bakery-gold outline-none" /></td>
                                                <td className="p-2"><input type="number" value={item.price} onChange={(e) => handleItemChange(idx, 'price', Number(e.target.value))} className="w-full p-2 border border-transparent hover:border-gray-300 rounded focus:border-bakery-gold outline-none text-right" /></td>
                                                <td className="p-2"><input type="number" value={item.qty} onChange={(e) => handleItemChange(idx, 'qty', Number(e.target.value))} className="w-full p-2 border border-transparent hover:border-gray-300 rounded focus:border-bakery-gold outline-none text-center" /></td>
                                                <td className="p-2">
                                                    <select value={item.category_id} onChange={(e) => handleItemChange(idx, 'category_id', e.target.value)} className="w-full p-2 border border-transparent hover:border-gray-300 rounded bg-transparent focus:border-bakery-gold outline-none text-xs">
                                                        <option value="CAT_001">🍞 パン</option>
                                                        <option value="CAT_002">🍪 クッキー</option>
                                                        <option value="CAT_003">🍦 ソフトクリーム</option>
                                                        <option value="CAT_004">☕ コーヒー</option>
                                                        <option value="CAT_UNKNOWN">❓ 未分類</option>
                                                    </select>
                                                </td>
                                                <td className="p-2 text-center">
                                                    {item.is_filtered
                                                        ? <button onClick={() => handleItemChange(idx, 'is_filtered', false)} className="bg-red-500 text-white px-2 py-1 rounded text-xs shadow-sm">除外中</button>
                                                        : <span className="text-green-600 font-bold text-xs">✓ 対象</span>}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* ⭐️ 保存・連携エリア */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <button onClick={handleSaveToDB} disabled={isSaving || savedSessionId !== null} className={`py-4 rounded-xl font-bold shadow-md transition-colors ${savedSessionId !== null ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-[#D4A96A] text-white hover:bg-[#C4A882]'}`}>
                                {savedSessionId !== null ? '✅ 保存済み' : '💾 修正を確認して売上登録'}
                            </button>

                            <div className="bg-bakery-surface p-4 rounded-xl border border-bakery-border shadow-inner flex flex-col justify-center">
                                <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-2 border border-bakery-border rounded bg-white mb-2 text-sm font-bold text-[#8B6340] outline-none">
                                    <option value="">-- 顧客に紐付ける --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <button onClick={handleLinkCustomer} disabled={!selectedCustomerId || isSaving || !savedSessionId} className="w-full py-2 bg-bakery-primary text-white rounded font-bold text-sm disabled:opacity-50 hover:bg-[#8B5E3C]">
                                    ⭐ 購買記録 & ポイント付与
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* 📱 スマホ用QRモーダル */}
            {showQrModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-8 rounded-2xl text-center max-w-sm w-full shadow-2xl animate-fade-in-up">
                        <h4 className="text-xl font-bold mb-2 text-bakery-textMain">📱 スマホで撮影</h4>
                        <p className="text-sm text-gray-500 mb-6">カメラでQRを読み取り、<br />直接撮影して転送してください</p>
                        <div className="inline-block p-4 border-2 border-bakery-border rounded-xl bg-bakery-surface mb-6">
                            <QRCodeSVG value={`${currentUrl}#/mobile`} size={200} />
                        </div>
                        <button onClick={() => setShowQrModal(false)} className="w-full py-3 bg-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-300">閉じる</button>
                    </div>
                </div>
            )}
        </div>
    );
}