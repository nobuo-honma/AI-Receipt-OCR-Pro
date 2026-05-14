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
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
                setIsCameraActive(true);
            }
        } catch (err) {
            alert("カメラの起動に失敗しました。");
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
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // 画像をBase64に変換してPCに送信する
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            setIsSending(true);
            stopCamera(); // 撮影したらカメラを止める

            const reader = new FileReader();
            reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64String = (reader.result as string).split(',')[1];

                // Supabaseに画像を送信（PC側がこれを監視している）
                const { error } = await supabase.from('transfer_images').insert({ image_base64: base64String });

                setIsSending(false);
                if (error) {
                    alert("送信に失敗しました。");
                } else {
                    alert("PCに送信しました！PCの画面を確認してください。");
                }
            };
        }, 'image/jpeg', 0.8);
    };

    return (
        <div className="min-h-screen bg-bakery-bg flex flex-col items-center justify-center p-4">
            <h1 className="text-2xl font-bold text-bakery-textMain mb-6">📱 レシート送信カメラ</h1>

            {!isCameraActive ? (
                <button onClick={startCamera} className="bg-bakery-primary text-white py-4 px-10 rounded-full font-bold text-lg shadow-lg hover:scale-105 transition-transform">
                    📷 カメラを起動する
                </button>
            ) : (
                <div className="relative w-full max-w-sm">
                    <video ref={videoRef} className="w-full rounded-xl bg-black shadow-2xl" playsInline />
                    <canvas ref={canvasRef} className="hidden" />

                    <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-4">
                        <button onClick={stopCamera} className="bg-white/80 text-black px-4 py-3 rounded-full font-bold shadow">
                            キャンセル
                        </button>
                        <button onClick={captureAndSend} disabled={isSending} className="bg-bakery-danger text-white px-8 py-3 rounded-full font-bold shadow-lg flex items-center gap-2">
                            {isSending ? "送信中..." : "📸 撮影してPCに送る"}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}