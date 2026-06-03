// src/pages/Home.tsx
import { Link } from 'react-router-dom';
import { Camera, Users, BarChart3, BookOpen, MessageCircle, Info, ChefHat, Store } from 'lucide-react';
import bakeryHeroImg from '/bakery-hero.jpg';

function MenuCard({ to, enTitle, jpTitle, icon: Icon }: { to: string, enTitle: string, jpTitle: string, icon: any }) {
  return (
    <Link to={to} className="group block">
      <div className="relative flex flex-col items-center justify-center h-full min-h-[160px] p-6 bg-bakery-surface border border-[#E8DCC4] rounded-lg transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_8px_20px_rgba(107,66,38,0.15)] group-hover:bg-[#FFF8E7] group-hover:border-bakery-border">
        <span className="font-playfair italic text-3xl text-bakery-primary mb-1 tracking-wider opacity-90 group-hover:text-[#8B5E3C] transition-colors">{enTitle}</span>
        <span className="font-zen font-bold tracking-[0.2em] text-[#8B6340] text-sm mb-4">{jpTitle}</span>
        <div className="text-bakery-textMain opacity-70 group-hover:scale-110 transition-transform duration-300 group-hover:text-bakery-gold"><Icon size={42} strokeWidth={1.2} /></div>
        <div className="absolute bottom-2 right-3 flex items-center text-bakery-gold font-zen font-bold text-[9px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">OPEN <span className="ml-1 text-[10px]">▶</span></div>
      </div>
    </Link>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen pb-12 flex flex-col bg-bakery-bg">
      <div className="relative w-full text-center px-6 pt-16 pb-14 shadow-lg overflow-hidden bg-cover bg-center" style={{ backgroundImage: `url(${bakeryHeroImg})` }}>
        <div className="absolute inset-0 bg-bakery-textMain/70 backdrop-blur-[2px] z-0"></div>
        <div className="relative z-10 animate-fade-in-up flex flex-col items-center">
          <p className="font-playfair italic text-bakery-gold tracking-[0.15em] text-lg mb-2">Welcome to</p>
          <h1 className="font-zen font-black text-[#FDF6E3] text-4xl md:text-5xl tracking-widest mb-4 drop-shadow-md">🥐 AI Bakery Manager</h1>
          <p className="font-zen text-bakery-border tracking-[0.15em] text-xs md:text-sm font-bold">レシートOCR ・ 予約注文 ・ 売上集計 ・ 業務チャット</p>
        </div>
      </div>

      <div className="flex items-center justify-center gap-4 mt-12 mb-8 px-4 max-w-5xl mx-auto w-full">
        <div className="h-px w-full bg-linear-to-r from-transparent to-[#C4A882]"></div>
        <p className="font-playfair italic text-[#8B6340] tracking-[0.15em] text-sm whitespace-nowrap">— Main Menu —</p>
        <div className="h-px w-full bg-linear-to-l from-transparent to-[#C4A882]"></div>
      </div>

      <div className="w-full max-w-5xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <Link to="/analyze" className="group block">
            <div className="relative flex flex-col md:flex-row items-center justify-center gap-6 h-full min-h-[140px] p-6 bg-bakery-surface border border-[#E8DCC4] rounded-lg transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md group-hover:bg-[#FFF8E7] group-hover:border-bakery-border">
              <div className="text-bakery-textMain opacity-70 group-hover:scale-110 transition-transform duration-300 group-hover:text-bakery-gold"><Camera size={52} strokeWidth={1.2} /></div>
              <div className="text-center md:text-left"><span className="block font-playfair italic text-3xl text-bakery-primary mb-1 tracking-wider opacity-90 group-hover:text-[#8B5E3C]">Receipt</span><span className="block font-zen font-bold tracking-[0.2em] text-[#8B6340] text-sm">レシート解析 (日計表対応)</span></div>
              <div className="absolute bottom-2 right-3 flex items-center text-bakery-gold font-zen font-bold text-[9px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">OPEN ▶</div>
            </div>
          </Link>
          <Link to="/dashboard" className="group block">
            <div className="relative flex flex-col md:flex-row items-center justify-center gap-6 h-full min-h-[140px] p-6 bg-bakery-surface border border-[#E8DCC4] rounded-lg transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-md group-hover:bg-[#FFF8E7] group-hover:border-bakery-border">
              <div className="text-bakery-textMain opacity-70 group-hover:scale-110 transition-transform duration-300 group-hover:text-bakery-gold"><BarChart3 size={52} strokeWidth={1.2} /></div>
              <div className="text-center md:text-left"><span className="block font-playfair italic text-3xl text-bakery-primary mb-1 tracking-wider opacity-90 group-hover:text-[#8B5E3C]">Dashboard</span><span className="block font-zen font-bold tracking-[0.2em] text-[#8B6340] text-sm">売上・製造集計 (月報出力)</span></div>
              <div className="absolute bottom-2 right-3 flex items-center text-bakery-gold font-zen font-bold text-[9px] tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">OPEN ▶</div>
            </div>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <MenuCard to="/customers" enTitle="Customers" jpTitle="顧客・予約管理" icon={Users} />
          <MenuCard to="/master" enTitle="Menu" jpTitle="製品マスタ管理" icon={BookOpen} />
          <MenuCard to="/contact" enTitle="Chat" jpTitle="業務連絡チャット" icon={MessageCircle} />
          <MenuCard to="/production" enTitle="Production" jpTitle="製造実績 (ショップ)" icon={ChefHat} />
          <MenuCard to="/wholesale" enTitle="Wholesale" jpTitle="施設買上 (卸) 入力" icon={Store} />
          <MenuCard to="/manual" enTitle="Manual" jpTitle="操作説明書" icon={Info} />
        </div>
      </div>

      <div className="mt-16 w-full max-w-sm mx-auto flex items-center justify-center gap-3 opacity-60">
        <div className="h-px w-full bg-linear-to-r from-transparent to-[#8B6340]"></div><span className="text-[#8B6340] text-lg">🍞</span><div className="h-px w-full bg-linear-to-l from-transparent to-[#8B6340]"></div>
      </div>
    </div>
  );
}