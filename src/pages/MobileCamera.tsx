// src/pages/MobileCamera.tsx
import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function MobileCamera() {
    const [isCameraActive, setIsCameraActive] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // 💡 修正ポイント：映像データを「再読み込みの引き金にならない安全な場所（useRef）」に保存する
    const streamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // 1. カメラの許可を取り、ストリームを保存して画面を切り替える
    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream; // 安全な場所に映像を保存
            setIsCameraActive(true);    // カメラ画面を表示！
        } catch (err: any) {
            console.error(err);
            if (err.name === 'NotAllowedError') {
                alert("カメラの許可が拒否されました。スマホの設定から許可してください。");
            } else {
                alert("カメラの起動に失敗しました。");
            }
        }
    };

    // 2. 画面が切り替わったら、安全な場所から映像を取り出して流し込む
    useEffect(() => {
        if (isCameraActive && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;

            // iOS等で確実に再生させるための魔法の属性
            videoRef.current.setAttribute('playsinline', 'true');
            videoRef.current.setAttribute('autoplay', 'true');
            videoRef.current.setAttribute('muted', 'true');

            videoRef.current.play().catch(e => console.error("再生エラー:", e));
        }
    }, [isCameraActive]); // 👈 監視対象をシンプルにしたのでループが起きません

    // 3. カメラの停止処理
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
        setIsCameraActive(false);
    };

    // 画面を完全に閉じる時だけカメラをオフにする
    useEffect(() => {
        return () => {
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
            }
        };
    }, []);

    // 4. 撮影と送信
    const captureAndSend = () => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob(async (blob) => {
            if (!blob) return;
            setIsSending(true);

            stopCamera(); // 撮影完了と同時にカメラを止める

            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64String = (reader.result as string).split(',')[1];

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
                <div className="text-center animate-fade-in-up">
                    <p className="text-bakery-textMain mb-6">
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
                <div className="relative w-full max-w-sm animate-fade-in-up">
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
                            className="bg-white/90 text-bakery-textMain px-4 py-3 rounded-full font-bold shadow-md active:bg-gray-200"
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