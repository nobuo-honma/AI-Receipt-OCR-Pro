// src/pages/MobileCamera.tsx
import { useState, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export default function MobileCamera() {
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });

            if (videoRef.current) {
                videoRef.current.srcObject = stream;

                // 映像のメタデータが読み込まれるのを待ってから再生
                videoRef.current.onloadedmetadata = async () => {
                    try {
                        await videoRef.current?.play();
                        setIsCameraActive(true);
                    } catch (playErr) {
                        console.error("再生エラー:", playErr);
                    }
                };
            }
        } catch (err) {
            alert("カメラへのアクセスを許可してください。");
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

    const captureAndSend = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        // ビデオの実際の解像度をキャンバスに反映
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // 現在のフレームを描画
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // JPEG圧縮（画質0.8）でBlob化
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            setIsSending(true);

            // 撮影直後にカメラを止めてリソースを解放
            stopCamera();

            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64String = (reader.result as string).split(',')[1];

                // Supabase の transfer_images テーブルへ保存
                const { error } = await supabase
                    .from('transfer_images')
                    .insert({ image_base64: base64String });

                setIsSending(false);
                if (error) {
                    console.error("Supabase Error:", error);
                    alert("送信に失敗しました。ネットワーク状況を確認してください。");
                } else {
                    alert("PCに送信しました！PCの解析画面を確認してください。");
                }
            };
        }, 'image/jpeg', 0.8);
    };

    return (
        <div className="min-h-screen bg-bakery-bg flex flex-col items-center justify-center p-4">
            <h1 className="text-2xl font-bold text-bakery-textMain mb-6">📱 レシート送信カメラ</h1>

            {!isCameraActive ? (
                <div className="text-center">
                    <p className="text-bakery-textSub mb-6">
                        カメラでレシートを撮影して、<br />
                        直接PCへ送信できます。
                    </p>
                    <button
                        onClick={startCamera}
                        className="bg-bakery-primary text-white py-4 px-10 rounded-full font-bold text-lg shadow-lg active:scale-95 transition-transform"
                    >
                        📷 カメラを起動する
                    </button>
                </div>
            ) : (
                <div className="relative w-full max-w-sm">
                    {/* iOS/Androidで自動再生させるために必要な属性を網羅 */}
                    <video
                        ref={videoRef}
                        className="w-full rounded-xl bg-black shadow-2xl"
                        playsInline
                        muted
                        autoPlay
                    />
                    <canvas ref={canvasRef} className="hidden" />

                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                        <button
                            onClick={stopCamera}
                            className="bg-white/90 text-black px-4 py-3 rounded-full font-bold shadow-md active:bg-gray-200"
                        >
                            キャンセル
                        </button>
                        <button
                            onClick={captureAndSend}
                            disabled={isSending}
                            className="bg-bakery-danger text-white px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2 active:scale-95 disabled:bg-gray-400"
                        >
                            {isSending ? "送信中..." : "📸 撮影して送信"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}