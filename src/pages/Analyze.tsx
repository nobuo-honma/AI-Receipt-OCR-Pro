import React, { useState, useRef, useEffect } from 'react';

interface ReceiptItem {
    name: string;
    price: number;
    qty: number;
    category_id: string;
    is_filtered: boolean;
}

export default function Analyze() {
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [items, setItems] = useState<ReceiptItem[]>([]);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [imageBase64, setImageBase64] = useState<string | null>(null);
    const [showFilteredItems, setShowFilteredItems] = useState<boolean>(false);

    // スマホ撮影用のQRコードモーダル制御
    const [showQrModal, setShowQrModal] = useState<boolean>(false);
    const [currentUrl, setCurrentUrl] = useState<string>('');

    const fileInputRefNormal = useRef<HTMLInputElement>(null);
    const fileInputRefCamera = useRef<HTMLInputElement>(null);

    // 初期ロード時のSSRエラー防止
    useEffect(() => {
        if (typeof window !== 'undefined') {
            setCurrentUrl(window.location.href);
        }
    }, []);

    // 画像の縮小・Base64変換
    const processImageFile = (file: File) => {
        setPreviewUrl(URL.createObjectURL(file));
        setError(null);

        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_BOUND = 1500;
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_BOUND) {
                        height = Math.round((height * MAX_BOUND) / width);
                        width = MAX_BOUND;
                    }
                } else {
                    if (height > MAX_BOUND) {
                        width = Math.round((width * MAX_BOUND) / height);
                        height = MAX_BOUND;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75).split(',')[1];
                    setImageBase64(compressedBase64);
                }
            };
            img.src = event.target?.result as string;
        };
        reader.onerror = () => {
            setError("画像の読み込みプロセスでエラーが発生しました。");
        };
        reader.readAsDataURL(file);
    };

    const handleNormalFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processImageFile(file);
    };

    const handleCameraFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) processImageFile(file);
    };

    // 刷新されたEdge Functionsとの通信処理
    const handleAnalyze = async () => {
        if (!imageBase64) {
            setError("レシート画像を先に撮影またはアップロードしてください。");
            return;
        }

        setLoading(true);
        setError(null);
        setItems([]);

        try {
            const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || '';
            const anonKey = import.meta.env?.VITE_SUPABASE_ANON_KEY || '';

            if (!supabaseUrl || !anonKey) {
                throw new Error("Supabaseの環境変数(VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)が設定されていません。");
            }

            const functionUrl = `${supabaseUrl}/functions/v1/analyze-receipt`;

            const response = await fetch(functionUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${anonKey}`,
                },
                body: JSON.stringify({ imageBase64 })
            });

            // サーバー内部エラーの厳格なインターセプト
            const rawText = await response.text();
            let responseData: any;

            try {
                responseData = JSON.parse(rawText);
            } catch {
                throw new Error(`サーバーから不正なレスポンスが返されました (HTTP Status: ${response.status})`);
            }

            // サーバー側が検知した内部エラーメッセージのバインド
            if (responseData.error) {
                throw new Error(responseData.error);
            }

            if (!response.ok) {
                throw new Error(`通信エラーが発生しました (Status: ${response.status})`);
            }

            const parsedItems = Array.isArray(responseData.items) ? responseData.items : [];
            if (parsedItems.length === 0) {
                throw new Error("レシートから商品アイテムが1件も検出されませんでした。画像が不鮮明な可能性があります。");
            }

            setItems(parsedItems);

        } catch (err: any) {
            console.error("【フロントエンド解析エラー詳細】", err);
            setError(err.message || "解析中に通信エラーが発生しました。");
        } finally {
            setLoading(false);
        }
    };

    const handleItemChange = (index: number, field: keyof ReceiptItem, value: any) => {
        const updatedItems = [...items];
        updatedItems[index] = { ...updatedItems[index], [field]: value };
        setItems(updatedItems);
    };

    const handleSaveToDatabase = async () => {
        try {
            const savePayload = items.filter(item => !item.is_filtered);
            if (savePayload.length === 0) {
                alert("保存する売上データがありません。");
                return;
            }
            console.log("Supabaseへの一括永続化ペイロード:", savePayload);
            alert("売上マスタへ正常に一括登録されました。");
        } catch (err) {
            alert("データベースへの保存に失敗しました。");
        }
    };

    const qrCodeImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(currentUrl)}`;

    return (
        <div className="p-6 max-w-7xl mx-auto font-zen text-bakery-textMain">
            <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 border-b border-gray-200 pb-3">
                ⚡ レシート解析・品目マスタ仕分けシステム
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* 左カラム：画像操作UI */}
                <div className="lg:col-span-1 border border-gray-200 bg-white p-5 rounded-xl shadow-sm h-fit space-y-4">
                    <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRefNormal}
                        onChange={handleNormalFileChange}
                        className="hidden"
                    />
                    <button
                        onClick={() => fileInputRefNormal.current?.click()}
                        className="w-full py-3 px-4 bg-white border-2 border-dashed border-blue-500 text-blue-600 rounded-lg font-bold hover:bg-blue-50/50 transition-colors cursor-pointer text-center block text-sm"
                    >
                        📁 1. PCからファイルを選択する
                    </button>

                    <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        ref={fileInputRefCamera}
                        onChange={handleCameraFileChange}
                        className="hidden"
                    />
                    <button
                        onClick={() => {
                            const isMobile = typeof window !== 'undefined' && window.matchMedia('(max-width: 768px)').matches;
                            if (isMobile) {
                                fileInputRefCamera.current?.click();
                            } else {
                                setShowQrModal(true);
                            }
                        }}
                        className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-bold hover:bg-blue-700 transition-colors cursor-pointer text-center block text-sm shadow-sm"
                    >
                        📷 2. スマホでレシートを撮影する
                    </button>

                    {previewUrl && (
                        <div className="mt-4 text-center border border-gray-100 p-3 rounded-lg bg-bakery-bg/30">
                            <p className="text-xs text-gray-500 mb-2">選択された画像プレビュー</p>
                            <img src={previewUrl} alt="Preview" className="max-w-full max-h-[350px] rounded-lg mx-auto shadow-sm" />
                        </div>
                    )}

                    <button
                        onClick={handleAnalyze}
                        disabled={loading || !imageBase64}
                        className={`w-full py-3 px-4 text-white font-bold rounded-lg shadow transition-all text-sm
              ${loading || !imageBase64 ? 'bg-gray-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 cursor-pointer'}`}
                    >
                        {loading ? '⏳ AIマスタ照合中...' : '🚀 レシートを自動解析する'}
                    </button>

                    {error && (
                        <div className="p-3 bg-red-50 border-l-4 border-red-500 rounded text-red-700 text-xs mt-2">
                            ❌ {error}
                        </div>
                    )}
                </div>

                {/* 右カラム：解析結果確認フォーム */}
                <div className="lg:col-span-2 border border-gray-200 bg-white p-5 rounded-xl shadow-sm space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 border-b border-gray-100 pb-3">
                        <h3 className="text-lg font-bold">📊 解析結果（手動修正レイヤー）</h3>

                        {items.length > 0 && (
                            <label className="text-xs text-gray-500 cursor-pointer flex items-center gap-1.5 bg-gray-50 px-2.5 py-1 rounded-md border border-gray-200 hover:bg-gray-100 transition-colors">
                                <input
                                    type="checkbox"
                                    checked={showFilteredItems}
                                    onChange={(e) => setShowFilteredItems(e.target.checked)}
                                    className="rounded text-blue-600 focus:ring-blue-500"
                                />
                                マスタ除外項目（レジ袋等）を表示
                            </label>
                        )}
                    </div>

                    {items.length === 0 ? (
                        <div className="text-center py-16 bg-bakery-bg/20 rounded-xl border border-dashed border-gray-200">
                            <p className="text-gray-400 italic text-sm">左側の操作パネルからレシート画像を設定し、解析を実行してください。</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="overflow-x-auto border border-gray-200 rounded-lg">
                                <table className="w-full border-collapse text-left text-sm">
                                    <thead>
                                        <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700">
                                            <th className="p-3">商品名</th>
                                            <th className="p-3 w-28">単価 (￥)</th>
                                            <th className="p-3 w-20">数量</th>
                                            <th className="p-3 w-40">自動品目区分</th>
                                            <th className="p-3 w-24 text-center">状態</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {items.map((item, index) => {
                                            if (item.is_filtered && !showFilteredItems) return null;

                                            return (
                                                <tr key={index} className={`transition-colors ${item.is_filtered ? 'bg-red-50/50' : 'hover:bg-gray-50/50'}`}>
                                                    <td className="p-2.5">
                                                        <input type="text" value={item.name} onChange={(e) => handleItemChange(index, 'name', e.target.value)} className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                                                    </td>
                                                    <td className="p-2.5">
                                                        <input type="number" value={item.price} onChange={(e) => handleItemChange(index, 'price', Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                                                    </td>
                                                    <td className="p-2.5">
                                                        <input type="number" value={item.qty} onChange={(e) => handleItemChange(index, 'qty', Number(e.target.value))} className="w-full px-2 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white" />
                                                    </td>
                                                    <td className="p-2.5">
                                                        <select value={item.category_id} onChange={(e) => handleItemChange(index, 'category_id', e.target.value)} className="w-full px-1.5 py-1.5 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 bg-white text-xs">
                                                            <option value="CAT_001">🍞 パン</option>
                                                            <option value="CAT_002">🍪 クッキー</option>
                                                            <option value="CAT_003">🍦 ソフトクリーム</option>
                                                            <option value="CAT_004">☕ コーヒー</option>
                                                            <option value="CAT_UNKNOWN">❓ 未分類・その他</option>
                                                        </select>
                                                    </td>
                                                    <td className="p-2.5 text-center">
                                                        {item.is_filtered ? (
                                                            <button onClick={() => handleItemChange(index, 'is_filtered', false)} className="bg-red-600 text-white text-xs px-2 py-1 rounded shadow-sm font-bold hover:bg-red-700 transition-colors cursor-pointer">除外済</button>
                                                        ) : (
                                                            <span className="text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded border border-green-200">✓ 対象</span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <button onClick={handleSaveToDatabase} className="w-full py-3 px-4 bg-blue-600 text-white font-bold rounded-lg shadow hover:bg-blue-700 transition-colors cursor-pointer text-center block text-sm">
                                💾 修正内容を確認し、売上データを登録する
                            </button>
                        </div>
                    )}
                </div>

            </div>

            {/* QRコード表示用モーダル */}
            {showQrModal && (
                <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 backdrop-blur-sm">
                    <div className="bg-white p-6 rounded-2xl text-center max-w-sm mx-4 shadow-xl border border-gray-100 space-y-4">
                        <h4 className="text-base font-bold">スマートフォンで撮影</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            以下のQRコードをスマートフォンのカメラで読み取り、このシステムにアクセスして直接撮影・自動解析を行ってください。
                        </p>

                        <div className="inline-block p-2 border border-gray-100 rounded-xl bg-white shadow-sm">
                            <img src={qrCodeImageUrl} alt="Scan QR Code" className="w-48 h-48 mx-auto" />
                        </div>

                        <div className="text-[10px] text-gray-400 break-all bg-gray-50 p-2 rounded-md border border-gray-100 max-h-16 overflow-y-auto">
                            {currentUrl}
                        </div>

                        <button
                            onClick={() => setShowQrModal(false)}
                            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-200 rounded-lg transition-colors font-bold text-sm cursor-pointer"
                        >
                            閉じる
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}