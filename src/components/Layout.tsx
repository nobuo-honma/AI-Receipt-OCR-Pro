import { Link, useLocation } from 'react-router-dom';
export default function Layout({ children }: { children: React.ReactNode }) {
    const isHome = useLocation().pathname === '/';
    return (
        <div className="min-h-screen pb-10">
            {!isHome && (
                <div className="bg-bakery-primary text-white p-4 shadow-md sticky top-0 z-50 flex items-center">
                    <Link to="/" className="flex items-center hover:text-bakery-gold font-bold">← ホームに戻る</Link>
                    <div className="mx-auto font-playfair italic text-bakery-gold pr-24">AI Receipt OCR Pro</div>
                </div>
            )}
            <main>{children}</main>
        </div>
    );
}