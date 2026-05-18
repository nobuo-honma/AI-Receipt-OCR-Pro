import { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

type ParsedItem = { name: string; price: number; qty: number; };
type Customer = { id: number; name: string; visit_count: number; points: number; first_visit: string; total_spent: number; };
type Product = { id: number; receipt_name: string; name: string; price: number; };

export default function Analyze() {
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [results, setResults] = useState<ParsedItem[]>([]);

    const [customers, setCustomers] = useState<Customer[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
    const [isSaving, setIsSaving] = useState(false);
    const [savedSessionId, setSavedSessionId] = useState<number | null>(null);

    const [isCameraActive, setIsCameraActive] = useState(false);
    const [showQR, setShowQR] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const fetchData = async () => {
            const { data: cData } = await supabase.from('customers').select('*').order('last_visit', { ascending: false });
            if (cData) setCustomers(cData);
            const { data: pData } = await supabase.from('products').select('*');
            if (pData) setProducts(pData);
        };
        fetchData();

        const subscription = supabase.channel('public:transfer_images')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'transfer_images' }, payload => {
                const byteChars = atob(payload.new.image_base64);
                const byteNums = new Array(byteChars.length);
                for (let i = 0; i < byteChars.length; i++) byteNums[i] = byteChars.charCodeAt(i);
                const file = new File([new Uint8Array(byteNums)], "mobile.jpg", { type: "image/jpeg" });
                setImageFile(file); setImagePreview(URL.createObjectURL(file)); setShowQR(false); setSavedSessionId(null);
                alert("📱 スマホから画像を受信しました！");
                supabase.from('transfer_images').delete().eq('id', payload.new.id).then();
            }).subscribe();
        return () => { supabase.removeChannel(subscription); stopCamera(); };
    }, []);

    const startCamera = async () => {
        setImagePreview(null); setImageFile(null); setShowQR(false);
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
        canvasRef.current.toBlob(blob => {
            if (!blob) return;
            const file = new File([blob], "camera.jpg", { type: "image/jpeg" });
            setImageFile(file); setImagePreview(URL.createObjectURL(file)); setSavedSessionId(null); stopCamera();
        }, 'image/jpeg', 0.9);
    };

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (isCameraActive) stopCamera(); setShowQR(false);
        const file = e.target.files?.[0];
        if (file) { setImageFile(file); setImagePreview(URL.createObjectURL(file)); setSavedSessionId(null); }
    };

    // 🇯🇵 マスタ連動＆AI自己修復型 最強パーサー（ダブルチェック版）
    const parseReceiptText = (rawText: string): ParsedItem[] => {
        const cleanText = rawText.replace(/[※\*＊%]/g, '').replace(/[,，]/g, '').replace(/[¥\\￥]/g, '');
        const lines = cleanText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        const parsedItems: ParsedItem[] = [];

        const ignoreWords = ["合計", "お預", "お釣", "釣銭", "レジ", "電話", "住所", "店舗", "小計", "税", "割引", "ポイント", "領収", "担当", "日付", "対象", "クレジット", "売上票", "控え", "番号", "支払", "ID", "取", "日計", "点検", "金額"];

        for (let i = 0; i < lines.length; i++) {
            const currentLine = lines[i];
            if (ignoreWords.some(word => currentLine.includes(word))) continue;

            const normalizedLine = currentLine.normalize("NFKC");
            const matchedProduct = products.find(p => normalizedLine.includes(p.receipt_name) || normalizedLine.includes(p.name));

            if (matchedProduct) {
                let ocrQty = 1;       // 「〇点」から読み取った個数
                let ocrTotal = 0;     // 次の行から読み取った合計金額
                let finalQty = 1;     // 最終的に採用する個数
                let foundLines = 0;

                // 商品名から下を6行分先読みして「個数」と「合計金額」の両方を探す
                for (let j = 1; j <= 6; j++) {
                    if (i + j >= lines.length) break;
                    const lookAheadLine = lines[i + j].normalize("NFKC");

                    // 「〇 点」を探す
                    const qtyMatch = lookAheadLine.match(/(\d+)\s*点/);
                    if (qtyMatch) {
                        ocrQty = parseInt(qtyMatch[1], 10);
                        foundLines = Math.max(foundLines, j);
                        continue;
                    }

                    // 「数字だけ（合計金額）」を探す
                    if (/^\d+$/.test(lookAheadLine)) {
                        const tempPrice = parseInt(lookAheadLine, 10);
                        // マスタ単価以上の数字であれば、合計金額の行とみなす
                        if (tempPrice >= matchedProduct.price) {
                            ocrTotal = tempPrice;
                            foundLines = Math.max(foundLines, j);
                            break; // 金額を見つけたら探索終了
                        }
                    }
                }

                // ⭐️ ダブルチェックによる自己修復ロジック ⭐️

                // 1. 金額が単価で綺麗に割り切れる場合（一番確実）
                if (ocrTotal > 0 && ocrTotal % matchedProduct.price === 0) {
                    finalQty = ocrTotal / matchedProduct.price;
                }
                // 2. 金額が割り切れない（誤読の）場合、読み取った「点数」と掛け算して一番近いかチェック
                else if (ocrTotal > 0 && ocrQty > 0) {
                    const expectedTotal = matchedProduct.price * ocrQty;

                    // OCRの読み取り金額(2790)と、計算上の金額(2700)の誤差が 20% 以内なら、
                    // 金額の誤読とみなして、「点数(30)」の方を正解として採用する！
                    if (Math.abs(ocrTotal - expectedTotal) / expectedTotal <= 0.2) {
                        finalQty = ocrQty;
                    } else {
                        // 誤差が大きすぎる場合は、金額を単価で割った「近似値」を採用する
                        finalQty = Math.round(ocrTotal / matchedProduct.price);
                    }
                }
                // 3. どちらかしか見つからなかった場合のフォールバック
                else if (ocrQty > 0) {
                    finalQty = ocrQty;
                } else if (ocrTotal > 0) {
                    finalQty = Math.round(ocrTotal / matchedProduct.price);
                }

                // 探索した行数分だけメインのループをスキップ（無駄読み防止）
                if (foundLines > 0) i += foundLines;

                // リストに追加
                parsedItems.push({
                    name: matchedProduct.name,
                    price: matchedProduct.price,
                    qty: finalQty
                });
            }
        }

        const aggregated: Record<string, ParsedItem> = {};
        parsedItems.forEach(item => {
            const key = `${item.name}_${item.price}`;
            if (aggregated[key]) aggregated[key].qty += item.qty;
            else aggregated[key] = { ...item };
        });
        return Object.values(aggregated);
    };

    const handleAnalyze = async () => {
        if (!imageFile) return;
        setIsAnalyzing(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(imageFile);
            reader.onload = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const { data, error } = await supabase.functions.invoke('analyze-receipt', { body: { imageBase64: base64 } });
                if (error || !data?.text) throw error;

                const newItems = parseReceiptText(data.text);
                if (newItems.length === 0) alert("マスタに登録されている商品が読み取れませんでした。");
                else {
                    const combined = [...results, ...newItems];
                    const agg: Record<string, ParsedItem> = {};
                    combined.forEach(i => { const k = `${i.name}_${i.price}`; if (agg[k]) agg[k].qty += i.qty; else agg[k] = { ...i }; });
                    setResults(Object.values(agg));
                    setSavedSessionId(null);
                }
                setIsAnalyzing(false);
            };
        } catch (error) { setIsAnalyzing(false); alert("解析に失敗しました。"); }
    };

    const calculateTotal = () => results.reduce((s, i) => s + (i.price * i.qty), 0);
    const getFormattedDate = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`; };

    const handleSaveToDB = async () => {
        if (results.length === 0 || isSaving) return;
        setIsSaving(true);
        const { data } = await supabase.from('scan_sessions').insert({ scanned_at: getFormattedDate(), total_amt: calculateTotal() }).select('id').single();
        if (data) {
            await supabase.from('scan_items').insert(results.map(i => ({ session_id: data.id, name: i.name, unit_price: i.price, quantity: i.qty, subtotal: i.price * i.qty })));
            setSavedSessionId(data.id); alert("保存しました！");
        }
        setIsSaving(false);
    };

    const handleLinkCustomer = async () => {
        if (!selectedCustomerId || results.length === 0 || isSaving) return;
        setIsSaving(true);
        const total = calculateTotal(); const pts = Math.max(1, Math.floor(total * 0.01)); const t = getFormattedDate().split(' ')[0];
        const c = customers.find(c => c.id.toString() === selectedCustomerId);
        if (c) {
            await supabase.from('customer_purchases').insert({ customer_id: c.id, session_id: savedSessionId, purchased_at: getFormattedDate(), amount: total, points_earned: pts, memo: "レシート解析" });
            await supabase.from('customers').update({ total_spent: c.total_spent + total, points: c.points + pts, visit_count: c.visit_count + 1, first_visit: c.first_visit || t, last_visit: t }).eq('id', c.id);
            alert(`${c.name}さんに ${pts}pt 付与しました！`); setSelectedCustomerId("");
        }
        setIsSaving(false);
    };

    // QRコードのURL (現在のサイトのURL + ベースURL + /mobile)
    const mobileUrl = `${window.location.protocol}//${window.location.hostname}${window.location.port ? ':' + window.location.port : ''}${import.meta.env.BASE_URL}#/mobile`;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-5/12">
                <h1 className="text-2xl font-bold text-bakery-textMain mb-2 flex items-center gap-2">📸 レシート読込</h1>
                <div className="flex items-start gap-2 bg-[#FFF8E7] border border-bakery-border/50 text-[#8B6340] text-xs md:text-sm p-3 rounded-lg mb-6">
                    <span className="text-bakery-gold text-base leading-none mt-0.5">💡</span>
                    <p className="leading-relaxed">レシートを撮影するか、画像を選択して「解析を実行」を押してください。</p>
                </div>

                <div className="flex gap-2 mb-4">
                    <button onClick={isCameraActive ? stopCamera : startCamera} className="flex-1 py-3 rounded border-2 border-bakery-primary text-bakery-primary hover:bg-bakery-bg font-bold">{isCameraActive ? '⏹️ 停止' : '📷 カメラ'}</button>
                    <button onClick={() => { if (isCameraActive) stopCamera(); setShowQR(false); fileInputRef.current?.click(); }} className="flex-1 border-2 border-[#C4A882] text-[#8B6340] py-3 rounded font-bold hover:bg-[#FDF0D5]">📁 ファイル</button>
                    <button onClick={() => { if (isCameraActive) stopCamera(); setShowQR(!showQR); }} className="flex-1 bg-bakery-primary text-white py-3 rounded font-bold hover:bg-[#8B5E3C]">📱 スマホ転送</button>
                    <input type="file" accept="image/jpeg, image/png" className="hidden" ref={fileInputRef} onChange={handleImageChange} />
                </div>

                {showQR && (
                    <div className="bg-[#FFF8E7] p-6 rounded-xl border-2 border-dashed border-bakery-primary mb-6 text-center animate-fade-in-up">
                        <p className="text-bakery-textMain font-bold mb-4">スマホのカメラでスキャンしてください</p>
                        <div className="inline-flex justify-center bg-white p-4 rounded-lg shadow-sm"><QRCodeSVG value={mobileUrl} size={150} /></div>
                        <p className="text-xs text-[#8B6340] mt-4">撮影すると自動的にPCに画像が届きます</p>
                    </div>
                )}

                <div className="bg-white p-4 rounded-xl border border-bakery-border shadow-sm mb-6 text-center min-h-[300px] flex flex-col justify-center relative overflow-hidden">
                    <video ref={videoRef} className={`w-full max-h-[400px] object-cover rounded bg-black ${isCameraActive ? 'block' : 'hidden'}`} playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    {isCameraActive && <button onClick={capturePhoto} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-white border-4 border-bakery-primary rounded-full w-16 h-16 shadow-lg flex items-center justify-center"><div className="bg-bakery-primary w-12 h-12 rounded-full"></div></button>}
                    {!isCameraActive && imagePreview && <img src={imagePreview} className="max-h-[400px] object-contain mx-auto" />}
                    {!isCameraActive && !imagePreview && !showQR && <div className="py-10 text-[#C4A882]"><p className="text-4xl mb-2">📄</p><p className="text-sm">上のボタンから撮影・選択</p></div>}
                </div>
                <button onClick={handleAnalyze} disabled={!imageFile || isAnalyzing || isCameraActive} className="w-full py-4 rounded-lg font-bold text-lg bg-bakery-primary text-bakery-gold hover:bg-[#8B5E3C] disabled:bg-gray-300 disabled:text-gray-500 shadow-md">
                    {isAnalyzing ? '⏳ 解析中...' : '⚡ 解析を実行'}
                </button>
            </div>

            <div className="w-full md:w-7/12">
                <div className="flex justify-between items-center mb-2">
                    <h2 className="text-2xl font-bold text-bakery-textMain">📝 解析・集計結果</h2>
                    {results.length > 0 && <button onClick={() => { if (window.confirm("クリアしますか？")) { setResults([]); setSavedSessionId(null); setImagePreview(null); setImageFile(null); } }} className="text-sm text-bakery-danger border border-bakery-danger/30 bg-red-50 px-4 py-1.5 rounded font-bold shadow-sm hover:bg-red-100">🗑️ クリア</button>}
                </div>
                <div className="flex items-start gap-2 bg-[#FFF8E7] border border-bakery-border/50 text-[#8B6340] text-xs md:text-sm p-3 rounded-lg mb-6">
                    <span className="text-bakery-gold text-base leading-none mt-0.5">💡</span>
                    <p className="leading-relaxed">内容に問題がなければ「履歴に保存」を押して売上を確定させます。お客様を選択すると同時にポイントを付与できます。</p>
                </div>

                {results.length > 0 ? (
                    <div className="animate-fade-in-up">
                        <div className="bg-gradient-to-br from-[#3D2B1F] to-[#6B4226] p-6 rounded-xl text-center shadow-lg mb-6"><p className="text-[#D4A96A] text-xs">TOTAL AMOUNT</p><p className="text-[#FDF6E3] font-bold text-4xl">￥{calculateTotal().toLocaleString()}</p></div>
                        <table className="w-full bg-white rounded-xl shadow-sm border border-bakery-border mb-6"><tbody>{results.map((i, idx) => <tr key={idx}><td className="p-3 font-bold">{i.name}</td><td className="p-3 text-right">￥{i.price}</td><td className="p-3 text-center">{i.qty}</td><td className="p-3 text-right font-bold text-bakery-primary">￥{i.price * i.qty}</td></tr>)}</tbody></table>
                        <button onClick={handleSaveToDB} disabled={isSaving || savedSessionId !== null} className={`w-full py-3 mb-6 rounded-lg font-bold border-2 ${savedSessionId !== null ? 'bg-gray-100 text-gray-400' : 'bg-white text-bakery-primary border-bakery-primary hover:bg-bakery-bg'}`}>{savedSessionId !== null ? '✅ 保存済み' : '✨ 履歴に保存'}</button>
                        <div className="bg-bakery-surface p-6 rounded-xl border border-bakery-border shadow-inner">
                            <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-3 border rounded bg-white mb-4 font-bold text-[#8B6340]"><option value="">-- 顧客を選択 --</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                            <button onClick={handleLinkCustomer} disabled={!selectedCustomerId || isSaving} className="w-full py-3 bg-[#D4A96A] text-white rounded-lg font-bold hover:bg-[#C4A882] disabled:bg-[#E0C898]">⭐ 購買記録 & 1% ポイント付与</button>
                        </div>
                    </div>
                ) : (
                    <div className="border-2 border-dashed border-bakery-border p-16 text-center rounded-xl text-[#8B6340] bg-bakery-surface h-full flex flex-col justify-center">
                        <p className="text-4xl mb-4">📋</p><p>画像を解析するとリストが表示されます</p>
                    </div>
                )}
            </div>
        </div>
    );
}