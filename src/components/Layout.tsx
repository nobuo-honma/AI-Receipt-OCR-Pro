// src/components/Layout.tsx
import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children }: { children: React.ReactNode }) {
    const location = useLocation();
    const isHome = location.pathname === '/';

    return (
        <div className="min-h-screen pb-10">
            {/* ホーム画面以外の時に、共通のヘッダーを表示する */}
            {!isHome && (
                <div className="bg-bakery-primary text-white p-4 shadow-md sticky top-0 z-50 flex items-center">
                    <Link
                        to="/"
                        className="flex items-center gap-2 hover:text-bakery-gold transition-colors font-bold tracking-wider"
                    >
                        <span>← ホームに戻る</span>
                    </Link>
                    <div className="mx-auto font-playfair italic text-bakery-gold pr-24">
                        AI Receipt OCR Pro
                    </div>
                </div>
            )}

            {/* ここに各ページの中身が入る */}
            <main>
                {children}
            </main>
        </div>
    );
}