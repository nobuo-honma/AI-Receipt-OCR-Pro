import { Link } from 'react-router-dom';

export default function Home() {
    return (
        <div className="min-h-screen pb-10">
            {/* ヒーローセクション（写真背景 ＋ 焦げ茶色の半透明オーバーレイ） */}
            <div className="relative text-center px-10 pt-16 pb-14 shadow-lg overflow-hidden rounded-b-2xl mb-6">
                <div className="absolute inset-0 bg-cover bg-center z-0" style={{ backgroundImage: "url('/bakery-hero.jpg')" }}></div>
                <div className="absolute inset-0 bg-[#3D2B1F]/75 z-0 backdrop-blur-[2px]"></div>
                <div className="relative z-10 animate-fade-in-up">
                    <p className="font-playfair italic text-[#D4A96A] tracking-[0.15em] text-lg mb-2">Welcome to</p>
                    <h1 className="font-zen font-black text-[#FDF6E3] text-4xl md:text-5xl tracking-widest mb-4 drop-shadow-md">🥐 AI Bakery Manager</h1>
                    <p className="font-zen text-[#E0C898] tracking-[0.15em] text-xs md:text-sm font-bold">レシートOCR ・ 予約注文 ・ 売上集計 ・ 業務チャット</p>
                </div>
            </div>

            <div className="flex items-center justify-center gap-3 my-10 px-4">
                <div className="h-px w-24 bg-gradient-to-r from-transparent to-[#C4A882]"></div>
                <p className="font-playfair italic text-[#9B7B52] tracking-[0.14em] text-sm">— Main Menu —</p>
                <div className="h-px w-24 bg-gradient-to-l from-transparent to-[#C4A882]"></div>
            </div>

            <div className="max-w-4xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                <Link to="/analyze" className="md:col-span-2 group">
                    <div className="relative flex flex-col h-full min-h-[180px] p-7 bg-card-wide border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_10px_28px_rgba(61,43,31,0.15)] group-hover:bg-card-wide-hover group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-2xl text-bakery-textMain">Receipt</span>
                        <span className="font-zen font-bold tracking-widest text-bakery-textMain mt-1">レシート解析</span>
                        <span className="font-zen text-xs text-[#7B5C3A] leading-relaxed mt-3">カメラまたはファイルでスキャン。<br />商品名・金額を自動で読み取ります。</span>
                        <span className="absolute bottom-3 right-3 bg-bakery-textMain text-bakery-gold font-zen font-bold text-[10px] px-3 py-1 rounded">OPEN ▶</span>
                    </div>
                </Link>
                <Link to="/customers" className="group">
                    <div className="relative flex flex-col items-center justify-center h-full min-h-[180px] p-6 bg-bakery-surface border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:bg-[#FFF8E7] group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-2xl text-bakery-textMain">Customers</span>
                        <span className="font-zen font-bold tracking-widest mt-1">顧客・予約管理</span><span className="text-4xl mt-3">👥</span>
                        <span className="absolute bottom-3 right-3 bg-bakery-textMain text-bakery-gold font-zen font-bold text-[10px] px-3 py-1 rounded">OPEN ▶</span>
                    </div>
                </Link>
                <Link to="/dashboard" className="group">
                    <div className="relative flex flex-col items-center justify-center h-full min-h-[180px] p-6 bg-bakery-surface border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:bg-[#FFF8E7] group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-2xl text-bakery-textMain">Dashboard</span>
                        <span className="font-zen font-bold tracking-widest mt-1">売上集計</span><span className="text-4xl mt-3">📈</span>
                        <span className="absolute bottom-3 right-3 bg-bakery-textMain text-bakery-gold font-zen font-bold text-[10px] px-3 py-1 rounded">OPEN ▶</span>
                    </div>
                </Link>
                <Link to="/master" className="group">
                    <div className="relative flex flex-col items-center justify-center h-full min-h-[180px] p-6 bg-bakery-surface border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:bg-[#FFF8E7] group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-2xl text-bakery-textMain">Menu</span>
                        <span className="font-zen font-bold tracking-widest mt-1">マスタ管理</span><span className="text-4xl mt-3">📖</span>
                        <span className="absolute bottom-3 right-3 bg-bakery-textMain text-bakery-gold font-zen font-bold text-[10px] px-3 py-1 rounded">OPEN ▶</span>
                    </div>
                </Link>
                <Link to="/contact" className="group">
                    <div className="relative flex flex-col items-center justify-center h-full min-h-[180px] p-6 bg-bakery-surface border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:bg-[#FFF8E7] group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-2xl text-bakery-textMain">Chat</span>
                        <span className="font-zen font-bold tracking-widest mt-1">業務連絡チャット</span><span className="text-4xl mt-3">💬</span>
                        <span className="absolute bottom-3 right-3 bg-bakery-textMain text-bakery-gold font-zen font-bold text-[10px] px-3 py-1 rounded">OPEN ▶</span>
                    </div>
                </Link>
                <Link to="/manual" className="group">
                    <div className="relative flex flex-col items-center justify-center h-full min-h-[180px] p-6 bg-bakery-surface border border-bakery-border rounded-lg shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg group-hover:bg-[#FFF8E7] group-hover:border-[#8B5E3C]">
                        <span className="font-playfair italic text-2xl text-bakery-textMain">Manual</span>
                        <span className="font-zen font-bold tracking-widest mt-1">操作説明書</span><span className="text-4xl mt-3">ℹ️</span>
                        <span className="absolute bottom-3 right-3 bg-bakery-textMain text-bakery-gold font-zen font-bold text-[10px] px-3 py-1 rounded">OPEN ▶</span>
                    </div>
                </Link>
            </div>
        </div>
    );
}