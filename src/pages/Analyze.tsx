// src/pages/Analyze.tsx
import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

// 解析結果と顧客データの型
type ParsedItem = { name: string; price: number; qty: number; };
type Customer = { id: number; name: string; visit_count: number; points: number; first_visit: string; total_spent: number; };

export default function Analyze() {
    // ── 画像と解析のステート ──
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState<ParsedItem[]>([]);

    // ── データベースと保存のステート ──
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const [savedSessionId, setSavedSessionId] = useState<number | null>(null);

    // ── UIとカメラのステート ──
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [showQR, setShowQR] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // ── 1. 初期化とリアルタイム監視（スマホ連携） ──
    useEffect(() => {
        // 顧客リストの取得
        const fetchCustomers = async () => {
            const { data } = await supabase.from('customers').select('*').order('last_visit', { ascending: false });
            if (data) setCustomers(data);
        };
        fetchCustomers();

        // スマホから転送された画像を監視する (Supabase Realtime)
        const subscription = supabase
            .channel('public:transfer_images')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transfer_images' }, payload => {
                const newImageBase64 = payload.new.image_base64;
                const newImageId = payload.new.id;

                // Base64をFileオブジェクトに変換
                const byteCharacters = atob(newImageBase64);
                const byteNumbers = new Array(byteCharacters.length);
                for (let i = 0; i < byteCharacters.length; i++) {
                    byteNumbers[i] = byteCharacters.charCodeAt(i);
                }
                const byteArray = new Uint8Array(byteNumbers);
                const file = new File([byteArray], "mobile_capture.jpg", { type: "image/jpeg" });

                // 画面にセット
                setImageFile(file);
                setImagePreview(URL.createObjectURL(file));
                setResults([]);
                setShowQR(false); // 画像が届いたらQRは閉じる
                setSavedSessionId(null);
                alert("📱 スマホから画像を受信しました！");

                // 受信済みの画像をデータベースから消す（お掃除）
                supabase.from('transfer_images').delete().eq('id', newImageId).then();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
            stopCamera();
        };
    }, []);

    // ── 2. PCカメラの操作 ──
    const startCamera = async () => {
        setImagePreview(null);
        setImageFile(null);
        setResults([]);
        setShowQR(false);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setIsCameraActive(true);
            }
        } catch (err) {
            console.error(err);
            alert("カメラの起動に失敗しました。ブラウザのカメラ許可を確認してください。");
        }
    };

    const stopCamera = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            const stream = videoRef.current.srcObject as MediaStream;
            stream.getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    }, []);

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        canvas.toBlob((blob) => {
            if (!blob) return;
            const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
            setResults([]);
            setSavedSessionId(null);
            stopCamera();
        }, 'image/jpeg', 0.9);
    };

    // ── 3. ファイル選択と解析処理 ──
    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isCameraActive) stopCamera();
        setShowQR(false);
        const file = e.target.files?.[0];
        if (!file) return;
        setImageFile(file);
        setImagePreview(URL.createObjectURL(file));
        setResults([]);
        setSavedSessionId(null);
    };

    const fileToBase64 = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve((reader.result as string).split(',')[1]);
            reader.onerror = error => reject(error);
        });
    };

    // 🇯🇵 日本のレシート最適化パーサー
    const parseReceiptText = (rawText: string): ParsedItem[] => {
        const cleanText = rawText.replace(/[※\*＊%]/g, '').replace(/[,，]/g, '').replace(/[¥\\￥]/g, '');
        const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const parsedItems: ParsedItem[] = [];
        const ignoreWords = ["合計", "お預", "お釣", "釣銭", "レジ", "電話", "住所", "店舗", "小計", "税", "割引", "ポイント", "領収", "担当", "日付", "商品数", "点数", "対象", "クレジット", "売上票", "控え", "番号", "支払", "ID", "取"];

        for (let i = 0; i < lines.length - 1; i++) {
            const currentLine = lines[i];
            const nextLine = lines[i + 1];
            if (ignoreWords.some(word => currentLine.includes(word))) continue;
            if (/^[\d\s]+$/.test(currentLine) || currentLine.length < 2) continue;

            if (/^\d+$/.test(nextLine)) {
                const price = parseInt(nextLine, 10);
                if (price >= 10 && price <= 100000) { parsedItems.push({ name: currentLine, price, qty: 1 }); i++; }
            } else {
                const match = currentLine.match(/^(.*?)\s+(\d+)$/);
                if (match) {
                    const name = match[1].trim().normalize("NFKC");

                    const price = parseInt(match[2], 10);
                    if (name.length >= 2 && price >= 10 && price <= 100000) parsedItems.push({ name, price, qty: 1 });
                }
            }
        }

        const aggregated: Record<string, ParsedItem> = {};
        parsedItems.forEach(item => {
            const key = `${item.name}_${item.price}`;
            if (aggregated[key]) aggregated[key].qty += 1;
            else aggregated[key] = { ...item };
        });
        return Object.values(aggregated);
    };

    const handleAnalyze = async () => {
        if (!imageFile) return;
        setIsAnalyzing(true);
        try {
            const base64Image = await fileToBase64(imageFile);
            const { data, error } = await supabase.functions.invoke('analyze-receipt', { body: { imageBase64: base64Image } });
            if (error) throw new Error(error.message);
            if (!data?.text) throw new Error("テキストが読み取れませんでした");

            const newItems = parseReceiptText(data.text);
            if (newItems.length === 0) {
                alert("商品が読み取れませんでした。別の画像を試してください。");
            } else {
                // 💡 既存のリスト(results)と新しく読み取ったリスト(newItems)を合算する
                const combined = [...results, ...newItems];

                // 同じ名前・金額の商品をまとめる（再集計）
                const aggregated: Record<string, ParsedItem> = {};
                combined.forEach(item => {
                    const key = `${item.name}_${item.price}`;
                    if (aggregated[key]) {
                        aggregated[key].qty += item.qty; // 個数を足し算
                    } else {
                        aggregated[key] = { ...item };
                    }
                });

                setResults(Object.values(aggregated));
                setSavedSessionId(null); // 追加されたので保存状態はリセット
                alert("リストに追加しました！続けて次のレシートを読み込めます。");
            }
        } catch (error) {
            console.error(error);
            alert("解析に失敗しました。APIキーや通信状況を確認してください。");
        } finally {
            setIsAnalyzing(false);
        }
    };

    // ── 4. 計算とデータベース保存処理 ──
    const calculateTotal = () => results.reduce((sum, item) => sum + (item.price * item.qty), 0);
    const getFormattedDate = () => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
    };

    const handleSaveToDB = async () => {
        if (results.length === 0 || isSaving) return;
        setIsSaving(true);
        try {
            const { data, error } = await supabase.from('scan_sessions').insert({ scanned_at: getFormattedDate(), total_amt: calculateTotal() }).select('id').single();
            if (error || !data) throw error;
            const sessionId = data.id;

            const itemsToInsert = results.map(item => ({
                session_id: sessionId, name: item.name, unit_price: item.price, quantity: item.qty, subtotal: item.price * item.qty
            }));
            await supabase.from('scan_items').insert(itemsToInsert);

            setSavedSessionId(sessionId);
            alert("履歴をデータベースに保存しました！");
        } catch (err) { alert("保存に失敗しました"); } finally { setIsSaving(false); }
    };

    const handleLinkCustomer = async () => {
        if (!selectedCustomerId || results.length === 0 || isSaving) return;
        setIsSaving(true);
        try {
            const total = calculateTotal();
            const earnedPoints = Math.max(1, Math.floor(total * 0.01));
            const today = getFormattedDate().split(' ')[0];
            const cust = customers.find(c => c.id.toString() === selectedCustomerId);
            if (!cust) return;

            await supabase.from('customer_purchases').insert({ customer_id: cust.id, session_id: savedSessionId, purchased_at: getFormattedDate(), amount: total, points_earned: earnedPoints, memo: "レシート解析" });
            await supabase.from('customers').update({ total_spent: cust.total_spent + total, points: cust.points + earnedPoints, visit_count: cust.visit_count + 1, first_visit: cust.first_visit || today, last_visit: today }).eq('id', cust.id);

            alert(`【成功】 ${cust.name}さんに ${earnedPoints}pt を付与しました！`);
            setSelectedCustomerId("");
        } catch (err) { alert("ポイント付与に失敗しました"); } finally { setIsSaving(false); }
    };

    // QRコードのURL (現在のサイトのURL + /mobile)
    const mobileUrl = `${window.location.origin}${import.meta.env.BASE_URL}#/mobile`;

    // ── 5. UIの描画 ──
    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
            {/* ── 左カラム：画像入力 ── */}
            <div className="w-full md:w-5/12">
                <h1 className="text-2xl font-bold text-bakery-textMain mb-6 flex items-center gap-2">📸 レシート読込</h1>

                {/* ボタン群（PCカメラ / ファイル / スマホ転送） */}
                <div className="flex gap-2 mb-4">
                    <button onClick={isCameraActive ? stopCamera : startCamera} className={`flex-1 py-3 rounded-lg font-bold transition-colors border-2 ${isCameraActive ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-bakery-primary text-bakery-primary hover:bg-bakery-bg'}`}>
                        {isCameraActive ? '⏹️ 停止' : '📷 PCカメラ'}
                    </button>
                    <button onClick={() => { if (isCameraActive) stopCamera(); setShowQR(false); fileInputRef.current?.click(); }} className="flex-1 bg-white border-2 border-[#C4A882] text-[#8B6340] py-3 rounded-lg font-bold hover:bg-[#FDF0D5] transition-colors">
                        📁 ファイル
                    </button>
                    <button onClick={() => { if (isCameraActive) stopCamera(); setShowQR(!showQR); }} className={`flex-1 text-white py-3 rounded-lg font-bold transition-colors shadow-sm ${showQR ? 'bg-[#8B5E3C]' : 'bg-bakery-primary hover:bg-[#8B5E3C]'}`}>
                        📱 スマホ転送
                    </button>
                    <input type="file" accept="image/jpeg, image/png" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                </div>

                {/* QRコード表示エリア */}
                {showQR && (
                    <div className="bg-[#FFF8E7] p-6 rounded-xl border-2 border-dashed border-bakery-primary mb-6 text-center animate-fade-in-up">
                        <p className="text-bakery-textMain font-bold mb-4">スマホのカメラでスキャン</p>
                        <div className="inline-flex justify-center bg-white p-4 rounded-lg shadow-sm">
                            <QRCodeSVG value={mobileUrl} size={150} />
                        </div>
                        <p className="text-xs text-[#8B6340] mt-4">撮影すると自動的にPCに画像が届きます</p>
                    </div>
                )}

                {/* 映像・プレビュー表示エリア */}
                <div className="bg-white p-4 rounded-xl border border-bakery-border shadow-sm mb-6 text-center min-h-[300px] flex flex-col justify-center relative overflow-hidden">
                    <video ref={videoRef} className={`w-full max-h-[400px] object-cover rounded bg-black ${isCameraActive ? 'block' : 'hidden'}`} playsInline />
                    <canvas ref={canvasRef} className="hidden" />

                    {isCameraActive && (
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center">
                            <button onClick={capturePhoto} className="bg-white border-4 border-bakery-primary rounded-full w-16 h-16 shadow-[0_0_15px_rgba(0,0,0,0.3)] hover:scale-95 transition-transform flex items-center justify-center">
                                <div className="bg-bakery-primary w-12 h-12 rounded-full"></div>
                            </button>
                        </div>
                    )}

                    {!isCameraActive && imagePreview && (
                        <div>
                            <p className="text-xs text-gray-500 text-left mb-2">プレビュー</p>
                            <img src={imagePreview} alt="Receipt" className="max-h-[400px] object-contain mx-auto border border-gray-200 rounded" />
                        </div>
                    )}

                    {!isCameraActive && !imagePreview && !showQR && (
                        <div className="py-10 text-[#C4A882]">
                            <p className="text-4xl mb-2">📄</p>
                            <p className="text-sm">上のボタンからレシートを撮影・選択</p>
                        </div>
                    )}
                </div>

                <button
                    onClick={handleAnalyze} disabled={!imageFile || isAnalyzing || isCameraActive}
                    className={`w-full py-4 rounded-lg font-bold text-lg tracking-wider transition-all shadow-md ${(!imageFile || isAnalyzing || isCameraActive) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-bakery-primary text-bakery-gold hover:bg-[#8B5E3C] hover:-translate-y-1'}`}
                >
                    {isAnalyzing ? '⏳ Google AIが解析中...' : '⚡ 解析を実行する'}
                </button>
            </div>

            {/* ── 右カラム：解析結果 ── */}
            <div className="w-full md:w-7/12">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-2xl font-bold text-bakery-textMain flex items-center gap-2">
                        📝 解析・集計結果
                    </h2>

                    {/* 💡 追加：リストをクリアするボタン */}
                    {results.length > 0 && (
                        <button
                            onClick={() => {
                                if (window.confirm("リストをすべてクリアして最初からやり直しますか？")) {
                                    setResults([]);
                                    setSavedSessionId(null);
                                    setImagePreview(null);
                                    setImageFile(null);
                                }
                            }}
                            className="text-sm text-bakery-danger border border-bakery-danger/30 bg-red-50 px-4 py-1.5 rounded hover:bg-red-100 transition-colors font-bold shadow-sm"
                        >
                            🗑️ クリア
                        </button>
                    )}
                </div>

                {results.length > 0 ? (
                    <div className="animate-fade-in-up">
                        <div className="bg-linear-to-br from-[#3D2B1F] to-[#6B4226] p-6 rounded-xl text-center shadow-lg mb-6 border border-[#4A2E1A]">
                            <p className="font-playfair italic text-[#D4A96A] text-xs tracking-[0.15em] mb-1">TOTAL AMOUNT</p>
                            <p className="font-zen font-bold text-[#FDF6E3] text-4xl">￥{calculateTotal().toLocaleString()}</p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-bakery-border overflow-hidden mb-6">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-bakery-bg text-[#6B4226] text-sm">
                                        <th className="p-3 border-b border-bakery-border">商品名</th>
                                        <th className="p-3 border-b border-bakery-border w-24 text-right">単価</th>
                                        <th className="p-3 border-b border-bakery-border w-16 text-center">個数</th>
                                        <th className="p-3 border-b border-bakery-border w-28 text-right">売上(小計)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {results.map((item, i) => (
                                        <tr key={i} className="border-b border-gray-100 hover:bg-[#FAFAFA]">
                                            <td className="p-3 font-bold text-bakery-textMain">{item.name}</td>
                                            <td className="p-3 text-right text-gray-600">￥{item.price.toLocaleString()}</td>
                                            <td className="p-3 text-center text-gray-600">{item.qty}</td>
                                            <td className="p-3 text-right font-bold text-bakery-primary">￥{(item.price * item.qty).toLocaleString()}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-8">
                            <button onClick={handleSaveToDB} disabled={isSaving || savedSessionId !== null} className={`py-3 rounded-lg font-bold transition-colors border-2 ${savedSessionId !== null ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed' : 'bg-white border-bakery-primary text-bakery-primary hover:bg-bakery-bg'}`}>
                                {savedSessionId !== null ? '✅ 保存済み' : '✨ 履歴に保存'}
                            </button>
                            <button onClick={() => alert("Excel保存は準備中です")} className="bg-white border-2 border-[#10B981] text-[#10B981] py-3 rounded-lg font-bold hover:bg-[#D1FAE5] transition-colors">
                                📥 Excel保存
                            </button>
                        </div>

                        <div className="bg-bakery-surface p-6 rounded-xl border border-bakery-border shadow-inner">
                            <h3 className="font-bold text-bakery-textMain mb-4 flex items-center gap-2">👤 顧客に紐付ける</h3>
                            <select value={selectedCustomerId} onChange={(e) => setSelectedCustomerId(e.target.value)} className="w-full p-3 border border-bakery-border rounded-md bg-white focus:outline-none mb-4 text-[#8B6340] font-bold">
                                <option value="">-- 顧客を選択してください --</option>
                                {customers.map(c => <option key={c.id} value={c.id}>{c.name} （来店{c.visit_count}回 / {c.points}pt）</option>)}
                            </select>
                            <button onClick={handleLinkCustomer} disabled={!selectedCustomerId || isSaving} className={`w-full py-3 rounded-lg font-bold transition-colors shadow-sm ${!selectedCustomerId || isSaving ? 'bg-[#E0C898] text-white cursor-not-allowed' : 'bg-[#D4A96A] text-white hover:bg-[#C4A882]'}`}>
                                ⭐ 購買記録 & 1% ポイント付与
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="border-2 border-dashed border-bakery-border p-16 text-center rounded-xl text-[#8B6340] bg-bakery-surface h-full flex flex-col justify-center">
                        <p className="text-4xl mb-4">📋</p>
                        <p className="leading-relaxed">左側で画像を解析すると、<br />ここにリストが表示されます</p>
                    </div>
                )}
            </div>
        </div>
    );
}