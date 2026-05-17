import { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export default function MobileCamera() {
    const [isCameraActive, setIsCameraActive] = useState(false);
    const streamRef = useRef<MediaStream | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const startCamera = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
            streamRef.current = stream; setIsCameraActive(true);
        } catch (err) { alert("カメラ許可が必要です"); }
    };

    useEffect(() => {
        if (isCameraActive && streamRef.current && videoRef.current) {
            videoRef.current.srcObject = streamRef.current;
            videoRef.current.setAttribute('playsinline', 'true'); videoRef.current.setAttribute('autoplay', 'true'); videoRef.current.setAttribute('muted', 'true');
            videoRef.current.play().catch(e => console.log(e));
        }
    }, [isCameraActive]);

    const captureAndSend = () => {
        if (!videoRef.current || !canvasRef.current) return;
        const canvas = canvasRef.current; canvas.width = videoRef.current.videoWidth; canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(async (blob) => {
            if (!blob) return;
            streamRef.current?.getTracks().forEach(t => t.stop()); setIsCameraActive(false);
            const reader = new FileReader(); reader.readAsDataURL(blob);
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                await supabase.from('transfer_images').insert({ image_base64: base64 });
                alert("PCに送信しました！");
            };
        }, 'image/jpeg', 0.8);
    };

    return (
        <div className="min-h-screen bg-bakery-bg flex flex-col items-center justify-center p-4">
            <h1 className="text-2xl font-bold mb-6">📱 レシート送信</h1>
            {!isCameraActive ? <button onClick={startCamera} className="bg-bakery-primary text-white py-4 px-10 rounded-full font-bold">📷 カメラ起動</button>
                : <div className="relative w-full max-w-sm"><video ref={videoRef} className="w-full rounded-xl" playsInline muted autoPlay /><canvas ref={canvasRef} className="hidden" /><button onClick={captureAndSend} className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-red-500 text-white px-8 py-3 rounded-full font-bold shadow-lg">📸 送信</button></div>}
        </div>
    );
}