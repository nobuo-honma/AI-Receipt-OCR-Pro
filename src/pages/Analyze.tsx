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
type Product = { id: number; receipt_name: string; name: string; price: number; category: string; };

export default function Analyze() {
    const [loading, setLoading] = useState<boolean>(false);
    const [items, setItems] = useState<ReceiptItem[]>([]);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [showFilteredItems, setShowFilteredItems] = useState<boolean>(false);

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [savedSessionId, setSavedSessionId] = useState<number | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [salesDate, setSalesDate] = useState(() => new Date().toISOString().split('T')[0]);

    const [showQrModal, setShowQrModal] = useState<boolean>(false);
    const [showQR, setShowQR] = useState<boolean>(false);
    const [currentUrl, setCurrentUrl] = useState<string>('');
    const [isCameraActive, setIsCameraActive] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRefNormal = useRef<HTMLInputElement>(null);

    const stopCamera = useCallback(() => {
        if (videoRef.current?.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); videoRef.current.srcObject = null; }
        setIsCameraActive(false);
    }, []);

    useEffect(() => {
        if (typeof window !== 'undefined') setCurrentUrl(`${window.location.protocol}//${window.location.host}${import.meta.env.BASE_URL}`);

        const fetchData = async () => {
            const { data: cData } = await supabase.from('customers').select('*').order('last_visit', { ascending: false });
            if (cData) setCustomers(cData);
            const { data: pData } = await supabase.from('products').select('*');
            if (pData) setProducts(pData);
        };
        fetchData();

        const sub = supabase.channel('public:transfer_images')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transfer_images' }, payload => {
                setImageBase64(payload.new.image_base64);
                setPreviewUrl(`data:image/jpeg;base64,${payload.new.image_base64}`);
                setShowQrModal(false); setSavedSessionId(null);
                alert("📱 スマホから画像を受信しました！");
                supabase.from('transfer_images').delete().eq('id', payload.new.id).then();
            }).subscribe();

        return () => { supabase.removeChannel(sub); stopCamera(); };
    }, [stopCamera]);

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

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); setIsCameraActive(true); }
        } catch { alert("カメラの起動に失敗しました"); }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        canvasRef.current.width = videoRef.current.videoWidth; canvasRef.current.height = videoRef.current.videoHeight;
        ctx?.drawImage(videoRef.current, 0, 0, canvasRef.current.width, canvasRef.current.height);

        const b64 = canvasRef.current.toDataURL('image/jpeg', 0.8).split(',')[1];
        setImageBase64(b64); setPreviewUrl(`data:image/jpeg;base64,${b64}`);
        setSavedSessionId(null); stopCamera();
    };

    // 🇯🇵 究極の座標解析パーサー
    const parseReceiptTextWithCoords = (blocks: any[]): ReceiptItem[] => {
        const words = blocks.slice(1).map((block: any) => {
            const ys = block.boundingPoly.vertices.map((v: any) => v.y);
            const xs = block.boundingPoly.vertices.map((v: any) => v.x);
            return {
                text: block.description.normalize("NFKC").replace(/[※\*＊%,，¥\\￥]/g, ''),
                y: (ys[0] + ys[2]) / 2,
                x: Math.min(...xs),
            };
        }).filter((w: any) => w.text.length > 0);

        words.sort((a: any, b: any) => a.y - b.y);
        const lines: { y: number, text: string }[] = [];

        let currentLineY = -1;
        let currentLineText = "";

        words.forEach((w: any) => {
            if (currentLineY === -1 || Math.abs(w.y - currentLineY) > 20) {
                if (currentLineText) lines.push({ y: currentLineY, text: currentLineText.trim() });
                currentLineY = w.y;
                currentLineText = w.text;
            } else {
                currentLineText += " " + w.text;
            }
        });
        if (currentLineText) lines.push({ y: currentLineY, text: currentLineText.trim() });

        const parsedItems: ReceiptItem[] = [];

        const ignoreWords = ["合計", "お預", "お釣", "釣銭", "レジ", "電話", "住所", "店舗", "小計", "税", "割引", "ポイント", "領収", "担当", "日付", "対象", "クレジット", "売上票", "控え", "番号", "支払", "ID", "取", "日計", "点検"];

        for (let i = 0; i < lines.length; i++) {
            const currentLine = lines[i];
            if (ignoreWords.some(word => currentLine.text.includes(word))) continue;

            const matchedProduct = products.find(p => currentLine.text.includes(p.receipt_name) || currentLine.text.includes(p.name));

            if (matchedProduct) {
                let finalQty = 1;
                let foundLines = 0;
                const targetY = currentLine.y;

                const lookAheadLines = lines.filter((l: any) => l.y > targetY && l.y <= targetY + 300);

                let tempQty = 0;
                let tempTotal = 0;

                for (const l of lookAheadLines) {
                    if (products.some(p => l.text.includes(p.receipt_name) || l.text.includes(p.name))) break;
                    foundLines++;

                    const qtyMatch = l.text.match(/(\d+)\s*点/);
                    if (qtyMatch) { tempQty = parseInt(qtyMatch[1], 10); continue; }

                    const priceMatch = l.text.match(/^(?:金額\s*)?(\d{2,})$/);
                    if (priceMatch && !l.text.includes("点")) {
                        const p = parseInt(priceMatch[1], 10);
                        if (p >= matchedProduct.price) { tempTotal = p; break; }
                    }
                }

                if (tempTotal > 0 && tempTotal % matchedProduct.price === 0) {
                    finalQty = tempTotal / matchedProduct.price;
                } else if (tempTotal > 0 && tempQty > 0) {
                    const expectedTotal = matchedProduct.price * tempQty;
                    if (Math.abs(tempTotal - expectedTotal) / expectedTotal <= 0.2) finalQty = tempQty;
                    else finalQty = Math.round(tempTotal / matchedProduct.price);
                } else if (tempQty > 0) {
                    finalQty = tempQty;
                } else if (tempTotal > 0) {
                    finalQty = Math.round(tempTotal / matchedProduct.price);
                }

                const currentLineIndexInOriginal = lines.findIndex((l: any) => l.y === currentLine.y);
                i = currentLineIndexInOriginal + foundLines;

                parsedItems.push({
                    name: matchedProduct.name,
                    price: matchedProduct.price,
                    qty: finalQty,
                    category_id: matchedProduct.category || "❓ 未分類"
                });
            }
        }

        const aggregated: Record<string, ReceiptItem> = {};
        parsedItems.forEach(item => {
            const key = `${item.name}_${item.price}`;
            if (aggregated[key]) aggregated[key].qty += item.qty;
            else aggregated[key] = { ...item };
        });
        return Object.values(aggregated);
    };

    const handleAnalyze = async () => {
        if (!imageBase64) return alert("画像をセットしてください");
        setLoading(true);

        try {
            const { data, error } = await supabase.functions.invoke('analyze-receipt', { body: { imageBase64 } });
            if (error) throw error;

            if (!data?.blocks || data.blocks.length === 0) {
                throw new Error("テキストが読み取れませんでした。画像が鮮明か確認してください。");
            }

            const newItems = parseReceiptTextWithCoords(data.blocks);

            if (newItems.length === 0) {
                alert("マスタに登録されている商品が読み取れませんでした。");
            } else {
                const combined = [...items, ...newItems];
                const agg: Record<string, ReceiptItem> = {};
                combined.forEach(i => {
                    const k = `${i.name}_${i.price}`;
                    if (agg[k]) agg[k].qty += i.qty;
                    else agg[k] = { ...i };
                });
                setItems(Object.values(agg));
                setSavedSessionId(null);
                alert("リストに追加しました！");
            }
        } catch (err: any) {
            console.error("解析通信エラー:", err);
            alert(`【解析に失敗しました】\n${err.message || "通信状況を確認してください。"}`);
        } finally { setLoading(false); }
    };

    const handleItemChange = (index: number, field: keyof ReceiptItem, value: string | number | boolean) => {
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };
        setItems(updatedItems);
    };

    const calculateTotal = () => items.filter(i => !i.is_filtered).reduce((sum, item) => sum + (item.price * item.qty), 0);
    const getFormattedDate = () => {
        const d = new Date();
        const timeStr = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
        return `${salesDate} ${timeStr}`;
    };

    const handleSaveToDB = async () => {
        const savePayload = items.filter(item => !item.is_filtered);
        if (savePayload.length === 0 || isSaving) return alert("保存するデータがありません");
        setIsSaving(true);
        try {
            const { data, error } = await supabase.from('scan_sessions').insert({ scanned_at: getFormattedDate(), total_amt: calculateTotal() }).select('id').single();
            if (error || !data) throw error;

            await supabase.from('scan_items').insert(savePayload.map(i => ({
                session_id: data.id,
                name: i.name,
                unit_price: i.price,
                quantity: i.qty,
                subtotal: i.price * i.qty,
                category: i.category_id
            })));
            setSavedSessionId(data.id); alert("ダッシュボードに売上を保存しました！");
        } catch { alert("保存に失敗しました"); } finally { setIsSaving(false); }
    };

    const handleLinkCustomer = async () => {
        if (!selectedCustomerId || items.length === 0 || isSaving) return;
        setIsSaving(true);
        try {
            const total = calculateTotal();
            const c = customers.find(c => c.id.toString() === selectedCustomerId);
            if (!c) return;
            await supabase.from('customer_purchases').insert({ customer_id: c.id, session_id: savedSessionId, purchased_at: getFormattedDate(), amount: total, points_earned: 0, memo: "AIレシート解析" });
            await supabase.from('customers').update({ total_spent: c.total_spent + total, visit_count: c.visit_count + 1 }).eq('id', c.id);
            alert(`${c.name}さんの購買履歴として記録しました！`); setSelectedCustomerId("");
        } catch { alert("履歴の紐付けに失敗しました"); } finally { setIsSaving(false); }
    };

    const uniqueCategories = Array.from(new Set(products.map(p => p.category).filter(Boolean)));
    if (!uniqueCategories.includes("❓ 未分類")) uniqueCategories.push("❓ 未分類");

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-4/12">
                <h1 className="text-2xl font-bold text-bakery-textMain mb-2 flex items-center gap-2">📸 レシート読込</h1>
                <div className="flex items-start gap-2 bg-[#FFF8E7] border border-bakery-border/50 text-[#8B6340] text-xs md:text-sm p-3 rounded-lg mb-6">
                    <span className="text-bakery-gold text-base leading-none mt-0.5">💡</span>
                    <p className="leading-relaxed">レシートを撮影するか、画像を選択して「解析を実行」を押してください。</p>
                </div>

                <div className="flex flex-col gap-3 mb-6">
                    <button
                        onClick={() => { if (isCameraActive) stopCamera(); setShowQR(false); fileInputRefNormal.current?.click(); }}
                        className="w-full py-4 bg-white border-2 border-bakery-border rounded-xl font-bold text-[#8B6340] hover:bg-bakery-surface transition-colors shadow-sm flex items-center justify-center gap-2"
                    >
                        📁 1. PCからファイルを選択
                    </button>

                    <button
                        onClick={() => { if (isCameraActive) stopCamera(); setShowQR(!showQR); }}
                        className={`w-full py-4 rounded-xl font-bold transition-colors shadow-md flex items-center justify-center gap-2 ${showQR ? 'bg-[#8B5E3C] text-white' : 'bg-bakery-primary text-bakery-gold hover:bg-[#8B5E3C]'}`}
                    >
                        📱 2. スマホで撮影して転送
                    </button>

                    <button
                        onClick={isCameraActive ? stopCamera : startCamera}
                        className={`w-full py-3 rounded-xl font-bold transition-colors border-2 flex items-center justify-center gap-2 ${isCameraActive ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-bakery-primary text-bakery-primary hover:bg-bakery-bg'}`}
                    >
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
                    ) : !isCameraActive && !showQR && (
                        <div className="py-10 text-[#C4A882]"><p className="text-4xl mb-2">📄</p><p className="text-sm">画像をセットしてください</p></div>
                    )}
                </div>
                <button onClick={handleAnalyze} disabled={loading || !imageBase64 || isCameraActive} className="w-full py-4 rounded-lg font-bold text-lg bg-[#10B981] text-white hover:bg-green-600 disabled:bg-gray-300 disabled:text-gray-500 shadow-md transition-transform active:scale-95">
                    {loading ? '⏳ Google AIが解析中...' : '⚡ 解析を実行する'}
                </button>
            </div>

            <div className="w-full lg:w-8/12">
                <div className="flex flex-col sm:flex-row justify-between items-end sm:items-center mb-6 border-b-2 border-bakery-border pb-4 gap-4">
                    <h2 className="text-2xl font-bold text-bakery-textMain">📝 解析結果（手動修正）</h2>
                    <div className="flex items-center gap-3">
                        <span className="font-bold text-[#8B6340] whitespace-nowrap">📅 売上日:</span>
                        <input type="date" value={salesDate} onChange={e => setSalesDate(e.target.value)} className="p-2 border border-bakery-border rounded-lg font-bold outline-none focus:ring-2 focus:ring-bakery-gold bg-white shadow-sm text-bakery-textMain" />
                    </div>
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

                        <div className="bg-white rounded-xl shadow-sm border border-bakery-border overflow-x-auto mb-6">
                            <table className="w-full text-left text-sm border-collapse min-w-max">
                                <thead>
                                    <tr className="bg-bakery-bg text-bakery-primary">
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
                                                <td className="p-2"><input type="text" value={item.name} onChange={(e) => handleItemChange(idx, 'name', e.target.value)} className="w-full p-2 border border-transparent hover:border-gray-300 rounded focus:border-bakery-gold outline-none font-bold text-bakery-textMain" /></td>
                                                <td className="p-2"><input type="number" value={item.price} onChange={(e) => handleItemChange(idx, 'price', Number(e.target.value))} className="w-full p-2 border border-transparent hover:border-gray-300 rounded focus:border-bakery-gold outline-none text-right" /></td>
                                                <td className="p-2"><input type="number" value={item.qty} onChange={(e) => handleItemChange(idx, 'qty', Number(e.target.value))} className="w-full p-2 border border-transparent hover:border-gray-300 rounded focus:border-bakery-gold outline-none text-center" /></td>
                                                <td className="p-2">
                                                    <select value={item.category_id} onChange={(e) => handleItemChange(idx, 'category_id', e.target.value)} className="w-full p-2 border border-transparent hover:border-gray-300 rounded bg-transparent focus:border-bakery-gold outline-none text-xs">
                                                        {uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                    </select>
                                                </td>
                                                <td className="p-2 text-center">{item.is_filtered ? <button onClick={() => handleItemChange(idx, 'is_filtered', false)} className="bg-red-500 text-white px-2 py-1 rounded text-xs shadow-sm">除外中</button> : <span className="text-green-600 font-bold text-xs">✓ 対象</span>}</td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <button onClick={handleSaveToDB} disabled={isSaving || savedSessionId !== null} className={`py-4 rounded-xl font-bold shadow-md transition-colors ${savedSessionId !== null ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-bakery-gold text-white hover:bg-[#C4A882]'}`}>
                                {savedSessionId !== null ? '✅ 保存済み' : '💾 修正を確認して売上登録'}
                            </button>

                            <div className="bg-bakery-surface p-4 rounded-xl border border-bakery-border shadow-inner flex flex-col justify-center">
                                <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-2 border border-bakery-border rounded bg-white mb-2 text-sm font-bold text-[#8B6340] outline-none">
                                    <option value="">-- 顧客に紐付ける --</option>
                                    {customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                                <button onClick={handleLinkCustomer} disabled={!selectedCustomerId || isSaving || !savedSessionId} className="w-full py-2 bg-bakery-primary text-white rounded font-bold text-sm disabled:opacity-50 hover:bg-[#8B5E3C]">
                                    ⭐ お客様の購買履歴として記録
                                </button>
                            </div>
                        </div>

                        <div className="text-right flex flex-col justify-center">
                            <button onClick={() => { if (window.confirm("クリアしますか？")) { setItems([]); setSavedSessionId(null); setImageBase64(null); setPreviewUrl(null); } }} className="text-sm text-bakery-danger border border-bakery-danger/30 bg-red-50 px-4 py-3 rounded-lg font-bold shadow-sm hover:bg-red-100 transition-colors w-full h-full">
                                🗑️ リストをクリアしてやり直す
                            </button>
                        </div>
                    </div>
                )}
            </div>

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