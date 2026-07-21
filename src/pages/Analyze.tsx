import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';

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
    const currentUrl = typeof window !== 'undefined' ? `${window.location.protocol}//${window.location.host}${import.meta.env.BASE_URL}` : '';
    const [isCameraActive, setIsCameraActive] = useState(false);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fileInputRefNormal = useRef<HTMLInputElement>(null);

    const stopCamera = useCallback(() => {
        if (videoRef.current?.srcObject) { (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop()); videoRef.current.srcObject = null; }
        setIsCameraActive(false);
    }, []);

    useEffect(() => {
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
                let { width, height } = img;
                const MAX_HEIGHT = 2000;
                if (height > MAX_HEIGHT) { width = Math.round((width * MAX_HEIGHT) / height); height = MAX_HEIGHT; }
                canvas.width = width; canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, width, height); ctx.drawImage(img, 0, 0, width, height);
                    setImageBase64(canvas.toDataURL('image/jpeg', 0.9).split(',')[1]);
                }
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
    };

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 2048 }, height: { ideal: 2048 } } });
            if (videoRef.current) { videoRef.current.srcObject = stream; videoRef.current.play(); setIsCameraActive(true); }
        } catch { alert("カメラの起動に失敗しました"); }
    };

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const ctx = canvasRef.current.getContext('2d');
        const video = videoRef.current;
        let width = video.videoWidth; let height = video.videoHeight;
        const MAX_HEIGHT = 2000;
        if (height > MAX_HEIGHT) { width = Math.round((width * MAX_HEIGHT) / height); height = MAX_HEIGHT; }
        canvasRef.current.width = width; canvasRef.current.height = height;
        ctx!.fillStyle = "#ffffff"; ctx!.fillRect(0, 0, width, height); ctx?.drawImage(video, 0, 0, width, height);
        const b64 = canvasRef.current.toDataURL('image/jpeg', 0.9).split(',')[1];
        setImageBase64(b64); setPreviewUrl(`data:image/jpeg;base64,${b64}`);
        setSavedSessionId(null); stopCamera();
    };

    // ⭐️ 濁点誤読（パ・バ）やひらがな・カタカナの表記揺れを100%吸収する精密パースロジック
    const parseReceiptTextWithCoords = (blocks: any[]): ReceiptItem[] => {
        const words: any[] = [];

        // 1. 各単語の抽出と傾き補正
        blocks.slice(1).forEach((block: any) => {
            const rawText = block.description || "";
            const linesInBlock = rawText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);
            if (linesInBlock.length === 0) return;

            const vs = block.boundingPoly?.vertices;
            if (!vs || vs.length === 0) return;

            const ys = vs.map((v: any) => v.y || 0);
            const xs = vs.map((v: any) => v.x || 0);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);

            let angle = 0;
            if (vs.length >= 2) {
                const dx = (vs[1].x || 0) - (vs[0].x || 0);
                const dy = (vs[1].y || 0) - (vs[0].y || 0);
                if (dx !== 0) { angle = Math.atan2(dy, dx); if (Math.abs(angle) > Math.PI / 4) angle = 0; }
            }

            const lineHeight = (maxY - minY) / linesInBlock.length;

            linesInBlock.forEach((lineText: string, idx: number) => {
                words.push({
                    text: lineText.normalize("NFKC").replace(/[※\*＊%,，]/g, ''),
                    centerX: (minX + maxX) / 2,
                    centerY: minY + (lineHeight * idx) + (lineHeight / 2),
                    projectedX: (minX + maxX) / 2,
                    projectedY: minY + (lineHeight * idx) + (lineHeight / 2),
                    h: lineHeight,
                    angle: angle
                });
            });
        });

        // 傾き補正
        let medianAngle = 0;
        if (words.length > 0) {
            const angles = words.map(w => w.angle || 0).sort((a, b) => a - b);
            medianAngle = angles[Math.floor(angles.length / 2)] || 0;
        }

        const sinA = Math.sin(medianAngle); const cosA = Math.cos(medianAngle);
        words.forEach(w => {
            w.projectedY = -w.centerX * sinA + w.centerY * cosA;
            w.projectedX = w.centerX * cosA + w.centerY * sinA;
        });

        words.sort((a, b) => a.projectedY - b.projectedY);

        // 2. 行（チャンク）の復元
        const chunks: { y: number, text: string, cleanText: string, usedAsProduct?: boolean }[] = [];
        let currentChunkWords: typeof words = [];
        let currentChunkY = -1;

        words.forEach(w => {
            if (currentChunkY === -1) {
                currentChunkWords.push(w); currentChunkY = w.projectedY;
            } else {
                const threshold = w.h ? w.h * 0.7 : 15;
                if (Math.abs(w.projectedY - currentChunkY) <= threshold) {
                    currentChunkWords.push(w);
                    currentChunkY = currentChunkWords.reduce((s, cw) => s + cw.projectedY, 0) / currentChunkWords.length;
                } else {
                    currentChunkWords.sort((a, b) => a.projectedX - b.projectedX);
                    const chunkText = currentChunkWords.map(cw => cw.text).join(' ');
                    chunks.push({
                        y: currentChunkY,
                        text: chunkText,
                        cleanText: chunkText.replace(/\s+/g, '').replace(/[¥\\￥]/g, '').toLowerCase()
                    });
                    currentChunkWords = [w]; currentChunkY = w.projectedY;
                }
            }
        });
        if (currentChunkWords.length > 0) {
            currentChunkWords.sort((a, b) => a.projectedX - b.projectedX);
            const chunkText = currentChunkWords.map(cw => cw.text).join(' ');
            chunks.push({ y: currentChunkY, text: chunkText, cleanText: chunkText.replace(/\s+/g, '').replace(/[¥\\￥]/g, '').toLowerCase() });
        }

        // 3. マスタ照合と数値の仕分け（プール）
        const foundProducts: { name: string, category: string, y: number, isMaster: boolean, price: number }[] = [];
        const qtyPool: { val: number, y: number, used: boolean }[] = [];
        const pricePool: { val: number, y: number, used: boolean }[] = [];

        const ignoreWords = ["合計", "お預", "お釣", "レジ担当", "電話", "tel", "住所", "店舗", "小計", "現金", "クレジット", "交通系", "plu", "日計", "レポート", "対象", "釣銭"];

        const sortedProducts = [...products].sort((a, b) => {
            const aLen = Math.max(a.name?.length || 0, a.receipt_name?.length || 0);
            const bLen = Math.max(b.name?.length || 0, b.receipt_name?.length || 0);
            return bLen - aLen;
        });

        // 💡 小文字（ィ、ッ等）の大文字化・濁点・ダッシュのブレをすべて救済する最終版の正規化関数
        const normalizeText = (str: string): string => {
            if (!str) return "";

            // ① ひらがなをカタカナに変換
            let katakana = str.replace(/[ぁ-ん]/g, s => String.fromCharCode(s.charCodeAt(0) + 0x60));

            // 💡【新機能】「ウィンナー」と「ウインナー」等のブレをなくすため、小文字をすべて大文字に統一
            katakana = katakana
                .replace(/[ァぁ]/g, 'ア')
                .replace(/[ィぃ]/g, 'イ')
                .replace(/[ゥぅ]/g, 'ウ')
                .replace(/[ェぇ]/g, 'エ')
                .replace(/[ォぉ]/g, 'オ')
                .replace(/[ッっ]/g, 'ツ')
                .replace(/[ャゃ]/g, 'ヤ')
                .replace(/[ュゅ]/g, 'ユ')
                .replace(/[ョょ]/g, 'ヨ');

            // ② 長音・各種ダッシュ記号を安全に「ー」へ統一
            katakana = katakana.replace(/[ー〜一﹣－━—─\-]/g, 'ー');

            // ③ Unicode正規化（NFD分解）を使用して、濁点と半濁点を分離
            const decomposed = katakana.normalize("NFD");

            // ④ 分離した濁点・半濁点を除去
            const clean = decomposed.replace(/[\u3099\u309A]/g, "");

            // ⑤ 再び結合文字（NFC）に戻し、スペースを除去、小文字化
            return clean.normalize("NFC").replace(/\s+/g, '').toLowerCase();
        };

        const isStrictProductMatch = (chunkText: string, prodName: string, receiptName: string) => {
            const normChunk = normalizeText(chunkText);
            const normProd = normalizeText(prodName);
            const normReceipt = normalizeText(receiptName);

            if (!normChunk) return false;

            // 表記ゆれをクリアした状態での完全一致
            if (normChunk === normProd || (normReceipt && normChunk === normReceipt)) {
                return true;
            }

            // 部分一致（3文字以上の単語のみ）
            if (normReceipt && normReceipt.length >= 3 && normChunk.includes(normReceipt)) {
                return true;
            }
            if (normProd && normProd.length >= 3 && normChunk.includes(normProd)) {
                return true;
            }

            return false;
        };

        chunks.forEach((chunk, idx) => {
            if (ignoreWords.some(ignore => chunk.cleanText.includes(ignore))) return;

            let matchedProduct: Product | null = null;
            for (const p of sortedProducts) {
                if (isStrictProductMatch(chunk.cleanText, p.name || "", p.receipt_name || "")) {
                    matchedProduct = p;
                    break;
                }
            }

            if (matchedProduct) {
                if (!foundProducts.some(fp => fp.name === matchedProduct!.name && Math.abs(fp.y - chunk.y) < 25)) {
                    foundProducts.push({
                        name: matchedProduct.name,
                        category: matchedProduct.category || "❓ 未分類",
                        y: chunk.y,
                        isMaster: true,
                        price: Number(matchedProduct.price) || 0
                    });
                    chunk.usedAsProduct = true;
                }
            } else {
                // 未マッチ候補の抽出
                const stripped = chunk.cleanText.replace(/個数|金額|外税|内税|消費税|[0-9点個件¥\\￥,]/g, '');
                const isTooShort = stripped.length < 2 && !/^[A-Za-z]+$/.test(stripped);

                if (!isTooShort) {
                    const nameForDisplay = chunk.text.replace(/個数|金額|外税|内税|消費税|[0-9点個件¥\\￥,]/g, '').trim();
                    if (nameForDisplay && !foundProducts.some(fp => fp.name === nameForDisplay && Math.abs(fp.y - chunk.y) < 25)) {
                        foundProducts.push({
                            name: nameForDisplay,
                            category: "❓ 未分類",
                            y: chunk.y,
                            isMaster: false,
                            price: 0
                        });
                        chunk.usedAsProduct = true;
                    }
                }
            }

            // 個数の仕分け
            const qtyMatches = [...chunk.text.matchAll(/(\d+)\s*[点個件教]/g)];
            qtyMatches.forEach(m => {
                const q = parseInt(m[1], 10);
                if (q > 0 && q <= 500) qtyPool.push({ val: q, y: chunk.y, used: false });
            });

            // 金額の仕分け
            const priceMatches = [...chunk.text.matchAll(/[¥\\￥]\s*(\d[0-9,]*)/g)];
            if (priceMatches.length > 0) {
                priceMatches.forEach(m => pricePool.push({ val: parseInt(m[1].replace(/,/g, ''), 10), y: chunk.y, used: false }));
            } else {
                const amtMatches = [...chunk.text.matchAll(/金額\s*(\d[0-9,]*)(?!\s*[点個件])/g)];
                amtMatches.forEach(m => pricePool.push({ val: parseInt(m[1].replace(/,/g, ''), 10), y: chunk.y, used: false }));
            }
        });

        // 4. 最寄りY座標マッチング
        const parsedItems: ReceiptItem[] = [];

        foundProducts.sort((a, b) => a.y - b.y);
        qtyPool.sort((a, b) => a.y - b.y);
        pricePool.sort((a, b) => a.y - b.y);

        foundProducts.forEach((fp) => {
            let bestQty = 1;
            let bestQtyDist = Infinity;
            let bestQtyObj: any = null;

            for (const q of qtyPool) {
                if (!q.used) {
                    if (q.y < fp.y - 5) continue;

                    const dist = Math.abs(q.y - fp.y);
                    if (dist < bestQtyDist) {
                        bestQtyDist = dist;
                        bestQtyObj = q;
                    }
                }
            }

            if (bestQtyObj && bestQtyDist <= 35) {
                bestQty = bestQtyObj.val;
                bestQtyObj.used = true;
            }

            let bestPriceSubtotal = 0;
            let bestPriceDist = Infinity;
            let bestPriceObj: any = null;

            for (const pr of pricePool) {
                if (!pr.used) {
                    if (pr.y < fp.y - 5) continue;

                    const dist = Math.abs(pr.y - (fp.y + 10));
                    if (dist < bestPriceDist) {
                        bestPriceDist = dist;
                        bestPriceObj = pr;
                    }
                }
            }

            if (bestPriceObj && bestPriceDist <= 45) {
                bestPriceSubtotal = bestPriceObj.val;
                bestPriceObj.used = true;
            }

            // 個数逆算・自動修復ロジック
            let price = fp.price;
            let qty = bestQty;

            if (bestPriceSubtotal > 0) {
                if (fp.price > 0) {
                    const logicalQty = Math.round(bestPriceSubtotal / fp.price);
                    const diff = Math.abs((logicalQty * fp.price) - bestPriceSubtotal);
                    if (diff < 10 && logicalQty > 0 && logicalQty !== bestQty) {
                        qty = logicalQty;
                        price = fp.price;
                    } else {
                        price = Math.round(bestPriceSubtotal / bestQty);
                    }
                } else {
                    price = Math.round(bestPriceSubtotal / bestQty);
                }
            }

            parsedItems.push({
                name: fp.name,
                price: price,
                qty: qty,
                category_id: fp.category,
                is_filtered: !fp.isMaster
            });
        });

        // 5. 💡 未登録商品の救済（マスタ外の leftovers）
        chunks.forEach(chunk => {
            if (!chunk.usedAsProduct) {
                const isSystemWord = ignoreWords.some(w => chunk.cleanText.includes(w)) || /^[0-9\s：:/\-]*$/.test(chunk.text);
                if (!isSystemWord && chunk.text.trim().length > 1) {
                    // マスタ登録が本当になくても、ここで強制的に「除外項目」としてリストに出力します
                    parsedItems.push({
                        name: chunk.text,
                        category_id: "❓ 未分類",
                        price: 0,
                        qty: 1,
                        is_filtered: true // 👈 画面上で「マスタ除外項目も表示する」にチェックを入れると表示されます
                    });
                }
            }
        });

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
            if (!data?.blocks || data.blocks.length === 0) throw new Error("テキストが読み取れませんでした。画像が鮮明か確認してください。");

            console.log("【デバッグ】OCRの生データ受信:", data.text);

            const newItems = parseReceiptTextWithCoords(data.blocks);

            if (newItems.length === 0) {
                alert("商品名、または金額/個数が読み取れませんでした。");
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

    const handleDeleteItem = (index: number) => {
        const updated = [...items];
        updated.splice(index, 1);
        setItems(updated);
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
                    <button onClick={() => { if (isCameraActive) stopCamera(); setShowQR(false); fileInputRefNormal.current?.click(); }} className="w-full py-4 bg-white border-2 border-bakery-border rounded-xl font-bold text-[#8B6340] hover:bg-bakery-surface transition-colors shadow-sm flex items-center justify-center gap-2">
                        📁 1. PCからファイルを選択
                    </button>
                    <button onClick={() => { if (isCameraActive) stopCamera(); setShowQR(!showQR); }} className={`w-full py-4 rounded-xl font-bold transition-colors shadow-md flex items-center justify-center gap-2 ${showQR ? 'bg-[#8B5E3C] text-white' : 'bg-bakery-primary text-bakery-gold hover:bg-[#8B5E3C]'}`}>
                        📱 2. スマホで撮影して転送
                    </button>
                    <button onClick={isCameraActive ? stopCamera : startCamera} className={`w-full py-3 rounded-xl font-bold transition-colors border-2 flex items-center justify-center gap-2 ${isCameraActive ? 'bg-red-50 border-red-200 text-red-500' : 'bg-white border-bakery-primary text-bakery-primary hover:bg-bakery-bg'}`}>
                        {isCameraActive ? '⏹️ PCカメラを停止' : '📷 3. PCの内蔵カメラを起動'}
                    </button>
                    <input type="file" accept="image/*" ref={fileInputRefNormal} onChange={handleFileChange} className="hidden" />
                </div>

                {showQR && (
                    <div className="bg-[#FFF8E7] p-6 rounded-xl border-2 border-dashed border-bakery-primary mb-6 text-center animate-fade-in-up">
                        <p className="text-bakery-textMain font-bold mb-4">スマホのカメラでスキャンしてください</p>
                        <div className="inline-flex justify-center bg-white p-4 rounded-lg shadow-sm"><QRCodeSVG value={currentUrl ? `${currentUrl}#/mobile` : ''} size={150} /></div>
                        <p className="text-xs text-[#8B6340] mt-4">撮影すると自動的にPCに画像が届きます</p>
                    </div>
                )}

                <div className="bg-white p-4 rounded-xl border border-bakery-border shadow-sm mb-6 text-center min-h-75 flex flex-col justify-center relative overflow-hidden">
                    <video ref={videoRef} className={`w-full max-h-100 object-cover rounded bg-black ${isCameraActive ? 'block' : 'hidden'}`} playsInline />
                    <canvas ref={canvasRef} className="hidden" />
                    {isCameraActive && <button onClick={capturePhoto} className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white border-4 border-bakery-primary rounded-full w-14 h-14 shadow-lg flex justify-center items-center"><div className="bg-bakery-primary w-10 h-10 rounded-full"></div></button>}
                    {!isCameraActive && previewUrl ? <img src={previewUrl} alt="Preview" className="max-h-100 object-contain mx-auto rounded" /> : !isCameraActive && !showQR && <div className="py-10 text-[#C4A882]"><p className="text-4xl mb-2">📄</p><p className="text-sm">画像をセットしてください</p></div>}
                </div>
                <button onClick={handleAnalyze} disabled={loading || !imageBase64 || isCameraActive} className="w-full py-4 rounded-lg font-bold text-lg bg-[#10B981] text-white hover:bg-green-600 disabled:bg-gray-300 shadow-md transition-transform active:scale-95">
                    {loading ? '⏳ AI解析中...' : '⚡ 解析を実行する'}
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
                            <label className="text-xs text-[#8B6340] cursor-pointer flex items-center gap-1"><input type="checkbox" checked={showFilteredItems} onChange={(e) => setShowFilteredItems(e.target.checked)} />マスタ除外項目（レジ袋等）も表示する</label>
                            <p className="font-bold text-bakery-primary text-xl">合計: ￥{calculateTotal().toLocaleString()}</p>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-bakery-border overflow-x-auto mb-6">
                            <table className="w-full text-left text-sm border-collapse min-w-max">
                                <thead className="bg-bakery-bg text-bakery-primary"><tr><th className="p-3 border-b border-bakery-border">商品名</th><th className="p-3 border-b border-bakery-border w-24">単価</th><th className="p-3 border-b border-bakery-border w-16">数量</th><th className="p-3 border-b border-bakery-border w-32">カテゴリ</th><th className="p-3 border-b border-bakery-border w-24 text-center">状態</th><th className="p-3 border-b border-bakery-border w-16 text-center">操作</th></tr></thead>
                                <tbody>
                                    {items.map((item, idx) => {
                                        if (item.is_filtered && !showFilteredItems) return null;
                                        return (
                                            <tr key={idx} className={`border-b border-gray-100 ${item.is_filtered ? 'bg-red-50' : 'hover:bg-[#FAFAFA]'}`}>
                                                <td className="p-2"><input type="text" value={item.name} onChange={(e) => handleItemChange(idx, 'name', e.target.value)} className={`w-full p-2 border border-transparent hover:border-gray-300 rounded focus:border-bakery-gold outline-none font-bold ${item.is_filtered ? 'text-gray-400' : 'text-bakery-textMain'} bg-transparent`} /></td>
                                                <td className="p-2"><input type="number" value={item.price} onChange={(e) => handleItemChange(idx, 'price', Number(e.target.value))} className={`w-full p-2 border border-transparent hover:border-gray-300 rounded focus:border-bakery-gold outline-none text-right bg-transparent ${item.is_filtered ? 'text-gray-400' : ''}`} /></td>
                                                <td className="p-2"><input type="number" value={item.qty} onChange={(e) => handleItemChange(idx, 'qty', Number(e.target.value))} className={`w-full p-2 border border-transparent hover:border-gray-300 rounded focus:border-bakery-gold outline-none text-center bg-transparent ${item.is_filtered ? 'text-gray-400' : ''}`} /></td>
                                                <td className="p-2"><select value={item.category_id} onChange={(e) => handleItemChange(idx, 'category_id', e.target.value)} className="w-full p-2 border border-transparent hover:border-gray-300 rounded bg-transparent focus:border-bakery-gold outline-none text-xs">{uniqueCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}</select></td>
                                                <td className="p-2 text-center">{item.is_filtered ? <button onClick={() => handleItemChange(idx, 'is_filtered', false)} className="bg-red-500 text-white px-2 py-1 rounded text-xs shadow-sm w-full">除外中</button> : <button onClick={() => handleItemChange(idx, 'is_filtered', true)} className="text-green-600 font-bold text-xs hover:bg-green-50 px-2 py-1 rounded transition-colors w-full border border-transparent hover:border-green-200">✓ 対象</button>}</td>
                                                <td className="p-2 text-center"><button onClick={() => handleDeleteItem(idx)} className="text-gray-400 hover:text-red-500 text-xs px-2 py-1 transition-colors rounded hover:bg-red-50" title="この行を削除">🗑️</button></td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                            <button onClick={handleSaveToDB} disabled={isSaving || savedSessionId !== null} className={`py-4 rounded-xl font-bold shadow-md transition-colors ${savedSessionId !== null ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-bakery-gold text-white hover:bg-[#C4A882]'}`}>{savedSessionId !== null ? '✅ 保存済み' : '💾 修正を確認して売上登録'}</button>
                            <div className="bg-bakery-surface p-4 rounded-xl border border-bakery-border shadow-inner flex flex-col justify-center">
                                <select value={selectedCustomerId} onChange={e => setSelectedCustomerId(e.target.value)} className="w-full p-2 border border-bakery-border rounded bg-white mb-2 text-sm font-bold text-[#8B6340] outline-none"><option value="">-- 顧客に紐付ける --</option>{customers.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select>
                                <button onClick={handleLinkCustomer} disabled={!selectedCustomerId || isSaving || !savedSessionId} className="w-full py-2 bg-bakery-primary text-white rounded font-bold text-sm disabled:opacity-50 hover:bg-[#8B5E3C]">⭐ お客様の購買履歴として記録</button>
                            </div>
                        </div>

                        <div className="text-right flex flex-col justify-center">
                            <button onClick={() => { if (window.confirm("クリアしますか？")) { setItems([]); setSavedSessionId(null); setImageBase64(null); setPreviewUrl(null); } }} className="text-sm text-bakery-danger border border-bakery-danger/30 bg-red-50 px-4 py-3 rounded-lg font-bold shadow-sm hover:bg-red-100 transition-colors w-full h-full">🗑️ リストをクリアしてやり直す</button>
                        </div>
                    </div>
                )}
            </div>

            {showQrModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4">
                    <div className="bg-white p-8 rounded-2xl text-center max-w-sm w-full shadow-2xl animate-fade-in-up">
                        <h4 className="text-xl font-bold mb-2 text-bakery-textMain">📱 スマホで撮影</h4>
                        <p className="text-sm text-gray-500 mb-6">カメラでQRを読み取り、<br />直接撮影して転送してください</p>
                        <div className="inline-block p-4 border-2 border-bakery-border rounded-xl bg-bakery-surface mb-6"><QRCodeSVG value={currentUrl ? `${currentUrl}#/mobile` : ''} size={200} /></div>
                        <button onClick={() => setShowQrModal(false)} className="w-full py-3 bg-gray-200 text-gray-800 font-bold rounded-xl hover:bg-gray-300">閉じる</button>
                    </div>
                </div>
            )}
        </div>
    );
}